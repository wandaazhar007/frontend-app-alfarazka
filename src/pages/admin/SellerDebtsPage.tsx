import { useEffect, useState, type FormEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faFloppyDisk, faXmark, faHandHoldingDollar } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import todayJakarta from '../../utils/todayJakarta';
import { formatRupiah, formatTanggal, formatInputRupiah, parseRupiahInput } from '../../utils/format';
import type { SellerDebt, SellerDebtPaymentMethod, SellerDebtSource } from '../../types/sellerDebt';
import type { Seller } from '../../types/seller';
import type { Paginated } from '../../types/pagination';
import { PAGE_SIZE } from '../../utils/constants';
import Pagination from '../../components/Pagination/Pagination';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../components/Button/Button';
import Badge from '../../components/Badge/Badge';
import FormField from '../../components/FormField/FormField';
import Combobox from '../../components/Combobox/Combobox';
import Table, { type TableColumn } from '../../components/Table/Table';
import Modal from '../../components/Modal/Modal';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';
import { useToast } from '../../components/Toast/ToastProvider';
import LoadingOverlay from '../../components/LoadingOverlay/LoadingOverlay';
import styles from './SellerDebtsPage.module.scss';

const SOURCE_LABEL: Record<SellerDebtSource, string> = {
  kekurangan_setoran: 'Kekurangan Setoran',
  pinjaman: 'Pinjaman',
};

interface LoanFormErrors {
  sellerId?: string;
  amount?: string;
}

export default function SellerDebtsPage() {
  const { appUser } = useAuth();
  const { showToast } = useToast();
  const [status, setStatus] = useState<'' | 'belum_lunas' | 'lunas'>('');
  const [debts, setDebts] = useState<SellerDebt[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [payMethod, setPayMethod] = useState<SellerDebtPaymentMethod>('cash');
  const [submitting, setSubmitting] = useState(false);

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [loanSellerId, setLoanSellerId] = useState('');
  const [loanDate, setLoanDate] = useState(todayJakarta());
  const [loanAmount, setLoanAmount] = useState<number | ''>('');
  const [loanNote, setLoanNote] = useState('');
  const [loanErrors, setLoanErrors] = useState<LoanFormErrors>({});
  const [savingLoan, setSavingLoan] = useState(false);

  const loadDebts = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get<Paginated<SellerDebt>>('/api/seller-debts', {
        params: { ...(status ? { status } : {}), page, pageSize: PAGE_SIZE },
      });
      setDebts(data.data);
      setTotal(data.total);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const loadSellers = async () => {
    try {
      const { data } = await api.get<Seller[]>('/api/sellers');
      setSellers(data.filter((s) => s.isActive));
    } catch {
      showToast('danger', 'Gagal memuat data penjual.');
    }
  };

  useEffect(() => {
    setPage(1);
  }, [status]);

  useEffect(() => {
    loadDebts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  useEffect(() => {
    loadSellers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const payingRow = debts.find((d) => d.id === payingId) ?? null;
  const payExceedsOutstanding = payingRow !== null && typeof payAmount === 'number' && payAmount > payingRow.outstanding;

  const startPayment = (d: SellerDebt) => {
    setPayingId(d.id);
    setPayAmount('');
    setPayMethod('cash');
  };

  const cancelPayment = () => {
    setPayingId(null);
    setPayAmount('');
  };

  const submitPayment = async (id: string) => {
    setSubmitting(true);
    try {
      await api.post(`/api/seller-debts/${id}/payments`, {
        amount: payAmount || 0,
        method: payMethod,
        paymentDate: todayJakarta(),
      });
      showToast('success', 'Pembayaran utang berhasil disimpan.');
      cancelPayment();
      await loadDebts();
    } catch {
      showToast('danger', 'Gagal menyimpan pembayaran utang.');
    } finally {
      setSubmitting(false);
    }
  };

  const openLoanModal = () => {
    setLoanSellerId('');
    setLoanDate(todayJakarta());
    setLoanAmount('');
    setLoanNote('');
    setLoanErrors({});
    setShowLoanModal(true);
  };

  const closeLoanModal = () => {
    setShowLoanModal(false);
  };

  const handleSubmitLoan = async (e: FormEvent) => {
    e.preventDefault();

    const nextErrors: LoanFormErrors = {};
    if (!loanSellerId) nextErrors.sellerId = 'Penjual wajib dipilih.';
    if (loanAmount === '' || loanAmount <= 0) nextErrors.amount = 'Nominal wajib diisi dan harus lebih dari 0.';
    setLoanErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSavingLoan(true);
    try {
      await api.post('/api/seller-debts/loans', {
        sellerId: loanSellerId,
        date: loanDate,
        amount: loanAmount,
        note: loanNote || null,
      });
      showToast('success', 'Pinjaman berhasil dicatat.');
      closeLoanModal();
      await loadDebts();
    } catch {
      showToast('danger', 'Gagal mencatat pinjaman.');
    } finally {
      setSavingLoan(false);
    }
  };

  const columns: TableColumn<SellerDebt>[] = [
    { key: 'seller', header: 'Penjual', render: (d) => d.sellerName },
    { key: 'source', header: 'Sumber', render: (d) => SOURCE_LABEL[d.source] },
    { key: 'date', header: 'Tanggal', render: (d) => formatTanggal(d.debtDate, 'pendek') },
    {
      key: 'paidOffDate',
      header: 'Tanggal Pelunasan',
      render: (d) => (d.status === 'lunas' && d.paidOffDate ? formatTanggal(d.paidOffDate, 'pendek') : '-'),
    },
    { key: 'total', header: 'Utang', align: 'right', render: (d) => formatRupiah(d.totalAmount) },
    { key: 'paid', header: 'Terbayar', align: 'right', render: (d) => formatRupiah(d.amountPaid) },
    { key: 'outstanding', header: 'Sisa', align: 'right', render: (d) => formatRupiah(d.outstanding) },
    {
      key: 'status',
      header: 'Status',
      render: (d) => <Badge tone={d.status === 'lunas' ? 'success' : 'danger'}>{d.status === 'lunas' ? 'Lunas' : 'Belum Lunas'}</Badge>,
    },
  ];

  if (appUser?.role === 'admin') {
    columns.push({
      key: 'action',
      header: '',
      render: (d) =>
        d.status === 'lunas' ? null : payingId === d.id ? (
          <div className={styles.paymentForm}>
            <div className={styles.amountField}>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Rp. 0"
                className={[styles.amountInput, payExceedsOutstanding ? styles.amountInputError : ''].filter(Boolean).join(' ')}
                value={formatInputRupiah(payAmount)}
                onChange={(e) => setPayAmount(parseRupiahInput(e.target.value))}
              />
              {payExceedsOutstanding && (
                <span className={styles.fieldErrorText}>Nominal melebihi sisa utang ({formatRupiah(d.outstanding)})</span>
              )}
            </div>
            <select
              className={styles.methodSelect}
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as SellerDebtPaymentMethod)}
            >
              <option value="cash">Cash</option>
              <option value="qris">QRIS</option>
              <option value="potongan_gaji">Potongan Gaji</option>
            </select>
            <Button
              size="sm"
              variant="primary"
              onClick={() => submitPayment(d.id)}
              disabled={submitting || payExceedsOutstanding || !payAmount}
              title="Simpan"
              icon={<FontAwesomeIcon icon={faFloppyDisk} />}
            >
              <span className={styles.srOnly}>Simpan</span>
            </Button>
            <Button size="sm" variant="secondary" onClick={cancelPayment} title="Batal" icon={<FontAwesomeIcon icon={faXmark} />}>
              <span className={styles.srOnly}>Batal</span>
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={() => startPayment(d)} icon={<FontAwesomeIcon icon={faHandHoldingDollar} />}>
            Bayar
          </Button>
        ),
    });
  }

  return (
    <div>
      <PageHeader
        description="Pantau utang penjual — kekurangan setoran otomatis & pinjaman/kasbon manual."
        actions={
          appUser?.role === 'admin' ? (
            <Button variant="primary" icon={<FontAwesomeIcon icon={faPlus} />} onClick={openLoanModal}>
              Catat Pinjaman
            </Button>
          ) : undefined
        }
      />

      <div className={styles.filterRow}>
        <label>
          Status:{' '}
          <select
            className={styles.filterSelect}
            value={status}
            onChange={(e) => setStatus(e.target.value as '' | 'belum_lunas' | 'lunas')}
          >
            <option value="">Semua</option>
            <option value="belum_lunas">Belum Lunas</option>
            <option value="lunas">Lunas</option>
          </select>
        </label>
      </div>

      {loading ? (
        <SkeletonTable rows={4} columns={columns} />
      ) : error ? (
        <ErrorState onRetry={loadDebts} />
      ) : debts.length === 0 ? (
        <EmptyState message="Tidak ada utang penjual untuk filter ini." />
      ) : (
        <div className={styles.debtsTable}>
          <Table columns={columns} data={debts} rowKey={(d) => d.id} />
        </div>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

      {showLoanModal && (
        <Modal
          title="Catat Pinjaman"
          onClose={closeLoanModal}
          blurBackdrop
          footer={
            <>
              <Button variant="secondary" onClick={closeLoanModal} icon={<FontAwesomeIcon icon={faXmark} />}>
                Batal
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitLoan}
                disabled={savingLoan}
                icon={<FontAwesomeIcon icon={faFloppyDisk} />}
              >
                {savingLoan ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </>
          }
        >
          <form onSubmit={handleSubmitLoan} className={styles.form} noValidate>
            <FormField label="Penjual" htmlFor="loan-seller" required error={loanErrors.sellerId}>
              <Combobox
                id="loan-seller"
                value={loanSellerId}
                onChange={(value) => {
                  setLoanSellerId(value);
                  setLoanErrors((prev) => ({ ...prev, sellerId: undefined }));
                }}
                placeholder="Cari penjual..."
                emptyMessage="Penjual tidak ditemukan."
                options={sellers.map((s) => ({ value: s.id, label: s.name }))}
              />
            </FormField>
            <FormField label="Tanggal" htmlFor="loan-date" required>
              <input id="loan-date" type="date" value={loanDate} onChange={(e) => e.target.value && setLoanDate(e.target.value)} />
            </FormField>
            <FormField label="Nominal" htmlFor="loan-amount" required error={loanErrors.amount}>
              <input
                id="loan-amount"
                type="text"
                inputMode="numeric"
                placeholder="Rp. 0"
                value={formatInputRupiah(loanAmount)}
                onChange={(e) => {
                  setLoanAmount(parseRupiahInput(e.target.value));
                  setLoanErrors((prev) => ({ ...prev, amount: undefined }));
                }}
              />
            </FormField>
            <FormField label="Catatan" htmlFor="loan-note">
              <input id="loan-note" value={loanNote} onChange={(e) => setLoanNote(e.target.value)} placeholder="mis. alasan pinjam" />
            </FormField>
          </form>
        </Modal>
      )}

      {(submitting || savingLoan) && <LoadingOverlay message={savingLoan ? 'Menyimpan pinjaman...' : 'Menyimpan pembayaran...'} />}
    </div>
  );
}
