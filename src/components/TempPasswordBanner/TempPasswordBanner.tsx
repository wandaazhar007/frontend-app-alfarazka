import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faKey } from '@fortawesome/free-solid-svg-icons';
import Button from '../Button/Button';
import { useToast } from '../Toast/ToastProvider';
import styles from './TempPasswordBanner.module.scss';

interface TempPasswordBannerProps {
  password: string;
}

// The temporary password is only shown ONCE — a Copy button so it's not
// easily missed or forgotten before this banner disappears (see the past
// incident with cut-off accounts in docs/CLAUDE.md).
export default function TempPasswordBanner({ password }: TempPasswordBannerProps) {
  const { showToast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      showToast('success', 'Password disalin ke clipboard.');
    } catch {
      showToast('danger', 'Gagal menyalin. Silakan salin manual.');
    }
  };

  return (
    <div className={styles.banner}>
      <FontAwesomeIcon icon={faKey} className={styles.icon} />
      <div className={styles.body}>
        <strong>Password sementara dibuat.</strong>
        <div className={styles.passwordRow}>
          <span className={styles.passwordValue}>{password}</span>
          <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
            Salin
          </Button>
        </div>
        <p className={styles.hint}>
          Sampaikan ke user secara manual sekarang juga — password ini TIDAK ditampilkan lagi setelah halaman ini
          ditutup/di-refresh.
        </p>
      </div>
    </div>
  );
}
