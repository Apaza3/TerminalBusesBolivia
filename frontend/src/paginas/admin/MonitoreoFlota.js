// [Académico] Sprint 4 - Monitor de flota en tiempo real (R17)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import useWebSocket from '../../hooks/useWebSocket';
import useNotifications from '../../hooks/useNotifications';
import { obtenerEstadoFlota, emitirNotificacionAnden } from '../../servicios/opsService';
import gsap from 'gsap';

const ESTADOS_VIAJE = {
    programado: { label: 'Programado', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
    en_ruta:    { label: 'En Ruta',    color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    finalizado: { label: 'Finalizado', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
    cancelado:  { label: 'Cancelado',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
};

const COLORES_NOTIF = {
    info:    { bg: 'rgba(12,74,110,0.95)',  borde: '#38bdf8', icono: 'ℹ️' },
    warning: { bg: 'rgba(120,53,15,0.95)',  borde: '#f59e0b', icono: '⚠️' },
    error:   { bg: 'rgba(127,29,29,0.95)',  borde: '#ef4444', icono: '❌' },
    success: { bg: 'rgba(6,78,59,0.95)',    borde: '#10b981', icono: '✅' },
};

const BadgeEstado = ({ estado }) => {
    const e = ESTADOS_VIAJE[estado] || { label: estado, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
    return (
        <span style={{
            padding: '0.2rem 0.65rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700,
            background: e.bg, color: e.color, border: `1px solid ${e.color}40`,
        }}>
            {e.label}
        </span>
    );
};

const MonitoreoFlota = () => {
    const navigate = useNavigate();
    const { perfil, logout } = useAuth();
    const rootRef = useRef(null);

    const deptNombre = perfil?.departamento || 'La Paz';
    const tema = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];

    const [datos, setDatos] = useState({ incidencias: [], mantenimiento: [], itinerarios: [], notificaciones: [] });
    const [cargando, setCargando] = useState(true);
    const [tabActiva, setTabActiva] = useState('itinerarios');
    const [formAnden, setFormAnden] = useState({ viajeId: '', mensaje: '', tipo: 'retraso' });
    const [enviandoAnden, setEnviandoAnden] = useState(false);

    const { notificaciones: notifWS, agregar: agregarNotif, eliminar: eliminarNotif } = useNotifications();

    const cargar = useCallback(async () => {
        try {
            const res = await obtenerEstadoFlota();
            setDatos(res);
        } catch {
            // silencioso en prototipo
        } finally {
            setCargando(false);
        }
    }, []);

    // [Académico] Sprint 4 - Manejar mensajes WS entrantes
    const handleMensaje = useCallback((msg) => {
        const tipo = msg.tipo;
        if (tipo === 'estado_viaje_actualizado') {
            agregarNotif(`Viaje ${msg.payload?.viaje_id?.slice(0, 8) || '—'} → ${msg.payload?.estado || '?'}`, 'info');
            cargar();
        } else if (tipo === 'incidencia_creada') {
            agregarNotif(`🚨 Nueva incidencia: ${msg.payload?.tipo || 'sin tipo'}`, 'error', 8000);
            cargar();
        } else if (tipo === 'mantenimiento_creado' || tipo === 'alerta_mantenimiento_critico') {
            const nivel = tipo === 'alerta_mantenimiento_critico' ? 'error' : 'warning';
            agregarNotif(`🔧 Mantenimiento ${tipo === 'alerta_mantenimiento_critico' ? 'CRÍTICO' : 'reportado'}`, nivel, 8000);
            cargar();
        } else if (tipo === 'notificacion_anden') {
            agregarNotif(`🚏 Andén: ${msg.payload?.mensaje || 'actualizado'}`, 'info');
        } else if (tipo === 'poll_tick') {
            cargar();
        } else if (tipo === 'abordaje_validado') {
            agregarNotif(`✅ Abordaje: ${msg.payload?.pasajero || 'pasajero'}`, 'success', 3000);
        }
    }, [cargar, agregarNotif]);

    const { isRealtime } = useWebSocket(['viajes', 'flota', 'notificaciones'], handleMensaje);

    useEffect(() => { cargar(); }, [cargar]);

    useEffect(() => {
        const iv = setInterval(cargar, 10000);
        return () => clearInterval(iv);
    }, [cargar]);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-m="header"]', { y: -25, opacity: 0, duration: 0.5, ease: 'power3.out' });
            gsap.from('[data-m="kpi"]', { y: 20, opacity: 0, duration: 0.45, stagger: 0.08, ease: 'power2.out', delay: 0.15 });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    const handleEmitirAnden = async (e) => {
        e.preventDefault();
        if (!formAnden.mensaje.trim() || !formAnden.viajeId.trim()) return;
        setEnviandoAnden(true);
        try {
            await emitirNotificacionAnden(formAnden);
            agregarNotif('Notificación de andén enviada', 'success', 3000);
            setFormAnden(p => ({ ...p, mensaje: '' }));
        } catch {
            agregarNotif('Error al enviar notificación', 'error');
        } finally {
            setEnviandoAnden(false);
        }
    };

    const incAbiertas = datos.incidencias.filter(i => i.estado === 'abierta').length;
    const mntAbiertos = datos.mantenimiento.filter(m => m.estado === 'abierto').length;
    const critMnt = datos.mantenimiento.filter(m => m.severidad === 'critica' && m.estado === 'abierto').length;
    const enRuta = datos.itinerarios.filter(i => i.estado === 'en_ruta').length;

    const TABS = [
        { id: 'itinerarios', label: 'Itinerarios', icono: '📅', count: datos.itinerarios.length },
        { id: 'incidencias', label: 'Incidencias', icono: '🚨', count: incAbiertas, alerta: incAbiertas > 0 },
        { id: 'mantenimiento', label: 'Mantenimiento', icono: '🔧', count: mntAbiertos, alerta: critMnt > 0 },
        { id: 'anden', label: 'Notif. Andén', icono: '🚏', count: null },
    ];

    return (
        <div ref={rootRef} style={{ background: '#07111f', minHeight: '100vh', color: '#dde5f0', fontFamily: "'Inter', system-ui, sans-serif" }}>

            {/* Notificaciones WS overlay */}
            {notifWS.length > 0 && (
                <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem', pointerEvents: 'none' }}>
                    {notifWS.map(n => {
                        const c = COLORES_NOTIF[n.tipo] || COLORES_NOTIF.info;
                        return (
                            <div key={n.id} style={{
                                background: c.bg, border: `1px solid ${c.borde}`, color: '#f1f5f9',
                                padding: '0.7rem 1rem', borderRadius: 10, maxWidth: 320,
                                display: 'flex', gap: '0.6rem', alignItems: 'flex-start',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                                pointerEvents: 'auto',
                            }}>
                                <span>{c.icono}</span>
                                <span style={{ flex: 1, fontSize: '0.82rem' }}>{n.mensaje}</span>
                                <button onClick={() => eliminarNotif(n.id)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Header */}
            <header data-m="header" style={{
                background: `linear-gradient(135deg, ${tema.bg} 0%, ${tema.colorSecundario}60 100%)`,
                borderBottom: `2px solid ${tema.color}50`,
                padding: '0.9rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                position: 'sticky', top: 0, zIndex: 20,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => navigate('/admin/dashboard')} style={{
                        background: `${tema.color}15`, border: `1px solid ${tema.color}40`,
                        color: tema.acento, padding: '0.4rem 0.8rem', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem',
                    }}>← Dashboard</button>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f1f5f9' }}>🛰️ Monitor de Flota</div>
                        <div style={{ fontSize: '0.72rem', color: tema.acento }}>{deptNombre} · {perfil?.nombre_completo}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: isRealtime ? '#10b981' : '#f59e0b', display: 'inline-block' }} />
                        <span style={{ color: '#64748b' }}>{isRealtime ? 'Tiempo real' : 'Polling 10s'}</span>
                    </div>
                    <button onClick={() => cargar()} style={{
                        background: `${tema.color}15`, border: `1px solid ${tema.color}30`,
                        color: tema.acento, padding: '0.4rem 0.8rem', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem',
                    }}>↻ Actualizar</button>
                    <button onClick={async () => { await logout(); navigate('/'); }} style={{
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#94a3b8', padding: '0.4rem 0.9rem', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem',
                    }}>Salir</button>
                </div>
            </header>

            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem' }}>

                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                    {[
                        { label: 'En Ruta', valor: enRuta, color: '#10b981', icono: '🚌' },
                        { label: 'Incidencias Abiertas', valor: incAbiertas, color: incAbiertas > 0 ? '#ef4444' : '#10b981', icono: '🚨' },
                        { label: 'Mantenimiento', valor: mntAbiertos, color: critMnt > 0 ? '#7c3aed' : mntAbiertos > 0 ? '#f59e0b' : '#10b981', icono: '🔧' },
                        { label: 'Itinerarios totales', valor: datos.itinerarios.length, color: tema.color, icono: '📅' },
                    ].map((kpi, i) => (
                        <div key={i} data-m="kpi" style={{
                            background: '#0d1a2e', borderRadius: 12, padding: '1.1rem 1.25rem',
                            border: `1px solid ${kpi.color}20`,
                        }}>
                            <div style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }}>{kpi.icono}</div>
                            <div style={{ fontSize: '1.7rem', fontWeight: 800, color: kpi.color }}>{cargando ? '—' : kpi.valor}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>{kpi.label}</div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', borderBottom: `1px solid ${tema.color}20`, paddingBottom: '0.5rem' }}>
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => setTabActiva(tab.id)} style={{
                            padding: '0.5rem 1rem', borderRadius: '8px 8px 0 0',
                            background: tabActiva === tab.id ? `${tema.color}20` : 'transparent',
                            border: tabActiva === tab.id ? `1px solid ${tema.color}40` : '1px solid transparent',
                            borderBottom: 'none', color: tabActiva === tab.id ? tema.acento : '#64748b',
                            cursor: 'pointer', fontSize: '0.82rem', fontWeight: tabActiva === tab.id ? 700 : 400,
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                        }}>
                            {tab.icono} {tab.label}
                            {tab.count !== null && (
                                <span style={{
                                    background: tab.alerta ? '#ef4444' : `${tema.color}30`,
                                    color: tab.alerta ? '#fff' : tema.acento,
                                    padding: '0 0.45rem', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700,
                                }}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab: Itinerarios */}
                {tabActiva === 'itinerarios' && (
                    <div style={{ background: '#0d1a2e', borderRadius: 12, border: `1px solid ${tema.color}20`, overflow: 'hidden' }}>
                        <div style={{ padding: '1rem 1.25rem', borderBottom: `1px solid ${tema.color}15`, fontWeight: 700, fontSize: '0.9rem', color: '#f1f5f9' }}>
                            Itinerarios activos
                        </div>
                        {datos.itinerarios.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#475569' }}>Sin itinerarios registrados</div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: `1px solid ${tema.color}15` }}>
                                        {['Ruta', 'Bus', 'Conductor', 'Salida', 'Estado'].map(h => (
                                            <th key={h} style={{ padding: '0.65rem 1.25rem', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {datos.itinerarios.map(it => (
                                        <tr key={it.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <td style={{ padding: '0.7rem 1.25rem', color: '#f1f5f9' }}>{it.origen || it.ruta_nombre || it.ruta_id || '—'} → {it.destino || '—'}</td>
                                            <td style={{ padding: '0.7rem 1.25rem', color: '#94a3b8' }}>{it.bus_placa || it.bus_id || '—'}</td>
                                            <td style={{ padding: '0.7rem 1.25rem', color: '#94a3b8' }}>{it.conductor_nombre || it.conductor_id || '—'}</td>
                                            <td style={{ padding: '0.7rem 1.25rem', color: '#94a3b8' }}>{it.salida_programada ? new Date(it.salida_programada).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                                            <td style={{ padding: '0.7rem 1.25rem' }}><BadgeEstado estado={it.estado} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* Tab: Incidencias */}
                {tabActiva === 'incidencias' && (
                    <div style={{ background: '#0d1a2e', borderRadius: 12, border: `1px solid ${tema.color}20`, overflow: 'hidden' }}>
                        <div style={{ padding: '1rem 1.25rem', borderBottom: `1px solid ${tema.color}15`, fontWeight: 700, fontSize: '0.9rem', color: '#f1f5f9' }}>
                            Incidencias reportadas
                        </div>
                        {datos.incidencias.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#475569' }}>Sin incidencias registradas</div>
                        ) : (
                            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                                {[...datos.incidencias].reverse().map(inc => (
                                    <div key={inc.id} style={{
                                        padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.04)',
                                        display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'start',
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.87rem', marginBottom: '0.25rem' }}>
                                                {inc.tipo?.toUpperCase()} · {inc.conductor || inc.viaje_id?.slice(0, 8) || '—'}
                                            </div>
                                            <div style={{ color: '#94a3b8', fontSize: '0.78rem', lineHeight: 1.5 }}>{inc.descripcion}</div>
                                            {inc.ubicacion_manual && (
                                                <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '0.2rem' }}>📍 {inc.ubicacion_manual}</div>
                                            )}
                                            <div style={{ color: '#334155', fontSize: '0.7rem', marginTop: '0.3rem' }}>
                                                {inc.creado_en ? new Date(inc.creado_en).toLocaleString('es-BO') : ''}
                                            </div>
                                        </div>
                                        <span style={{
                                            padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700,
                                            background: inc.estado === 'abierta' ? 'rgba(239,68,68,0.1)' : 'rgba(107,114,128,0.1)',
                                            color: inc.estado === 'abierta' ? '#ef4444' : '#6b7280',
                                            border: `1px solid ${inc.estado === 'abierta' ? '#ef4444' : '#6b7280'}40`,
                                        }}>
                                            {inc.estado || 'abierta'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Mantenimiento */}
                {tabActiva === 'mantenimiento' && (
                    <div style={{ background: '#0d1a2e', borderRadius: 12, border: `1px solid ${tema.color}20`, overflow: 'hidden' }}>
                        <div style={{ padding: '1rem 1.25rem', borderBottom: `1px solid ${tema.color}15`, fontWeight: 700, fontSize: '0.9rem', color: '#f1f5f9' }}>
                            Reportes de mantenimiento
                        </div>
                        {datos.mantenimiento.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#475569' }}>Sin reportes de mantenimiento</div>
                        ) : (
                            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                                {[...datos.mantenimiento].reverse().map(mnt => {
                                    const sevColor = { baja: '#10b981', media: '#f59e0b', alta: '#ef4444', critica: '#7c3aed' }[mnt.severidad] || '#94a3b8';
                                    return (
                                        <div key={mnt.id} style={{
                                            padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.04)',
                                            display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'start',
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.87rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {mnt.tipo?.toUpperCase() || '?'}
                                                    <span style={{ padding: '0.1rem 0.5rem', borderRadius: 999, fontSize: '0.68rem', background: `${sevColor}20`, color: sevColor, border: `1px solid ${sevColor}40` }}>
                                                        {mnt.severidad}
                                                    </span>
                                                </div>
                                                <div style={{ color: '#94a3b8', fontSize: '0.78rem', lineHeight: 1.5 }}>{mnt.descripcion}</div>
                                                <div style={{ color: '#334155', fontSize: '0.7rem', marginTop: '0.3rem' }}>
                                                    {mnt.conductor || mnt.bus_id || '—'} · {mnt.creado_en ? new Date(mnt.creado_en).toLocaleString('es-BO') : ''}
                                                </div>
                                            </div>
                                            <span style={{
                                                padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700,
                                                background: mnt.estado === 'abierto' ? 'rgba(245,158,11,0.1)' : 'rgba(107,114,128,0.1)',
                                                color: mnt.estado === 'abierto' ? '#f59e0b' : '#6b7280',
                                                border: `1px solid ${mnt.estado === 'abierto' ? '#f59e0b' : '#6b7280'}40`,
                                            }}>
                                                {mnt.estado || 'abierto'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Andén (R26) */}
                {tabActiva === 'anden' && (
                    <div style={{ background: '#0d1a2e', borderRadius: 12, border: `1px solid ${tema.color}20`, padding: '1.5rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f1f5f9', marginBottom: '1.25rem' }}>
                            Emitir notificación de andén / retraso (R26)
                        </div>
                        <form onSubmit={handleEmitirAnden} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 480 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    ID de Viaje / Itinerario
                                </label>
                                <input
                                    type="text"
                                    value={formAnden.viajeId}
                                    onChange={e => setFormAnden(p => ({ ...p, viajeId: e.target.value }))}
                                    placeholder="it_1234 o ID del itinerario"
                                    style={{
                                        width: '100%', background: '#07111f', border: `1px solid ${tema.color}30`,
                                        color: '#f1f5f9', borderRadius: 8, padding: '0.65rem 1rem',
                                        fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box',
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Tipo
                                </label>
                                <select
                                    value={formAnden.tipo}
                                    onChange={e => setFormAnden(p => ({ ...p, tipo: e.target.value }))}
                                    style={{
                                        width: '100%', background: '#07111f', border: `1px solid ${tema.color}30`,
                                        color: '#f1f5f9', borderRadius: 8, padding: '0.65rem 1rem', fontSize: '0.85rem', outline: 'none',
                                    }}
                                >
                                    <option value="retraso">Retraso</option>
                                    <option value="cambio_anden">Cambio de Andén</option>
                                    <option value="cancelacion">Cancelación</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Mensaje para pasajeros
                                </label>
                                <textarea
                                    value={formAnden.mensaje}
                                    onChange={e => setFormAnden(p => ({ ...p, mensaje: e.target.value }))}
                                    placeholder="Ej: El viaje La Paz → Oruro sale del Andén 7 con 20 min de retraso."
                                    rows={3}
                                    style={{
                                        width: '100%', background: '#07111f', border: `1px solid ${tema.color}30`,
                                        color: '#f1f5f9', borderRadius: 8, padding: '0.65rem 1rem',
                                        fontSize: '0.85rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                                        fontFamily: 'inherit',
                                    }}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={enviandoAnden || !formAnden.mensaje.trim() || !formAnden.viajeId.trim()}
                                style={{
                                    background: enviandoAnden || !formAnden.mensaje.trim() ? '#1e293b' : tema.color,
                                    border: 'none', color: '#fff', padding: '0.8rem 1.5rem', borderRadius: 8,
                                    fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', alignSelf: 'flex-start',
                                    opacity: !formAnden.mensaje.trim() || !formAnden.viajeId.trim() ? 0.5 : 1,
                                    transition: 'all 0.2s',
                                }}
                            >
                                {enviandoAnden ? '⏳ Enviando...' : '🚏 Emitir Notificación'}
                            </button>
                        </form>

                        {/* Historial */}
                        {datos.notificaciones.length > 0 && (
                            <div style={{ marginTop: '1.5rem', borderTop: `1px solid ${tema.color}15`, paddingTop: '1.25rem' }}>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Historial reciente</div>
                                {[...datos.notificaciones].slice(-5).reverse().map((n, i) => (
                                    <div key={i} style={{ padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.8rem' }}>
                                        <span style={{ color: '#38bdf8' }}>{n.tipo}</span>
                                        <span style={{ color: '#94a3b8', marginLeft: '0.75rem' }}>{n.mensaje}</span>
                                        <span style={{ color: '#334155', marginLeft: '0.75rem', fontSize: '0.7rem' }}>
                                            {n.creado_en ? new Date(n.creado_en).toLocaleTimeString('es-BO') : ''}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MonitoreoFlota;
