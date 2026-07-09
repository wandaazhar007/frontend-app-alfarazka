import { useEffect, useState } from 'react';
import api from '../../services/api';
import type { Seller } from '../../types/seller';
import type { Product } from '../../types/product';
import todayJakarta from '../../utils/todayJakarta';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../components/Button/Button';
import Table, { type TableColumn } from '../../components/Table/Table';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';
import { useToast } from '../../components/Toast/ToastProvider';
import styles from './StockMorningPage.module.scss';

export default function StockMorningPage() {
  const { showToast } = useToast();
  const [date, setDate] = useState(todayJakarta());
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [qtyMap, setQtyMap] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [sellersRes, productsRes] = await Promise.all([
        api.get<Seller[]>('/api/sellers'),
        api.get<Product[]>('/api/products'),
      ]);
      setSellers(sellersRes.data.filter((s) => s.isActive));
      setProducts(productsRes.data.filter((p) => p.isActive));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setQty = (sellerId: string, productId: string, value: number) => {
    setQtyMap((prev) => ({
      ...prev,
      [sellerId]: { ...prev[sellerId], [productId]: value },
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    const items = sellers.flatMap((seller) =>
      products
        .map((product) => ({
          sellerId: seller.id,
          productId: product.id,
          qtyOut: qtyMap[seller.id]?.[product.id] ?? 0,
        }))
        .filter((item) => item.qtyOut > 0)
    );

    if (items.length === 0) {
      showToast('danger', 'Isi minimal satu qty stok keluar.');
      setSubmitting(false);
      return;
    }

    try {
      await api.post('/api/stock-movements', { movementDate: date, items });
      showToast('success', 'Stok pagi berhasil disimpan.');
      setQtyMap({});
    } catch {
      showToast('danger', 'Gagal menyimpan stok pagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: TableColumn<Seller>[] = [
    { key: 'seller', header: 'Penjual', render: (s) => s.name },
    ...products.map<TableColumn<Seller>>((product) => ({
      key: product.id,
      header: product.name,
      align: 'right',
      render: (s) => (
        <input
          type="number"
          min={0}
          className={styles.qtyInput}
          value={qtyMap[s.id]?.[product.id] ?? ''}
          onChange={(e) => setQty(s.id, product.id, Number(e.target.value))}
        />
      ),
    })),
  ];

  return (
    <div>
      <PageHeader
        description="Input jumlah roti yang dibawa tiap penjual keliling pagi ini."
        actions={<input type="date" className={styles.dateInput} value={date} onChange={(e) => setDate(e.target.value)} />}
      />

      {loading ? (
        <SkeletonTable rows={5} />
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : sellers.length === 0 || products.length === 0 ? (
        <EmptyState message="Belum ada penjual aktif atau produk aktif." />
      ) : (
        <>
          <Table columns={columns} data={sellers} rowKey={(s) => s.id} />
          <div className={styles.submitRow}>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan Stok Pagi'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
