import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDepartamento, DEPARTAMENTOS } from '../contextos/DepartamentoContext';
import { useAuth } from '../contextos/AuthContext';
import { obtenerNotificaciones, marcarNotificacionLeida, marcarTodasLeidas } from '../data/mockStorage';
import RelojDigital from './RelojDigital';
import PerfilIndicador from './PerfilIndicador';

const PANEL_POR_ROL = {
    admin_sucursal: { ruta: '/admin/dashboard', label: 'Panel Admin', icono: '🛠️' },
    cajero:         { ruta: '/cajero/panel',    label: 'Panel Cajero', icono: '🎫' },
    conductor:      { ruta: '/conductor/panel', label: 'Panel Conductor', icono: '🚌' },
};

const NAV_LINKS = [
    { id: 'explorar',     label: 'Empresas'     },
    { id: 'nosotros',     label: 'Nosotros'     },
    { id: 'permisos',     label: 'Permisos'     },
    { id: 'emergencias',  label: 'Emergencias'  },
];

const CSS = `
@media (max-width: 640px) {
    .ng-desktop { display: none !important; }
    .ng-hamburger { display: flex !important; }
    .ng-logo {
        width: 2.6rem !important;
        height: 2.6rem !important;
        margin-top: 0 !important;
        border-width: 2px !important;
    }
}
`;

let _injected = false;
function injectCSS() {
    if (_injected || typeof document === 'undefined') return;
    _injected = true;
    const el = document.createElement('style');
    el.setAttribute('data-ng', '1');
    el.textContent = CSS;
    document.head.appendChild(el);
}

const NavbarGlobal = ({ onScrollTo }) => {
    injectCSS();
    const navigate = useNavigate();
    const { tema, departamento } = useDepartamento();
    const { perfil } = useAuth();

    const c1 = tema.color;
    const c2 = tema.colorSecundario;
    const bg = tema.bg;
    const ac = tema.acento;

    const [menuMovil, setMenuMovil] = useState(false);
    const [bellAbierta, setBellAbierta] = useState(false);
    const [notifs, setNotifs] = useState([]);
    const bellRef = useRef(null);

    const esCliente = perfil?.rol === 'cliente' && perfil?.ci;

    const cargarNotifs = useCallback(() => {
        if (!esCliente) return;
        const all = obtenerNotificaciones({ para: 'cliente', clienteCI: perfil?.ci });
        setNotifs(all.slice(0, 20));
    }, [esCliente, perfil?.ci]);

    useEffect(() => {
        if (!esCliente) return;
        cargarNotifs();
        const t = setInterval(cargarNotifs, 15000);
        return () => clearInterval(t);
    }, [esCliente, cargarNotifs]);

    useEffect(() => {
        const h = (e) => { if (bellRef.current && !bellRef.current.contains(e.target)) setBellAbierta(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const noLeidas = notifs.filter(n => !n.leido).length;
    const handleMarcarLeida = (id) => { marcarNotificacionLeida(id); cargarNotifs(); };
    const handleMarcarTodas = () => { marcarTodasLeidas({ para: 'cliente', clienteCI: perfil?.ci }); cargarNotifs(); };

    const handleLink = (id) => {
        setMenuMovil(false);
        if (onScrollTo) { onScrollTo(id); }
        else { navigate('/'); }
    };

    const navLinkStyle = {
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: '0.88rem', color: '#e2e8f0', fontWeight: 700,
        padding: '0.35rem 0.75rem', borderRadius: 8, transition: 'all 0.15s',
        textTransform: 'uppercase', letterSpacing: '0.1em',
        fontFamily: "'Inter', 'Rajdhani', system-ui, sans-serif",
    };

    return (
        <>
            <nav style={{
                background: `${bg}f2`,
                borderBottom: `1px solid ${c1}30`,
                padding: '0 clamp(1rem,5vw,2.5rem)',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                position: 'sticky', top: 0, zIndex: 50,
                backdropFilter: 'blur(16px)', height: 76,
                boxShadow: `0 2px 24px ${c1}18, 0 2px 24px ${c2}10`,
            }}>
                {/* Logo */}
                <button onClick={() => handleLink('hero')} style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '0.2rem' }}>
                    <div className="ng-logo" style={{
                        width: '5.2rem', height: '5.2rem', borderRadius: '50%',
                        background: `#ffffff url(/personal/logo_terminal.png) center/85% no-repeat`,
                        border: `3px solid ${tema.primary}`,
                        boxShadow: `0 0 16px ${tema.primary}70`,
                        marginTop: '1.2rem',
                    }} />
                </button>

                {/* Nav links desktop */}
                <div className="ng-desktop" style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', flex: 1, justifyContent: 'center' }}>
                    {NAV_LINKS.map(l => (
                        <button key={l.id} onClick={() => handleLink(l.id)} style={navLinkStyle}
                            onMouseEnter={e => { e.currentTarget.style.color = ac; e.currentTarget.style.background = `${c1}15`; }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.background = 'none'; }}>
                            {l.label}
                        </button>
                    ))}
                    <button onClick={() => handleLink('explorar')} style={{
                        background: `linear-gradient(135deg, ${tema.primary}, ${tema.secondary})`,
                        color: tema.primaryText, border: 'none', borderRadius: 999,
                        padding: '0.42rem 1.05rem', cursor: 'pointer',
                        fontSize: '0.8rem', fontWeight: 700, marginLeft: '0.5rem',
                        boxShadow: `0 0 16px ${c1}40`, transition: 'all 0.18s', whiteSpace: 'nowrap',
                    }}>
                        🎫 Haz tu reserva
                    </button>
                </div>

                {/* Derecha */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginLeft: 'auto' }}>
                    {/* Reloj desktop */}
                    <div className="ng-desktop" style={{
                        marginRight: '0.75rem', padding: '0.25rem 0.7rem',
                        border: `1px solid ${tema.primary}55`, borderRadius: 8,
                        background: `${tema.primary}10`,
                    }}>
                        <RelojDigital size="small" />
                    </div>

                    {/* Dept badge desktop */}
                    <button className="ng-desktop" onClick={() => handleLink('explorar')} style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        background: `linear-gradient(90deg, ${c1}20, ${c2}15)`,
                        border: `1px solid ${c1}45`,
                        color: ac, padding: '0.28rem 0.65rem', borderRadius: 20,
                        cursor: 'pointer', fontSize: '0.74rem', fontWeight: 600, transition: 'all 0.15s',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(90deg, ${c1}35, ${c2}28)`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(90deg, ${c1}20, ${c2}15)`; e.currentTarget.style.transform = 'none'; }}>
                        <span>{DEPARTAMENTOS[departamento]?.emoji}</span>
                        <span>{departamento}</span>
                    </button>

                    {/* Bell clientes */}
                    {esCliente && (
                        <div ref={bellRef} style={{ position: 'relative' }}>
                            <button onClick={() => setBellAbierta(v => !v)} style={{
                                position: 'relative',
                                background: bellAbierta ? `${c1}20` : 'transparent',
                                border: `1px solid ${bellAbierta ? c1 + '60' : c1 + '20'}`,
                                borderRadius: '50%', width: 34, height: 34,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', fontSize: '0.98rem', transition: 'all 0.15s',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.background = `${c1}18`; }}
                                onMouseLeave={e => { if (!bellAbierta) e.currentTarget.style.background = 'transparent'; }}>
                                🔔
                                {noLeidas > 0 && (
                                    <span style={{ position: 'absolute', top: -3, right: -3, background: c1, color: '#fff', borderRadius: '50%', width: 15, height: 15, fontSize: '0.57rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${bg}` }}>
                                        {noLeidas > 9 ? '9+' : noLeidas}
                                    </span>
                                )}
                            </button>
                            {bellAbierta && (
                                <div style={{ position: 'absolute', top: '110%', right: 0, width: 310, maxHeight: 400, background: bg, border: `1px solid ${c1}40`, borderRadius: 14, boxShadow: `0 8px 32px ${c1}30`, zIndex: 200, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 1rem', borderBottom: `1px solid ${c1}20`, background: `${c1}08` }}>
                                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f0ece8' }}>
                                            Notificaciones {noLeidas > 0 && <span style={{ color: c1 }}>({noLeidas})</span>}
                                        </span>
                                        {noLeidas > 0 && <button onClick={handleMarcarTodas} style={{ background: 'none', border: 'none', color: ac, fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}>Marcar leídas</button>}
                                    </div>
                                    <div style={{ overflowY: 'auto', flex: 1 }}>
                                        {notifs.length === 0
                                            ? <div style={{ padding: '2rem', textAlign: 'center', color: `${ac}40`, fontSize: '0.82rem' }}>Sin notificaciones</div>
                                            : notifs.map(n => (
                                                <div key={n.id} onClick={() => handleMarcarLeida(n.id)} style={{ padding: '0.7rem 1rem', borderBottom: `1px solid ${c1}12`, cursor: n.leido ? 'default' : 'pointer', background: n.leido ? 'transparent' : `${c1}08`, display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                                                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>{n.leido ? '📭' : '📬'}</span>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '0.78rem', color: n.leido ? `${ac}55` : `${ac}cc`, fontWeight: n.leido ? 400 : 500, marginBottom: '0.2rem' }}>{n.mensaje}</div>
                                                        <div style={{ fontSize: '0.66rem', color: `${ac}35` }}>{n.fecha} {n.hora}</div>
                                                    </div>
                                                    {!n.leido && <span style={{ width: 6, height: 6, borderRadius: '50%', background: c1, flexShrink: 0, marginTop: 4 }} />}
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Staff panel button */}
                    {perfil && PANEL_POR_ROL[perfil.rol] && (
                        <button onClick={() => navigate(PANEL_POR_ROL[perfil.rol].ruta)} style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            background: `linear-gradient(90deg, ${c1}18, ${c2}12)`,
                            border: `1px solid ${c1}45`,
                            color: ac, padding: '0.3rem 0.72rem', borderRadius: 999,
                            cursor: 'pointer', fontSize: '0.77rem', fontWeight: 600, transition: 'all 0.15s',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(90deg, ${c1}30, ${c2}25)`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(90deg, ${c1}18, ${c2}12)`; e.currentTarget.style.transform = 'none'; }}>
                            {PANEL_POR_ROL[perfil.rol].icono} {PANEL_POR_ROL[perfil.rol].label}
                        </button>
                    )}

                    <PerfilIndicador />

                    {/* Hamburger móvil */}
                    <button className="ng-hamburger" onClick={() => setMenuMovil(v => !v)} style={{
                        display: 'none', background: 'none', border: `1px solid ${c1}40`,
                        borderRadius: 8, padding: '0.4rem 0.55rem', cursor: 'pointer',
                        color: '#e2e8f0', fontSize: '1.1rem', lineHeight: 1,
                    }}>
                        {menuMovil ? '✕' : '☰'}
                    </button>
                </div>
            </nav>

            {/* Menú móvil */}
            {menuMovil && (
                <div style={{
                    position: 'sticky', top: 76, zIndex: 49,
                    background: `${bg}f8`, backdropFilter: 'blur(16px)',
                    borderBottom: `1px solid ${c1}30`,
                    padding: '0.75rem 1rem',
                    display: 'flex', flexDirection: 'column', gap: '0.35rem',
                }}>
                    <div style={{ padding: '0.25rem 0.5rem', border: `1px solid ${tema.primary}40`, borderRadius: 8, background: `${tema.primary}10`, alignSelf: 'flex-start' }}>
                        <RelojDigital size="small" />
                    </div>
                    <button onClick={() => handleLink('explorar')} style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        background: `linear-gradient(90deg, ${c1}20, ${c2}15)`,
                        border: `1px solid ${c1}45`, color: ac,
                        padding: '0.5rem 0.75rem', borderRadius: 20,
                        cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, alignSelf: 'flex-start',
                    }}>
                        <span>{DEPARTAMENTOS[departamento]?.emoji}</span>
                        <span>{departamento}</span>
                    </button>
                    {NAV_LINKS.map(l => (
                        <button key={l.id} onClick={() => handleLink(l.id)} style={{ ...navLinkStyle, textAlign: 'left', width: '100%' }}>
                            {l.label}
                        </button>
                    ))}
                    <button onClick={() => handleLink('explorar')} style={{
                        background: `linear-gradient(135deg, ${tema.primary}, ${tema.secondary})`,
                        color: tema.primaryText, border: 'none', borderRadius: 999,
                        padding: '0.6rem 1.2rem', cursor: 'pointer',
                        fontSize: '0.88rem', fontWeight: 700, alignSelf: 'flex-start',
                    }}>
                        🎫 Haz tu reserva
                    </button>
                </div>
            )}
        </>
    );
};

export default NavbarGlobal;
