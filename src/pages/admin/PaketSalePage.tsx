import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import todayJakarta from '../../utils/todayJakarta';
import { formatRupiah } from '../../utils/format';
import type { Customer } from '../../types/customer';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../components/Button/Button';
import FormField from '../../components/FormField/FormField';
import ErrorState from '../../components/ErrorState/ErrorState';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';
import { useToast } from '../../components/Toast/ToastProvider';
import styles from './PaketSalePage.module.scss';

interface PaketSaleResponse {
  receivable: { outstanding: number; dueDate: string | null } | null;
}

export default function PaketSalePage() {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [customName, setCustomName] = useState('');
  const [saleDate, setSaleDate] = useState(todayJakarta());
  const [totalAmount, setTotalAmount] = useState(0);
  const [dpAmount, setDpAmount] = useState(0);
  const [dpMethod, setDpMethod] = useState<'cash' | 'qris'>('cash');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get<Customer[]>('/api/customers');
      setCustomers(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data } = await api.post<PaketSaleResponse>('/api/sales', {
        saleType: 'paket',
        customerId,
        customName,
        saleDate,
        totalAmount,
        dpAmount,
        dpMethod: dpAmount > 0 ? dpMethod : undefined,
        dueDate: dueDate || undefined,
      });

      showToast(
        'success',
        data.receivable
          ? `Paket disimpan. Sisa piutang: ${formatRupiah(data.receivable.outstanding)} (jatuh tempo ${data.receivable.dueDate ?? '-'}).`
          : 'Paket disimpan, lunas.'
      );
      setCustomerId('');
      setCustomName('');
      setTotalAmount(0);
      setDpAmount(0);
      setDueDate('');
    } catch {
      showToast('danger', 'Gagal menyimpan penjualan paket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader description="Catat penjualan paket custom (mis. paket aqiqah) — bisa DP sebagian, sisanya jadi piutang." />
      <p className={styles.hint}>
        Belum ada pelanggan yang cocok? <Link to="/admin/customers">Tambah pelanggan baru</Link>.
      </p>

      {loading ? (
        <SkeletonTable rows={3} />
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          <FormField label="Pelanggan" htmlFor="paket-customer">
            <select id="paket-customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
              <option value="">Pilih pelanggan...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Nama Paket" htmlFor="paket-name">
            <input
              id="paket-name"
              placeholder="mis. Paket Aqiqah Bu Ani"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              required
            />
          </FormField>
          <FormField label="Tanggal" htmlFor="paket-date">
            <input id="paket-date" type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} required />
          </FormField>
          <FormField label="Total Harga (Negosiasi)" htmlFor="paket-total">
            <input
              id="paket-total"
              type="number"
              value={totalAmount}
              min={1}
              onChange={(e) => setTotalAmount(Number(e.target.value))}
              required
            />
          </FormField>
          <FormField label="DP Awal" htmlFor="paket-dp" help="Isi 0 kalau belum ada DP">
            <input
              id="paket-dp"
              type="number"
              value={dpAmount}
              min={0}
              max={totalAmount}
              onChange={(e) => setDpAmount(Number(e.target.value))}
            />
          </FormField>
          {dpAmount > 0 && (
            <FormField label="Metode DP" htmlFor="paket-dp-method">
              <select id="paket-dp-method" value={dpMethod} onChange={(e) => setDpMethod(e.target.value as 'cash' | 'qris')}>
                <option value="cash">Cash</option>
                <option value="qris">QRIS</option>
              </select>
            </FormField>
          )}
          <FormField label="Jatuh Tempo Pelunasan" htmlFor="paket-due-date" help="Opsional">
            <input id="paket-due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </FormField>

          <div className={styles.fullWidth}>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan Penjualan Paket'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
