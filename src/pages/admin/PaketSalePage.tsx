import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFloppyDisk } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import todayJakarta from '../../utils/todayJakarta';
import { formatRupiah } from '../../utils/format';
import type { Customer } from '../../types/customer';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../components/Button/Button';
import FormField from '../../components/FormField/FormField';
import Combobox from '../../components/Combobox/Combobox';
import ErrorState from '../../components/ErrorState/ErrorState';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';
import { useToast } from '../../components/Toast/ToastProvider';
import LoadingOverlay from '../../components/LoadingOverlay/LoadingOverlay';
import styles from './PaketSalePage.module.scss';

interface PaketSaleResponse {
  receivable: { outstanding: number; dueDate: string | null } | null;
}

// Format apa adanya sambil diketik (mis. 100000 -> "100.000"), tanpa simbol "Rp"
// karena ini dipakai di dalam field yang bisa diedit, bukan tampilan read-only.
function formatInputRupiah(value: number | ''): string {
  return value === '' ? '' : new Intl.NumberFormat('id-ID').format(value);
}

function parseRupiahInput(raw: string): number | '' {
  const digitsOnly = raw.replace(/\D/g, '');
  return digitsOnly === '' ? '' : Number(digitsOnly);
}

interface FieldErrors {
  customerId?: boolean;
  customName?: boolean;
  totalAmount?: boolean;
}

export default function PaketSalePage() {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [customName, setCustomName] = useState('');
  const [saleDate, setSaleDate] = useState(todayJakarta());
  const [totalAmount, setTotalAmount] = useState<number | ''>('');
  const [dpAmount, setDpAmount] = useState<number | ''>('');
  const [dpMethod, setDpMethod] = useState<'cash' | 'qris'>('cash');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const dpExceedsTotal = typeof dpAmount === 'number' && typeof totalAmount === 'number' && dpAmount > totalAmount;
  const dueDateBeforeSaleDate = dueDate !== '' && dueDate < saleDate;

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

    const errors: FieldErrors = {
      customerId: !customerId,
      customName: !customName.trim(),
      totalAmount: !totalAmount || totalAmount <= 0,
    };
    setFieldErrors(errors);
    if (errors.customerId || errors.customName || errors.totalAmount || dpExceedsTotal || dueDateBeforeSaleDate) return;

    setSubmitting(true);

    try {
      const { data } = await api.post<PaketSaleResponse>('/api/sales', {
        saleType: 'paket',
        customerId,
        customName,
        saleDate,
        totalAmount,
        dpAmount: dpAmount || 0,
        dpMethod: dpAmount ? dpMethod : undefined,
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
      setTotalAmount('');
      setDpAmount('');
      setDueDate('');
      setFieldErrors({});
    } catch {
      showToast('danger', 'Gagal menyimpan penjualan paket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader description="Catat penjualan paket custom (mis. paket aqiqah) — bisa DP sebagian, sisanya jadi piutang." />
      <p className={styles.hint}>
        Belum ada pelanggan yang cocok? <Link to="/admin/customers">Tambah pelanggan baru</Link>.
      </p>

      {loading ? (
        <SkeletonTable rows={3} />
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : (
        <div className={styles.formArea}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <FormField
              label="Pelanggan"
              htmlFor="paket-customer"
              error={fieldErrors.customerId ? 'Pelanggan wajib dipilih' : undefined}
            >
              <Combobox
                id="paket-customer"
                options={customers.map((c) => ({ value: c.id, label: c.name }))}
                value={customerId}
                onChange={(value) => {
                  setFieldErrors((prev) => ({ ...prev, customerId: false }));
                  setCustomerId(value);
                }}
                placeholder="Cari pelanggan..."
                emptyMessage="Nama pelanggan tidak ditemukan."
              />
            </FormField>
            <FormField
              label="Nama Paket"
              htmlFor="paket-name"
              error={fieldErrors.customName ? 'Nama paket wajib diisi' : undefined}
            >
              <input
                id="paket-name"
                placeholder="mis. Paket Aqiqah Bu Ani"
                value={customName}
                onChange={(e) => {
                  setFieldErrors((prev) => ({ ...prev, customName: false }));
                  setCustomName(e.target.value);
                }}
              />
            </FormField>
            <FormField label="Tanggal" htmlFor="paket-date">
              <input id="paket-date" type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} required />
            </FormField>
            <FormField
              label="Total Harga (Negosiasi)"
              htmlFor="paket-total"
              error={fieldErrors.totalAmount ? 'Total harga wajib diisi' : undefined}
            >
              <input
                id="paket-total"
                type="text"
                inputMode="numeric"
                placeholder="Rp. 0"
                value={formatInputRupiah(totalAmount)}
                onChange={(e) => {
                  setFieldErrors((prev) => ({ ...prev, totalAmount: false }));
                  setTotalAmount(parseRupiahInput(e.target.value));
                }}
              />
            </FormField>
            <FormField
              label="DP Awal"
              htmlFor="paket-dp"
              help="Kosongkan kalau belum ada DP"
              error={dpExceedsTotal ? 'DP Awal tidak boleh melebihi Total Harga' : undefined}
            >
              <input
                id="paket-dp"
                type="text"
                inputMode="numeric"
                placeholder="Rp. 0"
                value={formatInputRupiah(dpAmount)}
                onChange={(e) => setDpAmount(parseRupiahInput(e.target.value))}
              />
            </FormField>
            {Boolean(dpAmount) && (
              <FormField label="Metode DP" htmlFor="paket-dp-method">
                <select id="paket-dp-method" value={dpMethod} onChange={(e) => setDpMethod(e.target.value as 'cash' | 'qris')}>
                  <option value="cash">Cash</option>
                  <option value="qris">QRIS</option>
                </select>
              </FormField>
            )}
            <FormField
              label="Jatuh Tempo Pelunasan"
              htmlFor="paket-due-date"
              help="Opsional"
              error={dueDateBeforeSaleDate ? 'Jatuh tempo tidak boleh lebih awal dari Tanggal' : undefined}
            >
              <input id="paket-due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </FormField>

            <div className={styles.fullWidth}>
              <Button
                type="submit"
                variant="primary"
                disabled={submitting || dpExceedsTotal || dueDateBeforeSaleDate}
                icon={<FontAwesomeIcon icon={faFloppyDisk} />}
              >
                {submitting ? 'Menyimpan...' : 'Simpan Penjualan Paket'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {submitting && <LoadingOverlay message="Menyimpan penjualan paket..." />}
    </div>
  );
}
