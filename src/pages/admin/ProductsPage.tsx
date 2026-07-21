import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPenToSquare, faFloppyDisk, faXmark, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import type { Product, ProductFormValues } from '../../types/product';
import type { ProductCategory } from '../../types/productCategory';
import type { Paginated } from '../../types/pagination';
import { PAGE_SIZE } from '../../utils/constants';
import { formatRupiah, formatInputRupiah, parseRupiahInput } from '../../utils/format';
import Pagination from '../../components/Pagination/Pagination';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../components/Button/Button';
import FormField from '../../components/FormField/FormField';
import Badge from '../../components/Badge/Badge';
import Table, { type TableColumn } from '../../components/Table/Table';
import Modal from '../../components/Modal/Modal';
import ConfirmModal from '../../components/Modal/ConfirmModal';
import Combobox from '../../components/Combobox/Combobox';
import SearchBox from '../../components/SearchBox/SearchBox';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';
import { useToast } from '../../components/Toast/ToastProvider';
import LoadingOverlay from '../../components/LoadingOverlay/LoadingOverlay';
import styles from './ProductsPage.module.scss';

const emptyForm: ProductFormValues = {
  name: '',
  categoryId: '',
  unitPrice: '',
  costPrice: '',
  commissionPerUnit: '',
  isActive: true,
};
const NO_CATEGORY_OPTION = { value: '', label: 'Tanpa kategori' };

interface FormErrors {
  name?: string;
  unitPrice?: string;
  costPrice?: string;
}

export default function ProductsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ProductFormValues>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Mengganti kata kunci pencarian sambil di halaman >1 memicu 2 request beruntun
  // (satu masih dengan `page` lama sebelum di-reset ke 1, satu lagi dengan page yang
  // sudah benar — lihat kedua useEffect di bawah). Kalau request PERTAMA (page lama,
  // hasilnya salah/kosong) selesai BELAKANGAN dari request KEDUA (page benar) karena
  // variasi waktu jaringan, hasil yang salah itu akan menimpa hasil yang benar di
  // layar. Request ID di sini memastikan cuma response dari request TERAKHIR yang
  // pernah dikirim yang boleh meng-update state, apapun urutan response-nya datang.
  const requestIdRef = useRef(0);

  const loadProducts = async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get<Paginated<Product>>('/api/products', {
        params: { page, pageSize: PAGE_SIZE, search: debouncedSearch || undefined },
      });
      if (requestId !== requestIdRef.current) return;
      setProducts(data.data);
      setTotal(data.total);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setError(true);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  // The category dropdown in the form needs ALL active categories — the page
  // param is deliberately omitted so the backend returns a plain array, not paginated.
  const loadCategories = async () => {
    try {
      const { data } = await api.get<ProductCategory[]>('/api/product-categories');
      setCategories(data.filter((c) => c.isActive));
    } catch {
      showToast('danger', 'Gagal memuat data kategori.');
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
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch]);

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      categoryId: product.categoryId ?? '',
      unitPrice: product.unitPrice,
      costPrice: product.costPrice,
      commissionPerUnit: product.commissionPerUnit || '',
      isActive: product.isActive,
    });
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
    if (!form.name.trim()) nextErrors.name = 'Nama produk wajib diisi.';
    if (form.unitPrice === '' || form.unitPrice <= 0) nextErrors.unitPrice = 'Harga satuan wajib diisi dan harus lebih dari 0.';
    if (form.costPrice === '' || form.costPrice < 0) nextErrors.costPrice = 'Harga modal wajib diisi.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);

    const payload = {
      name: form.name.trim(),
      categoryId: form.categoryId || null,
      unitPrice: form.unitPrice,
      costPrice: form.costPrice,
      commissionPerUnit: form.commissionPerUnit === '' ? 0 : form.commissionPerUnit,
      isActive: form.isActive,
    };

    try {
      if (editingId) {
        await api.put(`/api/products/${editingId}`, payload);
      } else {
        await api.post('/api/products', payload);
      }
      showToast('success', editingId ? 'Produk berhasil diperbarui.' : 'Produk berhasil ditambahkan.');
      closeModal();
      await loadProducts();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal menyimpan produk.';
      showToast('danger', message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/products/${deleteTarget.id}`);
      showToast('success', 'Produk berhasil dihapus.');
      setDeleteTarget(null);
      await loadProducts();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal menghapus produk.';
      showToast('danger', message);
    } finally {
      setDeleting(false);
    }
  };

  const columns: TableColumn<Product>[] = [
    { key: 'name', header: 'Nama', render: (p) => p.name },
    { key: 'category', header: 'Kategori', render: (p) => p.categoryName ?? '-' },
    { key: 'price', header: 'Harga Jual', align: 'right', render: (p) => formatRupiah(p.unitPrice) },
    { key: 'cost', header: 'Harga Modal (HPP)', align: 'right', render: (p) => formatRupiah(p.costPrice) },
    { key: 'active', header: 'Status', render: (p) => <Badge tone={p.isActive ? 'success' : 'neutral'}>{p.isActive ? 'Aktif' : 'Nonaktif'}</Badge> },
    {
      key: 'action',
      header: '',
      render: (p) => (
        <div className={styles.rowActions}>
          <Button size="sm" icon={<FontAwesomeIcon icon={faPenToSquare} />} onClick={() => openEditModal(p)}>
            Edit
          </Button>
          {!p.hasUsage && (
            <Button size="sm" variant="danger" icon={<FontAwesomeIcon icon={faTrashCan} />} onClick={() => setDeleteTarget(p)}>
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
        description="Kelola daftar produk roti yang dijual."
        actions={
          <Button variant="primary" icon={<FontAwesomeIcon icon={faPlus} />} onClick={openAddModal}>
            Tambah Produk
          </Button>
        }
      />
      <p className={styles.hint}>
        <Link to="/admin/product-categories">Kelola Kategori Produk</Link>
      </p>

      <SearchBox value={search} onChange={setSearch} placeholder="Cari nama produk..." />

      {loading ? (
        <SkeletonTable rows={4} />
      ) : error ? (
        <ErrorState onRetry={loadProducts} />
      ) : products.length === 0 ? (
        <EmptyState message={debouncedSearch ? 'Tidak ada produk dengan nama tersebut.' : 'Belum ada produk.'} />
      ) : (
        <div className={styles.productsTable}>
          <Table columns={columns} data={products} rowKey={(p) => p.id} />
        </div>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

      {showModal && (
        <Modal
          title={editingId ? 'Edit Produk' : 'Tambah Produk'}
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
            <FormField label="Nama Produk" htmlFor="product-name" required error={errors.name}>
              <input
                id="product-name"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }}
              />
            </FormField>
            <FormField label="Kategori" htmlFor="product-category">
              <Combobox
                id="product-category"
                value={form.categoryId}
                onChange={(value) => setForm({ ...form, categoryId: value })}
                placeholder="Cari kategori..."
                emptyMessage="Kategori tidak ditemukan."
                options={[NO_CATEGORY_OPTION, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
              />
            </FormField>
            <FormField label="Harga Satuan" htmlFor="product-price" required error={errors.unitPrice}>
              <input
                id="product-price"
                type="text"
                inputMode="numeric"
                placeholder="Rp."
                value={formatInputRupiah(form.unitPrice)}
                onChange={(e) => {
                  setForm({ ...form, unitPrice: parseRupiahInput(e.target.value) });
                  setErrors((prev) => ({ ...prev, unitPrice: undefined }));
                }}
              />
            </FormField>
            <FormField
              label="Harga Modal (HPP)"
              htmlFor="product-cost"
              required
              error={errors.costPrice}
              help="Dipakai untuk hitung otomatis HPP di Tutup Buku."
            >
              <input
                id="product-cost"
                type="text"
                inputMode="numeric"
                placeholder="Rp."
                value={formatInputRupiah(form.costPrice)}
                onChange={(e) => {
                  setForm({ ...form, costPrice: parseRupiahInput(e.target.value) });
                  setErrors((prev) => ({ ...prev, costPrice: undefined }));
                }}
              />
            </FormField>
            <FormField
              label="Komisi per Unit"
              htmlFor="product-commission"
              help="Opsional — cuma untuk produk yang dapat komisi penjual (mis. Es Sirsak). Kosongkan/Rp. 0 untuk produk roti biasa."
            >
              <input
                id="product-commission"
                type="text"
                inputMode="numeric"
                placeholder="Rp. 0"
                value={formatInputRupiah(form.commissionPerUnit)}
                onChange={(e) => setForm({ ...form, commissionPerUnit: parseRupiahInput(e.target.value) })}
              />
            </FormField>
            <div className={styles.checkboxField}>
              <input
                id="product-active"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <label htmlFor="product-active">Aktif</label>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`Yakin hapus produk "${deleteTarget.name}"? Tindakan ini tidak bisa dibatalkan.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          submitting={deleting}
        />
      )}

      {submitting && <LoadingOverlay message="Menyimpan produk..." />}
    </div>
  );
}
