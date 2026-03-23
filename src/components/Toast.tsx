'use client';
import { useState, useEffect, useCallback, createContext, useContext } from 'react';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType>({ addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const ICONS: Record<string, string> = {
  success: 'bi-check-circle-fill',
  error: 'bi-exclamation-triangle-fill',
  info: 'bi-info-circle-fill',
  warning: 'bi-exclamation-circle-fill',
};

const COLORS: Record<string, { accent: string; bg: string; border: string }> = {
  success: { accent: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
  error: { accent: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
  info: { accent: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
  warning: { accent: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container */}
      <div
        role="alert"
        aria-live="polite"
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
          maxWidth: 380,
          width: '100%',
        }}
      >
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);
  const colors = COLORS[toast.type];
  const duration = toast.duration || 4000;

  useEffect(() => {
    const timer = setTimeout(() => setExiting(true), duration - 300);
    const removeTimer = setTimeout(() => onDismiss(toast.id), duration);
    return () => { clearTimeout(timer); clearTimeout(removeTimer); };
  }, [toast.id, duration, onDismiss]);

  return (
    <div
      style={{
        background: '#111827',
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        padding: '0.85rem 1rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        pointerEvents: 'auto',
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${colors.border}`,
        fontFamily: "'Inter', system-ui, sans-serif",
        animation: exiting ? 'toastOut 0.3s ease forwards' : 'toastIn 0.3s ease forwards',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: colors.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: colors.accent,
        fontSize: '0.85rem',
      }}>
        <i className={`bi ${ICONS[toast.type]}`}></i>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9', marginBottom: toast.description ? 2 : 0 }}>
          {toast.title}
        </div>
        {toast.description && (
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.5 }}>
            {toast.description}
          </div>
        )}
      </div>

      <button
        onClick={() => { setExiting(true); setTimeout(() => onDismiss(toast.id), 300); }}
        style={{
          background: 'none',
          border: 'none',
          color: '#475569',
          cursor: 'pointer',
          padding: 2,
          fontSize: '0.8rem',
          flexShrink: 0,
          transition: 'color 0.15s',
        }}
        aria-label="Cerrar notificación"
      >
        <i className="bi bi-x-lg"></i>
      </button>

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(100px) scale(0.95); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to { opacity: 0; transform: translateX(100px) scale(0.95); }
        }
      `}</style>
    </div>
  );
}
