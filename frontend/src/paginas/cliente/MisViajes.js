import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import { useDepartamento } from '../../contextos/DepartamentoContext';
import { obtenerBoletos, obtenerReservas } from '../../data/mockStorage';
import { getReservasByUsuario, updateReservaEstado } from '../../servicios/api';
import { QRCodeSVG } from 'qrcode.react';
import TicketCard, { getTemaEmpresa, getLogoEmpresa } from '../../componentes/TicketCard';

const FONT = "'Inter', 'Rajdhani', system-ui, sans-serif";


// ── Paleta por empresa ────────────────────────────────────────────────────
const EMPRESA_PALETAS = [
    { dark: "#131C16", light: "#4CD964", accent: "#FFD700", border: "rgba(76,217,100,0.45)"   }, // Andino
    { dark: "#1C1414", light: "#E53935", accent: "#FFFFFF", border: "rgba(211,47,47,0.45)"    }, // Atlas
    { dark: "#101423", light: "#4FC3F7", accent: "#FFD700", border: "rgba(79,195,247,0.45)"   }, // Bolívar
    { dark: "#1C1515", light: "#EF5350", accent: "#F8F9FA", border: "rgba(227,30,36,0.45)"    }, // Copacabana
    { dark: "#1A1513", light: "#FF6B00", accent: "#FFD700", border: "rgba(255,107,0,0.45)"    }, // Cosmos
    { dark: "#1A1915", light: "#D4AF37", accent: "#FFFFFF", border: "rgba(212,175,55,0.45)"   }, // El Dorado
    { dark: "#131621", light: "#5C8AE6", accent: "#D4AF37", border: "rgba(46,92,184,0.45)"    }, // Emperador
    { dark: "#141A15", light: "#66BB6A", accent: "#F5F5DC", border: "rgba(76,175,80,0.45)"    }, // Illimani
    { dark: "#111111", light: "#D4AF37", accent: "#FF8C00", border: "rgba(212,175,55,0.45)"   }, // Imperial
    { dark: "#11141D", light: "#4A90D9", accent: "#FFFFFF", border: "rgba(0,86,179,0.45)"     }, // Naser
];

const EMPRESA_KEYS = ["andino","atlas","bolívar","copacabana","cosmos","el dorado","emperador","illimani","imperial","naser"];

const hashStr = (s) => (s || '').split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xffff, 0);

const getColoresCard = (nombreEmpresa, reservaId) => {
    // Try exact + fuzzy keyword match
    const n = (nombreEmpresa || '').toLowerCase();
    const idx = EMPRESA_KEYS.findIndex(k => n.includes(k));
    if (idx >= 0) return EMPRESA_PALETAS[idx];
    // Deterministic fallback based on reservaId
    return EMPRESA_PALETAS[hashStr(reservaId) % EMPRESA_PALETAS.length];
};

// ── Skins boletos ─────────────────────────────────────────────────────────
const SKINS = {
    infante:   { border: '#7c3aed', dash: false, bg: 'linear-gradient(135deg,#1e1035,#2d1a5e)', accent: '#c4b5fd', icon: '🍼', label: 'Menor de edad',  watermark: '🍼', ribbonBg: '#7c3aed', ribbonText: '#ede9fe' },
    animal:    { border: '#15803d', dash: true,  bg: 'linear-gradient(135deg,#052e16,#14532d)', accent: '#86efac', icon: '🐾', label: 'Con animales',    watermark: '🐾', ribbonBg: '#15803d', ribbonText: '#dcfce7' },
    dinero:    { border: '#b45309', dash: false, bg: 'linear-gradient(135deg,#1c1002,#431a00)', accent: '#fcd34d', icon: '💰', label: 'Valor declarado', watermark: '💰', ribbonBg: '#b45309', ribbonText: '#fef3c7' },
    productos: { border: '#c2410c', dash: true,  bg: 'linear-gradient(135deg,#1c0a02,#431000)', accent: '#fdba74', icon: '🥡', label: 'Con productos',   watermark: '🥡', ribbonBg: '#c2410c', ribbonText: '#ffedd5' },
    normal:    { border: null,     dash: false, bg: null,                                      accent: null,      icon: '🎫', label: null,               watermark: null, ribbonBg: null,     ribbonText: null     },
};
const getTipo = (b) => b.esInfante ? 'infante' : b.lleva1000 ? 'dinero' : b.llevaAnimales ? 'animal' : b.llevaProductos ? 'productos' : 'normal';

// ── Countdown ─────────────────────────────────────────────────────────────
const useCountdown = (expiraEn) => {
    const [ms, setMs] = useState(() => expiraEn ? expiraEn - Date.now() : 0);
    useEffect(() => {
        if (!expiraEn) return;
        const t = setInterval(() => setMs(expiraEn - Date.now()), 1000);
        return () => clearInterval(t);
    }, [expiraEn]);
    return ms;
};
const fmtMs = (ms) => {
    if (ms <= 0) return 'Expirado';
    const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m ${String(s % 60).padStart(2, '0')}s`;
};

// ── BoletoCard ────────────────────────────────────────────────────────────
const BoletoCard = ({ b, col, onEmail, emailEnviado }) => {
    const tipo   = getTipo(b);
    const sk     = SKINS[tipo];
    const border = sk.border || col.light;
    const accent = sk.accent || col.accent;
    const bg     = sk.bg     || `linear-gradient(135deg, ${col.dark}, ${col.dark}cc)`;
    const qrVal  = JSON.stringify({ id: b.id, pasajero: b.pasajeroNombre, ci: b.pasajeroCI, asiento: b.asiento, origen: b.origen, destino: b.destino, salida: b.fechaSalida, bus: b.busPlaca, tipo });
    return (
        <div style={{ background: bg, border: `2px ${sk.dash ? 'dashed' : 'solid'} ${border}`, borderRadius: 14, padding: '0.85rem', display: 'flex', gap: '0.85rem', alignItems: 'stretch', minWidth: 250, position: 'relative', overflow: 'hidden', boxShadow: `0 0 18px ${border}30` }}>
            {sk.watermark && <div style={{ position: 'absolute', right: -6, top: '50%', transform: 'translateY(-50%)', fontSize: '5rem', opacity: 0.07, pointerEvents: 'none' }}>{sk.watermark}</div>}
            {sk.ribbonBg && (
                <div style={{ position: 'absolute', top: 10, right: -24, background: sk.ribbonBg, color: sk.ribbonText, fontSize: '0.48rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: FONT, padding: '0.18rem 2.2rem', transform: 'rotate(40deg)', boxShadow: `0 2px 8px ${border}60` }}>
                    {sk.icon} {sk.label}
                </div>
            )}
            <div style={{ background: 'white', padding: 5, borderRadius: 8, border: `2px solid ${accent}`, flexShrink: 0, alignSelf: 'flex-start' }}>
                <QRCodeSVG value={qrVal} size={62} />
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ color: accent, fontWeight: 900, fontSize: '1.1rem', fontFamily: FONT }}># {b.asiento}</span>
                    <span>{sk.icon}</span>
                </div>
                <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.76rem', fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.pasajeroNombre}</div>
                <div style={{ color: '#64748b', fontSize: '0.62rem', fontFamily: FONT, letterSpacing: '0.08em', textTransform: 'uppercase' }}>CI {b.pasajeroCI}</div>
                {tipo !== 'normal' && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.22rem', background: border + '28', border: `1px solid ${border}55`, color: accent, padding: '0.1rem 0.38rem', borderRadius: 4, fontSize: '0.56rem', fontWeight: 800, fontFamily: FONT, letterSpacing: '0.1em', textTransform: 'uppercase', alignSelf: 'flex-start', marginTop: '0.1rem' }}>
                        {sk.icon} {sk.label}
                    </div>
                )}
                <button onClick={() => onEmail(b)} style={{ marginTop: '0.3rem', background: emailEnviado ? accent + '22' : 'transparent', border: `1px solid ${border}45`, color: emailEnviado ? accent : accent + 'aa', borderRadius: 6, padding: '0.2rem 0.45rem', cursor: 'pointer', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: FONT, transition: 'all 0.15s', alignSelf: 'flex-start' }}>
                    {emailEnviado ? '✓ Enviado' : '✉ Enviar correo'}
                </button>
            </div>
        </div>
    );
};

// ── TarjetaReserva ────────────────────────────────────────────────────────
const TicketMini = ({ boleto, nombreEmpresa, onExpand }) => {
    const te      = getTemaEmpresa(nombreEmpresa);
    const logoSrc = getLogoEmpresa(nombreEmpresa);
    const W = 600, H = 360, SCALE = 0.36;
    return (
        <div
            onClick={onExpand}
            title="Ver boleto completo"
            style={{ width: W * SCALE, height: H * SCALE, overflow: 'hidden', borderRadius: 24 * SCALE, cursor: 'pointer', flexShrink: 0, position: 'relative', boxShadow: '0 2px 12px rgba(0,0,0,0.35)', transition: 'transform 0.15s', }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
            <div style={{ width: W, height: H, transform: `scale(${SCALE})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
                <TicketCard boleto={boleto} te={te} logoSrc={logoSrc} empresaNombre={nombreEmpresa} />
            </div>
        </div>
    );
};

const TicketModalFullscreen = ({ boleto, nombreEmpresa, onClose }) => {
    const te      = getTemaEmpresa(nombreEmpresa);
    const logoSrc = getLogoEmpresa(nombreEmpresa);
    return (
        <div
            style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={onClose}
        >
            <div style={{ width: '100%', maxWidth: 640, position: 'relative' }} onClick={e => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: -16, right: -16, zIndex: 10, background: '#dc2626', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(220,38,38,0.5)' }}
                >✕</button>
                <TicketCard boleto={boleto} te={te} logoSrc={logoSrc} empresaNombre={nombreEmpresa} />
            </div>
        </div>
    );
};

const TarjetaReserva = ({ reserva, ahora, tema, onCancelar }) => {
    const navigate = useNavigate();
    const [expandido, setExpandido] = useState(false);
    const [emailEnv,  setEmailEnv]  = useState({});
    const [boletoExpandido, setBoletoExpandido] = useState(null);
    const ms = useCountdown(reserva.expiraEn);

    const pendiente  = reserva.estado === 'pendiente_documentos' || reserva.estado === 'pendiente_efectivo';
    const completado = new Date(reserva.fechaSalida) < ahora && reserva.estado !== 'cancelada';
    const cancelada  = reserva.estado === 'cancelada';

    // Empresa viene directo de Supabase
    const rawNombre = reserva.sucursalNombre || null;
    const nombreEmpresa = (rawNombre && rawNombre !== 'Empresa') ? rawNombre : null;
    const deptEmpresa   = null;

    // Colores de empresa — siempre definidos (fallback hash)
    const col = getColoresCard(nombreEmpresa, reserva.id);

    const bls = obtenerBoletos(reserva.id);
    const handleEmail = (b) => {
        setEmailEnv(p => ({ ...p, [b.id]: true }));
        setTimeout(() => setEmailEnv(p => ({ ...p, [b.id]: false })), 3000);
    };

    // Estado badge
    const est = (() => {
        if (cancelada)                                 return { label: 'Cancelada',    bg: '#7f1d1d',        color: '#fca5a5' };
        if (reserva.estado === 'pendiente_documentos') return { label: 'Pend. cajero', bg: '#4c1d95',        color: '#c4b5fd' };
        if (reserva.estado === 'pendiente_efectivo')   return { label: 'Pend. pago',   bg: col.dark,         color: col.light };
        if (new Date(reserva.fechaSalida) > ahora)     return { label: 'Próximo',       bg: col.light + '22', color: col.light };
        return                                                { label: 'Completado',   bg: col.light + '18', color: col.accent };
    })();

    return (
        <div style={{
            borderRadius: 16,
            border: `1.5px solid ${cancelada ? '#7f1d1d' : col.border}`,
            overflow: 'hidden',
            boxShadow: `0 4px 32px ${col.light}18, 0 0 0 1px ${col.light}08`,
            background: col.dark,
        }}>
            {/* ── Header empresa + ruta ── */}
            <div style={{
                padding: '0.75rem 1.2rem',
                background: `linear-gradient(90deg, ${col.light}18 0%, ${col.light}08 100%)`,
                borderBottom: `1px solid ${col.border}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem',
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.18rem' }}>
                    {/* nombre empresa */}
                    <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: FONT, color: col.accent, opacity: 0.85 }}>
                        {nombreEmpresa || 'Terminal Buses Bolivia'}{deptEmpresa ? ` · ${deptEmpresa}` : ''}
                    </div>
                    {/* ruta */}
                    <div style={{ fontWeight: 900, fontSize: '1.05rem', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: FONT, color: col.light, textShadow: `0 0 20px ${col.light}60` }}>
                        {reserva.origen} <span style={{ color: col.accent, opacity: 0.7 }}>→</span> {reserva.destino}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {pendiente && reserva.expiraEn && (
                        <span style={{ background: ms < 120000 ? '#7f1d1d' : col.light + '20', color: ms < 120000 ? '#fca5a5' : col.light, border: `1px solid ${ms < 120000 ? '#991b1b' : col.border}`, padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: FONT }}>
                            ⏱ {fmtMs(ms)}
                        </span>
                    )}
                    <span style={{ background: est.bg, color: est.color, padding: '0.22rem 0.75rem', borderRadius: 999, fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: FONT, border: `1px solid ${est.color}30` }}>
                        {est.label}
                    </span>
                </div>
            </div>

            {/* ── Grid detalles ── */}
            <div style={{ padding: '0.9rem 1.2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', background: `${col.light}05` }}>
                {[
                    { label: 'Salida',     valor: reserva.fechaSalida ? new Date(reserva.fechaSalida).toLocaleString('es-BO') : '—', hl: true },
                    { label: 'Asientos',   valor: reserva.asientos?.join(', ') || '—' },
                    { label: 'Bus',        valor: reserva.busPlaca || '—' },
                    { label: 'Monto',      valor: `Bs ${reserva.precio || 0}`, hl: true },
                    { label: 'Método',     valor: reserva.metodoPago || 'efectivo' },
                    { label: 'ID Reserva', valor: (reserva.id || '').slice(0, 12) + '...' },
                ].map(item => (
                    <div key={item.label}>
                        <div style={{ fontSize: '0.57rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: col.accent + '70', fontFamily: FONT, marginBottom: '0.12rem' }}>{item.label}</div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 700, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.04em', color: item.hl ? col.light : col.accent, textShadow: item.hl ? `0 0 12px ${col.light}40` : 'none' }}>{item.valor}</div>
                    </div>
                ))}
            </div>

            {/* ── Acciones ── */}
            <div style={{ padding: '0.65rem 1.2rem', borderTop: `1px solid ${col.light}12`, display: 'flex', gap: '0.4rem', flexWrap: 'wrap', background: `${col.light}06` }}>
                {pendiente && (
                    <button onClick={() => navigate(`/reserva/${reserva.viajeId}`)}
                        style={{ background: `${col.light}22`, border: `1px solid ${col.border}`, color: col.light, borderRadius: 8, padding: '0.38rem 0.85rem', cursor: 'pointer', fontSize: '0.67rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: FONT, boxShadow: `0 0 10px ${col.light}20` }}>
                        🎫 Completar pago
                    </button>
                )}
                {pendiente && (
                    <button onClick={() => onCancelar(reserva.id)}
                        style={{ background: '#7f1d1d30', border: '1px solid #991b1b60', color: '#fca5a5', borderRadius: 8, padding: '0.38rem 0.85rem', cursor: 'pointer', fontSize: '0.67rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: FONT }}>
                        ✕ Cancelar
                    </button>
                )}
                {bls.length > 0 && !completado && (
                    <button onClick={() => setExpandido(v => !v)}
                        style={{ background: expandido ? col.light + '20' : 'transparent', border: `1px solid ${col.light}35`, color: col.light, borderRadius: 8, padding: '0.38rem 0.85rem', cursor: 'pointer', fontSize: '0.67rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: FONT }}>
                        {expandido ? '▲ Ocultar' : `▼ Boletos (${bls.length})`}
                    </button>
                )}
            </div>

            {/* ── Boletos expandidos ── */}
            {expandido && !completado && bls.length > 0 && (
                <div style={{ padding: '0 1.2rem 1.2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', background: col.dark, justifyContent: 'center' }}>
                    {bls.map(b => (
                        <TicketMini key={b.id} boleto={b} nombreEmpresa={nombreEmpresa} onExpand={() => setBoletoExpandido(b)} />
                    ))}
                </div>
            )}

            {/* ── Modal fullscreen boleto ── */}
            {boletoExpandido && (
                <TicketModalFullscreen boleto={boletoExpandido} nombreEmpresa={nombreEmpresa} onClose={() => setBoletoExpandido(null)} />
            )}

            {/* ── Calificar ── */}
            {completado && !cancelada && (
                <div style={{ padding: '0 1.2rem 0.9rem' }}>
                    <button
                        onClick={() => navigate(`/sucursal/${reserva.sucursalId || suc?.id}`, { state: { departamento: deptEmpresa } })}
                        style={{ width: '100%', padding: '0.55rem', background: `${col.light}18`, border: `1px solid ${col.border}`, color: col.light, borderRadius: 10, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: FONT, transition: 'all 0.15s', textShadow: `0 0 10px ${col.light}50` }}
                        onMouseEnter={e => { e.currentTarget.style.background = col.light + '28'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = col.light + '18'; e.currentTarget.style.transform = 'none'; }}
                    >
                        ⭐ Califica este viaje · {nombreEmpresa || 'Terminal Buses'}
                    </button>
                </div>
            )}
        </div>
    );
};

// ── Página ────────────────────────────────────────────────────────────────
const MisViajes = () => {
    const navigate = useNavigate();
    const { perfil, sesion } = useAuth();
    const { tema, departamento } = useDepartamento();
    const [reservas, setReservas] = useState([]);
    const [filtro,   setFiltro]   = useState('todos');
    const [busqueda, setBusqueda] = useState('');
    const ahora = new Date();

    const cargar = useCallback(async () => {
        // Supabase
        const remota = perfil?.id ? await getReservasByUsuario(perfil.id) : [];
        // localStorage — filtrar por CI del perfil
        const local = perfil?.ci
            ? (obtenerReservas() || []).filter(r => r.pasajeroCI === perfil.ci)
            : [];
        // Fusionar sin duplicados por id
        const ids = new Set(remota.map(r => r.id));
        const combinadas = [...remota, ...local.filter(r => !ids.has(r.id))];
        setReservas(combinadas);
    }, [perfil]);

    useEffect(() => {
        if (!sesion || perfil?.rol !== 'cliente') { navigate('/login-cliente?redirect=/mis-viajes'); return; }
        cargar();
        const t = setInterval(cargar, 15000);
        return () => clearInterval(t);
    }, [sesion, perfil, navigate, cargar]);

    const handleCancelar = async (id) => { await updateReservaEstado(id, 'cancelada'); cargar(); };

    const nPend = reservas.filter(r => r.estado === 'pendiente_documentos' || r.estado === 'pendiente_efectivo').length;

    const filtradas = reservas
        .filter(r => {
            if (filtro === 'pendientes') return r.estado === 'pendiente_documentos' || r.estado === 'pendiente_efectivo';
            if (filtro === 'proximos')   return new Date(r.fechaSalida) >= ahora && r.estado !== 'cancelada';
            if (filtro === 'pasados')    return new Date(r.fechaSalida) < ahora;
            return true;
        })
        .filter(r => {
            if (!busqueda) return true;
            const q = busqueda.toLowerCase();
            return r.origen?.toLowerCase().includes(q) || r.destino?.toLowerCase().includes(q) || r.id?.includes(q);
        });

    return (
        <div style={{ minHeight: '100vh', fontFamily: FONT, position: 'relative', overflow: 'hidden', background: tema.bg || '#03090E' }}>

            {/* Fondo */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
                background: `
                    radial-gradient(ellipse 55% 70% at 0% 40%, ${tema.bandera1}30 0%, transparent 65%),
                    radial-gradient(ellipse 55% 70% at 100% 60%, ${tema.bandera2}25 0%, transparent 65%),
                    radial-gradient(ellipse 60% 40% at 50% 0%, ${tema.primary}12 0%, transparent 55%)
                `
            }} />

            <div style={{ position: 'relative', zIndex: 1, maxWidth: 820, margin: '0 auto', padding: '2rem 1rem 3.5rem' }}>

                {/* Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: tema.secondary, fontFamily: FONT, marginBottom: '0.35rem' }}>
                        {tema.emoji} {departamento}
                    </div>
                    <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: FONT, background: `linear-gradient(90deg, ${tema.primary}, ${tema.secondary})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Mis Viajes
                    </h1>
                    <div style={{ color: tema.bandera1 + '80', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: FONT, marginTop: '0.3rem' }}>
                        Historial de {perfil?.nombreCompleto || perfil?.ci}
                    </div>
                </div>

                {/* Búsqueda */}
                <input type="text" placeholder="Buscar por ciudad o ID de reserva..."
                    value={busqueda} onChange={e => setBusqueda(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', background: `${tema.bandera1}12`, border: `1.5px solid ${tema.primary}30`, color: '#f1f5f9', padding: '0.7rem 1rem', borderRadius: 12, fontSize: '0.85rem', marginBottom: '1rem', fontFamily: FONT, letterSpacing: '0.04em', outline: 'none' }}
                />

                {/* Filtros */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
                    {[
                        { id: 'todos',      label: `Todos (${reservas.length})` },
                        { id: 'pendientes', label: `Pendientes${nPend > 0 ? ` (${nPend})` : ''}` },
                        { id: 'proximos',   label: 'Próximos' },
                        { id: 'pasados',    label: 'Pasados' },
                    ].map(f => (
                        <button key={f.id} onClick={() => setFiltro(f.id)} style={{
                            padding: '0.42rem 1.05rem', borderRadius: 999,
                            border: `1.5px solid ${filtro === f.id ? tema.primary : tema.bandera1 + '30'}`,
                            background: filtro === f.id ? `linear-gradient(135deg, ${tema.primary}, ${tema.secondary})` : 'transparent',
                            color: filtro === f.id ? tema.primaryText : tema.bandera1 + 'aa',
                            cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800,
                            letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: FONT,
                            boxShadow: filtro === f.id ? `0 0 14px ${tema.primary}40` : 'none',
                            position: 'relative', transition: 'all 0.15s',
                        }}>
                            {f.label}
                            {f.id === 'pendientes' && nPend > 0 && filtro !== 'pendientes' && (
                                <span style={{ position: 'absolute', top: -5, right: -5, background: tema.alertBg, color: '#fca5a5', borderRadius: '50%', width: 15, height: 15, fontSize: '0.55rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${tema.alertBg}` }}>{nPend}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Lista */}
                {filtradas.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>🗺️</div>
                        <div style={{ color: tema.bandera1 + '70', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.78rem', fontFamily: FONT }}>
                            {busqueda ? 'Sin resultados.' : 'No tienes viajes en este filtro.'}
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                        {filtradas.map(r => (
                            <TarjetaReserva key={r.id} reserva={r} ahora={ahora} tema={tema} onCancelar={handleCancelar} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MisViajes;
