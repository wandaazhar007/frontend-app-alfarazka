import type { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import styles from './Modal.module.scss';

interface ModalProps {
  title: ReactNode;
  onClose?: () => void;
  footer?: ReactNode;
  children: ReactNode;
  /** Icon next to the title, e.g. faTriangleExclamation for "action needed" modals (not a fatal error). */
  icon?: ReactNode;
}

export default function Modal({ title, onClose, footer, children, icon }: ModalProps) {
  return (
    <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={styles.panel} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <h2 className={styles.title}>
            {icon}
            {title}
          </h2>
          {onClose && (
            <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Tutup">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          )}
        </div>
        {children}
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
