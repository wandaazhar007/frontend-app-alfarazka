import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faFloppyDisk, faXmark, faPenToSquare, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import type { ExpenseCategory, ExpenseCategoryFormValues } from '../../types/expense';
import type { Paginated } from '../../types/pagination';
import { PAGE_SIZE } from '../../utils/constants';
import Pagination from '../../components/Pagination/Pagination';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../components/Button/Button';
import FormField from '../../components/FormField/FormField';
import Table, { type TableColumn } from '../../components/Table/Table';
import Modal from '../../components/Modal/Modal';
import SearchBox from '../../components/SearchBox/SearchBox';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import ConfirmModal from '../../components/Modal/ConfirmModal';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';
import { useToast } from '../../components/Toast/ToastProvider';
import LoadingOverlay from '../../components/LoadingOverlay/LoadingOverlay';
import styles from './ExpenseCategoriesPage.module.scss';

const emptyForm: ExpenseCategoryFormValues = { name: '' };
const NAME_MAX_LENGTH = 50;

interface FormErrors {
  name?: string;
}

export default function ExpenseCategoriesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ExpenseCategoryFormValues>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Mengganti kata kunci pencarian sambil di halaman >1 memicu 2 request beruntun
  // (satu masih dengan `page` lama sebelum di-reset ke 1, satu lagi dengan page yang
  // sudah benar — lihat kedua useEffect di bawah). Kalau request PERTAMA (page lama,
  // hasilnya salah/kosong) selesai BELAKANGAN dari request KEDUA (page benar) karena
  // variasi waktu jaringan, hasil yang salah itu akan menimpa hasil yang benar di
  // layar. Request ID di sini memastikan cuma response dari request TERAKHIR yang
  // pernah dikirim yang boleh meng-update state, apapun urutan response-nya datang.
  const requestIdRef = useRef(0);

  const loadCategories = async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get<Paginated<ExpenseCategory>>('/api/expense-categories', {
        params: { page, pageSize: PAGE_SIZE, search: debouncedSearch || undefined },
      });
      if (requestId !== requestIdRef.current) return;
      setCategories(data.data);
      setTotal(data.total);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setError(true);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  // Live search dengan debounce (300ms) — tidak query tiap ketukan tombol,
  // cukup begitu admin berhenti mengetik sejenak.
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Ganti kata kunci pencarian = konteks list baru, selalu mulai dari halaman 1.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch]);

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (category: ExpenseCategory) => {
    setEditingId(category.id);
    setForm({ name: category.name });
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
  };

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      nextErrors.name = 'Nama kategori wajib diisi.';
    } else if (trimmedName.length > NAME_MAX_LENGTH) {
      nextErrors.name = `Nama kategori maksimal ${NAME_MAX_LENGTH} karakter.`;
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const payload = { name: form.name.trim() };
      if (editingId) {
        await api.put(`/api/expense-categories/${editingId}`, payload);
      } else {
        await api.post('/api/expense-categories', payload);
      }
      showToast('success', editingId ? 'Kategori berhasil diperbarui.' : 'Kategori berhasil ditambahkan.');
      closeModal();
      await loadCategories();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal menyimpan kategori.';
      showToast('danger', message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/expense-categories/${deleteTarget.id}`);
      showToast('success', 'Kategori berhasil dihapus.');
      setDeleteTarget(null);
      await loadCategories();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal menghapus kategori.';
      showToast('danger', message);
    } finally {
      setDeleting(false);
    }
  };

  const columns: TableColumn<ExpenseCategory>[] = [
    { key: 'name', header: 'Nama', render: (c) => c.name },
    {
      key: 'action',
      header: '',
      render: (c) => (
        <div className={styles.rowActions}>
          <Button size="sm" icon={<FontAwesomeIcon icon={faPenToSquare} />} onClick={() => openEditModal(c)}>
            Edit
          </Button>
          {!c.hasUsage && (
            <Button size="sm" variant="danger" icon={<FontAwesomeIcon icon={faTrashCan} />} onClick={() => setDeleteTarget(c)}>
              Hapus
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        description="Kelola kategori pengeluaran (mis. bahan baku, gaji, sewa, uang makan penjual)."
        actions={
          <Button variant="primary" icon={<FontAwesomeIcon icon={faPlus} />} onClick={openAddModal}>
            Tambah Kategori
          </Button>
        }
      />
      <p className={styles.hint}>
        <Link to="/admin/expenses">&larr; Kembali ke Kelola Pengeluaran</Link>
      </p>

      <SearchBox value={search} onChange={setSearch} placeholder="Cari nama kategori..." />

      {loading ? (
        <SkeletonTable rows={3} columns={columns} />
      ) : error ? (
        <ErrorState onRetry={loadCategories} />
      ) : categories.length === 0 ? (
        <EmptyState message={debouncedSearch ? 'Tidak ada kategori dengan nama tersebut.' : 'Belum ada kategori pengeluaran.'} />
      ) : (
        <Table columns={columns} data={categories} rowKey={(c) => String(c.id)} />
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

      {showModal && (
        <Modal
          title={editingId ? 'Edit Kategori' : 'Tambah Kategori'}
          onClose={closeModal}
          blurBackdrop
          footer={
            <>
              <Button variant="secondary" onClick={closeModal} icon={<FontAwesomeIcon icon={faXmark} />}>
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
            <FormField label="Nama Kategori" htmlFor="expense-category-name" required error={errors.name}>
              <input
                id="expense-category-name"
                placeholder="mis. Bahan Baku"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  setErrors({});
                }}
                maxLength={NAME_MAX_LENGTH}
              />
            </FormField>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`Yakin hapus kategori "${deleteTarget.name}"? Kategori yang masih dipakai di data pengeluaran tidak bisa dihapus.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          submitting={deleting}
        />
      )}

      {submitting && <LoadingOverlay message="Menyimpan kategori pengeluaran..." />}
    </div>
  );
}
