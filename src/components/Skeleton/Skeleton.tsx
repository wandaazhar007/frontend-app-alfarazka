import styles from './Skeleton.module.scss';
import tableStyles from '../Table/Table.module.scss';

type Variant = 'text' | 'statCard' | 'tableRow' | 'chart';

interface SkeletonProps {
  variant: Variant;
  count?: number;
  width?: string;
}

// Skeleton shape resembles the actual content — no fullscreen spinner or blank page allowed (§8.10).
export default function Skeleton({ variant, count = 1, width }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={[styles.block, styles[variant]].join(' ')} style={width ? { width } : undefined} />
      ))}
    </>
  );
}

export function SkeletonStatCardRow({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gap: '1.2rem' }}>
      <Skeleton variant="statCard" count={count} />
    </div>
  );
}

interface SkeletonTableColumn {
  key: string;
  header: string;
  align?: 'left' | 'right';
}

interface SkeletonTableProps {
  rows?: number;
  /** Kolom tabel asli (dari `TableColumn<T>[]` yang dipakai <Table/> beneran) — kalau
   * diisi, header tabel tampil langsung sebagai teks asli (TIDAK ikut skeleton),
   * cuma baris isinya yang jadi skeleton. Kalau tidak diisi, fallback ke tampilan
   * lama (blok skeleton polos, tanpa header) — supaya caller lama tidak langsung rusak. */
  columns?: SkeletonTableColumn[];
}

export function SkeletonTable({ rows = 5, columns }: SkeletonTableProps) {
  if (!columns) {
    return (
      <div>
        <Skeleton variant="tableRow" count={rows} />
      </div>
    );
  }

  return (
    <>
      <div className={tableStyles.tableWrapper}>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.align === 'right' ? tableStyles.alignRight : undefined}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.key} className={col.align === 'right' ? tableStyles.alignRight : undefined}>
                    <Skeleton variant="text" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={tableStyles.cardList}>
        <Skeleton variant="tableRow" count={rows} />
      </div>
    </>
  );
}
