import { useEffect, useState } from 'react';
import api from '../../services/api';
import type { DailyClosing } from '../../types/dailyClosing';
import todayJakarta from '../../utils/todayJakarta';
import { formatRupiah } from '../../utils/format';
import StatCard from '../../components/StatCard/StatCard';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../components/Button/Button';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import { SkeletonStatCardRow } from '../../components/Skeleton/Skeleton';
import { useToast } from '../../components/Toast/ToastProvider';
import LoadingOverlay from '../../components/LoadingOverlay/LoadingOverlay';
import styles from './DailyClosingPage.module.scss';

export default function DailyClosingPage() {
  const { showToast } = useToast();
  const [date, setDate] = useState(todayJakarta());
  const [closing, setClosing] = useState<DailyClosing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [generating, setGenerating] = useState(false);

  const loadExisting = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get<DailyClosing[]>('/api/daily-closings', {
        params: { from: date, to: date },
      });
      setClosing(data[0] ?? null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post<DailyClosing>('/api/daily-closings', { closingDate: date });
      setClosing(data);
      showToast('success', 'Tutup buku berhasil dihitung.');
    } catch {
      showToast('danger', 'Gagal generate tutup buku.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <PageHeader
        description={'Hitung ulang & lihat ringkasan tutup buku harian: penjualan, HPP, pengeluaran, dan laba.'}
        actions={
          <>
            <input
              type="date"
              className={styles.dateInput}
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
            <Button variant="primary" onClick={handleGenerate} disabled={generating}>
              {generating ? 'Menghitung...' : 'Generate / Hitung Ulang'}
            </Button>
          </>
        }
      />

      {loading ? (
        <SkeletonStatCardRow count={3} />
      ) : error ? (
        <ErrorState onRetry={loadExisting} />
      ) : !closing ? (
        <EmptyState
          message='Belum ada tutup buku untuk tanggal ini.'
          action={
            <Button variant="primary" onClick={handleGenerate} disabled={generating}>
              Generate / Hitung Ulang
            </Button>
          }
        />
      ) : (
        <div className={styles.statGrid}>
          <StatCard
            label="Total Penjualan"
            value={formatRupiah(closing.totalSalesCash + closing.totalSalesQris)}
            variant="highlight"
          />
          <StatCard label="Total Penjualan Cash" value={formatRupiah(closing.totalSalesCash)} />
          <StatCard label="Total Penjualan QRIS" value={formatRupiah(closing.totalSalesQris)} />
          <StatCard label="Total HPP" value={formatRupiah(closing.totalCogs)} />
          <StatCard label="Laba Kotor" value={formatRupiah(closing.grossProfit)} />
          <StatCard label="Total Pengeluaran Operasional" value={formatRupiah(closing.totalExpenses)} />
          <StatCard label="Laba Bersih" value={formatRupiah(closing.netProfit)} variant="highlight" />
          <StatCard label="Roti Terjual" value={String(closing.totalBreadSold)} />
          <StatCard label="Roti Retur" value={String(closing.totalBreadReturned)} />
        </div>
      )}

      {generating && <LoadingOverlay message="Menghitung tutup buku..." />}
    </div>
  );
}
