import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import FragmentoDept from '../../componentes/FragmentoDept';
import { obtenerNotificaciones, marcarTodasLeidas } from '../../data/mockStorage';

const FONDOS_DEPT = {
    'La Paz': '/fondos/La_Paz.webp',
    'Oruro': '/fondos/Oruro.webp',
    'Potosí': '/fondos/Potosi.webp',
    'Cochabamba': '/fondos/Cochabamba.webp',
    'Chuquisaca': '/fondos/Chuquisaca.webp',
    'Tarija': '/fondos/Tarija.webp',
    'Santa Cruz': '/fondos/Santa_Cruz.webp',
    'Beni': '/fondos/Beni.webp',
    'Pando': '/fondos/Pando.webp',
};

const ICONOS_EMPRESAS = {
    andino: '/iconos/andino.svg',
    atlas: '/iconos/atlas.svg',
    bolivar: '/iconos/bolivar.svg',
    copacabana: '/iconos/copacabana.svg',
    cosmos: '/iconos/cosmos.svg',
    dorado: '/iconos/dorado.svg',
    emperador: '/iconos/emperador.svg',
    illimani: '/iconos/illimani.svg',
    imperal: '/iconos/imperal.svg',
    naser: '/iconos/naser.svg',
};

const getIconoEmpresa = (nombre) => {
    if (!nombre) return null;
    const n = nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const clave = Object.keys(ICONOS_EMPRESAS).find(k => n.includes(k));
    return clave ? ICONOS_EMPRESAS[clave] : null;
};

const NAV = [
    { path: '/admin/dashboard', icon: '🏠', label: 'Dashboard', grupo: 'vistas' },
    { path: '/admin/analitica', icon: '📊', label: 'Analítica', grupo: 'vistas' },
    { path: '/admin/rendimiento-rutas', icon: '🛣️', label: 'Rendimiento Rutas', grupo: 'vistas' },
    { path: '/admin/ranking-empresas', icon: '🏆', label: 'Ranking Empresas', grupo: 'vistas' },
    { path: '/admin/manifiesto', icon: '📋', label: 'Manifiesto PDF', grupo: 'vistas' },
    { path: '/admin/incidentes', icon: '⚠️', label: 'Incidentes', grupo: 'operaciones' },
    { path: '/admin/pasajeros', icon: '🧑‍✈️', label: 'Pasajeros', grupo: 'operaciones' },
    { path: '/admin/bus/nuevo', icon: '🚌', label: 'Registrar Bus', grupo: 'acciones' },
    { path: '/admin/tripulacion/nuevo', icon: '🧍', label: 'Registrar Tripulación', grupo: 'acciones' },
];

const AdminLayout = () => {
    const { perfil, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const deptNombre = perfil?.departamento || 'La Paz';
    const tema = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];

    const isActive = (path) =>
        location.pathname === path ||
        (path !== '/admin/dashboard' && location.pathname.startsWith(path));

    const btn = (active) => ({
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        padding: '0.55rem 0.85rem', borderRadius: '8px',
        border: active ? `1px solid ${tema.color}50` : '1px solid transparent',
        cursor: 'pointer', fontSize: '0.82rem', textAlign: 'left', width: '100%',
        transition: 'all 0.15s',
        background: active ? `linear-gradient(90deg, ${tema.color}28, ${tema.colorSecundario}15)` : 'transparent',
        color: active ? tema.acento : `${tema.acento}55`,
        fontWeight: active ? 700 : 500,
        fontFamily: "'Rajdhani', system-ui, sans-serif",
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
    });

    const [horaActual, setHoraActual] = useState(new Date());
    useEffect(() => {
        const iv = setInterval(() => setHoraActual(new Date()), 1000);
        return () => clearInterval(iv);
    }, []);

    const handleLogout = async () => { await logout(); navigate('/'); };

    const [notifCount, setNotifCount] = useState(0);
    useEffect(() => {
        const leer = () => {
            const noLeidas = obtenerNotificaciones({ para: 'admin', sucursalId: perfil?.sucursal_id, soloNoLeidas: true });
            setNotifCount(noLeidas.length);
        };
        leer();
        const t = setInterval(leer, 15000);
        return () => clearInterval(t);
    }, [perfil?.sucursal_id]);

    const marcarLeidas = () => {
        marcarTodasLeidas({ para: 'admin', sucursalId: perfil?.sucursal_id });
        setNotifCount(0);
    };

    const vistas = NAV.filter(n => n.grupo === 'vistas');
    const operaciones = NAV.filter(n => n.grupo === 'operaciones');
    const acciones = NAV.filter(n => n.grupo === 'acciones');

    const fondoUrl = FONDOS_DEPT[deptNombre] || FONDOS_DEPT['La Paz'];

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden',
            position: 'relative',
            background: tema.bg,
            color: '#f0ece8', fontFamily: "'Inter', system-ui, sans-serif",
        }}>
            {/* Fondo encogido + difuminado: colores visibles, sin detalles */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
                backgroundImage: `url(${fondoUrl})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
                transform: 'scale(0.99)',
                filter: 'blur(9px) saturate(0.75)',
            }} />
            {/* Overlay oscuro — apaga sin borrar los tonos */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
                background: 'rgba(8, 12, 24, 0.68)',
            }} />

            {/* ── Barra superior — borde a borde ────────────────────── */}
            <header style={{
                position: 'relative', zIndex: 10, flexShrink: 0,
                background: 'rgba(15, 23, 42, 0.72)',
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                borderBottom: `1px solid ${tema.color}35`,
                padding: '0.75rem 1.75rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
            }}>
                {/* Izquierda: dept visual + título */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', minWidth: 0 }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: '12px', flexShrink: 0,
                        background: `${tema.color}12`, border: `2px solid ${tema.color}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden', padding: '3px',
                    }}>
                        <FragmentoDept deptNombre={deptNombre} color={tema.color} size={44} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f1f5f9', letterSpacing: '-0.01em' }}>
                            {deptNombre}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: tema.acento, marginTop: '0.05rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                            Panel de Administración
                        </div>
                    </div>
                </div>

                {/* Centro: reloj */}
                <div style={{
                    background: tema.bg, border: `1px solid ${tema.color}35`,
                    borderRadius: '10px', padding: '0.4rem 1rem', textAlign: 'center', flexShrink: 0,
                }}>
                    <div style={{ fontFamily: "'Courier New', monospace", fontSize: '1.3rem', fontWeight: 700, color: tema.acento, letterSpacing: '0.04em', lineHeight: 1 }}>
                        {horaActual.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                    </div>
                    <div style={{ fontSize: '0.58rem', color: '#475569', marginTop: '0.1rem' }}>
                        {horaActual.toLocaleDateString('es-BO', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </div>
                </div>

                {/* Derecha: cuenta + acciones */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.82rem', color: '#f1f5f9', fontWeight: 600, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {perfil?.nombre_completo || perfil?.email}
                        </div>
                        <div style={{ fontSize: '0.62rem', color: tema.acento, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Admin</div>
                    </div>
                    <div style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: `${tema.color}25`, border: `2px solid ${tema.color}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.95rem', fontWeight: 700, color: tema.acento, flexShrink: 0,
                    }}>
                        {(perfil?.nombre_completo || perfil?.email || 'A').charAt(0).toUpperCase()}
                    </div>
                    <button onClick={() => navigate('/')} style={{
                        background: `${tema.color}12`, border: `1px solid ${tema.color}35`,
                        color: tema.acento, padding: '0.4rem 0.8rem', borderRadius: '8px',
                        cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap',
                    }}
                        onMouseEnter={e => e.currentTarget.style.background = `${tema.color}25`}
                        onMouseLeave={e => e.currentTarget.style.background = `${tema.color}12`}>
                        🏠 Inicio
                    </button>
                    <button onClick={handleLogout} style={{
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                        color: '#94a3b8', padding: '0.4rem 0.85rem', borderRadius: '8px',
                        cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500, whiteSpace: 'nowrap',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#fca5a5'; e.currentTarget.style.borderColor = '#ef444440'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}>
                        Salir
                    </button>
                </div>
            </header>

            {/* ── Fila: sidebar + contenido ─────────────────────────── */}
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* Sidebar */}
                <aside style={{
                    width: 224, flexShrink: 0,
                    background: 'rgba(10, 15, 25, 0.72)',
                    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                    borderRight: `1px solid ${tema.bandera1}30`,
                    padding: '1.25rem 0.9rem',
                    display: 'flex', flexDirection: 'column', gap: '0.3rem',
                    overflowY: 'auto',
                }}>
                    {/* Empresa badge */}
                    <div style={{
                        marginBottom: '0.85rem',
                        borderRadius: '10px',
                        border: `1px solid ${tema.bandera1}33`,
                        background: `linear-gradient(180deg, ${tema.bandera1}10, ${tema.bandera2}08)`,
                        overflow: 'hidden',
                        width: '100%',
                    }}>
                        {getIconoEmpresa(perfil?.sucursal_nombre)
                            ? <img
                                src={getIconoEmpresa(perfil?.sucursal_nombre)}
                                alt={perfil?.sucursal_nombre}
                                style={{ width: '100%', height: 'auto', display: 'block' }}
                              />
                            : <div style={{
                                height: '160px',
                                background: `linear-gradient(135deg, ${tema.bandera1}55, ${tema.bandera2}38)`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '4rem',
                            }}>{perfil?.sucursal_logo || '🏢'}</div>
                        }
                        <div style={{
                            padding: '0.5rem 0.75rem 0.6rem',
                            background: 'rgba(0,0,0,0.75)',
                            borderTop: `1px solid ${tema.bandera1}22`,
                        }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: tema.acento, lineHeight: 1.2, fontFamily: "'Rajdhani', system-ui, sans-serif", textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                {perfil?.sucursal_nombre || 'Admin'}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: `${tema.acento}66`, marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {perfil?.nombre_completo || perfil?.email}
                            </div>
                        </div>
                    </div>

                    {/* Vistas */}
                    <div style={{ fontSize: '0.62rem', color: `${tema.color}99`, letterSpacing: '0.12em', textTransform: 'uppercase', paddingLeft: '0.5rem', marginBottom: '0.2rem', fontFamily: "'Rajdhani', system-ui, sans-serif", fontWeight: 700 }}>
                        Vistas
                    </div>
                    {vistas.map(item => {
                        const active = isActive(item.path);
                        return (
                            <button key={item.path} onClick={() => navigate(item.path)} style={btn(active)}
                                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = `${tema.color}08`; e.currentTarget.style.color = '#94a3b8'; } }}
                                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; } }}>
                                <span>{item.icon}</span>
                                <span>{item.label}</span>
                                {active && <span style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: tema.color, flexShrink: 0 }} />}
                            </button>
                        );
                    })}

                    <div style={{ height: 1, background: `${tema.color}15`, margin: '0.5rem 0' }} />

                    {/* Operaciones */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', paddingLeft: '0.5rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.62rem', color: `${tema.color}99`, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'Rajdhani', system-ui, sans-serif", fontWeight: 700 }}>Operaciones</span>
                        {notifCount > 0 && (
                            <span onClick={marcarLeidas} title="Marcar notificaciones leídas" style={{
                                background: '#ef4444', color: '#fff', borderRadius: 10,
                                fontSize: '0.6rem', fontWeight: 700, padding: '0 5px', lineHeight: '16px',
                                cursor: 'pointer', userSelect: 'none',
                            }}>{notifCount}</span>
                        )}
                    </div>
                    {operaciones.map(item => {
                        const active = isActive(item.path);
                        const isIncidentes = item.path === '/admin/incidentes';
                        return (
                            <button key={item.path} onClick={() => navigate(item.path)} style={btn(active)}
                                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = `${tema.color}08`; e.currentTarget.style.color = '#94a3b8'; } }}
                                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; } }}>
                                <span>{item.icon}</span>
                                <span>{item.label}</span>
                                {isIncidentes && notifCount > 0 && (
                                    <span style={{
                                        marginLeft: 'auto', background: '#ef4444', color: '#fff',
                                        borderRadius: 10, fontSize: '0.6rem', fontWeight: 700,
                                        padding: '0 5px', lineHeight: '16px', flexShrink: 0,
                                    }}>{notifCount}</span>
                                )}
                                {active && !isIncidentes && <span style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: tema.color, flexShrink: 0 }} />}
                            </button>
                        );
                    })}

                    <div style={{ height: 1, background: `${tema.color}15`, margin: '0.5rem 0' }} />

                    {/* Acciones */}
                    <div style={{ fontSize: '0.62rem', color: `${tema.color}99`, letterSpacing: '0.12em', textTransform: 'uppercase', paddingLeft: '0.5rem', marginBottom: '0.2rem', fontFamily: "'Rajdhani', system-ui, sans-serif", fontWeight: 700 }}>
                        Acciones
                    </div>
                    {acciones.map(item => {
                        const active = isActive(item.path);
                        return (
                            <button key={item.path} onClick={() => navigate(item.path)} style={btn(active)}
                                onMouseEnter={e => { e.currentTarget.style.background = `${tema.color}08`; e.currentTarget.style.color = '#94a3b8'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = active ? `${tema.color}18` : 'transparent'; e.currentTarget.style.color = active ? tema.acento : '#64748b'; }}>
                                <span>{item.icon}</span>
                                <span>{item.label}</span>
                            </button>
                        );
                    })}

                    <div style={{ flex: 1 }} />
                </aside>

                {/* Contenido — scroll independiente */}
                <div style={{ flex: 1, overflowY: 'auto', background: 'transparent' }}>
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default AdminLayout;
