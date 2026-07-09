import React, { useEffect, useState } from 'react';

// ── Inline alert banner ──────────────────────────────────────────────────────
export function Message({ type = 'error', children, onClose }) {
  const colors = {
    error:   { bg: 'var(--color-red-light)',   color: '#991B1B', icon: '❌' },
    success: { bg: 'var(--color-green-light)', color: '#065F46', icon: '✅' },
    info:    { bg: 'var(--color-blue-light)',  color: '#1E40AF', icon: 'ℹ️'  },
    warning: { bg: '#FEF3C7',                  color: '#92400E', icon: '⚠️' },
  };
  const { bg, color, icon } = colors[type] || colors.error;

  return (
    <div style={{
      background: bg, color, borderRadius: 'var(--radius-md)',
      padding: '12px 16px', fontSize: 14, fontWeight: 500,
      display: 'flex', alignItems: 'flex-start', gap: 10,
      marginBottom: 12,
    }}>
      <span>{icon}</span>
      <span style={{ flex: 1 }}>{children}</span>
      {onClose && (
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color, fontSize: 18, lineHeight: 1, opacity: 0.7,
        }}>×</button>
      )}
    </div>
  );
}

// ── Toast notification (auto-dismiss) ───────────────────────────────────────
export function Toast({ type = 'success', message, duration = 3500, onDone }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, duration);
    return () => clearTimeout(t);
  }, [duration, onDone]);

  if (!visible) return null;

  const typeClasses = {
    success: 'toast--success',
    error:   'toast--error',
    info:    'toast--info',
  };

  return (
    <div className={`toast ${typeClasses[type] || 'toast--info'}`}>
      {message}
    </div>
  );
}

// ── Toast container (holds multiple toasts) ──────────────────────────────────
export function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <Toast key={t.id} type={t.type} message={t.message} onDone={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

// ── Hook to manage toasts ────────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, removeToast };
}
