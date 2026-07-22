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
import type { SellerEarnings } from '../../types/sellerPayroll';
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

  // Rentang tanggal terpisah dari picker "Rekap Penjualan" di atas — section
  // "Penghasilan" punya konteksnya sendiri (gaji tier + komisi), jadi diberi
  // date range picker sendiri juga.
  const [earnFromDate, setEarnFromDate] = useState(todayJakarta());
  const [earnToDate, setEarnToDate] = useState(todayJakarta());
  const [earnings, setEarnings] = useState<SellerEarnings | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(true);

  const handleEarnFromDateChange = (value: string) => {
    if (!value) return;
    setEarnFromDate(value);
    if (value > earnToDate) setEarnToDate(value);
  };

  const handleEarnToDateChange = (value: string) => {
    if (!value) return;
    setEarnToDate(value);
    if (value < earnFromDate) setEarnFromDate(value);
  };

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
    const loadEarnings = async () => {
      setEarningsLoading(true);
      const startedAt = Date.now();
      try {
        const { data } = await api.get<SellerEarnings>('/api/seller/my-earnings', {
          params: { from: earnFromDate, to: earnToDate },
        });
        setEarnings(data);
      } catch {
        setEarnings(null);
      } finally {
        // Request-nya sering selesai dalam hitungan milidetik (query ringan) — kalau
        // langsung setEarningsLoading(false), skeleton-nya kelewat cepat utk kelihatan
        // mata, jadi terasa seperti "tidak ada loading". Paksa tampil minimal sebentar.
        const elapsed = Date.now() - startedAt;
        const MIN_LOADING_MS = 350;
        if (elapsed < MIN_LOADING_MS) {
          await new Promise((resolve) => setTimeout(resolve, MIN_LOADING_MS - elapsed));
        }
        setEarningsLoading(false);
      }
    };
    loadEarnings();
  }, [earnFromDate, earnToDate]);

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
          <section className={[styles.section, styles.sectionStock].join(' ')}>
            <h2 className={styles.sectionTitle}>Stok Hari Ini</h2>
            <SkeletonTable rows={3} />
          </section>
          <section className={[styles.section, styles.sectionSales].join(' ')}>
            <h2 className={styles.sectionTitle}>Rekap Penjualan</h2>
            <SkeletonStatCardRow count={4} />
          </section>
          <section className={[styles.section, styles.sectionTrend].join(' ')}>
            <h2 className={styles.sectionTitle}>Tren Penjualan</h2>
            <Skeleton variant="chart" />
          </section>
          <section className={[styles.section, styles.sectionEarnings].join(' ')}>
            <h2 className={styles.sectionTitle}>Penghasilan</h2>
            <SkeletonStatCardRow count={6} />
          </section>
        </>
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : (
        <>
          <section className={[styles.section, styles.sectionStock].join(' ')}>
            <h2 className={styles.sectionTitle}>Stok Hari Ini</h2>
            {todayStock.length === 0 ? (
              <EmptyState message="Belum ada stok yang diinput untuk hari ini." />
            ) : (
              <Table columns={columns} data={todayStock} rowKey={(m) => m.id} />
            )}
          </section>

          <section className={[styles.section, styles.sectionSales].join(' ')}>
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
          </section>

          <section className={[styles.section, styles.sectionTrend].join(' ')}>
            <h2 className={styles.sectionTitle}>Tren Penjualan</h2>
            {trendLoading ? (
              <Skeleton variant="chart" />
            ) : (
              <SalesTrendChart
                data={trendData}
                title={rangeTouched ? 'Tren Penjualan Sesuai Rentang Terpilih' : 'Tren Penjualan 7 Hari Terakhir'}
              />
            )}
          </section>

          <section className={[styles.section, styles.sectionEarnings].join(' ')}>
            <h2 className={styles.sectionTitle}>Penghasilan</h2>
            <div className={styles.earningsDateRow}>
              <input
                type="date"
                className={styles.dateInput}
                title="Dari Tanggal"
                value={earnFromDate}
                onChange={(e) => handleEarnFromDateChange(e.target.value)}
              />
              <input
                type="date"
                className={styles.dateInput}
                title="Sampai Tanggal"
                value={earnToDate}
                onChange={(e) => handleEarnToDateChange(e.target.value)}
              />
            </div>
            <div className={styles.selectedRangeRow}>
              <Badge tone="warning">
                {earnFromDate === earnToDate
                  ? formatTanggal(earnFromDate, 'dash')
                  : `${formatTanggal(earnFromDate, 'dash')} s/d ${formatTanggal(earnToDate, 'dash')}`}
              </Badge>
            </div>
            {earningsLoading ? (
              <SkeletonStatCardRow count={6} />
            ) : earnings ? (
              <div className={styles.statGrid}>
                <StatCard label="Hari Bekerja/Jualan" value={`${earnings.daysWorked} hari`} />
                <StatCard label="Total Gaji Harian" value={formatRupiah(earnings.totalTierSalary)} />
                <StatCard label="Total Komisi" value={formatRupiah(earnings.totalCommission)} />
                <StatCard label="Minus Setoran" value={`-${formatRupiah(earnings.totalMinusSetoran)}`} variant="danger" />
                <StatCard label="Pinjaman" value={`-${formatRupiah(earnings.totalPinjaman)}`} variant="danger" />
                <StatCard label="Total Penghasilan" value={formatRupiah(earnings.totalPenghasilan)} variant="success" />
              </div>
            ) : (
              <EmptyState message="Gagal memuat data penghasilan." />
            )}
          </section>
        </>
      )}
    </div>
  );
}
