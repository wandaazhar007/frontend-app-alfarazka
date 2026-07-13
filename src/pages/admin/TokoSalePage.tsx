import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrashCan, faFloppyDisk } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import { formatRupiah } from '../../utils/format';
import todayJakarta from '../../utils/todayJakarta';
import type { Product } from '../../types/product';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../components/Button/Button';
import FormField from '../../components/FormField/FormField';
import Combobox from '../../components/Combobox/Combobox';
import Table, { type TableColumn } from '../../components/Table/Table';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';
import { useToast } from '../../components/Toast/ToastProvider';
import styles from './TokoSalePage.module.scss';

interface CartItem {
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
}

const CART_STORAGE_KEY = 'toko-sale-cart';

function loadStoredCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export default function TokoSalePage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [cart, setCart] = useState<CartItem[]>(loadStoredCart);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>('cash');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get<Product[]>('/api/products');
      setProducts(data.filter((p) => p.isActive));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const productOptions = useMemo(() => products.map((p) => ({ value: p.id, label: p.name })), [products]);

  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId);
    const product = products.find((p) => p.id === productId);
    setUnitPrice(product?.unitPrice ?? 0);
  };

  const addToCart = () => {
    const product = products.find((p) => p.id === selectedProductId);
    if (!product || qty <= 0) return;

    setCart((prev) => [...prev, { productId: product.id, productName: product.name, qty, unitPrice }]);
    setSelectedProductId('');
    setQty(1);
    setUnitPrice(0);
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const total = cart.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);

  const handleSubmit = async () => {
    if (cart.length === 0) {
      showToast('danger', 'Keranjang masih kosong.');
      return;
    }

    setSubmitting(true);

    try {
      await api.post('/api/sales', {
        saleType: 'toko',
        saleDate: todayJakarta(),
        items: cart.map((item) => ({ productId: item.productId, qty: item.qty, unitPrice: item.unitPrice })),
        payments: [{ method: paymentMethod, amount: total }],
      });
      showToast('success', 'Penjualan toko berhasil disimpan.');
      setCart([]);
    } catch {
      showToast('danger', 'Gagal menyimpan penjualan.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: TableColumn<CartItem & { index: number }>[] = [
    { key: 'product', header: 'Produk', render: (item) => item.productName },
    { key: 'qty', header: 'Qty', align: 'right', render: (item) => String(item.qty) },
    { key: 'price', header: 'Harga', align: 'right', render: (item) => formatRupiah(item.unitPrice) },
    { key: 'subtotal', header: 'Subtotal', align: 'right', render: (item) => formatRupiah(item.qty * item.unitPrice) },
    {
      key: 'action',
      header: '',
      render: (item) => (
        <Button
          size="sm"
          variant="danger"
          onClick={() => removeFromCart(item.index)}
          icon={<FontAwesomeIcon icon={faTrashCan} />}
        >
          Hapus
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader description="Catat penjualan langsung di toko (mini POS) — pilih produk, qty, dan metode bayar." />

      {loading ? (
        <SkeletonTable rows={3} />
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : (
        <>
          <div className={styles.addForm}>
            <FormField label="Produk" htmlFor="toko-product">
              <Combobox
                id="toko-product"
                options={productOptions}
                value={selectedProductId}
                onChange={handleSelectProduct}
                placeholder="Cari produk..."
                emptyMessage="Nama produk tidak ditemukan."
              />
            </FormField>
            <FormField label="Qty" htmlFor="toko-qty">
              <input id="toko-qty" type="number" value={qty} min={1} onChange={(e) => setQty(Number(e.target.value))} />
            </FormField>
            <div className={styles.priceDisplay}>
              <span className={styles.priceLabel}>Harga Satuan</span>
              <span className={styles.priceValue}>{formatRupiah(unitPrice)}</span>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={addToCart}
              disabled={!selectedProductId}
              icon={<FontAwesomeIcon icon={faPlus} />}
            >
              Tambah ke Keranjang
            </Button>
          </div>

          {cart.length === 0 ? (
            <EmptyState message="Keranjang masih kosong. Pilih produk di atas untuk mulai." />
          ) : (
            <Table columns={columns} data={cart.map((item, index) => ({ ...item, index }))} rowKey={(item) => String(item.index)} />
          )}

          <div className={styles.totalRow}>
            <span>Total</span>
            <span>{formatRupiah(total)}</span>
          </div>

          <div className={styles.footerRow}>
            <FormField label="Metode Bayar" htmlFor="toko-payment-method">
              <select
                id="toko-payment-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'qris')}
              >
                <option value="cash">Cash</option>
                <option value="qris">QRIS</option>
              </select>
            </FormField>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={submitting || cart.length === 0}
              icon={<FontAwesomeIcon icon={faFloppyDisk} />}
            >
              {submitting ? 'Menyimpan...' : 'Simpan Penjualan'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
