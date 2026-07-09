import { useEffect, useState } from 'react';
import api from '../../services/api';
import type { StockMovement } from '../../types/stockMovement';
import todayJakarta from '../../utils/todayJakarta';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../components/Button/Button';
import Table, { type TableColumn } from '../../components/Table/Table';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';
import { useToast } from '../../components/Toast/ToastProvider';
import styles from './StockEveningPage.module.scss';

export default function StockEveningPage() {
  const { showToast } = useToast();
  const [date, setDate] = useState(todayJakarta());
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [returnedMap, setReturnedMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadMovements = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get<StockMovement[]>('/api/stock-movements', { params: { date } });
      setMovements(data);
      setReturnedMap(Object.fromEntries(data.map((m) => [m.id, m.qtyReturned])));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const handleSave = async (id: string) => {
    setSavingId(id);
    try {
      await api.put(`/api/stock-movements/${id}/return`, { qtyReturned: returnedMap[id] ?? 0 });
      showToast('success', 'Retur stok berhasil disimpan.');
      await loadMovements();
    } catch {
      showToast('danger', 'Gagal menyimpan retur.');
    } finally {
      setSavingId(null);
    }
  };

  const columns: TableColumn<StockMovement>[] = [
    { key: 'seller', header: 'Penjual', render: (m) => m.sellerName },
    { key: 'product', header: 'Produk', render: (m) => m.productName },
    { key: 'qtyOut', header: 'Qty Keluar', align: 'right', render: (m) => String(m.qtyOut) },
    {
      key: 'qtyReturned',
      header: 'Qty Retur',
      align: 'right',
      render: (m) => (
        <input
          type="number"
          min={0}
          max={m.qtyOut}
          className={styles.qtyInput}
          value={returnedMap[m.id] ?? 0}
          onChange={(e) => setReturnedMap((prev) => ({ ...prev, [m.id]: Number(e.target.value) }))}
        />
      ),
    },
    { key: 'sold', header: 'Terjual (preview)', align: 'right', render: (m) => String(m.qtyOut - (returnedMap[m.id] ?? 0)) },
    {
      key: 'action',
      header: '',
      render: (m) => (
        <Button size="sm" onClick={() => handleSave(m.id)} disabled={savingId === m.id}>
          {savingId === m.id ? 'Menyimpan...' : 'Simpan'}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        description="Catat retur roti sore ini dari tiap penjual — roti terjual otomatis dihitung dari selisihnya."
        actions={<input type="date" className={styles.dateInput} value={date} onChange={(e) => setDate(e.target.value)} />}
      />

      {loading ? (
        <SkeletonTable rows={5} />
      ) : error ? (
        <ErrorState onRetry={loadMovements} />
      ) : movements.length === 0 ? (
        <EmptyState message="Belum ada stok pagi untuk tanggal ini." />
      ) : (
        <Table columns={columns} data={movements} rowKey={(m) => m.id} />
      )}
    </div>
  );
}
