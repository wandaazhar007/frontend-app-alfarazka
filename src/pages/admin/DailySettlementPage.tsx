import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHandHoldingDollar, faXmark, faFloppyDisk, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
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
import LoadingOverlay from '../../components/LoadingOverlay/LoadingOverlay';
import styles from './DailySettlementPage.module.scss';

// Format apa adanya sambil diketik (mis. 100000 -> "100.000"), tanpa simbol "Rp"
// karena ini dipakai di dalam field yang bisa diedit, bukan tampilan read-only.
function formatInputRupiah(value: number | ''): string {
  return value === '' ? '' : new Intl.NumberFormat('id-ID').format(value);
}

function parseRupiahInput(raw: string): number | '' {
  const digitsOnly = raw.replace(/\D/g, '');
  return digitsOnly === '' ? '' : Number(digitsOnly);
}

export default function DailySettlementPage() {
  const { showToast } = useToast();
  const [date, setDate] = useState(todayJakarta());
  const [sellers, setSellers] = useState<SellerReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [settleTarget, setSettleTarget] = useState<SellerReportRow | null>(null);
  const [cashInput, setCashInput] = useState<number | ''>('');
  const [qrisInput, setQrisInput] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const [showFieldError, setShowFieldError] = useState(false);
  const [pendingConfirmMissing, setPendingConfirmMissing] = useState<'cash' | 'qris' | null>(null);

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
    setCashInput(row.cash > 0 ? row.cash : '');
    setQrisInput(row.qris > 0 ? row.qris : '');
    setShowFieldError(false);
    setPendingConfirmMissing(null);
  };

  const closeSettleModal = () => {
    setSettleTarget(null);
    setCashInput('');
    setQrisInput('');
    setShowFieldError(false);
    setPendingConfirmMissing(null);
  };

  const doSaveSettle = async () => {
    if (!settleTarget) return;
    setSaving(true);

    try {
      await Promise.all([
        api.post('/api/sales', {
          saleType: 'keliling',
          sellerId: settleTarget.sellerId,
          saleDate: date,
          payments: [{ method: 'cash', amount: cashInput || 0 }],
        }),
        api.post('/api/qris-settlements', {
          settlementDate: date,
          items: [{ sellerId: settleTarget.sellerId, amount: qrisInput || 0 }],
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

  const handleSaveSettle = () => {
    if (!settleTarget) return;

    const isCashFilled = typeof cashInput === 'number' && cashInput > 0;
    const isQrisFilled = typeof qrisInput === 'number' && qrisInput > 0;

    if (!isCashFilled && !isQrisFilled) {
      setShowFieldError(true);
      return;
    }

    if (isCashFilled && !isQrisFilled) {
      setPendingConfirmMissing('qris');
      return;
    }

    if (!isCashFilled && isQrisFilled) {
      setPendingConfirmMissing('cash');
      return;
    }

    doSaveSettle();
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
          blurBackdrop
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
          <div className={styles.modalDateBadge}>
            <Badge tone="danger">{formatTanggal(date, 'panjang')}</Badge>
          </div>
          <FormField
            label="Setoran Cash"
            htmlFor="settle-cash"
            error={showFieldError ? 'Salah satu field wajib diisi' : undefined}
          >
            <input
              id="settle-cash"
              type="text"
              inputMode="numeric"
              placeholder="Rp. 0"
              className={styles.amountInput}
              value={formatInputRupiah(cashInput)}
              onChange={(e) => {
                setShowFieldError(false);
                setCashInput(parseRupiahInput(e.target.value));
              }}
            />
          </FormField>
          <FormField
            label="Settlement QRIS"
            htmlFor="settle-qris"
            error={showFieldError ? 'Salah satu field wajib diisi' : undefined}
          >
            <input
              id="settle-qris"
              type="text"
              inputMode="numeric"
              placeholder="Rp. 0"
              className={styles.amountInput}
              value={formatInputRupiah(qrisInput)}
              onChange={(e) => {
                setShowFieldError(false);
                setQrisInput(parseRupiahInput(e.target.value));
              }}
            />
          </FormField>
        </Modal>
      )}

      {pendingConfirmMissing && settleTarget && (
        <Modal
          title="Perhatian"
          icon={<FontAwesomeIcon icon={faTriangleExclamation} className={styles.warningIcon} />}
          onClose={() => setPendingConfirmMissing(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setPendingConfirmMissing(null)} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setPendingConfirmMissing(null);
                  doSaveSettle();
                }}
                disabled={saving}
              >
                Yakin & Simpan
              </Button>
            </>
          }
        >
          <p>
            Apakah Anda yakin {settleTarget.sellerName} tidak memiliki setoran{' '}
            {pendingConfirmMissing === 'cash' ? 'cash' : 'QRIS'}?
          </p>
        </Modal>
      )}

      {saving && <LoadingOverlay message="Menyimpan setoran..." />}
    </div>
  );
}
