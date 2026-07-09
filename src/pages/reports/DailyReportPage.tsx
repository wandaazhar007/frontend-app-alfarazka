import { useEffect, useState } from 'react';
import api from '../../services/api';
import type { DailyReport, SellerReportRow, TokoSaleRow, PaketSaleRow } from '../../types/dailyReport';
import todayJakarta from '../../utils/todayJakarta';
import { formatRupiah } from '../../utils/format';
import StatCard from '../../components/StatCard/StatCard';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../components/Button/Button';
import Table, { type TableColumn } from '../../components/Table/Table';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import { SkeletonStatCardRow, SkeletonTable } from '../../components/Skeleton/Skeleton';
import { useToast } from '../../components/Toast/ToastProvider';
import downloadReport from '../../utils/downloadReport';
import styles from './DailyReportPage.module.scss';

export default function DailyReportPage() {
  const { showToast } = useToast();
  const [date, setDate] = useState(todayJakarta());
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'pdf' | 'xlsx') => {
    setExporting(true);
    try {
      await downloadReport(date, format);
    } catch {
      showToast('danger', 'Gagal export laporan.');
    } finally {
      setExporting(false);
    }
  };

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get<DailyReport>('/api/reports/daily', { params: { date } });
      setReport(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const kelilingColumns: TableColumn<SellerReportRow>[] = [
    { key: 'seller', header: 'Penjual', render: (r) => r.sellerName },
    { key: 'cash', header: 'Cash', align: 'right', render: (r) => formatRupiah(r.cash) },
    { key: 'qris', header: 'QRIS', align: 'right', render: (r) => formatRupiah(r.qris) },
    { key: 'total', header: 'Total Penjualan', align: 'right', render: (r) => formatRupiah(r.totalPenjualan) },
    { key: 'sold', header: 'Roti Terjual', align: 'right', render: (r) => String(r.qtySold) },
    { key: 'returned', header: 'Roti Retur', align: 'right', render: (r) => String(r.qtyReturned) },
  ];

  const tokoColumns: TableColumn<TokoSaleRow>[] = [
    { key: 'items', header: 'Item', render: (s) => s.items.map((i) => `${i.productName} x${i.qty}`).join(', ') || '-' },
    { key: 'cash', header: 'Cash', align: 'right', render: (s) => formatRupiah(s.cash) },
    { key: 'qris', header: 'QRIS', align: 'right', render: (s) => formatRupiah(s.qris) },
    { key: 'total', header: 'Total', align: 'right', render: (s) => formatRupiah(s.cash + s.qris) },
  ];

  const paketColumns: TableColumn<PaketSaleRow>[] = [
    { key: 'name', header: 'Nama Paket', render: (s) => s.customName ?? '-' },
    { key: 'customer', header: 'Pelanggan', render: (s) => s.customerName ?? '-' },
    { key: 'received', header: 'Diterima Hari Ini', align: 'right', render: (s) => formatRupiah(s.cash + s.qris) },
    { key: 'total', header: 'Nilai Paket', align: 'right', render: (s) => formatRupiah(s.totalAmount) },
    { key: 'status', header: 'Status', render: (s) => s.paymentStatus },
  ];

  return (
    <div>
      <PageHeader
        description="Laporan harian gabungan: keliling + toko + paket dalam satu tempat."
        actions={
          <>
            <input type="date" className={styles.dateInput} value={date} onChange={(e) => setDate(e.target.value)} />
            <Button variant="secondary" onClick={() => handleExport('pdf')} disabled={exporting}>
              Export PDF
            </Button>
            <Button variant="secondary" onClick={() => handleExport('xlsx')} disabled={exporting}>
              Export Excel
            </Button>
          </>
        }
      />

      {loading ? (
        <>
          <SkeletonStatCardRow count={3} />
          <SkeletonTable rows={5} />
        </>
      ) : error || !report ? (
        <ErrorState onRetry={load} />
      ) : (
        <>
          <div className={styles.statGrid}>
            <StatCard label="Total Cash" value={formatRupiah(report.summary.totalCash)} />
            <StatCard label="Total QRIS" value={formatRupiah(report.summary.totalQris)} />
            <StatCard label="Total Penjualan" value={formatRupiah(report.summary.totalPenjualan)} variant="highlight" />
          </div>
          <div className={styles.statGrid}>
            <StatCard label="Penjualan Keliling" value={formatRupiah(report.summary.totalKeliling)} />
            <StatCard label="Penjualan Toko" value={formatRupiah(report.summary.totalToko)} />
            <StatCard label="Penjualan Paket" value={formatRupiah(report.summary.totalPaket)} />
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Keliling — Penjualan per Penjual</h2>
            <div className={styles.statGrid}>
              <StatCard label="Roti Keluar" value={String(report.summary.totalQtyOut)} />
              <StatCard label="Roti Retur" value={String(report.summary.totalQtyReturned)} />
              <StatCard label="Roti Terjual" value={String(report.summary.totalQtySold)} />
            </div>
            {report.keliling.sellers.length === 0 ? (
              <EmptyState message="Tidak ada data penjualan keliling." />
            ) : (
              <Table columns={kelilingColumns} data={report.keliling.sellers} rowKey={(s) => s.sellerId} />
            )}
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Toko — Transaksi Mini POS ({report.toko.summary.transactionCount})</h2>
            {report.toko.sales.length === 0 ? (
              <EmptyState message="Tidak ada transaksi toko." />
            ) : (
              <Table columns={tokoColumns} data={report.toko.sales} rowKey={(s) => s.id} />
            )}
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Paket — Penjualan Custom ({report.paket.summary.transactionCount})</h2>
            {report.paket.summary.outstanding > 0 && (
              <p className={styles.hint}>
                Outstanding piutang paket (belum tentu dari hari ini saja): {formatRupiah(report.paket.summary.outstanding)}
              </p>
            )}
            {report.paket.sales.length === 0 ? (
              <EmptyState message="Tidak ada transaksi paket." />
            ) : (
              <Table columns={paketColumns} data={report.paket.sales} rowKey={(s) => s.id} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
