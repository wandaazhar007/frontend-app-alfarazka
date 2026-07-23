import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import todayJakarta from '../../utils/todayJakarta';
import { formatRupiah, formatTanggal } from '../../utils/format';
import StatCard from '../../components/StatCard/StatCard';
import Badge from '../../components/Badge/Badge';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../components/Button/Button';
import Table, { type TableColumn } from '../../components/Table/Table';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import Skeleton, { SkeletonStatCardRow, SkeletonTable } from '../../components/Skeleton/Skeleton';
import SalesTrendChart from '../../components/Chart/SalesTrendChart';
import SellerComparisonChart from '../../components/Chart/SellerComparisonChart';
import type { DailyReport, SellerReportRow } from '../../types/dailyReport';
import type { RangeTotals } from '../../types/dailyClosing';
import type { Expense } from '../../types/expense';
import downloadReportRange from '../../utils/downloadReportRange';
import styles from './OwnerDashboard.module.scss';

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

interface SellerComparisonPoint {
  sellerId: string;
  sellerName: string;
  total: number;
}

export default function OwnerDashboard() {
  const [fromDate, setFromDate] = useState(todayJakarta());
  const [toDate, setToDate] = useState(todayJakarta());
  const [report, setReport] = useState<DailyReport | null>(null);
  const [closing, setClosing] = useState<RangeTotals | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [trendDays, setTrendDays] = useState<7 | 30>(7);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);

  const [comparisonFrom] = useState(daysAgoJakarta(6));
  const [comparisonTo] = useState(todayJakarta());
  const [comparisonData, setComparisonData] = useState<SellerComparisonPoint[]>([]);
  const [comparisonLoading, setComparisonLoading] = useState(true);

  const handleFromDateChange = (value: string) => {
    // Browser native date picker "Clear" mengirim string kosong — abaikan supaya
    // tanggal tidak pernah kosong (yang bikin halaman blank saat dipakai untuk fetch).
    if (!value) return;
    setFromDate(value);
    if (value > toDate) setToDate(value);
  };

  const handleToDateChange = (value: string) => {
    if (!value) return;
    setToDate(value);
    if (value < fromDate) setFromDate(value);
  };

  const handleExport = async (format: 'pdf' | 'xlsx') => {
    setExporting(true);
    setExportError(null);
    try {
      await downloadReportRange(fromDate, toDate, format);
    } catch {
      setExportError('Gagal export laporan.');
    } finally {
      setExporting(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [reportRes, closingRes, expensesRes] = await Promise.all([
        api.get<DailyReport>('/api/reports/daily', { params: { from: fromDate, to: toDate } }),
        api.get<RangeTotals>('/api/daily-closings/range-totals', { params: { from: fromDate, to: toDate } }),
        api.get<Expense[]>('/api/expenses', { params: { from: fromDate, to: toDate } }),
      ]);
      setReport(reportRes.data);
      setClosing(closingRes.data);
      setExpenses(expensesRes.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const loadTrend = async () => {
      setTrendLoading(true);
      try {
        const { data } = await api.get<TrendPoint[]>('/api/reports/trend', { params: { days: trendDays } });
        setTrendData(data);
      } catch {
        setTrendData([]);
      } finally {
        setTrendLoading(false);
      }
    };
    loadTrend();
  }, [trendDays]);

  useEffect(() => {
    const loadComparison = async () => {
      setComparisonLoading(true);
      try {
        const { data } = await api.get<SellerComparisonPoint[]>('/api/reports/seller-comparison', {
          params: { from: comparisonFrom, to: comparisonTo },
        });
        setComparisonData(data);
      } catch {
        setComparisonData([]);
      } finally {
        setComparisonLoading(false);
      }
    };
    loadComparison();
  }, [comparisonFrom, comparisonTo]);

  const kelilingColumns: TableColumn<SellerReportRow>[] = [
    { key: 'seller', header: 'Penjual', render: (r) => r.sellerName },
    { key: 'cash', header: 'Cash', align: 'right', render: (r) => formatRupiah(r.cash) },
    { key: 'qris', header: 'QRIS', align: 'right', render: (r) => formatRupiah(r.qris) },
    { key: 'total', header: 'Total Penjualan', align: 'right', render: (r) => formatRupiah(r.totalPenjualan) },
    { key: 'sold', header: 'Roti Terjual', align: 'right', render: (r) => String(r.qtySold) },
    { key: 'returned', header: 'Roti Retur', align: 'right', render: (r) => String(r.qtyReturned) },
  ];

  const expenseColumns: TableColumn<Expense>[] = [
    { key: 'category', header: 'Kategori', render: (r) => r.categoryName },
    { key: 'amount', header: 'Nominal', align: 'right', render: (r) => formatRupiah(r.amount) },
    { key: 'description', header: 'Keterangan', render: (r) => r.description ?? '-' },
  ];

  return (
    <div>
      <PageHeader
        description="Ringkasan penjualan, pengeluaran, dan laba kotor harian gabungan (keliling + toko + paket)."
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
            <Button variant="secondary" onClick={() => handleExport('pdf')} disabled={exporting}>
              Export PDF
            </Button>
            <Button variant="secondary" onClick={() => handleExport('xlsx')} disabled={exporting}>
              Export Excel
            </Button>
          </>
        }
      />

      {exportError && <p className={styles.hint}>{exportError}</p>}

      <div className={styles.chartsGrid}>
        {trendLoading ? (
          <Skeleton variant="chart" />
        ) : (
          <div>
            <div className={styles.chartToggle}>
              <Button variant={trendDays === 7 ? 'primary' : 'secondary'} size="sm" onClick={() => setTrendDays(7)}>
                7 Hari
              </Button>
              <Button variant={trendDays === 30 ? 'primary' : 'secondary'} size="sm" onClick={() => setTrendDays(30)}>
                30 Hari
              </Button>
            </div>
            <SalesTrendChart data={trendData} title={`Tren Penjualan ${trendDays} Hari Terakhir`} />
          </div>
        )}

        {comparisonLoading ? (
          <Skeleton variant="chart" />
        ) : (
          <SellerComparisonChart data={comparisonData} title="Perbandingan Penjualan per Penjual (7 Hari Terakhir)" />
        )}
      </div>

      {loading ? (
        <>
          <SkeletonStatCardRow count={3} />
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Keliling — Penjualan per Penjual</h2>
            <SkeletonTable rows={4} columns={kelilingColumns} />
          </div>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Pengeluaran</h2>
            <SkeletonTable rows={4} columns={expenseColumns} />
          </div>
        </>
      ) : error || !report ? (
        <ErrorState onRetry={load} />
      ) : (
        <>
          <div className={styles.selectedRangeRow}>
            <Badge tone="success" className={styles.dateBadge}>
              {fromDate === toDate
                ? formatTanggal(fromDate, 'dash')
                : `${formatTanggal(fromDate, 'dash')} s/d ${formatTanggal(toDate, 'dash')}`}
            </Badge>
          </div>

          <div className={styles.statGrid}>
            <StatCard label="Total Penjualan" value={formatRupiah(report.summary.totalPenjualan)} variant="highlight" />
            <StatCard label="Total Cash" value={formatRupiah(report.summary.totalCash)} />
            <StatCard label="Total QRIS" value={formatRupiah(report.summary.totalQris)} />
            <StatCard label="Total HPP" value={closing ? formatRupiah(closing.totalCogs) : 'Belum di-generate'} />
            <StatCard label="Laba Kotor" value={closing ? formatRupiah(closing.grossProfit) : 'Belum di-generate'} />
            <StatCard label="Total Pengeluaran Operasional" value={closing ? formatRupiah(closing.totalExpenses) : 'Belum di-generate'} />
            <StatCard label="Laba Bersih" value={closing ? formatRupiah(closing.netProfit) : 'Belum di-generate'} variant="highlight" />
            <StatCard label="Roti Terjual" value={String(report.summary.totalQtySold)} />
          </div>

          <div className={styles.breakdownGrid}>
            <StatCard label="Penjualan Keliling" value={formatRupiah(report.summary.totalKeliling)} />
            <StatCard label="Penjualan Toko" value={formatRupiah(report.summary.totalToko)} />
            <StatCard label="Penjualan Paket" value={formatRupiah(report.summary.totalPaket)} />
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Keliling — Penjualan per Penjual</h2>
            {report.keliling.sellers.length === 0 ? (
              <EmptyState message="Belum ada penjualan keliling pada rentang tanggal ini." />
            ) : (
              <Table columns={kelilingColumns} data={report.keliling.sellers} rowKey={(r) => r.sellerId} />
            )}
            <p className={styles.hint}>
              Rincian penjualan Toko &amp; Paket ada di <Link to="/reports/daily">Laporan Harian</Link>.
            </p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Pengeluaran</h2>
            {expenses.length === 0 ? (
              <EmptyState message="Tidak ada pengeluaran pada rentang tanggal ini." />
            ) : (
              <Table columns={expenseColumns} data={expenses} rowKey={(r) => r.id} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
