import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import type { Product, ProductFormValues } from '../../types/product';
import type { ProductCategory } from '../../types/productCategory';
import type { Paginated } from '../../types/pagination';
import { PAGE_SIZE } from '../../utils/constants';
import { formatRupiah } from '../../utils/format';
import Pagination from '../../components/Pagination/Pagination';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../components/Button/Button';
import FormField from '../../components/FormField/FormField';
import Badge from '../../components/Badge/Badge';
import Table, { type TableColumn } from '../../components/Table/Table';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';
import { useToast } from '../../components/Toast/ToastProvider';
import styles from './ProductsPage.module.scss';

const emptyForm: ProductFormValues = { name: '', categoryId: '', unitPrice: 0, isActive: true };

export default function ProductsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [form, setForm] = useState<ProductFormValues>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get<Paginated<Product>>('/api/products', { params: { page, pageSize: PAGE_SIZE } });
      setProducts(data.data);
      setTotal(data.total);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
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

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      categoryId: product.categoryId ?? '',
      unitPrice: product.unitPrice,
      isActive: product.isActive,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name: form.name,
      categoryId: form.categoryId || null,
      unitPrice: form.unitPrice,
      isActive: form.isActive,
    };

    try {
      if (editingId) {
        await api.put(`/api/products/${editingId}`, payload);
      } else {
        await api.post('/api/products', payload);
      }
      showToast('success', editingId ? 'Produk berhasil diperbarui.' : 'Produk berhasil ditambahkan.');
      cancelEdit();
      await loadProducts();
    } catch {
      showToast('danger', 'Gagal menyimpan produk.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: TableColumn<Product>[] = [
    { key: 'name', header: 'Nama', render: (p) => p.name },
    { key: 'category', header: 'Kategori', render: (p) => p.categoryName ?? '-' },
    { key: 'price', header: 'Harga', align: 'right', render: (p) => formatRupiah(p.unitPrice) },
    { key: 'active', header: 'Status', render: (p) => <Badge tone={p.isActive ? 'success' : 'neutral'}>{p.isActive ? 'Aktif' : 'Nonaktif'}</Badge> },
    {
      key: 'action',
      header: '',
      render: (p) => (
        <Button size="sm" onClick={() => startEdit(p)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader description="Kelola daftar produk roti yang dijual." />
      <p className={styles.hint}>
        <Link to="/admin/product-categories">Kelola Kategori Produk</Link>
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <FormField label="Nama Produk" htmlFor="product-name">
          <input id="product-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </FormField>
        <FormField label="Kategori" htmlFor="product-category">
          <select id="product-category" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            <option value="">Tanpa kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Harga Satuan" htmlFor="product-price">
          <input
            id="product-price"
            type="number"
            value={form.unitPrice}
            onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })}
            required
            min={0}
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
        <div className={styles.actions}>
          <Button type="submit" variant="primary" disabled={submitting}>
            {editingId ? 'Simpan Perubahan' : 'Tambah Produk'}
          </Button>
          {editingId && (
            <Button type="button" variant="secondary" onClick={cancelEdit}>
              Batal
            </Button>
          )}
        </div>
      </form>

      {loading ? (
        <SkeletonTable rows={4} />
      ) : error ? (
        <ErrorState onRetry={loadProducts} />
      ) : products.length === 0 ? (
        <EmptyState message="Belum ada produk." />
      ) : (
        <Table columns={columns} data={products} rowKey={(p) => p.id} />
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
