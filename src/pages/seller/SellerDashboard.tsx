import { useEffect, useState } from 'react';
import api from '../../services/api';
import { formatRupiah } from '../../utils/format';
import StatCard from '../../components/StatCard/StatCard';
import PageHeader from '../../components/PageHeader/PageHeader';
import Table, { type TableColumn } from '../../components/Table/Table';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import { SkeletonStatCardRow, SkeletonTable } from '../../components/Skeleton/Skeleton';
import { useAuth } from '../../contexts/AuthContext';
import type { StockMovement } from '../../types/stockMovement';
import type { SellerMySales } from '../../types/sellerMySales';
import styles from './SellerDashboard.module.scss';

export default function SellerDashboard() {
  const { appUser } = useAuth();
  const [todayStock, setTodayStock] = useState<StockMovement[]>([]);
  const [mySales, setMySales] = useState<SellerMySales | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [stockRes, salesRes] = await Promise.all([
        api.get<StockMovement[]>('/api/seller/today-stock'),
        api.get<SellerMySales>('/api/seller/my-sales'),
      ]);
      setTodayStock(stockRes.data);
      setMySales(salesRes.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const columns: TableColumn<StockMovement>[] = [
    { key: 'product', header: 'Produk', render: (m) => m.productName },
    { key: 'qtyOut', header: 'Qty Keluar', align: 'right', render: (m) => String(m.qtyOut) },
    { key: 'qtyReturned', header: 'Qty Retur', align: 'right', render: (m) => String(m.qtyReturned) },
    { key: 'qtySold', header: 'Qty Terjual', align: 'right', render: (m) => String(m.qtySold) },
  ];

  return (
    <div>
      <PageHeader description={`Selamat datang, ${appUser?.name}. Stok hari ini dan rekap penjualan kemarin.`} />

      {loading ? (
        <>
          <SkeletonTable rows={3} />
          <SkeletonStatCardRow count={3} />
        </>
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : (
        <>
          <h2 className={styles.sectionTitle}>Stok Hari Ini</h2>
          {todayStock.length === 0 ? (
            <EmptyState message="Belum ada stok yang diinput untuk hari ini." />
          ) : (
            <Table columns={columns} data={todayStock} rowKey={(m) => m.id} />
          )}

          <h2 className={styles.sectionTitle}>Rekap Penjualan ({mySales?.date})</h2>
          {mySales && (
            <div className={styles.statGrid}>
              <StatCard label="Setoran Cash" value={formatRupiah(mySales.cash)} />
              <StatCard label="Settlement QRIS" value={formatRupiah(mySales.qris)} />
              <StatCard label="Total Penjualan" value={formatRupiah(mySales.totalPenjualan)} variant="highlight" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
