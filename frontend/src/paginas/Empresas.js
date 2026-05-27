import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSucursales } from '../servicios/api';
import { getEmpresaLogo, getDeptFondo } from '../utils/assets';
import { useDepartamento, DEPARTAMENTOS } from '../contextos/DepartamentoContext';
import { useAuth } from '../contextos/AuthContext';
// Notificaciones — pendiente migración a Supabase
import RelojDigital from '../componentes/RelojDigital';
import PerfilIndicador from '../componentes/PerfilIndicador';

const PANEL_POR_ROL = {
    admin_sucursal: { ruta: '/admin/dashboard', label: 'Panel Admin', icono: '🛠️' },
    cajero: { ruta: '/cajero/panel', label: 'Panel Cajero', icono: '🎫' },
    conductor: { ruta: '/conductor/panel', label: 'Panel Conductor', icono: '🚌' },
};

const Empresas = () => {
    const navigate = useNavigate();
    const { departamento, setDepartamento, tema } = useDepartamento();
    const { perfil } = useAuth();

    const c1 = tema.color;
    const c2 = tema.colorSecundario || tema.color;
    const bg = tema.bg;
    const ac = tema.acento;

    const [sucursalesAll, setSucursalesAll] = useState([]);
    const [sucursales, setSucursales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [notifs, setNotifs] = useState([]);
    const [bellAbierta, setBellAbierta] = useState(false);
    const [menuMovil, setMenuMovil] = useState(false);
    const bellRef = useRef(null);

    const navLinkStyle = {
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: '0.88rem', color: '#e2e8f0', fontWeight: 700,
        padding: '0.35rem 0.75rem', borderRadius: 8, transition: 'all 0.15s',
        textTransform: 'uppercase', letterSpacing: '0.1em',
        fontFamily: "'Inter', 'Rajdhani', system-ui, sans-serif",
    };

    const esCliente = perfil?.rol === 'cliente' && perfil?.ci;

    useEffect(() => {
        getSucursales().then(data => { setSucursalesAll(data); setLoading(false); });
    }, []);

    useEffect(() => {
        const filtradas = sucursalesAll.filter(s => s.departamento === departamento);
        setSucursales(filtradas);
    }, [sucursalesAll, departamento]);

    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    useEffect(() => {
        if (!bellAbierta) return;
        const h = (e) => { if (bellRef.current && !bellRef.current.contains(e.target)) setBellAbierta(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [bellAbierta]);

    const noLeidas = 0;
    const handleMarcarLeida = () => {};
    const handleMarcarTodas = () => {};

    const STARS = (ranking) => {
        const estrellas = Math.min(5, Math.round((ranking / 100) * 5));
        return '★'.repeat(estrellas) + '☆'.repeat(5 - estrellas);
    };

    const cols = isMobile ? 4 : 6;

    return (
        <div style={{ minHeight: '100vh', background: '#07111f', color: '#dde5f0', fontFamily: "'Inter', system-ui, sans-serif", position: 'relative' }}>
            {/* Fondo departamento */}
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, height: '120vh', zIndex: 0,
                backgroundImage: `url(${getDeptFondo(departamento)})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                opacity: 0.19,
                filter: 'blur(6px)',
                transition: 'background-image 0.6s',
                pointerEvents: 'none',
                transform: 'translate3d(0, 0, 0)', // gemini: acelera por hardware y evita saltos de scroll en móviles
            }} />

            {/* ══ NAVBAR ══════════════════════════════════════════════ */}
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
                <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '0.2rem' }}>
                    <div className="nav-logo" style={{
                        width: '5.2rem', height: '5.2rem', borderRadius: '50%',
                        background: `#ffffff url(/personal/logo_terminal.png) center/85% no-repeat`,
                        border: `3px solid ${tema.primary}`,
                        boxShadow: `0 0 16px ${tema.primary}70`,
                        marginTop: '1.2rem',
                    }} />
                </button>

                {/* Nav links */}
                <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', flex: 1, justifyContent: 'center' }}>
                    {[
                        { label: 'Empresas', id: 'explorar' },
                        { label: 'Nosotros', id: 'nosotros' },
                        { label: 'Permisos', id: 'permisos' },
                        { label: 'Emergencias', id: 'emergencias' },
                    ].map(l => (
                        <button key={l.id} onClick={() => navigate('/')} style={navLinkStyle}
                            onMouseEnter={e => { e.currentTarget.style.color = ac; e.currentTarget.style.background = `${c1}15`; }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.background = 'none'; }}>
                            {l.label}
                        </button>
                    ))}
                    <button onClick={() => navigate('/planear-viaje')} style={{
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
                    <div className="nav-desktop" style={{ marginRight: '0.75rem', padding: '0.25rem 0.7rem', border: `1px solid ${tema.primary}55`, borderRadius: 8, background: `${tema.primary}10` }}>
                        <RelojDigital size="small" />
                    </div>

                    {/* Dept selector */}
                    <div className="nav-desktop" style={{ position: 'relative' }}>
                        <select
                            value={departamento}
                            onChange={e => setDepartamento(e.target.value)}
                            style={{
                                background: `linear-gradient(90deg, ${c1}20, ${c2}15)`,
                                border: `1px solid ${c1}45`,
                                color: ac, padding: '0.28rem 1.6rem 0.28rem 0.65rem', borderRadius: 20,
                                cursor: 'pointer', fontSize: '0.74rem', fontWeight: 600,
                                outline: 'none', appearance: 'none',
                            }}>
                            {Object.keys(DEPARTAMENTOS).map(d => (
                                <option key={d} value={d} style={{ background: '#0b1628', color: '#dde5f0' }}>
                                    {DEPARTAMENTOS[d].emoji} {d}
                                </option>
                            ))}
                        </select>
                        <span style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: ac, fontSize: '0.6rem', pointerEvents: 'none' }}>▾</span>
                    </div>

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

                    {/* Staff panel */}
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

                    {/* Hamburger — solo móvil */}
                    <button className="nav-hamburger" onClick={() => setMenuMovil(v => !v)} style={{
                        display: 'none', background: 'none', border: `1px solid ${c1}40`,
                        borderRadius: 8, padding: '0.4rem 0.55rem', cursor: 'pointer',
                        color: '#e2e8f0', fontSize: '1.1rem', lineHeight: 1,
                    }}>
                        {menuMovil ? '✕' : '☰'}
                    </button>
                </div>
            </nav>

            {/* Menú móvil desplegable */}
            {menuMovil && (
                <div className="nav-movil-menu" style={{
                    position: 'sticky', top: 76, zIndex: 49,
                    background: `${bg}f8`, backdropFilter: 'blur(16px)',
                    borderBottom: `1px solid ${c1}30`,
                    padding: '0.75rem 1rem',
                    display: 'flex', flexDirection: 'column', gap: '0.35rem',
                }}>
                    <div style={{ padding: '0.25rem 0.5rem', border: `1px solid ${tema.primary}40`, borderRadius: 8, background: `${tema.primary}10`, alignSelf: 'flex-start' }}>
                        <RelojDigital size="small" />
                    </div>
                    {/* Dept selector móvil */}
                    <div style={{ position: 'relative', alignSelf: 'flex-start' }}>
                        <select
                            value={departamento}
                            onChange={e => { setDepartamento(e.target.value); setMenuMovil(false); }}
                            style={{
                                background: `linear-gradient(90deg, ${c1}20, ${c2}15)`,
                                border: `1px solid ${c1}45`,
                                color: ac, padding: '0.5rem 1.8rem 0.5rem 0.75rem', borderRadius: 20,
                                cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                                outline: 'none', appearance: 'none',
                            }}>
                            {Object.keys(DEPARTAMENTOS).map(d => (
                                <option key={d} value={d} style={{ background: '#0b1628', color: '#dde5f0' }}>
                                    {DEPARTAMENTOS[d].emoji} {d}
                                </option>
                            ))}
                        </select>
                        <span style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: ac, fontSize: '0.6rem', pointerEvents: 'none' }}>▾</span>
                    </div>
                    {[
                        { label: 'Empresas' },
                        { label: 'Nosotros' },
                        { label: 'Permisos' },
                        { label: 'Emergencias' },
                    ].map(l => (
                        <button key={l.label} onClick={() => { navigate('/'); setMenuMovil(false); }} style={{ ...navLinkStyle, textAlign: 'left', width: '100%' }}>
                            {l.label}
                        </button>
                    ))}
                    <button onClick={() => { navigate('/planear-viaje'); setMenuMovil(false); }} style={{
                        background: `linear-gradient(135deg, ${tema.primary}, ${tema.secondary})`,
                        color: tema.primaryText, border: 'none', borderRadius: 999,
                        padding: '0.6rem 1.2rem', cursor: 'pointer',
                        fontSize: '0.88rem', fontWeight: 700, alignSelf: 'flex-start',
                    }}>
                        🎫 Haz tu reserva
                    </button>
                </div>
            )}


            <style>{`
                @keyframes tbb-gold-shimmer {
                    0%   { background-position: 0% 50%; }
                    50%  { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                @keyframes tbb-silver-destello {
                    0%, 100% { box-shadow: 0 4px 18px rgba(192,192,192,0.12), 0 0 0 1px rgba(200,200,200,0.1); }
                    40%      { box-shadow: 0 6px 28px rgba(220,220,240,0.28), 0 0 10px rgba(255,255,255,0.18), 0 0 0 1px rgba(210,210,210,0.3); }
                    70%      { box-shadow: 0 4px 18px rgba(192,192,192,0.12), 0 0 0 1px rgba(200,200,200,0.1); }
                }
                @media (max-width: 640px) {
                    .nav-desktop { display: none !important; }
                    .nav-hamburger { display: flex !important; }
                    .nav-logo {
                        width: 2.6rem !important;
                        height: 2.6rem !important;
                        margin-top: 0 !important;
                        border-width: 2px !important;
                    }
                }
                @media (min-width: 641px) {
                    .nav-movil-menu { display: none !important; }
                }
            `}</style>

            {/* ══ GRID ════════════════════════════════════════════════ */}
            <main style={{ padding: 'clamp(0.75rem, 3vw, 2rem)', position: 'relative', zIndex: 1, overflowX: 'hidden' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: '#334155' }}>Cargando empresas...</div>
                ) : sucursales.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: '#334155' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Sin empresas en {departamento}</div>
                        <div style={{ fontSize: '0.82rem', color: '#334155' }}>Selecciona otro departamento en la barra superior</div>
                    </div>
                ) : (
                    <>
                        {/* ── PODIO TOP 3 ─────────────────────────────────── */}
                        {sucursales.length >= 1 && (() => {
                            const MEDALS = ['👑', '🥈', '🥉'];
                            const ORDER_DESKTOP = [1, 0, 2]; // plata | oro | bronce

                            const PodiumCard = ({ s, rank, compact = false }) => {
                                const logo = getEmpresaLogo(s.nombre);
                                const ec = s.colorAccent || '#64748b';
                                const isGold   = rank === 0;
                                const isSilver = rank === 1;
                                const isBronze = rank === 2;
                                return (
                                    <Link to={`/sucursal/${s.id}`} state={{ departamento }} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                                        {/* Wrapper: oro animado · plata/bronce estático */}
                                        <div style={{
                                            padding: isGold || isSilver || isBronze ? 2 : 0,
                                            borderRadius: isGold ? 22 : isSilver ? 20 : isBronze ? 20 : 18,
                                            background: isGold
                                                ? 'linear-gradient(135deg, #FFD700, #FFA500, #FFE566, #B8860B, #FFD700)'
                                                : isSilver
                                                    ? 'linear-gradient(135deg, #F0F0F0, #A8A8A8, #E8E8E8, #C0C0C0, #F0F0F0)'
                                                    : isBronze
                                                        ? 'linear-gradient(135deg, #E8A870, #8B4513, #CD7F32, #A0522D, #E8A870)'
                                                        : 'transparent',
                                            backgroundSize: isGold ? '300% 300%' : undefined,
                                            animation: isGold ? 'tbb-gold-shimmer 3s ease infinite' : 'none',
                                            maxWidth: isGold ? (isMobile ? '92%' : 250) : isSilver || isBronze ? (compact ? '100%' : 250) : undefined,
                                            margin: isGold ? '0 auto' : isSilver ? (compact ? '0 auto' : '0 -0.75rem 0 auto') : isBronze ? (compact ? '0 auto' : '0 auto 0 -0.75rem') : undefined,
                                        }}>
                                            <div
                                                style={{
                                                    position: 'relative',
                                                    background: 'rgba(0,0,0,0.55)',
                                                    border: isGold || isSilver || isBronze ? 'none' : `1.5px solid ${ec}55`,
                                                    borderRadius: isGold ? 20 : isSilver ? 18 : isBronze ? 18 : 16,
                                                    padding: compact ? '1rem 0.65rem' : isGold ? (isMobile ? '1.4rem 1rem 1rem' : '2rem 1.1rem 1.4rem') : isSilver ? '1.6rem 1.1rem 1.1rem' : isBronze ? '1.2rem 1.1rem 0.8rem' : '1.6rem 1.1rem 1.1rem',
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                                    gap: compact ? '0.4rem' : '0.7rem',
                                                    cursor: 'pointer', transition: 'transform 0.22s', textAlign: 'center',
                                                    boxShadow: isGold
                                                        ? '0 12px 56px rgba(255,215,0,0.35), inset 0 1px 0 rgba(255,215,0,0.2)'
                                                        : isSilver
                                                            ? '0 6px 28px rgba(192,192,192,0.2), 0 0 0 1px rgba(200,200,200,0.15)'
                                                            : isBronze
                                                                ? '0 6px 24px rgba(205,127,50,0.18), inset 0 1px 0 rgba(232,168,112,0.08)'
                                                                : `0 6px 32px ${ec}25, 0 0 0 1px ${ec}12`,
                                                    animation: isSilver ? 'tbb-silver-destello 2.5s ease infinite' : 'none',
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
                                            >
                                                {/* Medalla */}
                                                <div style={{
                                                    position: 'absolute', top: compact ? -11 : -15, left: '50%', transform: 'translateX(-50%)',
                                                    fontSize: compact ? '1.3rem' : isGold ? '2rem' : '1.55rem',
                                                    filter: `drop-shadow(0 0 ${isGold ? 14 : isSilver ? 12 : isBronze ? 10 : 8}px ${isGold ? '#FFD700' : isSilver ? '#C0C0C0' : isBronze ? '#CD7F32' : ec})`,
                                                    lineHeight: 1,
                                                }}>{MEDALS[rank]}</div>

                                                {/* Logo */}
                                                <div style={{
                                                    width: compact ? 52 : isGold ? (isMobile ? 80 : 120) : isSilver ? 100 : isBronze ? 100 : 76,
                                                    height: compact ? 52 : isGold ? (isMobile ? 80 : 120) : isSilver ? 100 : isBronze ? 100 : 76,
                                                    borderRadius: isGold ? 22 : 10,
                                                    background: '#ffffff',
                                                    border: `2px solid ${isGold ? '#FFD70040' : isSilver ? 'rgba(192,192,192,0.4)' : isBronze ? 'rgba(205,127,50,0.4)' : ec + '30'}`,
                                                    boxShadow: isGold ? '0 0 20px rgba(255,215,0,0.25)' : isSilver ? '0 0 16px rgba(192,192,192,0.3)' : isBronze ? '0 0 14px rgba(205,127,50,0.22)' : `0 0 20px ${ec}20`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    padding: isGold || isSilver || isBronze ? 0 : '0.35rem 0.6rem', overflow: 'hidden', flexShrink: 0,
                                                }}>
                                                    {logo
                                                        ? <img src={logo} alt={s.nombre} style={{ width: '100%', height: '100%', objectFit: isGold || isSilver || isBronze ? 'fill' : 'contain' }} />
                                                        : <span style={{ fontSize: compact ? '1.5rem' : isGold ? '3rem' : '2rem' }}>{s.logoEmoji}</span>
                                                    }
                                                </div>

                                                {/* Nombre */}
                                                {isGold ? (
                                                    <div style={{
                                                        fontWeight: 900,
                                                        fontSize: compact ? '0.7rem' : '0.92rem',
                                                        lineHeight: 1.2, letterSpacing: '-0.01em',
                                                        background: 'linear-gradient(135deg, #FFE566 0%, #FFD700 40%, #FFA500 70%, #FFE566 100%)',
                                                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                                        backgroundClip: 'text', textShadow: 'none',
                                                        filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.6))',
                                                    }}>{s.nombre}</div>
                                                ) : isSilver ? (
                                                    <div style={{
                                                        fontWeight: 900,
                                                        fontSize: compact ? '0.7rem' : '0.88rem',
                                                        lineHeight: 1.2, letterSpacing: '-0.01em',
                                                        background: 'linear-gradient(135deg, #F0F0F0 0%, #C0C0C0 40%, #A8A8A8 70%, #F0F0F0 100%)',
                                                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                                        backgroundClip: 'text', textShadow: 'none',
                                                        filter: 'drop-shadow(0 0 6px rgba(192,192,192,0.7))',
                                                    }}>{s.nombre}</div>
                                                ) : isBronze ? (
                                                    <div style={{
                                                        fontWeight: 900,
                                                        fontSize: compact ? '0.7rem' : '0.88rem',
                                                        lineHeight: 1.2, letterSpacing: '-0.01em',
                                                        background: 'linear-gradient(135deg, #E8A870 0%, #CD7F32 40%, #8B4513 70%, #E8A870 100%)',
                                                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                                        backgroundClip: 'text', textShadow: 'none',
                                                        filter: 'drop-shadow(0 0 5px rgba(205,127,50,0.6))',
                                                    }}>{s.nombre}</div>
                                                ) : (
                                                    <div style={{
                                                        fontWeight: 700, color: '#f0ece8',
                                                        fontSize: compact ? '0.7rem' : '0.88rem',
                                                        lineHeight: 1.2,
                                                    }}>{s.nombre}</div>
                                                )}

                                                {/* Estrellas + pts */}
                                                {!compact && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                                                        <span style={{
                                                            color: isGold ? '#FFD700' : isSilver ? '#C0C0C0' : isBronze ? '#CD7F32' : ec,
                                                            fontSize: isGold ? '0.92rem' : isSilver ? '0.88rem' : isBronze ? '0.88rem' : '0.78rem',
                                                            textShadow: isGold ? '0 0 12px rgba(255,215,0,0.8)' : isSilver ? '0 0 10px rgba(192,192,192,0.7)' : isBronze ? '0 0 8px rgba(205,127,50,0.6)' : `0 0 10px ${ec}60`,
                                                            letterSpacing: 1,
                                                        }}>
                                                            {STARS(s.ranking)}
                                                        </span>
                                                        <span style={{
                                                            fontSize: '0.65rem', fontWeight: 700,
                                                            background: isGold ? 'rgba(255,215,0,0.12)' : isSilver ? 'rgba(192,192,192,0.12)' : isBronze ? 'rgba(205,127,50,0.1)' : `${ec}18`,
                                                            border: isGold ? '1px solid rgba(255,215,0,0.4)' : isSilver ? '1px solid rgba(192,192,192,0.4)' : isBronze ? '1px solid rgba(205,127,50,0.35)' : `1px solid ${ec}40`,
                                                            color: isGold ? '#FFD700' : isSilver ? '#C0C0C0' : isBronze ? '#CD7F32' : ec,
                                                            padding: '0.1rem 0.5rem', borderRadius: 20,
                                                        }}>
                                                            {s.ranking} pts
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Barra podio base */}
                                                {!compact && (
                                                    <div style={{
                                                        position: 'absolute', bottom: 0, left: 0, right: 0,
                                                        height: isGold ? 5 : 3,
                                                        background: isGold
                                                            ? 'linear-gradient(90deg, transparent, #FFD700, #FFA500, #FFD700, transparent)'
                                                            : isSilver
                                                                ? 'linear-gradient(90deg, transparent, #C0C0C0, #E8E8E8, #C0C0C0, transparent)'
                                                                : isBronze
                                                                    ? 'linear-gradient(90deg, transparent, #CD7F32, #E8A870, #CD7F32, transparent)'
                                                                    : `linear-gradient(90deg, transparent, ${ec}, transparent)`,
                                                        borderRadius: '0 0 16px 16px',
                                                    }} />
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            };

                            return (
                                <div style={{ marginBottom: '3rem' }}>
                                    {/* Header sección */}
                                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                                        <div style={{ fontSize: '0.62rem', fontWeight: 800, color: ac, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                                            {DEPARTAMENTOS[departamento]?.emoji} {departamento}
                                        </div>
                                        <h2 style={{ margin: 0, fontSize: 'clamp(1.5rem,3.5vw,2.2rem)', fontWeight: 900, color: '#f0ece8', letterSpacing: '-0.02em', lineHeight: 1 }}>
                                            Top Empresas
                                        </h2>
                                        <p style={{ margin: '0.4rem 0 0', fontSize: '0.76rem', color: `${ac}70` }}>
                                            {sucursales.length} empresa{sucursales.length !== 1 ? 's' : ''} · mejor calificadas primero
                                        </p>
                                    </div>

                                    {/* Desktop: plata | ORO | bronce */}
                                    {!isMobile && (
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: sucursales.length === 1 ? '1fr' : sucursales.length === 2 ? '1fr 1fr' : '1fr 1fr 1fr',
                                            gap: '1rem', alignItems: 'end',
                                        }}>
                                            {ORDER_DESKTOP.map(rank => sucursales[rank] && (
                                                <PodiumCard key={rank} s={sucursales[rank]} rank={rank} />
                                            ))}
                                        </div>
                                    )}

                                    {/* Mobile: oro arriba, plata+bronce abajo */}
                                    {isMobile && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                            <PodiumCard s={sucursales[0]} rank={0} />
                                            {sucursales.length >= 2 && (
                                                <div style={{ display: 'grid', gridTemplateColumns: sucursales[2] ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
                                                    {[1, 2].filter(r => sucursales[r]).map(rank => (
                                                        <PodiumCard key={rank} s={sucursales[rank]} rank={rank} compact />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* ── RESTO DE EMPRESAS ───────────────────────────── */}
                        {sucursales.length > 3 && (
                            <>
                                <div style={{ textAlign: 'center', marginBottom: '1.5rem', marginTop: '0.5rem' }}>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#475569', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                                        ── También compiten ──
                                    </div>
                                    <div style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)', fontWeight: 900, color: '#94a3b8', letterSpacing: '-0.02em' }}>
                                        Otras empresas
                                    </div>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    justifyContent: 'center',
                                    gap: isMobile ? '0.5rem' : '1rem',
                                }}>
                                    {sucursales.slice(3).map(s => {
                                        const logo = getEmpresaLogo(s.nombre);
                                        const ec = s.colorAccent || tema.color || '#64748b';
                                        return (
                                            <Link key={s.id} to={`/sucursal/${s.id}`} state={{ departamento }} style={{ textDecoration: 'none', color: 'inherit', width: isMobile ? 'calc(50% - 0.25rem)' : 'calc(25% - 0.75rem)', maxWidth: isMobile ? '50%' : 220 }}>
                                                {/* Wrapper borde acento */}
                                                <div style={{
                                                    padding: 2,
                                                    borderRadius: isMobile ? 12 : 16,
                                                    background: `linear-gradient(135deg, ${ec}bb, ${ec}44, ${ec}bb)`,
                                                    height: '100%',
                                                }}>
                                                    <div
                                                        style={{
                                                            background: 'rgba(0,0,0,0.55)',
                                                            borderRadius: isMobile ? 10 : 14,
                                                            padding: isMobile ? '0.75rem 0.6rem' : '1rem 0.85rem',
                                                            display: 'flex', flexDirection: 'column',
                                                            alignItems: 'center', gap: isMobile ? '0.35rem' : '0.5rem',
                                                            cursor: 'pointer', transition: 'transform 0.18s',
                                                            textAlign: 'center', height: '100%', boxSizing: 'border-box',
                                                            boxShadow: `0 4px 20px ${ec}12`,
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
                                                    >
                                                        <div style={{
                                                            width: isMobile ? 46 : 64, height: isMobile ? 46 : 64,
                                                            borderRadius: isMobile ? 8 : 10,
                                                            background: '#fff',
                                                            border: `1.5px solid ${ec}35`,
                                                            overflow: 'hidden', flexShrink: 0,
                                                        }}>
                                                            {logo
                                                                ? <img src={logo} alt={s.nombre} style={{ width: '100%', height: '100%', objectFit: 'fill' }} />
                                                                : <span style={{ fontSize: isMobile ? '1.4rem' : '1.8rem' }}>{s.logoEmoji}</span>}
                                                        </div>
                                                        <div style={{
                                                            fontSize: isMobile ? '0.62rem' : '0.78rem', fontWeight: 700,
                                                            color: ec, lineHeight: 1.2,
                                                            overflow: 'hidden', textOverflow: 'ellipsis',
                                                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', width: '100%',
                                                        }}>
                                                            {s.nombre}
                                                        </div>
                                                        <div style={{ color: ec, fontSize: isMobile ? '0.6rem' : '0.7rem', letterSpacing: 1 }}>
                                                            {STARS(s.ranking)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default Empresas;
