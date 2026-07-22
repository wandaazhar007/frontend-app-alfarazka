import { useEffect, useState } from 'react';
import api from '../../services/api';
import { formatRupiah, formatTanggal } from '../../utils/format';
import todayJakarta from '../../utils/todayJakarta';
import StatCard from '../../components/StatCard/StatCard';
import PageHeader from '../../components/PageHeader/PageHeader';
import Badge from '../../components/Badge/Badge';
import Table, { type TableColumn } from '../../components/Table/Table';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import Skeleton, { SkeletonStatCardRow, SkeletonTable } from '../../components/Skeleton/Skeleton';
import SalesTrendChart from '../../components/Chart/SalesTrendChart';
import { useAuth } from '../../contexts/AuthContext';
import type { StockMovement } from '../../types/stockMovement';
import type { SellerMySales } from '../../types/sellerMySales';
import styles from './SellerDashboard.module.scss';

function daysAgoJakarta(days: number): string {
  const [y, m, d] = todayJakarta().split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

interface TrendPoint {
  date: string;
  total: number;
}

export default function SellerDashboard() {
  const { appUser } = useAuth();
  const [todayStock, setTodayStock] = useState<StockMovement[]>([]);
  const [mySales, setMySales] = useState<SellerMySales | null>(null);
  const [myDebt, setMyDebt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [fromDate, setFromDate] = useState(todayJakarta());
  const [toDate, setToDate] = useState(todayJakarta());
  // Chart defaults ke 7 hari terakhir (independen dari picker di atas) SAMPAI
  // penjual pertama kali mengganti Dari/Sampai — setelah itu chart mengikuti
  // persis rentang yang dipilih, sesuai permintaan.
  const [rangeTouched, setRangeTouched] = useState(false);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);

  const chartFrom = rangeTouched ? fromDate : daysAgoJakarta(6);
  const chartTo = rangeTouched ? toDate : todayJakarta();

  const handleFromDateChange = (value: string) => {
    // Browser native date picker "Clear" mengirim string kosong — abaikan supaya
    // tanggal tidak pernah kosong (yang bikin halaman blank saat dipakai untuk fetch).
    if (!value) return;
    setFromDate(value);
    setRangeTouched(true);
    if (value > toDate) setToDate(value);
  };

  const handleToDateChange = (value: string) => {
    if (!value) return;
    setToDate(value);
    setRangeTouched(true);
    if (value < fromDate) setFromDate(value);
  };

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [stockRes, salesRes, debtRes] = await Promise.all([
        api.get<StockMovement[]>('/api/seller/today-stock'),
        api.get<SellerMySales>('/api/seller/my-sales', { params: { from: fromDate, to: toDate } }),
        api.get<{ outstanding: number }>('/api/seller/my-debt'),
      ]);
      setTodayStock(stockRes.data);
      setMySales(salesRes.data);
      setMyDebt(debtRes.data.outstanding);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  useEffect(() => {
    const loadTrend = async () => {
      setTrendLoading(true);
      try {
        const { data } = await api.get<TrendPoint[]>('/api/seller/my-sales-trend', {
          params: { from: chartFrom, to: chartTo },
        });
        setTrendData(data);
      } catch {
        setTrendData([]);
      } finally {
        setTrendLoading(false);
      }
    };
    loadTrend();
  }, [chartFrom, chartTo]);

  const columns: TableColumn<StockMovement>[] = [
    { key: 'product', header: 'Produk', render: (m) => m.productName },
    { key: 'qtyOut', header: 'Qty Keluar', align: 'right', render: (m) => String(m.qtyOut) },
    { key: 'qtyReturned', header: 'Qty Retur', align: 'right', render: (m) => String(m.qtyReturned) },
    { key: 'qtySold', header: 'Qty Terjual', align: 'right', render: (m) => String(m.qtySold) },
  ];

  return (
    <div>
      <PageHeader
        description={`Selamat datang, ${appUser?.name}. Stok hari ini dan rekap penjualan Anda.`}
        actions={
          <>
            <input
              type="date"
              className={styles.dateInput}
              title="Dari Tanggal"
              value={fromDate}
              onChange={(e) => handleFromDateChange(e.target.value)}
            />
            <input
              type="date"
              className={styles.dateInput}
              title="Sampai Tanggal"
              value={toDate}
              onChange={(e) => handleToDateChange(e.target.value)}
            />
          </>
        }
      />

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

          <h2 className={styles.sectionTitle}>Rekap Penjualan</h2>
          <div className={styles.selectedRangeRow}>
            <Badge tone="success">
              {fromDate === toDate
                ? formatTanggal(fromDate, 'dash')
                : `${formatTanggal(fromDate, 'dash')} s/d ${formatTanggal(toDate, 'dash')}`}
            </Badge>
          </div>
          {mySales && (
            <div className={styles.statGrid}>
              <StatCard label="Setoran Cash" value={formatRupiah(mySales.cash)} />
              <StatCard label="Settlement QRIS" value={formatRupiah(mySales.qris)} />
              <StatCard label="Total Penjualan" value={formatRupiah(mySales.totalPenjualan)} variant="highlight" />
              <StatCard label="Utang Saat Ini" value={formatRupiah(myDebt)} />
            </div>
          )}

          <h2 className={styles.sectionTitle}>Tren Penjualan</h2>
          {trendLoading ? (
            <Skeleton variant="chart" />
          ) : (
            <SalesTrendChart
              data={trendData}
              title={rangeTouched ? 'Tren Penjualan Sesuai Rentang Terpilih' : 'Tren Penjualan 7 Hari Terakhir'}
            />
          )}
        </>
      )}
    </div>
  );
}
