// Small bridge so code outside the React tree (e.g. the axios interceptor in
// services/api.ts) can trigger a Toast without hooks. ToastProvider registers
// itself via setToastHandler() on mount.

type ToastTone = 'success' | 'danger';
type ToastHandler = (tone: ToastTone, message: string) => void;

let handler: ToastHandler | null = null;

export function setToastHandler(fn: ToastHandler | null) {
  handler = fn;
}

export function emitToast(tone: ToastTone, message: string) {
  handler?.(tone, message);
}
