import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

const TEMAS_EMPRESA = {
    "Andino":     { c1:'#4CD964', c2:'#FFD700', c3:'#121212', bg:'#131C16' },
    "Atlas":      { c1:'#D32F2F', c2:'#FFFFFF', c3:'#212121', bg:'#1C1414' },
    "Bolívar":    { c1:'#0033A0', c2:'#FFD700', c3:'#4FC3F7', bg:'#101423' },
    "Copacabana": { c1:'#E31E24', c2:'#F8F9FA', c3:'#343A40', bg:'#1C1515' },
    "Cosmos":     { c1:'#FF6B00', c2:'#FFD700', c3:'#C0C0C0', bg:'#1A1513' },
    "El Dorado":  { c1:'#D4AF37', c2:'#AA8822', c3:'#FFFFFF', bg:'#1A1915' },
    "Emperador":  { c1:'#2E5CB8', c2:'#D4AF37', c3:'#C1121F', bg:'#131621' },
    "Illimani":   { c1:'#4CAF50', c2:'#F5F5DC', c3:'#2E7D32', bg:'#141A15' },
    "Imperial":   { c1:'#D4AF37', c2:'#FF8C00', c3:'#080808', bg:'#111111' },
    "Naser":      { c1:'#0056B3', c2:'#FF6B00', c3:'#FFFFFF', bg:'#11141D' },
};

const LOGO_MAP = {
    'andino': 'andino', 'atlas': 'atlas', 'bolívar': 'bolivar', 'bolivar': 'bolivar',
    'copacabana': 'copacabana', 'cosmos': 'cosmos', 'el dorado': 'dorado', 'dorado': 'dorado',
    'emperador': 'emperador', 'illimani': 'illimani', 'imperial': 'imperal', 'naser': 'naser',
};

export const darken = (hex, factor) => {
    const c = hex?.replace('#', '');
    if (!c || c.length !== 6) return hex;
    const r = Math.round(parseInt(c.slice(0,2),16) * factor);
    const g = Math.round(parseInt(c.slice(2,4),16) * factor);
    const b = Math.round(parseInt(c.slice(4,6),16) * factor);
    return `#${[r,g,b].map(v=>Math.min(255,v).toString(16).padStart(2,'0')).join('')}`;
};

export const lighten = (hex, factor) => {
    const c = hex?.replace('#', '');
    if (!c || c.length !== 6) return hex;
    const r = Math.round(parseInt(c.slice(0,2),16) + (255 - parseInt(c.slice(0,2),16)) * factor);
    const g = Math.round(parseInt(c.slice(2,4),16) + (255 - parseInt(c.slice(2,4),16)) * factor);
    const b = Math.round(parseInt(c.slice(4,6),16) + (255 - parseInt(c.slice(4,6),16)) * factor);
    return `#${[r,g,b].map(v=>Math.min(255,v).toString(16).padStart(2,'0')).join('')}`;
};

export const blendHex = (hex1, hex2, t = 0.5) => {
    const parse = h => { const c = h?.replace('#',''); return c?.length===6 ? [parseInt(c.slice(0,2),16),parseInt(c.slice(2,4),16),parseInt(c.slice(4,6),16)] : null; };
    const a = parse(hex1), b = parse(hex2);
    if (!a || !b) return hex1 || hex2;
    return `#${[0,1,2].map(i=>Math.round(a[i]*(1-t)+b[i]*t).toString(16).padStart(2,'0')).join('')}`;
};

const norm = s => s?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() || '';

export const getTemaEmpresa = (nombre) => {
    if (!nombre) return null;
    const n = norm(nombre);
    const key = Object.keys(TEMAS_EMPRESA).find(k => n.includes(norm(k)));
    return key ? TEMAS_EMPRESA[key] : null;
};

export const getLogoEmpresa = (nombre) => {
    if (!nombre) return null;
    const n = norm(nombre);
    const key = Object.keys(LOGO_MAP).find(k => n.includes(norm(k)));
    return key ? `/iconos/${LOGO_MAP[key]}.svg` : null;
};

const TicketCard = ({ boleto, te, logoSrc, empresaNombre, isMobile = false }) => {
    const sc = isMobile ? 0.72 : 1;
    const tipo = boleto.esInfante ? 'infante'
        : boleto.llevaAnimales  ? 'animales'
        : boleto.lleva1000      ? 'dinero'
        : boleto.llevaProductos ? 'productos'
        : 'normal';

    const TIPO_HDR = {
        infante:  { color: '#f59e0b', label: 'NIÑO' },
        animales: { color: '#38bdf8', label: 'ANIMALES' },
        dinero:   { color: '#22c55e', label: 'DINERO' },
        productos:{ color: '#a855f7', label: 'COMIDA' },
        normal:   { color: '#d1d5db', label: 'NORMAL' },
    }[tipo];

    const accent      = te?.c1 || '#007bb5';
    const colorOscuro = te?.c3 || darken(accent, 0.40);
    const colorClaro  = te?.c1 || '#007bb5';
    const FONT = "Arial,'Helvetica Neue',sans-serif";

    const txt1 = { color: '#fff', WebkitTextStroke: '1px #000', textShadow: '1px 1px 0 rgba(0,0,0,0.5)' };
    const txt2 = { color: '#fff', WebkitTextStroke: '1.5px #000', textShadow: '2px 2px 0 rgba(0,0,0,0.7)' };

    const formatFecha = (f) => {
        if (!f) return '—';
        try { const d = new Date(f); if (isNaN(d)) return f; return d.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch { return f; }
    };
    const formatHora = (f) => {
        if (!f) return '—';
        try { const d = new Date(f); if (isNaN(d)) return '—'; return d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }); } catch { return '—'; }
    };

    const fechaStr = formatFecha(boleto.fechaSalida);
    const horaStr  = formatHora(boleto.fechaSalida);
    const qrVal    = JSON.stringify({ id: boleto.id, reservaId: boleto.reservaId, pasajero: boleto.pasajeroNombre, ci: boleto.pasajeroCI, asiento: boleto.asiento, origen: boleto.origen, destino: boleto.destino, salida: boleto.fechaSalida, bus: boleto.busPlaca });
    const boletoNum = (boleto.id || '').slice(-10).toUpperCase();

    const s = v => Math.round(v * sc);

    const ClockSVG = () => (
        <svg width={s(11)} height={s(11)} viewBox="0 0 24 24" fill={accent} style={{ display: 'inline', verticalAlign: 'middle', marginRight: s(2) }}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
        </svg>
    );

    const WatermarkLogo = ({ size }) => logoSrc
        ? <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.14, filter: 'grayscale(100%)', border: '3px solid #888' }}>
            <img src={logoSrc} alt="" style={{ width: '110%', height: '110%', objectFit: 'contain' }} />
          </div>
        : <svg viewBox="0 0 100 100" style={{ width: size, height: size, color: '#888', opacity: 0.14 }} fill="none">
            <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="2"/>
            <path d="M25 60L25 45C25 35 35 30 50 30C65 30 75 35 75 45L75 60C75 65 70 70 65 70L35 70C30 70 25 65 25 60Z" stroke="currentColor" strokeWidth="3"/>
            <rect x="35" y="38" width="30" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
            <circle cx="38" cy="70" r="5" fill="currentColor"/>
            <circle cx="62" cy="70" r="5" fill="currentColor"/>
          </svg>;

    return (
        <div style={{ position: 'relative', width: '100%', minHeight: s(360), display: 'flex', background: '#f4f6f8', borderRadius: s(24), overflow: 'hidden', boxShadow: '0 4px 28px rgba(0,0,0,0.25)', color: '#111', fontFamily: FONT }}>

            {/* ── Franja superior ── */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: s(18), background: TIPO_HDR.color, zIndex: 5 }}>
                {TIPO_HDR.label && (
                    <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: s(2), fontSize: s(10), fontWeight: 900, letterSpacing: '0.14em', color: '#fff', WebkitTextStroke: '0.4px #000' }}>
                        {TIPO_HDR.label}
                    </span>
                )}
            </div>

            {/* ══ SECCIÓN PRINCIPAL ══ */}
            <div style={{ width: isMobile ? '100%' : '72%', padding: `${s(30)}px ${s(20)}px ${s(16)}px ${s(30)}px`, position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column' }}>

                {/* Marca de agua */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
                    <WatermarkLogo size={s(300)} />
                </div>

                {/* Ondas decorativas inferior-izquierda */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '58%', height: s(128), zIndex: 0, pointerEvents: 'none' }}>
                    <svg width="100%" height="100%" viewBox="0 0 500 100" preserveAspectRatio="none">
                        <polygon points="0,28 500,100 0,100" fill={colorOscuro} />
                        <polygon points="0,62 300,100 0,100" fill={colorClaro} />
                    </svg>
                </div>

                {/* Título empresa */}
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: s(14), marginBottom: s(14) }}>
                    <h2 style={{ margin: 0, fontSize: s(34), fontWeight: 900, letterSpacing: '-0.01em', textTransform: 'uppercase', lineHeight: 1, color: colorClaro, WebkitTextStroke: '1px rgba(0,0,0,0.4)', textShadow: '1px 1px 0 rgba(0,0,0,0.3)' }}>
                        {empresaNombre || boleto.sucursalNombre || 'TERMINAL BUSES BOLIVIA'}
                    </h2>
                    <div style={{ width: s(60), height: s(14), borderRadius: s(4), background: colorClaro, flexShrink: 0 }} />
                </div>

                {/* Fila 1: nombre / tipo / bus */}
                <div style={{ position: 'relative', zIndex: 10, display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr', gap: `0 ${s(20)}px`, marginBottom: s(12) }}>
                    {[
                        { lbl: 'NOMBRE', val: boleto.pasajeroNombre, stroke: true, size: s(16) },
                        { lbl: 'TIPO DE BOLETO', val: TIPO_HDR.label, stroke: false, size: s(15) },
                        { lbl: 'BUS', val: boleto.busPlaca, stroke: false, size: s(15) },
                    ].map(({ lbl, val, stroke, size }) => (
                        <div key={lbl}>
                            <p style={{ margin: `0 0 ${s(3)}px`, fontSize: s(10), fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{lbl}</p>
                            <p style={{ margin: 0, fontSize: size, fontWeight: 900, textTransform: 'uppercase', ...(stroke ? txt1 : { color: '#1a1a1a' }) }}>{val || '—'}</p>
                        </div>
                    ))}
                </div>

                {/* Fila 2: ruta + CI */}
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', gap: s(36), marginBottom: s(10), alignItems: 'flex-start' }}>
                    <div>
                        <p style={{ margin: `0 0 ${s(3)}px`, fontSize: s(10), fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>RUTA</p>
                        <p style={{ margin: 0, fontSize: s(20), fontWeight: 700, textTransform: 'uppercase', color: '#111', lineHeight: 1.1 }}>
                            {boleto.origen} <span style={{ color: accent, margin: `0 ${s(4)}px` }}>➔</span> {boleto.destino}
                        </p>
                    </div>
                    <div>
                        <p style={{ margin: `0 0 ${s(3)}px`, fontSize: s(10), fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>C.I.</p>
                        <p style={{ margin: 0, fontSize: s(20), fontWeight: 900, ...txt1 }}>{boleto.pasajeroCI || '—'}</p>
                    </div>
                </div>

                {/* Fila 3: salida / llegada */}
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', gap: s(32), marginBottom: 0 }}>
                    <div>
                        <p style={{ margin: `0 0 ${s(3)}px`, fontSize: s(10), fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>SALIDA</p>
                        <p style={{ margin: 0, fontSize: s(13), fontWeight: 600, color: '#222' }}>{fechaStr} &nbsp;<ClockSVG />{horaStr}</p>
                    </div>
                    <div>
                        <p style={{ margin: `0 0 ${s(3)}px`, fontSize: s(10), fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.08em' }}>LLEGADA</p>
                        <p style={{ margin: 0, fontSize: s(13), fontWeight: 500, color: '#bbb', fontStyle: 'italic' }}>POR CONFIRMAR</p>
                    </div>
                </div>

                {/* Asiento + N° boleto */}
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'flex-end', gap: s(24), marginTop: 'auto' }}>
                    <p style={{ margin: 0, fontSize: s(64), fontWeight: 900, lineHeight: 1, ...txt2 }}>{boleto.asiento}</p>
                    <div style={{ marginBottom: s(6) }}>
                        <p style={{ margin: `0 0 ${s(2)}px`, fontSize: s(9), fontWeight: 700, letterSpacing: '0.12em', ...txt1 }}>NÚMERO DE BOLETO</p>
                        <p style={{ margin: 0, fontSize: s(22), fontWeight: 900, letterSpacing: '0.1em', ...txt2 }}>{boletoNum}</p>
                    </div>
                </div>

                {/* QR flotante */}
                <div style={{ position: 'absolute', right: s(16), bottom: s(16), zIndex: 20, background: 'white', padding: s(5), borderRadius: s(8), border: '2.5px solid #111', boxShadow: '0 2px 10px rgba(0,0,0,0.22)' }}>
                    <QRCodeCanvas value={qrVal} size={s(80)} level="M" />
                </div>
            </div>

            {/* ── LÍNEA DE CORTE — solo desktop ── */}
            {!isMobile && (
                <div style={{ position: 'relative', width: 0, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ position: 'absolute', top: 0, bottom: 0, borderLeft: '2px dashed #ccc' }} />
                    <div style={{ width: s(36), height: s(36), background: '#080f1e', borderRadius: '50%', position: 'absolute', top: -s(18), left: -s(18), boxShadow: '0 0 0 3px #080f1e' }} />
                    <div style={{ width: s(36), height: s(36), background: '#080f1e', borderRadius: '50%', position: 'absolute', bottom: -s(18), left: -s(18), boxShadow: '0 0 0 3px #080f1e' }} />
                </div>
            )}

            {/* ══ STUB (28%) — solo desktop ══ */}
            {!isMobile && (
                <div style={{ width: '28%', padding: `${s(30)}px ${s(20)}px ${s(16)}px ${s(24)}px`, position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 0 }}>
                        <WatermarkLogo size={s(150)} />
                    </div>

                    <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', gap: s(10) }}>
                        <div>
                            <p style={{ margin: `0 0 ${s(2)}px`, fontSize: s(9), fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>NOMBRE</p>
                            <p style={{ margin: 0, fontSize: s(14), fontWeight: 900, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...txt1 }}>{boleto.pasajeroNombre}</p>
                        </div>
                        <div style={{ display: 'flex', gap: s(12) }}>
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: `0 0 ${s(2)}px`, fontSize: s(9), fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>RUTA</p>
                                <p style={{ margin: 0, fontSize: s(11), fontWeight: 600, textTransform: 'uppercase', lineHeight: 1.35, color: '#222' }}>{boleto.origen} <span style={{ color: accent }}>➔</span> {boleto.destino}</p>
                            </div>
                            <div>
                                <p style={{ margin: `0 0 ${s(2)}px`, fontSize: s(9), fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>C.I.</p>
                                <p style={{ margin: 0, fontSize: s(11), fontWeight: 900, ...txt1 }}>{boleto.pasajeroCI}</p>
                            </div>
                        </div>
                        <div>
                            <p style={{ margin: `0 0 ${s(2)}px`, fontSize: s(9), fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>SALIDA</p>
                            <p style={{ margin: 0, fontSize: s(12), fontWeight: 600, color: '#333' }}>{fechaStr} &nbsp;<ClockSVG />{horaStr}</p>
                        </div>
                    </div>

                    {/* Footer stub */}
                    <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                            <p style={{ margin: `0 0 ${s(2)}px`, fontSize: s(8), fontWeight: 700, letterSpacing: '0.1em', ...txt1 }}>NÚMERO DE BOLETO</p>
                            <p style={{ margin: `0 0 ${s(6)}px`, fontSize: s(11), fontWeight: 900, letterSpacing: '0.08em', ...txt1 }}>{boletoNum}</p>
                            <p style={{ margin: 0, fontSize: s(40), fontWeight: 900, lineHeight: 1, ...txt2 }}>{boleto.asiento}</p>
                        </div>
                        <div style={{ background: 'white', padding: s(5), borderRadius: s(6), border: '2px solid #111', boxShadow: '0 1px 6px rgba(0,0,0,0.2)' }}>
                            <QRCodeCanvas value={qrVal} size={s(72)} level="M" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TicketCard;
