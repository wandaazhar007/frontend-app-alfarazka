import type { ReactNode } from 'react';
import styles from './Table.module.scss';

export interface TableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  render: (row: T) => ReactNode;
  /** Hide this column in the mobile card view (e.g. an action column that already has a button on the card). */
  hideOnCard?: boolean;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
}

// Desktop/tablet (>= $breakpoints.tablet): regular table.
// Mobile: stacked cards, one card per row — NO horizontal scroll (§8.12).
// Empty/loading/error states are handled by the caller (EmptyState/Skeleton/ErrorState), not here.

export default function Table<T>({ columns, data, rowKey }: TableProps<T>) {
  return (
    <>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.align === 'right' ? styles.alignRight : undefined}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((col) => (
                  <td key={col.key} className={col.align === 'right' ? styles.alignRight : undefined}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.cardList}>
        {data.map((row) => (
          <div className={styles.rowCard} key={rowKey(row)}>
            {columns
              .filter((col) => !col.hideOnCard)
              .map((col) => (
                <div className={styles.rowCardItem} key={col.key}>
                  <span className={styles.rowCardLabel}>{col.header}</span>
                  <span className={styles.rowCardValue}>{col.render(row)}</span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </>
  );
}
