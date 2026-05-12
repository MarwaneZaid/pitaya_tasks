import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import { X } from 'lucide-react';

const ToastContext = createContext(null);

let toastSeq = 0;

/**
 * @typedef {{ message: string, variant?: 'info'|'success'|'error', duration?: number }} ToastInput
 */

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    const t = timersRef.current.get(id);
    if (t) clearTimeout(t);
    timersRef.current.delete(id);
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const showToast = useCallback((opts) => {
    const message = typeof opts === 'string' ? opts : opts.message;
    const variant = typeof opts === 'object' ? (opts.variant ?? 'info') : 'info';
    const duration =
      typeof opts === 'object' && opts.duration != null
        ? opts.duration
        : variant === 'error'
          ? 8000
          : 5000;
    const id = ++toastSeq;
    setToasts((prev) => [...prev, { id, message, variant }]);
    if (duration > 0) {
      const timer = setTimeout(() => dismiss(id), duration);
      timersRef.current.set(id, timer);
    }
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast, dismiss }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[9999] flex w-[min(100vw-2rem,22rem)] flex-col gap-2 pointer-events-none"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
              t.variant === 'error'
                ? 'border-red-200 bg-red-50 text-red-900'
                : t.variant === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200 bg-white text-slate-800'
            }`}
          >
            <span className="min-w-0 flex-1 leading-snug">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-md p-1 text-current opacity-70 hover:bg-black/5 hover:opacity-100"
              aria-label="Fermer la notification"
            >
              <X className="h-4 w-4" aria-hidden />
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
    throw new Error('useToast doit être utilisé à l’intérieur de <ToastProvider>.');
  }
  return ctx;
}
