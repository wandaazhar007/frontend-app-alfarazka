import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import todayJakarta from '../../utils/todayJakarta';
import { formatRupiah } from '../../utils/format';
import type { Receivable } from '../../types/receivable';
import type { Paginated } from '../../types/pagination';
import { PAGE_SIZE } from '../../utils/constants';
import Pagination from '../../components/Pagination/Pagination';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../components/Button/Button';
import Badge from '../../components/Badge/Badge';
import Table, { type TableColumn } from '../../components/Table/Table';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';
import { useToast } from '../../components/Toast/ToastProvider';
import styles from './ReceivablesPage.module.scss';

export default function ReceivablesPage() {
  const { appUser } = useAuth();
  const { showToast } = useToast();
  const [status, setStatus] = useState<'' | 'dp' | 'lunas'>('dp');
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<'cash' | 'qris'>('cash');
  const [submitting, setSubmitting] = useState(false);

  const loadReceivables = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get<Paginated<Receivable>>('/api/receivables', {
        params: { ...(status ? { status } : {}), page, pageSize: PAGE_SIZE },
      });
      setReceivables(data.data);
      setTotal(data.total);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [status]);

  useEffect(() => {
    loadReceivables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  const startPayment = (r: Receivable) => {
    setPayingId(r.id);
    setPayAmount(r.outstanding);
    setPayMethod('cash');
  };

  const cancelPayment = () => {
    setPayingId(null);
    setPayAmount(0);
  };

  const submitPayment = async (id: string) => {
    setSubmitting(true);
    try {
      await api.post(`/api/receivables/${id}/payments`, {
        amount: payAmount,
        method: payMethod,
        paymentDate: todayJakarta(),
      });
      showToast('success', 'Pembayaran piutang berhasil disimpan.');
      cancelPayment();
      await loadReceivables();
    } catch {
      showToast('danger', 'Gagal menyimpan pembayaran piutang.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: TableColumn<Receivable>[] = [
    { key: 'customer', header: 'Pelanggan', render: (r) => r.customerName },
    { key: 'package', header: 'Paket', render: (r) => r.customName ?? '-' },
    { key: 'total', header: 'Total', align: 'right', render: (r) => formatRupiah(r.totalAmount) },
    { key: 'paid', header: 'Terbayar', align: 'right', render: (r) => formatRupiah(r.amountPaid) },
    { key: 'outstanding', header: 'Sisa', align: 'right', render: (r) => formatRupiah(r.outstanding) },
    { key: 'dueDate', header: 'Jatuh Tempo', render: (r) => r.dueDate ?? '-' },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <Badge tone={r.status === 'lunas' ? 'success' : 'warning'}>{r.status === 'lunas' ? 'Lunas' : 'DP'}</Badge>,
    },
  ];

  if (appUser?.role === 'admin') {
    columns.push({
      key: 'action',
      header: '',
      render: (r) =>
        r.status === 'lunas' ? null : payingId === r.id ? (
          <div className={styles.paymentForm}>
            <input
              type="number"
              className={styles.amountInput}
              value={payAmount}
              min={1}
              max={r.outstanding}
              onChange={(e) => setPayAmount(Number(e.target.value))}
            />
            <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as 'cash' | 'qris')}>
              <option value="cash">Cash</option>
              <option value="qris">QRIS</option>
            </select>
            <Button size="sm" variant="primary" onClick={() => submitPayment(r.id)} disabled={submitting}>
              Simpan
            </Button>
            <Button size="sm" variant="secondary" onClick={cancelPayment}>
              Batal
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={() => startPayment(r)}>
            Bayar
          </Button>
        ),
    });
  }

  return (
    <div>
      <PageHeader description="Pantau piutang usaha dari penjualan paket — status DP dan pelunasan." />

      <div className={styles.filterRow}>
        <label>
          Status:{' '}
          <select className={styles.filterSelect} value={status} onChange={(e) => setStatus(e.target.value as '' | 'dp' | 'lunas')}>
            <option value="">Semua</option>
            <option value="dp">Belum Lunas (DP)</option>
            <option value="lunas">Lunas</option>
          </select>
        </label>
      </div>

      {loading ? (
        <SkeletonTable rows={4} />
      ) : error ? (
        <ErrorState onRetry={loadReceivables} />
      ) : receivables.length === 0 ? (
        <EmptyState message="Tidak ada piutang untuk filter ini." />
      ) : (
        <Table columns={columns} data={receivables} rowKey={(r) => r.id} />
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
