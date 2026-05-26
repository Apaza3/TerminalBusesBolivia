import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import {
    getBusesSucursal, getViajesSucursal, getUsuariosSucursal,
    getReservasSucursal, getViajesHistoricosSucursal,
} from '../../servicios/api';

const TABS = [
    { id: 'flota',     icon: '🚌', label: 'Flota'      },
    { id: 'horarios',  icon: '🕐', label: 'Viajes Hoy' },
    { id: 'usuarios',  icon: '👥', label: 'Staff'       },
    { id: 'historico', icon: '📁', label: 'Histórico'   },
];

const ROL_BADGE = {
    admin_sucursal: { bg: '#1e3a8a22', color: '#93c5fd', label: 'Admin'     },
    cajero:         { bg: '#78350f22', color: '#fde68a', label: 'Cajero'    },
    conductor:      { bg: '#064e3b22', color: '#6ee7b7', label: 'Conductor' },
};

const ESTADO_VIAJE = {
    programado:    { bg: '#1e3a8a22', color: '#93c5fd', label: 'Programado'    },
    autorizado:    { bg: '#14532d22', color: '#86efac', label: 'Autorizado'    },
    en_viaje:      { bg: '#78350f22', color: '#fde68a', label: 'En Ruta'       },
    completado:    { bg: '#37415122', color: '#9ca3af', label: 'Completado'    },
    cancelado:     { bg: '#7f1d1d22', color: '#fca5a5', label: 'Cancelado'     },
    deshabilitado: { bg: '#37415122', color: '#64748b', label: 'Deshabilitado' },
};

const FILTROS_HIST = [
    { val: 'todos',      label: 'Todos'       },
    { val: 'completado', label: 'Completados' },
    { val: 'en_viaje',   label: 'En Ruta'     },
    { val: 'cancelado',  label: 'Cancelados'  },
];

const AdminDashboard = () => {
    const { perfil } = useAuth();

    const deptNombre = perfil?.departamento || 'La Paz';
    const tema = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];

    const [tab,        setTab]        = useState('flota');
    const [buses,      setBuses]      = useState([]);
    const [viajes,     setViajes]     = useState([]);
    const [usuarios,   setUsuarios]   = useState([]);
    const [reservas,   setReservas]   = useState([]);
    const [historico,  setHistorico]  = useState([]);
    const [cargando,   setCargando]   = useState(true);
    const [filtroHist, setFiltroHist] = useState('todos');
    const [busqHist,   setBusqHist]   = useState('');

    const cargarDatos = useCallback(async () => {
        if (!perfil?.sucursal_id) return;
        setCargando(true);
        const [b, v, u, r, h] = await Promise.all([
            getBusesSucursal(perfil.sucursal_id),
            getViajesSucursal(perfil.sucursal_id),
            getUsuariosSucursal(perfil.sucursal_id),
            getReservasSucursal(perfil.sucursal_id),
            getViajesHistoricosSucursal(perfil.sucursal_id, 30),
        ]);
        setBuses(b);
        setViajes(v);
        setUsuarios(u);
        setReservas(r);
        setHistorico(h);
        setCargando(false);
    }, [perfil?.sucursal_id]);

    useEffect(() => {
        cargarDatos();
        const iv = setInterval(cargarDatos, 30000);
        return () => clearInterval(iv);
    }, [cargarDatos]);

    const enRuta        = viajes.filter(v => v.estado === 'en_viaje').length;
    const totalIngresos = reservas.reduce((acc, r) => acc + (r.precio || 0), 0);
    const totalBoletos  = reservas.reduce((acc, r) => acc + (r.asientos?.length || 0), 0);

    const KPIS = [
        { label: 'Buses',       valor: buses.length,    color: tema.color,   icon: '🚌' },
        { label: 'Staff',       valor: usuarios.length,  color: '#10b981',    icon: '👥' },
        { label: 'Viajes hoy',  valor: viajes.length,    color: '#f59e0b',    icon: '🛫' },
        { label: 'En ruta',     valor: enRuta,           color: '#8b5cf6',    icon: '🚀' },
        { label: 'Reservas',    valor: reservas.length,  color: '#06b6d4',    icon: '🎫' },
        { label: 'Ingresos',    valor: `Bs ${totalIngresos.toFixed(0)}`, color: '#22c55e', icon: '💰' },
        { label: 'Boletos',     valor: totalBoletos,     color: '#f472b6',    icon: '🏷️' },
    ];

    const badge = (estado) => {
        const c = ESTADO_VIAJE[estado] || ESTADO_VIAJE.programado;
        return (
            <span style={{ background: c.bg, color: c.color, padding: '0.15rem 0.55rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600 }}>
                {c.label}
            </span>
        );
    };

    const historicoFiltrado = historico.filter(v => {
        const matchEstado = filtroHist === 'todos' || v.estado === filtroHist;
        const q = busqHist.toLowerCase();
        const matchBusq = !q || v.origen?.toLowerCase().includes(q) || v.destino?.toLowerCase().includes(q) || v.buses?.placa?.toLowerCase().includes(q);
        return matchEstado && matchBusq;
    });

    const completados = historico.filter(v => v.estado === 'completado').length;
    const cancelados  = historico.filter(v => v.estado === 'cancelado').length;

    return (
        <div style={{ minHeight: '100vh', color: '#dde5f0', fontFamily: "'Inter', system-ui, sans-serif" }}>
            <div style={{ padding: '1.75rem 2rem' }}>

                {/* Título */}
                <div style={{ marginBottom: '1.75rem' }}>
                    <div style={{
                        fontSize: 'clamp(1.6rem,4vw,2.2rem)', fontWeight: 900,
                        letterSpacing: '-0.02em', lineHeight: 1,
                        background: `linear-gradient(90deg, ${tema.color}, ${tema.colorSecundario})`,
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        fontFamily: "'Rajdhani', system-ui, sans-serif",
                        textTransform: 'uppercase',
                    }}>
                        Dashboard
                    </div>
                    <div style={{ fontSize: '0.72rem', color: `${tema.acento}90`, marginTop: '0.3rem', letterSpacing: '0.12em', fontFamily: "'Rajdhani', system-ui, sans-serif", textTransform: 'uppercase' }}>
                        {perfil?.sucursal_nombre || 'Administración'} · {deptNombre}
                    </div>
                </div>

                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    {KPIS.map(kpi => (
                        <div key={kpi.label} style={{
                            background: '#0d1a2e', borderRadius: '12px', padding: '1.1rem',
                            border: `1px solid ${kpi.color}25`, textAlign: 'center',
                            boxShadow: `0 0 20px ${kpi.color}08`,
                        }}>
                            <div style={{ fontSize: '1.4rem' }}>{kpi.icon}</div>
                            <div style={{ fontSize: '1.75rem', color: kpi.color, fontWeight: 800, lineHeight: 1.1, marginTop: '0.2rem' }}>{kpi.valor}</div>
                            <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '0.15rem' }}>{kpi.label}</div>
                        </div>
                    ))}
                </div>

                {/* Tabs nav */}
                <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            padding: '0.5rem 1.1rem', borderRadius: '8px',
                            border: `1px solid ${tab === t.id ? tema.color + '50' : '#1e293b'}`,
                            cursor: 'pointer', fontSize: '0.85rem',
                            background: tab === t.id ? `${tema.color}18` : '#0d1a2e',
                            color: tab === t.id ? tema.acento : '#64748b',
                            fontWeight: tab === t.id ? 600 : 400,
                            transition: 'all 0.15s',
                        }}>
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                {cargando && (
                    <div style={{ textAlign: 'center', padding: '4rem', color: '#475569' }}>
                        Cargando datos de {perfil?.sucursal_nombre}...
                    </div>
                )}

                {/* ── Tab: Flota ── */}
                {!cargando && tab === 'flota' && (
                    <div style={{ background: '#0d1a2e', borderRadius: '14px', border: `1px solid ${tema.color}18`, overflow: 'hidden' }}>
                        <div style={{ padding: '1rem 1.5rem', borderBottom: `1px solid ${tema.color}15`, fontWeight: 700, color: '#f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>🚌 Flota — {perfil?.sucursal_nombre}</span>
                            <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 400 }}>{buses.length} unidades</span>
                        </div>
                        {buses.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>Sin buses registrados para esta empresa.</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
                                    <thead>
                                        <tr style={{ background: '#07111f', borderBottom: `1px solid ${tema.color}12` }}>
                                            {['Placa', 'Marca / Modelo', 'Pisos', 'Capacidad', 'Categoría', 'Estado'].map(h => (
                                                <th key={h} style={{ padding: '0.75rem 0.9rem', textAlign: 'left', color: '#475569', fontWeight: 500 }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {buses.map(bus => (
                                            <tr key={bus.id} style={{ borderBottom: '1px solid #07111f20' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#07111f40'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ padding: '0.75rem 0.9rem', fontWeight: 700, color: tema.acento, fontFamily: 'monospace' }}>{bus.placa}</td>
                                                <td style={{ padding: '0.75rem 0.9rem', color: '#94a3b8' }}>{[bus.marca, bus.modelo].filter(Boolean).join(' ') || '—'}</td>
                                                <td style={{ padding: '0.75rem 0.9rem', color: '#94a3b8' }}>{bus.pisos}</td>
                                                <td style={{ padding: '0.75rem 0.9rem', color: '#94a3b8' }}>{bus.capacidad}</td>
                                                <td style={{ padding: '0.75rem 0.9rem', color: '#94a3b8', textTransform: 'capitalize' }}>{bus.categoria || '—'}</td>
                                                <td style={{ padding: '0.75rem 0.9rem' }}>
                                                    <span style={{
                                                        background: bus.estado === 'disponible' ? '#14532d22' : bus.estado === 'en_viaje' ? '#78350f22' : '#37415122',
                                                        color: bus.estado === 'disponible' ? '#86efac' : bus.estado === 'en_viaje' ? '#fde68a' : '#9ca3af',
                                                        padding: '0.15rem 0.6rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600,
                                                    }}>
                                                        {bus.estado === 'en_viaje' ? 'En Ruta' : bus.estado === 'disponible' ? 'Disponible' : bus.estado || '—'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Tab: Viajes Hoy ── */}
                {!cargando && tab === 'horarios' && (
                    <div style={{ background: '#0d1a2e', borderRadius: '14px', border: `1px solid ${tema.color}18`, overflow: 'hidden' }}>
                        <div style={{ padding: '1rem 1.5rem', borderBottom: `1px solid ${tema.color}15`, fontWeight: 700, color: '#f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>🕐 Viajes de hoy</span>
                            <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 400 }}>{viajes.length} programados</span>
                        </div>
                        {viajes.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>Sin viajes programados para hoy en {perfil?.sucursal_nombre}.</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ background: '#07111f', borderBottom: `1px solid ${tema.color}12` }}>
                                            {['Origen', 'Destino', 'Salida', 'Duración', 'Precio', 'Estado'].map(h => (
                                                <th key={h} style={{ padding: '0.75rem 0.9rem', textAlign: 'left', color: '#475569', fontWeight: 500 }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {viajes.map(v => (
                                            <tr key={v.id} style={{ borderBottom: '1px solid #07111f20' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#07111f40'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ padding: '0.65rem 0.9rem', color: '#f1f5f9', fontWeight: 500 }}>{v.origen}</td>
                                                <td style={{ padding: '0.65rem 0.9rem', color: '#f1f5f9' }}>{v.destino}</td>
                                                <td style={{ padding: '0.65rem 0.9rem', color: tema.acento, whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                                                    {new Date(v.fecha_salida).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td style={{ padding: '0.65rem 0.9rem', color: '#64748b' }}>{v.duracion_estimada || '—'}</td>
                                                <td style={{ padding: '0.65rem 0.9rem', color: '#10b981', fontWeight: 600 }}>Bs {v.precio}</td>
                                                <td style={{ padding: '0.65rem 0.9rem' }}>{badge(v.estado)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Tab: Staff ── */}
                {!cargando && tab === 'usuarios' && (
                    <div style={{ background: '#0d1a2e', borderRadius: '14px', border: `1px solid ${tema.color}18`, overflow: 'hidden' }}>
                        <div style={{ padding: '1rem 1.5rem', borderBottom: `1px solid ${tema.color}15`, fontWeight: 700, color: '#f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>👥 Staff — {perfil?.sucursal_nombre}</span>
                            <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 400 }}>{usuarios.length} usuarios</span>
                        </div>
                        {usuarios.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>Sin usuarios staff registrados.</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                                    <thead>
                                        <tr style={{ background: '#07111f', borderBottom: `1px solid ${tema.color}12` }}>
                                            {['Nombre', 'Correo', 'Rol', 'CI', 'Estado'].map(h => (
                                                <th key={h} style={{ padding: '0.75rem 0.9rem', textAlign: 'left', color: '#475569', fontWeight: 500 }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usuarios.map(u => {
                                            const rb = ROL_BADGE[u.rol] || ROL_BADGE.admin_sucursal;
                                            return (
                                                <tr key={u.id} style={{ borderBottom: '1px solid #07111f20' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#07111f40'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                    <td style={{ padding: '0.7rem 0.9rem', fontWeight: 500, color: '#f1f5f9' }}>{u.nombre_completo}</td>
                                                    <td style={{ padding: '0.7rem 0.9rem', color: '#64748b', fontSize: '0.78rem' }}>{u.email}</td>
                                                    <td style={{ padding: '0.7rem 0.9rem' }}>
                                                        <span style={{ background: rb.bg, color: rb.color, padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>{rb.label}</span>
                                                    </td>
                                                    <td style={{ padding: '0.7rem 0.9rem', color: '#64748b' }}>{u.ci || '—'}</td>
                                                    <td style={{ padding: '0.7rem 0.9rem' }}>
                                                        <span style={{ background: u.activo ? '#14532d22' : '#7f1d1d22', color: u.activo ? '#86efac' : '#fca5a5', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem' }}>
                                                            {u.activo ? 'Activo' : 'Inactivo'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Tab: Histórico ── */}
                {!cargando && tab === 'historico' && (
                    <div>
                        {/* Mini stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                            {[
                                { label: 'Viajes últimos 30d', valor: historico.length,  color: tema.color,  icon: '📅' },
                                { label: 'Completados',         valor: completados,         color: '#10b981',   icon: '✅' },
                                { label: 'Cancelados',          valor: cancelados,          color: '#ef4444',   icon: '❌' },
                            ].map(s => (
                                <div key={s.label} style={{ background: '#0d1a2e', borderRadius: '10px', padding: '1rem', border: `1px solid ${s.color}25`, textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.2rem' }}>{s.icon}</div>
                                    <div style={{ fontSize: '1.6rem', color: s.color, fontWeight: 800, lineHeight: 1.1 }}>{s.valor}</div>
                                    <div style={{ color: '#475569', fontSize: '0.7rem', marginTop: '0.1rem' }}>{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Filtros */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                                {FILTROS_HIST.map(f => (
                                    <button key={f.val} onClick={() => setFiltroHist(f.val)} style={{
                                        padding: '0.35rem 0.75rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                        background: filtroHist === f.val ? tema.color : '#0d1a2e',
                                        color: filtroHist === f.val ? '#fff' : '#64748b',
                                        fontSize: '0.78rem', fontWeight: filtroHist === f.val ? 700 : 400,
                                        outline: filtroHist === f.val ? 'none' : `1px solid #1e293b`,
                                        transition: 'all 0.15s',
                                    }}>{f.label}</button>
                                ))}
                            </div>
                            <input
                                type="text" placeholder="Buscar origen, destino o placa…"
                                value={busqHist} onChange={e => setBusqHist(e.target.value)}
                                style={{
                                    flex: 1, minWidth: 180, background: '#0d1a2e',
                                    border: `1px solid ${tema.color}30`, color: '#f1f5f9',
                                    padding: '0.35rem 0.75rem', borderRadius: '6px',
                                    fontSize: '0.82rem', outline: 'none',
                                }}
                            />
                        </div>

                        {/* Tabla */}
                        <div style={{ background: '#0d1a2e', borderRadius: '14px', border: `1px solid ${tema.color}18`, overflow: 'hidden' }}>
                            <div style={{ padding: '0.85rem 1.5rem', borderBottom: `1px solid ${tema.color}15`, fontWeight: 700, color: '#f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>📁 Viajes últimos 30 días</span>
                                <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 400 }}>{historicoFiltrado.length} registros</span>
                            </div>
                            {historicoFiltrado.length === 0 ? (
                                <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>Sin viajes en el período seleccionado.</div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                                        <thead>
                                            <tr style={{ background: '#07111f', borderBottom: `1px solid ${tema.color}12` }}>
                                                {['Origen', 'Destino', 'Fecha', 'Hora', 'Bus', 'Duración', 'Precio', 'Estado'].map(h => (
                                                    <th key={h} style={{ padding: '0.75rem 0.9rem', textAlign: 'left', color: '#475569', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {historicoFiltrado.map(v => {
                                                const d = new Date(v.fecha_salida);
                                                return (
                                                    <tr key={v.id} style={{ borderBottom: '1px solid #07111f20' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = '#07111f40'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                        <td style={{ padding: '0.6rem 0.9rem', color: '#f1f5f9', fontWeight: 500 }}>{v.origen}</td>
                                                        <td style={{ padding: '0.6rem 0.9rem', color: '#f1f5f9' }}>{v.destino}</td>
                                                        <td style={{ padding: '0.6rem 0.9rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                                            {d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })}
                                                        </td>
                                                        <td style={{ padding: '0.6rem 0.9rem', color: tema.acento, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                                                            {d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                        <td style={{ padding: '0.6rem 0.9rem', color: '#64748b', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                                                            {v.buses?.placa || '—'}
                                                        </td>
                                                        <td style={{ padding: '0.6rem 0.9rem', color: '#64748b' }}>{v.duracion_estimada || '—'}</td>
                                                        <td style={{ padding: '0.6rem 0.9rem', color: '#10b981', fontWeight: 600 }}>Bs {v.precio}</td>
                                                        <td style={{ padding: '0.6rem 0.9rem' }}>{badge(v.estado)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default AdminDashboard;
