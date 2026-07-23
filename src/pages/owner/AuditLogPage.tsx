import { useEffect, useState } from 'react';
import api from '../../services/api';
import type { AuditLog } from '../../types/auditLog';
import type { Paginated } from '../../types/pagination';
import { PAGE_SIZE } from '../../utils/constants';
import Pagination from '../../components/Pagination/Pagination';
import PageHeader from '../../components/PageHeader/PageHeader';
import Table, { type TableColumn } from '../../components/Table/Table';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';
import styles from './AuditLogPage.module.scss';

const ENTITY_OPTIONS = ['sales', 'expenses'];

export default function AuditLogPage() {
  const [entity, setEntity] = useState('');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get<Paginated<AuditLog>>('/api/audit-logs', {
        params: { ...(entity ? { entity } : {}), page, pageSize: PAGE_SIZE },
      });
      setLogs(data.data);
      setTotal(data.total);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [entity]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity, page]);

  const columns: TableColumn<AuditLog>[] = [
    { key: 'time', header: 'Waktu', render: (log) => new Date(log.createdAt).toLocaleString('id-ID') },
    { key: 'user', header: 'User', render: (log) => log.userName ?? '-' },
    { key: 'action', header: 'Aksi', render: (log) => log.action },
    { key: 'entity', header: 'Entity', render: (log) => log.entity },
    { key: 'entityId', header: 'Entity ID', render: (log) => <span className={styles.mono}>{log.entityId ?? '-'}</span> },
    {
      key: 'details',
      header: 'Detail',
      render: (log) => <span className={styles.mono}>{log.details ? JSON.stringify(log.details) : '-'}</span>,
    },
  ];

  return (
    <div>
      <PageHeader description="Riwayat perubahan data penting (penjualan & pengeluaran) untuk audit." />

      <div className={styles.filterRow}>
        <label>
          Entity:{' '}
          <select className={styles.filterSelect} value={entity} onChange={(e) => setEntity(e.target.value)}>
            <option value="">Semua</option>
            {ENTITY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <SkeletonTable rows={5} columns={columns} />
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : logs.length === 0 ? (
        <EmptyState message="Tidak ada log untuk filter ini." />
      ) : (
        <Table columns={columns} data={logs} rowKey={(log) => log.id} />
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
