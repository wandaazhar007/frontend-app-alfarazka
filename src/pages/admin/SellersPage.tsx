import { useEffect, useState, type FormEvent } from 'react';
import api from '../../services/api';
import type { Seller, SellerFormValues } from '../../types/seller';
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
import TempPasswordBanner from '../../components/TempPasswordBanner/TempPasswordBanner';
import styles from './SellersPage.module.scss';

const emptyForm: SellerFormValues = {
  name: '',
  email: '',
  phone: '',
  qrisTerminalId: '',
  dailyMealAllowance: 20000,
  isActive: true,
};

export default function SellersPage() {
  const { showToast } = useToast();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [form, setForm] = useState<SellerFormValues>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const loadSellers = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get<Paginated<Seller>>('/api/sellers', { params: { page, pageSize: PAGE_SIZE } });
      setSellers(data.data);
      setTotal(data.total);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSellers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const startEdit = (seller: Seller) => {
    setEditingId(seller.id);
    setTempPassword(null);
    setForm({
      name: seller.name,
      email: seller.email,
      phone: seller.phone ?? '',
      qrisTerminalId: seller.qrisTerminalId ?? '',
      dailyMealAllowance: seller.dailyMealAllowance,
      isActive: seller.isActive,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTempPassword(null);

    try {
      if (editingId) {
        await api.put(`/api/sellers/${editingId}`, {
          name: form.name,
          phone: form.phone || null,
          qrisTerminalId: form.qrisTerminalId || null,
          dailyMealAllowance: form.dailyMealAllowance,
          isActive: form.isActive,
        });
        showToast('success', 'Data penjual berhasil diperbarui.');
        cancelEdit();
      } else {
        const { data } = await api.post('/api/sellers', {
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          qrisTerminalId: form.qrisTerminalId || null,
          dailyMealAllowance: form.dailyMealAllowance,
          isActive: form.isActive,
        });
        if (data.tempPassword) {
          setTempPassword(data.tempPassword);
        }
        showToast('success', 'Penjual berhasil ditambahkan.');
        setForm(emptyForm);
      }
      await loadSellers();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal menyimpan data penjual.';
      showToast('danger', message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns: TableColumn<Seller>[] = [
    { key: 'name', header: 'Nama', render: (s) => s.name },
    { key: 'email', header: 'Email', render: (s) => s.email },
    { key: 'qris', header: 'Terminal QRIS', render: (s) => s.qrisTerminalId ?? '-' },
    { key: 'meal', header: 'Uang Makan', align: 'right', render: (s) => formatRupiah(s.dailyMealAllowance) },
    { key: 'active', header: 'Status', render: (s) => <Badge tone={s.isActive ? 'success' : 'neutral'}>{s.isActive ? 'Aktif' : 'Nonaktif'}</Badge> },
    {
      key: 'action',
      header: '',
      render: (s) => (
        <Button size="sm" onClick={() => startEdit(s)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader description="Kelola data penjual keliling — akun login, terminal QRIS, dan uang makan harian." />

      {tempPassword && <TempPasswordBanner password={tempPassword} />}

      <form onSubmit={handleSubmit} className={styles.form}>
        <FormField label="Nama Penjual" htmlFor="seller-name">
          <input id="seller-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </FormField>
        <FormField label="Email" htmlFor="seller-email">
          <input
            id="seller-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            disabled={!!editingId}
          />
        </FormField>
        <FormField label="No. HP" htmlFor="seller-phone">
          <input id="seller-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </FormField>
        <FormField label="ID Terminal QRIS BCA" htmlFor="seller-qris">
          <input
            id="seller-qris"
            value={form.qrisTerminalId}
            onChange={(e) => setForm({ ...form, qrisTerminalId: e.target.value })}
          />
        </FormField>
        <FormField label="Uang Makan Harian" htmlFor="seller-meal">
          <input
            id="seller-meal"
            type="number"
            value={form.dailyMealAllowance}
            onChange={(e) => setForm({ ...form, dailyMealAllowance: Number(e.target.value) })}
            min={0}
          />
        </FormField>
        <div className={styles.checkboxField}>
          <input
            id="seller-active"
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          <label htmlFor="seller-active">Aktif</label>
        </div>
        <div className={styles.actions}>
          <Button type="submit" variant="primary" disabled={submitting}>
            {editingId ? 'Simpan Perubahan' : 'Tambah Penjual'}
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
        <ErrorState onRetry={loadSellers} />
      ) : sellers.length === 0 ? (
        <EmptyState message="Belum ada penjual." />
      ) : (
        <Table columns={columns} data={sellers} rowKey={(s) => s.id} />
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
