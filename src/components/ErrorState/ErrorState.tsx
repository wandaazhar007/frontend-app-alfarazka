import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import Button from '../Button/Button';
import styles from './ErrorState.module.scss';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

// "Failed to load data. Check your internet connection." + [Try Again] button (§10).
export default function ErrorState({ message = 'Gagal memuat data. Periksa koneksi internet Anda.', onRetry }: ErrorStateProps) {
  return (
    <div className={styles.wrapper}>
      <FontAwesomeIcon icon={faTriangleExclamation} className={styles.icon} />
      <p className={styles.text}>{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Coba Lagi
        </Button>
      )}
    </div>
  );
}
