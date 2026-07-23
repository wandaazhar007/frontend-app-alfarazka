import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRotateLeft,
  faXmark,
  faFloppyDisk,
  faCircleCheck,
  faTriangleExclamation,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import type { StockMovement } from '../../types/stockMovement';
import type { Product } from '../../types/product';
import type { KelilingStatusResponse } from '../../types/dailyReport';
import todayJakarta from '../../utils/todayJakarta';
import { formatTanggal, formatRupiah } from '../../utils/format';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../components/Button/Button';
import Badge from '../../components/Badge/Badge';
import Table, { type TableColumn } from '../../components/Table/Table';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';
import { useToast } from '../../components/Toast/ToastProvider';
import Modal from '../../components/Modal/Modal';
import LoadingOverlay from '../../components/LoadingOverlay/LoadingOverlay';
import styles from './StockEveningPage.module.scss';

interface SellerRow {
  sellerId: string;
  sellerName: string;
  byProduct: Record<string, StockMovement>;
}

// Tabel tier gaji harian — harus sama dengan TIER_TABLE di
// backend/src/services/SellerPayrollService.js (batas atas inklusif). Dipakai
// di sini HANYA untuk preview live di modal retur, bukan sumber kebenaran gaji
// (yang tetap dihitung backend saat generate payroll bulanan).
const TIER_TABLE = [
  { max: 200, salary: 30000 },
  { max: 300, salary: 35000 },
  { max: 400, salary: 40000 },
  { max: 500, salary: 50000 },
  { max: Infinity, salary: 50000 },
];

function computeTierSalary(qtySold: number): number {
  const tier = TIER_TABLE.find((t) => qtySold <= t.max);
  return tier ? tier.salary : 0;
}

export default function StockEveningPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [date, setDate] = useState(todayJakarta());
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settlementMap, setSettlementMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [returnTarget, setReturnTarget] = useState<string | null>(null);
  const [returnQtyMap, setReturnQtyMap] = useState<Record<string, number | ''>>({});
  const [saving, setSaving] = useState(false);
  const [showResettlementWarning, setShowResettlementWarning] = useState(false);

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
    loadMovements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    api
      .get<Product[]>('/api/products')
      .then(({ data }) => setProducts(data))
      .catch(() => {
        /* Preview badge di modal retur cukup diam2 tidak muncul kalau produk gagal dimuat */
      });
  }, []);

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

  const topProducts = (row: SellerRow) => Object.values(row.byProduct).sort((a, b) => b.qtyOut - a.qtyOut);
  const totalQtyOut = (row: SellerRow) => Object.values(row.byProduct).reduce((sum, m) => sum + m.qtyOut, 0);
  const totalQtyReturned = (row: SellerRow) => Object.values(row.byProduct).reduce((sum, m) => sum + m.qtyReturned, 0);
  const isFullyReturned = (row: SellerRow) => Object.values(row.byProduct).every((m) => m.returnedAt !== null);
  const isSettled = (row: SellerRow) => settlementMap[row.sellerId] ?? false;

  const returnRow = tableRows.find((r) => r.sellerId === returnTarget) ?? null;

  const hasExceededQty = returnRow
    ? Object.values(returnRow.byProduct).some((m) => {
        const val = returnQtyMap[m.productId];
        return typeof val === 'number' && val > m.qtyOut;
      })
    : false;

  const hasAnyReturnInput = Object.values(returnQtyMap).some((v) => typeof v === 'number');

  // Cuma menjumlahkan produk yang qty retur-nya SUDAH diinput (sejalan dengan kolom
  // "Terjual" yang juga cuma tampil per baris kalau sudah diinput) — jadi ini preview
  // live berdasarkan progres input saat itu, bukan menunggu semua baris terisi.
  const enteredSoldItems = returnRow
    ? Object.values(returnRow.byProduct)
        .filter((m) => typeof returnQtyMap[m.productId] === 'number')
        .map((m) => {
          const product = products.find((p) => p.id === m.productId);
          const qtySold = m.qtyOut - (returnQtyMap[m.productId] as number);
          return { qtySold, commissionPerUnit: product?.commissionPerUnit ?? 0, unitPrice: product?.unitPrice ?? 0 };
        })
    : [];

  const totalTerjual = enteredSoldItems
    .filter((i) => i.commissionPerUnit === 0)
    .reduce((sum, i) => sum + i.qtySold, 0);
  const totalTerjualKomisi = enteredSoldItems
    .filter((i) => i.commissionPerUnit > 0)
    .reduce((sum, i) => sum + i.qtySold, 0);
  const gajiHariItu = computeTierSalary(totalTerjual);
  const komisiHariItu = enteredSoldItems
    .filter((i) => i.commissionPerUnit > 0)
    .reduce((sum, i) => sum + i.qtySold * i.commissionPerUnit, 0);
  // Uang yang harus disetor = qty terjual x harga jual, SEMUA produk (komisi tetap
  // dijual dengan harga normal — komisi adalah bonus tambahan utk penjual, bukan
  // potongan harga jual), bukan cuma produk non-komisi.
  const totalUangSetor = enteredSoldItems.reduce((sum, i) => sum + i.qtySold * i.unitPrice, 0);

  const openReturnModal = (row: SellerRow) => {
    setReturnTarget(row.sellerId);
    setReturnQtyMap(
      Object.fromEntries(Object.values(row.byProduct).map((m) => [m.productId, m.returnedAt !== null ? m.qtyReturned : '']))
    );
  };

  const closeReturnModal = () => {
    setReturnTarget(null);
    setReturnQtyMap({});
  };

  const handleSaveReturn = async () => {
    if (!returnRow) return;
    if (hasExceededQty) {
      showToast('danger', 'Ada qty retur yang melebihi qty keluar. Perbaiki dulu sebelum menyimpan.');
      return;
    }
    setSaving(true);

    const items = Object.values(returnRow.byProduct).map((m) => ({
      id: m.id,
      qtyReturned: returnQtyMap[m.productId] || 0,
    }));

    try {
      const { data } = await api.put<StockMovement[]>('/api/stock-movements/return-batch', {
        sellerId: returnRow.sellerId,
        movementDate: date,
        items,
      });
      closeReturnModal();
      await loadMovements();

      if (data.some((m) => m.needsResettlement)) {
        setShowResettlementWarning(true);
      } else {
        showToast('success', 'Retur stok berhasil disimpan.');
      }
    } catch {
      showToast('danger', 'Gagal menyimpan retur.');
    } finally {
      setSaving(false);
    }
  };

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
    { key: 'qtyOut', header: 'Qty Keluar', align: 'right', render: (r) => String(totalQtyOut(r)) },
    { key: 'qtyReturned', header: 'Qty Retur', align: 'right', render: (r) => String(totalQtyReturned(r)) },
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
      render: (r) =>
        isFullyReturned(r) && isSettled(r) ? (
          <div className={styles.rowActions}>
            <button
              type="button"
              className={styles.doneButton}
              onClick={() => openReturnModal(r)}
              title="Sudah retur & setoran — klik untuk edit ulang retur"
            >
              <FontAwesomeIcon icon={faCircleCheck} />
            </button>
            <Badge tone="success">Selesai</Badge>
          </div>
        ) : (
          <Button size="sm" onClick={() => openReturnModal(r)} icon={<FontAwesomeIcon icon={faRotateLeft} />}>
            {isFullyReturned(r) ? 'Edit Retur' : 'Retur'}
          </Button>
        ),
    },
  ];

  return (
    <div>
      <h1 className={styles.dateHeading}>{formatTanggal(date, 'panjang')}</h1>
      <PageHeader
        description="Catat retur roti sore ini dari tiap penjual — roti terjual otomatis dihitung dari selisihnya."
        actions={
          <input
            type="date"
            className={styles.dateInput}
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
        }
      />

      {loading ? (
        <SkeletonTable rows={5} columns={columns} />
      ) : error ? (
        <ErrorState onRetry={loadMovements} />
      ) : tableRows.length === 0 ? (
        <EmptyState message="Belum ada stok pagi untuk tanggal ini." />
      ) : (
        <>
          <Table columns={columns} data={tableRows} rowKey={(r) => r.sellerId} />
          <div className={styles.grandTotal}>
            <span>Total Qty Retur Semua Penjual</span>
            <Badge tone="danger">{tableRows.reduce((sum, r) => sum + totalQtyReturned(r), 0)}</Badge>
          </div>
        </>
      )}

      {returnRow && (
        <Modal
          title={`Retur — ${returnRow.sellerName}`}
          onClose={closeReturnModal}
          blurBackdrop
          footer={
            <>
              <Button variant="secondary" onClick={closeReturnModal} disabled={saving} icon={<FontAwesomeIcon icon={faXmark} />}>
                Batal
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveReturn}
                disabled={saving || hasExceededQty}
                icon={<FontAwesomeIcon icon={faFloppyDisk} />}
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </>
          }
        >
          <div className={styles.modalDateBadge}>
            <Badge tone="danger">{formatTanggal(date, 'panjang')}</Badge>
          </div>
          {hasExceededQty && (
            <div className={styles.modalWarningBadge}>
              <Badge tone="danger">Qty Retur tidak boleh melebihi Qty Keluar</Badge>
            </div>
          )}
          <Table
            columns={[
              { key: 'product', header: 'Produk', render: (m) => m.productName },
              { key: 'qtyOut', header: 'Qty Keluar', align: 'right', render: (m) => String(m.qtyOut) },
              {
                key: 'qtyReturned',
                header: 'Qty Retur',
                align: 'right',
                render: (m) => (
                  <input
                    type="number"
                    min={0}
                    max={m.qtyOut}
                    className={styles.qtyInput}
                    value={returnQtyMap[m.productId] ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        setReturnQtyMap((prev) => ({ ...prev, [m.productId]: '' }));
                        return;
                      }
                      const parsed = Math.max(0, Number(raw));
                      setReturnQtyMap((prev) => ({ ...prev, [m.productId]: parsed }));
                    }}
                  />
                ),
              },
              {
                key: 'sold',
                header: 'Terjual',
                align: 'right',
                render: (m) =>
                  typeof returnQtyMap[m.productId] === 'number' ? (
                    <span className={styles.soldValue}>
                      {m.qtyOut - (returnQtyMap[m.productId] as number)} <FontAwesomeIcon icon={faCheck} />
                    </span>
                  ) : (
                    <span className={styles.soldPlaceholder}>—</span>
                  ),
              },
            ]}
            data={Object.values(returnRow.byProduct)}
            rowKey={(m) => m.id}
          />

          {hasAnyReturnInput && (
            <div className={styles.previewBadges}>
              <Badge tone="success">Total Produk Terjual: {totalTerjual} pcs</Badge>
              <Badge tone="success">Total Produk Komisi Terjual: {totalTerjualKomisi} pcs</Badge>
              <Badge tone="success">Gaji Hari Ini: {formatRupiah(gajiHariItu)}</Badge>
              <Badge tone="success">Komisi Hari Ini: {formatRupiah(komisiHariItu)}</Badge>
            </div>
          )}
          {hasAnyReturnInput && (
            <div className={styles.setorBadgeRow}>
              <Badge tone="danger">
                Jumlah uang yang harus di setor {returnRow.sellerName} {formatRupiah(totalUangSetor)}
              </Badge>
            </div>
          )}
        </Modal>
      )}

      {showResettlementWarning && (
        <Modal
          title="Perhatian"
          icon={<FontAwesomeIcon icon={faTriangleExclamation} className={styles.warningIcon} />}
          onClose={() => setShowResettlementWarning(false)}
          footer={
            <Button
              variant="primary"
              onClick={() => {
                setShowResettlementWarning(false);
                navigate('/admin/daily-settlement');
              }}
            >
              OK
            </Button>
          }
        >
          <p>
            Nilai retur untuk penjual ini sudah diubah, padahal setoran &amp; QRIS-nya sudah pernah diinput. Mohon buka
            halaman Setoran &amp; QRIS dan perbarui nilai setorannya supaya tidak ada selisih.
          </p>
        </Modal>
      )}

      {saving && <LoadingOverlay message="Menyimpan retur sore..." />}
    </div>
  );
}
