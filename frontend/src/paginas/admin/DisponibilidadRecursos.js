import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import { SUCURSALES_MOCK } from '../../data/mockDiscoveryDB';
import { listarBusesDisponibles, listarConductores, listarItinerarios, disponibilidadRecursos } from '../../servicios/fleetService';
import { calcularEstadoBusFromSOAT } from '../../utilidades/fleetValidators';
import useFleetPolling from '../../hooks/useFleetPolling';
import gsap from 'gsap';

const hoy = () => new Date().toISOString().split('T')[0];
const formatFecha = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });
};

const BadgeEstadoDoc = ({ nivel, mensajes }) => {
    const cfg = {
        ok:       { bg: 'rgba(16,185,129,0.12)',  color: '#6ee7b7',  icon: '✅' },
        alerta:   { bg: 'rgba(245,158,11,0.12)',  color: '#fde68a',  icon: '⚠️' },
        bloqueado:{ bg: 'rgba(239,68,68,0.12)',   color: '#fca5a5',  icon: '⛔' },
    };
    const c = cfg[nivel] || cfg.ok;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <span style={{ fontSize: '0.72rem', color: c.color, background: c.bg, padding: '0.15rem 0.45rem', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                {c.icon} {nivel === 'ok' ? 'Docs vigentes' : nivel === 'bloqueado' ? 'Bloqueado' : 'Alerta'}
            </span>
            {mensajes.map((m, i) => <span key={i} style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{m}</span>)}
        </div>
    );
};

const DisponibilidadRecursos = () => {
    const { perfil, logout } = useAuth();
    const navigate = useNavigate();
    const rootRef = useRef(null);

    const sucursalInfo = SUCURSALES_MOCK.find(s => s.id === perfil?.sucursal_id) || SUCURSALES_MOCK[0];
    const deptNombre = perfil?.departamento || sucursalInfo?.departamento || 'La Paz';
    const tema = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];

    const [buses,       setBuses]       = useState([]);
    const [conductores, setConductores] = useState([]);
    const [itActivos,   setItActivos]   = useState([]);
    const [ultimaActualizacion, setUltima] = useState(null);
    const [cargando,    setCargando]    = useState(true);
    const [filtroEstadoBus, setFiltroEstadoBus] = useState('');

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-anim="header"]',  { y: -24, opacity: 0, duration: 0.4, ease: 'power3.out' });
            gsap.from('[data-anim="sidebar"]', { x: -24, opacity: 0, duration: 0.4, ease: 'power3.out', delay: 0.1 });
            gsap.from('[data-anim="content"]', { y: 24,  opacity: 0, duration: 0.4, ease: 'power3.out', delay: 0.15 });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    const fetchRecursos = useCallback(async () => {
        try {
            const [b, c, disp] = await Promise.all([
                listarBusesDisponibles(),
                listarConductores(),
                disponibilidadRecursos(),
            ]);
            // Enriquecer buses con estado SOAT
            const busesEnriquecidos = b.map(bus => ({
                ...bus,
                _docEstado: calcularEstadoBusFromSOAT(bus, hoy()),
                _enRuta: (disp?.buses_en_ruta || []).includes(bus.id),
            }));
            setBuses(busesEnriquecidos);
            setConductores(c);
            setItActivos(disp?.itinerarios_activos || []);
            setUltima(new Date());
        } catch (err) {
            console.error('DisponibilidadRecursos - fetchRecursos:', err);
        } finally {
            setCargando(false);
        }
    }, []);

    // Polling cada 10 segundos
    useFleetPolling(fetchRecursos, () => {}, 10000, true);

    // KPIs
    const kpis = [
        { icon: '🚌', valor: buses.length,                       color: tema.color,  label: 'Total buses' },
        { icon: '✅', valor: buses.filter(b => !b._enRuta && b._docEstado.estado !== 'bloqueado').length, color: '#10b981', label: 'Disponibles' },
        { icon: '🛣️', valor: buses.filter(b => b._enRuta).length,                  color: '#f59e0b', label: 'En ruta' },
        { icon: '⛔', valor: buses.filter(b => b._docEstado.estado === 'bloqueado').length, color: '#ef4444', label: 'Bloqueados (SOAT)' },
    ];

    const busesVisibles = filtroEstadoBus === 'disponible' ? buses.filter(b => !b._enRuta && b._docEstado.estado !== 'bloqueado')
                        : filtroEstadoBus === 'en_ruta'    ? buses.filter(b => b._enRuta)
                        : filtroEstadoBus === 'bloqueado'  ? buses.filter(b => b._docEstado.estado === 'bloqueado')
                        : buses;

    return (
        <div ref={rootRef} style={{ display: 'flex', minHeight: '100vh', background: '#07111f', color: '#f1f5f9', fontFamily: "'Inter', system-ui, sans-serif" }}>

            {/* Sidebar */}
            <aside data-anim="sidebar" style={{
                width: 230, minHeight: '100vh', background: '#0b1628',
                borderRight: `1px solid ${tema.color}18`, padding: '1.5rem 1rem',
                display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: 0,
            }}>
                <div style={{ background: `${tema.color}15`, borderRadius: 10, padding: '0.8rem', border: `1px solid ${tema.color}25` }}>
                    <div style={{ fontSize: '1.5rem' }}>{sucursalInfo?.logoEmoji || '🏢'}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: tema.color }}>{sucursalInfo?.nombre || 'Admin'}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{deptNombre}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {[
                        { path: '/admin/dashboard',   icon: '🏠', label: 'Dashboard' },
                        { path: '/admin/sucursales',  icon: '🏢', label: 'Sucursales' },
                        { path: '/admin/rutas',       icon: '🛣️', label: 'Rutas' },
                        { path: '/admin/itinerarios', icon: '📅', label: 'Itinerarios' },
                        { path: '/admin/recursos',    icon: '📊', label: 'Disponibilidad', activo: true },
                        { path: '/admin/bus/nuevo',   icon: '🚌', label: 'Registrar Bus' },
                    ].map(item => (
                        <button key={item.path} onClick={() => navigate(item.path)} style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            background: item.activo ? `${tema.color}18` : 'transparent',
                            border: item.activo ? `1px solid ${tema.color}30` : '1px solid transparent',
                            color: item.activo ? tema.color : '#94a3b8',
                            borderRadius: 8, padding: '0.5rem 0.75rem', cursor: 'pointer',
                            fontSize: '0.83rem', fontWeight: item.activo ? 600 : 400, textAlign: 'left', width: '100%',
                        }}>
                            {item.icon} {item.label}
                        </button>
                    ))}
                </div>
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.68rem', color: '#475569', textAlign: 'center' }}>
                        Actualiza cada 10s{ultimaActualizacion ? ` · ${ultimaActualizacion.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}
                    </div>
                    <button onClick={() => { logout(); navigate('/login'); }} style={{
                        width: '100%', padding: '0.5rem', borderRadius: 8,
                        background: 'transparent', border: '1px solid #334155',
                        color: '#64748b', cursor: 'pointer', fontSize: '0.8rem',
                    }}>← Salir</button>
                </div>
            </aside>

            {/* Main */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div data-anim="header" style={{
                    padding: '1.25rem 2rem', borderBottom: `1px solid ${tema.color}18`,
                    background: '#0b1628', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>📊 Disponibilidad de Recursos</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Vista en tiempo real de flota y conductores · Polling 10s</div>
                    </div>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        fontSize: '0.75rem', color: ultimaActualizacion ? '#6ee7b7' : '#64748b',
                    }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: ultimaActualizacion ? '#10b981' : '#475569', display: 'inline-block' }} />
                        {ultimaActualizacion ? 'En vivo' : 'Cargando...'}
                    </div>
                </div>

                <div data-anim="content" style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* KPIs */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                        {kpis.map(k => (
                            <div key={k.label} style={{
                                background: '#0d1a2e', borderRadius: 12, padding: '1.25rem',
                                border: `1px solid ${k.color}22`, display: 'flex', flexDirection: 'column', gap: '0.3rem',
                            }}>
                                <div style={{ fontSize: '1.6rem' }}>{k.icon}</div>
                                <div style={{ fontSize: '2rem', color: k.color, fontWeight: 700 }}>{k.valor}</div>
                                <div style={{ color: '#64748b', fontSize: '0.78rem' }}>{k.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* ── Sección Flota ── */}
                    <div style={{ background: '#0d1a2e', borderRadius: 14, border: `1px solid ${tema.color}18`, overflow: 'hidden' }}>
                        <div style={{ padding: '1rem 1.5rem', borderBottom: `1px solid ${tema.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ fontWeight: 700 }}>🚌 Flota</div>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                {[['', 'Todos'], ['disponible', 'Disponibles'], ['en_ruta', 'En ruta'], ['bloqueado', 'Bloqueados']].map(([val, lab]) => (
                                    <button key={val} onClick={() => setFiltroEstadoBus(val)} style={{
                                        padding: '0.25rem 0.65rem', borderRadius: 999, fontSize: '0.72rem', cursor: 'pointer',
                                        background: filtroEstadoBus === val ? `${tema.color}22` : 'transparent',
                                        border: filtroEstadoBus === val ? `1px solid ${tema.color}` : '1px solid #334155',
                                        color: filtroEstadoBus === val ? tema.color : '#64748b',
                                    }}>{lab}</button>
                                ))}
                            </div>
                        </div>
                        {cargando ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>Cargando flota...</div>
                        ) : busesVisibles.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#475569' }}>Sin buses en esta categoría.</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ background: '#07111f' }}>
                                            {['Bus', 'Capacidad', 'SOAT / Inspección', 'Estado operacional'].map(h => (
                                                <th key={h} style={{ padding: '0.75rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {busesVisibles.map(b => (
                                            <tr key={b.id} style={{ borderBottom: '1px solid #0d1a2e' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#0f172a'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ padding: '0.75rem' }}>
                                                    <div style={{ fontWeight: 600 }}>{b.placa}</div>
                                                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{b.marca} {b.modelo}</div>
                                                </td>
                                                <td style={{ padding: '0.75rem', color: '#94a3b8' }}>{b.capacidad} asientos</td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                                        SOAT: {b.soat_vence || 'No registrado'}
                                                    </div>
                                                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                                        Insp: {b.inspeccion_vence || 'No registrada'}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    {b._enRuta ? (
                                                        <span style={{ background: 'rgba(245,158,11,0.15)', color: '#fde68a', padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600 }}>🛣️ En ruta</span>
                                                    ) : (
                                                        <BadgeEstadoDoc nivel={b._docEstado.estado} mensajes={b._docEstado.mensajes} />
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* ── Sección Conductores ── */}
                    <div style={{ background: '#0d1a2e', borderRadius: 14, border: `1px solid ${tema.color}18`, overflow: 'hidden' }}>
                        <div style={{ padding: '1rem 1.5rem', borderBottom: `1px solid ${tema.color}18`, fontWeight: 700 }}>👤 Conductores</div>
                        {cargando ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#475569' }}>Cargando conductores...</div>
                        ) : conductores.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#475569' }}>Sin conductores registrados.</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ background: '#07111f' }}>
                                            {['Conductor', 'Estado', 'Itinerario activo'].map(h => (
                                                <th key={h} style={{ padding: '0.75rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {conductores.map(c => {
                                            const itAsignado = itActivos.find(it => it.conductor_id === c.id || it.copiloto_id === c.id);
                                            const ocupado = !!itAsignado;
                                            return (
                                                <tr key={c.id} style={{ borderBottom: '1px solid #0d1a2e' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#0f172a'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                    <td style={{ padding: '0.75rem' }}>
                                                        <div style={{ fontWeight: 600 }}>{c.nombre_completo || c.nombre}</div>
                                                        {c.ci && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>CI: {c.ci}</div>}
                                                    </td>
                                                    <td style={{ padding: '0.75rem' }}>
                                                        <span style={{
                                                            padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600,
                                                            background: ocupado ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                                                            color: ocupado ? '#fde68a' : '#6ee7b7',
                                                        }}>{ocupado ? '🛣️ Ocupado' : '✅ Disponible'}</span>
                                                    </td>
                                                    <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                                                        {itAsignado ? (
                                                            <div>
                                                                {itAsignado.ruta?.origen || '?'} → {itAsignado.ruta?.destino || '?'}
                                                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Salida: {formatFecha(itAsignado.salida_programada)}</div>
                                                            </div>
                                                        ) : '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* ── Itinerarios activos ── */}
                    {itActivos.length > 0 && (
                        <div style={{ background: '#0d1a2e', borderRadius: 14, border: `1px solid ${tema.color}18`, overflow: 'hidden' }}>
                            <div style={{ padding: '1rem 1.5rem', borderBottom: `1px solid ${tema.color}18`, fontWeight: 700 }}>
                                📍 Itinerarios activos ({itActivos.length})
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                    <thead>
                                        <tr style={{ background: '#07111f' }}>
                                            {['Ruta', 'Bus', 'Salida programada', 'Estado'].map(h => (
                                                <th key={h} style={{ padding: '0.75rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {itActivos.map(it => (
                                            <tr key={it.id} style={{ borderBottom: '1px solid #0d1a2e' }}>
                                                <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                                                    {it.ruta?.origen || '?'} → {it.ruta?.destino || '?'}
                                                </td>
                                                <td style={{ padding: '0.75rem', color: '#94a3b8' }}>
                                                    {it.bus?.placa || it.bus_id?.slice(0, 8) || '—'}
                                                </td>
                                                <td style={{ padding: '0.75rem', color: '#94a3b8' }}>{formatFecha(it.salida_programada)}</td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    <span style={{
                                                        padding: '0.15rem 0.55rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600,
                                                        background: it.estado === 'en_ruta' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                                                        color: it.estado === 'en_ruta' ? '#6ee7b7' : '#93c5fd',
                                                    }}>{it.estado === 'en_ruta' ? 'En ruta' : 'Programado'}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DisponibilidadRecursos;
