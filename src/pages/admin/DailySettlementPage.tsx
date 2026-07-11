import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHandHoldingDollar, faXmark, faFloppyDisk } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import type { KelilingStatusResponse, SellerReportRow } from '../../types/dailyReport';
import { formatRupiah, formatTanggal } from '../../utils/format';
import todayJakarta from '../../utils/todayJakarta';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../components/Button/Button';
import Badge from '../../components/Badge/Badge';
import FormField from '../../components/FormField/FormField';
import Table, { type TableColumn } from '../../components/Table/Table';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';
import { useToast } from '../../components/Toast/ToastProvider';
import Modal from '../../components/Modal/Modal';
import styles from './DailySettlementPage.module.scss';

export default function DailySettlementPage() {
  const { showToast } = useToast();
  const [date, setDate] = useState(todayJakarta());
  const [sellers, setSellers] = useState<SellerReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [settleTarget, setSettleTarget] = useState<SellerReportRow | null>(null);
  const [cashInput, setCashInput] = useState(0);
  const [qrisInput, setQrisInput] = useState(0);
  const [saving, setSaving] = useState(false);

  const loadExisting = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get<KelilingStatusResponse>('/api/reports/keliling-status', { params: { date } });
      setSellers(data.sellers.filter((s) => s.qtyOut > 0));
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

  const openSettleModal = (row: SellerReportRow) => {
    setSettleTarget(row);
    setCashInput(row.cash);
    setQrisInput(row.qris);
  };

  const closeSettleModal = () => {
    setSettleTarget(null);
    setCashInput(0);
    setQrisInput(0);
  };

  const handleSaveSettle = async () => {
    if (!settleTarget) return;
    setSaving(true);

    try {
      await Promise.all([
        api.post('/api/sales', {
          saleType: 'keliling',
          sellerId: settleTarget.sellerId,
          saleDate: date,
          payments: [{ method: 'cash', amount: cashInput }],
        }),
        api.post('/api/qris-settlements', {
          settlementDate: date,
          items: [{ sellerId: settleTarget.sellerId, amount: qrisInput }],
        }),
      ]);
      showToast('success', 'Setoran & QRIS berhasil disimpan.');
      closeSettleModal();
      await loadExisting();
    } catch {
      showToast('danger', 'Gagal menyimpan setoran/QRIS.');
    } finally {
      setSaving(false);
    }
  };

  const columns: TableColumn<SellerReportRow>[] = [
    {
      key: 'seller',
      header: 'Nama Penjual',
      render: (r) => (
        <div>
          <div>{r.sellerName}</div>
          {r.needsResettlement && <div className={styles.resettlementNote}>Ada perubahan nilai retur</div>}
        </div>
      ),
    },
    { key: 'qtyOut', header: 'Total Qty', align: 'right', render: (r) => String(r.qtyOut) },
    { key: 'qtyReturned', header: 'Total Retur', align: 'right', render: (r) => String(r.qtyReturned) },
    { key: 'qtySold', header: 'Total Terjual', align: 'right', render: (r) => String(r.qtySold) },
    { key: 'cash', header: 'Cash', align: 'right', render: (r) => formatRupiah(r.cash) },
    { key: 'qris', header: 'Qris', align: 'right', render: (r) => formatRupiah(r.qris) },
    {
      key: 'retur',
      header: 'Retur',
      render: (r) => (
        <Badge tone={r.isFullyReturned ? 'success' : 'danger'}>{r.isFullyReturned ? 'Sudah Retur' : 'Belum Retur'}</Badge>
      ),
    },
    {
      key: 'setoran',
      header: 'Setoran',
      render: (r) => (
        <Badge tone={r.isSettled ? 'success' : 'danger'}>{r.isSettled ? 'Sudah Setoran' : 'Belum Setoran'}</Badge>
      ),
    },
    {
      key: 'action',
      header: '',
      render: (r) => (
        <Button
          size="sm"
          onClick={() => openSettleModal(r)}
          disabled={!r.isFullyReturned}
          icon={<FontAwesomeIcon icon={faHandHoldingDollar} />}
        >
          {!r.isFullyReturned ? 'Belum Retur' : r.isSettled ? 'Edit Setoran' : 'Setoran'}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <h1 className={styles.dateHeading}>{formatTanggal(date, 'panjang')}</h1>
      <PageHeader
        description="Input setoran cash dan settlement QRIS harian tiap penjual keliling."
        actions={<input type="date" className={styles.dateInput} value={date} onChange={(e) => setDate(e.target.value)} />}
      />

      {loading ? (
        <SkeletonTable rows={5} />
      ) : error ? (
        <ErrorState onRetry={loadExisting} />
      ) : sellers.length === 0 ? (
        <EmptyState message="Belum ada penjual yang berjualan pada tanggal ini." />
      ) : (
        <Table
          columns={columns}
          data={sellers}
          rowKey={(r) => r.sellerId}
          rowClassName={(r) => (r.needsResettlement ? styles.resettlementRow : undefined)}
        />
      )}

      {settleTarget && (
        <Modal
          title={`Setor — ${settleTarget.sellerName}`}
          onClose={closeSettleModal}
          footer={
            <>
              <Button variant="secondary" onClick={closeSettleModal} disabled={saving} icon={<FontAwesomeIcon icon={faXmark} />}>
                Batal
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveSettle}
                disabled={saving}
                icon={<FontAwesomeIcon icon={faFloppyDisk} />}
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </>
          }
        >
          <FormField label="Setoran Cash" htmlFor="settle-cash">
            <input
              id="settle-cash"
              type="number"
              min={0}
              className={styles.amountInput}
              value={cashInput}
              onChange={(e) => setCashInput(Number(e.target.value))}
            />
          </FormField>
          <FormField label="Settlement QRIS" htmlFor="settle-qris">
            <input
              id="settle-qris"
              type="number"
              min={0}
              className={styles.amountInput}
              value={qrisInput}
              onChange={(e) => setQrisInput(Number(e.target.value))}
            />
          </FormField>
        </Modal>
      )}
    </div>
  );
}
