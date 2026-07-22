import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalculator, faCheck, faTriangleExclamation, faFilePdf } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatRupiah, formatTanggal } from '../../utils/format';
import todayJakarta from '../../utils/todayJakarta';
import downloadPayrollSlip from '../../utils/downloadPayrollSlip';
import type { Seller } from '../../types/seller';
import type { Paginated } from '../../types/pagination';
import type { PayrollClosing, PayrollPreview } from '../../types/sellerPayroll';
import { PAGE_SIZE } from '../../utils/constants';
import Pagination from '../../components/Pagination/Pagination';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../components/Button/Button';
import Badge from '../../components/Badge/Badge';
import FormField from '../../components/FormField/FormField';
import Combobox from '../../components/Combobox/Combobox';
import StatCard from '../../components/StatCard/StatCard';
import Table, { type TableColumn } from '../../components/Table/Table';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import { SkeletonStatCardRow, SkeletonTable } from '../../components/Skeleton/Skeleton';
import { useToast } from '../../components/Toast/ToastProvider';
import LoadingOverlay from '../../components/LoadingOverlay/LoadingOverlay';
import Modal from '../../components/Modal/Modal';
import styles from './SellerPayrollPage.module.scss';

function currentPeriodMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatPeriodMonth(periodMonth: string): string {
  const [year, month] = periodMonth.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(
    new Date(Date.UTC(year, month - 1, 1))
  );
}

export default function SellerPayrollPage() {
  const { appUser } = useAuth();
  const { showToast } = useToast();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [sellerId, setSellerId] = useState('');
  const [periodMonth, setPeriodMonth] = useState(currentPeriodMonth());

  const [preview, setPreview] = useState<PayrollPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [existingClosing, setExistingClosing] = useState<PayrollClosing | null>(null);
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showEarlyPayWarning, setShowEarlyPayWarning] = useState(false);
  const [exportingSlip, setExportingSlip] = useState(false);

  const [history, setHistory] = useState<PayrollClosing[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [errorHistory, setErrorHistory] = useState(false);

  const loadSellers = async () => {
    try {
      const { data } = await api.get<Seller[]>('/api/sellers');
      setSellers(data.filter((s) => s.isActive));
    } catch {
      showToast('danger', 'Gagal memuat data penjual.');
    }
  };

  const loadPreview = async () => {
    if (!sellerId) {
      setPreview(null);
      return;
    }
    setLoadingPreview(true);
    try {
      const { data } = await api.get<PayrollPreview>('/api/seller-payroll/preview', {
        params: { sellerId, periodMonth },
      });
      setPreview(data);

      const { data: closings } = await api.get<PayrollClosing[]>('/api/seller-payroll', {
        params: { seller_id: sellerId },
      });
      setExistingClosing(closings.find((c) => c.periodMonth.startsWith(periodMonth)) ?? null);
    } catch {
      showToast('danger', 'Gagal memuat preview gaji.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    setErrorHistory(false);
    try {
      const { data } = await api.get<Paginated<PayrollClosing>>('/api/seller-payroll', {
        params: { ...(sellerId ? { seller_id: sellerId } : {}), page: historyPage, pageSize: PAGE_SIZE },
      });
      setHistory(data.data);
      setHistoryTotal(data.total);
    } catch {
      setErrorHistory(true);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadSellers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId, periodMonth]);

  useEffect(() => {
    setHistoryPage(1);
  }, [sellerId]);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId, historyPage]);

  const handleGenerate = async () => {
    if (!sellerId) return;
    setGenerating(true);
    try {
      const { data } = await api.post<PayrollClosing>('/api/seller-payroll/generate', { sellerId, periodMonth });
      setExistingClosing(data);
      showToast('success', 'Gaji bulanan berhasil dihitung (draft).');
      await loadHistory();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal generate gaji bulanan.';
      showToast('danger', message);
    } finally {
      setGenerating(false);
    }
  };

  // Gaji seharusnya dibayar tanggal 1 (dikonfirmasi user) — kalau admin klik "Bayar
  // Sekarang" sebelum tanggal itu, ingatkan dulu lewat modal supaya tidak ke-klik
  // tidak sengaja sebelum waktunya.
  const handleConfirmClick = () => {
    const dayOfMonth = Number(todayJakarta().split('-')[2]);
    if (dayOfMonth !== 1) {
      setShowEarlyPayWarning(true);
      return;
    }
    handleConfirm();
  };

  const handleConfirm = async () => {
    if (!existingClosing) return;
    setShowEarlyPayWarning(false);
    setConfirming(true);
    try {
      const { data } = await api.post<PayrollClosing>(`/api/seller-payroll/${existingClosing.id}/confirm`);
      setExistingClosing(data);
      showToast('success', 'Gaji bulanan berhasil dikonfirmasi & dibayar.');
      await loadHistory();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal konfirmasi pembayaran.';
      showToast('danger', message);
    } finally {
      setConfirming(false);
    }
  };

  const handleExportSlip = async () => {
    if (!sellerId) return;
    setExportingSlip(true);
    try {
      await downloadPayrollSlip(sellerId, selectedSellerName, periodMonth);
    } catch {
      showToast('danger', 'Gagal export slip gaji.');
    } finally {
      setExportingSlip(false);
    }
  };

  const selectedSellerName = sellers.find((s) => s.id === sellerId)?.name ?? '';

  const historyColumns: TableColumn<PayrollClosing>[] = [
    { key: 'seller', header: 'Penjual', render: (c) => c.sellerName },
    { key: 'period', header: 'Periode', render: (c) => formatPeriodMonth(c.periodMonth) },
    { key: 'salary', header: 'Gaji Tier', align: 'right', render: (c) => formatRupiah(c.totalTierSalary) },
    { key: 'commission', header: 'Komisi', align: 'right', render: (c) => formatRupiah(c.totalCommission) },
    { key: 'deduction', header: 'Potongan Utang', align: 'right', render: (c) => formatRupiah(c.totalDebtDeduction) },
    { key: 'net', header: 'Net Payout', align: 'right', render: (c) => formatRupiah(c.netPayout) },
    {
      key: 'status',
      header: 'Status',
      render: (c) => <Badge tone={c.status === 'paid' ? 'success' : 'warning'}>{c.status === 'paid' ? 'Sudah Dibayar' : 'Draft'}</Badge>,
    },
  ];

  return (
    <div>
      <PageHeader description="Hitung & bayar gaji bulanan penjual keliling — gaji tier + komisi, dipotong utang yang belum lunas." />

      <div className={styles.filterRow}>
        <FormField label="Penjual" htmlFor="payroll-seller">
          <Combobox
            id="payroll-seller"
            value={sellerId}
            onChange={setSellerId}
            placeholder="Pilih penjual..."
            emptyMessage="Penjual tidak ditemukan."
            options={sellers.map((s) => ({ value: s.id, label: s.name }))}
          />
        </FormField>
        <FormField label="Periode" htmlFor="payroll-month">
          <input
            id="payroll-month"
            type="month"
            className={styles.monthInput}
            value={periodMonth}
            onChange={(e) => e.target.value && setPeriodMonth(e.target.value)}
          />
        </FormField>
        <Button
          variant="secondary"
          icon={<FontAwesomeIcon icon={faFilePdf} />}
          onClick={handleExportSlip}
          disabled={!sellerId || exportingSlip}
        >
          {exportingSlip ? 'Mengekspor...' : 'Export PDF'}
        </Button>
      </div>

      {!sellerId ? (
        <EmptyState message="Pilih penjual dulu untuk melihat preview gaji bulanan." />
      ) : loadingPreview ? (
        <SkeletonStatCardRow count={4} />
      ) : preview ? (
        <>
          <div className={styles.previewHeader}>
            <Badge tone="success">{formatPeriodMonth(periodMonth)}</Badge>
            {existingClosing?.status === 'paid' && <Badge tone="success">Sudah Dibayar</Badge>}
            {existingClosing?.status === 'draft' && <Badge tone="warning">Draft — belum dibayar</Badge>}
          </div>
          <div className={styles.statGrid}>
            <StatCard label="Hari Bekerja/Jualan" value={`${preview.daysWorked} hari`} />
            <StatCard label="Total Produk Terjual" value={`${preview.totalRotiQty} pcs`} />
            <StatCard label="Total Produk Komisi Terjual" value={`${preview.totalCommissionQty} pcs`} />
          </div>
          <div className={styles.statGrid}>
            <StatCard label="Total Gaji Harian" value={formatRupiah(preview.totalTierSalary)} />
            <StatCard label="Total Komisi" value={formatRupiah(preview.totalCommission)} />
            <StatCard label="Utang Belum Lunas" value={formatRupiah(preview.outstandingDebt)} />
            <StatCard label="Diusulkan Dipotong" value={formatRupiah(preview.debtDeduction)} />
            <StatCard label="Net Payout" value={formatRupiah(preview.netPayout)} variant="highlight" />
          </div>

          {preview.unsettledDate && (
            <div className={styles.unsettledWarning}>
              <Badge tone="danger">
                {selectedSellerName} belum melakukan setoran pada tanggal {formatTanggal(preview.unsettledDate, 'pendek')}
              </Badge>
            </div>
          )}

          {appUser?.role === 'admin' && existingClosing?.status !== 'paid' && (
            <div className={styles.actionsRow}>
              <Button
                variant="secondary"
                icon={<FontAwesomeIcon icon={faCalculator} />}
                onClick={handleGenerate}
                disabled={generating || !!preview.unsettledDate}
                title={preview.unsettledDate ? 'Tidak bisa generate — masih ada setoran yang belum diinput' : undefined}
              >
                {generating ? 'Menghitung...' : existingClosing ? 'Hitung Ulang (Draft)' : 'Generate (Draft)'}
              </Button>
              {existingClosing?.status === 'draft' && (
                <Button
                  variant="primary"
                  icon={<FontAwesomeIcon icon={faCheck} />}
                  onClick={handleConfirmClick}
                  disabled={confirming}
                >
                  {confirming ? 'Memproses...' : 'Bayar Sekarang'}
                </Button>
              )}
            </div>
          )}
        </>
      ) : null}

      <h2 className={styles.sectionTitle}>Riwayat Gaji Bulanan</h2>
      {loadingHistory ? (
        <SkeletonTable rows={3} />
      ) : errorHistory ? (
        <ErrorState onRetry={loadHistory} />
      ) : history.length === 0 ? (
        <EmptyState message="Belum ada riwayat gaji bulanan." />
      ) : (
        <div className={styles.historyTable}>
          <Table columns={historyColumns} data={history} rowKey={(c) => c.id} />
        </div>
      )}
      <Pagination page={historyPage} pageSize={PAGE_SIZE} total={historyTotal} onPageChange={setHistoryPage} />

      {showEarlyPayWarning && (
        <Modal
          title="Perhatian"
          icon={<FontAwesomeIcon icon={faTriangleExclamation} className={styles.warningIcon} />}
          onClose={() => setShowEarlyPayWarning(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowEarlyPayWarning(false)}>
                Batal
              </Button>
              <Button variant="primary" onClick={handleConfirm}>
                Ya
              </Button>
            </>
          }
        >
          <p>Gaji bulanan biasanya dibayarkan tanggal 1. Yakin ingin membayar sekarang?</p>
        </Modal>
      )}

      {(generating || confirming) && (
        <LoadingOverlay message={confirming ? 'Memproses pembayaran...' : 'Menghitung gaji bulanan...'} />
      )}
    </div>
  );
}
