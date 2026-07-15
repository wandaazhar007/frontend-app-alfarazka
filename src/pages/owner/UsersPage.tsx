import { useEffect, useState, type FormEvent } from 'react';
import { faKey } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import type { Seller } from '../../types/seller';
import type { AdminAccount, CreateUserFormValues } from '../../types/userAccount';
import type { Paginated } from '../../types/pagination';
import { PAGE_SIZE } from '../../utils/constants';
import { formatRupiah } from '../../utils/format';
import Pagination from '../../components/Pagination/Pagination';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../components/Button/Button';
import FormField from '../../components/FormField/FormField';
import Badge from '../../components/Badge/Badge';
import Table, { type TableColumn } from '../../components/Table/Table';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import ConfirmModal from '../../components/Modal/ConfirmModal';
import TempPasswordBanner from '../../components/TempPasswordBanner/TempPasswordBanner';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';
import { useToast } from '../../components/Toast/ToastProvider';
import LoadingOverlay from '../../components/LoadingOverlay/LoadingOverlay';
import styles from './UsersPage.module.scss';

interface ResetTarget {
  id: string;
  name: string;
}

const emptyForm: CreateUserFormValues = {
  role: 'admin',
  name: '',
  email: '',
  phone: '',
  qrisTerminalId: '',
  dailyMealAllowance: 20000,
  isActive: true,
};

export default function UsersPage() {
  const { showToast } = useToast();
  const [form, setForm] = useState<CreateUserFormValues>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const [listRole, setListRole] = useState<'admin' | 'seller'>('admin');
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [resetTarget, setResetTarget] = useState<ResetTarget | null>(null);
  const [resetting, setResetting] = useState(false);

  const loadList = async () => {
    setLoading(true);
    setError(false);
    try {
      if (listRole === 'admin') {
        const { data } = await api.get<Paginated<AdminAccount>>('/api/users', {
          params: { role: 'admin', page, pageSize: PAGE_SIZE },
        });
        setAdmins(data.data);
        setTotal(data.total);
      } else {
        const { data } = await api.get<Paginated<Seller>>('/api/users', {
          params: { role: 'seller', page, pageSize: PAGE_SIZE },
        });
        setSellers(data.data);
        setTotal(data.total);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [listRole]);

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listRole, page]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTempPassword(null);

    try {
      const { data } = await api.post('/api/users', {
        role: form.role,
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        qrisTerminalId: form.role === 'seller' ? form.qrisTerminalId || null : undefined,
        dailyMealAllowance: form.role === 'seller' ? form.dailyMealAllowance : undefined,
        isActive: form.role === 'seller' ? form.isActive : undefined,
      });

      if (data.tempPassword) {
        setTempPassword(data.tempPassword);
        showToast('success', form.role === 'admin' ? 'Admin berhasil ditambahkan.' : 'Penjual berhasil ditambahkan.');
      } else {
        // Email was already registered before — the account is reused, so there's no new
        // password to show (not an error, but the user needs to know so they don't wait
        // for a banner that will never appear). If a new password is needed, use the
        // "Reset Password" button on that user's row in the table below.
        showToast('danger', 'Email ini sudah terdaftar. Kalau lupa passwordnya, pakai tombol "Reset Password" di daftar di bawah.');
      }
      setForm({ ...emptyForm, role: form.role });

      if (listRole === form.role) {
        await loadList();
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal menambahkan user.';
      showToast('danger', message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmReset = async () => {
    if (!resetTarget) return;
    setResetting(true);
    try {
      const { data } = await api.post(`/api/users/${resetTarget.id}/reset-password`);
      setTempPassword(data.tempPassword);
      showToast('success', `Password ${resetTarget.name} berhasil direset.`);
      setResetTarget(null);
    } catch {
      showToast('danger', 'Gagal reset password.');
    } finally {
      setResetting(false);
    }
  };

  const adminColumns: TableColumn<AdminAccount>[] = [
    { key: 'name', header: 'Nama', render: (u) => u.name },
    { key: 'email', header: 'Email', render: (u) => u.email },
    { key: 'phone', header: 'No. HP', render: (u) => u.phone ?? '-' },
    { key: 'active', header: 'Status', render: (u) => <Badge tone={u.isActive ? 'success' : 'neutral'}>{u.isActive ? 'Aktif' : 'Nonaktif'}</Badge> },
    {
      key: 'action',
      header: '',
      render: (u) => (
        <Button size="sm" onClick={() => setResetTarget({ id: u.id, name: u.name })}>
          Reset Password
        </Button>
      ),
    },
  ];

  const sellerColumns: TableColumn<Seller>[] = [
    { key: 'name', header: 'Nama', render: (s) => s.name },
    { key: 'email', header: 'Email', render: (s) => s.email },
    { key: 'qris', header: 'Terminal QRIS', render: (s) => s.qrisTerminalId ?? '-' },
    { key: 'meal', header: 'Uang Makan', align: 'right', render: (s) => formatRupiah(s.dailyMealAllowance) },
    { key: 'active', header: 'Status', render: (s) => <Badge tone={s.isActive ? 'success' : 'neutral'}>{s.isActive ? 'Aktif' : 'Nonaktif'}</Badge> },
    {
      key: 'action',
      header: '',
      render: (s) => (
        <Button size="sm" onClick={() => setResetTarget({ id: s.userId, name: s.name })}>
          Reset Password
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader description="Tambah akun admin atau penjual keliling baru — halaman ini khusus Owner." />

      {tempPassword && <TempPasswordBanner password={tempPassword} />}

      <form onSubmit={handleSubmit} className={styles.form}>
        <FormField label="Role" htmlFor="user-role">
          <select
            id="user-role"
            value={form.role}
            onChange={(e) => setForm({ ...emptyForm, role: e.target.value as 'admin' | 'seller' })}
          >
            <option value="admin">Admin</option>
            <option value="seller">Penjual Keliling</option>
          </select>
        </FormField>
        <FormField label="Nama" htmlFor="user-name">
          <input id="user-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </FormField>
        <FormField label="Email" htmlFor="user-email">
          <input
            id="user-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </FormField>
        <FormField label="No. HP" htmlFor="user-phone">
          <input id="user-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </FormField>

        {form.role === 'seller' && (
          <>
            <FormField label="ID Terminal QRIS BCA" htmlFor="user-qris">
              <input
                id="user-qris"
                value={form.qrisTerminalId}
                onChange={(e) => setForm({ ...form, qrisTerminalId: e.target.value })}
              />
            </FormField>
            <FormField label="Uang Makan Harian" htmlFor="user-meal">
              <input
                id="user-meal"
                type="number"
                value={form.dailyMealAllowance}
                onChange={(e) => setForm({ ...form, dailyMealAllowance: Number(e.target.value) })}
                min={0}
              />
            </FormField>
            <div className={styles.checkboxField}>
              <input
                id="user-active"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <label htmlFor="user-active">Aktif</label>
            </div>
          </>
        )}

        <div className={styles.actions}>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Menyimpan...' : form.role === 'admin' ? 'Tambah Admin' : 'Tambah Penjual'}
          </Button>
        </div>
      </form>

      <h2 className={styles.sectionTitle}>Daftar User</h2>
      <div className={styles.filterRow}>
        <Button variant={listRole === 'admin' ? 'primary' : 'secondary'} size="sm" onClick={() => setListRole('admin')}>
          Admin
        </Button>
        <Button variant={listRole === 'seller' ? 'primary' : 'secondary'} size="sm" onClick={() => setListRole('seller')}>
          Penjual Keliling
        </Button>
      </div>

      {loading ? (
        <SkeletonTable rows={4} />
      ) : error ? (
        <ErrorState onRetry={loadList} />
      ) : listRole === 'admin' ? (
        admins.length === 0 ? (
          <EmptyState message="Belum ada admin." />
        ) : (
          <Table columns={adminColumns} data={admins} rowKey={(u) => u.id} />
        )
      ) : sellers.length === 0 ? (
        <EmptyState message="Belum ada penjual." />
      ) : (
        <Table columns={sellerColumns} data={sellers} rowKey={(s) => s.id} />
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

      {resetTarget && (
        <ConfirmModal
          title="Reset Password"
          message={`Yakin reset password ${resetTarget.name}? Password lama akan langsung tidak berlaku dan user wajib pakai password baru.`}
          confirmLabel="Ya, Reset"
          confirmIcon={faKey}
          onConfirm={confirmReset}
          onCancel={() => setResetTarget(null)}
          submitting={resetting}
        />
      )}

      {submitting && <LoadingOverlay message="Menyimpan user baru..." />}
    </div>
  );
}
