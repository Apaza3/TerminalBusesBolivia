import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import { useToast } from '../../componentes/ToastNotifications';
import { obtenerTodosStaff, cambiarEstadoCuenta, registrarStaff } from '../../data/mockAuthDB';
import { obtenerReservas, obtenerVentas, obtenerEstadoViaje, VIAJES_CONDUCTOR_MOCK } from '../../data/mockStorage';
import { BUSES_MOCK } from '../../data/mockStaffDB';
import { SUCURSALES_MOCK, obtenerViajesSucursal } from '../../data/mockDiscoveryDB';
import gsap from 'gsap';

const ROL_COLORS = {
    admin_sucursal: { bg: '#1e3a8a22', color: '#93c5fd', label: 'Admin' },
    cajero:         { bg: '#78350f22', color: '#fde68a', label: 'Cajero' },
    conductor:      { bg: '#064e3b22', color: '#6ee7b7', label: 'Conductor' },
    cliente:        { bg: '#4c1d9522', color: '#c4b5fd', label: 'Cliente' },
};

const TABS = [
    { id: 'flota',     icon: '🚌', label: 'Flota' },
    { id: 'horarios',  icon: '🕐', label: 'Horarios' },
    { id: 'buses-disp',icon: '✅', label: 'Buses Disponibles' },
    { id: 'usuarios',  icon: '👥', label: 'Usuarios Staff' },
    { id: 'analitica', icon: '📊', label: 'Analítica' },
];

const ACCIONES = [
    { path: '/admin/bus/nuevo',          icon: '🚌', label: 'Registrar Bus' },
    { path: '/admin/tripulacion/nuevo',  icon: '🧍', label: 'Registrar Tripulación' },
    { path: '/admin/sucursales',         icon: '🏢', label: 'Sucursales' },
    { path: '/admin/rutas',              icon: '🛣️', label: 'Gestión Rutas' },
    { path: '/admin/itinerarios',        icon: '📅', label: 'Programación' },
    { path: '/admin/recursos',           icon: '📊', label: 'Disponibilidad' },
    { path: '/admin/monitor',            icon: '🛰️', label: 'Monitor Flota' },
];

const AdminDashboard = () => {
    const { perfil, logout } = useAuth();
    const { mostrar } = useToast();
    const navigate = useNavigate();
    const rootRef = useRef(null);

    const sucursalInfo = SUCURSALES_MOCK.find(s => s.id === perfil?.sucursal_id) || SUCURSALES_MOCK[0];
    const deptNombre = perfil?.departamento || sucursalInfo?.departamento || 'La Paz';
    const tema = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];

    const [tab, setTab] = useState('flota');
    const [stats, setStats] = useState({ buses: 0, conductores: 0, reservas: 0, ventas: 0 });
    const [buses, setBuses] = useState([]);
    const [viajesHorario, setViajesHorario] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [mostrarFormUsuario, setMostrarFormUsuario] = useState(false);
    const [formUsuario, setFormUsuario] = useState({ email: '', password: '', rol: 'cajero', nombre_completo: '', ci: '', telefono: '', departamento: 'La Paz' });
    const [mensajeUsuario, setMensajeUsuario] = useState(null);

    const cargarDatos = useCallback(() => {
        const busesArr = Object.values(BUSES_MOCK);
        const reservas = obtenerReservas();
        const ventas = obtenerVentas();
        const staff = obtenerTodosStaff();

        setStats({ buses: busesArr.length, conductores: staff.filter(u => u.rol === 'conductor').length, reservas: reservas.length, ventas: ventas.length });
        setBuses(busesArr);
        setUsuarios(staff);

        // Viajes para horario — todos los de todas las sucursales
        const todosViajes = SUCURSALES_MOCK.flatMap(s =>
            obtenerViajesSucursal(s.id).map(v => ({
                ...v,
                sucursalNombre: s.nombre,
                estado: obtenerEstadoViaje(v.id),
            }))
        );
        // Añadir viajes conductor mock
        const viajesCond = VIAJES_CONDUCTOR_MOCK.map(v => ({
            ...v,
            sucursalNombre: 'Trans Copacabana',
            estado: obtenerEstadoViaje(v.id),
            precio: 45,
        }));
        setViajesHorario([...viajesCond, ...todosViajes]);
    }, []);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-anim="header"]', { y: -30, opacity: 0, duration: 0.5, ease: 'power3.out' });
            gsap.from('[data-anim="sidebar"]', { x: -40, opacity: 0, duration: 0.55, ease: 'power3.out', delay: 0.08 });
            gsap.from('[data-anim="kpi"]', { y: 20, opacity: 0, duration: 0.45, stagger: 0.07, ease: 'power2.out', delay: 0.2 });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    useEffect(() => {
        gsap.from('[data-anim="content"]', { opacity: 0, y: 14, duration: 0.3, ease: 'power2.out' });
    }, [tab]);

    const handleLogout = async () => { await logout(); navigate('/'); };

    const handleToggleCuenta = (userId, activo) => {
        const res = cambiarEstadoCuenta(userId, !activo);
        if (res.exito) setUsuarios(obtenerTodosStaff());
        else mostrar(res.error, 'error');
    };

    const handleCrearUsuario = (e) => {
        e.preventDefault();
        setMensajeUsuario(null);
        const res = registrarStaff({ ...formUsuario, sucursal_id: perfil?.sucursal_id || 'demo-s1' });
        if (res.exito) {
            setMensajeUsuario({ tipo: 'ok', texto: 'Usuario creado.' });
            setMostrarFormUsuario(false);
            setFormUsuario({ email: '', password: '', rol: 'cajero', nombre_completo: '', ci: '', telefono: '', departamento: 'La Paz' });
            setUsuarios(obtenerTodosStaff());
        } else {
            setMensajeUsuario({ tipo: 'error', texto: res.error });
        }
    };

    const inputStyle = {
        width: '100%', boxSizing: 'border-box',
        background: '#07111f', border: `1px solid ${tema.color}30`,
        color: '#f1f5f9', padding: '0.6rem 0.9rem',
        borderRadius: '8px', fontSize: '0.85rem', outline: 'none',
    };

    const badgeEstado = (estado) => {
        const m = {
            programado:  { bg: '#1e3a8a22', color: '#93c5fd', label: 'Programado' },
            en_ruta:     { bg: '#065f4622', color: '#6ee7b7', label: 'En Ruta' },
            finalizado:  { bg: '#37415122', color: '#9ca3af', label: 'Finalizado' },
            cancelado:   { bg: '#7f1d1d22', color: '#fca5a5', label: 'Cancelado' },
        };
        const c = m[estado] || m.programado;
        return <span style={{ background: c.bg, color: c.color, padding: '0.15rem 0.55rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600 }}>{c.label}</span>;
    };

    return (
        <div ref={rootRef} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#07111f', color: '#dde5f0', fontFamily: "'Inter', system-ui, sans-serif" }}>

            {/* Header */}
            <header data-anim="header" style={{
                background: `linear-gradient(135deg, ${tema.bg} 0%, ${tema.colorSecundario}60 100%)`,
                borderBottom: `2px solid ${tema.color}50`,
                padding: '0.9rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                position: 'sticky', top: 0, zIndex: 20,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: 42, height: 42, borderRadius: '10px', background: `${tema.color}20`, border: `2px solid ${tema.color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>🏢</div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f1f5f9' }}>Terminal Dashboard</div>
                        <div style={{ fontSize: '0.72rem', color: tema.acento }}>
                            {sucursalInfo?.nombre} · <span style={{ color: tema.color }}>{deptNombre}</span>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', color: '#f1f5f9', fontWeight: 600 }}>{perfil?.nombre_completo || perfil?.email}</div>
                        <div style={{ fontSize: '0.7rem', color: tema.acento, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Administrador</div>
                    </div>
                    <button onClick={handleLogout} style={{
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                        color: '#94a3b8', padding: '0.4rem 0.9rem', borderRadius: '8px',
                        cursor: 'pointer', fontSize: '0.8rem',
                    }}>Salir</button>
                </div>
            </header>

            <div style={{ display: 'flex', flex: 1 }}>
                {/* Sidebar — permanente */}
                <aside data-anim="sidebar" style={{
                    width: 230, background: '#0b1628', borderRight: `1px solid ${tema.color}18`,
                    padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem',
                    position: 'sticky', top: 62, alignSelf: 'flex-start',
                    height: 'calc(100vh - 62px)', overflowY: 'auto',
                }}>
                    {/* Badge sucursal */}
                    <div style={{
                        background: `${tema.color}12`, border: `1px solid ${tema.color}35`,
                        borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1rem',
                    }}>
                        <div style={{ fontSize: '1.4rem', marginBottom: '0.2rem' }}>{sucursalInfo?.logoEmoji || '🏢'}</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: tema.acento }}>{sucursalInfo?.nombre}</div>
                        <div style={{ fontSize: '0.7rem', color: tema.color }}>{deptNombre}</div>
                    </div>

                    <div style={{ fontSize: '0.62rem', color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase', paddingLeft: '0.5rem', marginBottom: '0.2rem' }}>Vistas</div>
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            display: 'flex', alignItems: 'center', gap: '0.6rem',
                            padding: '0.6rem 0.85rem', borderRadius: '8px', border: 'none',
                            background: tab === t.id ? `${tema.color}18` : 'transparent',
                            color: tab === t.id ? tema.acento : '#64748b',
                            cursor: 'pointer', fontSize: '0.85rem', fontWeight: tab === t.id ? 600 : 400,
                            textAlign: 'left', transition: 'all 0.15s',
                            outline: tab === t.id ? `1px solid ${tema.color}40` : '1px solid transparent',
                        }}
                            onMouseEnter={e => { if (tab !== t.id) { e.currentTarget.style.background = `${tema.color}08`; e.currentTarget.style.color = '#94a3b8'; } }}
                            onMouseLeave={e => { if (tab !== t.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; } }}>
                            <span>{t.icon}</span><span>{t.label}</span>
                            {tab === t.id && <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: tema.color }} />}
                        </button>
                    ))}

                    <div style={{ height: 1, background: '#1e293b', margin: '0.5rem 0' }} />
                    <div style={{ fontSize: '0.62rem', color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase', paddingLeft: '0.5rem', marginBottom: '0.2rem' }}>Acciones Rápidas</div>

                    {ACCIONES.map(a => (
                        <button key={a.path} onClick={() => navigate(a.path)} style={{
                            display: 'flex', alignItems: 'center', gap: '0.6rem',
                            padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #1e293b',
                            background: 'transparent', color: '#64748b',
                            cursor: 'pointer', fontSize: '0.82rem', textAlign: 'left',
                            transition: 'all 0.15s',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.background = `${tema.color}10`; e.currentTarget.style.borderColor = `${tema.color}30`; e.currentTarget.style.color = '#94a3b8'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.color = '#64748b'; }}>
                            <span>{a.icon}</span><span>{a.label}</span>
                        </button>
                    ))}

                    <button onClick={() => navigate('/admin/analitica')} style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #1e293b',
                        background: 'transparent', color: '#64748b',
                        cursor: 'pointer', fontSize: '0.82rem', textAlign: 'left', transition: 'all 0.15s',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.background = `${tema.color}10`; e.currentTarget.style.borderColor = `${tema.color}30`; e.currentTarget.style.color = '#94a3b8'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.color = '#64748b'; }}>
                        <span>📈</span><span>Dashboard Analítico</span>
                    </button>

                    <div style={{ height: 1, background: '#1e293b', margin: '0.5rem 0' }} />
                    <button onClick={() => navigate('/')} style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        padding: '0.6rem 0.85rem', borderRadius: '8px', border: 'none',
                        background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: '0.8rem', textAlign: 'left',
                    }}>
                        <span>🏠</span><span>Inicio</span>
                    </button>
                </aside>

                {/* Main */}
                <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
                    {/* KPIs */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                        {[
                            { label: 'Buses', valor: stats.buses, color: tema.color, icon: '🚌' },
                            { label: 'Conductores', valor: stats.conductores, color: '#10b981', icon: '🧑‍✈️' },
                            { label: 'Reservas', valor: stats.reservas, color: '#f59e0b', icon: '🎫' },
                            { label: 'Ventas', valor: stats.ventas, color: '#8b5cf6', icon: '💰' },
                        ].map(kpi => (
                            <div key={kpi.label} data-anim="kpi" style={{
                                background: '#0d1a2e', borderRadius: '12px', padding: '1.25rem',
                                border: `1px solid ${kpi.color}22`, textAlign: 'center',
                                position: 'relative', overflow: 'hidden',
                            }}>
                                <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '3rem', opacity: 0.05 }}>{kpi.icon}</div>
                                <div style={{ fontSize: '1.6rem' }}>{kpi.icon}</div>
                                <div style={{ fontSize: '2rem', color: kpi.color, fontWeight: 700, lineHeight: 1.2 }}>{kpi.valor}</div>
                                <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.2rem' }}>{kpi.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* ── Tab: Flota ── */}
                    {tab === 'flota' && (
                        <div data-anim="content" style={{ background: '#0d1a2e', borderRadius: '14px', border: `1px solid ${tema.color}18`, overflow: 'hidden' }}>
                            <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${tema.color}18`, fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem' }}>
                                🚌 Flota Registrada
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
                                    <thead>
                                        <tr style={{ background: '#07111f', borderBottom: `1px solid ${tema.color}15` }}>
                                            {['Placa', 'Tipo', 'Pisos', 'Capacidad', 'Estado'].map(h => (
                                                <th key={h} style={{ padding: '0.8rem 0.75rem', textAlign: 'left', color: '#475569', fontWeight: 500 }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {buses.map(bus => (
                                            <tr key={bus.id} style={{ borderBottom: '1px solid #0d1a2e' }}>
                                                <td style={{ padding: '0.8rem 0.75rem', fontWeight: 600, color: '#f1f5f9' }}>{bus.placa}</td>
                                                <td style={{ padding: '0.8rem 0.75rem', color: '#94a3b8' }}>{bus.tipo}</td>
                                                <td style={{ padding: '0.8rem 0.75rem', color: '#94a3b8' }}>{bus.pisos}</td>
                                                <td style={{ padding: '0.8rem 0.75rem', color: '#94a3b8' }}>{bus.capacidad}</td>
                                                <td style={{ padding: '0.8rem 0.75rem' }}>
                                                    <span style={{ background: '#065f4620', color: '#34d399', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                                                        Disponible
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── Tab: Horarios ── */}
                    {tab === 'horarios' && (
                        <div data-anim="content">
                            <div style={{ background: '#0d1a2e', borderRadius: '14px', border: `1px solid ${tema.color}18`, overflow: 'hidden' }}>
                                <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${tema.color}18`, fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>🕐 Horario de Salidas</span>
                                    <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 400 }}>{viajesHorario.length} viajes programados</span>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ background: '#07111f', borderBottom: `1px solid ${tema.color}15` }}>
                                                {['Origen', 'Destino', 'Salida', 'Bus', 'Empresa', 'Precio', 'Estado'].map(h => (
                                                    <th key={h} style={{ padding: '0.75rem 0.75rem', textAlign: 'left', color: '#475569', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {viajesHorario.sort((a, b) => new Date(a.salida) - new Date(b.salida)).map(v => (
                                                <tr key={v.id} style={{ borderBottom: '1px solid #07111f' }}>
                                                    <td style={{ padding: '0.65rem 0.75rem', color: '#f1f5f9', fontWeight: 500 }}>{v.origen}</td>
                                                    <td style={{ padding: '0.65rem 0.75rem', color: '#f1f5f9' }}>{v.destino}</td>
                                                    <td style={{ padding: '0.65rem 0.75rem', color: tema.acento, whiteSpace: 'nowrap' }}>
                                                        {new Date(v.salida).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}
                                                    </td>
                                                    <td style={{ padding: '0.65rem 0.75rem', color: '#64748b', fontFamily: 'monospace' }}>{v.busPlaca || '—'}</td>
                                                    <td style={{ padding: '0.65rem 0.75rem', color: '#64748b', fontSize: '0.78rem' }}>{v.sucursalNombre}</td>
                                                    <td style={{ padding: '0.65rem 0.75rem', color: '#10b981', fontWeight: 600 }}>Bs {v.precio}</td>
                                                    <td style={{ padding: '0.65rem 0.75rem' }}>{badgeEstado(v.estado)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Tab: Buses Disponibles ── */}
                    {tab === 'buses-disp' && (
                        <div data-anim="content">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                                {buses.map(bus => {
                                    const viajesAsignados = viajesHorario.filter(v => v.busPlaca === bus.placa);
                                    const enRuta = viajesAsignados.some(v => v.estado === 'en_ruta');
                                    const programado = viajesAsignados.some(v => v.estado === 'programado');
                                    const estadoBus = enRuta ? 'en_ruta' : programado ? 'programado' : 'disponible';
                                    const coloresBus = {
                                        disponible: { bg: '#065f4620', color: '#6ee7b7', label: '✅ Disponible' },
                                        programado:  { bg: '#1e3a8a20', color: '#93c5fd', label: '📅 Programado' },
                                        en_ruta:     { bg: '#78350f20', color: '#fde68a', label: '🚌 En Ruta' },
                                    };
                                    const cb = coloresBus[estadoBus];
                                    return (
                                        <div key={bus.id} style={{
                                            background: '#0d1a2e', borderRadius: '12px', padding: '1.25rem',
                                            border: `1px solid ${enRuta ? '#d97706' : programado ? tema.color : '#10b981'}22`,
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                                <div>
                                                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '1rem', fontFamily: 'monospace' }}>{bus.placa}</div>
                                                    <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.1rem' }}>{bus.tipo} · {bus.pisos} piso(s) · {bus.capacidad} asientos</div>
                                                </div>
                                                <span style={{ background: cb.bg, color: cb.color, padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                    {cb.label}
                                                </span>
                                            </div>
                                            {viajesAsignados.length > 0 && (
                                                <div style={{ borderTop: '1px solid #1e293b', paddingTop: '0.75rem' }}>
                                                    <div style={{ fontSize: '0.7rem', color: '#475569', marginBottom: '0.4rem' }}>Viajes asignados:</div>
                                                    {viajesAsignados.slice(0, 2).map(v => (
                                                        <div key={v.id} style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                                                            {v.origen} → {v.destino} · {new Date(v.salida).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {buses.length === 0 && (
                                    <div style={{ color: '#475569', padding: '2rem', gridColumn: '1/-1', textAlign: 'center' }}>No hay buses registrados.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Tab: Usuarios Staff ── */}
                    {tab === 'usuarios' && (
                        <div data-anim="content" style={{ background: '#0d1a2e', borderRadius: '14px', border: `1px solid ${tema.color}18`, overflow: 'hidden' }}>
                            <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${tema.color}18`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem' }}>👥 Usuarios Staff</span>
                                <button onClick={() => setMostrarFormUsuario(!mostrarFormUsuario)} style={{
                                    background: tema.color, color: '#fff', border: 'none',
                                    borderRadius: '8px', padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                                }}>
                                    {mostrarFormUsuario ? '✕ Cancelar' : '+ Nuevo'}
                                </button>
                            </div>

                            {mensajeUsuario && (
                                <div style={{
                                    margin: '1rem 1.5rem', padding: '0.75rem 1rem', borderRadius: '8px',
                                    background: mensajeUsuario.tipo === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                    color: mensajeUsuario.tipo === 'ok' ? '#6ee7b7' : '#fca5a5',
                                    border: `1px solid ${mensajeUsuario.tipo === 'ok' ? '#065f46' : '#7f1d1d'}`,
                                    fontSize: '0.85rem',
                                }}>{mensajeUsuario.texto}</div>
                            )}

                            {mostrarFormUsuario && (
                                <form onSubmit={handleCrearUsuario} style={{
                                    margin: '1rem 1.5rem', background: '#07111f', borderRadius: '10px',
                                    padding: '1.25rem', border: '1px solid #1e293b',
                                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
                                }}>
                                    {[
                                        { key: 'nombre_completo', label: 'Nombre', type: 'text' },
                                        { key: 'email', label: 'Correo', type: 'email' },
                                        { key: 'password', label: 'Contraseña', type: 'password' },
                                        { key: 'ci', label: 'CI', type: 'text' },
                                        { key: 'telefono', label: 'Teléfono', type: 'text' },
                                    ].map(f => (
                                        <div key={f.key}>
                                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '0.3rem' }}>{f.label}</label>
                                            <input type={f.type} style={inputStyle} value={formUsuario[f.key]}
                                                onChange={e => setFormUsuario(p => ({ ...p, [f.key]: e.target.value }))}
                                                required={['nombre_completo', 'email', 'password'].includes(f.key)} />
                                        </div>
                                    ))}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '0.3rem' }}>Rol</label>
                                        <select style={inputStyle} value={formUsuario.rol} onChange={e => setFormUsuario(p => ({ ...p, rol: e.target.value }))}>
                                            <option value="cajero">Cajero</option>
                                            <option value="conductor">Conductor</option>
                                            <option value="admin_sucursal">Admin</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '0.3rem' }}>Departamento</label>
                                        <select style={inputStyle} value={formUsuario.departamento} onChange={e => setFormUsuario(p => ({ ...p, departamento: e.target.value }))}>
                                            {Object.keys(DEPARTAMENTOS).map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ gridColumn: '1/-1' }}>
                                        <button type="submit" style={{ width: '100%', background: tema.color, color: '#fff', border: 'none', borderRadius: '8px', padding: '0.75rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}>
                                            Crear Usuario
                                        </button>
                                    </div>
                                </form>
                            )}

                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                                    <thead>
                                        <tr style={{ background: '#07111f', borderBottom: `1px solid ${tema.color}12` }}>
                                            {['Nombre', 'Correo', 'Rol', 'Dpto.', 'Estado', 'Acción'].map(h => (
                                                <th key={h} style={{ padding: '0.75rem 0.75rem', textAlign: 'left', color: '#475569', fontWeight: 500 }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usuarios.map(u => {
                                            const rc = ROL_COLORS[u.rol] || ROL_COLORS.cliente;
                                            return (
                                                <tr key={u.id} style={{ borderBottom: '1px solid #07111f' }}>
                                                    <td style={{ padding: '0.7rem 0.75rem', fontWeight: 500, color: '#f1f5f9' }}>{u.nombre_completo}</td>
                                                    <td style={{ padding: '0.7rem 0.75rem', color: '#64748b', fontSize: '0.8rem' }}>{u.email}</td>
                                                    <td style={{ padding: '0.7rem 0.75rem' }}>
                                                        <span style={{ background: rc.bg, color: rc.color, padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>{rc.label}</span>
                                                    </td>
                                                    <td style={{ padding: '0.7rem 0.75rem', color: '#64748b', fontSize: '0.78rem' }}>{u.departamento || '—'}</td>
                                                    <td style={{ padding: '0.7rem 0.75rem' }}>
                                                        <span style={{ background: u.activo ? '#065f4620' : '#7f1d1d20', color: u.activo ? '#34d399' : '#fca5a5', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem' }}>
                                                            {u.activo ? 'Activo' : 'Suspendido'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '0.7rem 0.75rem' }}>
                                                        {u.id !== 'staff-001' && (
                                                            <button onClick={() => handleToggleCuenta(u.id, u.activo)} style={{
                                                                background: u.activo ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                                                                border: u.activo ? '1px solid #7f1d1d' : '1px solid #065f46',
                                                                color: u.activo ? '#fca5a5' : '#6ee7b7',
                                                                borderRadius: '6px', padding: '0.2rem 0.6rem', cursor: 'pointer', fontSize: '0.72rem',
                                                            }}>
                                                                {u.activo ? 'Suspender' : 'Activar'}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── Tab: Analítica (redirect) ── */}
                    {tab === 'analitica' && (
                        <div data-anim="content" style={{ textAlign: 'center', padding: '3rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                            <div style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: '0.5rem' }}>Dashboard Analítico</div>
                            <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Abre el módulo completo de análisis.</div>
                            <button onClick={() => navigate('/admin/analitica')} style={{
                                background: tema.color, color: '#fff', border: 'none', borderRadius: '10px',
                                padding: '0.75rem 2rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
                            }}>Ir a Analítica →</button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;
