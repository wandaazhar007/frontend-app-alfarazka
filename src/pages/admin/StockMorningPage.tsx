import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faFloppyDisk,
  faXmark,
  faPenToSquare,
  faTrashCan,
  faUserPlus,
  faCheck,
  faCircleCheck,
} from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import type { Seller } from '../../types/seller';
import type { Product } from '../../types/product';
import type { StockMovement } from '../../types/stockMovement';
import type { KelilingStatusResponse } from '../../types/dailyReport';
import todayJakarta from '../../utils/todayJakarta';
import { formatTanggal } from '../../utils/format';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../components/Button/Button';
import Badge from '../../components/Badge/Badge';
import Table, { type TableColumn } from '../../components/Table/Table';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';
import { useToast } from '../../components/Toast/ToastProvider';
import FormField from '../../components/FormField/FormField';
import Modal from '../../components/Modal/Modal';
import ConfirmModal from '../../components/Modal/ConfirmModal';
import Combobox from '../../components/Combobox/Combobox';
import styles from './StockMorningPage.module.scss';

interface SellerRow {
  sellerId: string;
  sellerName: string;
  byProduct: Record<string, StockMovement>;
}

interface CartItem {
  productId: string;
  productName: string;
  qtyOut: number;
}

export default function StockMorningPage() {
  const { showToast } = useToast();
  const [date, setDate] = useState(todayJakarta());
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [settlementMap, setSettlementMap] = useState<Record<string, boolean>>({});
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [formSellerId, setFormSellerId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [originalProductIds, setOriginalProductIds] = useState<string[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [cartQty, setCartQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ sellerId: string; sellerName: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadMeta = async () => {
    setLoadingMeta(true);
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
      setLoadingMeta(false);
    }
  };

  const loadMovements = async () => {
    setLoading(true);
    setError(false);
    try {
      const [movementsRes, reportRes] = await Promise.all([
        api.get<StockMovement[]>('/api/stock-movements', { params: { date } }),
        api.get<KelilingStatusResponse>('/api/reports/keliling-status', { params: { date } }),
      ]);
      setMovements(movementsRes.data);
      setSettlementMap(Object.fromEntries(reportRes.data.sellers.map((s) => [s.sellerId, s.isSettled])));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadMovements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const tableRows = useMemo<SellerRow[]>(() => {
    const sellerIds = [...new Set(movements.map((m) => m.sellerId))];
    return sellerIds.map((sellerId) => {
      const rows = movements.filter((m) => m.sellerId === sellerId);
      return {
        sellerId,
        sellerName: rows[0]?.sellerName ?? '',
        byProduct: Object.fromEntries(rows.map((r) => [r.productId, r])),
      };
    });
  }, [movements]);

  const availableSellers = useMemo(() => {
    const sellerIdsInTable = new Set(tableRows.map((r) => r.sellerId));
    return sellers.filter((s) => !sellerIdsInTable.has(s.id));
  }, [sellers, tableRows]);

  const formSellerName =
    sellers.find((s) => s.id === formSellerId)?.name ?? tableRows.find((r) => r.sellerId === formSellerId)?.sellerName;

  const comboboxOptions = useMemo(
    () =>
      products
        .filter((p) => !cart.some((c) => c.productId === p.id))
        .map((p) => ({ value: p.id, label: p.name })),
    [products, cart]
  );

  const openPicker = () => setShowPicker(true);

  const pickSeller = (sellerId: string) => {
    setFormSellerId(sellerId);
    setCart([]);
    setOriginalProductIds([]);
    setSelectedProductId('');
    setCartQty(1);
    setShowPicker(false);
  };

  const startEdit = (row: SellerRow) => {
    setFormSellerId(row.sellerId);
    const items = Object.values(row.byProduct).map((m) => ({
      productId: m.productId,
      productName: m.productName ?? '',
      qtyOut: m.qtyOut,
    }));
    setCart(items);
    setOriginalProductIds(items.map((i) => i.productId));
    setSelectedProductId('');
    setCartQty(1);
  };

  const cancelForm = () => {
    setFormSellerId(null);
    setCart([]);
    setOriginalProductIds([]);
    setSelectedProductId('');
    setCartQty(1);
  };

  const addToCart = () => {
    const product = products.find((p) => p.id === selectedProductId);
    if (!product || cartQty <= 0) return;
    setCart((prev) => [...prev, { productId: product.id, productName: product.name, qtyOut: cartQty }]);
    setSelectedProductId('');
    setCartQty(1);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  };

  const handleSubmitForm = async () => {
    if (!formSellerId) return;

    if (cart.length === 0 && originalProductIds.length === 0) {
      showToast('danger', 'Tambahkan minimal satu produk.');
      return;
    }

    setSubmitting(true);

    const cartProductIds = new Set(cart.map((c) => c.productId));
    const removedItems = originalProductIds
      .filter((id) => !cartProductIds.has(id))
      .map((productId) => ({ sellerId: formSellerId, productId, qtyOut: 0 }));

    const items = [
      ...cart.map((c) => ({ sellerId: formSellerId, productId: c.productId, qtyOut: c.qtyOut })),
      ...removedItems,
    ];

    try {
      await api.post('/api/stock-movements', { movementDate: date, items });
      showToast('success', 'Stok pagi berhasil disimpan.');
      cancelForm();
      await loadMovements();
    } catch {
      showToast('danger', 'Gagal menyimpan stok pagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/stock-movements/seller/${deleteTarget.sellerId}/date/${date}`);
      showToast('success', 'Data stok pagi berhasil dihapus.');
      setDeleteTarget(null);
      await loadMovements();
    } catch {
      showToast('danger', 'Gagal menghapus data stok pagi.');
    } finally {
      setDeleting(false);
    }
  };

  const topProducts = (row: SellerRow) => Object.values(row.byProduct).sort((a, b) => b.qtyOut - a.qtyOut);

  const totalQty = (row: SellerRow) => Object.values(row.byProduct).reduce((sum, m) => sum + m.qtyOut, 0);

  const isFullyReturned = (row: SellerRow) => Object.values(row.byProduct).every((m) => m.returnedAt !== null);

  const isSettled = (row: SellerRow) => settlementMap[row.sellerId] ?? false;

  const columns: TableColumn<SellerRow>[] = [
    { key: 'seller', header: 'Penjual', render: (r) => r.sellerName },
    {
      key: 'products',
      header: 'Produk',
      render: (r) => {
        const sorted = topProducts(r);
        const top3 = sorted.slice(0, 3).map((m) => `${m.productName} (${m.qtyOut})`);
        const rest = sorted.length - 3;
        return top3.join(', ') + (rest > 0 ? `, +${rest} lainnya` : '');
      },
    },
    { key: 'total', header: 'Total Qty', align: 'right', render: (r) => String(totalQty(r)) },
    {
      key: 'retur',
      header: 'Retur',
      render: (r) => (
        <Badge tone={isFullyReturned(r) ? 'success' : 'danger'}>{isFullyReturned(r) ? 'Sudah Retur' : 'Belum Retur'}</Badge>
      ),
    },
    {
      key: 'setoran',
      header: 'Setoran',
      render: (r) => (
        <Badge tone={isSettled(r) ? 'success' : 'danger'}>{isSettled(r) ? 'Sudah Setoran' : 'Belum Setoran'}</Badge>
      ),
    },
    {
      key: 'action',
      header: '',
      render: (r) => {
        if (isFullyReturned(r) && isSettled(r)) {
          return (
            <div className={styles.rowActions}>
              <FontAwesomeIcon icon={faCircleCheck} className={styles.doneIcon} title="Retur & setoran selesai" />
              <Badge tone="success">Selesai</Badge>
            </div>
          );
        }

        const locked = isFullyReturned(r) && !isSettled(r);

        return (
          <div className={styles.rowActions}>
            <Button
              size="sm"
              onClick={() => startEdit(r)}
              disabled={locked}
              title={locked ? 'Sudah retur — tidak bisa diedit sampai setoran diinput' : undefined}
              icon={<FontAwesomeIcon icon={faPenToSquare} />}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => setDeleteTarget({ sellerId: r.sellerId, sellerName: r.sellerName })}
              disabled={locked}
              title={locked ? 'Sudah retur — tidak bisa dihapus sampai setoran diinput' : undefined}
              icon={<FontAwesomeIcon icon={faTrashCan} />}
            >
              Hapus
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <h1 className={styles.dateHeading}>{formatTanggal(date, 'panjang')}</h1>
      <PageHeader
        description="Catat jumlah roti yang dibawa tiap penjual keliling pagi ini."
        actions={
          <>
            <input type="date" className={styles.dateInput} value={date} onChange={(e) => setDate(e.target.value)} />
            <Button variant="secondary" onClick={openPicker} icon={<FontAwesomeIcon icon={faUserPlus} />}>
              Penjual Hari Ini
            </Button>
          </>
        }
      />

      {formSellerId && (
        <div className={styles.form}>
          <div className={styles.formTitle}>Stok Pagi — {formSellerName}</div>

          <FormField label="Produk" htmlFor="product-combobox">
            <Combobox
              id="product-combobox"
              options={comboboxOptions}
              value={selectedProductId}
              onChange={setSelectedProductId}
              placeholder="Cari produk..."
            />
          </FormField>
          <FormField label="Qty" htmlFor="cart-qty">
            <input
              id="cart-qty"
              type="number"
              min={1}
              className={styles.qtyInput}
              value={cartQty}
              onChange={(e) => setCartQty(Number(e.target.value))}
            />
          </FormField>
          <Button
            type="button"
            variant="secondary"
            onClick={addToCart}
            disabled={!selectedProductId}
            icon={<FontAwesomeIcon icon={faPlus} />}
          >
            Tambah
          </Button>

          {cart.length === 0 ? (
            <EmptyState message="Belum ada produk ditambahkan." />
          ) : (
            <Table
              columns={[
                { key: 'product', header: 'Produk', render: (c) => c.productName },
                { key: 'qty', header: 'Qty', align: 'right', render: (c) => String(c.qtyOut) },
                {
                  key: 'action',
                  header: '',
                  render: (c) => (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => removeFromCart(c.productId)}
                      icon={<FontAwesomeIcon icon={faTrashCan} />}
                    >
                      Hapus
                    </Button>
                  ),
                },
              ]}
              data={cart}
              rowKey={(c) => c.productId}
            />
          )}

          <div className={styles.actions}>
            <Button
              variant="primary"
              onClick={handleSubmitForm}
              disabled={submitting}
              icon={<FontAwesomeIcon icon={faFloppyDisk} />}
            >
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </Button>
            <Button variant="secondary" onClick={cancelForm} disabled={submitting} icon={<FontAwesomeIcon icon={faXmark} />}>
              Batal
            </Button>
          </div>
        </div>
      )}

      {loadingMeta || loading ? (
        <SkeletonTable rows={5} />
      ) : error ? (
        <ErrorState onRetry={loadMovements} />
      ) : tableRows.length === 0 ? (
        <EmptyState message="Belum ada penjual ditambahkan untuk tanggal ini. Klik 'Penjual Hari Ini' untuk mulai." />
      ) : (
        <>
          <Table columns={columns} data={tableRows} rowKey={(r) => r.sellerId} />
          <div className={styles.grandTotal}>
            <span>Total Qty Keluar Semua Penjual</span>
            <Badge tone="success">{tableRows.reduce((sum, r) => sum + totalQty(r), 0)}</Badge>
          </div>
        </>
      )}

      {showPicker && (
        <Modal title="Pilih Penjual" onClose={() => setShowPicker(false)}>
          {availableSellers.length === 0 ? (
            <p className={styles.pickerEmpty}>Semua penjual aktif sudah ditambahkan untuk tanggal ini.</p>
          ) : (
            <div className={styles.pickerList}>
              {availableSellers.map((seller) => (
                <div className={styles.pickerItem} key={seller.id}>
                  <span>{seller.name}</span>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => pickSeller(seller.id)}
                    icon={<FontAwesomeIcon icon={faCheck} />}
                  >
                    Pilih
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Hapus Stok Pagi"
          message={`Yakin hapus semua data stok pagi ${deleteTarget.sellerName} tanggal ${date}?`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
          submitting={deleting}
        />
      )}
    </div>
  );
}
