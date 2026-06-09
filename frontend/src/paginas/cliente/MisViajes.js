import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import { useDepartamento, ciudadADepartamento, DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import { getReservasByUsuario, updateReservaEstado, getBoletosReserva } from '../../servicios/api';
import { QRCodeSVG } from 'qrcode.react';
import gsap from 'gsap';
import TicketCard, { getTemaEmpresa, getLogoEmpresa, blendHex, lighten } from '../../componentes/TicketCard';

const FONT = "'Inter', 'Rajdhani', system-ui, sans-serif";


// ── Fecha/hora en grande para escaneo rápido ──────────────────────────────
const fmtFechaGrande = (f) => {
    if (!f) return { fecha: '—', hora: '' };
    const d = new Date(f);
    if (isNaN(d)) return { fecha: '—', hora: '' };
    return {
        fecha: d.toLocaleDateString('es-BO', { weekday: 'short', day: '2-digit', month: 'short' }),
        hora:  d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
    };
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
const TicketMini = ({ boleto, nombreEmpresa, onExpand, vivo = true }) => {
    const te      = getTemaEmpresa(nombreEmpresa);
    const logoSrc = getLogoEmpresa(nombreEmpresa);
    const W = 600, H = 260, SCALE = 0.36;
    return (
        <div
            onClick={onExpand}
            title={vivo ? 'Ver boleto completo' : 'Boleto ya utilizado'}
            style={{ width: W * SCALE, height: H * SCALE, overflow: 'hidden', borderRadius: 24 * SCALE, cursor: 'pointer', flexShrink: 0, position: 'relative', boxShadow: '0 2px 12px rgba(0,0,0,0.35)', transition: 'transform 0.15s, filter 0.2s',
                filter: vivo ? 'none' : 'grayscale(1) brightness(0.72) contrast(0.9)', opacity: vivo ? 1 : 0.78 }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; if (!vivo) e.currentTarget.style.filter = 'grayscale(0.7) brightness(0.85)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; if (!vivo) e.currentTarget.style.filter = 'grayscale(1) brightness(0.72) contrast(0.9)'; }}
        >
            <div style={{ width: W, height: H, transform: `scale(${SCALE})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
                <TicketCard boleto={boleto} te={te} logoSrc={logoSrc} empresaNombre={nombreEmpresa} isMobile={true} />
            </div>
        </div>
    );
};

// Cuadro logo empresa — llena su contenedor (borde a borde). SVG real o emoji de respaldo.
const LogoEmpresa = ({ logoSrc, color, vivo = true }) => (
    <div style={{
        width: '100%', height: '100%',
        background: vivo ? 'linear-gradient(150deg, #ffffff, #dbe2ec)' : 'linear-gradient(150deg, #e2e6ec, #aab3c0)',
        borderRight: `3px solid ${vivo ? color : '#64748b'}`,
        boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.5)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        filter: vivo ? 'none' : 'grayscale(1)',
    }}>
        {logoSrc
            ? <img src={logoSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }} />
            : <span style={{ fontSize: '2.4rem' }}>🚌</span>}
    </div>
);

const TarjetaReserva = ({ reserva, ahora, tema, onCancelar, isMobile = false }) => {
    const navigate = useNavigate();
    const [expandido, setExpandido] = useState(false);
    const ms = useCountdown(reserva.expiraEn);
    const detalleRef = useRef(null);

    // Escala responsiva — más chico en móvil para que entre sin desbordar
    const sz = isMobile
        ? { hpad: '0.8rem 0.85rem', emp: '0.52rem', route: '1.05rem', hora: '1.15rem', fecha: '0.62rem', logoW: 84, gridCols: '1fr 1fr', val: '0.76rem', lbl: '0.5rem', gap: '0.55rem' }
        : { hpad: '1.05rem 1.25rem', emp: '0.62rem', route: '1.35rem', hora: '1.5rem',  fecha: '0.78rem', logoW: 128, gridCols: '1fr 1fr 1fr', val: '0.82rem', lbl: '0.55rem', gap: '0.7rem' };

    const pendiente  = reserva.estado === 'pendiente';
    const completado = new Date(reserva.fechaSalida) < ahora && reserva.estado !== 'cancelado';
    const cancelada  = reserva.estado === 'cancelado';

    // Empresa viene directo de Supabase
    const rawNombre = reserva.sucursalNombre || null;
    const nombreEmpresa = (rawNombre && rawNombre !== 'Empresa') ? rawNombre : null;

    const vivo = !completado && !cancelada; // viaje/boleto aún válido (próximo o pendiente)

    // 2 colores por empresa (c1 oscuro, c2 claro) y por departamento destino (primary claro, secondary).
    const te         = getTemaEmpresa(nombreEmpresa);
    const empDark    = te?.c1 || '#2563eb';
    const empLight   = te?.c2 || '#93c5fd';
    const destTh     = DEPARTAMENTOS[ciudadADepartamento(reserva.destino)];
    const destLight  = destTh?.primary   || lighten(empDark, 0.4);
    const destDark   = destTh?.secondary || empDark;

    // Paleta efectiva — gris si el viaje ya pasó o fue cancelado
    const empresaColor = vivo ? empDark   : '#3f4854';  // oscuro empresa
    const empresaAcc   = vivo ? empLight  : '#9aa3b1';  // claro empresa
    const destClaro    = vivo ? destLight : '#aab3c0';  // claro destino
    const destinoColor = vivo ? destDark  : '#4b5563';  // oscuro destino
    const blend        = blendHex(empresaAcc, destClaro, 0.5);
    const logoSrc      = getLogoEmpresa(nombreEmpresa);

    // Degradés de texto (siempre con los colores claros reales, aunque la tarjeta esté gris)
    const destLight2 = destTh ? lighten(destTh.secondary, 0.18) : lighten(destDark, 0.18);
    const empLight2  = lighten(te?.c3 || empDark, 0.25);
    const gradEmpresa = `linear-gradient(95deg, ${empLight} 0%, ${destLight} 100%)`;
    const gradRuta    = `linear-gradient(100deg, ${empLight} 0%, ${empLight2} 26%, ${destLight} 62%, ${destLight2} 100%)`;
    const gradHora    = `linear-gradient(105deg, ${destLight} 0%, ${destLight2} 100%)`;
    const gradText = (grad) => ({ background: grad, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' });

    const { fecha, hora } = fmtFechaGrande(reserva.fechaSalida);

    const [bls, setBls] = useState([]);
    useEffect(() => {
        if (cancelada) return;
        getBoletosReserva(reserva.id).then(bs => {
            setBls(bs.map(b => ({
                ...b,
                pasajeroNombre: b.pasajeroNombre,
                pasajeroCI:     b.pasajeroCI,
                origen:         reserva.origen,
                destino:        reserva.destino,
                fechaSalida:    reserva.fechaSalida,
                busPlaca:       reserva.busPlaca,
                empresa:        reserva.sucursalNombre,
                reservaId:      reserva.id,
            })));
        });
    }, [reserva.id]); // eslint-disable-line

    // Animación de "construcción" al expandir — cada pieza se arma una por una, suave
    useEffect(() => {
        if (!expandido || !detalleRef.current) return;
        const ctx = gsap.context(() => {
            gsap.fromTo('[data-build]',
                { y: 12, opacity: 0, scale: 0.97 },
                { y: 0, opacity: 1, scale: 1, duration: 0.55, stagger: 0.08, ease: 'power2.out' }
            );
        }, detalleRef);
        return () => ctx.revert();
    }, [expandido]);

    const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

    // Estado badge
    const est = (() => {
        if (cancelada)                             return { label: 'Cancelada',  bg: '#7f1d1d',           color: '#fca5a5' };
        if (pendiente)                             return { label: 'Pendiente',  bg: '#4c1d95',           color: '#c4b5fd' };
        if (new Date(reserva.fechaSalida) > ahora) return { label: 'Próximo',    bg: empresaColor + '30', color: empresaAcc };
        return                                            { label: 'Completado', bg: 'rgba(100,116,139,0.22)', color: '#cbd5e1' };
    })();

    const detalles = [
        { label: 'Asientos',   valor: reserva.asientos?.join(', ') || '—' },
        { label: 'Bus',        valor: reserva.busPlaca || '—' },
        { label: 'Monto',      valor: `Bs ${reserva.precio || 0}`, hl: true },
        { label: 'Método',     valor: reserva.metodoPago || 'efectivo' },
        { label: 'ID Reserva', valor: (reserva.id || '').slice(0, 12) + '…' },
        { label: 'Salida',     valor: reserva.fechaSalida ? new Date(reserva.fechaSalida).toLocaleString('es-BO') : '—' },
    ];

    return (
        <div
            onClick={() => setExpandido(v => !v)}
            style={{
                position: 'relative', borderRadius: 18, overflow: 'hidden', cursor: 'pointer',
                border: `1px solid ${cancelada ? '#7f1d1d' : blend + '66'}`,
                background: '#070d16',
                boxShadow: expandido ? `0 14px 44px ${blend}30` : `0 6px 26px ${empresaColor}1c`,
                transition: 'box-shadow 0.25s ease',
            }}
        >
            {/* Capa diagonal bicolor: empresa (arriba-izq) → destino (abajo-der), con tonos claros */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: `linear-gradient(135deg, ${empresaColor} 0%, ${empresaAcc} 27%, ${blend} 50%, ${destClaro} 73%, ${destinoColor} 100%)`,
                opacity: vivo ? 1 : 0.4,
            }} />
            {/* Plato oscuro solo a la izquierda (detrás de logo+texto); la mitad derecha queda a todo color */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'linear-gradient(100deg, rgba(3,7,13,0.78) 0%, rgba(3,7,13,0.55) 28%, rgba(3,7,13,0.22) 48%, rgba(3,7,13,0) 66%)',
            }} />
            {/* Glow de color: empresa (claro) arriba-izq, destino (claro+oscuro) abajo-der — hace el color evidente */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', opacity: vivo ? 1 : 0.25,
                background: `
                    radial-gradient(120% 130% at 102% 62%, ${destClaro}66 0%, transparent 46%),
                    radial-gradient(95% 130% at 108% 105%, ${destinoColor}77 0%, transparent 52%),
                    radial-gradient(85% 130% at -5% 0%, ${empresaAcc}40 0%, transparent 44%)
                `,
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
                {/* ── Cabecera (siempre visible / estado colapsado) ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: expandido ? (isMobile ? '0.7rem' : '1rem') : '0', padding: sz.hpad }}>
                    {/* Cuadro logo — cuadrado, pegado al borde izquierdo, llena sin bordes blancos. Siempre a color. */}
                    <div style={{
                        width: expandido ? sz.logoW : 0, height: expandido ? sz.logoW : 0,
                        opacity: expandido ? 1 : 0,
                        marginLeft: `calc(-1 * ${sz.hpad.split(' ')[1]})`,
                        transform: expandido ? 'translateX(0)' : 'translateX(-24px)',
                        transition: 'width 0.42s ease, opacity 0.36s ease, transform 0.42s ease',
                        overflow: 'hidden', flexShrink: 0, alignSelf: 'center',
                        borderRadius: '0 12px 12px 0',
                    }}>
                        <LogoEmpresa logoSrc={logoSrc} color={empDark} vivo={true} />
                    </div>

                    {/* Empresa + ruta — degradé de colores claros, centrado */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: '0.3rem' }}>
                        <div style={{ fontSize: sz.emp, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: FONT, maxWidth: '100%', ...gradText(gradEmpresa) }}>
                            {nombreEmpresa || 'Terminal Buses Bolivia'}
                        </div>
                        <div style={{ fontWeight: 900, fontSize: sz.route, lineHeight: 1.15, letterSpacing: '0.01em', textTransform: 'uppercase', fontFamily: FONT, maxWidth: '100%', ...gradText(gradRuta) }}>
                            {isMobile ? (
                                <>{reserva.origen}<br /><span style={{ opacity: 0.85 }}>→ </span>{reserva.destino}</>
                            ) : (
                                <>{reserva.origen}<span style={{ margin: '0 0.3em', opacity: 0.85 }}>→</span>{reserva.destino}</>
                            )}
                        </div>
                    </div>

                    {/* Estado + hora/fecha + countdown + chevron */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem', flexShrink: 0 }}>
                        <span style={{ background: est.bg, color: est.color, padding: '0.22rem 0.7rem', borderRadius: 999, fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: FONT, border: `1px solid ${est.color}40` }}>
                            {est.label}
                        </span>
                        <span style={{ fontSize: sz.hora, fontWeight: 900, fontFamily: FONT, lineHeight: 1, ...gradText(gradHora) }}>{hora}</span>
                        <span style={{ fontSize: sz.fecha, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: FONT, color: empLight, textShadow: '0 1px 6px rgba(0,0,0,0.85)' }}>{fecha}</span>
                        {pendiente && reserva.expiraEn && (
                            <span style={{ background: ms < 120000 ? '#7f1d1d' : empresaColor + '33', color: ms < 120000 ? '#fca5a5' : empresaAcc, border: `1px solid ${ms < 120000 ? '#991b1b' : empresaColor + '55'}`, padding: '0.16rem 0.55rem', borderRadius: 999, fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: FONT }}>
                                ⏱ {fmtMs(ms)}
                            </span>
                        )}
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem', transform: expandido ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>▼</span>
                    </div>
                </div>

                {/* ── Detalle (se abre/cierra suave con grid-rows) ── */}
                <div style={{ display: 'grid', gridTemplateRows: expandido ? '1fr' : '0fr', transition: 'grid-template-rows 0.45s cubic-bezier(0.4,0,0.2,1)' }}>
                  <div style={{ overflow: 'hidden', minHeight: 0, opacity: expandido ? 1 : 0, transition: 'opacity 0.35s ease' }}>
                    <div ref={detalleRef} style={{ padding: isMobile ? '0 0.85rem 0.95rem' : '0 1.25rem 1.1rem' }}>
                        {/* Grid datos — cada celda se arma una por una */}
                        <div style={{ display: 'grid', gridTemplateColumns: sz.gridCols, gap: sz.gap, padding: '0.9rem 0', borderTop: `1px solid ${blend}40`, borderBottom: `1px solid ${blend}26`, marginBottom: '0.85rem' }}>
                            {detalles.map(item => (
                                <div data-build key={item.label}>
                                    <div style={{ fontSize: sz.lbl, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7c93ad', fontFamily: FONT, marginBottom: '0.15rem' }}>{item.label}</div>
                                    <div style={{ fontSize: sz.val, fontWeight: 800, fontFamily: FONT, color: '#e8edf3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.valor}</div>
                                </div>
                            ))}
                        </div>

                        {/* Acciones — cada botón se arma uno por uno */}
                        {pendiente && !completado && (
                            <button data-build onClick={stop(() => navigate(`/reserva/${reserva.viajeId}`))}
                                style={{ background: `${empresaColor}33`, border: `1px solid ${empresaColor}66`, color: empresaAcc, borderRadius: 9, padding: '0.42rem 0.9rem', cursor: 'pointer', fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: FONT, marginRight: '0.45rem' }}>
                                🎫 Completar pago
                            </button>
                        )}
                        {pendiente && !completado && (
                            <button data-build onClick={stop(() => onCancelar(reserva.id))}
                                style={{ background: '#7f1d1d30', border: '1px solid #991b1b60', color: '#fca5a5', borderRadius: 9, padding: '0.42rem 0.9rem', cursor: 'pointer', fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: FONT }}>
                                ✕ Cancelar
                            </button>
                        )}
                        {completado && !cancelada && (
                            <button data-build onClick={stop(() => navigate(`/sucursal/${reserva.sucursalId || ''}`))}
                                style={{ background: 'rgba(100,116,139,0.18)', border: '1px solid rgba(148,163,184,0.4)', color: '#cbd5e1', borderRadius: 9, padding: '0.42rem 0.9rem', cursor: 'pointer', fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: FONT }}>
                                ⭐ Calificar viaje
                            </button>
                        )}

                        {/* Boletos — vivos a color, pasados/cancelados en gris */}
                        {bls.length > 0 && (
                            <>
                                <div data-build style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7c93ad', fontFamily: FONT, margin: '1rem 0 0.55rem' }}>
                                    Boletos ({bls.length}){!vivo && ' · utilizados'}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem' }}>
                                    {bls.map(b => (
                                        <div data-build key={b.id}>
                                            <TicketMini boleto={b} nombreEmpresa={nombreEmpresa} vivo={vivo} onExpand={() => window.open('/boleto?token=' + (b.qrToken || b.id), '_blank')} />
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                  </div>
                </div>
            </div>
        </div>
    );
};

// ── Página ────────────────────────────────────────────────────────────────
const MisViajes = () => {
    const navigate = useNavigate();
    const { perfil, sesion, cargandoAuth } = useAuth();
    const { tema, departamento } = useDepartamento();
    const [reservas, setReservas] = useState([]);
    const [filtro,   setFiltro]   = useState('todos');
    const [busqueda, setBusqueda] = useState('');
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 640);
    const ahora = new Date();

    useEffect(() => {
        const h = () => setIsMobile(window.innerWidth <= 640);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);

    const cargar = useCallback(async () => {
        const data = perfil?.id ? await getReservasByUsuario(perfil.id) : [];
        setReservas(data);
    }, [perfil]);

    useEffect(() => {
        if (cargandoAuth) return; // espera a que la sesión termine de cargar (evita rebote a login al recargar)
        if (!sesion || perfil?.rol !== 'cliente') { navigate('/login-cliente?redirect=/mis-viajes'); return; }
        cargar();
        const t = setInterval(cargar, 15000);
        return () => clearInterval(t);
    }, [cargandoAuth, sesion, perfil, navigate, cargar]);

    const handleCancelar = async (id) => { await updateReservaEstado(id, 'cancelado'); cargar(); };

    const nPend = reservas.filter(r => r.estado === 'pendiente').length;

    const filtradas = reservas
        .filter(r => {
            if (filtro === 'pendientes') return r.estado === 'pendiente';
            if (filtro === 'proximos')   return new Date(r.fechaSalida) >= ahora && r.estado !== 'cancelado';
            if (filtro === 'pasados')    return new Date(r.fechaSalida) < ahora && r.estado !== 'cancelado';
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

            <div style={{ position: 'relative', zIndex: 1, maxWidth: 820, margin: '0 auto', padding: isMobile ? '1.4rem 0.85rem 3rem' : '2rem 1rem 3.5rem' }}>

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
                            <TarjetaReserva key={r.id} reserva={r} ahora={ahora} tema={tema} onCancelar={handleCancelar} isMobile={isMobile} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MisViajes;
