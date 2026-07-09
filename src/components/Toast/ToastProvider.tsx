import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faCircleExclamation, faXmark } from '@fortawesome/free-solid-svg-icons';
import { setToastHandler } from '../../utils/toastBus';
import styles from './Toast.module.scss';

type ToastTone = 'success' | 'danger';

interface ToastItem {
  id: string;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  showToast: (tone: ToastTone, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const AUTO_HIDE_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (tone: ToastTone, message: string) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, tone, message }]);
      setTimeout(() => dismiss(id), AUTO_HIDE_MS);
    },
    [dismiss]
  );

  // Register itself with toastBus so code outside the React tree (axios interceptor)
  // can also trigger a toast — see services/api.ts.
  useEffect(() => {
    setToastHandler(showToast);
    return () => setToastHandler(null);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={styles.container} aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={[styles.toast, styles[t.tone]].join(' ')} role="status">
            <FontAwesomeIcon
              icon={t.tone === 'success' ? faCircleCheck : faCircleExclamation}
              className={styles.icon}
            />
            <span className={styles.message}>{t.message}</span>
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => dismiss(t.id)}
              aria-label="Tutup notifikasi"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
