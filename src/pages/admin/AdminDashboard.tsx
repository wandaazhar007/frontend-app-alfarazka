import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBoxOpen, faQrcode, faWallet, faBookOpen } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import todayJakarta from '../../utils/todayJakarta';
import { formatRupiah } from '../../utils/format';
import StatCard from '../../components/StatCard/StatCard';
import PageHeader from '../../components/PageHeader/PageHeader';
import { SkeletonStatCardRow } from '../../components/Skeleton/Skeleton';
import ErrorState from '../../components/ErrorState/ErrorState';
import type { DailyReport } from '../../types/dailyReport';
import styles from './AdminDashboard.module.scss';

const QUICK_ACTIONS = [
  { label: 'Stok Pagi', path: '/admin/stock/morning', icon: faBoxOpen },
  { label: 'Setoran & QRIS', path: '/admin/daily-settlement', icon: faQrcode },
  { label: 'Pengeluaran', path: '/admin/expenses', icon: faWallet },
  { label: 'Tutup Buku', path: '/admin/daily-closing', icon: faBookOpen },
];

export default function AdminDashboard() {
  const { appUser } = useAuth();
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get<DailyReport>('/api/reports/daily', { params: { date: todayJakarta() } });
      setReport(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader description={`Selamat datang, ${appUser?.name}. Ringkasan hari ini dan akses cepat tugas harian.`} />

      <h2 className={styles.sectionTitle}>Ringkasan Hari Ini</h2>
      {loading ? (
        <SkeletonStatCardRow count={3} />
      ) : error || !report ? (
        <ErrorState onRetry={load} />
      ) : (
        <div className={styles.statGrid}>
          <StatCard label="Total Penjualan Hari Ini" value={formatRupiah(report.summary.totalPenjualan)} variant="highlight" />
          <StatCard label="Total Cash" value={formatRupiah(report.summary.totalCash)} />
          <StatCard label="Total QRIS" value={formatRupiah(report.summary.totalQris)} />
        </div>
      )}

      <h2 className={styles.sectionTitle}>Akses Cepat</h2>
      <div className={styles.quickActions}>
        {QUICK_ACTIONS.map((action) => (
          <Link key={action.path} to={action.path} className={styles.quickAction}>
            <FontAwesomeIcon icon={action.icon} className={styles.quickActionIcon} />
            <span className={styles.quickActionLabel}>{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
