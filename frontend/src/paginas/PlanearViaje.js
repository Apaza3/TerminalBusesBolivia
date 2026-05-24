import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEPARTAMENTOS, useDepartamento } from '../contextos/DepartamentoContext';
import { useAuth } from '../contextos/AuthContext';
import { obtenerNotificaciones, marcarNotificacionLeida, marcarTodasLeidas } from '../data/mockStorage';
import MapaBolivia from '../componentes/MapaBolivia';
import RelojDigital from '../componentes/RelojDigital';
import PerfilIndicador from '../componentes/PerfilIndicador';
import { obtenerViajesSucursal } from '../data/mockDiscoveryDB';
import { getSucursales } from '../servicios/api';
import { getEmpresaLogo } from '../utils/assets';

const PANEL_POR_ROL = {
    admin_sucursal: { ruta: '/admin/dashboard', label: 'Panel Admin', icono: '🛠️' },
    cajero: { ruta: '/cajero/panel', label: 'Panel Cajero', icono: '🎫' },
    conductor: { ruta: '/conductor/panel', label: 'Panel Conductor', icono: '🚌' },
};

const PASOS = [
    { id: 1, label: 'Origen' },
    { id: 2, label: 'Destino' },
    { id: 3, label: 'Fecha' },
    { id: 4, label: 'Empresa' },
    { id: 5, label: 'Salida' },
];

// ── Mini calendario ──────────────────────────────────────────────────────
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS_SEMANA = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

const Calendario = ({ onSelect, tema }) => {
    const hoy = new Date();
    const [vis, setVis] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    const [seleccionado, setSeleccionado] = useState(null);

    const year = vis.getFullYear();
    const month = vis.getMonth();
    const primerDia = new Date(year, month, 1).getDay();
    const totalDias = new Date(year, month + 1, 0).getDate();

    const celdas = [];
    for (let i = 0; i < primerDia; i++) celdas.push(null);
    for (let d = 1; d <= totalDias; d++) celdas.push(d);

    const esPasado = (d) => {
        const fecha = new Date(year, month, d);
        return fecha < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    };

    const handleDia = (d) => {
        if (!d || esPasado(d)) return;
        const f = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        setSeleccionado(f);
        onSelect(f);
    };

    return (
        <div style={{ background: '#0b1628', border: `1px solid ${tema.color}30`, borderRadius: 14, padding: '1.25rem', maxWidth: 320, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <button onClick={() => setVis(new Date(year, month - 1, 1))} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.1rem', padding: '0 0.5rem' }}>‹</button>
                <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.9rem' }}>{MESES[month]} {year}</span>
                <button onClick={() => setVis(new Date(year, month + 1, 1))} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.1rem', padding: '0 0.5rem' }}>›</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.2rem', marginBottom: '0.4rem' }}>
                {DIAS_SEMANA.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', color: '#334155', fontWeight: 700, padding: '0.2rem 0' }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.2rem' }}>
                {celdas.map((d, i) => {
                    if (!d) return <div key={`e${i}`} />;
                    const pasado = esPasado(d);
                    const esHoy = d === hoy.getDate() && month === hoy.getMonth() && year === hoy.getFullYear();
                    const fechaStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const selec = seleccionado === fechaStr;
                    return (
                        <button key={d} onClick={() => handleDia(d)} disabled={pasado} style={{
                            padding: '0.4rem 0', textAlign: 'center', fontSize: '0.8rem',
                            borderRadius: 6, border: esHoy ? `1px solid ${tema.color}` : '1px solid transparent',
                            background: selec ? tema.color : 'transparent',
                            color: pasado ? '#1e293b' : selec ? '#fff' : esHoy ? tema.acento : '#94a3b8',
                            cursor: pasado ? 'not-allowed' : 'pointer',
                            fontWeight: selec || esHoy ? 700 : 400,
                            transition: 'all 0.12s',
                        }}>
                            {d}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

// Convierte hex → {h,s,l} y devuelve el color complementario (hue+180°)
const hexToHsl = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

const FONDOS = [
    'Beni.webp', 'Chuquisaca.webp', 'Cochabamba.webp', 'La_Paz.webp',
    'Oruro.webp', 'Pando.webp', 'Potosi.webp', 'Santa_Cruz.webp', 'Tarija.webp',
];

// Colores primary/secondary por departamento — mismo orden que FONDOS
const FONDOS_COLORES = [
    { primary: '#FEE440', secondary: '#00BBF9' }, // Beni
    { primary: '#EF233C', secondary: '#F8FAFC' }, // Chuquisaca
    { primary: '#00F0FF', secondary: '#7209B7' }, // Cochabamba
    { primary: '#00F0FF', secondary: '#FF2A85' }, // La Paz
    { primary: '#FF6B00', secondary: '#D90429' }, // Oruro
    { primary: '#06D6A0', secondary: '#118AB2' }, // Pando
    { primary: '#90E0EF', secondary: '#C1121F' }, // Potosí
    { primary: '#39FF14', secondary: '#FFD166' }, // Santa Cruz
    { primary: '#70E000', secondary: '#9D0208' }, // Tarija
];

// ── PlanearViaje ─────────────────────────────────────────────────────────
const PlanearViaje = () => {
    const navigate = useNavigate();
    const { tema: temaNav } = useDepartamento();
    const { perfil } = useAuth();

    const [origen, setOrigen] = useState(null);
    const [destino, setDestino] = useState(null);
    const [fecha, setFecha] = useState(null);
    const [empresa, setEmpresa] = useState(null);
    const [sucursalesDB, setSucursalesDB] = useState([]);
    const [companias, setCompanias] = useState([]);
    const [salidas, setSalidas] = useState([]);
    const [horaActual, setHoraActual] = useState(new Date());
    const [menuMovil, setMenuMovil] = useState(false);
    const [bellAbierta, setBellAbierta] = useState(false);
    const [notifs, setNotifs] = useState([]);
    const bellRef = useRef(null);

    const esCliente = perfil?.rol === 'cliente' && perfil?.ci;

    const cargarNotifs = useCallback(() => {
        if (!esCliente) return;
        const lista = obtenerNotificaciones({ para: 'cliente', clienteCI: perfil.ci });
        lista.sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn));
        setNotifs(lista);
    }, [esCliente, perfil?.ci]);

    useEffect(() => { getSucursales().then(setSucursalesDB); }, []);

    useEffect(() => {
        if (!esCliente) return;
        cargarNotifs();
        const t = setInterval(cargarNotifs, 15000);
        return () => clearInterval(t);
    }, [esCliente, cargarNotifs]);

    useEffect(() => {
        if (!bellAbierta) return;
        const h = (e) => { if (bellRef.current && !bellRef.current.contains(e.target)) setBellAbierta(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [bellAbierta]);

    const noLeidas = notifs.filter(n => !n.leido).length;

    useEffect(() => {
        const iv = setInterval(() => setHoraActual(new Date()), 1000);
        return () => clearInterval(iv);
    }, []);

    const [bgIdx, setBgIdx] = useState(0);
    const [bgFading, setBgFading] = useState(false);

    const fondoColor = FONDOS_COLORES[bgIdx];
    const neonPill = {
        border: `1px solid ${fondoColor.primary}65`,
        boxShadow: `0 0 16px ${fondoColor.primary}65, 0 0 38px ${fondoColor.secondary}35, 0 0 65px ${fondoColor.primary}20, inset 0 0 18px ${fondoColor.primary}10`,
        transition: 'box-shadow 1.5s ease-in-out, border-color 1.5s ease-in-out',
    };

    useEffect(() => {
        const SHOW_MS = 5000;
        const FADE_MS = 1200;
        const iv = setInterval(() => {
            setBgFading(true);
            setTimeout(() => {
                setBgIdx(i => (i + 1) % FONDOS.length);
                setBgFading(false);
            }, FADE_MS);
        }, SHOW_MS + FADE_MS);
        return () => clearInterval(iv);
    }, []);

    const paso = !origen ? 1 : !destino ? 2 : !fecha ? 3 : !empresa ? 4 : 5;
    const tema = DEPARTAMENTOS[origen] || DEPARTAMENTOS['La Paz'];

    // Colores complementarios (opuesto en rueda cromática) para fondos de los paneles
    const compColor = useMemo(() => {
        const { h, s } = hexToHsl(tema.color);
        const cH = (h + 180) % 360;
        const cS = Math.min(s, 58);
        return {
            bgTitulo: `linear-gradient(170deg, hsl(${cH},${cS}%,4%) 0%, hsl(${cH},${Math.round(cS * 0.45)}%,2%) 100%)`,
            bgProgreso: `linear-gradient(170deg, hsl(${cH},${cS}%,9%) 0%, hsl(${cH},${Math.round(cS * 0.6)}%,6%) 100%)`,
            barraColor: `hsl(${cH}, ${Math.min(cS + 12, 72)}%, 38%)`,
        };
    }, [tema.color]);

    const linea = (origen && destino) ? { desde: origen, hasta: destino } : null;

    // Compute companies when origen+destino set
    useEffect(() => {
        if (!origen || sucursalesDB.length === 0) return;
        const candidatas = sucursalesDB.filter(s => s.departamento === origen);
        const conRuta = candidatas.filter(s => {
            const viajes = obtenerViajesSucursal(s.id);
            return destino
                ? viajes.some(v => v.origen === origen && v.destino === destino)
                : viajes.some(v => v.origen === origen);
        });
        setCompanias(conRuta.length > 0 ? conRuta : candidatas);
    }, [origen, destino, sucursalesDB]);

    // Compute departures when empresa selected
    useEffect(() => {
        if (!empresa) return;
        const viajes = obtenerViajesSucursal(empresa.id);
        const filtrados = viajes.filter(v => {
            if (v.origen !== origen) return false;
            if (destino && v.destino !== destino) return false;
            return true;
        });
        // Sort by HH:MM
        filtrados.sort((a, b) => {
            const hA = new Date(a.salida).getHours() * 60 + new Date(a.salida).getMinutes();
            const hB = new Date(b.salida).getHours() * 60 + new Date(b.salida).getMinutes();
            return hA - hB;
        });
        setSalidas(filtrados);
    }, [empresa, origen, destino]);

    const handleSelectOrigen = (dept) => {
        if (paso !== 1) return;
        setOrigen(dept);
        setDestino(null);
        setFecha(null);
        setEmpresa(null);
    };

    const handleSelectDestino = (dept) => {
        if (paso !== 2 || dept === origen) return;
        setDestino(dept);
    };

    const esPasadaHora = (salida) => {
        const d = new Date(salida);
        const ahoraMin = horaActual.getHours() * 60 + horaActual.getMinutes();
        const salidaMin = d.getHours() * 60 + d.getMinutes();
        return salidaMin < ahoraMin;
    };

    const STARS = (ranking) => '★'.repeat(Math.min(5, Math.round(ranking)));

    const resetOrigen = () => { setOrigen(null); setDestino(null); setFecha(null); setEmpresa(null); };
    const resetDestino = () => { setDestino(null); setFecha(null); setEmpresa(null); };
    const resetFecha = () => { setFecha(null); setEmpresa(null); };
    const resetEmpresa = () => { setEmpresa(null); };

    const irAPaso = (n) => {
        if (n >= paso) return; // solo retroceder
        if (n <= 1) { setOrigen(null); setDestino(null); setFecha(null); setEmpresa(null); }
        else if (n === 2) { setDestino(null); setFecha(null); setEmpresa(null); }
        else if (n === 3) { setFecha(null); setEmpresa(null); }
        else if (n === 4) { setEmpresa(null); }
    };

    const mensajesMapa = {
        1: 'Toca tu departamento de origen',
        2: 'Ahora selecciona el destino',
    };

    const s = { // estilos comunes
        seccion: { maxWidth: 960, margin: '0 auto', padding: '1rem clamp(1rem,5vw,2rem)' },
        card: { background: '#0b1628', border: `1px solid ${tema.color}20`, borderRadius: 14, padding: '1.25rem', transition: 'all 0.18s', cursor: 'pointer' },
        h3: { color: '#e2e8f0', fontWeight: 700, fontSize: '1rem', margin: '0 0 0.25rem' },
        label: { color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' },
    };

    const n = temaNav;
    const c1 = n.color; const c2 = n.colorSecundario || n.color;
    const bg = n.bg; const ac = n.acento;
    const navLinkStyle = {
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: '0.88rem', color: '#e2e8f0', fontWeight: 700,
        padding: '0.35rem 0.75rem', borderRadius: 8, transition: 'all 0.15s',
        textTransform: 'uppercase', letterSpacing: '0.1em',
        fontFamily: "'Inter', system-ui, sans-serif",
    };

    return (
        <div style={{ minHeight: '100vh', color: '#dde5f0', fontFamily: "'Inter', system-ui, sans-serif" }}>

            <div style={{ position: 'relative', zIndex: 1 }}>

                {/* ══ NAVBAR ══════════════════════════════════════════════ */}
                <style>{`
                @media (max-width: 640px) {
                    .nav-desktop   { display: none !important; }
                    .nav-hamburger { display: flex !important; }
                    .nav-logo { width:2.6rem !important; height:2.6rem !important; margin-top:0 !important; border-width:2px !important; }

                    /* Layout planear viaje mobile */
                    .pv-grid       { grid-template-columns: 1fr !important; gap: 0.6rem !important; }
                    .pv-mapa-card  { padding: 0.5rem !important; }
                    .pv-mapa-inner { width: 70% !important; }
                    .pv-panel      { padding: 0.65rem !important; }
                    .pv-titulo     { padding: 0.3rem 0.5rem 0.2rem !important; }
                    .pv-titulo-pill{ padding: 0.3rem 1rem !important; }
                    .pv-titulo-txt { font-size: 0.95rem !important; }
                    .pv-stepper    { padding: 0.2rem 0.5rem 0.3rem !important; }
                    .pv-step-label { display: none !important; }
                    .pv-seccion    { padding: 0.5rem 0.5rem !important; }
                    .pv-h2         { font-size: 1.05rem !important; margin-bottom: 0.5rem !important; }
                    .pv-empresa-grid { grid-template-columns: repeat(auto-fill, minmax(85px, 1fr)) !important; gap: 0.4rem !important; }
                    .pv-empresa-logo { width: 44px !important; height: 44px !important; }
                    .pv-salidas    { max-height: 38vh !important; }
                }
                @media (min-width: 641px) { .nav-movil-menu { display: none !important; } }
            `}</style>
                <nav style={{
                    background: `${bg}f2`, borderBottom: `1px solid ${c1}30`,
                    padding: '0 clamp(1rem,5vw,2.5rem)',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    position: 'sticky', top: 0, zIndex: 50,
                    backdropFilter: 'blur(16px)', height: 76,
                    boxShadow: `0 2px 24px ${c1}18`,
                }}>
                    <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '0.2rem' }}>
                        <div className="nav-logo" style={{
                            width: '5.2rem', height: '5.2rem', borderRadius: '50%',
                            background: `#ffffff url(/personal/logo_terminal.png) center/85% no-repeat`,
                            border: `3px solid ${n.primary || c1}`,
                            boxShadow: `0 0 16px ${c1}70`, marginTop: '1.2rem',
                        }} />
                    </button>
                    <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', flex: 1, justifyContent: 'center' }}>
                        {['Empresas', 'Nosotros', 'Permisos', 'Emergencias'].map(l => (
                            <button key={l} onClick={() => navigate('/')} style={navLinkStyle}
                                onMouseEnter={e => { e.currentTarget.style.color = ac; e.currentTarget.style.background = `${c1}15`; }}
                                onMouseLeave={e => { e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.background = 'none'; }}>
                                {l}
                            </button>
                        ))}
                        <button onClick={() => navigate('/planear-viaje')} style={{
                            background: `linear-gradient(135deg, ${n.primary || c1}, ${n.secondary || c2})`,
                            color: n.primaryText || '#fff', border: 'none', borderRadius: 999,
                            padding: '0.42rem 1.05rem', cursor: 'pointer',
                            fontSize: '0.8rem', fontWeight: 700, marginLeft: '0.5rem',
                            boxShadow: `0 0 16px ${c1}40`, transition: 'all 0.18s', whiteSpace: 'nowrap',
                        }}>🎫 Haz tu reserva</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginLeft: 'auto' }}>
                        <div className="nav-desktop" style={{ marginRight: '0.75rem', padding: '0.25rem 0.7rem', border: `1px solid ${c1}55`, borderRadius: 8, background: `${c1}10` }}>
                            <RelojDigital size="small" />
                        </div>
                        {esCliente && (
                            <div ref={bellRef} style={{ position: 'relative' }}>
                                <button onClick={() => setBellAbierta(v => !v)} style={{
                                    position: 'relative', background: bellAbierta ? `${c1}20` : 'transparent',
                                    border: `1px solid ${bellAbierta ? c1 + '60' : c1 + '20'}`,
                                    borderRadius: '50%', width: 34, height: 34,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', fontSize: '0.98rem', transition: 'all 0.15s',
                                }}>🔔
                                    {noLeidas > 0 && <span style={{ position: 'absolute', top: -3, right: -3, background: c1, color: '#fff', borderRadius: '50%', width: 15, height: 15, fontSize: '0.57rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${bg}` }}>{noLeidas > 9 ? '9+' : noLeidas}</span>}
                                </button>
                                {bellAbierta && (
                                    <div style={{ position: 'absolute', top: '110%', right: 0, width: 310, maxHeight: 400, background: bg, border: `1px solid ${c1}40`, borderRadius: 14, boxShadow: `0 8px 32px ${c1}30`, zIndex: 200, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 1rem', borderBottom: `1px solid ${c1}20`, background: `${c1}08` }}>
                                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f0ece8' }}>Notificaciones {noLeidas > 0 && <span style={{ color: c1 }}>({noLeidas})</span>}</span>
                                            {noLeidas > 0 && <button onClick={() => { marcarTodasLeidas({ para: 'cliente', clienteCI: perfil?.ci }); cargarNotifs(); }} style={{ background: 'none', border: 'none', color: ac, fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}>Marcar leídas</button>}
                                        </div>
                                        <div style={{ overflowY: 'auto', flex: 1 }}>
                                            {notifs.length === 0
                                                ? <div style={{ padding: '2rem', textAlign: 'center', color: `${ac}40`, fontSize: '0.82rem' }}>Sin notificaciones</div>
                                                : notifs.map(n2 => (
                                                    <div key={n2.id} onClick={() => { marcarNotificacionLeida(n2.id); cargarNotifs(); }} style={{ padding: '0.7rem 1rem', borderBottom: `1px solid ${c1}12`, cursor: n2.leido ? 'default' : 'pointer', background: n2.leido ? 'transparent' : `${c1}08`, display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                                                        <span style={{ fontSize: '1rem', flexShrink: 0 }}>{n2.leido ? '📭' : '📬'}</span>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontSize: '0.78rem', color: n2.leido ? `${ac}55` : `${ac}cc`, fontWeight: n2.leido ? 400 : 500, marginBottom: '0.2rem' }}>{n2.mensaje}</div>
                                                            <div style={{ fontSize: '0.66rem', color: `${ac}35` }}>{n2.fecha} {n2.hora}</div>
                                                        </div>
                                                        {!n2.leido && <span style={{ width: 6, height: 6, borderRadius: '50%', background: c1, flexShrink: 0, marginTop: 4 }} />}
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {perfil && PANEL_POR_ROL[perfil.rol] && (
                            <button onClick={() => navigate(PANEL_POR_ROL[perfil.rol].ruta)} style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                background: `linear-gradient(90deg, ${c1}18, ${c2}12)`,
                                border: `1px solid ${c1}45`, color: ac,
                                padding: '0.3rem 0.72rem', borderRadius: 999,
                                cursor: 'pointer', fontSize: '0.77rem', fontWeight: 600, transition: 'all 0.15s',
                            }}>
                                {PANEL_POR_ROL[perfil.rol].icono} {PANEL_POR_ROL[perfil.rol].label}
                            </button>
                        )}
                        <PerfilIndicador />
                        <button className="nav-hamburger" onClick={() => setMenuMovil(v => !v)} style={{
                            display: 'none', background: 'none', border: `1px solid ${c1}40`,
                            borderRadius: 8, padding: '0.4rem 0.55rem', cursor: 'pointer',
                            color: '#e2e8f0', fontSize: '1.1rem', lineHeight: 1,
                        }}>{menuMovil ? '✕' : '☰'}</button>
                    </div>
                </nav>

                {/* Menú móvil */}
                {menuMovil && (
                    <div className="nav-movil-menu" style={{
                        position: 'sticky', top: 76, zIndex: 49,
                        background: `${bg}f8`, backdropFilter: 'blur(16px)',
                        borderBottom: `1px solid ${c1}30`,
                        padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem',
                    }}>
                        <div style={{ padding: '0.25rem 0.5rem', border: `1px solid ${c1}40`, borderRadius: 8, background: `${c1}10`, alignSelf: 'flex-start' }}>
                            <RelojDigital size="small" />
                        </div>
                        {['Empresas', 'Nosotros', 'Permisos', 'Emergencias'].map(l => (
                            <button key={l} onClick={() => { navigate('/'); setMenuMovil(false); }} style={{ ...navLinkStyle, textAlign: 'left', width: '100%' }}>{l}</button>
                        ))}
                        <button onClick={() => { navigate('/planear-viaje'); setMenuMovil(false); }} style={{
                            background: `linear-gradient(135deg, ${n.primary || c1}, ${n.secondary || c2})`,
                            color: n.primaryText || '#fff', border: 'none', borderRadius: 999,
                            padding: '0.6rem 1.2rem', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700, alignSelf: 'flex-start',
                        }}>🎫 Haz tu reserva</button>
                    </div>
                )}

            </div>{/* end nav wrapper */}

            {/* ── BLOQUE IMAGEN — igual que hero en Inicio.js ── */}
            <div style={{ position: 'relative', overflow: 'hidden', minHeight: 'calc(100vh - 76px)' }}>
                {/* Capa trasera — siguiente preloadada, solo transiciona al entrar */}
                <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(/fondos/${FONDOS[(bgIdx + 1) % FONDOS.length]})`, backgroundSize: 'cover', backgroundPosition: 'center 10%', backgroundRepeat: 'no-repeat', opacity: bgFading ? 0.82 : 0, filter: 'blur(5px)', transition: bgFading ? 'opacity 1.2s ease-in-out' : 'none' }} />
                {/* Capa frontal — actual, solo transiciona al salir */}
                <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(/fondos/${FONDOS[bgIdx]})`, backgroundSize: 'cover', backgroundPosition: 'center 10%', backgroundRepeat: 'no-repeat', opacity: bgFading ? 0 : 0.82, filter: 'blur(5px)', transition: bgFading ? 'opacity 1.2s ease-in-out' : 'none' }} />
                {/* Overlay oscuro para contraste */}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,17,31,0.62)' }} />
                <div style={{ position: 'relative' }}>

                    {/* ── Título centrado ── */}
                    <div className="pv-titulo" style={{ textAlign: 'center', padding: '0.6rem 1rem 0.3rem' }}>
                        <div className="pv-titulo-pill" style={{
                            display: 'inline-block',
                            background: 'rgba(7,17,31,0.52)',
                            backdropFilter: 'blur(14px)',
                            borderRadius: 24,
                            padding: '0.4rem 1.8rem',
                            ...neonPill,
                        }}>
                            <div className="pv-titulo-txt" style={{ fontSize: 'clamp(1rem,2.5vw,1.3rem)', fontWeight: 900, color: '#e2e8f0', letterSpacing: '-0.02em' }}>
                                🗺️ Planear Viaje
                            </div>
                        </div>
                    </div>

                    {/* ── Barra de progreso ── */}
                    <div className="pv-stepper" style={{ padding: '0.3rem clamp(1rem,5vw,2rem) 0.5rem', display: 'flex', justifyContent: 'center' }}>
                        <div style={{
                            width: '100%', maxWidth: 560,
                            background: 'rgba(7,17,31,0.52)',
                            backdropFilter: 'blur(14px)',
                            borderRadius: 16,
                            padding: '0.85rem 1.5rem',
                            ...neonPill,
                        }}>
                            {/* Contenedor relativo — altura fija para que la línea quede al centro de los círculos */}
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start' }}>
                                {/* Línea fondo: desde centro del 1er círculo hasta centro del último */}
                                <div style={{
                                    position: 'absolute', top: 14, zIndex: 0,
                                    left: `${100 / (PASOS.length * 2)}%`,
                                    right: `${100 / (PASOS.length * 2)}%`,
                                    height: 2, background: '#1e293b',
                                }} />
                                {/* Línea progreso */}
                                <div style={{
                                    position: 'absolute', top: 14, zIndex: 1,
                                    left: `${100 / (PASOS.length * 2)}%`,
                                    height: 2, background: compColor.barraColor,
                                    transition: 'width 0.4s ease',
                                    width: `${Math.max(0, (paso - 1) / (PASOS.length - 1)) * (100 - 100 / PASOS.length)}%`,
                                }} />

                                {PASOS.map((p) => {
                                    const completado = paso > p.id;
                                    const activo = paso === p.id;
                                    const clickeable = completado; // solo pasos ya completados
                                    return (
                                        <div key={p.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                                            <button
                                                onClick={() => irAPaso(p.id)}
                                                disabled={!clickeable}
                                                title={clickeable ? `Volver a ${p.label}` : undefined}
                                                style={{
                                                    width: 28, height: 28, borderRadius: '50%',
                                                    background: completado ? tema.color : activo ? `${tema.color}30` : '#1e293b',
                                                    border: `2px solid ${completado || activo ? tema.color : '#334155'}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '0.72rem', fontWeight: 700,
                                                    color: completado ? '#fff' : activo ? tema.acento : '#475569',
                                                    transition: 'all 0.3s',
                                                    cursor: clickeable ? 'pointer' : 'default',
                                                    padding: 0,
                                                    outline: 'none',
                                                }}
                                                onMouseEnter={e => { if (clickeable) { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.boxShadow = `0 0 10px ${tema.color}80`; } }}
                                                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                                            >
                                                {completado ? '✓' : p.id}
                                            </button>
                                            <span className="pv-step-label" style={{
                                                fontSize: '0.65rem',
                                                color: activo ? tema.acento : completado ? '#94a3b8' : '#334155',
                                                marginTop: '0.35rem', fontWeight: activo ? 700 : 400,
                                                cursor: clickeable ? 'pointer' : 'default',
                                            }}
                                                onClick={() => irAPaso(p.id)}>
                                                {p.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="pv-seccion" style={s.seccion}>

                        {/* ── Layout: Mapa izq + Contenido der ── */}
                        <div className="pv-grid" style={{ display: 'grid', gridTemplateColumns: paso <= 3 ? '1fr 1fr' : '1fr', gap: '1.25rem', alignItems: 'flex-start' }}>

                            {/* Mapa — visible en pasos 1-3 */}
                            {paso <= 3 && (
                                <div>
                                    <div className="pv-mapa-card" style={{ background: '#0b1628', border: `1px solid ${tema.color}20`, borderRadius: 16, padding: '0.75rem' }}>
                                        <div className="pv-mapa-inner" style={{ width: '87%', margin: '0 auto' }}>
                                        <div style={{ fontSize: '0.75rem', color: tema.acento, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                                            {mensajesMapa[paso] || ''}
                                        </div>
                                        <MapaBolivia
                                            modoMulti
                                            origen={origen}
                                            destino={destino}
                                            linea={linea}
                                            onSelect={paso === 1 ? handleSelectOrigen : paso === 2 ? handleSelectDestino : undefined}
                                        />
                                        </div>{/* end scale wrapper */}
                                    </div>
                                </div>
                            )}

                            {/* Panel derecho */}
                            <div className="pv-panel" style={{ background: 'rgba(7,17,31,0.72)', backdropFilter: 'blur(12px)', borderRadius: 16, padding: '1rem', border: '1px solid rgba(255,255,255,0.06)' }}>

                                {/* Paso 1 — instrucción */}
                                {paso === 1 && (
                                    <div style={{ paddingTop: '2rem' }}>
                                        <h2 style={{ color: '#e2e8f0', fontWeight: 800, fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                                            ¿Desde dónde viajas?
                                        </h2>
                                        <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.65 }}>
                                            Haz click en tu departamento de <strong style={{ color: '#22c55e' }}>origen</strong> en el mapa.
                                            Bolivia tiene 9 departamentos con servicio de terminal interprovincial.
                                        </p>
                                        <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {Object.entries(DEPARTAMENTOS).map(([nombre, info]) => (
                                                <button key={nombre} onClick={() => handleSelectOrigen(nombre)} style={{
                                                    background: `${info.color}15`, border: `1px solid ${info.color}40`,
                                                    color: info.acento, padding: '0.3rem 0.7rem', borderRadius: 20,
                                                    cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.15s',
                                                }}
                                                    onMouseEnter={e => e.currentTarget.style.background = `${info.color}30`}
                                                    onMouseLeave={e => e.currentTarget.style.background = `${info.color}15`}>
                                                    {info.emoji} {nombre}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Paso 2 — destino */}
                                {paso === 2 && (
                                    <div style={{ paddingTop: '1rem' }}>
                                        <h2 style={{ color: '#e2e8f0', fontWeight: 800, fontSize: '1.4rem', marginBottom: '0.5rem' }}>
                                            ¿A dónde vas?
                                        </h2>
                                        <p style={{ color: '#475569', fontSize: '0.88rem', lineHeight: 1.65, marginBottom: '1.25rem' }}>
                                            Selecciona tu departamento de <strong style={{ color: '#f59e0b' }}>destino</strong> en el mapa.
                                        </p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {Object.entries(DEPARTAMENTOS).filter(([n]) => n !== origen).map(([nombre, info]) => (
                                                <button key={nombre} onClick={() => handleSelectDestino(nombre)} style={{
                                                    background: `${info.color}15`, border: `1px solid ${info.color}40`,
                                                    color: info.acento, padding: '0.3rem 0.7rem', borderRadius: 20,
                                                    cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.15s',
                                                }}
                                                    onMouseEnter={e => e.currentTarget.style.background = `${info.color}30`}
                                                    onMouseLeave={e => e.currentTarget.style.background = `${info.color}15`}>
                                                    {info.emoji} {nombre}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Paso 3 — Fecha + mapa con línea */}
                                {paso === 3 && (
                                    <div style={{ paddingTop: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                                            <button onClick={resetOrigen} style={{ background: '#22c55e15', border: '1px solid #22c55e30', color: '#22c55e', borderRadius: 20, padding: '0.2rem 0.65rem', cursor: 'pointer', fontSize: '0.78rem' }}>
                                                {DEPARTAMENTOS[origen]?.emoji} {origen} ✕
                                            </button>
                                            <span style={{ color: '#475569', alignSelf: 'center' }}>→</span>
                                            <button onClick={resetDestino} style={{ background: '#f59e0b15', border: '1px solid #f59e0b30', color: '#f59e0b', borderRadius: 20, padding: '0.2rem 0.65rem', cursor: 'pointer', fontSize: '0.78rem' }}>
                                                {DEPARTAMENTOS[destino]?.emoji} {destino} ✕
                                            </button>
                                        </div>
                                        <h2 style={{ color: '#e2e8f0', fontWeight: 800, fontSize: '1.4rem', marginBottom: '0.5rem' }}>
                                            ¿Qué día viajas?
                                        </h2>
                                        <p style={{ color: '#475569', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                                            Selecciona la fecha de salida.
                                        </p>
                                        <Calendario onSelect={setFecha} tema={tema} />
                                    </div>
                                )}

                                {/* Paso 4 — Empresas */}
                                {paso === 4 && (
                                    <div>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                                            {[
                                                { label: `${DEPARTAMENTOS[origen]?.emoji} ${origen}`, reset: resetOrigen, color: '#22c55e' },
                                                { label: `→ ${DEPARTAMENTOS[destino]?.emoji} ${destino}`, reset: resetDestino, color: '#f59e0b' },
                                                { label: `📅 ${fecha}`, reset: resetFecha, color: '#60a5fa' },
                                            ].map(b => (
                                                <button key={b.label} onClick={b.reset} style={{ background: `${b.color}12`, border: `1px solid ${b.color}30`, color: b.color, borderRadius: 20, padding: '0.2rem 0.65rem', cursor: 'pointer', fontSize: '0.75rem' }}>
                                                    {b.label} ✕
                                                </button>
                                            ))}
                                        </div>
                                        <h2 style={{ color: '#e2e8f0', fontWeight: 800, fontSize: '1.3rem', marginBottom: '1rem' }}>
                                            Elige tu empresa
                                        </h2>
                                        {companias.length === 0 ? (
                                            <div style={{ color: '#475569', padding: '2rem', background: '#0b1628', borderRadius: 12, textAlign: 'center' }}>
                                                Sin empresas para esta ruta. Prueba otro origen o destino.
                                            </div>
                                        ) : (
                                            <div className="pv-empresa-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.65rem' }}>
                                                {companias.map((c, i) => {
                                                    const medalEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                                                    return (
                                                        <div key={c.id} onClick={() => setEmpresa(c)} style={{
                                                            background: `linear-gradient(135deg, ${c.colorAccent}14, #0b1628)`,
                                                            border: `1px solid ${c.colorAccent}45`,
                                                            borderTop: `3px solid ${c.colorAccent}`,
                                                            borderRadius: 14, padding: '0.85rem 0.6rem',
                                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                                                            cursor: 'pointer', transition: 'all 0.18s',
                                                            boxShadow: `0 2px 16px ${c.colorAccent}18`,
                                                            position: 'relative',
                                                        }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${c.colorAccent}28, #0b1628)`; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 6px 24px ${c.colorAccent}40`; }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${c.colorAccent}14, #0b1628)`; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 2px 16px ${c.colorAccent}18`; }}>

                                                            {medalEmoji && (
                                                                <span style={{ position: 'absolute', top: 6, right: 8, fontSize: '0.85rem' }}>{medalEmoji}</span>
                                                            )}

                                                            <div className="pv-empresa-logo" style={{ width: 56, height: 56, borderRadius: 12, background: '#ffffff', border: `2px solid ${c.colorAccent}80`, boxShadow: `0 0 10px ${c.colorAccent}45`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                                {getEmpresaLogo(c.nombre)
                                                                    ? <img src={getEmpresaLogo(c.nombre)} alt={c.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                                    : <div style={{ fontSize: '1.8rem', lineHeight: 1 }}>{c.logoEmoji || '🚌'}</div>
                                                                }
                                                            </div>

                                                            <div style={{ fontWeight: 700, color: '#f8f4f0', fontSize: '0.72rem', textAlign: 'center', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{c.nombre}</div>
                                                            <div style={{ color: '#d97706', fontSize: '0.65rem' }}>{STARS(c.ranking)} <span style={{ color: '#475569', fontSize: '0.6rem' }}>{c.ranking?.toFixed ? c.ranking.toFixed(1) : c.ranking}</span></div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Paso 5 — Salidas */}
                                {paso === 5 && (
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${empresa.colorAccent}18`, border: `1px solid ${empresa.colorAccent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                                                {empresa.logoEmoji}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#e2e8f0' }}>{empresa.nombre}</div>
                                                <button onClick={resetEmpresa} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '0.72rem', padding: 0 }}>← Cambiar empresa</button>
                                            </div>
                                        </div>

                                        <h2 style={{ color: '#e2e8f0', fontWeight: 800, fontSize: '1.3rem', marginBottom: '0.5rem' }}>
                                            Horarios disponibles
                                        </h2>
                                        <p style={{ color: '#475569', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
                                            {origen} → {destino} · {fecha}
                                        </p>

                                        {/* Reloj para referencia */}
                                        <div style={{ marginBottom: '1rem' }}>
                                            <RelojDigital size="small" />
                                        </div>

                                        {salidas.length === 0 ? (
                                            <div style={{ color: '#475569', padding: '2rem', background: '#0b1628', borderRadius: 12, textAlign: 'center' }}>
                                                Sin salidas disponibles para esta combinación.
                                            </div>
                                        ) : (
                                            <div className="pv-salidas" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '45vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
                                                {salidas.map(v => {
                                                    const pasado = esPasadaHora(v.salida);
                                                    const hora = new Date(v.salida).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
                                                    return (
                                                        <div key={v.id}
                                                            onClick={() => !pasado && navigate(`/reserva/${v.id}`)}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: '1rem',
                                                                background: pasado ? '#07111f' : '#0b1628',
                                                                border: `1px solid ${pasado ? '#1e293b' : tema.color + '30'}`,
                                                                borderRadius: 10, padding: '0.9rem 1.1rem',
                                                                cursor: pasado ? 'not-allowed' : 'pointer',
                                                                opacity: pasado ? 0.45 : 1, transition: 'all 0.15s',
                                                            }}
                                                            onMouseEnter={e => { if (!pasado) { e.currentTarget.style.background = `${tema.color}10`; e.currentTarget.style.borderColor = tema.color; } }}
                                                            onMouseLeave={e => { if (!pasado) { e.currentTarget.style.background = '#0b1628'; e.currentTarget.style.borderColor = `${tema.color}30`; } }}>

                                                            <div style={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 800, color: pasado ? '#334155' : tema.acento, minWidth: 70 }}>
                                                                {hora}
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ color: pasado ? '#334155' : '#94a3b8', fontSize: '0.82rem' }}>
                                                                    {v.origen} → {v.destino}
                                                                </div>
                                                                <div style={{ color: '#475569', fontSize: '0.72rem' }}>
                                                                    Duración: {v.duracion_estimada || 'N/D'}
                                                                </div>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <div style={{ color: pasado ? '#334155' : '#22c55e', fontWeight: 800, fontSize: '1rem' }}>
                                                                    Bs {v.precio}
                                                                </div>
                                                                {pasado
                                                                    ? <span style={{ fontSize: '0.65rem', color: '#334155', background: '#1e293b', borderRadius: 4, padding: '0.1rem 0.4rem' }}>Salió</span>
                                                                    : <span style={{ fontSize: '0.7rem', color: tema.acento }}>Reservar →</span>
                                                                }
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                </div>{/* end contenido relativo */}
            </div>{/* end bloque imagen */}
        </div>
    );
};

export default PlanearViaje;
