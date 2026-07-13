import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFloppyDisk, faXmark } from '@fortawesome/free-solid-svg-icons';
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

// dueDate/todayJakarta selalu format ISO "YYYY-MM-DD" — cukup susun ulang stringnya,
// tidak perlu parse ke Date (menghindari pergeseran tanggal akibat timezone).
function formatDueDateDash(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}-${m}-${y}`;
}

// Beda dari field rupiah di halaman lain — di sini "Rp." ikut tampil sambil diketik,
// bukan cuma di placeholder (mis. 100000 -> "Rp. 100.000").
function formatInputRupiah(value: number | ''): string {
  return value === '' ? '' : `Rp. ${new Intl.NumberFormat('id-ID').format(value)}`;
}

function parseRupiahInput(raw: string): number | '' {
  const digitsOnly = raw.replace(/\D/g, '');
  return digitsOnly === '' ? '' : Number(digitsOnly);
}

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
  const [payAmount, setPayAmount] = useState<number | ''>('');
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

  const isOverdue = (r: Receivable) => r.status !== 'lunas' && r.dueDate !== null && r.dueDate < todayJakarta();

  const payingRow = receivables.find((r) => r.id === payingId) ?? null;
  const payExceedsOutstanding = payingRow !== null && typeof payAmount === 'number' && payAmount > payingRow.outstanding;

  const startPayment = (r: Receivable) => {
    setPayingId(r.id);
    setPayAmount('');
    setPayMethod('cash');
  };

  const cancelPayment = () => {
    setPayingId(null);
    setPayAmount('');
  };

  const submitPayment = async (id: string) => {
    setSubmitting(true);
    try {
      await api.post(`/api/receivables/${id}/payments`, {
        amount: payAmount || 0,
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
    { key: 'dueDate', header: 'Jatuh Tempo', render: (r) => (r.dueDate ? formatDueDateDash(r.dueDate) : '-') },
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
            <div className={styles.amountField}>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Rp. 0"
                className={[styles.amountInput, payExceedsOutstanding ? styles.amountInputError : ''].filter(Boolean).join(' ')}
                value={formatInputRupiah(payAmount)}
                onChange={(e) => setPayAmount(parseRupiahInput(e.target.value))}
              />
              {payExceedsOutstanding && (
                <span className={styles.fieldErrorText}>Nominal melebihi sisa piutang ({formatRupiah(r.outstanding)})</span>
              )}
            </div>
            <select
              className={styles.methodSelect}
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as 'cash' | 'qris')}
            >
              <option value="cash">Cash</option>
              <option value="qris">QRIS</option>
            </select>
            <Button
              size="sm"
              variant="primary"
              onClick={() => submitPayment(r.id)}
              disabled={submitting || payExceedsOutstanding || !payAmount}
              title="Simpan"
              icon={<FontAwesomeIcon icon={faFloppyDisk} />}
            >
              <span className={styles.srOnly}>Simpan</span>
            </Button>
            <Button size="sm" variant="secondary" onClick={cancelPayment} title="Batal" icon={<FontAwesomeIcon icon={faXmark} />}>
              <span className={styles.srOnly}>Batal</span>
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
        <Table
          columns={columns}
          data={receivables}
          rowKey={(r) => r.id}
          rowClassName={(r) => (isOverdue(r) ? styles.overdueRow : r.status === 'lunas' ? styles.paidRow : undefined)}
        />
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
