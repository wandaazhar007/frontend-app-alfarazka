import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import styles from './Pagination.module.scss';

interface PaginationProps {
  /** 1-indexed */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

// Pages are fetched from the backend (LIMIT/OFFSET) — this component is purely presentational.
export default function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div className={styles.wrapper}>
      <span className={styles.info}>
        Menampilkan {from}–{to} dari {total}
      </span>
      <div className={styles.pages}>
        <button
          type="button"
          className={styles.pageButton}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Halaman sebelumnya"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>

        {pageNumbers.map((n, i) =>
          n === 'ellipsis' ? (
            <span key={`ellipsis-${i}`} className={styles.ellipsis}>
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              className={[styles.pageButton, n === page ? styles.active : ''].filter(Boolean).join(' ')}
              onClick={() => onPageChange(n)}
              aria-current={n === page ? 'page' : undefined}
            >
              {n}
            </button>
          )
        )}

        <button
          type="button"
          className={styles.pageButton}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Halaman berikutnya"
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>
    </div>
  );
}

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  const delta = 1;
  const range: (number | 'ellipsis')[] = [];
  let lastShown = 0;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      if (lastShown && i - lastShown > 1) range.push('ellipsis');
      range.push(i);
      lastShown = i;
    }
  }

  return range;
}
