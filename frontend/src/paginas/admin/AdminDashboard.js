import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import { getBusesSucursal, getViajesSucursal, getUsuariosSucursal } from '../../servicios/api';

const TABS = [
    { id: 'flota',    icon: '🚌', label: 'Flota' },
    { id: 'horarios', icon: '🕐', label: 'Viajes Hoy' },
    { id: 'usuarios', icon: '👥', label: 'Staff' },
];

const ROL_BADGE = {
    admin_sucursal: { bg: '#1e3a8a22', color: '#93c5fd', label: 'Admin' },
    cajero:         { bg: '#78350f22', color: '#fde68a', label: 'Cajero' },
    conductor:      { bg: '#064e3b22', color: '#6ee7b7', label: 'Conductor' },
};

const ESTADO_VIAJE = {
    programado:    { bg: '#1e3a8a22', color: '#93c5fd', label: 'Programado' },
    autorizado:    { bg: '#14532d22', color: '#86efac', label: 'Autorizado' },
    en_viaje:      { bg: '#78350f22', color: '#fde68a', label: 'En Ruta' },
    completado:    { bg: '#37415122', color: '#9ca3af', label: 'Completado' },
    cancelado:     { bg: '#7f1d1d22', color: '#fca5a5', label: 'Cancelado' },
    deshabilitado: { bg: '#37415122', color: '#64748b', label: 'Deshabilitado' },
};

const AdminDashboard = () => {
    const { perfil } = useAuth();

    const deptNombre = perfil?.departamento || 'La Paz';
    const tema = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];

    const [tab,      setTab]      = useState('flota');
    const [buses,    setBuses]    = useState([]);
    const [viajes,   setViajes]   = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);

    const cargarDatos = useCallback(async () => {
        if (!perfil?.sucursal_id) return;
        setCargando(true);
        const [b, v, u] = await Promise.all([
            getBusesSucursal(perfil.sucursal_id),
            getViajesSucursal(perfil.sucursal_id),
            getUsuariosSucursal(perfil.sucursal_id),
        ]);
        setBuses(b);
        setViajes(v);
        setUsuarios(u);
        setCargando(false);
    }, [perfil?.sucursal_id]);

    useEffect(() => { cargarDatos(); }, [cargarDatos]);

    const enRuta = viajes.filter(v => v.estado === 'en_viaje').length;

    const KPIS = [
        { label: 'Buses',      valor: buses.length,    color: tema.color,   icon: '🚌' },
        { label: 'Staff',      valor: usuarios.length,  color: '#10b981',    icon: '👥' },
        { label: 'Viajes hoy', valor: viajes.length,    color: '#f59e0b',    icon: '🛫' },
        { label: 'En ruta',    valor: enRuta,           color: '#8b5cf6',    icon: '🚀' },
    ];

    const badge = (estado) => {
        const c = ESTADO_VIAJE[estado] || ESTADO_VIAJE.programado;
        return (
            <span style={{ background: c.bg, color: c.color, padding: '0.15rem 0.55rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600 }}>
                {c.label}
            </span>
        );
    };

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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    {KPIS.map(kpi => (
                        <div key={kpi.label} style={{
                            background: '#0d1a2e', borderRadius: '12px', padding: '1.25rem',
                            border: `1px solid ${kpi.color}25`, textAlign: 'center',
                            boxShadow: `0 0 20px ${kpi.color}08`,
                        }}>
                            <div style={{ fontSize: '1.5rem' }}>{kpi.icon}</div>
                            <div style={{ fontSize: '2rem', color: kpi.color, fontWeight: 800, lineHeight: 1.1, marginTop: '0.25rem' }}>{kpi.valor}</div>
                            <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.2rem' }}>{kpi.label}</div>
                        </div>
                    ))}
                </div>

                {/* Tabs nav */}
                <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1.5rem' }}>
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
                                                        {bus.estado === 'en_viaje' ? 'En Ruta' : bus.estado === 'disponible' ? 'Disponible' : bus.estado}
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
            </div>
        </div>
    );
};

export default AdminDashboard;
