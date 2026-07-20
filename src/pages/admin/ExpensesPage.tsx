import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faUtensils,
  faFloppyDisk,
  faTrashCan,
  faCheck,
  faPenToSquare,
  faXmark,
  faFileExcel,
  faFilePdf,
} from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import type { Expense, ExpenseCategory } from '../../types/expense';
import type { Seller } from '../../types/seller';
import type { Paginated } from '../../types/pagination';
import { formatRupiah, formatInputRupiah, parseRupiahInput, formatTanggal } from '../../utils/format';
import todayJakarta from '../../utils/todayJakarta';
import downloadExpensesReport from '../../utils/downloadExpensesReport';
import { PAGE_SIZE } from '../../utils/constants';
import Pagination from '../../components/Pagination/Pagination';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../components/Button/Button';
import FormField from '../../components/FormField/FormField';
import Table, { type TableColumn } from '../../components/Table/Table';
import Badge from '../../components/Badge/Badge';
import StatCard from '../../components/StatCard/StatCard';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import ConfirmModal from '../../components/Modal/ConfirmModal';
import Modal from '../../components/Modal/Modal';
import Combobox from '../../components/Combobox/Combobox';
import LoadingOverlay from '../../components/LoadingOverlay/LoadingOverlay';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';
import { useToast } from '../../components/Toast/ToastProvider';
import styles from './ExpensesPage.module.scss';

const MEAL_ALLOWANCE_CATEGORY = 'Uang Makan Penjual';
const COGS_EXPENSE_CATEGORY = 'Bahan Baku';

interface FormErrors {
  categoryId?: string;
  amount?: string;
  date?: string;
}

interface MealFormErrors {
  sellerId?: string;
  amount?: string;
}

export default function ExpensesPage() {
  const { showToast } = useToast();
  // Rentang tanggal untuk FILTER tabel — terpisah dari tanggal pengeluaran baru (state `date`
  // di dalam modal tambah/edit, dan `mealDate` di modal uang makan), supaya mengganti filter
  // tidak pernah mengubah tanggal yang tercatat saat admin menambah pengeluaran.
  const [fromDate, setFromDate] = useState(todayJakarta());
  const [toDate, setToDate] = useState(todayJakarta());
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalMealAllowance, setTotalMealAllowance] = useState(0);
  const [totalOther, setTotalOther] = useState(0);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const [showFormModal, setShowFormModal] = useState(false);
  const [date, setDate] = useState(todayJakarta());
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [amount, setAmount] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [showMealModal, setShowMealModal] = useState(false);
  const [mealDate, setMealDate] = useState(todayJakarta());
  const [mealSellerId, setMealSellerId] = useState('');
  const [mealAmount, setMealAmount] = useState<number | ''>('');
  const [mealErrors, setMealErrors] = useState<MealFormErrors>({});
  const [mealSubmitting, setMealSubmitting] = useState(false);
  const [mealAddedIds, setMealAddedIds] = useState<string[]>([]);

  // Reload bisa dipicu berurutan (mis. ganti fromDate lalu toDate dengan cepat) — request ID
  // memastikan cuma response dari request TERAKHIR yang boleh meng-update state, apapun urutan
  // datangnya (pola yang sama dipakai di ExpenseCategoriesPage.tsx dst.).
  const requestIdRef = useRef(0);

  const loadExpenses = async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get<Paginated<Expense>>('/api/expenses', {
        params: { from: fromDate, to: toDate, page, pageSize: PAGE_SIZE },
      });
      if (requestId !== requestIdRef.current) return;
      setExpenses(data.data);
      setTotal(data.total);
      setTotalAmount(data.totalAmount ?? 0);
      setTotalMealAllowance(data.totalMealAllowance ?? 0);
      setTotalOther(data.totalOther ?? 0);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setError(true);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  const handleFromDateChange = (value: string) => {
    setFromDate(value);
    if (value > toDate) setToDate(value);
  };

  const handleToDateChange = (value: string) => {
    setToDate(value);
    if (value < fromDate) setFromDate(value);
  };

  const handleExport = async (format: 'pdf' | 'xlsx') => {
    setExporting(true);
    try {
      await downloadExpensesReport(fromDate, toDate, format);
    } catch {
      showToast('danger', 'Gagal export laporan pengeluaran.');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [categoriesRes, sellersRes] = await Promise.all([
          api.get<ExpenseCategory[]>('/api/expense-categories'),
          api.get<Seller[]>('/api/sellers'),
        ]);
        setCategories(categoriesRes.data);
        setSellers(sellersRes.data.filter((s) => s.isActive));
      } catch {
        showToast('danger', 'Gagal memuat data kategori/penjual.');
      }
    };
    loadMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ganti rentang tanggal = konteks list baru, selalu mulai dari halaman 1.
  useEffect(() => {
    setPage(1);
  }, [fromDate, toDate]);

  useEffect(() => {
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, page]);

  const mealCategory = categories.find((c) => c.name === MEAL_ALLOWANCE_CATEGORY);

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};
    if (!date) nextErrors.date = 'Tanggal wajib diisi.';
    if (!categoryId) nextErrors.categoryId = 'Kategori wajib dipilih.';
    if (amount === '' || amount <= 0) nextErrors.amount = 'Nominal wajib diisi dan harus lebih dari 0.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const openAddModal = () => {
    setEditingId(null);
    setDate(todayJakarta());
    setCategoryId('');
    setAmount('');
    setDescription('');
    setErrors({});
    setShowFormModal(true);
  };

  const startEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setDate(expense.expenseDate);
    setCategoryId(expense.categoryId);
    setAmount(expense.amount);
    setDescription(expense.description ?? '');
    setErrors({});
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditingId(null);
    setDate(todayJakarta());
    setCategoryId('');
    setAmount('');
    setDescription('');
    setErrors({});
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const payload = {
        categoryId,
        amount,
        description: description || null,
        expenseDate: date,
      };
      if (editingId) {
        await api.put(`/api/expenses/${editingId}`, payload);
      } else {
        await api.post('/api/expenses', payload);
      }
      showToast('success', editingId ? 'Pengeluaran berhasil diperbarui.' : 'Pengeluaran berhasil ditambahkan.');
      closeFormModal();
      await loadExpenses();
    } catch {
      showToast('danger', editingId ? 'Gagal memperbarui pengeluaran.' : 'Gagal menyimpan pengeluaran.');
    } finally {
      setSubmitting(false);
    }
  };

  const openMealModal = () => {
    if (!mealCategory) {
      showToast('danger', `Kategori '${MEAL_ALLOWANCE_CATEGORY}' tidak ditemukan.`);
      return;
    }
    setMealDate(todayJakarta());
    setMealSellerId('');
    setMealAmount('');
    setMealErrors({});
    setMealAddedIds([]);
    setShowMealModal(true);
  };

  const closeMealModal = () => {
    setShowMealModal(false);
  };

  const handleMealSellerChange = (sellerId: string) => {
    setMealSellerId(sellerId);
    const seller = sellers.find((s) => s.id === sellerId);
    setMealAmount(seller ? seller.dailyMealAllowance : '');
    setMealErrors({});
  };

  const handleAddMealAllowance = async () => {
    const nextErrors: MealFormErrors = {};
    if (!mealSellerId) nextErrors.sellerId = 'Penjual wajib dipilih.';
    if (mealAmount === '' || mealAmount <= 0) nextErrors.amount = 'Nominal wajib diisi dan harus lebih dari 0.';
    setMealErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !mealCategory) return;

    const seller = sellers.find((s) => s.id === mealSellerId);
    if (!seller) return;

    setMealSubmitting(true);

    try {
      await api.post('/api/expenses', {
        categoryId: mealCategory.id,
        amount: mealAmount,
        description: `Uang makan - ${seller.name}`,
        expenseDate: mealDate,
      });
      setMealAddedIds((prev) => [...prev, seller.id]);
      setMealSellerId('');
      setMealAmount('');
      showToast('success', `Uang makan ${seller.name} berhasil ditambahkan.`);
      await loadExpenses();
    } catch {
      showToast('danger', 'Gagal menyimpan uang makan penjual.');
    } finally {
      setMealSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/expenses/${deleteTarget.id}`);
      showToast('success', 'Pengeluaran berhasil dihapus.');
      setDeleteTarget(null);
      if (editingId === deleteTarget.id) closeFormModal();
      await loadExpenses();
    } catch {
      showToast('danger', 'Gagal menghapus pengeluaran.');
    } finally {
      setDeleting(false);
    }
  };

  const columns: TableColumn<Expense>[] = [
    { key: 'date', header: 'Tanggal', render: (e) => formatTanggal(e.expenseDate, 'pendek') },
    { key: 'category', header: 'Kategori', render: (e) => e.categoryName },
    { key: 'amount', header: 'Nominal', align: 'right', render: (e) => formatRupiah(e.amount) },
    { key: 'description', header: 'Keterangan', render: (e) => e.description ?? '-' },
    {
      key: 'action',
      header: '',
      render: (e) => (
        <div className={styles.actions}>
          <Button size="sm" icon={<FontAwesomeIcon icon={faPenToSquare} />} onClick={() => startEdit(e)}>
            Edit
          </Button>
          <Button size="sm" variant="danger" icon={<FontAwesomeIcon icon={faTrashCan} />} onClick={() => setDeleteTarget(e)}>
            Hapus
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader description="Catat pengeluaran harian toko — bahan baku, gaji, sewa, dan lainnya." />

      <div className={styles.actionsRow}>
        <Button variant="primary" icon={<FontAwesomeIcon icon={faPlus} />} onClick={openAddModal}>
          Tambah Pengeluaran
        </Button>
        <Button variant="secondary" icon={<FontAwesomeIcon icon={faUtensils} />} onClick={openMealModal}>
          Uang Makan Penjual
        </Button>
      </div>

      <div className={styles.filterRow}>
        <div className={styles.dateFields}>
          <FormField label="Dari Tanggal" htmlFor="expense-filter-from">
            <input
              id="expense-filter-from"
              type="date"
              value={fromDate}
              onChange={(e) => handleFromDateChange(e.target.value)}
            />
          </FormField>
          <FormField label="Sampai Tanggal" htmlFor="expense-filter-to">
            <input
              id="expense-filter-to"
              type="date"
              value={toDate}
              onChange={(e) => handleToDateChange(e.target.value)}
            />
          </FormField>
        </div>
        <div className={styles.exportButtons}>
          <Button variant="secondary" icon={<FontAwesomeIcon icon={faFileExcel} />} onClick={() => handleExport('xlsx')} disabled={exporting}>
            Export Excel
          </Button>
          <Button variant="secondary" icon={<FontAwesomeIcon icon={faFilePdf} />} onClick={() => handleExport('pdf')} disabled={exporting}>
            Export PDF
          </Button>
        </div>
      </div>

      <div className={styles.selectedRangeRow}>
        <Badge tone="success">
          {fromDate === toDate
            ? formatTanggal(fromDate, 'dash')
            : `${formatTanggal(fromDate, 'dash')} s/d ${formatTanggal(toDate, 'dash')}`}
        </Badge>
      </div>

      <div className={styles.statGrid}>
        <StatCard label="Uang Makan" value={formatRupiah(totalMealAllowance)} />
        <StatCard label="Lain-lain" value={formatRupiah(totalOther)} />
        <StatCard label="Total Pengeluaran" value={formatRupiah(totalAmount)} variant="highlight" />
      </div>

      {loading ? (
        <SkeletonTable rows={4} />
      ) : error ? (
        <ErrorState onRetry={loadExpenses} />
      ) : expenses.length === 0 ? (
        <EmptyState message="Belum ada pengeluaran pada rentang tanggal ini." />
      ) : (
        <Table columns={columns} data={expenses} rowKey={(e) => e.id} />
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

      {deleteTarget && (
        <ConfirmModal
          message={`Yakin hapus pengeluaran "${deleteTarget.categoryName}" senilai ${formatRupiah(deleteTarget.amount)}? Tindakan ini tidak bisa dibatalkan.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          submitting={deleting}
        />
      )}

      {showFormModal && (
        <Modal
          title={editingId ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}
          onClose={closeFormModal}
          blurBackdrop
          footer={
            <>
              <Button variant="secondary" onClick={closeFormModal} icon={<FontAwesomeIcon icon={faXmark} />}>
                Batal
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={submitting}
                icon={<FontAwesomeIcon icon={faFloppyDisk} />}
              >
                {submitting ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </>
          }
        >
          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <FormField label="Tanggal" htmlFor="expense-date" required error={errors.date}>
              <input
                id="expense-date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setErrors((prev) => ({ ...prev, date: undefined }));
                }}
              />
            </FormField>
            <FormField
              label="Kategori"
              htmlFor="expense-category"
              required
              error={errors.categoryId}
              help={
                categories.find((c) => c.id === categoryId)?.name === COGS_EXPENSE_CATEGORY
                  ? "Kategori 'Bahan Baku' tidak lagi mengurangi Laba Bersih — HPP sekarang dihitung otomatis dari harga modal produk × qty terjual."
                  : undefined
              }
            >
              <Combobox
                id="expense-category"
                value={categoryId === '' ? '' : String(categoryId)}
                onChange={(value) => {
                  setCategoryId(value ? Number(value) : '');
                  setErrors((prev) => ({ ...prev, categoryId: undefined }));
                }}
                placeholder="Cari kategori..."
                emptyMessage="Kategori tidak ditemukan."
                options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
              />
            </FormField>
            <FormField label="Nominal" htmlFor="expense-amount" required error={errors.amount}>
              <input
                id="expense-amount"
                type="text"
                inputMode="numeric"
                placeholder="Rp. 0"
                value={formatInputRupiah(amount)}
                onChange={(e) => {
                  setAmount(parseRupiahInput(e.target.value));
                  setErrors((prev) => ({ ...prev, amount: undefined }));
                }}
              />
            </FormField>
            <FormField label="Keterangan" htmlFor="expense-description">
              <input id="expense-description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </FormField>
          </form>
        </Modal>
      )}

      {showMealModal && (
        <Modal
          title="Uang Makan Penjual"
          onClose={closeMealModal}
          blurBackdrop
        >
          <p className={styles.mealModalHint}>
            Tambahkan uang makan satu per satu sesuai penjual yang bekerja hari ini. Nominal terisi otomatis dari
            uang makan harian penjual, tapi bisa diubah.
          </p>

          <div className={styles.mealModalForm}>
            <FormField label="Tanggal" htmlFor="meal-date" required>
              <input id="meal-date" type="date" value={mealDate} onChange={(e) => setMealDate(e.target.value)} />
            </FormField>
            <FormField label="Penjual" htmlFor="meal-seller" required error={mealErrors.sellerId}>
              <Combobox
                id="meal-seller"
                value={mealSellerId}
                onChange={handleMealSellerChange}
                placeholder="Cari penjual..."
                emptyMessage="Semua penjual aktif sudah ditambahkan hari ini."
                options={sellers
                  .filter((s) => !mealAddedIds.includes(s.id))
                  .map((s) => ({ value: s.id, label: s.name }))}
              />
            </FormField>
            <FormField label="Nominal" htmlFor="meal-amount" required error={mealErrors.amount}>
              <input
                id="meal-amount"
                type="text"
                inputMode="numeric"
                placeholder="Rp. 0"
                value={formatInputRupiah(mealAmount)}
                onChange={(e) => {
                  setMealAmount(parseRupiahInput(e.target.value));
                  setMealErrors((prev) => ({ ...prev, amount: undefined }));
                }}
              />
            </FormField>
            <div className={styles.mealModalSubmitRow}>
              <Button
                variant="primary"
                icon={<FontAwesomeIcon icon={faFloppyDisk} />}
                onClick={handleAddMealAllowance}
                disabled={mealSubmitting}
              >
                {mealSubmitting ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>

          {mealAddedIds.length > 0 && (
            <div className={styles.mealModalAddedList}>
              {mealAddedIds.map((id) => {
                const seller = sellers.find((s) => s.id === id);
                if (!seller) return null;
                return (
                  <Badge key={id} tone="success">
                    <FontAwesomeIcon icon={faCheck} /> {seller.name}
                  </Badge>
                );
              })}
            </div>
          )}
        </Modal>
      )}

      {(submitting || mealSubmitting) && (
        <LoadingOverlay message={mealSubmitting ? 'Menyimpan uang makan...' : 'Menyimpan pengeluaran...'} />
      )}
    </div>
  );
}
