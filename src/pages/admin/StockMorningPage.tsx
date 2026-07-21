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
  faTriangleExclamation,
  faUtensils,
} from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import type { Seller } from '../../types/seller';
import type { Product } from '../../types/product';
import type { StockMovement } from '../../types/stockMovement';
import type { KelilingStatusResponse } from '../../types/dailyReport';
import type { ExpenseCategory } from '../../types/expense';
import todayJakarta from '../../utils/todayJakarta';
import { formatTanggal, formatInputRupiah, parseRupiahInput } from '../../utils/format';
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
import LoadingOverlay from '../../components/LoadingOverlay/LoadingOverlay';
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

interface PersistedForm {
  date: string;
  formSellerId: string | null;
  cart: CartItem[];
  originalProductIds: string[];
  selectedProductId: string;
  cartQty: number | '';
}

const FORM_STORAGE_KEY = 'stock-morning-form';
const MEAL_ALLOWANCE_CATEGORY = 'Uang Makan Penjual';

function loadStoredForm(): PersistedForm | null {
  try {
    const raw = localStorage.getItem(FORM_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedForm;
    // Entri stok pagi cuma relevan untuk HARI itu — kalau tanggal yang tersimpan
    // bukan hari ini (mis. browser dibuka lagi besoknya), buang semuanya supaya
    // halaman selalu default ke hari ini dengan form kosong.
    if (parsed.date !== todayJakarta()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function StockMorningPage() {
  const { showToast } = useToast();
  const [date, setDate] = useState(() => loadStoredForm()?.date ?? todayJakarta());
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [settlementMap, setSettlementMap] = useState<Record<string, boolean>>({});
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showDateRestrictionModal, setShowDateRestrictionModal] = useState(false);
  const [formSellerId, setFormSellerId] = useState<string | null>(() => loadStoredForm()?.formSellerId ?? null);
  const [cart, setCart] = useState<CartItem[]>(() => loadStoredForm()?.cart ?? []);
  const [originalProductIds, setOriginalProductIds] = useState<string[]>(() => loadStoredForm()?.originalProductIds ?? []);
  const [selectedProductId, setSelectedProductId] = useState(() => loadStoredForm()?.selectedProductId ?? '');
  const [cartQty, setCartQty] = useState<number | ''>(() => loadStoredForm()?.cartQty ?? '');
  const [deleteTarget, setDeleteTarget] = useState<{ sellerId: string; sellerName: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [mealModalSeller, setMealModalSeller] = useState<{ id: string; name: string } | null>(null);
  const [mealAmount, setMealAmount] = useState<number | ''>('');
  const [mealError, setMealError] = useState<string | undefined>();
  const [mealSubmitting, setMealSubmitting] = useState(false);

  useEffect(() => {
    const payload: PersistedForm = { date, formSellerId, cart, originalProductIds, selectedProductId, cartQty };
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(payload));
  }, [date, formSellerId, cart, originalProductIds, selectedProductId, cartQty]);

  const loadMeta = async () => {
    setLoadingMeta(true);
    try {
      const [sellersRes, productsRes, categoriesRes] = await Promise.all([
        api.get<Seller[]>('/api/sellers'),
        api.get<Product[]>('/api/products'),
        api.get<ExpenseCategory[]>('/api/expense-categories'),
      ]);
      setSellers(sellersRes.data.filter((s) => s.isActive));
      setProducts(productsRes.data.filter((p) => p.isActive));
      setCategories(categoriesRes.data);
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

  // Terpisah dari qty produk komisi (mis. Es Sirsak) — pola sama seperti roti_qty vs
  // commission_amount di SellerPayrollService, supaya badge tidak "tampil kosong"
  // saat keranjang cuma isi salah satu jenis produk.
  const cartNonCommissionQty = cart.reduce((sum, c) => {
    const product = products.find((p) => p.id === c.productId);
    return product && product.commissionPerUnit > 0 ? sum : sum + c.qtyOut;
  }, 0);
  const cartCommissionQty = cart.reduce((sum, c) => {
    const product = products.find((p) => p.id === c.productId);
    return product && product.commissionPerUnit > 0 ? sum + c.qtyOut : sum;
  }, 0);

  const openPicker = () => {
    if (date !== todayJakarta()) {
      setShowDateRestrictionModal(true);
      return;
    }
    setShowPicker(true);
  };

  const pickSeller = (sellerId: string) => {
    setFormSellerId(sellerId);
    setCart([]);
    setOriginalProductIds([]);
    setSelectedProductId('');
    setCartQty('');
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
    setCartQty('');
  };

  const cancelForm = () => {
    setFormSellerId(null);
    setCart([]);
    setOriginalProductIds([]);
    setSelectedProductId('');
    setCartQty('');
  };

  const addToCart = () => {
    const product = products.find((p) => p.id === selectedProductId);
    if (!product || !cartQty || cartQty <= 0) return;
    setCart((prev) => [...prev, { productId: product.id, productName: product.name, qtyOut: cartQty }]);
    setSelectedProductId('');
    setCartQty('');
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  };

  // Klik "Simpan" pada form cart TIDAK langsung menyimpan stok pagi — modal Uang
  // Makan Penjual dibuka dulu, dan stok pagi baru benar-benar disimpan setelah
  // modal itu berhasil disimpan (lihat handleSaveMealAllowance).
  const handleSubmitForm = () => {
    if (!formSellerId) return;

    if (cart.length === 0 && originalProductIds.length === 0) {
      showToast('danger', 'Tambahkan minimal satu produk.');
      return;
    }

    const seller = sellers.find((s) => s.id === formSellerId);
    setMealAmount(seller ? seller.dailyMealAllowance : '');
    setMealError(undefined);
    setMealModalSeller({ id: formSellerId, name: formSellerName ?? '' });
  };

  const mealCategory = categories.find((c) => c.name === MEAL_ALLOWANCE_CATEGORY);

  // Cancel = batalkan seluruh aksi simpan (uang makan MAUPUN stok pagi) — form
  // cart tetap terbuka apa adanya supaya admin bisa lanjut edit atau coba lagi.
  const closeMealModal = () => {
    setMealModalSeller(null);
  };

  const handleSaveMealAllowance = async () => {
    if (!mealModalSeller || !formSellerId) return;

    if (!mealCategory) {
      showToast('danger', `Kategori '${MEAL_ALLOWANCE_CATEGORY}' tidak ditemukan.`);
      return;
    }
    if (mealAmount === '' || mealAmount <= 0) {
      setMealError('Nominal wajib diisi dan harus lebih dari 0.');
      return;
    }

    const cartProductIds = new Set(cart.map((c) => c.productId));
    const removedItems = originalProductIds
      .filter((id) => !cartProductIds.has(id))
      .map((productId) => ({ sellerId: formSellerId, productId, qtyOut: 0 }));

    const items = [
      ...cart.map((c) => ({ sellerId: formSellerId, productId: c.productId, qtyOut: c.qtyOut })),
      ...removedItems,
    ];

    setMealSubmitting(true);
    try {
      await api.post('/api/expenses', {
        categoryId: mealCategory.id,
        amount: mealAmount,
        description: `Uang makan - ${mealModalSeller.name}`,
        expenseDate: date,
      });
      await api.post('/api/stock-movements', { movementDate: date, items });
      showToast('success', `Uang makan & stok pagi ${mealModalSeller.name} berhasil disimpan.`);
      closeMealModal();
      cancelForm();
      await loadMovements();
    } catch {
      showToast('danger', 'Gagal menyimpan uang makan/stok pagi.');
    } finally {
      setMealSubmitting(false);
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
            <input
              type="date"
              className={styles.dateInput}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                // Form Stok Pagi yang sedang terbuka mengacu ke tanggal saat dibuka —
                // kalau tanggal diganti sementara form masih terbuka, tutup/reset form
                // supaya tidak tersimpan di tanggal yang salah (lihat celah yang dilaporkan).
                if (formSellerId) cancelForm();
              }}
            />
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
              emptyMessage="Nama produk tidak ditemukan."
            />
          </FormField>
          <FormField label="Qty" htmlFor="cart-qty">
            <input
              id="cart-qty"
              type="number"
              min={1}
              placeholder="0"
              className={styles.qtyInput}
              value={cartQty}
              onChange={(e) => setCartQty(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </FormField>
          <Button
            type="button"
            variant="secondary"
            onClick={addToCart}
            disabled={!selectedProductId || cartQty === '' || cartQty <= 0}
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

          {(cartNonCommissionQty > 0 || cartCommissionQty > 0) && (
            <div className={styles.cartTotals}>
              {cartNonCommissionQty > 0 && <Badge tone="success">Total Produk Dibawa: {cartNonCommissionQty} pcs</Badge>}
              {cartCommissionQty > 0 && <Badge tone="success">Total Produk Komisi Dibawa: {cartCommissionQty} pcs</Badge>}
            </div>
          )}

          <div className={styles.actions}>
            <Button variant="primary" onClick={handleSubmitForm} icon={<FontAwesomeIcon icon={faFloppyDisk} />}>
              Simpan
            </Button>
            <Button variant="secondary" onClick={cancelForm} icon={<FontAwesomeIcon icon={faXmark} />}>
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
        <Modal title="Pilih Penjual" onClose={() => setShowPicker(false)} blurBackdrop>
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

      {showDateRestrictionModal && (
        <Modal
          title="Perhatian"
          icon={<FontAwesomeIcon icon={faTriangleExclamation} className={styles.warningIcon} />}
          onClose={() => setShowDateRestrictionModal(false)}
          blurBackdrop
          footer={
            <Button variant="primary" onClick={() => setShowDateRestrictionModal(false)}>
              Mengerti
            </Button>
          }
        >
          <p>Penjual hari ini hanya bisa di-input pada hari ini. Silakan pilih tanggal hari ini terlebih dahulu.</p>
        </Modal>
      )}

      {mealModalSeller && (
        <Modal
          title="Uang Makan Penjual"
          icon={<FontAwesomeIcon icon={faUtensils} />}
          onClose={closeMealModal}
          blurBackdrop
          footer={
            <>
              <Button variant="secondary" onClick={closeMealModal} disabled={mealSubmitting} icon={<FontAwesomeIcon icon={faXmark} />}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveMealAllowance}
                disabled={mealSubmitting}
                icon={<FontAwesomeIcon icon={faFloppyDisk} />}
              >
                {mealSubmitting ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </>
          }
        >
          <p className={styles.mealModalHint}>
            Isi uang makan untuk penjual ini terlebih dahulu — stok pagi akan ikut tersimpan setelah uang makan berhasil
            disimpan.
          </p>
          <div className={styles.mealModalBadge}>
            <Badge tone="success">
              {mealModalSeller.name} — {formatTanggal(date, 'dash')}
            </Badge>
          </div>
          <FormField label="Nominal" htmlFor="meal-amount" required error={mealError}>
            <input
              id="meal-amount"
              type="text"
              inputMode="numeric"
              placeholder="Rp. 0"
              value={formatInputRupiah(mealAmount)}
              onChange={(e) => {
                setMealAmount(parseRupiahInput(e.target.value));
                setMealError(undefined);
              }}
            />
          </FormField>
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

      {mealSubmitting && <LoadingOverlay message="Menyimpan uang makan & stok pagi..." />}
    </div>
  );
}
