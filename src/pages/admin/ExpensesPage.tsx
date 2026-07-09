import { useEffect, useState, type FormEvent } from 'react';
import api from '../../services/api';
import type { Expense, ExpenseCategory } from '../../types/expense';
import type { Paginated } from '../../types/pagination';
import { formatRupiah } from '../../utils/format';
import todayJakarta from '../../utils/todayJakarta';
import { PAGE_SIZE } from '../../utils/constants';
import Pagination from '../../components/Pagination/Pagination';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../components/Button/Button';
import FormField from '../../components/FormField/FormField';
import Table, { type TableColumn } from '../../components/Table/Table';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import ConfirmModal from '../../components/Modal/ConfirmModal';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';
import { useToast } from '../../components/Toast/ToastProvider';
import styles from './ExpensesPage.module.scss';

const MEAL_ALLOWANCE_CATEGORY = 'uang_makan_penjual';
const SELLER_COUNT = 7;
const MEAL_ALLOWANCE_PER_SELLER = 20000;

export default function ExpensesPage() {
  const { showToast } = useToast();
  const [date, setDate] = useState(todayJakarta());
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    const loadCategories = async () => {
      try {
        const { data } = await api.get<ExpenseCategory[]>('/api/expense-categories');
        setCategories(data);
      } catch {
        showToast('danger', 'Gagal memuat kategori pengeluaran.');
      }
    };
    loadCategories();
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      showToast('danger', 'Pilih kategori pengeluaran.');
      return;
    }

    setSubmitting(true);

    try {
      await api.post('/api/expenses', {
        categoryId,
        amount,
        description: description || null,
        expenseDate: date,
      });
      setCategoryId('');
      setAmount(0);
      setDescription('');
      showToast('success', 'Pengeluaran berhasil ditambahkan.');
      await loadExpenses();
    } catch {
      showToast('danger', 'Gagal menyimpan pengeluaran.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickMealAllowance = async () => {
    const mealCategory = categories.find((c) => c.name === MEAL_ALLOWANCE_CATEGORY);
    if (!mealCategory) {
      showToast('danger', `Kategori '${MEAL_ALLOWANCE_CATEGORY}' tidak ditemukan.`);
      return;
    }

    setSubmitting(true);

    try {
      await api.post('/api/expenses', {
        categoryId: mealCategory.id,
        amount: SELLER_COUNT * MEAL_ALLOWANCE_PER_SELLER,
        description: `Uang makan ${SELLER_COUNT} penjual`,
        expenseDate: date,
      });
      showToast('success', 'Uang makan penjual berhasil ditambahkan.');
      await loadExpenses();
    } catch {
      showToast('danger', 'Gagal menyimpan uang makan penjual.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/expenses/${deleteTarget.id}`);
      showToast('success', 'Pengeluaran berhasil dihapus.');
      setDeleteTarget(null);
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
        <Button size="sm" variant="danger" onClick={() => setDeleteTarget(e)}>
          Hapus
        </Button>
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
        <Button variant="secondary" onClick={handleQuickMealAllowance} disabled={submitting}>
          Tambah Uang Makan Penjual (7 x Rp 20.000)
        </Button>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <FormField label="Kategori" htmlFor="expense-category">
          <select id="expense-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')} required>
            <option value="">Pilih kategori...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Nominal" htmlFor="expense-amount">
          <input
            id="expense-amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            min={0}
            required
          />
        </FormField>
        <FormField label="Keterangan" htmlFor="expense-description">
          <input id="expense-description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </FormField>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Menyimpan...' : 'Tambah Pengeluaran'}
        </Button>
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
    </div>
  );
}
