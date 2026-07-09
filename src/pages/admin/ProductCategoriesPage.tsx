import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
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
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';
import { useToast } from '../../components/Toast/ToastProvider';
import styles from './ProductCategoriesPage.module.scss';

const emptyForm: ProductCategoryFormValues = { name: '', isActive: true };

export default function ProductCategoriesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [form, setForm] = useState<ProductCategoryFormValues>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadCategories = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get<Paginated<ProductCategory>>('/api/product-categories', {
        params: { page, pageSize: PAGE_SIZE },
      });
      setCategories(data.data);
      setTotal(data.total);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const startEdit = (category: ProductCategory) => {
    setEditingId(category.id);
    setForm({ name: category.name, isActive: category.isActive });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingId) {
        await api.put(`/api/product-categories/${editingId}`, form);
        cancelEdit();
      } else {
        await api.post('/api/product-categories', form);
        setForm(emptyForm);
      }
      showToast('success', editingId ? 'Kategori berhasil diperbarui.' : 'Kategori berhasil ditambahkan.');
      await loadCategories();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal menyimpan kategori.';
      showToast('danger', message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns: TableColumn<ProductCategory>[] = [
    { key: 'name', header: 'Nama', render: (c) => c.name },
    { key: 'active', header: 'Status', render: (c) => <Badge tone={c.isActive ? 'success' : 'neutral'}>{c.isActive ? 'Aktif' : 'Nonaktif'}</Badge> },
    {
      key: 'action',
      header: '',
      render: (c) => (
        <Button size="sm" onClick={() => startEdit(c)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader description="Kelola kategori produk (mis. roti manis, donat, kue kering)." />
      <p className={styles.hint}>
        <Link to="/admin/products">&larr; Kembali ke Kelola Produk</Link>
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <FormField label="Nama Kategori" htmlFor="category-name">
          <input
            id="category-name"
            placeholder="mis. Roti Manis"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
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
        <div className={styles.actions}>
          <Button type="submit" variant="primary" disabled={submitting}>
            {editingId ? 'Simpan Perubahan' : 'Tambah Kategori'}
          </Button>
          {editingId && (
            <Button type="button" variant="secondary" onClick={cancelEdit}>
              Batal
            </Button>
          )}
        </div>
      </form>

      {loading ? (
        <SkeletonTable rows={3} />
      ) : error ? (
        <ErrorState onRetry={loadCategories} />
      ) : categories.length === 0 ? (
        <EmptyState message="Belum ada kategori produk." />
      ) : (
        <Table columns={columns} data={categories} rowKey={(c) => c.id} />
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
