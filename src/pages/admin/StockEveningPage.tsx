import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotateLeft, faXmark, faFloppyDisk } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import type { StockMovement } from '../../types/stockMovement';
import todayJakarta from '../../utils/todayJakarta';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../components/Button/Button';
import Badge from '../../components/Badge/Badge';
import Table, { type TableColumn } from '../../components/Table/Table';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';
import { useToast } from '../../components/Toast/ToastProvider';
import Modal from '../../components/Modal/Modal';
import styles from './StockEveningPage.module.scss';

interface SellerRow {
  sellerId: string;
  sellerName: string;
  byProduct: Record<string, StockMovement>;
}

export default function StockEveningPage() {
  const { showToast } = useToast();
  const [date, setDate] = useState(todayJakarta());
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [returnTarget, setReturnTarget] = useState<string | null>(null);
  const [returnQtyMap, setReturnQtyMap] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const loadMovements = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get<StockMovement[]>('/api/stock-movements', { params: { date } });
      setMovements(data);
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

  const returnRow = tableRows.find((r) => r.sellerId === returnTarget) ?? null;

  const openReturnModal = (row: SellerRow) => {
    setReturnTarget(row.sellerId);
    setReturnQtyMap(Object.fromEntries(Object.values(row.byProduct).map((m) => [m.productId, m.qtyReturned])));
  };

  const closeReturnModal = () => {
    setReturnTarget(null);
    setReturnQtyMap({});
  };

  const handleSaveReturn = async () => {
    if (!returnRow) return;
    setSaving(true);

    const items = Object.values(returnRow.byProduct).map((m) => ({
      id: m.id,
      qtyReturned: returnQtyMap[m.productId] ?? 0,
    }));

    try {
      await api.put('/api/stock-movements/return-batch', { items });
      showToast('success', 'Retur stok berhasil disimpan.');
      closeReturnModal();
      await loadMovements();
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
      key: 'status',
      header: 'Status',
      render: (r) => (
        <Badge tone={isFullyReturned(r) ? 'success' : 'danger'}>{isFullyReturned(r) ? 'Sudah Retur' : 'Belum Retur'}</Badge>
      ),
    },
    {
      key: 'action',
      header: '',
      render: (r) => (
        <Button size="sm" onClick={() => openReturnModal(r)} icon={<FontAwesomeIcon icon={faRotateLeft} />}>
          {isFullyReturned(r) ? 'Edit Retur' : 'Retur'}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        description="Catat retur roti sore ini dari tiap penjual — roti terjual otomatis dihitung dari selisihnya."
        actions={<input type="date" className={styles.dateInput} value={date} onChange={(e) => setDate(e.target.value)} />}
      />

      {loading ? (
        <SkeletonTable rows={5} />
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
                disabled={saving}
                icon={<FontAwesomeIcon icon={faFloppyDisk} />}
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </>
          }
        >
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
                    value={returnQtyMap[m.productId] ?? 0}
                    onChange={(e) => setReturnQtyMap((prev) => ({ ...prev, [m.productId]: Number(e.target.value) }))}
                  />
                ),
              },
              {
                key: 'sold',
                header: 'Terjual',
                align: 'right',
                render: (m) => String(m.qtyOut - (returnQtyMap[m.productId] ?? 0)),
              },
            ]}
            data={Object.values(returnRow.byProduct)}
            rowKey={(m) => m.id}
          />
        </Modal>
      )}
    </div>
  );
}
