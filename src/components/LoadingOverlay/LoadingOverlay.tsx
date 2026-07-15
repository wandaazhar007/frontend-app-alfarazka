import styles from './LoadingOverlay.module.scss';

interface LoadingOverlayProps {
  message?: string;
}

// Fullscreen blocking overlay — pengecualian dari §8.10 (yang melarang spinner fullscreen
// untuk loading DATA). Ini khusus untuk aksi submit yang harus blocking (mis. simpan form
// di dalam modal), bukan untuk fetch data halaman (itu tetap wajib pakai Skeleton).
export default function LoadingOverlay({ message = 'Menyimpan...' }: LoadingOverlayProps) {
  return (
    <div className={styles.overlay} role="status" aria-live="polite">
      <div className={styles.spinner} />
      <span className={styles.message}>{message}</span>
    </div>
  );
}
