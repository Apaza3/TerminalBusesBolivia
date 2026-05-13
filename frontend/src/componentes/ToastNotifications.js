import React, { useState, useCallback, useContext, createContext } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

/**
 * ToastNotifications — Professional toast system replacing browser alerts.
 * Provides a context + hook for global toast access.
 */

const ToastContext = createContext(null);

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
};

const TOAST_COLORS = {
    exito: { bg: 'rgba(16,185,129,0.15)', border: '#065f46', text: '#6ee7b7', icon: <CheckCircle size={18} /> },
    error: { bg: 'rgba(239,68,68,0.15)', border: '#7f1d1d', text: '#fca5a5', icon: <AlertTriangle size={18} /> },
    info: { bg: 'rgba(59,130,246,0.15)', border: '#1e3a5f', text: '#93c5fd', icon: <Info size={18} /> },
    alerta: { bg: 'rgba(245,158,11,0.15)', border: '#78350f', text: '#fcd34d', icon: <AlertTriangle size={18} /> },
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const mostrar = useCallback((mensaje, tipo = 'info', duracion = 4000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, mensaje, tipo }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duracion);
    }, []);

    const cerrar = (id) => setToasts(prev => prev.filter(t => t.id !== id));

    return (
        <ToastContext.Provider value={{ mostrar }}>
            {children}

            {/* Toast Container */}
            <div style={{
                position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999,
                display: 'flex', flexDirection: 'column', gap: '0.5rem',
                maxWidth: '360px', width: '100%',
            }}>
                {toasts.map(t => {
                    const style = TOAST_COLORS[t.tipo] || TOAST_COLORS.info;
                    return (
                        <div key={t.id} style={{
                            background: style.bg, border: `1px solid ${style.border}`,
                            borderRadius: '10px', padding: '0.75rem 1rem',
                            display: 'flex', alignItems: 'center', gap: '0.6rem',
                            animation: 'slideIn 0.3s ease-out',
                            backdropFilter: 'blur(12px)',
                        }}>
                            <span style={{ color: style.text, flexShrink: 0 }}>{style.icon}</span>
                            <span style={{ color: style.text, fontSize: '0.85rem', flex: 1 }}>{t.mensaje}</span>
                            <button onClick={() => cerrar(t.id)} style={{
                                background: 'transparent', border: 'none', color: style.text,
                                cursor: 'pointer', padding: '0.2rem', flexShrink: 0, opacity: 0.6,
                            }}>
                                <X size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>

            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </ToastContext.Provider>
    );
};

export default ToastProvider;
