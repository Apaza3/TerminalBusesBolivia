import React, { useState } from 'react';
import { getCiudadFondo } from '../utils/assets';

const DEPT = {
    //                color=oscuro(borde/bg)  acento=claro(texto)   text=btn
    'La Paz':     { color: '#FF2A85', bg: '#020d12', acento: '#00F0FF', text: '#0B1120', emoji: '🏔️' },
    'Oruro':      { color: '#D90429', bg: '#120400', acento: '#FF6B00', text: '#FFFFFF', emoji: '🎭' },
    'Potosí':     { color: '#C1121F', bg: '#06090c', acento: '#90E0EF', text: '#0B1120', emoji: '⛏️' },
    'Cochabamba': { color: '#7209B7', bg: '#020d12', acento: '#00F0FF', text: '#0B1120', emoji: '🏞️' },
    'Chuquisaca': { color: '#9A031E', bg: '#0d0108', acento: '#EF233C', text: '#FFFFFF', emoji: '🏛️' },
    'Sucre':      { color: '#9A031E', bg: '#0d0108', acento: '#EF233C', text: '#FFFFFF', emoji: '🏛️' },
    'Tarija':     { color: '#9D0208', bg: '#060c00', acento: '#70E000', text: '#0B1120', emoji: '🍇' },
    'Santa Cruz': { color: '#2D6A4F', bg: '#021004', acento: '#39FF14', text: '#0B1120', emoji: '🌴' },
    'Beni':       { color: '#004B23', bg: '#0d0c00', acento: '#FEE440', text: '#0B1120', emoji: '🌅' },
    'Pando':      { color: '#073B4C', bg: '#010d08', acento: '#06D6A0', text: '#0B1120', emoji: '🌳' },
};

const FEATS = [
    { keys: ['wifi', 'internet'],              icon: '📶', label: 'WiFi'    },
    { keys: ['bano', 'baño', 'toilet'],        icon: '🚿', label: 'Baño'    },
    { keys: ['tv', 'television', 'pantalla'],  icon: '📺', label: 'TV'      },
    { keys: ['ac', 'aire', 'acond'],           icon: '❄️',  label: 'AC'      },
    { keys: ['cama', 'semicama', 'litera'],    icon: '🛏️', label: 'Cama'    },
    { keys: ['cargador', 'usb', 'enchufe'],    icon: '🔌', label: 'USB'     },
];

const hasF = (arr, keys) => {
    if (!arr?.length) return false;
    const n = arr.map(a => String(a).toLowerCase().replace(/\s+/g, ''));
    return keys.some(k => n.some(a => a.includes(k)));
};

const CSS = `
@keyframes tv-arrow-anim {
    0%   { left: -32px; opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 1; }
    100% { left: calc(100% + 8px); opacity: 0; }
}
.tv-card {
    display: flex;
    flex-direction: column;
    background: rgba(8,15,30,0.85);
    border-radius: 16px;
    overflow: hidden;
    backdrop-filter: blur(20px);
    transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
    cursor: pointer;
    position: relative;
    height: 100%;
}
.tv-card:hover { transform: scale(1.024); }
.tv-panel {
    width: 100%;
    height: 180px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    gap: 0.3rem;
    padding: 0.6rem 0.8rem;
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
}
.tv-panel-emoji { font-size: 2.4rem; position: relative; z-index: 1; }
.tv-panel-city  {
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    text-align: center;
    line-height: 1.2;
    position: relative;
    z-index: 1;
}
.tv-panel-sep {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 2px;
}
.tv-body {
    flex: 1;
    min-width: 0;
    padding: 0.8rem 0.95rem 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.42rem;
}
.tv-company {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
    font-size: 0.76rem;
}
.tv-company-name { font-weight: 700; color: #e2e8f0; }
.tv-company-city {
    font-weight: 800;
    font-size: 0.68rem;
    letter-spacing: 0.04em;
}
.tv-route {
    display: flex;
    align-items: center;
    gap: 0.38rem;
    font-weight: 800;
    font-size: 0.84rem;
    letter-spacing: -0.01em;
}
.tv-city-from {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 90px;
    color: #e8f0fe;
    text-shadow: 0 0 18px rgba(255,255,255,0.38), 0 0 6px rgba(255,255,255,0.2);
}
.tv-city-to {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 90px;
    font-weight: 900;
}
.tv-arrow-track {
    flex: 1;
    position: relative;
    height: 14px;
    overflow: hidden;
    display: flex;
    align-items: center;
    min-width: 28px;
}
.tv-arrow-line { width: 100%; height: 1.5px; border-radius: 2px; }
.tv-arrow-dot { display: none; }
.tv-arrow-tip {
    position: absolute;
    right: -2px;
    font-size: 0.48rem;
    line-height: 1;
}
.tv-info {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 0.4rem;
}
.tv-lbl {
    display: block;
    font-size: 0.57rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #475569;
    margin-bottom: 0.12rem;
}
.tv-val { font-size: 0.72rem; color: #94a3b8; }
.tv-price { font-size: 1.45rem; font-weight: 900; letter-spacing: -0.02em; }
.tv-feats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.28rem;
    margin-top: 0.05rem;
}
.tv-feat {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    padding: 0.18rem 0.48rem;
    border-radius: 20px;
    font-size: 0.69rem;
    background: rgba(7,17,31,0.55);
    border: 1px solid rgba(100,116,139,0.25);
    color: #64748b;
    white-space: nowrap;
}
.tv-btn {
    width: 100%;
    padding: 0.52rem;
    border: none;
    border-radius: 10px;
    font-weight: 700;
    font-size: 0.8rem;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.12s;
    margin-top: auto;
    letter-spacing: 0.02em;
}
.tv-btn:hover { opacity: 0.88; transform: translateY(-1px); }
@media (max-width: 520px) {
    .tv-panel { height: 115px; }
    .tv-panel-emoji { font-size: 1.9rem; }
    .tv-city-from, .tv-city-to { max-width: 70px; font-size: 0.78rem; }
    .tv-price { font-size: 1.25rem; }
}
`;

let _injected = false;
function injectCSS() {
    if (_injected || typeof document === 'undefined') return;
    _injected = true;
    const el = document.createElement('style');
    el.setAttribute('data-tv', '1');
    el.textContent = CSS;
    document.head.appendChild(el);
}

const calcularDisplayEstado = (viaje) => {
    const now = new Date();
    const salida = new Date(viaje.fecha_salida || viaje.salida);
    const diffMs = salida - now;
    // Bloqueado por incidente (2h) — tiene prioridad
    if (viaje.bloqueado_hasta && new Date(viaje.bloqueado_hasta) > now)
        return { label: 'No disponible', color: '#ef4444', canBook: false, bloqueado: true, motivo: viaje.bloqueo_motivo || 'Incidente en ruta' };
    if (viaje.estado === 'en_viaje')   return { label: 'En Viaje',   color: '#3b82f6', canBook: false };
    if (viaje.estado === 'completado') return { label: 'Completado', color: '#475569', canBook: false };
    if (viaje.estado === 'cancelado')  return { label: 'Cancelado',  color: '#ef4444', canBook: false };
    if (diffMs < 0)                    return { label: 'Partió',     color: '#dc2626', canBook: false };
    if (diffMs < 60 * 60 * 1000)      return { label: 'Embarcando', color: '#f59e0b', canBook: true  };
    return                                    { label: 'Disponible', color: '#10b981', canBook: true  };
};

const TarjetaViaje = ({ viaje, onSeleccionar }) => {
    injectCSS();
    const [hov, setHov] = useState(false);

    const destKey = Object.keys(DEPT).find(k => viaje.destino?.toLowerCase().includes(k.toLowerCase())) || viaje.destino;
    const dest = DEPT[destKey] || { color: '#3b82f6', bg: '#0a1422', acento: '#93c5fd', text: '#ffffff', emoji: '🌎' };
    const fondoDestino = getCiudadFondo(viaje.destino);
    const accent = viaje.colorAccent || viaje.sucursalColor || viaje.sucursales?.colorAccent || viaje.sucursales?.color_accent || '#3b82f6';
    const empresaNombre = viaje.sucursal_nombre || viaje.sucursalNombre || viaje.sucursales?.nombre || '';

    const ds = calcularDisplayEstado(viaje);

    const pisos = viaje.buses?.pisos || viaje.pisos || 1;
    const tieneBano = viaje.buses?.tiene_bano || false;
    const amenArr = [...(viaje.buses?.amenidades || []), ...(viaje.amenidades || [])];
    const amenConBano = tieneBano && !hasF(amenArr, ['bano', 'baño'])
        ? [...amenArr, 'bano']
        : amenArr;

    const fechaStr = viaje.fecha_salida || viaje.salida;
    const d = fechaStr ? new Date(fechaStr) : null;
    const hora = d ? d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--';
    const diaStr = d ? d.toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'short' }) : '';

    const precio = parseFloat(viaje.precio || 0);
    const ciudad = viaje.ciudad || viaje.sucursal_ciudad || viaje.sucursales?.ciudad || '';

    return (
        <div
            className="tv-card"
            style={{
                border: ds.label === 'Partió' ? '1.5px solid #1e293b' : `1.5px solid ${dest.color}${hov ? 'cc' : '40'}`,
                boxShadow: hov && ds.canBook
                    ? `0 6px 32px ${dest.color}45, 0 0 0 1px ${dest.color}18`
                    : '0 2px 14px rgba(0,0,0,0.45)',
                cursor: ds.canBook ? 'pointer' : 'default',
                position: 'relative',
            }}
            onClick={() => ds.canBook ? onSeleccionar?.(viaje) : undefined}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
        >
            {/* Badge FUERA del wrapper de opacity — siempre al 100% */}
            <div style={{
                position: 'absolute', top: 8, right: 8,
                background: `${ds.color}22`,
                border: `1px solid ${ds.color}80`,
                color: ds.color,
                borderRadius: 20,
                padding: '0.18rem 0.6rem',
                fontSize: '0.65rem',
                fontWeight: 800,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                backdropFilter: 'blur(8px)',
                zIndex: 10,
            }}>
                {ds.label}
            </div>

            {/* Cinta diagonal roja para viajes bloqueados por incidente */}
            {ds.bloqueado && (
                <>
                    <div style={{
                        position: 'absolute', top: 18, left: -42, zIndex: 12,
                        transform: 'rotate(-35deg)', transformOrigin: 'center',
                        background: 'linear-gradient(90deg, #b91c1c, #ef4444, #b91c1c)',
                        color: '#fff', fontWeight: 900, fontSize: '0.6rem', letterSpacing: '0.12em',
                        padding: '0.28rem 3rem', textTransform: 'uppercase',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.5)', textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                        pointerEvents: 'none', whiteSpace: 'nowrap',
                    }}>⚠ No disponible</div>
                    <div title={ds.motivo} style={{
                        position: 'absolute', bottom: 8, left: 8, right: 8, zIndex: 11,
                        background: 'rgba(127,29,29,0.85)', color: '#fecaca',
                        borderRadius: 8, padding: '0.3rem 0.5rem', fontSize: '0.62rem', fontWeight: 700,
                        textAlign: 'center', backdropFilter: 'blur(4px)', pointerEvents: 'none',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{ds.motivo}</div>
                </>
            )}

            {/* Contenido con opacity/filtro reducido para "Partió" o bloqueado */}
            <div style={{
                opacity: ds.bloqueado ? 0.45 : ds.label === 'Partió' ? 0.32 : ds.canBook ? 1 : 0.62,
                filter: ds.bloqueado ? 'grayscale(100%)' : 'none',
            }}>
            {/* Destination panel */}
            <div
                className="tv-panel"
                style={fondoDestino
                    ? { backgroundImage: `url(${fondoDestino})`, backgroundSize: 'cover', backgroundPosition: 'center 15%' }
                    : { background: `linear-gradient(170deg, ${dest.bg} 0%, ${dest.color}28 55%, ${dest.bg} 100%)` }
                }
            >
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
                    background: fondoDestino
                        ? `linear-gradient(180deg, rgba(0,0,0,0.52) 0%, ${dest.color}55 55%, rgba(0,0,0,0.62) 100%)`
                        : `radial-gradient(ellipse at 50% 38%, ${dest.color}38 0%, transparent 68%)`
                }} />
                {!fondoDestino && <span className="tv-panel-emoji">{dest.emoji}</span>}
                <div className="tv-panel-sep" style={{ background: `linear-gradient(90deg, transparent, ${dest.color}90, transparent)` }} />
            </div>

            {/* Trip content */}
            <div className="tv-body">

                {/* Company */}
                <div className="tv-company">
                    <span className="tv-company-name">{empresaNombre}</span>
                </div>

                {/* Route with animated arrow */}
                <div className="tv-route">
                    <span className="tv-city-from">{viaje.origen}</span>
                    <div className="tv-arrow-track">
                        <div
                            className="tv-arrow-line"
                            style={{ background: `linear-gradient(90deg, transparent, ${dest.color}70, ${dest.color}, ${dest.color}70, transparent)` }}
                        />
                        <div
                            className="tv-arrow-dot"
                            style={{ background: `radial-gradient(ellipse, ${dest.acento} 0%, ${dest.color} 100%)` }}
                        />
                        <span className="tv-arrow-tip" style={{ color: dest.acento }}>▶</span>
                    </div>
                    <span
                        className="tv-city-to"
                        style={{
                            color: dest.acento,
                            textShadow: `0 0 18px ${dest.color}ee, 0 0 7px ${dest.acento}70`,
                        }}
                    >
                        {viaje.destino}
                    </span>
                </div>

                {/* Time + Price */}
                <div className="tv-info">
                    <div>
                        <span className="tv-lbl">Salida</span>
                        <span className="tv-val">
                            {diaStr && <>{diaStr} · </>}
                            <strong style={{ color: dest.acento, fontWeight: 700 }}>{hora}</strong>
                        </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span className="tv-lbl">Precio</span>
                        <span
                            className="tv-price"
                            style={{ color: dest.acento, textShadow: `0 0 18px ${dest.color}cc, 0 0 8px ${dest.acento}99, 0 0 32px ${dest.color}60` }}
                        >
                            Bs {precio.toFixed(0)}
                        </span>
                    </div>
                </div>

                {/* Bus features */}
                <div className="tv-feats">
                    <span className="tv-feat" style={{ borderColor: `${dest.color}50`, color: dest.acento }}>
                        🚌 {pisos === 2 ? '2 pisos' : '1 piso'}
                    </span>
                    {FEATS.filter(f => hasF(amenConBano, f.keys)).map(f => (
                        <span key={f.keys[0]} className="tv-feat" title={f.label} style={{ borderColor: `${dest.color}30` }}>
                            {f.icon} {f.label}
                        </span>
                    ))}
                </div>

                {/* CTA */}
                {ds.canBook ? (
                    <button
                        className="tv-btn"
                        style={{
                            background: `linear-gradient(135deg, ${dest.acento}, ${dest.acento}cc)`,
                            boxShadow: `0 0 18px ${dest.acento}55`,
                            color: dest.text,
                            pointerEvents: 'none',
                        }}
                        tabIndex={-1}
                        aria-hidden="true"
                    >
                        Seleccionar →
                    </button>
                ) : (
                    <div style={{
                        width: '100%',
                        padding: '0.52rem',
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        textAlign: 'center',
                        letterSpacing: '0.04em',
                        background: `${ds.color}18`,
                        border: `1px solid ${ds.color}40`,
                        color: ds.color,
                        marginTop: 'auto',
                    }}>
                        {ds.label}
                    </div>
                )}
            </div>
            </div>{/* /opacity wrapper */}
        </div>
    );
};

export default TarjetaViaje;
