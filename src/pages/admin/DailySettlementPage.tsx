import { useEffect, useState } from 'react';
import api from '../../services/api';
import type { DailyReport } from '../../types/dailyReport';
import todayJakarta from '../../utils/todayJakarta';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../components/Button/Button';
import Table, { type TableColumn } from '../../components/Table/Table';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';
import { useToast } from '../../components/Toast/ToastProvider';
import styles from './DailySettlementPage.module.scss';

interface RowInput {
  sellerId: string;
  sellerName: string;
  cash: number;
  qris: number;
}

export default function DailySettlementPage() {
  const { showToast } = useToast();
  const [date, setDate] = useState(todayJakarta());
  const [rows, setRows] = useState<RowInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadExisting = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get<DailyReport>('/api/reports/daily', { params: { date } });
      setRows(
        data.keliling.sellers.map((s) => ({
          sellerId: s.sellerId,
          sellerName: s.sellerName,
          cash: s.cash,
          qris: s.qris,
        }))
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const updateRow = (sellerId: string, field: 'cash' | 'qris', value: number) => {
    setRows((prev) => prev.map((r) => (r.sellerId === sellerId ? { ...r, [field]: value } : r)));
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      const salesToSubmit = rows.filter((r) => r.cash > 0);
      const qrisItems = rows.filter((r) => r.qris > 0).map((r) => ({ sellerId: r.sellerId, amount: r.qris }));

      await Promise.all(
        salesToSubmit.map((r) =>
          api.post('/api/sales', {
            saleType: 'keliling',
            sellerId: r.sellerId,
            saleDate: date,
            payments: [{ method: 'cash', amount: r.cash }],
          })
        )
      );

      if (qrisItems.length > 0) {
        await api.post('/api/qris-settlements', { settlementDate: date, items: qrisItems });
      }

      showToast('success', 'Setoran & QRIS berhasil disimpan.');
      await loadExisting();
    } catch {
      showToast('danger', 'Gagal menyimpan setoran/QRIS.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: TableColumn<RowInput>[] = [
    { key: 'seller', header: 'Penjual', render: (r) => r.sellerName },
    {
      key: 'cash',
      header: 'Setoran Cash',
      align: 'right',
      render: (r) => (
        <input
          type="number"
          min={0}
          className={styles.amountInput}
          value={r.cash}
          onChange={(e) => updateRow(r.sellerId, 'cash', Number(e.target.value))}
        />
      ),
    },
    {
      key: 'qris',
      header: 'Settlement QRIS',
      align: 'right',
      render: (r) => (
        <input
          type="number"
          min={0}
          className={styles.amountInput}
          value={r.qris}
          onChange={(e) => updateRow(r.sellerId, 'qris', Number(e.target.value))}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        description="Input setoran cash dan settlement QRIS harian tiap penjual keliling."
        actions={<input type="date" className={styles.dateInput} value={date} onChange={(e) => setDate(e.target.value)} />}
      />

      {loading ? (
        <SkeletonTable rows={5} />
      ) : error ? (
        <ErrorState onRetry={loadExisting} />
      ) : rows.length === 0 ? (
        <EmptyState message="Belum ada penjual aktif." />
      ) : (
        <>
          <Table columns={columns} data={rows} rowKey={(r) => r.sellerId} />
          <div className={styles.submitRow}>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan Setoran & QRIS'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
