import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLicense } from '../contexts/LicenseContext';
import { formatRupiah } from '../utils/format';
import type { LicensePlan, LicensePayment } from '../types/license';
import PageHeader from '../components/PageHeader/PageHeader';
import Button from '../components/Button/Button';
import Badge from '../components/Badge/Badge';
import Table, { type TableColumn } from '../components/Table/Table';
import EmptyState from '../components/EmptyState/EmptyState';
import ErrorState from '../components/ErrorState/ErrorState';
import { SkeletonStatCardRow, SkeletonTable } from '../components/Skeleton/Skeleton';
import { useToast } from '../components/Toast/ToastProvider';
import styles from './LicensePage.module.scss';

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        callbacks: {
          onSuccess?: () => void;
          onPending?: () => void;
          onError?: () => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

const SNAP_SRC = 'https://app.sandbox.midtrans.com/snap/snap.js';

function loadSnapScript(clientKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById('midtrans-snap')) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = 'midtrans-snap';
    script.src = SNAP_SRC;
    script.setAttribute('data-client-key', clientKey);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Gagal memuat Snap.js'));
    document.body.appendChild(script);
  });
}

const LICENSE_STATUS_LABEL: Record<string, string> = { active: 'Aktif', expired: 'Kedaluwarsa', inactive: 'Belum Aktif' };

export default function LicensePage() {
  const { appUser } = useAuth();
  const { showToast } = useToast();
  const { license, refetch } = useLicense();
  const [plans, setPlans] = useState<LicensePlan[]>([]);
  const [payments, setPayments] = useState<LicensePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [payingPlanId, setPayingPlanId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const plansRes = await api.get<LicensePlan[]>('/api/license/plans');
      setPlans(plansRes.data);

      if (appUser?.role === 'owner') {
        const paymentsRes = await api.get<LicensePayment[]>('/api/license/payments');
        setPayments(paymentsRes.data);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser?.role]);

  const handleCheckout = async (planId: number) => {
    setPayingPlanId(planId);

    try {
      const { data } = await api.post('/api/license/checkout', { planId });
      await loadSnapScript(import.meta.env.VITE_MIDTRANS_CLIENT_KEY);

      window.snap?.pay(data.snapToken, {
        onSuccess: () => refetch(),
        onPending: () => refetch(),
        onError: () => showToast('danger', 'Pembayaran gagal diproses.'),
        onClose: () => setPayingPlanId(null),
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal memulai proses pembayaran.';
      showToast('danger', message);
    } finally {
      setPayingPlanId(null);
    }
  };

  const paymentColumns: TableColumn<LicensePayment>[] = [
    { key: 'date', header: 'Tanggal', render: (p) => new Date(p.createdAt).toLocaleDateString('id-ID') },
    { key: 'plan', header: 'Paket', render: (p) => p.planName },
    { key: 'amount', header: 'Nominal', align: 'right', render: (p) => formatRupiah(p.amount) },
    { key: 'method', header: 'Metode', render: (p) => p.paymentMethod ?? '-' },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <Badge tone={p.status === 'settlement' || p.status === 'success' ? 'success' : p.status === 'pending' ? 'warning' : 'danger'}>
          {p.status}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader description="Kelola langganan aplikasi — perpanjang lisensi dan lihat riwayat pembayaran." />

      {license && (
        <div className={styles.statusCard}>
          <p>
            Status:{' '}
            <Badge tone={license.status === 'active' ? 'success' : license.status === 'expired' ? 'danger' : 'warning'}>
              {LICENSE_STATUS_LABEL[license.status] ?? license.status}
            </Badge>
          </p>
          {license.planName && <p>Paket aktif: {license.planName}</p>}
          {license.expiresAt && <p>Berlaku sampai: {new Date(license.expiresAt).toLocaleDateString('id-ID')}</p>}
          {license.daysLeft !== null && <p>Sisa hari: {license.daysLeft}</p>}
        </div>
      )}

      {loading ? (
        <>
          <SkeletonStatCardRow count={2} />
          <SkeletonTable rows={3} />
        </>
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : (
        <>
          <h2 className={styles.sectionTitle}>Pilih Paket</h2>
          <div className={styles.planGrid}>
            {plans.map((plan) => (
              <div key={plan.id} className={styles.planCard}>
                <span className={styles.planName}>{plan.name}</span>
                <span className={styles.planDuration}>{plan.durationDays} hari</span>
                <span className={styles.planPrice}>{formatRupiah(plan.price)}</span>
                <Button variant="primary" onClick={() => handleCheckout(plan.id)} disabled={payingPlanId === plan.id}>
                  {payingPlanId === plan.id ? 'Memproses...' : 'Perpanjang / Berlangganan'}
                </Button>
              </div>
            ))}
          </div>

          {appUser?.role === 'owner' && (
            <>
              <h2 className={styles.sectionTitle}>Riwayat Pembayaran</h2>
              {payments.length === 0 ? (
                <EmptyState message="Belum ada riwayat pembayaran." />
              ) : (
                <Table columns={paymentColumns} data={payments} rowKey={(p) => p.id} />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
