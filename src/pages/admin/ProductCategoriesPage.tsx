import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPenToSquare, faFloppyDisk, faXmark, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import type { ProductCategory, ProductCategoryFormValues } from '../../types/productCategory';
import type { Paginated } from '../../types/pagination';
import { PAGE_SIZE } from '../../utils/constants';
import Pagination from '../../components/Pagination/Pagination';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../components/Button/Button';
import FormField from '../../components/FormField/FormField';
import Badge from '../../components/Badge/Badge';
import Table, { type TableColumn } from '../../components/Table/Table';
import Modal from '../../components/Modal/Modal';
import ConfirmModal from '../../components/Modal/ConfirmModal';
import SearchBox from '../../components/SearchBox/SearchBox';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';
import { useToast } from '../../components/Toast/ToastProvider';
import LoadingOverlay from '../../components/LoadingOverlay/LoadingOverlay';
import styles from './ProductCategoriesPage.module.scss';

const emptyForm: ProductCategoryFormValues = { name: '', isActive: true };

interface FormErrors {
  name?: string;
}

export default function ProductCategoriesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ProductCategoryFormValues>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductCategory | null>(null);
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
      const { data } = await api.get<Paginated<ProductCategory>>('/api/product-categories', {
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

  const openEditModal = (category: ProductCategory) => {
    setEditingId(category.id);
    setForm({ name: category.name, isActive: category.isActive });
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
    if (!form.name.trim()) nextErrors.name = 'Nama kategori wajib diisi.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);

    const payload = { name: form.name.trim(), isActive: form.isActive };

    try {
      if (editingId) {
        await api.put(`/api/product-categories/${editingId}`, payload);
      } else {
        await api.post('/api/product-categories', payload);
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
      await api.delete(`/api/product-categories/${deleteTarget.id}`);
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

  const columns: TableColumn<ProductCategory>[] = [
    { key: 'name', header: 'Nama', render: (c) => c.name },
    { key: 'active', header: 'Status', render: (c) => <Badge tone={c.isActive ? 'success' : 'neutral'}>{c.isActive ? 'Aktif' : 'Nonaktif'}</Badge> },
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
        description="Kelola kategori produk (mis. roti manis, donat, kue kering)."
        actions={
          <Button variant="primary" icon={<FontAwesomeIcon icon={faPlus} />} onClick={openAddModal}>
            Tambah Kategori
          </Button>
        }
      />
      <p className={styles.hint}>
        <Link to="/admin/products">&larr; Kembali ke Kelola Produk</Link>
      </p>

      <SearchBox value={search} onChange={setSearch} placeholder="Cari nama kategori..." />

      {loading ? (
        <SkeletonTable rows={3} />
      ) : error ? (
        <ErrorState onRetry={loadCategories} />
      ) : categories.length === 0 ? (
        <EmptyState message={debouncedSearch ? 'Tidak ada kategori dengan nama tersebut.' : 'Belum ada kategori produk.'} />
      ) : (
        <Table columns={columns} data={categories} rowKey={(c) => c.id} />
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
            <FormField label="Nama Kategori" htmlFor="category-name" required error={errors.name}>
              <input
                id="category-name"
                placeholder="mis. Roti Manis"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }}
              />
            </FormField>
            <div className={styles.checkboxField}>
              <input
                id="category-active"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <label htmlFor="category-active">Aktif</label>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`Yakin hapus kategori "${deleteTarget.name}"? Tindakan ini tidak bisa dibatalkan.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          submitting={deleting}
        />
      )}

      {submitting && <LoadingOverlay message="Menyimpan kategori produk..." />}
    </div>
  );
}
