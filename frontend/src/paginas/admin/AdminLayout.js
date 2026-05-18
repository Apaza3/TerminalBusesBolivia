import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import RelojDigital from '../../componentes/RelojDigital';

const NAV = [
    { path: '/admin/dashboard',         icon: '🏠', label: 'Dashboard',           grupo: 'vistas' },
    { path: '/admin/analitica',         icon: '📊', label: 'Analítica',           grupo: 'vistas' },
    { path: '/admin/rendimiento-rutas', icon: '🛣️', label: 'Rendimiento Rutas',   grupo: 'vistas' },
    { path: '/admin/ranking-empresas',  icon: '🏆', label: 'Ranking Empresas',    grupo: 'vistas' },
    { path: '/admin/manifiesto',        icon: '📋', label: 'Manifiesto PDF',      grupo: 'vistas' },
    { path: '/admin/bus/nuevo',         icon: '🚌', label: 'Registrar Bus',       grupo: 'acciones' },
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
        border: active ? `1px solid ${tema.color}35` : '1px solid transparent',
        cursor: 'pointer', fontSize: '0.84rem', textAlign: 'left', width: '100%',
        transition: 'all 0.15s',
        background: active ? `${tema.color}18` : 'transparent',
        color: active ? tema.acento : '#64748b',
        fontWeight: active ? 600 : 400,
    });

    const vistas   = NAV.filter(n => n.grupo === 'vistas');
    const acciones = NAV.filter(n => n.grupo === 'acciones');

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#07111f', color: '#dde5f0', fontFamily: "'Inter', system-ui, sans-serif" }}>

            {/* ── Sidebar fijo ──────────────────────────────────── */}
            <aside style={{
                width: 224, background: `linear-gradient(180deg, #0b1628 0%, #07111f 100%)`,
                borderRight: `1px solid ${tema.color}20`,
                padding: '1.25rem 0.9rem',
                position: 'fixed', top: 0, left: 0, bottom: 0,
                display: 'flex', flexDirection: 'column', gap: '0.3rem',
                overflowY: 'auto', zIndex: 40,
            }}>
                {/* Empresa badge */}
                <div style={{
                    padding: '0.85rem 0.75rem 1rem',
                    borderBottom: `1px solid ${tema.color}25`,
                    marginBottom: '0.85rem',
                    background: `${tema.color}08`,
                    borderRadius: '10px',
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>
                        {perfil?.sucursal_logo || '🏢'}
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: tema.acento, lineHeight: 1.2 }}>
                        {perfil?.sucursal_nombre || 'Admin'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: tema.color, marginTop: '0.2rem' }}>{deptNombre}</div>
                    <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {perfil?.nombre_completo || perfil?.email}
                    </div>
                </div>

                {/* Reloj */}
                <div style={{ padding: '0.4rem 0.75rem 0.75rem', borderBottom: `1px solid ${tema.color}15`, marginBottom: '0.5rem' }}>
                    <RelojDigital size="normal" />
                </div>

                {/* Vistas */}
                <div style={{ fontSize: '0.6rem', color: '#334155', letterSpacing: '0.1em', textTransform: 'uppercase', paddingLeft: '0.5rem', marginBottom: '0.2rem' }}>
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

                {/* Acciones */}
                <div style={{ fontSize: '0.6rem', color: '#334155', letterSpacing: '0.1em', textTransform: 'uppercase', paddingLeft: '0.5rem', marginBottom: '0.2rem' }}>
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

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                <div style={{ height: 1, background: '#1e293b', margin: '0.25rem 0' }} />
                <button onClick={() => navigate('/')} style={btn(false)}
                    onMouseEnter={e => { e.currentTarget.style.color = '#94a3b8'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; }}>
                    <span>🏠</span><span>Inicio</span>
                </button>
                <button onClick={async () => { await logout(); navigate('/'); }} style={btn(false)}
                    onMouseEnter={e => { e.currentTarget.style.color = '#fca5a5'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; }}>
                    <span>🚪</span><span>Salir</span>
                </button>
            </aside>

            {/* ── Área de contenido ─────────────────────────────── */}
            <div style={{
                flex: 1, marginLeft: 224,
                display: 'flex', flexDirection: 'column',
                minHeight: '100vh',
                background: `linear-gradient(160deg, ${tema.bg}30 0%, #07111f 35%)`,
            }}>
                <Outlet />
            </div>
        </div>
    );
};

export default AdminLayout;
