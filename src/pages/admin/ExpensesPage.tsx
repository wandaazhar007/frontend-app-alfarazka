import { useEffect, useState, type FormEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUtensils, faFloppyDisk, faTrashCan, faCheck, faPenToSquare, faXmark } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import type { Expense, ExpenseCategory } from '../../types/expense';
import type { Seller } from '../../types/seller';
import type { Paginated } from '../../types/pagination';
import { formatRupiah, formatInputRupiah, parseRupiahInput } from '../../utils/format';
import todayJakarta from '../../utils/todayJakarta';
import { PAGE_SIZE } from '../../utils/constants';
import Pagination from '../../components/Pagination/Pagination';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../components/Button/Button';
import FormField from '../../components/FormField/FormField';
import Table, { type TableColumn } from '../../components/Table/Table';
import Badge from '../../components/Badge/Badge';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import ConfirmModal from '../../components/Modal/ConfirmModal';
import Modal from '../../components/Modal/Modal';
import Combobox from '../../components/Combobox/Combobox';
import LoadingOverlay from '../../components/LoadingOverlay/LoadingOverlay';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';
import { useToast } from '../../components/Toast/ToastProvider';
import styles from './ExpensesPage.module.scss';

const MEAL_ALLOWANCE_CATEGORY = 'uang_makan_penjual';
const COGS_EXPENSE_CATEGORY = 'bahan_baku';

interface FormErrors {
  categoryId?: string;
  amount?: string;
}

interface MealFormErrors {
  sellerId?: string;
  amount?: string;
}

export default function ExpensesPage() {
  const { showToast } = useToast();
  const [date, setDate] = useState(todayJakarta());
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
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
  const [mealSellerId, setMealSellerId] = useState('');
  const [mealAmount, setMealAmount] = useState<number | ''>('');
  const [mealErrors, setMealErrors] = useState<MealFormErrors>({});
  const [mealSubmitting, setMealSubmitting] = useState(false);
  const [mealAddedIds, setMealAddedIds] = useState<string[]>([]);

  const loadExpenses = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get<Paginated<Expense>>('/api/expenses', {
        params: { date, page, pageSize: PAGE_SIZE },
      });
      setExpenses(data.data);
      setTotal(data.total);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
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

  // Ganti tanggal = konteks list baru, selalu mulai dari halaman 1.
  useEffect(() => {
    setPage(1);
  }, [date]);

  useEffect(() => {
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, page]);

  const mealCategory = categories.find((c) => c.name === MEAL_ALLOWANCE_CATEGORY);

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};
    if (!categoryId) nextErrors.categoryId = 'Kategori wajib dipilih.';
    if (amount === '' || amount <= 0) nextErrors.amount = 'Nominal wajib diisi dan harus lebih dari 0.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const startEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setCategoryId(expense.categoryId);
    setAmount(expense.amount);
    setDescription(expense.description ?? '');
    setErrors({});
  };

  const cancelEdit = () => {
    setEditingId(null);
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
      cancelEdit();
      showToast('success', editingId ? 'Pengeluaran berhasil diperbarui.' : 'Pengeluaran berhasil ditambahkan.');
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
        expenseDate: date,
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
      if (editingId === deleteTarget.id) cancelEdit();
      await loadExpenses();
    } catch {
      showToast('danger', 'Gagal menghapus pengeluaran.');
    } finally {
      setDeleting(false);
    }
  };

  const columns: TableColumn<Expense>[] = [
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
      <PageHeader
        description="Catat pengeluaran harian toko — bahan baku, gaji, sewa, dan lainnya."
        actions={<input type="date" className={styles.dateInput} value={date} onChange={(e) => setDate(e.target.value)} />}
      />

      <div className={styles.mealAllowanceRow}>
        <Button variant="secondary" icon={<FontAwesomeIcon icon={faUtensils} />} onClick={openMealModal}>
          Uang Makan Penjual
        </Button>
      </div>

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
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
        <div className={styles.actions}>
          <Button type="submit" variant="primary" disabled={submitting} icon={<FontAwesomeIcon icon={faFloppyDisk} />}>
            {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Pengeluaran'}
          </Button>
          {editingId && (
            <Button type="button" variant="secondary" onClick={cancelEdit} icon={<FontAwesomeIcon icon={faXmark} />}>
              Batal
            </Button>
          )}
        </div>
      </form>

      {loading ? (
        <SkeletonTable rows={4} />
      ) : error ? (
        <ErrorState onRetry={loadExpenses} />
      ) : expenses.length === 0 ? (
        <EmptyState message="Belum ada pengeluaran hari ini." />
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

      {showMealModal && (
        <Modal
          title="Uang Makan Penjual"
          onClose={closeMealModal}
        >
          <p className={styles.mealModalHint}>
            Tambahkan uang makan satu per satu sesuai penjual yang bekerja hari ini. Nominal terisi otomatis dari
            uang makan harian penjual, tapi bisa diubah.
          </p>

          <div className={styles.mealModalForm}>
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
