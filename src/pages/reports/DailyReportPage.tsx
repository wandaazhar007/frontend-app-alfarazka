import { useEffect, useState } from 'react';
import api from '../../services/api';
import type { DailyReport, SellerReportRow, TokoSaleRow, PaketSaleRow } from '../../types/dailyReport';
import todayJakarta from '../../utils/todayJakarta';
import { formatRupiah, formatTanggal } from '../../utils/format';
import StatCard from '../../components/StatCard/StatCard';
import Badge from '../../components/Badge/Badge';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../components/Button/Button';
import Table, { type TableColumn } from '../../components/Table/Table';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import { SkeletonStatCardRow, SkeletonTable } from '../../components/Skeleton/Skeleton';
import { useToast } from '../../components/Toast/ToastProvider';
import downloadReportRange from '../../utils/downloadReportRange';
import styles from './DailyReportPage.module.scss';

export default function DailyReportPage() {
  const { showToast } = useToast();
  const [fromDate, setFromDate] = useState(todayJakarta());
  const [toDate, setToDate] = useState(todayJakarta());
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [exporting, setExporting] = useState(false);

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
    try {
      await downloadReportRange(fromDate, toDate, format);
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
      const { data } = await api.get<DailyReport>('/api/reports/daily', { params: { from: fromDate, to: toDate } });
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
  }, [fromDate, toDate]);

  const kelilingColumns: TableColumn<SellerReportRow>[] = [
    { key: 'seller', header: 'Penjual', render: (r) => r.sellerName },
    { key: 'cash', header: 'Cash', align: 'right', render: (r) => formatRupiah(r.cash) },
    { key: 'qris', header: 'QRIS', align: 'right', render: (r) => formatRupiah(r.qris) },
    { key: 'minus', header: 'Minus', align: 'right', render: (r) => <span className={styles.minusValue}>-{formatRupiah(r.minus)}</span> },
    {
      key: 'pinjaman',
      header: 'Pinjaman',
      align: 'right',
      render: (r) => <span className={styles.minusValue}>-{formatRupiah(r.pinjaman)}</span>,
    },
    { key: 'total', header: 'Total Penjualan', align: 'right', render: (r) => formatRupiah(r.totalPenjualan) },
    { key: 'sold', header: 'Roti Terjual', align: 'right', render: (r) => String(r.qtySold) },
    { key: 'returned', header: 'Roti Retur', align: 'right', render: (r) => String(r.qtyReturned) },
    { key: 'commissionSold', header: 'Produk Komisi', align: 'right', render: (r) => String(r.commissionQtySold) },
    { key: 'commissionReturned', header: 'Retur Produk Komisi', align: 'right', render: (r) => String(r.commissionQtyReturned) },
  ];

  const kelilingTotals = report?.keliling.sellers.reduce(
    (acc, r) => ({
      cash: acc.cash + r.cash,
      qris: acc.qris + r.qris,
      minus: acc.minus + r.minus,
      pinjaman: acc.pinjaman + r.pinjaman,
      totalPenjualan: acc.totalPenjualan + r.totalPenjualan,
      qtySold: acc.qtySold + r.qtySold,
      qtyReturned: acc.qtyReturned + r.qtyReturned,
      commissionQtySold: acc.commissionQtySold + r.commissionQtySold,
      commissionQtyReturned: acc.commissionQtyReturned + r.commissionQtyReturned,
    }),
    {
      cash: 0,
      qris: 0,
      minus: 0,
      pinjaman: 0,
      totalPenjualan: 0,
      qtySold: 0,
      qtyReturned: 0,
      commissionQtySold: 0,
      commissionQtyReturned: 0,
    }
  );

  const kelilingFooter = kelilingTotals && [
    'Total',
    formatRupiah(kelilingTotals.cash),
    formatRupiah(kelilingTotals.qris),
    <Badge tone="danger" key="minus-total">
      -{formatRupiah(kelilingTotals.minus)}
    </Badge>,
    <Badge tone="danger" key="pinjaman-total">
      -{formatRupiah(kelilingTotals.pinjaman)}
    </Badge>,
    formatRupiah(kelilingTotals.totalPenjualan),
    String(kelilingTotals.qtySold),
    String(kelilingTotals.qtyReturned),
    String(kelilingTotals.commissionQtySold),
    String(kelilingTotals.commissionQtyReturned),
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
    { key: 'received', header: 'Diterima', align: 'right', render: (s) => formatRupiah(s.cash + s.qris) },
    { key: 'total', header: 'Nilai Paket', align: 'right', render: (s) => formatRupiah(s.totalAmount) },
    { key: 'status', header: 'Status', render: (s) => s.paymentStatus },
  ];

  return (
    <div>
      <PageHeader
        description="Laporan harian gabungan: keliling + toko + paket dalam satu tempat."
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

      <div className={styles.selectedRangeRow}>
        <Badge tone="success" className={styles.selectedRangeBadge}>
          {fromDate === toDate
            ? formatTanggal(fromDate, 'dash')
            : `${formatTanggal(fromDate, 'dash')} s/d ${formatTanggal(toDate, 'dash')}`}
        </Badge>
      </div>

      {loading ? (
        <>
          <div className={styles.skeletonGap}>
            <SkeletonStatCardRow count={3} />
          </div>
          <div className={styles.skeletonGap}>
            <SkeletonStatCardRow count={3} />
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Keliling — Penjualan per Penjual</h2>
            <div className={styles.skeletonGap}>
              <SkeletonStatCardRow count={4} />
            </div>
            <SkeletonTable rows={3} columns={kelilingColumns} />
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Toko — Transaksi Mini POS</h2>
            <SkeletonTable rows={3} columns={tokoColumns} />
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Paket — Penjualan Custom</h2>
            <SkeletonTable rows={3} columns={paketColumns} />
          </div>
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
              <StatCard label="Produk Komisi Terjual" value={String(report.summary.totalKomisiQtySold)} />
            </div>
            {report.keliling.sellers.length === 0 ? (
              <EmptyState message="Tidak ada data penjualan keliling." />
            ) : (
              <div className={styles.sellerTable}>
                <Table columns={kelilingColumns} data={report.keliling.sellers} rowKey={(s) => s.sellerId} footer={kelilingFooter} />
              </div>
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
