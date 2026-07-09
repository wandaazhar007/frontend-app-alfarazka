import { useEffect, useState, type FormEvent } from 'react';
import api from '../../services/api';
import type { Customer, CustomerFormValues } from '../../types/customer';
import type { Paginated } from '../../types/pagination';
import { PAGE_SIZE } from '../../utils/constants';
import Pagination from '../../components/Pagination/Pagination';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../components/Button/Button';
import FormField from '../../components/FormField/FormField';
import Table, { type TableColumn } from '../../components/Table/Table';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';
import { useToast } from '../../components/Toast/ToastProvider';
import styles from './CustomersPage.module.scss';

const emptyForm: CustomerFormValues = { name: '', phone: '', address: '', customerType: 'individual' };

export default function CustomersPage() {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [form, setForm] = useState<CustomerFormValues>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get<Paginated<Customer>>('/api/customers', { params: { page, pageSize: PAGE_SIZE } });
      setCustomers(data.data);
      setTotal(data.total);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.post('/api/customers', {
        name: form.name,
        phone: form.phone || null,
        address: form.address || null,
        customerType: form.customerType,
      });
      showToast('success', 'Pelanggan berhasil ditambahkan.');
      setForm(emptyForm);
      await loadCustomers();
    } catch {
      showToast('danger', 'Gagal menyimpan pelanggan.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: TableColumn<Customer>[] = [
    { key: 'name', header: 'Nama', render: (c) => c.name },
    { key: 'phone', header: 'No. HP', render: (c) => c.phone ?? '-' },
    { key: 'address', header: 'Alamat', render: (c) => c.address ?? '-' },
    { key: 'type', header: 'Tipe', render: (c) => (c.customerType === 'langganan' ? 'Langganan' : 'Individual') },
  ];

  return (
    <div>
      <PageHeader description="Kelola data pelanggan untuk penjualan paket & langganan." />

      <form onSubmit={handleSubmit} className={styles.form}>
        <FormField label="Nama Pelanggan" htmlFor="customer-name">
          <input id="customer-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </FormField>
        <FormField label="No. HP" htmlFor="customer-phone">
          <input id="customer-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </FormField>
        <FormField label="Alamat" htmlFor="customer-address">
          <input id="customer-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </FormField>
        <FormField label="Tipe" htmlFor="customer-type">
          <select
            id="customer-type"
            value={form.customerType}
            onChange={(e) => setForm({ ...form, customerType: e.target.value as 'individual' | 'langganan' })}
          >
            <option value="individual">Individual</option>
            <option value="langganan">Langganan (warung/kantin/sekolah)</option>
          </select>
        </FormField>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Menyimpan...' : 'Tambah Pelanggan'}
        </Button>
      </form>

      {loading ? (
        <SkeletonTable rows={4} />
      ) : error ? (
        <ErrorState onRetry={loadCustomers} />
      ) : customers.length === 0 ? (
        <EmptyState message="Belum ada pelanggan." />
      ) : (
        <Table columns={columns} data={customers} rowKey={(c) => c.id} />
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
