import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import TicketCard, { getTemaEmpresa, getLogoEmpresa, darken, lighten, blendHex } from '../componentes/TicketCard';
import { useAuth } from '../contextos/AuthContext';
import { useDepartamento } from '../contextos/DepartamentoContext';
import { useToast } from '../componentes/ToastNotifications';
import { obtenerCliente } from '../data/mockClientDB';
import { getViaje, buscarClientePorCI } from '../servicios/api';
import {
    crearReserva,
    obtenerReservas,
    obtenerAsientosPendientes,
    marcarAsientosPendientes,
    liberarAsientosBloqueados,
    liberarAsientosExpirados,
    crearBoletos,
    crearTokenQR,
    obtenerEstadoQR,
    actualizarEstadoQR,
    crearReservaConEstado,
    verificarExpiradas,
} from '../data/mockStorage';
import '../estilos/escritorio/mapa-asientos.css';

const PISO2_COLS = [780, 715, 650, 585, 520, 455, 390, 325, 260, 195, 130];
const PISO1_COLS = [715, 650, 585, 520, 455];
const SEAT_ROWS  = [25, 60, 105, 140];

const DEPT = {
    'La Paz':     { color: '#2563eb', bg: '#08122a', acento: '#93c5fd' },
    'Cochabamba': { color: '#059669', bg: '#061510', acento: '#6ee7b7' },
    'Santa Cruz': { color: '#d97706', bg: '#140c03', acento: '#fcd34d' },
    'Oruro':      { color: '#7c3aed', bg: '#0d071e', acento: '#c4b5fd' },
    'Potosí':     { color: '#64748b', bg: '#090c11', acento: '#cbd5e1' },
    'Sucre':      { color: '#b45309', bg: '#120a03', acento: '#fde68a' },
    'Tarija':     { color: '#be123c', bg: '#120408', acento: '#fda4af' },
    'Trinidad':   { color: '#0d9488', bg: '#040f0e', acento: '#99f6e4' },
    'Cobija':     { color: '#65a30d', bg: '#071003', acento: '#bef264' },
};


// Paleta rica por departamento destino (para el header de ruta)
const DEPT_PALETA = {
    'La Paz':     { primary: '#00F0FF', secondary: '#FF2A85', bandera1: '#E63946', bandera2: '#2A9D8F', primaryText: '#0B1120' },
    'Oruro':      { primary: '#FF6B00', secondary: '#D90429', bandera1: '#D90429', bandera2: '#FF6B00', primaryText: '#FFFFFF' },
    'Potosí':     { primary: '#90E0EF', secondary: '#C1121F', bandera1: '#C1121F', bandera2: '#E2E8F0', primaryText: '#0B1120' },
    'Cochabamba': { primary: '#00F0FF', secondary: '#7209B7', bandera1: '#48CAE4', bandera2: '#0077B6', primaryText: '#0B1120' },
    'Chuquisaca': { primary: '#EF233C', secondary: '#F8FAFC', bandera1: '#F8FAFC', bandera2: '#EF233C', primaryText: '#FFFFFF' },
    'Sucre':      { primary: '#EF233C', secondary: '#F8FAFC', bandera1: '#F8FAFC', bandera2: '#EF233C', primaryText: '#FFFFFF' },
    'Tarija':     { primary: '#70E000', secondary: '#9D0208', bandera1: '#9D0208', bandera2: '#F8FAFC', primaryText: '#0B1120' },
    'Santa Cruz': { primary: '#39FF14', secondary: '#FFD166', bandera1: '#06D6A0', bandera2: '#F8FAFC', primaryText: '#0B1120' },
    'Beni':       { primary: '#FEE440', secondary: '#00BBF9', bandera1: '#38B000', bandera2: '#FEE440', primaryText: '#0B1120' },
    'Pando':      { primary: '#06D6A0', secondary: '#118AB2', bandera1: '#FFFFFF', bandera2: '#06D6A0', primaryText: '#0B1120' },
};
const getDeptPaleta = (destino) => {
    const key = Object.keys(DEPT_PALETA).find(k => destino?.toLowerCase().includes(k.toLowerCase()));
    return key ? DEPT_PALETA[key] : null;
};

// ─── Pulse keyframes injected once ───────────────────
const PULSE_STYLE = `
@keyframes tbb-pulse-border {
  0%,100% { border-color: #7c3aed; box-shadow: 0 0 0 0 rgba(124,58,237,0.5); }
  50%      { border-color: #f59e0b; box-shadow: 0 0 0 4px rgba(245,158,11,0.25); }
}
@keyframes tbb-card-flip {
  0%   { transform: rotateY(0deg); }
  100% { transform: rotateY(180deg); }
}
.tbb-bloqueado-anim {
  animation: tbb-pulse-border 0.8s infinite;
  border: 2px solid #7c3aed !important;
  background: rgba(124,58,237,0.2) !important;
  cursor: not-allowed !important;
}
.tbb-seleccionado {
  border: 2px solid #3b82f6 !important;
  background: rgba(59,130,246,0.3) !important;
}
.tbb-ocupado {
  background: rgba(127,29,29,0.7) !important;
  border: 1px solid #991b1b !important;
  cursor: not-allowed !important;
  color: #7f1d1d !important;
}
.tbb-disponible {
  background: rgba(51,65,85,0.6) !important;
  border: 1px solid #475569 !important;
  cursor: pointer !important;
}
.tbb-disponible:hover {
  border-color: #60a5fa !important;
  background: rgba(59,130,246,0.15) !important;
}
`;

// ─── helpers ─────────────────────────────────────────
const pad2 = (n) => String(n).padStart(2, '0');

const formatCountdown = (ms) => {
    if (ms <= 0) return '00:00';
    const total = Math.floor(ms / 1000);
    return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
};

const formatFecha = (iso) => {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('es-BO', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch { return iso; }
};

const useWindowWidth = () => {
    const [w, setW] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
    React.useEffect(() => {
        const h = () => setW(window.innerWidth);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);
    return w;
};

const GEMINI_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Black+Ops+One&display=swap');
@keyframes gbn-blink {
  0%,44%  { fill: #363f46; }
  50%,94% { fill: #fde047; filter: drop-shadow(0 0 5px rgba(253,224,71,0.7)); }
  100%    { fill: #363f46; }
}
.gbn-win-blink { animation: gbn-blink 3s ease-in-out infinite; }
`;

let _geminiCssOk = false;
function injectGeminiCSS() {
    if (_geminiCssOk || typeof document === 'undefined') return;
    _geminiCssOk = true;
    const el = document.createElement('style');
    el.setAttribute('data-gbn','1');
    el.textContent = GEMINI_CSS;
    document.head.appendChild(el);
}

const BusPerfilGemini = ({ onSelectPiso, color1 = '#394285', color2 = '#48256a', empresa = '', pisos = 2 }) => {
    injectGeminiCSS();
    const [hovPiso, setHovPiso] = useState(null);
    const [hovBus, setHovBus] = useState(false);
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 640);
    useEffect(() => {
        const h = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);
    const wFill = (p) => hovPiso === p ? '#fde047' : '#363f46';
    const wGlow = (p) => hovPiso === p ? 'url(#gbnGlow)' : undefined;
    const winClass = () => isMobile && !hovPiso && !hovBus ? 'gbn-win-blink' : '';

    /* ── 1-piso bus (diseño exacto Gemini) ── */
    if (pisos === 1) {
        const wFill1 = hovBus ? '#fde047' : '#363f46';
        const wGlow1 = hovBus ? 'url(#gbn1Glow)' : undefined;
        const wCls1  = isMobile && !hovBus ? 'gbn-win-blink' : '';
        return (
            <div style={{ width: '100%', maxWidth: 1000, margin: '0 auto', filter: 'drop-shadow(0 12px 22px rgba(0,0,0,0.3))' }}>
                <svg viewBox="0 0 1000 275" style={{ width: '100%', height: 'auto' }}>
                    <defs>
                        <linearGradient id="gbn1Grad" x1="100%" y1="0%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor={color1} />
                            <stop offset="100%" stopColor={color2 || color1} />
                        </linearGradient>
                        <filter id="gbn1Glow" x="-15%" y="-15%" width="130%" height="130%">
                            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#fde047" floodOpacity="0.7" />
                        </filter>
                    </defs>

                    {/* Bus body — path exacto Gemini */}
                    <path d="M 25 230 L 920 230 C 950 230 970 215 975 190 C 980 140 960 110 915 65 C 875 25 820 15 770 15 L 50 15 C 30 15 20 25 20 45 L 20 210 C 20 220 25 230 25 230 Z" fill="url(#gbn1Grad)" />

                    {/* Sombra compartimiento maletero */}
                    <rect x="22" y="125" width="695" height="103" fill="#0d1822" fillOpacity="0.30" />

                    {/* Líneas separadoras maletero — coordenadas exactas Gemini */}
                    <line x1="175" y1="125" x2="175" y2="230" stroke="#0a1525" strokeWidth="2.5" />
                    <line x1="315" y1="190" x2="315" y2="230" stroke="#0a1525" strokeWidth="2" />
                    <line x1="720" y1="120" x2="720" y2="230" stroke="#0a1525" strokeWidth="2.5" />
                    <line x1="755" y1="120" x2="755" y2="230" stroke="#0a1525" strokeWidth="2" />

                    {/* Fondo banda de ventanas pasajeros */}
                    <path d="M 20 120 L 20 35 C 20 20 35 15 50 15 L 757 15 L 757 120 Z" fill="#23272a" />

                    {/* Ventanas — zona interactiva */}
                    <g onMouseEnter={() => setHovBus(true)} onMouseLeave={() => setHovBus(false)}
                        onClick={() => onSelectPiso(1)} style={{ cursor: 'pointer' }}>
                        {/* Ventana 1 (izquierda, angulada) */}
                        <path fill={wFill1} filter={wGlow1} className={wCls1}
                            d="M 28 108 L 28 28 C 28 18 36 18 50 18 L 145 18 L 145 108 Z"
                            style={{ animationDelay: '0s' }} />
                        {/* Ventanas 2-6 */}
                        {[155, 275, 395, 515, 635].map((x, i) => (
                            <rect key={i} fill={wFill1} filter={wGlow1} className={wCls1}
                                x={x} y="18" width="110" height="90" rx="5"
                                style={{ animationDelay: `${(i + 1) * 0.4}s` }} />
                        ))}
                        {hovBus && (
                            <text x="400" y="72" textAnchor="middle" fill="#fde047"
                                fontSize="24" fontWeight="900"
                                fontFamily="'Bebas Neue', sans-serif" letterSpacing="6"
                                pointerEvents="none">
                                ▶ VER ASIENTOS ▶
                            </text>
                        )}
                    </g>

                    {/* Zona conductor — paths exactos Gemini */}
                    <path d="M 760 124 L 890 124 C 905 124 915 134 920 154 L 928 210 L 760 210 Z" fill="#23272a" />
                    <path d="M 767 130 L 882 130 C 896 130 905 142 910 158 L 916 204 L 767 204 Z" fill="#363f46" />
                    {/* Parabrisas */}
                    <path d="M 885 124 L 950 124 C 970 144 975 174 970 200 L 935 200 C 925 165 915 135 885 124 Z" fill="#23272a" />
                    <path d="M 890 130 L 944 130 C 962 148 966 172 962 196 L 939 196 C 929 165 919 140 890 130 Z" fill="#363f46" />

                    {/* Espejo retrovisor — path exacto Gemini (blanco) */}
                    <path d="M 810 89 C 870 89 910 94 955 119 C 975 129 985 149 985 169 L 970 169 C 970 154 960 139 940 129 C 900 109 860 104 810 104 Z" fill="#ffffff" fillOpacity="0.88" />

                    {/* Faro izquierdo — luz trasera roja (exacto Gemini) */}
                    <path d="M 20 125 L 32 130 L 32 190 L 20 200 Z" fill="#b20b18" />

                    {/* Faro derecho — luz delantera amarilla (exacto Gemini) */}
                    <path d="M 955 190 L 980 195 L 975 215 L 950 210 Z" fill="#ffeb69" />

                    {/* Reflejos */}
                    <path d="M 22 60 C 22 20 60 15 150 15 L 750 15 C 810 15 860 30 910 65 C 800 55 400 40 22 60 Z"
                        fill="#ffffff" fillOpacity="0.11" pointerEvents="none" />
                    <path d="M 50 15 L 758 15 L 758 22 L 50 22 Z"
                        fill="#ffffff" fillOpacity="0.22" pointerEvents="none" />

                    {/* Ruedas en cy=230 — exacto Gemini */}
                    <path d="M 140 230 A 48 48 0 0 1 236 230 Z" fill="#23272a" />
                    <path d="M 250 230 A 48 48 0 0 1 346 230 Z" fill="#23272a" />
                    <path d="M 740 230 A 48 48 0 0 1 836 230 Z" fill="#23272a" />
                    <circle cx="188" cy="230" r="38" fill="#363839" />
                    <circle cx="188" cy="230" r="17" fill="#cfd3d5" />
                    <circle cx="298" cy="230" r="38" fill="#363839" />
                    <circle cx="298" cy="230" r="17" fill="#cfd3d5" />
                    <circle cx="788" cy="230" r="38" fill="#363839" />
                    <circle cx="788" cy="230" r="17" fill="#cfd3d5" />

                    {/* Nombre empresa */}
                    <text x="400" y="162" textAnchor="middle"
                        fontFamily="'Black Ops One', 'Bebas Neue', Arial, sans-serif"
                        fontSize="28" fontWeight="400"
                        stroke="#000000" strokeWidth="6" strokeLinejoin="round"
                        fill="none" fillOpacity={hovBus ? 0.12 : 1}
                        letterSpacing="3" pointerEvents="none">
                        {(empresa || 'EMPRESA').toUpperCase()}
                    </text>
                    <text x="400" y="162" textAnchor="middle"
                        fontFamily="'Black Ops One', 'Bebas Neue', Arial, sans-serif"
                        fontSize="28" fontWeight="400"
                        fill="#ffffff" fillOpacity={hovBus ? 0.08 : 1}
                        letterSpacing="3" pointerEvents="none">
                        {(empresa || 'EMPRESA').toUpperCase()}
                    </text>

                </svg>

                <div style={{
                    textAlign: 'center', marginTop: '0.6rem', marginBottom: '0.4rem',
                    color: '#ffffff', fontSize: '0.82rem', letterSpacing: '0.18em',
                    textTransform: 'uppercase', fontFamily: "'Courier New', monospace", fontWeight: 700,
                    textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 10px #000',
                    animation: 'ma-neon 2.5s ease-in-out infinite',
                }}>
                    {isMobile ? '👆 toca el bus para ver asientos' : '🖱 pasa el cursor sobre el bus para ver asientos'}
                </div>

                <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                    <button onClick={() => onSelectPiso(1)} style={{
                        padding: '0.7rem 3rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                        fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.1em',
                        background: `linear-gradient(135deg, ${color1}, ${color2 || color1})`,
                        color: '#fff', boxShadow: `0 0 18px ${color1}55`,
                    }}>
                        Ver Asientos →
                    </button>
                </div>
            </div>
        );
    }

    /* ── 2-piso bus (original Gemini design) ── */
    return (
        <div style={{ width: '100%', maxWidth: 1000, margin: '0 auto', filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.25))' }}>
            <svg viewBox="0 0 1000 315" style={{ width: '100%', height: 'auto' }}>
                <defs>
                    <linearGradient id="gbnGrad" x1="100%" y1="0%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor={color1} />
                        <stop offset="100%" stopColor={color2 || color1} />
                    </linearGradient>
                    <filter id="gbnGlow" x="-15%" y="-15%" width="130%" height="130%">
                        <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#fde047" floodOpacity="0.7" />
                    </filter>
                </defs>

                {/* Bus body */}
                <path d="M 30 260 L 920 260 C 950 260 970 245 975 220 C 980 170 960 100 915 55 C 875 15 820 5 770 5 L 50 5 C 30 5 20 15 20 35 L 20 240 C 20 250 25 260 30 260 Z" fill="url(#gbnGrad)" />

                {/* Upper windows — PISO SUPERIOR click zone */}
                <g onMouseEnter={() => setHovPiso(2)} onMouseLeave={() => setHovPiso(null)} onClick={() => onSelectPiso(2)} style={{ cursor: 'pointer' }}>
                    <path d="M 20 110 L 20 35 C 20 20 35 15 50 15 L 800 15 C 850 15 885 35 920 80 L 935 110 Z" fill="#23272a" />
                    <path fill={wFill(2)} filter={wGlow(2)} className={winClass()} d="M 30 100 L 30 30 C 30 22 35 22 40 22 L 140 22 L 140 100 Z" style={{ animationDelay: '0s' }} />
                    <rect fill={wFill(2)} filter={wGlow(2)} className={winClass()} x="150" y="22" width="115" height="78" rx="4" style={{ animationDelay: '0.5s' }} />
                    <rect fill={wFill(2)} filter={wGlow(2)} className={winClass()} x="275" y="22" width="115" height="78" rx="4" style={{ animationDelay: '1s' }} />
                    <rect fill={wFill(2)} filter={wGlow(2)} className={winClass()} x="400" y="22" width="115" height="78" rx="4" style={{ animationDelay: '1.5s' }} />
                    <rect fill={wFill(2)} filter={wGlow(2)} className={winClass()} x="525" y="22" width="115" height="78" rx="4" style={{ animationDelay: '2s' }} />
                    <rect fill={wFill(2)} filter={wGlow(2)} className={winClass()} x="650" y="22" width="115" height="78" rx="4" style={{ animationDelay: '2.5s' }} />
                    <path fill={wFill(2)} filter={wGlow(2)} className={winClass()} d="M 775 100 L 775 22 L 820 22 C 845 22 870 35 895 65 L 912 100 Z" style={{ animationDelay: '0.25s' }} />
                    {hovPiso === 2 && <text x="460" y="74" textAnchor="middle" fill="#fde047" fontSize="22" fontWeight="900" fontFamily="'Bebas Neue', sans-serif" letterSpacing="5" pointerEvents="none">▲ PISO SUPERIOR ▲</text>}
                </g>

                {/* Lower windows — PISO INFERIOR click zone */}
                <g onMouseEnter={() => setHovPiso(1)} onMouseLeave={() => setHovPiso(null)} onClick={() => onSelectPiso(1)} style={{ cursor: 'pointer' }}>
                    <path d="M 330 155 L 710 155 L 710 230 L 375 230 C 345 230 335 200 330 155 Z" fill="#23272a" />
                    <path fill={wFill(1)} filter={wGlow(1)} className={winClass()} d="M 335 162 L 450 162 L 450 223 L 380 223 C 355 223 342 200 335 162 Z" style={{ animationDelay: '1.5s' }} />
                    <rect fill={wFill(1)} filter={wGlow(1)} className={winClass()} x="460" y="162" width="115" height="61" rx="4" style={{ animationDelay: '2s' }} />
                    <rect fill={wFill(1)} filter={wGlow(1)} className={winClass()} x="585" y="162" width="115" height="61" rx="4" style={{ animationDelay: '2.5s' }} />
                    {hovPiso === 1 && <text x="510" y="204" textAnchor="middle" fill="#fde047" fontSize="19" fontWeight="900" fontFamily="'Bebas Neue', sans-serif" letterSpacing="4" pointerEvents="none">▼ PISO INFERIOR ▼</text>}
                </g>

                {/* Driver zone */}
                <path d="M 760 114 L 890 114 C 905 114 915 124 920 144 L 928 200 L 760 200 Z" fill="#23272a" />
                <path d="M 767 121 L 880 121 C 895 121 905 134 910 154 L 915 193 L 767 193 Z" fill="#363f46" />
                <path d="M 885 114 L 950 114 C 970 144 975 174 970 200 L 935 200 C 925 165 915 135 885 114 Z" fill="#23272a" />
                <path d="M 890 119 L 943 119 C 960 144 965 169 960 195 L 940 195 C 930 165 922 140 890 119 Z" fill="#363f46" />

                {/* Reflections */}
                <path d="M 20 60 C 20 20 60 5 150 5 L 750 5 C 830 5 880 25 930 75 C 800 65 400 45 20 60 Z" fill="#ffffff" fillOpacity="0.12" pointerEvents="none" />
                <path d="M 50 5 L 770 5 C 815 5 858 14 900 44 L 830 12 L 50 5 Z" fill="#ffffff" fillOpacity="0.28" pointerEvents="none" />
                <rect x="25" y="168" width="720" height="5" rx="2.5" fill="#ffffff" fillOpacity="0.07" pointerEvents="none" />
                <polygon points="890,120 910,120 940,195 910,195" fill="#ffffff" fillOpacity="0.10" pointerEvents="none" />
                <line x1="900" y1="123" x2="932" y2="193" stroke="#ffffff" strokeWidth="5" strokeOpacity="0.11" pointerEvents="none" />

                {/* Wheels */}
                <path d="M 160 260 A 55 55 0 0 1 270 260 Z" fill="#23272a" />
                <path d="M 285 260 A 55 55 0 0 1 395 260 Z" fill="#23272a" />
                <path d="M 750 260 A 55 55 0 0 1 860 260 Z" fill="#23272a" />
                <circle cx="215" cy="260" r="42" fill="#363839" />
                <circle cx="215" cy="260" r="20" fill="#cfd3d5" />
                <circle cx="340" cy="260" r="42" fill="#363839" />
                <circle cx="340" cy="260" r="20" fill="#cfd3d5" />
                <circle cx="805" cy="260" r="42" fill="#363839" />
                <circle cx="805" cy="260" r="20" fill="#cfd3d5" />

                {/* Company name */}
                <text x="495" y="148" textAnchor="middle"
                    fontFamily="'Black Ops One', 'Bebas Neue', Arial, sans-serif"
                    fontSize="32" fontWeight="400"
                    stroke="#000000" strokeWidth="7" strokeLinejoin="round"
                    fill="none" fillOpacity={hovPiso ? 0.12 : 1}
                    letterSpacing="3" pointerEvents="none">
                    {(empresa || 'EMPRESA').toUpperCase()}
                </text>
                <text x="495" y="148" textAnchor="middle"
                    fontFamily="'Black Ops One', 'Bebas Neue', Arial, sans-serif"
                    fontSize="32" fontWeight="400"
                    fill="#ffffff" fillOpacity={hovPiso ? 0.08 : 1}
                    letterSpacing="3" pointerEvents="none">
                    {(empresa || 'EMPRESA').toUpperCase()}
                </text>

            </svg>

                <div style={{
                    textAlign: 'center', marginTop: '0.6rem', marginBottom: '0.4rem',
                    color: '#ffffff', fontSize: '0.82rem', letterSpacing: '0.18em',
                    textTransform: 'uppercase', fontFamily: "'Courier New', monospace", fontWeight: 700,
                    textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 10px #000',
                    animation: 'ma-neon 2.5s ease-in-out infinite',
                }}>
                    {isMobile ? '👆 toca el piso deseado para seleccionarlo' : '🖱 pasa el cursor sobre el piso deseado'}
                </div>
        </div>
    );
};

// Layout horizontal — planta del bus vista desde arriba
// Filas: A(y=25), B(y=60) | pasillo | C(y=105), D(y=140)  — columnas de derecha (frente) a izquierda (fondo)
const GeminiSeatMap = ({ piso, totalPisos = 1, reservados, bloqueados, seleccionados, onToggle, colorAccent = '#3b82f6', temaEmpresa = null }) => {
    const _SW = 55, _SH = 30;

    const ROWS = ['A', 'B', 'C', 'D'];

    const seatLibre     = temaEmpresa ? lighten(temaEmpresa.c1, 0.62) : '#646368';
    const seatSelected  = temaEmpresa ? temaEmpresa.c1 : colorAccent;
    const seatBloqueado = temaEmpresa ? darken(temaEmpresa.c2, 0.35) : '#4c1d95';
    const seatOcupado   = temaEmpresa ? darken(temaEmpresa.c1, 0.30) : '#7f1d1d';
    const seatHover     = temaEmpresa ? darken(temaEmpresa.c1, 0.55) : '#0056b3';

    const [hoveredId, setHoveredId] = useState(null);

    const winW = useWindowWidth();
    const isMob = winW < 700;
    const ROWS_Y = isMob ? [5, 30, 65, 90] : [25, 60, 105, 140];
    const SW = isMob ? 22 : _SW;
    const SH = isMob ? 22 : _SH;
    const VB_H = isMob ? 120 : 195;
    const svgViewBox = `0 0 1000 ${VB_H}`;
    const mobileW = Math.max(120, Math.round(winW * 0.43));
    const mobRendH = Math.round(mobileW / VB_H * 1000);
    // Clip container to just the bus X range so legend appears right below, not 1600px+ down
    const busXMax = isMob ? (totalPisos === 1 ? 970 : piso === 2 ? 864 : 945) : 970;
    const busXMin = isMob ? (totalPisos === 1 ? 492 : piso === 2 ? 490 : 583) : 40;
    const clipPad = isMob ? 8 : 0;
    const containerH = isMob
        ? Math.round(mobileW / VB_H * (busXMax - busXMin)) + 2 * clipPad
        : undefined;
    // Shift SVG so busXMax (cabina top in portrait) aligns with container top + clipPad
    const topOffset = isMob ? Math.round(mobRendH * (1 - busXMax / 1000)) - clipPad : 0;
    const wrapperStyle = isMob
        ? { position: 'relative', width: mobileW, height: containerH, overflow: 'hidden', margin: '0 auto' }
        : { width: '100%', overflowX: 'auto' };
    const svgStyle = isMob
        ? { position: 'absolute', width: mobRendH, height: mobileW,
            left: -(mobRendH - mobileW) / 2, top: (mobRendH - mobileW) / 2 - topOffset,
            transform: 'rotate(-90deg)', transformOrigin: 'center center' }
        : { width: '100%', minWidth: 360, height: 'auto' };

    const SeatRect = ({ id, x, y }) => {
        const locked = reservados.includes(id) || bloqueados.includes(id);
        const hov = hoveredId === id;
        let fill;
        if (reservados.includes(id))        fill = seatOcupado;
        else if (bloqueados.includes(id))   fill = seatBloqueado;
        else if (seleccionados.includes(id))fill = seatSelected;
        else if (!isMob && hov && !locked)  fill = seatHover;
        else                                fill = seatLibre;
        const label = /^P[12]/.test(id) ? id.slice(2) : id;
        const tx = x + SW / 2, ty = y + SH / 2 + (isMob ? 2 : 5);
        const tRot = isMob ? `rotate(90 ${tx} ${ty})` : undefined;
        return (
            <g onClick={() => { if (!locked) { onToggle(id); if (isMob) setHoveredId(null); } }}
                onMouseEnter={() => { if (!isMob) setHoveredId(id); }}
                onMouseLeave={() => { if (!isMob) setHoveredId(null); }}
                style={{ cursor: locked ? 'not-allowed' : 'pointer' }}>
                <rect x={x} y={y} width={SW} height={SH} rx="6" fill={fill} style={{ transition: 'fill 0.18s' }} />
                <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" transform={tRot}
                    fontFamily="Arial, 'Helvetica Neue', sans-serif" fontSize="11" fontWeight="700" letterSpacing="0.5"
                    stroke="#000" strokeWidth="2.5" strokeLinejoin="round" fill="none" pointerEvents="none">{label}</text>
                <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" transform={tRot}
                    fontFamily="Arial, 'Helvetica Neue', sans-serif" fontSize="11" fontWeight="700" letterSpacing="0.5"
                    fill="#fff" pointerEvents="none">{label}</text>
            </g>
        );
    };

    const LEGEND = [
        { fill: seatLibre,     label: 'Libre' },
        { fill: seatSelected,  label: 'Seleccionado' },
        { fill: seatBloqueado, label: 'Bloqueado' },
        { fill: seatOcupado,   label: 'Ocupado' },
    ];
    const Legend = () => (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem 1rem', marginTop: '0.85rem', padding: '0 0.25rem' }}>
            {LEGEND.map(({ fill, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 16, height: 16, background: fill, borderRadius: 4, flexShrink: 0, boxShadow: `0 0 6px ${fill}66` }} />
                    <span style={{
                        fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                        fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0',
                        textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                        letterSpacing: '0.03em',
                    }}>{label}</span>
                </div>
            ))}
        </div>
    );

    // ── 1-PISO — 46 asientos (12 columnas, col12 solo filas A+B) ──────────
    if (totalPisos === 1) {
        const COLS = isMob
            ? [874, 842, 810, 778, 746, 714, 682, 650, 618, 586, 554, 522]
            : [800, 735, 670, 605, 540, 475, 410, 345, 280, 215, 150, 85];
        const seats = [];
        COLS.forEach((cx, ci) => {
            const isLast = ci === COLS.length - 1; // col12 → filas C+D = zona baño
            ROWS_Y.forEach((ry, ri) => {
                if (isLast && ri >= 2) return;
                seats.push({ id: `${ROWS[ri]}${ci + 1}`, x: cx, y: ry });
            });
        });
        return (
            <div>
                <div style={wrapperStyle}>
                <svg viewBox={svgViewBox} style={svgStyle}>
                    {/* Planta del bus */}
                    <rect x={isMob?494:40} y={isMob?2:20} width={isMob?476:930} height={isMob?116:150} rx="20" fill="#2e3748" stroke={lighten(temaEmpresa?.c1 || '#6b7280', 0.35)} strokeWidth="2"/>
                    {/* Cabina conductor (arriba-derecha: filas A+B) */}
                    <path d={isMob ? "M 950 2 A 20 20 0 0 1 970 22 L 970 53 L 925 53 C 915 53 915 2 925 2 Z" : "M 950 20 A 20 20 0 0 1 970 40 L 970 95 L 870 95 C 860 95 860 20 870 20 Z"} fill="#8896a8"/>
                    <text x={isMob?945:920} y={isMob?29:57} textAnchor="middle" dominantBaseline="middle"
                        transform={isMob ? "rotate(90 945 29)" : undefined}
                        fontFamily="Arial,'Helvetica Neue',sans-serif" fontSize="13" fontWeight="700" letterSpacing="1.5"
                        stroke="#000" strokeWidth="2.5" strokeLinejoin="round" fill="none" pointerEvents="none">CABINA</text>
                    <text x={isMob?945:920} y={isMob?29:57} textAnchor="middle" dominantBaseline="middle"
                        transform={isMob ? "rotate(90 945 29)" : undefined}
                        fontFamily="Arial,'Helvetica Neue',sans-serif" fontSize="13" fontWeight="700" letterSpacing="1.5"
                        fill="#ffffff" pointerEvents="none">CABINA</text>
                    {/* Puerta (abajo-derecha: filas C+D) */}
                    <rect x={isMob?925:870} y={isMob?65:100} width={isMob?42:95} height={isMob?47:65} rx="8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5"/>
                    <text x={isMob?946:917} y={isMob?88:133} textAnchor="middle" dominantBaseline="middle"
                        transform={isMob ? "rotate(90 946 88)" : undefined}
                        fontFamily="Arial,'Helvetica Neue',sans-serif" fontSize={isMob?10:14} fontWeight="700" letterSpacing="1.5"
                        stroke="#000" strokeWidth="3" strokeLinejoin="round" fill="none" pointerEvents="none">PUERTA</text>
                    <text x={isMob?946:917} y={isMob?88:133} textAnchor="middle" dominantBaseline="middle"
                        transform={isMob ? "rotate(90 946 88)" : undefined}
                        fontFamily="Arial,'Helvetica Neue',sans-serif" fontSize={isMob?10:14} fontWeight="700" letterSpacing="1.5"
                        fill="#94a3b8" pointerEvents="none">PUERTA</text>
                    {/* Baño trasero */}
                    <rect x={isMob?496:45} y={isMob?65:100} width={isMob?35:75} height={isMob?47:65} rx="8" fill="#8896a8" stroke="#a0aec0" strokeWidth="1.5"/>
                    <text x={isMob?513:82} y={isMob?88:133} textAnchor="middle" dominantBaseline="middle"
                        transform={isMob ? "rotate(90 513 88)" : undefined}
                        fontFamily="Arial,'Helvetica Neue',sans-serif" fontSize={isMob?10:14} fontWeight="700" letterSpacing="1.5"
                        stroke="#000" strokeWidth="3" strokeLinejoin="round" fill="none" pointerEvents="none">BAÑO</text>
                    <text x={isMob?513:82} y={isMob?88:133} textAnchor="middle" dominantBaseline="middle"
                        transform={isMob ? "rotate(90 513 88)" : undefined}
                        fontFamily="Arial,'Helvetica Neue',sans-serif" fontSize={isMob?10:14} fontWeight="700" letterSpacing="1.5"
                        fill="#ffffff" pointerEvents="none">BAÑO</text>
                    {/* Asientos */}
                    {seats.map(s => <SeatRect key={s.id} id={s.id} x={s.x} y={s.y} />)}
                </svg>
                </div>
                <Legend />
            </div>
        );
    }

    // ── 2-PISO SUPERIOR — 42 asientos, piso === 2 ─────────────────────────
    // col1+col2 van a la derecha de escalera (frente); col3 en x=730 (A3+B3 encima, C3+D3 = escalera); col4-11 a la izquierda
    if (piso === 2) {
        const COLS2 = isMob
            ? [824, 792, 760, 728, 696, 664, 632, 600, 568, 536, 504]
            : [870, 805, 730, 665, 600, 535, 470, 405, 340, 275, 210];
        const seats2 = [];
        COLS2.forEach((cx, ci) => {
            ROWS_Y.forEach((ry, ri) => {
                if (ci === 2 && ri >= 2) return; // C3+D3 ocupados por escalera
                seats2.push({ id: `P2${ROWS[ri]}${ci + 1}`, x: cx, y: ry });
            });
        });
        return (
            <div>
                <div style={wrapperStyle}>
                <svg viewBox={svgViewBox} style={svgStyle}>
                    <g transform={isMob ? undefined : "translate(-72 0)"}>
                    <rect x={isMob?492:195} y={isMob?2:20} width={isMob?370:755} height={isMob?116:150} rx="20" fill="#2e3748" stroke={lighten(temaEmpresa?.c1 || '#6b7280', 0.35)} strokeWidth="2"/>
                    {/* Escalera — x=730, solo zona C+D (filas inferiores); A3+B3 quedan libres encima */}
                    <rect x={isMob?760:730} y={isMob?65:98} width={isMob?22:55} height={isMob?47:75} rx="6" fill="#8896a8"/>
                    {(isMob ? [69,79,89,99,109] : [110,125,140,155,168]).map(ly => (
                        <line key={ly} x1={isMob?760:730} y1={ly} x2={isMob?782:785} y2={ly} stroke="#9ab0c5" strokeWidth="1"/>
                    ))}
                    <text x={isMob?771:757} y={isMob?89:135} textAnchor="middle" dominantBaseline="middle" transform={isMob ? "rotate(90 771 89)" : "rotate(-90 757 135)"}
                        fontFamily="Arial, 'Helvetica Neue', sans-serif" fontSize={isMob?9:13} fontWeight="700" letterSpacing="1.5"
                        stroke="#000" strokeWidth="3.5" strokeLinejoin="round" fill="none" pointerEvents="none">ESCALERA</text>
                    <text x={isMob?771:757} y={isMob?89:135} textAnchor="middle" dominantBaseline="middle" transform={isMob ? "rotate(90 771 89)" : "rotate(-90 757 135)"}
                        fontFamily="Arial, 'Helvetica Neue', sans-serif" fontSize={isMob?9:13} fontWeight="700" letterSpacing="1.5"
                        fill="#ffffff" pointerEvents="none">ESCALERA</text>
                    {seats2.map(s => <SeatRect key={s.id} id={s.id} x={s.x} y={s.y} />)}
                    </g>
                </svg>
                </div>
                <Legend />
            </div>
        );
    }

    // ── 2-PISO INFERIOR — 20 asientos, piso === 1 && totalPisos === 2 ──
    const COLS_INF = isMob
        ? [820, 788, 756, 724, 692]
        : [715, 650, 585, 520, 455];
    const seatsInf = [];
    COLS_INF.forEach((cx, ci) => {
        ROWS_Y.forEach((ry, ri) => {
            seatsInf.push({ id: `P1${ROWS[ri]}${ci + 1}`, x: cx, y: ry });
        });
    });
    return (
        <div>
            <div style={wrapperStyle}>
            <svg viewBox={svgViewBox} style={svgStyle}>
                <rect x={isMob?585:50} y={isMob?2:20} width={isMob?360:900} height={isMob?116:150} rx="20" fill="#2e3748" stroke={lighten(temaEmpresa?.c1 || '#6b7280', 0.35)} strokeWidth="2"/>
                {/* Cabina (extremo derecho, full height, arcos matchan rx=20 del bus rect) */}
                <path d={isMob ? "M 925 2 A 20 20 0 0 1 945 22 L 945 98 A 20 20 0 0 1 925 118 L 898 118 L 898 2 Z" : "M 945 25 L 945 165 C 945 165 910 165 900 165 C 890 165 890 25 900 25 L 945 25 Z"} fill="#8896a8"/>
                <text x={isMob?922:917} y={isMob?60:100} textAnchor="middle" dominantBaseline="middle" transform={isMob ? "rotate(90 922 60)" : "rotate(-90 917 100)"}
                    fontFamily="Arial, 'Helvetica Neue', sans-serif" fontSize="13" fontWeight="700" letterSpacing="2"
                    stroke="#000" strokeWidth="3" strokeLinejoin="round" fill="none" pointerEvents="none">CABINA</text>
                <text x={isMob?922:917} y={isMob?60:100} textAnchor="middle" dominantBaseline="middle" transform={isMob ? "rotate(90 922 60)" : "rotate(-90 917 100)"}
                    fontFamily="Arial, 'Helvetica Neue', sans-serif" fontSize="13" fontWeight="700" letterSpacing="2"
                    fill="#ffffff" pointerEvents="none">CABINA</text>
                {/* Baño (zona A+B): mobile x=856–895(w=39), desktop x=795–865 */}
                <rect x={isMob?856:795} y={isMob?10:30} width={isMob?39:70} height={isMob?36:65} rx="6" fill="#8896a8" stroke="#a0aec0" strokeWidth="1.5"/>
                <text x={isMob?876:830} y={isMob?28:63} textAnchor="middle" dominantBaseline="middle"
                    transform={isMob ? "rotate(90 876 28)" : undefined}
                    fontFamily="Arial, 'Helvetica Neue', sans-serif" fontSize={isMob?11:14} fontWeight="700" letterSpacing={isMob?"0.5":"2"}
                    stroke="#000" strokeWidth="3" strokeLinejoin="round" fill="none" pointerEvents="none">BAÑO</text>
                <text x={isMob?876:830} y={isMob?28:63} textAnchor="middle" dominantBaseline="middle"
                    transform={isMob ? "rotate(90 876 28)" : undefined}
                    fontFamily="Arial, 'Helvetica Neue', sans-serif" fontSize={isMob?11:14} fontWeight="700" letterSpacing={isMob?"0.5":"2"}
                    fill="#ffffff" pointerEvents="none">BAÑO</text>
                {/* Escalera (zona C+D): mobile x=856–895(w=39), desktop x=795–850 */}
                <rect x={isMob?856:795} y={isMob?68:115} width={isMob?39:55} height={isMob?38:45} rx="4" fill="#8896a8"/>
                <text x={isMob?876:822} y={isMob?87:137} textAnchor="middle" dominantBaseline="middle"
                    transform={isMob ? "rotate(90 876 87)" : undefined}
                    fontFamily="Arial, 'Helvetica Neue', sans-serif" fontSize="8" fontWeight="700" letterSpacing="0.5"
                    stroke="#000" strokeWidth="2.5" strokeLinejoin="round" fill="none" pointerEvents="none">ESCALERA</text>
                <text x={isMob?876:822} y={isMob?87:137} textAnchor="middle" dominantBaseline="middle"
                    transform={isMob ? "rotate(90 876 87)" : undefined}
                    fontFamily="Arial, 'Helvetica Neue', sans-serif" fontSize="8" fontWeight="700" letterSpacing="0.5"
                    fill="#ffffff" pointerEvents="none">ESCALERA</text>
                {/* Bodega: mobile x=600–688(w=88), desktop x=70–430 */}
                <rect x={isMob?600:70} y={isMob?5:30} width={isMob?88:360} height={isMob?110:130} rx="8" fill="#8896a8" stroke="#a0aec0" strokeWidth="1.5" strokeDasharray="8 4"/>
                <text x={isMob?644:250} y={isMob?60:100} textAnchor="middle" dominantBaseline="middle"
                    transform={isMob ? "rotate(90 644 60)" : undefined}
                    fontFamily="Arial, 'Helvetica Neue', sans-serif" fontSize={isMob?12:18} fontWeight="700" letterSpacing={isMob?"2":"3"}
                    stroke="#000" strokeWidth="3" strokeLinejoin="round" fill="none" pointerEvents="none">BODEGA</text>
                <text x={isMob?644:250} y={isMob?60:100} textAnchor="middle" dominantBaseline="middle"
                    transform={isMob ? "rotate(90 644 60)" : undefined}
                    fontFamily="Arial, 'Helvetica Neue', sans-serif" fontSize={isMob?12:18} fontWeight="700" letterSpacing={isMob?"2":"3"}
                    fill="#ffffff" pointerEvents="none">BODEGA</text>
                {seatsInf.map(s => <SeatRect key={s.id} id={s.id} x={s.x} y={s.y} />)}
            </svg>
            </div>
            <Legend />
        </div>
    );
};

// ─── Tarjeta animada (tarjeta crédito) ───────────────
const TarjetaForm = ({ onConfirm, onCancelar, monto, tarjetaAccent = '#d97706', tarjetaBtnGrad, cardGold = '#d97706', empresaNombre, teBg, teC1 }) => {
    const isMob = useWindowWidth() < 700;
    const [numero, setNumero] = useState('');
    const [nombre, setNombre] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [flipped, setFlipped] = useState(false);

    const INTER = "'Inter', Arial, sans-serif";
    const btnGrad = tarjetaBtnGrad || `linear-gradient(135deg, ${cardGold} 0%, ${tarjetaAccent} 100%)`;
    const txtStroke = { color: '#ffffff', textShadow: '-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000,0 2px 5px rgba(0,0,0,0.7)' };

    const fmt = (v, max, sep) => {
        const d = v.replace(/\D/g, '').slice(0, max);
        return sep ? d.replace(new RegExp(`(.{${sep}})(?=.)`, 'g'), '$1 ') : d;
    };
    const fmtExpiry = (v) => {
        const d = v.replace(/\D/g, '').slice(0, 4);
        return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
    };

    const inpT = {
        width: '100%', boxSizing: 'border-box',
        background: teBg || '#0b1829',
        border: `1px solid ${tarjetaAccent}50`,
        color: '#f1f5f9', padding: '0.7rem 0.9rem',
        borderRadius: '10px', fontSize: '0.9rem', outline: 'none',
        fontFamily: INTER, textTransform: 'uppercase', letterSpacing: '0.04em',
    };
    const lblT = {
        display: 'block', color: tarjetaAccent, fontSize: '0.68rem',
        marginBottom: '0.35rem', fontFamily: INTER, fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.1em',
    };

    return (
        <div style={{ fontFamily: INTER }}>
            {/* Barra dual dorado + empresa */}
            <div style={{ height: 5, borderRadius: 3, background: `linear-gradient(90deg, ${cardGold} 0%, ${tarjetaAccent} 50%, ${tarjetaAccent} 100%)`, marginBottom: '1.25rem', boxShadow: `0 0 10px ${tarjetaAccent}60` }} />

            {/* Badge empresa — centrado */}
            {empresaNombre && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: teC1 || tarjetaAccent, border: 'none', borderRadius: 20, padding: '0.4rem 1.1rem' }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'rgba(255,255,255,0.55)', display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ color: '#ffffff', fontFamily: INTER, fontWeight: 900, fontSize: '0.82rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{empresaNombre}</span>
                    </div>
                </div>
            )}

            {/* ── 2 columnas: tarjetas izq | campos der ── */}
            <div style={{ display: 'flex', flexDirection: isMob ? 'column' : 'row', gap: '1.25rem', alignItems: 'flex-start', marginBottom: '1rem' }}>

                {/* Columna izquierda — stack de 2 tarjetas (modelo Gemini) */}
                <div style={{ flexShrink: 0, width: isMob ? '100%' : '400px' }}>
                    <div style={{ position: 'relative', width: isMob ? '100%' : '400px', height: isMob ? '220px' : '290px', userSelect: 'none' }}>

                        {/* TARJETA TRASERA — blanca, decorativa */}
                        <div style={{ position: 'absolute', top: 0, right: 0, width: '320px', height: '200px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 18px rgba(0,0,0,0.14)', border: '1px solid #e2e8f0', zIndex: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            {/* Banda magnética */}
                            <div style={{ width: '100%', height: '44px', background: '#1a1a1a', marginTop: '24px' }} />
                            <div style={{ flex: 1, padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                                        <span style={{ fontSize: '0.45rem', color: '#94a3b8', fontFamily: INTER, textTransform: 'uppercase', letterSpacing: '0.08em' }}>FIRMA AUTORIZADA</span>
                                        <span style={{ fontSize: '0.45rem', color: '#94a3b8', fontFamily: INTER, textTransform: 'uppercase', letterSpacing: '0.08em' }}>TBB</span>
                                    </div>
                                    <div style={{ display: 'flex', width: '100%', height: '34px' }}>
                                        <div style={{ flex: 1, background: 'white', border: '1px solid #e2e8f0' }} />
                                        <div style={{ width: '58px', background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#475569', fontWeight: 700 }}>{cvv || '•••'}</span>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        {[100, 83, 67].map((w, i) => <div key={i} style={{ height: 3, background: '#e2e8f0', borderRadius: 2, width: `${w}%` }} />)}
                                    </div>
                                </div>
                                <div style={{ alignSelf: 'flex-end', background: 'linear-gradient(to bottom, #d1d5db, #9ca3af)', borderRadius: 999, padding: '3px 10px', fontSize: '0.55rem', fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: INTER }}>DÉBITO</div>
                            </div>
                        </div>

                        {/* TARJETA FRONTAL — color empresa + textura SVG */}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '310px', height: '200px', borderRadius: '16px', background: teC1 || tarjetaAccent, boxShadow: `0 20px 50px ${(teC1 || tarjetaAccent)}70, 0 8px 20px rgba(0,0,0,0.4)`, zIndex: 10, overflow: 'hidden' }}>
                            {/* Textura SVG abstracta (de Gemini, colores empresa) */}
                            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.85 }} preserveAspectRatio="xMidYMid slice" viewBox="0 0 420 260">
                                <path d="M-50 100 C 150 0, 300 200, 450 50 L 450 -50 L -50 -50 Z" fill="rgba(255,255,255,0.13)" />
                                <path d="M-50 200 C 150 300, 250 50, 450 150 L 450 300 L -50 300 Z" fill="rgba(0,0,0,0.16)" />
                                <path d="M100 -50 C 150 150, 300 50, 450 200 L 450 -50 Z" fill="rgba(255,255,255,0.09)" />
                                <path d="M150 300 C 200 100, 350 250, 450 100 L 450 300 Z" fill="rgba(0,0,0,0.20)" />
                                <circle cx="350" cy="50" r="100" fill="rgba(255,255,255,0.07)" />
                                <circle cx="50" cy="200" r="120" fill="rgba(0,0,0,0.10)" />
                                <path d="M0 260 C 100 150, 300 150, 420 260 Z" fill="rgba(255,255,255,0.06)" />
                            </svg>
                            {/* Contenido */}
                            <div style={{ position: 'relative', zIndex: 1, padding: '1rem 1.2rem', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                {/* Header: empresa + TBB */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ ...txtStroke, fontFamily: INTER, fontWeight: 800, fontSize: '0.88rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{empresaNombre || 'EMPRESA'}</span>
                                    <span style={{ ...txtStroke, fontFamily: INTER, fontSize: '0.7rem', fontWeight: 300, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.85 }}>TBB</span>
                                </div>
                                {/* Chip EMV */}
                                <svg width="42" height="32" viewBox="0 0 42 32" fill="none" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }}>
                                    <rect width="42" height="32" rx="6" fill="#F4D03F"/>
                                    <path d="M12 0 V32 M30 0 V32 M0 12 H12 M30 12 H42 M0 20 H12 M30 20 H42" stroke="#B7950B" strokeWidth="1.5" opacity="0.5"/>
                                    <rect x="17" y="6" width="8" height="20" rx="2" stroke="#B7950B" strokeWidth="1.5" opacity="0.5"/>
                                </svg>
                                {/* Número */}
                                <div style={{ ...txtStroke, fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '4px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                    {numero || '•••• •••• •••• ••••'}
                                </div>
                                {/* Footer: nombre + expiry + logos */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1, marginRight: '0.75rem' }}>
                                        <div style={{ color: 'rgba(255,255,255,0.72)', fontFamily: INTER, fontSize: '0.46rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.15rem', textShadow: '0 1px 2px #000' }}>TITULAR</div>
                                        <div style={{ ...txtStroke, fontFamily: INTER, fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', maxWidth: '140px', overflow: 'hidden', whiteSpace: 'nowrap' }}>{nombre || 'TU NOMBRE AQUÍ'}</div>
                                    </div>
                                    <div style={{ marginRight: '0.75rem' }}>
                                        <div style={{ color: 'rgba(255,255,255,0.72)', fontFamily: INTER, fontSize: '0.46rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.15rem', textShadow: '0 1px 2px #000' }}>VENCE</div>
                                        <div style={{ ...txtStroke, fontFamily: INTER, fontSize: '0.7rem', fontWeight: 600 }}>{expiry || 'MM/AA'}</div>
                                    </div>
                                    {/* VISA + Mastercard */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                                        <span style={{ ...txtStroke, fontFamily: INTER, fontWeight: 900, fontStyle: 'italic', fontSize: '1rem', letterSpacing: '-1px' }}>VISA</span>
                                        <div style={{ position: 'relative', width: '38px', height: '24px', display: 'flex', alignItems: 'center' }}>
                                            <div style={{ position: 'absolute', left: 0, width: '22px', height: '22px', background: '#eb001b', borderRadius: '50%', zIndex: 1, boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
                                            <div style={{ position: 'absolute', left: '14px', width: '22px', height: '22px', background: '#f79e1b', borderRadius: '50%', zIndex: 2, opacity: 0.9, mixBlendMode: 'screen' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Columna derecha — campos */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                        <label style={lblT}>NÚMERO DE TARJETA</label>
                        <input value={numero} onChange={e => setNumero(fmt(e.target.value, 16, 4))}
                            placeholder="0000 0000 0000 0000" maxLength={19} style={inpT} />
                    </div>
                    <div>
                        <label style={lblT}>NOMBRE EN LA TARJETA</label>
                        <input value={nombre} onChange={e => setNombre(e.target.value.toUpperCase())}
                            placeholder="NOMBRE APELLIDO" style={inpT} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={lblT}>VENCIMIENTO</label>
                            <input value={expiry} onChange={e => setExpiry(fmtExpiry(e.target.value))}
                                placeholder="MM/AA" maxLength={5} style={inpT} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={lblT}>CVV</label>
                            <input value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                onFocus={() => setFlipped(true)} onBlur={() => setFlipped(false)}
                                placeholder="•••" maxLength={4} style={inpT} type="password" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Fila inferior: total + botones ── */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {/* Total */}
                <div style={{ background: teC1 || tarjetaAccent, border: 'none', borderRadius: '12px', padding: '0.9rem 1.2rem', textAlign: 'center', flexShrink: 0, boxShadow: `0 4px 18px rgba(0,0,0,0.25)` }}>
                    <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.62rem', fontFamily: INTER, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.25rem' }}>TOTAL</div>
                    <strong style={{ color: '#ffffff', fontSize: '1.55rem', fontFamily: INTER, fontWeight: 900, letterSpacing: '0.03em' }}>BS {monto}</strong>
                </div>

                {/* Botones */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button onClick={() => {
                        if (!numero || !nombre || !expiry || !cvv) return;
                        onConfirm('tarjeta');
                    }} style={{
                        width: '100%', padding: '0.8rem', background: btnGrad,
                        color: '#000000', border: 'none', borderRadius: '10px',
                        fontWeight: 900, cursor: 'pointer', fontSize: '0.88rem',
                        fontFamily: INTER, textTransform: 'uppercase', letterSpacing: '0.08em',
                        boxShadow: `0 0 18px ${tarjetaAccent}45`,
                    }}>
                        PAGAR CON TARJETA
                    </button>
                    <button onClick={onCancelar} style={{
                        width: '100%', padding: '0.65rem', background: 'transparent',
                        border: `1px solid ${tarjetaAccent}40`, borderRadius: '10px',
                        color: tarjetaAccent, cursor: 'pointer', fontSize: '0.78rem',
                        fontFamily: INTER, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em',
                    }}>
                        ← CAMBIAR MÉTODO
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Common button/input styles ───────────────────────
const lbl = {
    display: 'block', color: '#94a3b8', fontSize: '0.7rem', marginBottom: '0.35rem',
    fontFamily: "Arial, 'Helvetica Neue', sans-serif", fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.08em',
};
const inp = {
    width: '100%', boxSizing: 'border-box', background: '#0b1829',
    border: '1px solid #1e3a5f', color: '#f1f5f9', padding: '0.65rem 0.85rem',
    borderRadius: '9px', fontSize: '0.88rem', outline: 'none',
    fontFamily: "Arial, 'Helvetica Neue', sans-serif",
};
const btnPrimario = {
    flex: 1, padding: '0.85rem', background: '#2563eb', color: 'white',
    border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem',
};
const btnSecundario = {
    flex: 1, padding: '0.85rem', background: 'transparent',
    border: '1px solid #334155', color: '#94a3b8', borderRadius: '10px', cursor: 'pointer',
};

// ══════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════
const MapaAsientos = () => {
    const { viajeId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { sesion, perfil } = useAuth();
    const { tema } = useDepartamento();
    const toast = useToast();

    const [viaje, setViaje] = useState(location.state?.viaje || null);

    useEffect(() => {
        if (!viaje && viajeId) {
            getViaje(viajeId).then(v => { if (v) setViaje(v); });
        }
    }, [viajeId]); // eslint-disable-line

    const pisos = viaje?.buses?.pisos || viaje?.pisos || 1;
    const precioPorAsiento = parseFloat(viaje?.precio || 45);
    const origenViaje = viaje?.origen || '';
    const destinoViaje = viaje?.destino || '';
    const fechaSalidaViaje = viaje?.fecha_salida || viaje?.salida || viaje?.fechaSalida || new Date().toISOString();
    const empresaNombre = viaje?.sucursalNombre || viaje?.sucursal_nombre || viaje?.sucursales?.nombre || viaje?.empresa || '';
    const colorEmpresa = viaje?.colorAccent || viaje?.sucursales?.color_accent || viaje?.color_accent || tema.color || '#394285';
    const destDept = DEPT[destinoViaje] || { color: colorEmpresa, bg: '#0d1a2e', acento: '#93c5fd' };
    const dp = getDeptPaleta(destinoViaje);

    const windowWidth = useWindowWidth();
    const isMobile = windowWidth < 700;

    // ── Steps: silueta → mapa → formulario → pago → ticket
    const [paso, setPaso] = useState('silueta');
    const [pisoSeleccionado, setPisoSeleccionado] = useState(1);

    // ── Seat state
    const [cargando, setCargando] = useState(true);
    const [asientosReservados, setAsientosReservados] = useState([]);
    const [asientosBloqueados, setAsientosBloqueados] = useState([]);
    const [asientosSeleccionados, setAsientosSeleccionados] = useState([]);
    const cantidadBoletos = asientosSeleccionados.length || 1;

    useEffect(() => {
        const formularioMulti = paso === 'formulario' && asientosSeleccionados.length >= 2;
        document.body.style.overflow = (paso === 'ticket' || formularioMulti || (isMobile && paso !== 'pago')) ? '' : 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [paso, asientosSeleccionados.length, isMobile]);

    // ── Form state
    const [datosPasajeros, setDatosPasajeros] = useState({});
    const [requiereDocumentos, setRequiereDocumentos] = useState(false);
    const [pdfGenerado, setPdfGenerado] = useState(false);

    // ── Payment state
    const [metodoPago, setMetodoPago] = useState(null);
    const [mostrarModalVerificacion, setMostrarModalVerificacion] = useState(false);
    const [qrToken, setQrToken] = useState(null);
    const [pollingQr, setPollingQr] = useState(false);
    const [efectivoExpira, setEfectivoExpira] = useState(null);
    const [tiempoRestante, setTiempoRestante] = useState(null);
    const [qrExpiraEn, setQrExpiraEn] = useState(null);
    const [qrTiempoRestante, setQrTiempoRestante] = useState(null);
    const [procesandoPago, setProcesandoPago] = useState(false);

    // ── Ticket state
    const [reservaGenerada, setReservaGenerada] = useState(null);
    const [boletos, setBoletos] = useState([]);

    // Refs for intervals
    const pollingRef = useRef(null);
    const countdownRef = useRef(null);
    const seatPollRef = useRef(null);
    const qrTimerRef = useRef(null);
    const seleccionadosRef = useRef([]);

    // Unique session ID for this MapaAsientos instance — persists within tab, isolates
    // seat blocking so the same user's own blocked seats are never shown as "blocked by others"
    const sesionIdRef = useRef((() => {
        const key = `tbb_mapa_sesion_${viajeId}`;
        let sid = sessionStorage.getItem(key);
        if (!sid) { sid = Date.now().toString(36) + Math.random().toString(36).slice(2); sessionStorage.setItem(key, sid); }
        return sid;
    })());

    // ── Inject pulse CSS once ─────────────────────────
    useEffect(() => {
        if (!document.getElementById('tbb-pulse-css')) {
            const el = document.createElement('style');
            el.id = 'tbb-pulse-css';
            el.textContent = PULSE_STYLE;
            document.head.appendChild(el);
        }
    }, []);

    // Keep ref in sync so cargarAsientos never has stale selected list
    useEffect(() => { seleccionadosRef.current = asientosSeleccionados; }, [asientosSeleccionados]);

    // ── Load seat state & poll every 3s ──────────────
    const cargarAsientos = useCallback(() => {
        liberarAsientosExpirados();
        verificarExpiradas();
        const reservas = obtenerReservas(viajeId);
        const ocupados = reservas
            .filter(r => r.estado === 'confirmada' || r.estado === 'pendiente_efectivo' || r.estado === 'pendiente_documentos')
            .flatMap(r => r.asientos);
        setAsientosReservados(ocupados);

        const pendientes = obtenerAsientosPendientes(viajeId);
        const ahora = Date.now();
        const mySesionId = sesionIdRef.current;
        const bloqueados = pendientes
            .filter(p => p.expiraEn > ahora && p.sesionId !== mySesionId)
            .map(p => p.asiento)
            .filter(a => !seleccionadosRef.current.includes(a));
        setAsientosBloqueados(bloqueados);
    }, [viajeId]); // ref keeps this stable — no stale-closure bug

    useEffect(() => {
        setTimeout(() => setCargando(false), 400);
        cargarAsientos();
        seatPollRef.current = setInterval(cargarAsientos, 3000);
        return () => {
            clearInterval(seatPollRef.current);
            clearInterval(pollingRef.current);
            clearInterval(countdownRef.current);
            clearInterval(qrTimerRef.current);
        };
    }, [viajeId]); // eslint-disable-line

    // Liberar asientos pendientes si el usuario sale del panel sin completar pago
    useEffect(() => {
        return () => { liberarAsientosBloqueados(viajeId, seleccionadosRef.current); };
    }, [viajeId]); // eslint-disable-line

    // ── Restore pending seats from sessionStorage after login redirect ──
    useEffect(() => {
        if (!sesion) return;
        const raw = sessionStorage.getItem('tbb_pending_seats');
        if (!raw) return;
        try {
            const pending = JSON.parse(raw);
            if (pending && pending.viajeId === viajeId) {
                setAsientosSeleccionados(pending.asientosSeleccionados || []);
                setPisoSeleccionado(pending.piso || 1);
                sessionStorage.removeItem('tbb_pending_seats');
                setPaso('formulario');
                // Init form with perfil
                const seats = pending.asientosSeleccionados || [];
                const initial = {};
                seats.forEach((seat, i) => {
                    initial[seat] = i === 0 && perfil ? {
                        nombre: perfil.nombreCompleto || perfil.nombre_completo || '',
                        ci: perfil.ci || '',
                        telefono: perfil.telefono || '',
                        email: perfil.email || '',
                        esInfante: false, lleva1000: false, llevaAnimales: false, llevaProductos: false,
                    } : { nombre: '', ci: '', telefono: '', email: '', esInfante: false, lleva1000: false, llevaAnimales: false, llevaProductos: false };
                });
                setDatosPasajeros(initial);
                marcarAsientosPendientes(viajeId, seats, sesionIdRef.current);
            }
        } catch { sessionStorage.removeItem('tbb_pending_seats'); }
    }, [sesion]); // eslint-disable-line

    // ── QR polling ────────────────────────────────────
    useEffect(() => {
        if (!pollingQr || !qrToken) return;
        pollingRef.current = setInterval(() => {
            const estado = obtenerEstadoQR(qrToken);
            if (estado?.estado === 'pagado') {
                clearInterval(pollingRef.current);
                setPollingQr(false);
                finalizarReserva('qr');
            }
        }, 2000);
        return () => clearInterval(pollingRef.current);
    }, [pollingQr, qrToken]); // eslint-disable-line

    // ── Efectivo countdown ────────────────────────────
    useEffect(() => {
        if (!efectivoExpira) return;
        const tick = () => {
            const diff = efectivoExpira - Date.now();
            setTiempoRestante(diff > 0 ? diff : 0);
            if (diff <= 0) clearInterval(countdownRef.current);
        };
        tick();
        countdownRef.current = setInterval(tick, 1000);
        return () => clearInterval(countdownRef.current);
    }, [efectivoExpira]);

    // ── QR countdown (10 min auto-cancel) ────────────
    useEffect(() => {
        if (!qrExpiraEn) return;
        const tick = () => {
            const diff = qrExpiraEn - Date.now();
            setQrTiempoRestante(diff > 0 ? diff : 0);
            if (diff <= 0) {
                clearInterval(qrTimerRef.current);
                setPollingQr(false);
                setQrToken(null);
                setMetodoPago(null);
                setQrExpiraEn(null);
                setQrTiempoRestante(null);
                toast.mostrar('El código QR expiró. Intente nuevamente.', 'alerta');
            }
        };
        tick();
        qrTimerRef.current = setInterval(tick, 1000);
        return () => clearInterval(qrTimerRef.current);
    }, [qrExpiraEn]); // eslint-disable-line

    // ── Step transitions ──────────────────────────────

    const handleSelectPiso = (p) => {
        setPisoSeleccionado(p);
        setPaso('mapa');
    };

    const toggleAsiento = (id) => {
        if (asientosReservados.includes(id)) return;
        if (asientosBloqueados.includes(id)) {
            toast.mostrar('Este asiento está temporalmente bloqueado por otro usuario.', 'alerta');
            return;
        }
        if (asientosSeleccionados.includes(id)) {
            setAsientosSeleccionados(prev => prev.filter(a => a !== id));
            return;
        }
        if (asientosSeleccionados.length >= 10) {
            toast.mostrar('Máximo 10 asientos por reserva.', 'alerta');
            return;
        }
        setAsientosSeleccionados(prev => [...prev, id]);
    };

    const handleContinuarMapa = () => {
        if (asientosSeleccionados.length === 0) {
            toast.mostrar('Seleccione al menos un asiento.', 'alerta');
            return;
        }
        if (!sesion || perfil?.rol !== 'cliente') {
            // Save state and redirect
            sessionStorage.setItem('tbb_pending_seats', JSON.stringify({
                viajeId,
                asientosSeleccionados,
                piso: pisoSeleccionado,
            }));
            toast.mostrar('Debe iniciar sesión como cliente para continuar.', 'info');
            setTimeout(() => navigate(`/login-cliente?redirect=/reserva/${viajeId}`), 1200);
            return;
        }
        const initial = {};
        asientosSeleccionados.forEach((seat, i) => {
            initial[seat] = i === 0 && perfil ? {
                nombre: perfil.nombreCompleto || perfil.nombre_completo || '',
                ci: perfil.ci || '',
                telefono: perfil.telefono || '',
                email: perfil.email || '',
                esInfante: false, lleva1000: false, llevaAnimales: false, llevaProductos: false,
            } : { nombre: '', ci: '', telefono: '', email: '', esInfante: false, lleva1000: false, llevaAnimales: false, llevaProductos: false };
        });
        setDatosPasajeros(initial);
        setPaso('formulario');
    };

    const handleCIChange = async (seat, ci) => {
        setDatosPasajeros(prev => ({ ...prev, [seat]: { ...prev[seat], ci } }));
        if (ci.length >= 5) {
            let cliente = await buscarClientePorCI(ci);
            if (!cliente) cliente = obtenerCliente(ci);
            if (cliente) {
                setDatosPasajeros(prev => ({
                    ...prev,
                    [seat]: {
                        ...prev[seat], ci,
                        nombre: cliente.nombreCompleto || prev[seat]?.nombre,
                        telefono: cliente.telefono || prev[seat]?.telefono,
                        email: cliente.email || prev[seat]?.email,
                    },
                }));
                toast.mostrar(`Datos de ${cliente.nombreCompleto} cargados.`, 'info');
            }
        }
    };

    const handlePasajeroChange = (seat, field, value) => {
        setDatosPasajeros(prev => ({ ...prev, [seat]: { ...prev[seat], [field]: value } }));
    };

    const hayDeclaraciones = () => {
        return Object.values(datosPasajeros).some(d => d.lleva1000 || d.llevaAnimales || d.llevaProductos);
    };

    const hayInfante = () => Object.values(datosPasajeros).some(d => d.esInfante);

    const generarPDFDeclaracion = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Declaración Jurada de Equipaje y Bienes', 20, 20);
        doc.setFontSize(11);
        doc.text(`Viaje: ${origenViaje} → ${destinoViaje}`, 20, 35);
        doc.text(`Fecha de salida: ${formatFecha(fechaSalidaViaje)}`, 20, 43);
        doc.line(20, 48, 190, 48);

        let y = 58;
        Object.entries(datosPasajeros).forEach(([seat, datos]) => {
            if (datos.lleva1000 || datos.llevaAnimales || datos.llevaProductos) {
                doc.setFontSize(12);
                doc.text(`Pasajero: ${datos.nombre} — CI: ${datos.ci} — Asiento: ${seat}`, 20, y);
                y += 8;
                doc.setFontSize(10);
                if (datos.lleva1000) { doc.text('  ☐ Declara llevar más de $1,000 en efectivo', 20, y); y += 7; }
                if (datos.llevaAnimales) { doc.text('  ☐ Declara llevar animales', 20, y); y += 7; }
                if (datos.llevaProductos) { doc.text('  ☐ Declara llevar productos por más de $1,000', 20, y); y += 7; }
                y += 4;
            }
        });

        doc.setFontSize(10);
        doc.text('El pasajero declara voluntariamente los bienes listados y acepta las condiciones', 20, y + 10);
        doc.text('de transporte establecidas por la empresa.', 20, y + 18);
        doc.text('Firma: ________________________   Fecha: ________________________', 20, y + 35);
        doc.save('declaracion-tbb.pdf');
        setPdfGenerado(true);
        toast.mostrar('PDF de declaración descargado.', 'exito');
    };

    const handleConfirmarFormulario = (e) => {
        e.preventDefault();
        for (const [seat, datos] of Object.entries(datosPasajeros)) {
            if (!datos.nombre || !datos.ci) {
                toast.mostrar(`Complete nombre y CI para el asiento ${seat}.`, 'alerta');
                return;
            }
        }
        const compradorSeat = asientosSeleccionados[0];
        if (!datosPasajeros[compradorSeat]?.email) {
            toast.mostrar('El comprador debe ingresar su correo electrónico.', 'alerta');
            return;
        }
        if (hayDeclaraciones() && !pdfGenerado) {
            toast.mostrar('Debe descargar el PDF de declaración antes de continuar.', 'alerta');
            return;
        }
        setRequiereDocumentos(hayDeclaraciones() || hayInfante());
        setPaso('pago');
    };

    const buildReservaData = (metodo) => {
        const compradorSeat = asientosSeleccionados[0];
        const comprador = datosPasajeros[compradorSeat];
        return {
            viajeId,
            pasajeroNombre: comprador.nombre,
            pasajeroCI: comprador.ci,
            pasajeroTelefono: comprador.telefono,
            asientos: asientosSeleccionados,
            busPlaca: viaje?.busPlaca || 'ABC-1234',
            origen: origenViaje,
            destino: destinoViaje,
            precio: asientosSeleccionados.length * precioPorAsiento,
            fechaSalida: fechaSalidaViaje,
            pasajeros: datosPasajeros,
            metodoPago: metodo,
            sucursalId: viaje?.sucursales?.id || viaje?.sucursalId || null,
            sucursalNombre: empresaNombre || null,
        };
    };

    const finalizarReserva = (metodo) => {
        setProcesandoPago(true);
        const datos = buildReservaData(metodo);
        const resultado = crearReserva(datos);
        if (resultado.error) {
            toast.mostrar(resultado.mensaje, 'error');
            setProcesandoPago(false);
            setPaso('mapa');
            return;
        }
        const bs = crearBoletos(resultado, datosPasajeros);
        setReservaGenerada(resultado);
        setBoletos(bs);
        setProcesandoPago(false);
        toast.mostrar('¡Reserva confirmada exitosamente!', 'exito');
        setPaso('ticket');
        const compradorSeatKey = Object.keys(datosPasajeros)[0];
        const compradorEmail = datosPasajeros[compradorSeatKey]?.email;
        if (compradorEmail) {
            setTimeout(() => toast.mostrar(`📧 Boletos enviados a ${compradorEmail}`, 'exito'), 1800);
        }
    };

    const handleEfectivo = () => {
        const datos = buildReservaData('efectivo');
        const resultado = crearReservaConEstado(datos, 'pendiente_efectivo');
        if (resultado.error) {
            toast.mostrar(resultado.mensaje, 'error');
            return;
        }
        setReservaGenerada(resultado);
        setEfectivoExpira(Date.now() + 3 * 60 * 1000); // 3 min timer
        setMetodoPago('efectivo');
    };

    const handleQR = () => {
        const datos = buildReservaData('qr');
        const token = crearTokenQR(datos);
        setQrToken(token);
        setMetodoPago('qr');
        setPollingQr(true);
        setQrExpiraEn(Date.now() + 10 * 60 * 1000);
    };

    const handlePendienteDocumentos = () => {
        const datos = buildReservaData('cajero');
        const resultado = crearReservaConEstado(datos, 'pendiente_documentos');
        if (resultado.error) {
            toast.mostrar(resultado.mensaje, 'error');
            return;
        }
        const bs = crearBoletos(resultado, datosPasajeros);
        setReservaGenerada(resultado);
        setBoletos(bs);
        setMostrarModalVerificacion(true);
        setPaso('ticket');
    };

    const simularPagoQR = () => {
        if (!qrToken) return;
        actualizarEstadoQR(qrToken, 'pagado');
        toast.mostrar('Pago QR simulado confirmado.', 'exito');
    };

    const handleDownloadPDF = async () => {
        if (!boletos.length) return;
        const ticketEls = [...document.querySelectorAll('[data-ticket-pdf]')];
        if (!ticketEls.length) { toast.mostrar('No se encontraron boletos para exportar.', 'error'); return; }
        toast.mostrar('Generando PDF...', 'info');
        try {
            const html2canvas = (await import('html2canvas')).default;
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageW = 210, margin = 8;
            const ticketW = (pageW - margin * 3) / 2;
            const ticketH = ticketW * (360 / 600);
            const rowsPerPage = Math.floor((297 - margin * 2) / (ticketH + margin));

            for (let i = 0; i < ticketEls.length; i++) {
                const col = i % 2;
                const globalRow = Math.floor(i / 2);
                const localRow = globalRow % rowsPerPage;
                if (i > 0 && col === 0 && localRow === 0) pdf.addPage();
                const canvas = await html2canvas(ticketEls[i], {
                    scale: 2, useCORS: true, allowTaint: true,
                    backgroundColor: '#f4f6f8', logging: false,
                });
                const x = margin + col * (ticketW + margin);
                const y = margin + localRow * (ticketH + margin);
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, ticketW, ticketH);
            }
            pdf.save(`boletos-tbb-${(reservaGenerada?.id || '').slice(-8)}.pdf`);
            toast.mostrar('PDF descargado.', 'exito');
        } catch (err) {
            console.error('PDF error:', err);
            toast.mostrar('Error al generar PDF.', 'error');
        }
    };

    // ── Progress bar ─────────────────────────────────
    const PASOS_LABELS = ['Piso', 'Asientos', 'Datos', 'Pago', 'Boletos'];
    const PASOS_KEYS = ['silueta', 'mapa', 'formulario', 'pago', 'ticket'];
    const pasoIdx = PASOS_KEYS.indexOf(paso);

    const totalMonto = asientosSeleccionados.length * precioPorAsiento;

    // ── Colores para formas flotantes (empresa > depto > fallback) ───────────
    const te = getTemaEmpresa(empresaNombre);
    const MONEY_GREEN = '#1DB954';
    const efectivoAccent = te ? blendHex(MONEY_GREEN, te.c1, 0.30) : MONEY_GREEN;
    const efectivoBtnGrad = `linear-gradient(135deg, ${MONEY_GREEN} 0%, ${efectivoAccent} 100%)`;
    const QR_BLUE = '#3b82f6';
    const qrAccent = te ? blendHex(QR_BLUE, te.c1, 0.30) : QR_BLUE;
    const qrBtnGrad = `linear-gradient(135deg, ${QR_BLUE} 0%, ${qrAccent} 100%)`;
    const qrLogoSrc = getLogoEmpresa(empresaNombre);
    const CARD_GOLD = '#d97706';
    const tarjetaAccent = te ? blendHex(CARD_GOLD, te.c1, 0.30) : CARD_GOLD;
    const tarjetaBtnGrad = `linear-gradient(135deg, ${CARD_GOLD} 0%, ${tarjetaAccent} 50%, ${te?.c1 || CARD_GOLD} 100%)`;
    const C = te
        ? [te.c1, te.c2, te.c3, te.c4]
        : dp
            ? [dp.primary, dp.secondary, dp.bandera1, dp.bandera2]
            : [colorEmpresa, '#93c5fd', '#64748b', '#334155'];
    const ANIMS_FL = ['ma-flt-a','ma-flt-b','ma-flt-c','ma-flt-d'];
    const FL_SHAPES = [
        { l:'2%',   t:'10%', w:340, h:110, rx:'22px',           rot:-20, ci:0, op:0.10, an:0, dur:18, dl:0   },
        { l:'60%',  t:'18%', w:300, h:95,  rx:'18px',           rot:14,  ci:1, op:0.09, an:1, dur:22, dl:1.8 },
        { l:'65%',  t:'52%', w:360, h:115, rx:'24px',           rot:-9,  ci:0, op:0.08, an:2, dur:20, dl:3.2 },
        { l:'-4%',  t:'62%', w:310, h:100, rx:'20px',           rot:24,  ci:1, op:0.10, an:3, dur:25, dl:0.7 },
        { l:'28%',  t:'82%', w:270, h:88,  rx:'20px',           rot:-15, ci:2, op:0.09, an:0, dur:23, dl:2.1 },
        { l:'45%',  t:'-3%', w:380, h:105, rx:'26px',           rot:8,   ci:3, op:0.07, an:1, dur:28, dl:1.2 },
        { l:'18%',  t:'4%',  w:190, h:190, rx:'28px',           rot:28,  ci:2, op:0.09, an:2, dur:19, dl:1   },
        { l:'72%',  t:'28%', w:170, h:170, rx:'24px',           rot:-33, ci:0, op:0.08, an:3, dur:26, dl:3.8 },
        { l:'42%',  t:'68%', w:210, h:210, rx:'32px',           rot:17,  ci:1, op:0.07, an:0, dur:21, dl:0.9 },
        { l:'52%',  t:'88%', w:155, h:155, rx:'26px',           rot:-22, ci:3, op:0.09, an:1, dur:17, dl:2.7 },
        { l:'-2%',  t:'44%', w:175, h:175, rx:'30px',           rot:38,  ci:2, op:0.08, an:2, dur:30, dl:0.4 },
        { l:'82%',  t:'68%', w:210, h:230, rx:'0% 60% 60% 60%', rot:12,  ci:2, op:0.08, an:3, dur:24, dl:1.4 },
        { l:'-5%',  t:'30%', w:190, h:215, rx:'60% 0% 60% 60%', rot:-27, ci:3, op:0.09, an:0, dur:20, dl:4.1 },
        { l:'38%',  t:'38%', w:175, h:195, rx:'60% 60% 0% 60%', rot:44,  ci:0, op:0.07, an:1, dur:27, dl:0.6 },
        { l:'78%',  t:'-2%', w:180, h:200, rx:'60% 60% 60% 0%', rot:-18, ci:1, op:0.08, an:2, dur:22, dl:2.3 },
    ];

    // ── Render ────────────────────────────────────────
    return (
        <div style={{ background: '#07111f', minHeight: '100vh', color: '#f1f5f9', padding: 'clamp(0.75rem, 3vw, 1.5rem)', paddingTop: isMobile ? '6px' : '20px', position: 'relative' }}>

            {/* Fondo radial */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
                background: te ? `
                    radial-gradient(ellipse 60% 80% at 0% 50%,   ${te.c1}28 0%, transparent 65%),
                    radial-gradient(ellipse 60% 80% at 100% 50%, ${te.c2}22 0%, transparent 65%),
                    radial-gradient(ellipse 70% 45% at 50% -5%,  ${te.c3}15 0%, transparent 60%)
                ` : dp ? `
                    radial-gradient(ellipse 60% 80% at 0% 50%,   ${dp.bandera1}30 0%, transparent 65%),
                    radial-gradient(ellipse 60% 80% at 100% 50%, ${dp.bandera2}28 0%, transparent 65%),
                    radial-gradient(ellipse 70% 45% at 50% -5%,  ${dp.primary}18  0%, transparent 60%)
                ` : 'none'
            }} />

            {/* Formas flotantes */}
            <style>{`
                @keyframes ma-flt-a { 0%,100%{transform:translateY(0px) rotate(var(--rot))} 50%{transform:translateY(-12px) rotate(calc(var(--rot) + 1.5deg))} }
                @keyframes ma-flt-b { 0%,100%{transform:translateY(0px) translateX(0px) rotate(var(--rot))} 50%{transform:translateY(-8px) translateX(7px) rotate(calc(var(--rot) - 2deg))} }
                @keyframes ma-flt-c { 0%,100%{transform:translateY(0px) translateX(0px) rotate(var(--rot))} 50%{transform:translateY(-16px) translateX(-6px) rotate(calc(var(--rot) + 2.5deg))} }
                @keyframes ma-flt-d { 0%,100%{transform:translateY(0px) rotate(var(--rot))} 40%{transform:translateY(-10px) rotate(calc(var(--rot) - 1deg))} }
            `}</style>
            <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                {FL_SHAPES.map((s, i) => (
                    <div key={i} style={{
                        position: 'absolute', left: s.l, top: s.t,
                        width: s.w, height: s.h, borderRadius: s.rx,
                        background: C[s.ci], opacity: s.op,
                        '--rot': `${s.rot}deg`,
                        animation: `${ANIMS_FL[s.an]} ${s.dur}s ${-(s.dl + s.dur * 0.4)}s ease-in-out infinite`,
                    }} />
                ))}
            </div>

            <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

                {/* Route header — paleta rica por departamento destino */}
                <div style={{
                    background: dp
                        ? `linear-gradient(135deg, ${dp.bandera1}45 0%, ${dp.bandera2}35 50%, ${dp.primary}20 100%)`
                        : `linear-gradient(135deg, ${destDept.bg} 0%, #0d1a2e 100%)`,
                    borderRadius: '14px', padding: isMobile ? '0.4rem 0.65rem' : '0.75rem 1.25rem', marginBottom: isMobile ? '0.5rem' : '1.25rem',
                    border: `1.5px solid ${dp ? dp.primary + 'aa' : destDept.color + '40'}`,
                    boxShadow: dp
                        ? `0 4px 28px ${dp.bandera1}40, 0 0 0 1px ${dp.primary}30`
                        : `0 4px 20px ${destDept.color}18`,
                    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem',
                }}>
                    {/* Back */}
                    <button onClick={() => navigate('/sucursal/' + (viaje?.sucursalId || viaje?.sucursales?.id || ''))} style={{
                        background: '#dc2626',
                        border: 'none',
                        padding: isMobile ? '0.3rem 0.45rem' : '0.5rem 0.65rem', borderRadius: '10px', cursor: 'pointer',
                        flexShrink: 0, transition: 'background 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 10px rgba(220,38,38,0.45)',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#b91c1c'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#dc2626'; }}
                    >
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 14L4 9l5-5"/>
                            <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>
                        </svg>
                    </button>
                    {/* Divider */}
                    <div style={{ width: 1, height: isMobile ? 22 : 32, background: dp ? `linear-gradient(180deg, ${dp.bandera1}, ${dp.bandera2})` : `${destDept.color}30`, flexShrink: 0, opacity: 0.7 }} />
                    {/* Route info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: isMobile ? '0.9rem' : '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ color: '#ffffff' }}>{origenViaje || '—'}</span>
                            <span style={{ color: '#ffffff', fontSize: '0.9rem' }}>▶</span>
                            <span style={{ color: '#ffffff', fontWeight: 900 }}>{destinoViaje || '—'}</span>
                        </div>
                        <div style={{ color: '#ffffffcc', fontSize: '0.78rem', marginTop: '0.15rem' }}>{formatFecha(fechaSalidaViaje)}</div>
                    </div>
                    {/* Price */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ color: '#ffffff', fontWeight: 700, fontSize: isMobile ? '0.82rem' : '1rem' }}>Bs {precioPorAsiento} / asiento</div>
                        <div style={{ color: '#ffffffaa', fontSize: '0.75rem' }}>{empresaNombre}</div>
                    </div>
                </div>

                {/* Progress bar — futurista */}
                <style>{`
                    @keyframes ma-neon {
                        0%,100% { opacity: 0.7; }
                        50%     { opacity: 1; }
                    }
                    @keyframes ma-scan {
                        0%   { left: -60%; }
                        100% { left: 120%; }
                    }
                    @keyframes ma-check-pop { from { transform: rotate(-45deg) scale(0); opacity:0; } to { transform: rotate(0deg) scale(1); opacity:1; } }
                    @keyframes ma-ring-pulse {
                        0%,100% { transform: rotate(45deg) scale(1);   opacity: 0.6; }
                        50%     { transform: rotate(45deg) scale(1.22); opacity: 0; }
                    }
                    .ma-diamond { transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), filter 0.3s; }
                    .ma-diamond:hover { transform: rotate(45deg) scale(1.14) !important; }
                `}</style>
                {pasoIdx > 0 && (
                    <div style={{ textAlign: 'center', marginBottom: isMobile ? '0.2rem' : '0.5rem', fontSize: isMobile ? '0.7rem' : '0.82rem', color: te ? te.c1 : colorEmpresa, opacity: 0.75, letterSpacing: '0.08em', fontFamily: "Arial,'Helvetica Neue',sans-serif" }}>
                        ← Pulsa los rombos completados para regresar a ese paso
                    </div>
                )}
                <div style={{
                    position: 'relative', marginTop: isMobile ? '20px' : 0, marginBottom: isMobile ? '0.65rem' : '1.75rem',
                    background: '#040d1a',
                    border: `1px solid ${te ? te.c1 : colorEmpresa}28`,
                    borderRadius: 12, padding: isMobile ? '0.5rem 0.75rem 0.4rem' : '1rem 1.2rem 0.7rem',
                }}>
                    {/* Esquinas decorativas */}
                    {[['0%','0%','1px 0 0 1px'],['100%','0%','1px 0 0 1px'],['0%','100%','0 0 1px 1px'],['100%','100%','0 0 1px 1px']].map(([l,t,br],k) => (
                        <div key={k} style={{ position:'absolute', left:l, top:t, width:10, height:10,
                            border:`2px solid ${te ? te.c1 : colorEmpresa}`, borderRadius:br, transform: k===1||k===3 ? 'translateX(-100%)' : undefined }} />
                    ))}
                    {/* Badge PASO X/5 */}
                    <div style={{ position:'absolute', top:-10, right:16,
                        background:'#040d1a', border:`1px solid ${te ? te.c1 : colorEmpresa}55`,
                        borderRadius:6, padding:'0 8px', fontSize:'0.58rem', fontFamily:"'Courier New',monospace",
                        color: te ? te.c1 : colorEmpresa, letterSpacing:'0.15em', fontWeight:700,
                        animation:'ma-neon 2.5s ease-in-out infinite' }}>
                        PASO {pasoIdx + 1}/{PASOS_LABELS.length}
                    </div>

                    <div style={{ display:'flex', alignItems:'center' }}>
                    {PASOS_LABELS.map((label, i) => {
                        const completado = i < pasoIdx;
                        const actual     = i === pasoIdx;
                        const clr1 = te ? te.c1 : colorEmpresa;
                        const clr2 = te ? te.c2 : colorEmpresa;
                        const nodeSize = actual ? (isMobile ? 32 : 44) : (isMobile ? 26 : 36);
                        return (
                            <React.Fragment key={label}>
                                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:'0 0 auto',
                                    cursor: completado ? 'pointer' : 'default', minWidth: actual ? (isMobile ? 38 : 52) : (isMobile ? 30 : 44) }}
                                    onClick={() => { if (completado) setPaso(PASOS_KEYS[i]); }}>
                                    {/* Nodo diamante */}
                                    <div style={{ position:'relative', width:nodeSize, height:nodeSize, marginBottom: 6 }}>
                                        {/* Anillo pulso (solo actual) */}
                                        {actual && (
                                            <div style={{ position:'absolute', inset:-5, borderRadius:6,
                                                border:`1px solid ${clr1}88`,
                                                transform:'rotate(45deg)',
                                                animation:'ma-ring-pulse 1.8s ease-out infinite' }} />
                                        )}
                                        {/* Diamante principal */}
                                        <div className="ma-diamond" style={{
                                            width:'100%', height:'100%',
                                            transform:'rotate(45deg)',
                                            borderRadius: actual ? 8 : 6,
                                            background: actual
                                                ? `linear-gradient(135deg, ${clr1}, ${clr2})`
                                                : completado
                                                    ? `linear-gradient(135deg, ${clr1}cc, ${clr2}88)`
                                                    : 'linear-gradient(135deg,#0a1628,#0d1f38)',
                                            border: `2px solid ${actual ? clr1 : completado ? clr1+'88' : '#1e3a5f55'}`,
                                            boxShadow: actual
                                                ? `0 0 18px ${clr1}88, inset 0 0 10px ${clr2}44`
                                                : completado ? `0 0 8px ${clr1}44` : 'none',
                                            overflow:'hidden', position:'relative',
                                        }}>
                                            {/* Shimmer scan (solo actual) */}
                                            {actual && (
                                                <div style={{ position:'absolute', top:0, bottom:0, width:'50%',
                                                    background:`linear-gradient(90deg,transparent,${clr2}88,transparent)`,
                                                    animation:'ma-scan 1.6s linear infinite', pointerEvents:'none' }} />
                                            )}
                                            {/* Icono — contra-rotado */}
                                            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
                                                transform:'rotate(-45deg)',
                                                fontFamily:"'Courier New',monospace", fontWeight:900,
                                                fontSize: actual ? '1rem' : '0.8rem',
                                                color: actual || completado ? '#fff' : '#1e3a5f',
                                            }}>
                                                {completado
                                                    ? <span style={{ animation:'ma-check-pop 0.3s ease-out', display:'inline-block' }}>✓</span>
                                                    : i + 1
                                                }
                                            </div>
                                        </div>
                                    </div>
                                    {/* Label */}
                                    {!isMobile && (
                                    <div style={{
                                        fontSize:'0.58rem', fontWeight: actual ? 800 : completado ? 600 : 400,
                                        color: actual ? clr1 : completado ? clr1+'cc' : '#1e3a5f',
                                        whiteSpace:'nowrap', letterSpacing:'0.1em',
                                        textTransform:'uppercase', fontFamily:"'Courier New',monospace",
                                        textShadow: actual ? `0 0 10px ${clr1}99` : 'none',
                                        transition:'color 0.3s',
                                    }}>
                                        {label}
                                    </div>
                                    )}
                                </div>
                                {/* Conector */}
                                {i < PASOS_LABELS.length - 1 && (
                                    <div style={{ flex:1, minWidth:8, margin:'0 2px 22px', height:2,
                                        background:'#0d1f38', position:'relative', overflow:'hidden', borderRadius:99 }}>
                                        <div style={{
                                            position:'absolute', inset:0, borderRadius:99,
                                            background:`linear-gradient(90deg, ${clr1}, ${clr2})`,
                                            transform:`scaleX(${i < pasoIdx ? 1 : 0})`,
                                            transformOrigin:'left',
                                            transition:'transform 0.5s cubic-bezier(0.4,0,0.2,1)',
                                        }} />
                                        {/* Dot viajero en el último completado */}
                                        {i === pasoIdx - 1 && (
                                            <div style={{ position:'absolute', top:'50%', right:0,
                                                transform:'translateY(-50%)',
                                                width:6, height:6, borderRadius:'50%',
                                                background:clr2, boxShadow:`0 0 8px ${clr2}` }} />
                                        )}
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                    </div>
                </div>

                {cargando ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#60a5fa' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
                        Cargando distribución del bus...
                    </div>
                ) : (
                    <>
                        {/* ══ PASO 1: SILUETA ══ */}
                        {paso === 'silueta' && (
                            <div style={{ padding: '0.5rem 0', overflowX: isMobile ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch' }}>
                                <BusPerfilGemini
                                    onSelectPiso={handleSelectPiso}
                                    color1={te ? te.c1 : colorEmpresa}
                                    color2={te ? te.c2 : colorEmpresa}
                                    empresa={empresaNombre}
                                    pisos={pisos}
                                />
                            </div>
                        )}

                        {/* ══ PASO 2: MAPA DE ASIENTOS ══ */}
                        {paso === 'mapa' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
                                {/* Piso header */}
                                {pisos >= 2 && (
                                    <h3 style={{ margin: 0, textAlign: 'center', color: '#93c5fd', fontSize: '1rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'Black Ops One', 'Bebas Neue', sans-serif", fontWeight: 400 }}>
                                        {pisoSeleccionado === 2 ? '▲ Piso Superior' : '▼ Piso Inferior'}
                                    </h3>
                                )}

                                {/* Full-width seat map */}
                                <div style={{ overflowX: isMobile ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch' }}>
                                <GeminiSeatMap
                                    piso={pisoSeleccionado}
                                    totalPisos={pisos}
                                    reservados={asientosReservados}
                                    bloqueados={asientosBloqueados}
                                    seleccionados={asientosSeleccionados}
                                    onToggle={toggleAsiento}
                                    colorAccent={colorEmpresa}
                                    temaEmpresa={te}
                                />

                                </div>{/* end scroll wrapper */}

                                {/* Bottom action bar */}
                                <div style={{
                                    background: te ? `linear-gradient(135deg, ${te.c1}18 0%, ${te.c2}12 100%)` : '#0d1a2e',
                                    borderRadius: '14px', padding: '0.85rem 1.25rem',
                                    border: `1px solid ${te ? te.c1 + '50' : '#1e3a5f'}`,
                                    boxShadow: te ? `0 2px 20px ${te.c1}20` : 'none',
                                    display: 'flex', alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '1rem', flexWrap: 'wrap',
                                }}>
                                    {/* Seat chips */}
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', minWidth: 0 }}>
                                        {asientosSeleccionados.length === 0 ? (
                                            <span style={{ color: te ? te.c1 + '70' : '#475569', fontSize: '0.85rem', fontStyle: 'italic', fontFamily: "Arial, 'Helvetica Neue', sans-serif" }}>Ningún asiento seleccionado</span>
                                        ) : (
                                            asientosSeleccionados.map(s => (
                                                <span key={s} style={{
                                                    background: te ? te.c1 + '28' : 'rgba(59,130,246,0.2)',
                                                    border: `1px solid ${te ? te.c1 + '80' : '#3b82f6'}`,
                                                    color: te ? lighten(te.c1, 0.35) : '#93c5fd',
                                                    padding: '0.22rem 0.55rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700,
                                                    fontFamily: "Arial, 'Helvetica Neue', sans-serif", display: 'flex', alignItems: 'center', gap: '0.3rem',
                                                }}>
                                                    {s}
                                                    <button onClick={() => toggleAsiento(s)} style={{ background: 'none', border: 'none', color: te ? te.c1 + '90' : '#64748b', cursor: 'pointer', padding: 0, fontSize: '0.8rem', lineHeight: 1 }}>×</button>
                                                </span>
                                            ))
                                        )}
                                    </div>

                                    {/* Total + continue */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                                        <span style={{ color: te ? te.c2 || te.c1 : '#10b981', fontWeight: 800, fontSize: '1.15rem', whiteSpace: 'nowrap', fontFamily: "Arial, 'Helvetica Neue', sans-serif", textShadow: te ? `0 0 12px ${te.c2}80` : 'none' }}>Bs {totalMonto}</span>
                                        <button onClick={handleContinuarMapa}
                                            disabled={asientosSeleccionados.length === 0}
                                            style={{
                                                padding: '0.6rem 1.5rem', border: 'none', borderRadius: '10px',
                                                background: asientosSeleccionados.length > 0
                                                    ? (te ? `linear-gradient(135deg, ${te.c1}, ${te.c2})` : tema.color)
                                                    : '#1e293b',
                                                color: asientosSeleccionados.length > 0 ? 'white' : '#475569',
                                                fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                                                fontWeight: 700, cursor: asientosSeleccionados.length > 0 ? 'pointer' : 'not-allowed',
                                                fontSize: '0.9rem', transition: 'all 0.2s', whiteSpace: 'nowrap',
                                                boxShadow: asientosSeleccionados.length > 0 && te ? `0 0 16px ${te.c1}50` : 'none',
                                            }}>
                                            Continuar →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ══ PASO 3: FORMULARIO MULTI-PASAJERO ══ */}
                        {paso === 'formulario' && (
                            <div style={{ maxWidth: isMobile ? '100%' : asientosSeleccionados.length >= 2 ? '1100px' : '700px', margin: '0 auto' }}>
                                {/* Header */}
                                <div style={{ marginBottom: isMobile ? '0.65rem' : '1.5rem', borderBottom: `2px solid ${te ? te.c1 + '40' : '#1e3a5f'}`, paddingBottom: isMobile ? '0.5rem' : '1rem' }}>
                                    <h2 style={{
                                        margin: '0 0 0.3rem',
                                        fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                                        fontWeight: 900, fontSize: isMobile ? '1rem' : '1.3rem', letterSpacing: '0.06em',
                                        textTransform: 'uppercase',
                                        color: '#ffffff',
                                    }}>DATOS DE PASAJEROS</h2>
                                    <p style={{
                                        margin: 0, fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                                        color: '#64748b', fontSize: '0.82rem', letterSpacing: '0.04em',
                                        textTransform: 'uppercase',
                                    }}>
                                        {asientosSeleccionados.length} BOLETO{asientosSeleccionados.length > 1 ? 'S' : ''} — COMPLETE LOS DATOS DE CADA VIAJERO
                                    </p>
                                </div>

                                <form onSubmit={handleConfirmarFormulario} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: (!isMobile && asientosSeleccionados.length >= 2) ? '1fr 1fr' : '1fr',
                                        gap: '1rem',
                                    }}>
                                    {asientosSeleccionados.map((seat, idx) => {
                                        const datos = datosPasajeros[seat] || {};
                                        const esComprador = idx === 0;
                                        const isInfante = datos.esInfante;
                                        const tieneDeclaracion = datos.lleva1000 || datos.llevaAnimales || datos.llevaProductos;
                                        const baseBg = te?.bg || '#0d1a2e';
                                        // Color por estado — prioridad: infante > lleva1000 > animales > productos > normal
                                        const CARD_STATES = isInfante
                                            ? { tint: 'rgba(245,158,11,0.13)', border: '#b45309', badge: '#f59e0b', glow: 'rgba(245,158,11,0.15)', label: 'INFANTE' }
                                            : datos.llevaAnimales
                                            ? { tint: 'rgba(56,189,248,0.11)',  border: '#0369a1', badge: '#38bdf8', glow: 'rgba(56,189,248,0.15)',   label: '⚠ ANIMALES' }
                                            : datos.lleva1000
                                            ? { tint: 'rgba(34,197,94,0.11)',   border: '#15803d', badge: '#22c55e', glow: 'rgba(34,197,94,0.15)',    label: '⚠ EFECTIVO' }
                                            : datos.llevaProductos
                                            ? { tint: 'rgba(168,85,247,0.11)',  border: '#6b21a8', badge: '#a855f7', glow: 'rgba(168,85,247,0.15)',   label: '⚠ PRODUCTOS' }
                                            : { tint: te ? te.c1 + '12' : 'rgba(37,99,235,0.08)', border: te ? te.c1 + '55' : '#1e3a8a', badge: te?.c1 || '#2563eb', glow: te ? te.c1 + '15' : 'transparent', label: `ASIENTO ${seat}` };
                                        const cardBg     = `${baseBg}`;
                                        const cardBorder = CARD_STATES.border;
                                        const badgeBg    = CARD_STATES.badge;
                                        const badgeLabel = CARD_STATES.label;
                                        return (
                                            <div key={seat} style={{
                                                background: `linear-gradient(135deg, ${cardBg} 0%, ${cardBg} 60%, ${CARD_STATES.tint})`,
                                                borderRadius: '14px', padding: '1.25rem',
                                                border: `1px solid ${cardBorder}`,
                                                boxShadow: `0 2px 20px ${CARD_STATES.glow}`,
                                                transition: 'all 0.3s',
                                            }}>
                                                {/* Card header */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                        <span style={{
                                                            background: badgeBg, color: 'white',
                                                            fontSize: '0.68rem', fontWeight: 700,
                                                            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                                                            letterSpacing: '0.08em', textTransform: 'uppercase',
                                                            padding: '0.25rem 0.65rem', borderRadius: '6px',
                                                        }}>{badgeLabel}</span>
                                                        {esComprador && (
                                                            <span style={{
                                                                color: '#10b981', fontSize: '0.65rem', fontWeight: 700,
                                                                fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                                                                letterSpacing: '0.1em', textTransform: 'uppercase',
                                                                border: '1px solid #10b98140', padding: '0.2rem 0.5rem', borderRadius: '5px',
                                                            }}>COMPRADOR</span>
                                                        )}
                                                    </div>
                                                    {tieneDeclaracion && !isInfante && (
                                                        <span style={{ color: '#f87171', fontSize: '0.68rem', fontWeight: 700, fontFamily: "Arial, 'Helvetica Neue', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase' }}>DECLARACIÓN REQUERIDA</span>
                                                    )}
                                                </div>

                                                {/* Row 1: CI + Nombre */}
                                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.7rem', marginBottom: '0.7rem' }}>
                                                    <div>
                                                        <label style={lbl}>CI <span style={{ color: '#ef4444' }}>*</span></label>
                                                        <input type="text" value={datos.ci || ''} onChange={e => handleCIChange(seat, e.target.value)}
                                                            placeholder="Número de CI" style={{ ...inp, borderColor: te ? te.c1 + '50' : '#1e3a5f' }} />
                                                    </div>
                                                    <div>
                                                        <label style={lbl}>Nombre Completo <span style={{ color: '#ef4444' }}>*</span></label>
                                                        <input type="text" value={datos.nombre || ''} onChange={e => handlePasajeroChange(seat, 'nombre', e.target.value)}
                                                            placeholder="Nombre del pasajero" style={inp} />
                                                    </div>
                                                </div>

                                                {/* Row 2: Teléfono + Email (comprador) */}
                                                {esComprador && (
                                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.7rem', marginBottom: '0.7rem' }}>
                                                        <div>
                                                            <label style={lbl}>Teléfono / WhatsApp</label>
                                                            <input type="tel" value={datos.telefono || ''} onChange={e => handlePasajeroChange(seat, 'telefono', e.target.value)}
                                                                placeholder="Ej. 67146215" style={inp} />
                                                        </div>
                                                        <div>
                                                            <label style={lbl}>Correo electrónico <span style={{ color: '#ef4444' }}>*</span></label>
                                                            <input type="email" value={datos.email || ''} onChange={e => handlePasajeroChange(seat, 'email', e.target.value)}
                                                                placeholder="correo@ejemplo.com" style={inp} />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Infant toggle — no comprador */}
                                                {!esComprador && (
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.78rem', cursor: 'pointer', marginBottom: '0.5rem', fontFamily: "Arial, 'Helvetica Neue', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        <input type="checkbox" checked={isInfante}
                                                            onChange={e => handlePasajeroChange(seat, 'esInfante', e.target.checked)}
                                                            style={{ accentColor: '#f59e0b', width: '16px', height: '16px' }} />
                                                        Pasajero infante (menor de edad)
                                                    </label>
                                                )}

                                                {isInfante && (
                                                    <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid #b4530950', borderRadius: '10px', padding: '0.75rem', marginBottom: '0.75rem' }}>
                                                        <p style={{ color: '#fbbf24', fontSize: '0.75rem', margin: 0, fontWeight: 700, fontFamily: "Arial, 'Helvetica Neue', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>VALIDACIÓN PRESENCIAL REQUERIDA</p>
                                                        <p style={{ color: '#fcd34d', fontSize: '0.7rem', margin: '0.3rem 0 0', fontFamily: "Arial, 'Helvetica Neue', sans-serif" }}>
                                                            El menor debe presentar certificado de nacimiento o CI en sucursal antes del viaje.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Declaraciones */}
                                                <div style={{ borderTop: `1px solid ${cardBorder}50`, paddingTop: '0.75rem', marginTop: '0.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <p style={{ color: '#64748b', fontSize: '0.68rem', marginBottom: '0.5rem', margin: '0 0 0.5rem', fontFamily: "Arial, 'Helvetica Neue', sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>DECLARACIONES (MARQUE SI APLICA)</p>
                                                        {[
                                                            { key: 'lleva1000',     label: 'Lleva más de $1,000 en efectivo', accent: '#22c55e' },
                                                            { key: 'llevaAnimales', label: 'Lleva animales',                   accent: '#38bdf8' },
                                                            { key: 'llevaProductos',label: 'Lleva productos por más de $1,000',accent: '#a855f7' },
                                                        ].map(d => (
                                                            <label key={d.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isInfante ? '#475569' : '#94a3b8', fontSize: '0.78rem', cursor: isInfante ? 'not-allowed' : 'pointer', marginBottom: '0.35rem', fontFamily: "Arial, 'Helvetica Neue', sans-serif", opacity: isInfante ? 0.4 : 1 }}>
                                                                <input type="checkbox" checked={datos[d.key] || false}
                                                                    disabled={isInfante}
                                                                    onChange={e => handlePasajeroChange(seat, d.key, e.target.checked)}
                                                                    style={{ accentColor: d.accent, width: '15px', height: '15px', cursor: isInfante ? 'not-allowed' : 'pointer' }} />
                                                                {d.label}
                                                            </label>
                                                        ))}
                                                        {tieneDeclaracion && (
                                                            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid #7f1d1d80', borderRadius: '9px', padding: '0.65rem', marginTop: '0.5rem', color: '#fca5a5', fontSize: '0.73rem', fontFamily: "Arial, 'Helvetica Neue', sans-serif" }}>
                                                                ⚠ Debe declarar sus pertenencias en sucursal antes del viaje.
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Botón confirmar — solo en tarjeta única */}
                                                    {asientosSeleccionados.length === 1 && (
                                                        <button type="submit" style={{
                                                            alignSelf: 'stretch', minWidth: '160px', padding: '0.75rem 1.25rem',
                                                            background: te ? `linear-gradient(135deg, ${te.c1}, ${te.c2})` : '#10b981',
                                                            color: 'white', border: 'none', borderRadius: '10px',
                                                            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                                                            fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer',
                                                            textTransform: 'uppercase', letterSpacing: '0.08em',
                                                            boxShadow: te ? `0 0 16px ${te.c1}40` : '0 0 16px rgba(16,185,129,0.3)',
                                                            transition: 'all 0.2s',
                                                        }}>
                                                            CONFIRMAR<br/>DATOS →
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    </div>

                                    {/* PDF declaration */}
                                    {hayDeclaraciones() && (
                                        <button type="button" onClick={generarPDFDeclaracion} style={{
                                            padding: '0.75rem', background: pdfGenerado ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                            border: `1px solid ${pdfGenerado ? '#065f46' : '#78350f'}`,
                                            color: pdfGenerado ? '#6ee7b7' : '#fcd34d',
                                            borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
                                            fontFamily: "Arial, 'Helvetica Neue', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em',
                                        }}>
                                            {pdfGenerado ? '✓ PDF DE DECLARACIÓN DESCARGADO' : 'DESCARGAR PDF DE DECLARACIÓN (REQUERIDO)'}
                                        </button>
                                    )}

                                    {asientosSeleccionados.length >= 2 && (
                                        <button type="submit" style={{
                                            width: '100%', padding: '0.9rem',
                                            background: te ? `linear-gradient(135deg, ${te.c1}, ${te.c2})` : '#10b981',
                                            color: 'white', border: 'none', borderRadius: '12px',
                                            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                                            fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer',
                                            textTransform: 'uppercase', letterSpacing: '0.1em',
                                            boxShadow: te ? `0 0 20px ${te.c1}40` : '0 0 20px rgba(16,185,129,0.3)',
                                            transition: 'all 0.2s',
                                        }}>
                                            CONFIRMAR DATOS →
                                        </button>
                                    )}
                                </form>
                            </div>
                        )}

                        {/* ══ PASO 4: PAGO ══ */}
                        {paso === 'pago' && (
                            <div style={{ maxWidth: isMobile ? '100%' : '680px', margin: '0 auto', paddingTop: isMobile ? '2rem' : 0 }}>
                                {/* Header */}
                                <div style={{ marginBottom: isMobile ? '0.65rem' : '1.5rem', borderBottom: `2px solid ${te ? te.c1 + '40' : '#1e3a5f'}`, paddingBottom: isMobile ? '0.5rem' : '1rem' }}>
                                    <h2 style={{ margin: '0 0 0.3rem', fontFamily: "Arial,'Helvetica Neue',sans-serif", fontWeight: 900, fontSize: isMobile ? '1rem' : '1.3rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#ffffff' }}>MÉTODO DE PAGO</h2>
                                    <p style={{ margin: 0, fontFamily: "Arial,'Helvetica Neue',sans-serif", color: '#64748b', fontSize: '0.82rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                        TOTAL: <strong style={{ color: te ? te.c1 : '#10b981', fontSize: '1rem' }}>BS {totalMonto}</strong>
                                        {' '}— {asientosSeleccionados.length} BOLETO{asientosSeleccionados.length > 1 ? 'S' : ''}
                                    </p>
                                </div>

                                {/* ── Validación cajero obligatoria ── */}
                                {requiereDocumentos && !metodoPago && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                        <div style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid #4c1d95', borderRadius: '12px', padding: '1rem', color: '#c4b5fd', fontSize: '0.82rem', fontFamily: "Arial,'Helvetica Neue',sans-serif" }}>
                                            <strong style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>VALIDACIÓN PRESENCIAL OBLIGATORIA</strong><br />
                                            Esta reserva contiene infantes o declaraciones especiales. El pago en línea no está disponible. Preséntese en la ventanilla del cajero con su CI y documentos.
                                        </div>
                                        <button onClick={handlePendienteDocumentos} style={{ ...btnPrimario, background: '#7c3aed', boxShadow: '0 0 18px rgba(124,58,237,0.4)', fontFamily: "Arial,'Helvetica Neue',sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                            REGISTRAR Y PRESENTARSE AL CAJERO →
                                        </button>
                                    </div>
                                )}

                                {/* ── Selector 3 columnas (Efectivo | QR | Tarjeta) ── */}
                                {!requiereDocumentos && !metodoPago && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: isMobile ? '0.4rem' : '1rem', marginBottom: '1.25rem' }}>
                                        {[
                                            {
                                                key: 'efectivo',
                                                label: 'EFECTIVO',
                                                desc: 'Reserva por 3 min. Paga en ventanilla.',
                                                accent: efectivoAccent,
                                                icon: (
                                                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                                                    </svg>
                                                ),
                                            },
                                            {
                                                key: 'qr',
                                                label: 'PAGO QR',
                                                desc: 'Escanea con tu app bancaria.',
                                                accent: te ? te.c1 : '#3b82f6',
                                                icon: (
                                                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                                                        <rect x="5" y="5" width="3" height="3" fill="currentColor" stroke="none"/><rect x="16" y="5" width="3" height="3" fill="currentColor" stroke="none"/><rect x="5" y="16" width="3" height="3" fill="currentColor" stroke="none"/>
                                                        <line x1="14" y1="14" x2="14" y2="14"/><line x1="17" y1="14" x2="17" y2="14"/><line x1="20" y1="14" x2="20" y2="14"/>
                                                        <line x1="14" y1="17" x2="14" y2="17"/><line x1="20" y1="17" x2="20" y2="17"/>
                                                        <line x1="14" y1="20" x2="14" y2="20"/><line x1="17" y1="20" x2="20" y2="20"/>
                                                    </svg>
                                                ),
                                            },
                                            {
                                                key: 'tarjeta',
                                                label: 'TARJETA',
                                                desc: 'Crédito o débito de forma segura.',
                                                accent: '#10b981',
                                                icon: (
                                                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                                                        <line x1="5" y1="15" x2="9" y2="15"/><line x1="5" y1="17" x2="7" y2="17"/>
                                                        <circle cx="17" cy="15" r="2" fill="currentColor" fillOpacity="0.3"/><circle cx="19.5" cy="15" r="2" fill="currentColor" fillOpacity="0.5"/>
                                                    </svg>
                                                ),
                                            },
                                        ].map(m => (
                                            <button key={m.key} onClick={() => {
                                                if (m.key === 'efectivo') handleEfectivo();
                                                else if (m.key === 'qr') handleQR();
                                                else setMetodoPago('tarjeta');
                                            }} style={{
                                                padding: isMobile ? '0.75rem 0.25rem' : '1.5rem 1rem',
                                                background: m.key === 'qr'
                                                    ? `linear-gradient(135deg, ${QR_BLUE} 0%, ${qrAccent} 50%, ${te?.c1 || QR_BLUE} 100%)`
                                                    : m.key === 'efectivo'
                                                        ? `linear-gradient(135deg, ${MONEY_GREEN} 0%, ${efectivoAccent} 50%, ${te?.c1 || MONEY_GREEN} 100%)`
                                                        : tarjetaBtnGrad,
                                                border: `1.5px solid ${m.key === 'qr' ? qrAccent : m.key === 'efectivo' ? efectivoAccent : tarjetaAccent}`,
                                                borderRadius: '12px', color: m.accent, cursor: 'pointer',
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? '0.3rem' : '0.65rem',
                                                textAlign: 'center', transition: 'all 0.2s',
                                                boxShadow: m.key === 'qr' ? `0 4px 20px ${qrAccent}50` : m.key === 'efectivo' ? `0 4px 20px ${efectivoAccent}50` : `0 4px 20px ${tarjetaAccent}50`,
                                            }}
                                                onMouseEnter={e => { e.currentTarget.style.borderColor = m.accent; e.currentTarget.style.boxShadow = m.key === 'qr' ? `0 6px 32px ${qrAccent}70` : m.key === 'efectivo' ? `0 6px 32px ${efectivoAccent}70` : `0 6px 32px ${tarjetaAccent}70`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.borderColor = m.key === 'qr' ? qrAccent : m.key === 'efectivo' ? efectivoAccent : tarjetaAccent; e.currentTarget.style.boxShadow = m.key === 'qr' ? `0 4px 20px ${qrAccent}50` : m.key === 'efectivo' ? `0 4px 20px ${efectivoAccent}50` : `0 4px 20px ${tarjetaAccent}50`; e.currentTarget.style.transform = 'none'; }}
                                            >
                                                <span style={{ color: '#000000' }}>{m.icon}</span>
                                                <div style={{ fontFamily: "Arial,'Helvetica Neue',sans-serif", fontWeight: 900, fontSize: isMobile ? '0.68rem' : '1rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#000000' }}>{m.label}</div>
                                                {!isMobile && <div style={{ fontFamily: "Arial,'Helvetica Neue',sans-serif", color: '#111111', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.02em', lineHeight: 1.4 }}>{m.desc}</div>}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* ── Modal overlay para flows de pago ── */}
                                {(metodoPago === 'efectivo' || metodoPago === 'qr' || metodoPago === 'tarjeta' || procesandoPago) && (() => {
                                    const modalAccent = metodoPago === 'efectivo' ? efectivoAccent : metodoPago === 'qr' ? qrAccent : metodoPago === 'tarjeta' ? tarjetaAccent : (te?.c1 || '#3b82f6');
                                    const modalLabel  = metodoPago === 'efectivo' ? 'EFECTIVO EN SUCURSAL' : metodoPago === 'qr' ? 'PAGO QR' : metodoPago === 'tarjeta' ? 'PAGO CON TARJETA' : 'PROCESANDO';
                                    const cerrarModal = () => {
                                        if (metodoPago === 'efectivo') { setMetodoPago(null); setReservaGenerada(null); setEfectivoExpira(null); }
                                        else if (metodoPago === 'qr') { setMetodoPago(null); setQrToken(null); setPollingQr(false); setQrExpiraEn(null); setQrTiempoRestante(null); }
                                        else setMetodoPago(null);
                                    };
                                    return (
                                        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'center', background: `rgba(0,0,0,0.72)`, backdropFilter: 'blur(10px)', padding: '0.75rem', paddingTop: isMobile ? 'calc(4.5rem + 20px)' : '6rem', overflowY: 'auto' }}>
                                            <div style={{
                                                background: `linear-gradient(145deg, ${te?.bg || '#07111f'} 0%, ${te?.bg || '#07111f'} 55%, ${modalAccent}18 100%)`,
                                                border: `1.5px solid ${modalAccent}55`,
                                                borderRadius: '18px', padding: isMobile ? '1rem' : '2rem',
                                                width: '100%', maxWidth: metodoPago === 'qr' ? '640px' : metodoPago === 'tarjeta' ? '860px' : '460px',
                                                boxShadow: `0 8px 48px ${modalAccent}30, 0 0 0 1px ${modalAccent}20`,
                                                position: 'relative', marginBottom: isMobile ? '1rem' : 0,
                                            }}>
                                                {/* Header modal */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobile ? '0.6rem' : '1.5rem', borderBottom: `1px solid ${modalAccent}30`, paddingBottom: isMobile ? '0.5rem' : '1rem' }}>
                                                    <div>
                                                        <div style={{ fontFamily: "Arial,'Helvetica Neue',sans-serif", fontWeight: 900, fontSize: '0.95rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: modalAccent }}>{modalLabel}</div>
                                                        <div style={{ fontFamily: "Arial,'Helvetica Neue',sans-serif", fontSize: '0.7rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.15rem' }}>BS {totalMonto} — {asientosSeleccionados.length} BOLETO{asientosSeleccionados.length > 1 ? 'S' : ''}</div>
                                                    </div>
                                                    {!procesandoPago && (
                                                        <button onClick={cerrarModal} style={{ background: '#dc2626', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#ffffff', cursor: 'pointer', fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(220,38,38,0.45)', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background='#b91c1c'} onMouseLeave={e => e.currentTarget.style.background='#dc2626'}>✕</button>
                                                    )}
                                                </div>

                                                {/* Efectivo */}
                                                {metodoPago === 'efectivo' && (
                                                    <div style={{ textAlign: 'center' }}>
                                                        {/* Barra dual money-green + color empresa */}
                                                        <div style={{ height: 5, borderRadius: 3, background: `linear-gradient(90deg, ${MONEY_GREEN} 0%, ${efectivoAccent} 50%, ${te?.c1 || MONEY_GREEN} 100%)`, marginBottom: '1rem', boxShadow: `0 0 10px ${efectivoAccent}60` }} />

                                                        {/* Badge empresa */}
                                                        {empresaNombre && (
                                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: te?.c1 || efectivoAccent, border: 'none', borderRadius: 20, padding: '0.35rem 1rem', marginBottom: '0.75rem' }}>
                                                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.55)', display: 'inline-block', flexShrink: 0 }} />
                                                                <span style={{ color: '#ffffff', fontFamily: "Arial,'Helvetica Neue',sans-serif", fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{empresaNombre}</span>
                                                            </div>
                                                        )}

                                                        {/* Monto */}
                                                        <div style={{ background: te?.c1 || efectivoAccent, borderRadius: '10px', padding: '0.55rem 1.1rem', marginBottom: '1rem', display: 'inline-block' }}>
                                                            <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.62rem', fontFamily: "Arial,'Helvetica Neue',sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>TOTAL A PAGAR</div>
                                                            <div style={{ color: '#ffffff', fontWeight: 900, fontSize: '1.35rem', fontFamily: "Arial,'Helvetica Neue',sans-serif" }}>BS {totalMonto}</div>
                                                        </div>

                                                        {/* Timer urgencia */}
                                                        <div style={{ color: '#ef4444', fontSize: '3rem', fontFamily: 'monospace', fontWeight: 800, letterSpacing: '4px', marginBottom: '0.5rem', textShadow: '0 0 18px rgba(239,68,68,0.5)' }}>
                                                            {tiempoRestante !== null ? formatCountdown(tiempoRestante) : '03:00'}
                                                        </div>
                                                        <div style={{ color: lighten(efectivoAccent, 0.30), fontSize: '0.8rem', marginBottom: '1rem', fontFamily: "Arial,'Helvetica Neue',sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>TIEMPO PARA PAGAR EN SUCURSAL</div>
                                                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #7f1d1d', borderRadius: '10px', padding: '0.75rem', color: '#fca5a5', fontSize: '0.78rem', marginBottom: '1rem', fontFamily: "Arial,'Helvetica Neue',sans-serif", textAlign: 'left' }}>
                                                            ⚠ Si no paga dentro del tiempo límite, su reserva será <strong>cancelada automáticamente</strong>.
                                                        </div>
                                                        <div style={{ background: `${efectivoAccent}10`, border: `1px solid ${efectivoAccent}35`, borderRadius: '10px', padding: '0.6rem', marginBottom: '1.5rem' }}>
                                                            <div style={{ color: '#64748b', fontSize: '0.68rem', fontFamily: "Arial,'Helvetica Neue',sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem', fontWeight: 700 }}>RESERVA ID</div>
                                                            <strong style={{ color: lighten(efectivoAccent, 0.40), fontFamily: 'monospace', fontSize: '0.95rem', letterSpacing: '0.05em' }}>{reservaGenerada?.id}</strong>
                                                        </div>
                                                        <button onClick={() => navigate('/')} style={{ ...btnPrimario, width: '100%', fontFamily: "Arial,'Helvetica Neue',sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', background: efectivoBtnGrad, color: '#0B1120', fontWeight: 900, boxShadow: `0 0 20px ${efectivoAccent}45` }}>
                                                            ENTENDIDO — IR A PAGAR
                                                        </button>
                                                        <button onClick={cerrarModal} style={{ ...btnSecundario, width: '100%', marginTop: '0.6rem', fontFamily: "Arial,'Helvetica Neue',sans-serif", textTransform: 'uppercase', fontSize: '0.78rem', borderColor: `${efectivoAccent}40`, color: lighten(efectivoAccent, 0.25) }}>
                                                            ← CAMBIAR MÉTODO
                                                        </button>
                                                    </div>
                                                )}

                                                {/* QR */}
                                                {metodoPago === 'qr' && qrToken && (
                                                    <div>
                                                        {/* Barra dual QR-blue + color empresa */}
                                                        <div style={{ height: 5, borderRadius: 3, background: `linear-gradient(90deg, ${QR_BLUE} 0%, ${qrAccent} 50%, ${te?.c1 || QR_BLUE} 100%)`, marginBottom: isMobile ? '0.6rem' : '1.25rem', boxShadow: `0 0 10px ${qrAccent}60` }} />

                                                        {/* Layout 2 columnas (1 en mobile) */}
                                                        <div style={{ display: 'flex', gap: isMobile ? '0.6rem' : '1.5rem', alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>

                                                            {/* ── Columna izquierda: QR grande ── */}
                                                            <div style={{ flexShrink: 0, textAlign: 'center', width: isMobile ? '100%' : 'auto' }}>
                                                                <div style={{ display: 'inline-block', padding: isMobile ? '8px' : '12px', borderRadius: '16px', background: 'white', border: `3px solid ${qrAccent}`, boxShadow: `0 0 32px ${qrAccent}50`, position: 'relative' }}>
                                                                    <QRCodeSVG
                                                                        value={`${window.location.origin}/pago/qr?token=${qrToken}&monto=${totalMonto}&origen=${encodeURIComponent(origenViaje)}&destino=${encodeURIComponent(destinoViaje)}`}
                                                                        size={isMobile ? 180 : 220}
                                                                        level="H"
                                                                    />
                                                                    {qrLogoSrc && (
                                                                        <img
                                                                            src={qrLogoSrc}
                                                                            alt={empresaNombre}
                                                                            style={{
                                                                                position: 'absolute',
                                                                                top: '50%', left: '50%',
                                                                                transform: 'translate(-50%, -50%)',
                                                                                width: isMobile ? 64 : 86, height: isMobile ? 64 : 86,
                                                                                borderRadius: 14,
                                                                                background: 'white',
                                                                                padding: 5,
                                                                                boxShadow: `0 2px 12px rgba(0,0,0,0.18)`,
                                                                                objectFit: 'contain',
                                                                            }}
                                                                        />
                                                                    )}
                                                                </div>
                                                                <div style={{ marginTop: '0.6rem', color: '#475569', fontSize: '0.65rem', fontFamily: "Arial,'Helvetica Neue',sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em' }}>ESCANEA CON TU APP</div>
                                                            </div>

                                                            {/* ── Columna derecha: datos + acciones ── */}
                                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: isMobile ? '0.35rem' : '0.75rem' }}>

                                                                {/* Badge empresa */}
                                                                {empresaNombre && (
                                                                    <div style={{ display: 'flex', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: te?.c1 || qrAccent, border: 'none', borderRadius: 20, padding: isMobile ? '0.18rem 0.6rem' : '0.35rem 1rem' }}>
                                                                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.55)', display: 'inline-block', flexShrink: 0 }} />
                                                                            <span style={{ color: '#ffffff', fontFamily: "Arial,'Helvetica Neue',sans-serif", fontWeight: 800, fontSize: isMobile ? '0.62rem' : '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{empresaNombre}</span>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Monto + Token lado a lado en mobile */}
                                                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr', gap: '0.35rem' }}>
                                                                    <div style={{ background: te?.c1 || qrAccent, borderRadius: '10px', padding: isMobile ? '0.3rem 0.65rem' : '0.6rem 0.85rem' }}>
                                                                        <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.6rem', fontFamily: "Arial,'Helvetica Neue',sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.1rem' }}>TOTAL A PAGAR</div>
                                                                        <div style={{ color: '#ffffff', fontWeight: 900, fontSize: isMobile ? '1.05rem' : '1.4rem', fontFamily: "Arial,'Helvetica Neue',sans-serif", letterSpacing: '0.02em' }}>BS {totalMonto}</div>
                                                                    </div>
                                                                    <div style={{ background: `${qrAccent}10`, border: `1px solid ${qrAccent}30`, borderRadius: '8px', padding: isMobile ? '0.25rem 0.6rem' : '0.5rem 0.85rem' }}>
                                                                        <div style={{ color: '#64748b', fontSize: '0.6rem', fontFamily: "Arial,'Helvetica Neue',sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.1rem' }}>TOKEN</div>
                                                                        <code style={{ color: lighten(qrAccent, 0.40), fontSize: isMobile ? '0.72rem' : '0.82rem' }}>{qrToken}</code>
                                                                    </div>
                                                                </div>

                                                                {/* Dot pulsante esperando */}
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: lighten(qrAccent, 0.25), fontSize: isMobile ? '0.68rem' : '0.8rem', fontFamily: "Arial,'Helvetica Neue',sans-serif" }}>
                                                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: qrAccent, display: 'inline-block', animation: 'tbb-pulse-border 0.8s infinite', flexShrink: 0 }} />
                                                                    ESPERANDO CONFIRMACIÓN...
                                                                </div>

                                                                {/* Expiración */}
                                                                {qrTiempoRestante !== null && (
                                                                    <div style={{ color: qrTiempoRestante < 60000 ? '#ef4444' : lighten(qrAccent, 0.10), fontSize: isMobile ? '0.62rem' : '0.72rem', fontFamily: 'monospace' }}>
                                                                        EXPIRA EN {formatCountdown(qrTiempoRestante)}
                                                                    </div>
                                                                )}

                                                                {/* Botones */}
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto' }}>
                                                                    <button onClick={simularPagoQR} style={{ ...btnPrimario, background: `linear-gradient(135deg, ${QR_BLUE} 0%, ${qrAccent} 50%, ${te?.c1 || QR_BLUE} 100%)`, color: '#0B1120', fontWeight: 900, fontFamily: "Arial,'Helvetica Neue',sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', boxShadow: `0 0 20px ${qrAccent}45` }}>SIMULAR PAGO EXITOSO</button>
                                                                    <button onClick={cerrarModal} style={{ ...btnPrimario, background: `linear-gradient(135deg, ${QR_BLUE} 0%, ${qrAccent} 50%, ${te?.c1 || QR_BLUE} 100%)`, color: '#0B1120', fontWeight: 900, fontFamily: "Arial,'Helvetica Neue',sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', boxShadow: `0 0 20px ${qrAccent}45`, margin: '0 auto', display: 'block' }}>← CAMBIAR MÉTODO</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Tarjeta */}
                                                {metodoPago === 'tarjeta' && !procesandoPago && (
                                                    <>
                                                        <TarjetaForm
                                                            monto={totalMonto}
                                                            onConfirm={finalizarReserva}
                                                            onCancelar={cerrarModal}
                                                            tarjetaAccent={tarjetaAccent}
                                                            tarjetaBtnGrad={tarjetaBtnGrad}
                                                            cardGold={CARD_GOLD}
                                                            empresaNombre={empresaNombre}
                                                            teBg={te?.bg}
                                                            teC1={te?.c1}
                                                        />
                                                    </>
                                                )}

                                                {/* Procesando */}
                                                {procesandoPago && (
                                                    <div style={{ textAlign: 'center', padding: '1.5rem 0', color: modalAccent, fontFamily: "Arial,'Helvetica Neue',sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.9rem' }}>
                                                        <div style={{ fontSize: '2rem', marginBottom: '0.75rem', animation: 'ma-neon 1.5s ease-in-out infinite' }}>⏳</div>
                                                        PROCESANDO PAGO...
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* ══ PASO 5: TICKETS ══ */}
                        {paso === 'ticket' && boletos.length > 0 && (
                            <div style={{ maxWidth: isMobile ? '100%' : '800px', margin: '0 auto' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', marginBottom: '1.25rem', gap: '0.75rem' }}>
                                    <div>
                                        <h2 style={{ margin: 0, color: '#ffffff', fontFamily: "Arial,'Helvetica Neue',sans-serif", fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: isMobile ? '1rem' : '1.2rem' }}>
                                            {reservaGenerada?.estado === 'pendiente_documentos' ? 'BOLETOS REGISTRADOS — PENDIENTE VERIFICACIÓN' : '¡RESERVA CONFIRMADA!'}
                                        </h2>
                                        <div style={{ color: '#64748b', fontSize: '0.75rem', fontFamily: "Arial,'Helvetica Neue',sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.2rem' }}>ID: {reservaGenerada?.id}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '0.6rem', width: isMobile ? '100%' : 'auto' }}>
                                        {reservaGenerada?.estado !== 'pendiente_documentos' && (
                                            <button onClick={handleDownloadPDF} style={{
                                                background: `linear-gradient(135deg, ${te?.c1 || '#10b981'} 0%, ${te?.c2 || '#059669'} 100%)`,
                                                border: 'none', borderRadius: '10px', color: '#ffffff',
                                                fontFamily: "Arial,'Helvetica Neue',sans-serif", fontWeight: 900,
                                                textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: '0.78rem',
                                                padding: '0.7rem 1.3rem', cursor: 'pointer',
                                                boxShadow: `0 4px 16px ${te?.c1 || '#10b981'}50`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                                                width: isMobile ? '100%' : 'auto',
                                            }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                                DESCARGAR PDF
                                            </button>
                                        )}
                                        <button onClick={() => navigate('/')} style={{
                                            background: te?.c1 ? `${te.c1}18` : 'rgba(255,255,255,0.06)',
                                            border: `1.5px solid ${te?.c1 || '#334155'}`,
                                            borderRadius: '10px', color: te?.c1 || '#94a3b8',
                                            fontFamily: "Arial,'Helvetica Neue',sans-serif", fontWeight: 800,
                                            textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: '0.78rem',
                                            padding: '0.7rem 1.3rem', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                                            width: isMobile ? '100%' : 'auto',
                                        }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                            IR AL INICIO
                                        </button>
                                    </div>
                                </div>

                                {/* Banner email pendiente para pendiente_documentos */}
                                {reservaGenerada?.estado === 'pendiente_documentos' && (
                                    <div style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid #4c1d95', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', color: '#c4b5fd', fontSize: '0.82rem', fontFamily: "Arial,'Helvetica Neue',sans-serif", display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>📧</span>
                                        <div>
                                            <strong style={{ textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.2rem' }}>ENVÍO DE BOLETOS PENDIENTE</strong>
                                            Los boletos serán enviados a su correo una vez que el cajero autorice la reserva en la sucursal de su departamento.
                                        </div>
                                    </div>
                                )}

                                {/* Boletos grid */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    {boletos.map(boleto => {
                                        const ticketScale = isMobile ? Math.min(1, (windowWidth - 32) / 600) : 1;
                                        return (
                                        <div key={boleto.id} data-ticket-pdf="true"
                                            style={isMobile ? { width: windowWidth - 32, height: Math.round(360 * ticketScale), overflow: 'hidden', borderRadius: Math.round(24 * ticketScale) } : {}}>
                                            <div style={isMobile ? { width: 600, height: 360, transform: `scale(${ticketScale})`, transformOrigin: 'top left' } : {}}>
                                                <TicketCard boleto={boleto} te={te} logoSrc={qrLogoSrc} empresaNombre={empresaNombre} />
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Modal flotante: verificación presencial requerida ── */}
            {mostrarModalVerificacion && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ background: '#0d1a2e', border: '2px solid #4c1d95', borderRadius: '18px', padding: '2rem', maxWidth: '480px', width: '100%', textAlign: 'center', boxShadow: '0 8px 48px rgba(124,58,237,0.35)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>⚠️</div>
                        <h3 style={{ color: '#c4b5fd', fontFamily: "Arial,'Helvetica Neue',sans-serif", fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: '1.05rem', margin: '0 0 0.85rem' }}>
                            VERIFICACIÓN PRESENCIAL REQUERIDA
                        </h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.65, margin: '0 0 1.25rem', fontFamily: "Arial,'Helvetica Neue',sans-serif" }}>
                            Sus boletos han sido <strong style={{ color: '#c4b5fd' }}>registrados</strong> pero deben ser
                            <strong style={{ color: '#c4b5fd' }}> aprobados y verificados físicamente en la sucursal de su departamento</strong>.
                            Preséntese con su CI y documentos originales antes de la hora de salida.
                            Una vez aprobados por el cajero, los boletos serán enviados a su correo.
                        </p>
                        <div style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid #4c1d95', borderRadius: '10px', padding: '0.75rem', marginBottom: '1.5rem' }}>
                            <div style={{ color: '#64748b', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "Arial,'Helvetica Neue',sans-serif", marginBottom: '0.2rem' }}>ID DE RESERVA</div>
                            <div style={{ color: '#c4b5fd', fontWeight: 800, fontSize: '1.1rem', fontFamily: "Arial,'Helvetica Neue',sans-serif", letterSpacing: '0.04em' }}>{reservaGenerada?.id}</div>
                        </div>
                        <button onClick={() => setMostrarModalVerificacion(false)} style={{ background: '#7c3aed', border: 'none', borderRadius: '10px', color: '#ffffff', fontFamily: "Arial,'Helvetica Neue',sans-serif", fontWeight: 900, fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.85rem 2rem', cursor: 'pointer', width: '100%', boxShadow: '0 0 18px rgba(124,58,237,0.45)' }}>
                            ENTENDIDO — VER MIS BOLETOS
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MapaAsientos;
