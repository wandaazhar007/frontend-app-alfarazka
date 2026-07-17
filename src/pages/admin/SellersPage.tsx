import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPenToSquare, faFloppyDisk, faXmark, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import type { Seller, SellerFormValues } from '../../types/seller';
import type { Paginated } from '../../types/pagination';
import { PAGE_SIZE } from '../../utils/constants';
import { formatRupiah, formatInputRupiah, parseRupiahInput } from '../../utils/format';
import Pagination from '../../components/Pagination/Pagination';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../components/Button/Button';
import FormField from '../../components/FormField/FormField';
import Badge from '../../components/Badge/Badge';
import Table, { type TableColumn } from '../../components/Table/Table';
import Modal from '../../components/Modal/Modal';
import ConfirmModal from '../../components/Modal/ConfirmModal';
import SearchBox from '../../components/SearchBox/SearchBox';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';
import { useToast } from '../../components/Toast/ToastProvider';
import TempPasswordBanner from '../../components/TempPasswordBanner/TempPasswordBanner';
import LoadingOverlay from '../../components/LoadingOverlay/LoadingOverlay';
import styles from './SellersPage.module.scss';

const emptyForm: SellerFormValues = {
  name: '',
  email: '',
  phone: '',
  qrisTerminalId: '',
  dailyMealAllowance: 20000,
  isActive: true,
};

interface FormErrors {
  name?: string;
  email?: string;
  dailyMealAllowance?: string;
}

export default function SellersPage() {
  const { showToast } = useToast();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<SellerFormValues>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Seller | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Mengganti kata kunci pencarian sambil di halaman >1 memicu 2 request beruntun
  // (satu masih dengan `page` lama sebelum di-reset ke 1, satu lagi dengan page yang
  // sudah benar — lihat kedua useEffect di bawah). Kalau request PERTAMA (page lama,
  // hasilnya salah/kosong) selesai BELAKANGAN dari request KEDUA (page benar) karena
  // variasi waktu jaringan, hasil yang salah itu akan menimpa hasil yang benar di
  // layar. Request ID di sini memastikan cuma response dari request TERAKHIR yang
  // pernah dikirim yang boleh meng-update state, apapun urutan response-nya datang.
  const requestIdRef = useRef(0);

  const loadSellers = async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get<Paginated<Seller>>('/api/sellers', {
        params: { page, pageSize: PAGE_SIZE, search: debouncedSearch || undefined },
      });
      if (requestId !== requestIdRef.current) return;
      setSellers(data.data);
      setTotal(data.total);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setError(true);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  // Live search dengan debounce (300ms) — tidak query tiap ketukan tombol,
  // cukup begitu admin berhenti mengetik sejenak.
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Ganti kata kunci pencarian = konteks list baru, selalu mulai dari halaman 1.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    loadSellers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch]);

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (seller: Seller) => {
    setEditingId(seller.id);
    setForm({
      name: seller.name,
      email: seller.email,
      phone: seller.phone ?? '',
      qrisTerminalId: seller.qrisTerminalId ?? '',
      dailyMealAllowance: seller.dailyMealAllowance,
      isActive: seller.isActive,
    });
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
  };

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Nama penjual wajib diisi.';
    if (!editingId && !form.email.trim()) nextErrors.email = 'Email wajib diisi.';
    if (form.dailyMealAllowance === '' || form.dailyMealAllowance <= 0) {
      nextErrors.dailyMealAllowance = 'Uang makan wajib diisi dan harus lebih dari 0.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setTempPassword(null);

    try {
      if (editingId) {
        await api.put(`/api/sellers/${editingId}`, {
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          qrisTerminalId: form.qrisTerminalId.trim() || null,
          dailyMealAllowance: form.dailyMealAllowance,
          isActive: form.isActive,
        });
        showToast('success', 'Data penjual berhasil diperbarui.');
        closeModal();
      } else {
        const { data } = await api.post('/api/sellers', {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          qrisTerminalId: form.qrisTerminalId.trim() || null,
          dailyMealAllowance: form.dailyMealAllowance,
          isActive: form.isActive,
        });
        showToast('success', 'Penjual berhasil ditambahkan.');
        closeModal();
        if (data.tempPassword) {
          setTempPassword(data.tempPassword);
        }
      }
      await loadSellers();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal menyimpan data penjual.';
      showToast('danger', message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/sellers/${deleteTarget.id}`);
      showToast('success', 'Penjual berhasil dihapus.');
      setDeleteTarget(null);
      await loadSellers();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal menghapus penjual.';
      showToast('danger', message);
    } finally {
      setDeleting(false);
    }
  };

  const columns: TableColumn<Seller>[] = [
    { key: 'name', header: 'Nama', render: (s) => s.name },
    { key: 'email', header: 'Email', render: (s) => s.email },
    { key: 'qris', header: 'Terminal QRIS', render: (s) => s.qrisTerminalId ?? '-' },
    { key: 'meal', header: 'Uang Makan', align: 'right', render: (s) => formatRupiah(s.dailyMealAllowance) },
    { key: 'active', header: 'Status', render: (s) => <Badge tone={s.isActive ? 'success' : 'neutral'}>{s.isActive ? 'Aktif' : 'Nonaktif'}</Badge> },
    {
      key: 'action',
      header: '',
      render: (s) => (
        <div className={styles.rowActions}>
          <Button size="sm" icon={<FontAwesomeIcon icon={faPenToSquare} />} onClick={() => openEditModal(s)}>
            Edit
          </Button>
          {!s.hasUsage && (
            <Button size="sm" variant="danger" icon={<FontAwesomeIcon icon={faTrashCan} />} onClick={() => setDeleteTarget(s)}>
              Hapus
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        description="Kelola data penjual keliling — akun login, terminal QRIS, dan uang makan harian."
        actions={
          <Button variant="primary" icon={<FontAwesomeIcon icon={faPlus} />} onClick={openAddModal}>
            Tambah Penjual
          </Button>
        }
      />

      {tempPassword && <TempPasswordBanner password={tempPassword} />}

      <SearchBox value={search} onChange={setSearch} placeholder="Cari nama penjual..." />

      {loading ? (
        <SkeletonTable rows={4} />
      ) : error ? (
        <ErrorState onRetry={loadSellers} />
      ) : sellers.length === 0 ? (
        <EmptyState message={debouncedSearch ? 'Tidak ada penjual dengan nama tersebut.' : 'Belum ada penjual.'} />
      ) : (
        <Table columns={columns} data={sellers} rowKey={(s) => s.id} />
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

      {showModal && (
        <Modal
          title={editingId ? 'Edit Penjual' : 'Tambah Penjual'}
          onClose={closeModal}
          blurBackdrop
          footer={
            <>
              <Button variant="secondary" onClick={closeModal} icon={<FontAwesomeIcon icon={faXmark} />}>
                Batal
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={submitting}
                icon={<FontAwesomeIcon icon={faFloppyDisk} />}
              >
                {submitting ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </>
          }
        >
          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <FormField label="Nama Penjual" htmlFor="seller-name" required error={errors.name}>
              <input
                id="seller-name"
                placeholder="mis. Budi Santoso"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }}
              />
            </FormField>
            <FormField label="Email" htmlFor="seller-email" required error={errors.email}>
              <input
                id="seller-email"
                type="email"
                placeholder="nama@email.com"
                value={form.email}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value });
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                disabled={!!editingId}
              />
            </FormField>
            <FormField label="No. HP" htmlFor="seller-phone">
              <input
                id="seller-phone"
                placeholder="08xxxxxxxxxx"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </FormField>
            <FormField label="ID Terminal QRIS BCA" htmlFor="seller-qris">
              <input
                id="seller-qris"
                placeholder="mis. TID12345"
                value={form.qrisTerminalId}
                onChange={(e) => setForm({ ...form, qrisTerminalId: e.target.value })}
              />
            </FormField>
            <FormField label="Uang Makan Harian" htmlFor="seller-meal" required error={errors.dailyMealAllowance}>
              <input
                id="seller-meal"
                type="text"
                inputMode="numeric"
                placeholder="Rp."
                value={formatInputRupiah(form.dailyMealAllowance)}
                onChange={(e) => {
                  setForm({ ...form, dailyMealAllowance: parseRupiahInput(e.target.value) });
                  setErrors((prev) => ({ ...prev, dailyMealAllowance: undefined }));
                }}
              />
            </FormField>
            <div className={styles.checkboxField}>
              <input
                id="seller-active"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <label htmlFor="seller-active">Aktif</label>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`Yakin hapus penjual "${deleteTarget.name}"? Tindakan ini tidak bisa dibatalkan.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          submitting={deleting}
        />
      )}

      {submitting && <LoadingOverlay message="Menyimpan penjual..." />}
    </div>
  );
}
