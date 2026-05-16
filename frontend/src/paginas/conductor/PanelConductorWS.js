// [Académico] Sprint 4 - Wrapper WS sobre PanelConductor (R20, R26)
// PanelConductor.js es READ-ONLY — este wrapper añade WS + notificaciones sin tocarlo
import React, { useCallback } from 'react';
import PanelConductor from './PanelConductor';
import useWebSocket from '../../hooks/useWebSocket';
import useNotifications from '../../hooks/useNotifications';

const COLORES_TIPO = {
    error:   { bg: 'rgba(127,29,29,0.95)',  borde: '#ef4444', icono: '❌' },
    warning: { bg: 'rgba(120,53,15,0.95)',  borde: '#f59e0b', icono: '⚠️' },
    success: { bg: 'rgba(6,78,59,0.95)',    borde: '#10b981', icono: '✅' },
    info:    { bg: 'rgba(12,74,110,0.95)',  borde: '#38bdf8', icono: 'ℹ️' },
};

const NotifBadge = ({ n, onEliminar }) => {
    const c = COLORES_TIPO[n.tipo] || COLORES_TIPO.info;
    return (
        <div style={{
            background: c.bg, border: `1px solid ${c.borde}`,
            color: '#f1f5f9', padding: '0.75rem 1.1rem',
            borderRadius: 10, maxWidth: 340,
            display: 'flex', alignItems: 'flex-start', gap: '0.65rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
        }}>
            <span style={{ fontSize: '1.05rem', flexShrink: 0 }}>{c.icono}</span>
            <div style={{ flex: 1, fontSize: '0.83rem', lineHeight: 1.5 }}>{n.mensaje}</div>
            <button
                onClick={() => onEliminar(n.id)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem', padding: 0, lineHeight: 1 }}
            >✕</button>
        </div>
    );
};

const PanelConductorWS = () => {
    const { notificaciones, agregar, eliminar } = useNotifications();

    const handleMensaje = useCallback((msg) => {
        switch (msg.tipo) {
            case 'notificacion_anden':
                agregar(`Andén actualizado: ${msg.payload?.mensaje || msg.data?.mensaje || 'Ver panel'}`, 'info', 8000);
                break;
            case 'alerta_admin':
                agregar(msg.payload?.mensaje || msg.data?.mensaje || 'Alerta del sistema', 'warning');
                break;
            case 'alerta_mantenimiento_critico':
                agregar('⚙️ Mantenimiento crítico pendiente — revisar bus', 'error', 10000);
                break;
            case 'estado_viaje_actualizado':
                // confirmación silenciosa
                break;
            default:
                break;
        }
    }, [agregar]);

    const { isRealtime } = useWebSocket(['viajes', 'notificaciones', 'flota'], handleMensaje);

    return (
        <>
            {/* Overlay de notificaciones en tiempo real */}
            {notificaciones.length > 0 && (
                <div style={{
                    position: 'fixed', top: 16, right: 16, zIndex: 9999,
                    display: 'flex', flexDirection: 'column', gap: '0.5rem',
                    pointerEvents: 'none',
                }}>
                    {notificaciones.map(n => (
                        <div key={n.id} style={{ pointerEvents: 'auto' }}>
                            <NotifBadge n={n} onEliminar={eliminar} />
                        </div>
                    ))}
                </div>
            )}

            {/* Indicador modo offline */}
            {!isRealtime && (
                <div style={{
                    position: 'fixed', bottom: 12, left: 12, zIndex: 9998,
                    background: 'rgba(15,23,42,0.92)', border: '1px solid #334155',
                    color: '#64748b', padding: '0.35rem 0.85rem',
                    borderRadius: 999, fontSize: '0.7rem',
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    backdropFilter: 'blur(6px)',
                }}>
                    <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: '#f59e0b', display: 'inline-block', flexShrink: 0,
                    }} />
                    Modo offline · polling 5s
                </div>
            )}

            <PanelConductor />
        </>
    );
};

export default PanelConductorWS;
