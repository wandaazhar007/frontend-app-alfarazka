import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation, faXmark, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import Modal from './Modal';
import Button from '../Button/Button';
import styles from './Modal.module.scss';

interface ConfirmModalProps {
  title?: string;
  message: string;
  confirmLabel?: string;
  /** Icon pada tombol konfirmasi — default ikon hapus, ganti kalau aksinya bukan delete (mis. reset password). */
  confirmIcon?: IconDefinition;
  onConfirm: () => void;
  onCancel: () => void;
  submitting?: boolean;
}

// Required confirmation before a destructive action (§8.2) — used for all transaction/data deletions.
export default function ConfirmModal({
  title = 'Konfirmasi',
  message,
  confirmLabel = 'Ya, Hapus',
  confirmIcon = faTrashCan,
  onConfirm,
  onCancel,
  submitting = false,
}: ConfirmModalProps) {
  return (
    <Modal
      title={title}
      icon={<FontAwesomeIcon icon={faTriangleExclamation} className={styles.iconWarning} />}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={submitting} icon={<FontAwesomeIcon icon={faXmark} />}>
            Batal
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={submitting} icon={<FontAwesomeIcon icon={confirmIcon} />}>
            {submitting ? 'Menghapus...' : confirmLabel}
          </Button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}
