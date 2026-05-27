import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import {
    getSucursal,
    getViajesSucursalProximos,
    getTodosViajesSucursal,
} from '../servicios/api';
import { DEPARTAMENTOS, useDepartamento } from '../contextos/DepartamentoContext';
import { getEmpresaLogo } from '../utils/assets';
import { useAuth } from '../contextos/AuthContext';
import { obtenerNotificaciones, marcarNotificacionLeida, marcarTodasLeidas } from '../data/mockStorage';
import { calcularRankingPromedio } from '../data/mockDiscoveryDB';
import FeedbackEmoji from '../componentes/FeedbackEmoji';
import TarjetaViaje from '../componentes/TarjetaViaje';
import PerfilIndicador from '../componentes/PerfilIndicador';
import RelojDigital from '../componentes/RelojDigital';

const VIAJES_POR_PAGINA = 9;

const AMENIDADES_OPTS = [
    { id: 'wifi',     label: 'WiFi',     icon: '📶' },
    { id: 'bano',     label: 'Baño',     icon: '🚿' },
    { id: 'tv',       label: 'TV',       icon: '📺' },
    { id: 'ac',       label: 'AC',       icon: '❄️' },
    { id: 'cama',     label: 'Bus Cama', icon: '🛏️' },
    { id: 'cargador', label: 'Cargador', icon: '🔌' },
];

const GRID_CSS = `
.sd-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 1rem; }
@media (max-width: 1024px) { .sd-grid { grid-template-columns: repeat(2,1fr); } }
@media (max-width: 640px)  { .sd-grid { grid-template-columns: 1fr; } }
.sd-filter-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 1.25rem; }
@media (max-width: 768px)  { .sd-filter-row { grid-template-columns: 1fr 1fr; } }
@media (max-width: 480px)  { .sd-filter-row { grid-template-columns: 1fr; } }
`;

let _gcs = false;
function injectGridCSS() {
    if (_gcs || typeof document === 'undefined') return;
    _gcs = true;
    const el = document.createElement('style');
    el.textContent = GRID_CSS;
    document.head.appendChild(el);
}

const SucursalDetalle = () => {
    injectGridCSS();

    const { id }   = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { departamento } = useDepartamento();
    const deptSeleccionado = location.state?.departamento || departamento;
    const { sesion, perfil } = useAuth();

    const [menuMovil,   setMenuMovil]   = useState(false);
    const [bellAbierta, setBellAbierta] = useState(false);
    const [notifs,      setNotifs]      = useState([]);
    const bellRef = useRef(null);
    const esCliente = perfil?.rol === 'cliente' && perfil?.ci;
    const PANEL_POR_ROL = {
        admin_sucursal: { ruta: '/admin/dashboard', label: 'Panel Admin', icono: '🛠️' },
        cajero:         { ruta: '/cajero/panel',    label: 'Panel Cajero',    icono: '🎫' },
        conductor:      { ruta: '/conductor/panel', label: 'Panel Conductor', icono: '🚌' },
    };

    const [sucursal,        setSucursal]        = useState(null);
    const [cargando,        setCargando]        = useState(true);
    const loadStart = useRef(Date.now());
    const [viajesTotales,   setViajesTotales]   = useState([]);
    const [viajesFiltrados, setViajesFiltrados] = useState([]);
    const [paginaActual,    setPaginaActual]    = useState(1);
    const [filtrosOpen,     setFiltrosOpen]     = useState(false);
    const [sinFiltroFecha,  setSinFiltroFecha]  = useState(false);
    const [rankingLocal,    setRankingLocal]    = useState(null);

    const [cantidadBoletos, setCantidadBoletos] = useState(1);
    const [diaFiltro,       setDiaFiltro]       = useState(null); // null = todos, 'YYYY-MM-DD' = día específico

    const [precioMin,  setPrecioMin]  = useState('');
    const [precioMax,  setPrecioMax]  = useState('');
    const [calidad,    setCalidad]    = useState(0);
    const [amenidades, setAmenidades] = useState([]);
    const [hoverStar,  setHoverStar]  = useState(0);
    const [pisosFiltro, setPisosFiltro] = useState(null);
    const [destinoFiltro, setDestinoFiltro] = useState([]);

    const cargarViajes = async (suc, sinFecha) => {
        let raw = [];
        if (sinFecha) {
            raw = await getTodosViajesSucursal(id);
        } else {
            raw = await getViajesSucursalProximos(id, 30);
        }
        return raw.map(v => ({
            ...v,
            sucursal_nombre: v.sucursales?.nombre || suc?.nombre || 'Empresa',
            ciudad:     v.sucursales?.ciudad    || suc?.ciudad    || '',
            ranking:    parseFloat(v.sucursales?.ranking || suc?.ranking || 0),
            amenidades: v.amenidades || v.buses?.amenidades || suc?.amenidades || [],
            colorAccent: v.sucursales?.color_accent || suc?.color_accent || suc?.colorAccent || '#3b82f6',
        }));
    };

    useEffect(() => {
        setCargando(true);
        loadStart.current = Date.now();
        getSucursal(id).then(async suc => {
            setSucursal(suc);
            const trips = await cargarViajes(suc, sinFiltroFecha);
            const filtrados = deptSeleccionado
                ? trips.filter(t => !t.origen || t.origen === deptSeleccionado)
                : trips;
            setViajesTotales(filtrados);
            setViajesFiltrados(filtrados);
            const elapsed = Date.now() - loadStart.current;
            const delay = Math.max(0, 2200 - elapsed);
            setTimeout(() => setCargando(false), delay);
        });
    }, [id, sinFiltroFecha, deptSeleccionado]); // eslint-disable-line

    const aplicarFiltros = (diaOverride) => {
        let f = [...viajesTotales];
        if (precioMin !== '') f = f.filter(v => v.precio >= parseFloat(precioMin));
        if (precioMax !== '') f = f.filter(v => v.precio <= parseFloat(precioMax));
        if (calidad > 0)      f = f.filter(v => (parseFloat(v.ranking) || 0) >= calidad);
        if (amenidades.length > 0)
            f = f.filter(v => amenidades.every(a =>
                (v.amenidades || []).some(x => String(x).toLowerCase().includes(a))
            ));
        if (pisosFiltro !== null)
            f = f.filter(v => (v.buses?.pisos || 1) === pisosFiltro);
        if (destinoFiltro.length > 0)
            f = f.filter(v => destinoFiltro.some(d => v.destino?.toLowerCase().includes(d.toLowerCase())));
        const dia = diaOverride !== undefined ? diaOverride : diaFiltro;
        if (dia) f = f.filter(v => (v.fecha_salida || '').startsWith(dia));
        setViajesFiltrados(f);
        setPaginaActual(1);
    };

    const limpiarFiltros = () => {
        setPrecioMin(''); setPrecioMax(''); setCalidad(0); setAmenidades([]); setPisosFiltro(null); setDestinoFiltro([]);
        setDiaFiltro(null);
        setViajesFiltrados(viajesTotales);
        setPaginaActual(1);
    };

    const seleccionarDia = (fecha) => {
        const nuevo = diaFiltro === fecha ? null : fecha;
        setDiaFiltro(nuevo);
        aplicarFiltros(nuevo);
    };

    // Generar los próximos 7 días desde hoy
    const diasSemana = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const label = i === 0 ? 'Hoy' : i === 1 ? 'Mañana'
            : d.toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric' }).replace('.', '');
        return { fecha: `${yyyy}-${mm}-${dd}`, label, dia: d.getDate(), dow: d.toLocaleDateString('es-BO', { weekday: 'short' }).replace('.', '') };
    });

    const toggleAmenidad = a =>
        setAmenidades(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

    const totalPaginas = Math.ceil(viajesFiltrados.length / VIAJES_POR_PAGINA);
    const inicio       = (paginaActual - 1) * VIAJES_POR_PAGINA;
    const viajesPagina = viajesFiltrados.slice(inicio, inicio + VIAJES_POR_PAGINA);

    const TEMAS_EMPRESA = {
        'Andino':     { surface: { bgCard: '#131C16', borderDefault: 'rgba(76,217,100,0.2)', borderHighlight: 'rgba(76,217,100,0.5)', gradientSutil: 'linear-gradient(135deg,rgba(76,217,100,0.1) 0%,rgba(19,28,22,0) 100%)' }, action: { btnSolidBg: '#4CD964', btnSolidText: '#0B1120', btnOutlineBorder: '#FFD700', btnOutlineText: '#FFD700', btnOutlineBgHover: 'rgba(255,215,0,0.1)' }, feedback: { badgeBg: '#FFD700', badgeText: '#0B1120', starsActive: '#FFD700', iconTint: '#4CD964' }, text: { textPrimary: '#4CD964', textSecondary: '#FFD700' } },
        'Atlas':      { surface: { bgCard: '#1C1414', borderDefault: 'rgba(211,47,47,0.2)', borderHighlight: 'rgba(211,47,47,0.5)', gradientSutil: 'linear-gradient(135deg,rgba(211,47,47,0.1) 0%,rgba(28,20,20,0) 100%)' }, action: { btnSolidBg: '#D32F2F', btnSolidText: '#FFFFFF', btnOutlineBorder: '#FFFFFF', btnOutlineText: '#FFFFFF', btnOutlineBgHover: 'rgba(255,255,255,0.1)' }, feedback: { badgeBg: '#FFFFFF', badgeText: '#D32F2F', starsActive: '#D32F2F', iconTint: '#FFFFFF' }, text: { textPrimary: '#FFFFFF', textSecondary: '#D32F2F' } },
        'Bolívar':    { surface: { bgCard: '#101423', borderDefault: 'rgba(79,195,247,0.2)', borderHighlight: 'rgba(79,195,247,0.5)', gradientSutil: 'linear-gradient(135deg,rgba(0,51,160,0.15) 0%,rgba(16,20,35,0) 100%)' }, action: { btnSolidBg: '#0033A0', btnSolidText: '#FFFFFF', btnOutlineBorder: '#4FC3F7', btnOutlineText: '#4FC3F7', btnOutlineBgHover: 'rgba(79,195,247,0.1)' }, feedback: { badgeBg: '#FFD700', badgeText: '#0033A0', starsActive: '#FFD700', iconTint: '#4FC3F7' }, text: { textPrimary: '#FFD700', textSecondary: '#4FC3F7' } },
        'Copacabana': { surface: { bgCard: '#1C1515', borderDefault: 'rgba(227,30,36,0.2)', borderHighlight: 'rgba(227,30,36,0.5)', gradientSutil: 'linear-gradient(135deg,rgba(227,30,36,0.1) 0%,rgba(28,21,21,0) 100%)' }, action: { btnSolidBg: '#E31E24', btnSolidText: '#FFFFFF', btnOutlineBorder: '#F8F9FA', btnOutlineText: '#F8F9FA', btnOutlineBgHover: 'rgba(248,249,250,0.1)' }, feedback: { badgeBg: '#F8F9FA', badgeText: '#E31E24', starsActive: '#E31E24', iconTint: '#F8F9FA' }, text: { textPrimary: '#F8F9FA', textSecondary: '#E31E24' } },
        'Cosmos':     { surface: { bgCard: '#1A1513', borderDefault: 'rgba(255,107,0,0.2)', borderHighlight: 'rgba(255,107,0,0.5)', gradientSutil: 'linear-gradient(135deg,rgba(255,107,0,0.1) 0%,rgba(26,21,19,0) 100%)' }, action: { btnSolidBg: '#FF6B00', btnSolidText: '#FFFFFF', btnOutlineBorder: '#FFD700', btnOutlineText: '#FFD700', btnOutlineBgHover: 'rgba(255,215,0,0.1)' }, feedback: { badgeBg: '#FFD700', badgeText: '#0B0B15', starsActive: '#FFD700', iconTint: '#C0C0C0' }, text: { textPrimary: '#FFD700', textSecondary: '#FF6B00' } },
        'El Dorado':  { surface: { bgCard: '#1A1915', borderDefault: 'rgba(212,175,55,0.2)', borderHighlight: 'rgba(212,175,55,0.5)', gradientSutil: 'linear-gradient(135deg,rgba(212,175,55,0.1) 0%,rgba(26,25,21,0) 100%)' }, action: { btnSolidBg: '#D4AF37', btnSolidText: '#0B1120', btnOutlineBorder: '#AA8822', btnOutlineText: '#D4AF37', btnOutlineBgHover: 'rgba(170,136,34,0.1)' }, feedback: { badgeBg: '#FFFFFF', badgeText: '#AA8822', starsActive: '#D4AF37', iconTint: '#D4AF37' }, text: { textPrimary: '#D4AF37', textSecondary: '#FFFFFF' } },
        'Emperador':  { surface: { bgCard: '#131621', borderDefault: 'rgba(46,92,184,0.2)', borderHighlight: 'rgba(46,92,184,0.5)', gradientSutil: 'linear-gradient(135deg,rgba(46,92,184,0.1) 0%,rgba(19,22,33,0) 100%)' }, action: { btnSolidBg: '#2E5CB8', btnSolidText: '#FFFFFF', btnOutlineBorder: '#D4AF37', btnOutlineText: '#D4AF37', btnOutlineBgHover: 'rgba(212,175,55,0.1)' }, feedback: { badgeBg: '#D4AF37', badgeText: '#1B3A6E', starsActive: '#D4AF37', iconTint: '#C1121F' }, text: { textPrimary: '#D4AF37', textSecondary: '#4FC3F7' } },
        'Illimani':   { surface: { bgCard: '#141A15', borderDefault: 'rgba(76,175,80,0.2)', borderHighlight: 'rgba(76,175,80,0.5)', gradientSutil: 'linear-gradient(135deg,rgba(76,175,80,0.1) 0%,rgba(20,26,21,0) 100%)' }, action: { btnSolidBg: '#4CAF50', btnSolidText: '#0B1120', btnOutlineBorder: '#2E7D32', btnOutlineText: '#4CAF50', btnOutlineBgHover: 'rgba(46,125,50,0.1)' }, feedback: { badgeBg: '#F5F5DC', badgeText: '#2E7D32', starsActive: '#4CAF50', iconTint: '#2E7D32' }, text: { textPrimary: '#4CAF50', textSecondary: '#F5F5DC' } },
        'Imperial':   { surface: { bgCard: '#111111', borderDefault: 'rgba(212,175,55,0.2)', borderHighlight: 'rgba(212,175,55,0.5)', gradientSutil: 'linear-gradient(135deg,rgba(212,175,55,0.1) 0%,rgba(17,17,17,0) 100%)' }, action: { btnSolidBg: '#D4AF37', btnSolidText: '#0B1120', btnOutlineBorder: '#FF8C00', btnOutlineText: '#FF8C00', btnOutlineBgHover: 'rgba(255,140,0,0.1)' }, feedback: { badgeBg: '#FF8C00', badgeText: '#080808', starsActive: '#D4AF37', iconTint: '#D4AF37' }, text: { textPrimary: '#D4AF37', textSecondary: '#FF8C00' } },
        'Naser':      { surface: { bgCard: '#11141D', borderDefault: 'rgba(0,86,179,0.2)', borderHighlight: 'rgba(0,86,179,0.5)', gradientSutil: 'linear-gradient(135deg,rgba(0,86,179,0.1) 0%,rgba(17,20,29,0) 100%)' }, action: { btnSolidBg: '#0056B3', btnSolidText: '#FFFFFF', btnOutlineBorder: '#FF6B00', btnOutlineText: '#FF6B00', btnOutlineBgHover: 'rgba(255,107,0,0.1)' }, feedback: { badgeBg: '#FFFFFF', badgeText: '#0056B3', starsActive: '#FF6B00', iconTint: '#FFFFFF' }, text: { textPrimary: '#FFFFFF', textSecondary: '#FF6B00' } },
    };

    const nombre     = sucursal?.nombre || 'Empresa';
    const temaEmpresa = TEMAS_EMPRESA[nombre]
        || Object.entries(TEMAS_EMPRESA).find(([k]) => nombre.toLowerCase().includes(k.toLowerCase()))?.[1]
        || null;

    // tokens derivados — fallback genérico si no hay tema
    const color         = temaEmpresa?.action?.btnSolidBg    || sucursal?.color_accent || '#3b82f6';
    const colorText     = temaEmpresa?.action?.btnSolidText   || '#ffffff';
    const borderDefault = temaEmpresa?.surface?.borderDefault || `rgba(59,130,246,0.2)`;
    const borderHL      = temaEmpresa?.surface?.borderHighlight|| `rgba(59,130,246,0.5)`;
    const bgCard        = temaEmpresa?.surface?.bgCard        || 'rgba(8,15,30,0.85)';
    const gradientCard  = temaEmpresa?.surface?.gradientSutil || `linear-gradient(135deg,rgba(59,130,246,0.08) 0%,rgba(8,15,30,0) 100%)`;
    const btnOutBorder  = temaEmpresa?.action?.btnOutlineBorder|| color;
    const btnOutText    = temaEmpresa?.action?.btnOutlineText  || color;
    const btnOutHover   = temaEmpresa?.action?.btnOutlineBgHover|| `${color}15`;
    const badgeBg       = temaEmpresa?.feedback?.badgeBg      || color;
    const badgeText     = temaEmpresa?.feedback?.badgeText     || '#fff';
    const starsColor    = temaEmpresa?.feedback?.starsActive   || '#f59e0b';
    const iconTint      = temaEmpresa?.feedback?.iconTint      || color;
    const textPrimary   = temaEmpresa?.text?.textPrimary       || '#f1f5f9';
    const textSecondary = temaEmpresa?.text?.textSecondary     || `${color}cc`;
    const color2 = color + 'bb';
    const logo       = sucursal?.logoEmoji || sucursal?.logo_emoji || '🚌';
    const empresaLogo = getEmpresaLogo(nombre);
    const ciudad = sucursal?.ciudad || '';
    const dept   = deptSeleccionado || sucursal?.departamento;
    const rankingBase = parseFloat(sucursal?.ranking) || 0;
    const ranking = rankingLocal ?? calcularRankingPromedio(id, dept) ?? rankingBase;

    const recalcularRanking = () => {
        const r = calcularRankingPromedio(id, dept);
        setRankingLocal(r ?? rankingBase);
    };

    const renderStars = (r, interactive = false, hover = 0, onHover, onClick, size = 16) => (
        <div style={{ display: 'flex', gap: '0.15rem' }}>
            {[1,2,3,4,5].map(i => {
                const filled = interactive ? (hover || r) >= i : r >= i;
                return (
                    <Star key={i} size={size}
                        fill={filled ? starsColor : 'none'}
                        color={filled ? starsColor : `${color}40`}
                        strokeWidth={1.5}
                        style={{ cursor: interactive ? 'pointer' : 'default', transition: 'all 0.1s' }}
                        onMouseEnter={() => interactive && onHover?.(i)}
                        onMouseLeave={() => interactive && onHover?.(0)}
                        onClick={() => interactive && onClick?.(i)}
                    />
                );
            })}
        </div>
    );

    const inp = (extra = {}) => ({
        background: `${color}0a`,
        border: `1px solid ${color}45`,
        color: '#dde5f0',
        padding: '0.6rem 0.85rem',
        borderRadius: 9,
        fontSize: '0.88rem',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
        ...extra,
    });

    if (cargando) {
        // { l?, r?, t?, b?, w, h, rx, rot, c, o }
        // Dirección única: ~-32° (diagonal top-left → bottom-right)
        const SH = [
            // ══ banda 1 — top-left ══
            { l:'-20%', t:'-8%',  w:'75vw', h:'18vw', rx:999, rot:-32, c:'#00F0FF', o:0.22 },
            { l:'-12%', t:'2%',   w:'50vw', h:'10vw', rx:999, rot:-32, c:'#FF2A85', o:0.35 },
            { l:'-5%',  t:'10%',  w:'30vw', h:'6vw',  rx:999, rot:-32, c:'#4EE4C1', o:0.5  },
            // ══ banda 2 ══
            { l:'-18%', t:'18%',  w:'80vw', h:'20vw', rx:999, rot:-32, c:'#FF6B00', o:0.2  },
            { l:'-8%',  t:'28%',  w:'55vw', h:'11vw', rx:999, rot:-32, c:'#D90429', o:0.32 },
            { l:'5%',   t:'33%',  w:'28vw', h:'6vw',  rx:999, rot:-32, c:'#FFD600', o:0.5  },
            // ══ banda 3 — centro ══
            { l:'-15%', t:'38%',  w:'85vw', h:'22vw', rx:999, rot:-32, c:'#7209B7', o:0.18 },
            { l:'-5%',  t:'48%',  w:'60vw', h:'12vw', rx:999, rot:-32, c:'#48CAE4', o:0.28 },
            { l:'12%',  t:'54%',  w:'32vw', h:'7vw',  rx:999, rot:-32, c:'#00F0FF', o:0.45 },
            // ══ banda 4 ══
            { l:'-18%', t:'58%',  w:'78vw', h:'19vw', rx:999, rot:-32, c:'#EF233C', o:0.2  },
            { l:'-6%',  t:'68%',  w:'52vw', h:'11vw', rx:999, rot:-32, c:'#F48C06', o:0.32 },
            { l:'10%',  t:'74%',  w:'26vw', h:'6vw',  rx:999, rot:-32, c:'#F8FAFC', o:0.35 },
            // ══ banda 5 — bottom-right ══
            { l:'-12%', t:'78%',  w:'80vw', h:'20vw', rx:999, rot:-32, c:'#70E000', o:0.18 },
            { l:'-2%',  t:'87%',  w:'55vw', h:'12vw', rx:999, rot:-32, c:'#9D0208', o:0.3  },
            { l:'16%',  t:'92%',  w:'30vw', h:'7vw',  rx:999, rot:-32, c:'#CCFF33', o:0.45 },
            // ══ derecha — pills complementarios misma dirección ══
            { r:'-18%', t:'-5%',  w:'70vw', h:'17vw', rx:999, rot:-32, c:'#39FF14', o:0.18 },
            { r:'-8%',  t:'22%',  w:'48vw', h:'10vw', rx:999, rot:-32, c:'#FFD166', o:0.28 },
            { r:'-4%',  t:'44%',  w:'35vw', h:'8vw',  rx:999, rot:-32, c:'#06D6A0', o:0.35 },
            { r:'-10%', t:'62%',  w:'52vw', h:'12vw', rx:999, rot:-32, c:'#FEE440', o:0.22 },
            { r:'-3%',  t:'80%',  w:'40vw', h:'9vw',  rx:999, rot:-32, c:'#00BBF9', o:0.32 },
            // ══ rectángulos afilados — misma diagonal ══
            { l:'-2%',  t:'35%',  w:'8vw',  h:'8vw',  rx:0,   rot:-32, c:'#FFD600', o:0.5  },
            { r:'-1%',  t:'15%',  w:'7vw',  h:'11vw', rx:0,   rot:-32, c:'#EF233C', o:0.5  },
            { l:'2%',   t:'72%',  w:'6vw',  h:'6vw',  rx:0,   rot:-32, c:'#39FF14', o:0.55 },
            { r:'3%',   t:'58%',  w:'9vw',  h:'7vw',  rx:0,   rot:-32, c:'#FF6B00', o:0.5  },
            { l:'20%',  t:'15%',  w:'5vw',  h:'5vw',  rx:0,   rot:-32, c:'#00F5D4', o:0.6  },
            { r:'20%',  t:'75%',  w:'6vw',  h:'8vw',  rx:0,   rot:-32, c:'#C1121F', o:0.55 },
        ];
        const shStyle = s => ({
            position: 'absolute',
            ...(s.l !== undefined && { left:   s.l }),
            ...(s.r !== undefined && { right:  s.r }),
            ...(s.t !== undefined && { top:    s.t }),
            ...(s.b !== undefined && { bottom: s.b }),
            width: s.w, height: s.h,
            borderRadius: s.rx,
            transform: `rotate(${s.rot}deg)`,
            background: s.c,
            opacity: s.o,
            pointerEvents: 'none',
        });
        return (
            <div style={{ height: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif", position: 'relative', overflow: 'hidden' }}>
                <style>{`
                    @keyframes tbb-dot  { 0%,80%,100%{opacity:0} 40%{opacity:1} }
                    @keyframes tbb-spin { to { transform: rotate(360deg); } }
                    .tbb-lc-wrap  { width:200px; height:200px; margin:0 auto 2.5rem; }
                    .tbb-lc-inner { inset:7px; }
                    .tbb-lc-txt   { font-size:0.82rem; letter-spacing:0.18em; }
                    @media (max-width: 480px) {
                        .tbb-lc-wrap  { width:140px !important; height:140px !important; margin-bottom:1.8rem !important; }
                        .tbb-lc-inner { inset:5px !important; }
                        .tbb-lc-txt   { font-size:0.72rem !important; letter-spacing:0.14em !important; }
                    }
                `}</style>
                {SH.map((s, i) => <div key={i} style={shStyle(s)} />)}
                <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                    <div className="tbb-lc-wrap" style={{ position: 'relative' }}>
                        {/* Borde giratorio */}
                        <div style={{
                            position: 'absolute', inset: 0, borderRadius: '50%',
                            background: 'conic-gradient(#00F0FF, #FF6B00, #90E0EF, #7209B7, #EF233C, #70E000, #39FF14, #FEE440, #06D6A0, #00F0FF)',
                            animation: 'tbb-spin 2.5s linear infinite',
                        }} />
                        {/* Logo estático */}
                        <div className="tbb-lc-inner" style={{
                            position: 'absolute', borderRadius: '50%',
                            background: '#ffffff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden',
                        }}>
                            <img src="/personal/logo_terminal.png" alt="Terminal Buses Bolivia" style={{ width: '82%', height: '82%', objectFit: 'contain' }} />
                        </div>
                    </div>
                    <div className="tbb-lc-txt" style={{ color: '#ffffff', textTransform: 'uppercase' }}>
                        Cargando empresa
                        {[0, 0.22, 0.44].map((d, i) => (
                            <span key={i} style={{ animation: `tbb-dot 1.3s ${d}s infinite`, display: 'inline-block' }}>.</span>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#080f1e', fontFamily: "'Inter', system-ui, sans-serif", color: '#dde5f0' }}>

            {/* Fondo degradé: textPrimary izquierda | oscuro centro | textSecondary derecha */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
                background: `
                    radial-gradient(ellipse 60% 80% at 0% 50%,   ${textPrimary}45   0%, transparent 65%),
                    radial-gradient(ellipse 60% 80% at 100% 50%, ${textSecondary}45 0%, transparent 65%),
                    radial-gradient(ellipse 70% 45% at 50% -5%,  ${textPrimary}25   0%, transparent 60%),
                    radial-gradient(ellipse 45% 40% at 0% 0%,    ${textPrimary}30   0%, transparent 55%),
                    radial-gradient(ellipse 45% 40% at 100% 100%,${textSecondary}30 0%, transparent 55%)
                ` }} />

            {/* ══ FORMAS FLOTANTES ══ */}
            <style>{`
                @keyframes sd-flt-a { 0%,100%{transform:translateY(0px)   rotate(var(--rot))} 50%{transform:translateY(-12px) rotate(calc(var(--rot) + 1.5deg))} }
                @keyframes sd-flt-b { 0%,100%{transform:translateY(0px) translateX(0px)  rotate(var(--rot))} 50%{transform:translateY(-8px)  translateX(7px)   rotate(calc(var(--rot) - 2deg))} }
                @keyframes sd-flt-c { 0%,100%{transform:translateY(0px) translateX(0px)  rotate(var(--rot))} 50%{transform:translateY(-16px) translateX(-6px)  rotate(calc(var(--rot) + 2.5deg))} }
                @keyframes sd-flt-d { 0%,100%{transform:translateY(0px)   rotate(var(--rot))} 40%{transform:translateY(-10px) rotate(calc(var(--rot) - 1deg))} }
            `}</style>
            {(() => {
                const C = [textPrimary, textSecondary, btnOutBorder, starsColor];
                const ANIMS = ['sd-flt-a','sd-flt-b','sd-flt-c','sd-flt-d'];
                const shapes = [
                    // rectangles anchos
                    { l:'2%',   t:'10%', w:340, h:110, rx:'22px',          rot:-20, ci:0, op:0.10, an:0, dur:18,  dl:0   },
                    { l:'60%',  t:'18%', w:300, h:95,  rx:'18px',          rot:14,  ci:1, op:0.09, an:1, dur:22,  dl:1.8 },
                    { l:'65%',  t:'52%', w:360, h:115, rx:'24px',          rot:-9,  ci:0, op:0.08, an:2, dur:20,  dl:3.2 },
                    { l:'-4%',  t:'62%', w:310, h:100, rx:'20px',          rot:24,  ci:1, op:0.10, an:3, dur:25,  dl:0.7 },
                    { l:'28%',  t:'82%', w:270, h:88,  rx:'20px',          rot:-15, ci:2, op:0.09, an:0, dur:23,  dl:2.1 },
                    { l:'45%',  t:'-3%', w:380, h:105, rx:'26px',          rot:8,   ci:3, op:0.07, an:1, dur:28,  dl:1.2 },
                    // cuadrados
                    { l:'18%',  t:'4%',  w:190, h:190, rx:'28px',          rot:28,  ci:2, op:0.09, an:2, dur:19,  dl:1   },
                    { l:'72%',  t:'28%', w:170, h:170, rx:'24px',          rot:-33, ci:0, op:0.08, an:3, dur:26,  dl:3.8 },
                    { l:'42%',  t:'68%', w:210, h:210, rx:'32px',          rot:17,  ci:1, op:0.07, an:0, dur:21,  dl:0.9 },
                    { l:'52%',  t:'88%', w:155, h:155, rx:'26px',          rot:-22, ci:3, op:0.09, an:1, dur:17,  dl:2.7 },
                    { l:'-2%',  t:'44%', w:175, h:175, rx:'30px',          rot:38,  ci:2, op:0.08, an:2, dur:30,  dl:0.4 },
                    // triángulos (border-radius asimétricas → forma orgánica tipo triángulo)
                    { l:'82%',  t:'68%', w:210, h:230, rx:'0% 60% 60% 60%',rot:12,  ci:2, op:0.08, an:3, dur:24,  dl:1.4 },
                    { l:'-5%',  t:'30%', w:190, h:215, rx:'60% 0% 60% 60%',rot:-27, ci:3, op:0.09, an:0, dur:20,  dl:4.1 },
                    { l:'38%',  t:'38%', w:175, h:195, rx:'60% 60% 0% 60%',rot:44,  ci:0, op:0.07, an:1, dur:27,  dl:0.6 },
                    { l:'78%',  t:'-2%', w:180, h:200, rx:'60% 60% 60% 0%',rot:-18, ci:1, op:0.08, an:2, dur:22,  dl:2.3 },
                ];
                return (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                        {shapes.map((s, i) => (
                            <div key={i} className="sd-shape" style={{
                                position: 'absolute',
                                left: s.l, top: s.t,
                                width: s.w, height: s.h,
                                borderRadius: s.rx,
                                background: C[s.ci],
                                opacity: s.op,
                                '--rot': `${s.rot}deg`,
                                animation: `${ANIMS[s.an]} ${s.dur}s ${-(s.dl + s.dur * 0.4)}s ease-in-out infinite`,
                            }} />
                        ))}
                        {/* Formas pequeñas solo visibles en mobile */}
                        {[
                            { l:'-8%', t:'12%', w:110, h:70,  rx:'16px',          rot:-18, ci:0, op:0.12, an:0, dur:20, dl:0   },
                            { l:'75%', t:'8%',  w:90,  h:90,  rx:'18px',          rot:25,  ci:1, op:0.11, an:1, dur:22, dl:1.5 },
                            { l:'5%',  t:'55%', w:100, h:65,  rx:'14px',          rot:-12, ci:2, op:0.12, an:2, dur:18, dl:0.8 },
                            { l:'70%', t:'60%', w:80,  h:100, rx:'0% 50% 50% 50%',rot:20,  ci:3, op:0.11, an:3, dur:24, dl:2   },
                        ].map((s, i) => (
                            <div key={'sm'+i} className="sd-shape-sm" style={{
                                display: 'none',
                                position: 'absolute',
                                left: s.l, top: s.t,
                                width: s.w, height: s.h,
                                borderRadius: s.rx,
                                background: C[s.ci],
                                opacity: s.op,
                                '--rot': `${s.rot}deg`,
                                animation: `${ANIMS[s.an]} ${s.dur}s ${-(s.dl + s.dur * 0.4)}s ease-in-out infinite`,
                            }} />
                        ))}
                    </div>
                );
            })()}

            {/* Franja de acento superior */}
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 100,
                background: `linear-gradient(90deg, transparent, ${textPrimary}80, ${textPrimary}, ${textPrimary}cc, ${textPrimary}, ${textPrimary}80, transparent)`,
                boxShadow: `0 0 18px ${textPrimary}90, 0 0 6px ${textPrimary}60` }} />

            {/* ══ NAVBAR + MOBILE RESPONSIVE ══════════════════════════ */}
            <style>{`
                @media (max-width: 640px) {
                    .sd-nav-desktop   { display: none !important; }
                    .sd-nav-hamburger { display: flex !important; }
                    .sd-nav-logo { width:2.6rem !important; height:2.6rem !important; margin-top:0 !important; border-width:2px !important; }
                }
                @media (min-width: 641px) { .sd-nav-movil-menu { display: none !important; } }

                /* ── Content wrapper ── */
                .sd-content { padding: 1.75rem 1.5rem 3rem; }

                /* ── Empresa info ── */
                .sd-logo-box  { width: 120px; height: 120px; border-radius: 20px; }
                .sd-nombre    { font-size: 1.6rem; }
                .sd-dept-badge{ font-size: 0.8rem; padding: 0.22rem 0.75rem; }

                /* ── Pill filtros ── */
                .sd-pill { font-size: 0.88rem; padding: 0.55rem 1.5rem; }

                /* ── Panel filtros ── */
                .sd-filter-panel-wrap { max-width: 760px; }

                /* ── Count row ── */
                .sd-count-row { flex-direction: row; align-items: center; }

                /* ── Paginación ── */
                .sd-pag-btn   { padding: 0.55rem 1rem; font-size: 0.8rem; }
                .sd-pag-num   { width: 34px; height: 34px; font-size: 0.82rem; }

                /* ── Formas flotantes ── */
                .sd-shape { display: block; }

                /* ════ MOBILE ≤ 480px ════ */
                @media (max-width: 480px) {
                    .sd-content  { padding: 1rem 0.9rem 2rem !important; }

                    .sd-logo-box { width: 78px !important; height: 78px !important; border-radius: 14px !important; }
                    .sd-nombre   { font-size: 1.15rem !important; }
                    .sd-dept-badge { font-size: 0.68rem !important; padding: 0.16rem 0.55rem !important; }

                    .sd-pill     { font-size: 0.75rem !important; padding: 0.42rem 1rem !important; gap: 0.35rem !important; }

                    .sd-filter-panel-wrap { max-width: 100% !important; }
                    .sd-filter-row { grid-template-columns: 1fr !important; gap: 0.75rem !important; }

                    .sd-count-row { flex-direction: column !important; align-items: flex-start !important; gap: 0.55rem !important; }

                    .sd-pag-btn  { padding: 0.42rem 0.65rem !important; font-size: 0.72rem !important; }
                    .sd-pag-num  { width: 28px !important; height: 28px !important; font-size: 0.72rem !important; }

                    .sd-shape    { display: none !important; }
                    .sd-shape-sm { display: block !important; }
                }

                /* ════ TABLET ≤ 768px ════ */
                @media (max-width: 768px) and (min-width: 481px) {
                    .sd-content  { padding: 1.25rem 1rem 2.5rem !important; }
                    .sd-logo-box { width: 96px !important; height: 96px !important; }
                    .sd-nombre   { font-size: 1.35rem !important; }
                    .sd-filter-panel-wrap { max-width: 100% !important; }
                    .sd-filter-row { grid-template-columns: 1fr 1fr !important; }
                }
            `}</style>
            <nav style={{
                position: 'sticky', top: 0, zIndex: 60,
                backdropFilter: 'blur(16px)', height: 76,
                background: 'rgba(8,15,30,0.94)',
                borderBottom: `1px solid ${btnOutBorder}30`,
                boxShadow: `0 2px 24px ${btnOutBorder}18, 0 2px 24px ${textPrimary}10`,
                display: 'flex', alignItems: 'center',
                padding: '0 clamp(1rem,5vw,2.5rem)', gap: '0.75rem',
            }}>
                <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '0.2rem' }}>
                    <div className="sd-nav-logo" style={{ width: '5.2rem', height: '5.2rem', borderRadius: '50%', background: '#ffffff url(/personal/logo_terminal.png) center/85% no-repeat', border: `3px solid ${color}`, boxShadow: `0 0 16px ${color}70`, marginTop: '1.2rem' }} />
                </button>

                <div className="sd-nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', flex: 1, justifyContent: 'center' }}>
                    {['Empresas', 'Nosotros', 'Permisos', 'Emergencias'].map(l => (
                        <button key={l} onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.88rem', color: '#e2e8f0', fontWeight: 700, padding: '0.35rem 0.75rem', borderRadius: 8, transition: 'all 0.15s', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Inter','Rajdhani',system-ui,sans-serif" }}
                            onMouseEnter={e => { e.currentTarget.style.color = btnOutText; e.currentTarget.style.background = `${btnOutBorder}15`; }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.background = 'none'; }}>
                            {l}
                        </button>
                    ))}
                    <button onClick={() => navigate('/planear-viaje')} style={{ background: `linear-gradient(135deg, ${color}, ${btnOutBorder})`, color: colorText, border: 'none', borderRadius: 999, padding: '0.42rem 1.05rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, marginLeft: '0.5rem', boxShadow: `0 0 16px ${btnOutBorder}40`, transition: 'all 0.18s', whiteSpace: 'nowrap' }}>🎫 Haz tu reserva</button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginLeft: 'auto' }}>
                    <div className="sd-nav-desktop" style={{ marginRight: '0.75rem', padding: '0.25rem 0.7rem', border: `1px solid ${btnOutBorder}55`, borderRadius: 8, background: `${btnOutBorder}10` }}>
                        <RelojDigital size="small" />
                    </div>
                    {esCliente && (
                        <div ref={bellRef} style={{ position: 'relative' }}>
                            <button onClick={() => setBellAbierta(v => !v)}
                                style={{ position: 'relative', background: bellAbierta ? `${btnOutBorder}20` : 'transparent', border: `1px solid ${bellAbierta ? btnOutBorder + '60' : btnOutBorder + '20'}`, borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.98rem', transition: 'all 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = `${btnOutBorder}18`; }}
                                onMouseLeave={e => { if (!bellAbierta) e.currentTarget.style.background = 'transparent'; }}>
                                🔔
                                {notifs.filter(n => !n.leido).length > 0 && <span style={{ position: 'absolute', top: -3, right: -3, background: btnOutBorder, color: '#fff', borderRadius: '50%', width: 15, height: 15, fontSize: '0.57rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #080f1e' }}>{notifs.filter(n => !n.leido).length > 9 ? '9+' : notifs.filter(n => !n.leido).length}</span>}
                            </button>
                        </div>
                    )}
                    {perfil && PANEL_POR_ROL[perfil.rol] && (
                        <button onClick={() => navigate(PANEL_POR_ROL[perfil.rol].ruta)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: `linear-gradient(90deg, ${btnOutBorder}18, ${textPrimary}12)`, border: `1px solid ${btnOutBorder}45`, color: btnOutText, padding: '0.3rem 0.72rem', borderRadius: 999, cursor: 'pointer', fontSize: '0.77rem', fontWeight: 600, transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(90deg, ${btnOutBorder}30, ${textPrimary}25)`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(90deg, ${btnOutBorder}18, ${textPrimary}12)`; e.currentTarget.style.transform = 'none'; }}>
                            {PANEL_POR_ROL[perfil.rol].icono} {PANEL_POR_ROL[perfil.rol].label}
                        </button>
                    )}
                    <PerfilIndicador />
                    <button className="sd-nav-hamburger" onClick={() => setMenuMovil(v => !v)} style={{ display: 'none', background: 'none', border: `1px solid ${btnOutBorder}40`, borderRadius: 8, padding: '0.4rem 0.55rem', cursor: 'pointer', color: '#e2e8f0', fontSize: '1.1rem', lineHeight: 1 }}>{menuMovil ? '✕' : '☰'}</button>
                </div>
            </nav>
            {menuMovil && (
                <div className="sd-nav-movil-menu" style={{ position: 'sticky', top: 76, zIndex: 59, background: 'rgba(8,15,30,0.97)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${btnOutBorder}20`, padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ padding: '0.25rem 0.5rem', border: `1px solid ${btnOutBorder}40`, borderRadius: 8, background: `${btnOutBorder}10`, alignSelf: 'flex-start' }}><RelojDigital size="small" /></div>
                    {['Empresas', 'Nosotros', 'Permisos', 'Emergencias'].map(l => (
                        <button key={l} onClick={() => { navigate('/'); setMenuMovil(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.88rem', color: '#e2e8f0', fontWeight: 700, padding: '0.35rem 0.75rem', borderRadius: 8, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{l}</button>
                    ))}
                    <button onClick={() => { navigate('/planear-viaje'); setMenuMovil(false); }} style={{ background: `linear-gradient(135deg, ${color}, ${btnOutBorder})`, color: colorText, border: 'none', borderRadius: 999, padding: '0.6rem 1.2rem', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700, alignSelf: 'flex-start' }}>🎫 Haz tu reserva</button>
                </div>
            )}

            {/* CONTENT */}
            <div className="sd-content" style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>

                {/* PANEL FILTROS */}
                <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem' }}>

                    {/* Info empresa — centrada encima del pill */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.55rem' }}>
                        {empresaLogo ? (
                            <div className="sd-logo-box" style={{ background: '#fff', border: `2px solid ${color}`, overflow: 'hidden', boxShadow: `0 0 32px ${color}50` }}>
                                <img src={empresaLogo} alt={nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                        ) : (
                            <div className="sd-logo-box" style={{ background: `linear-gradient(135deg, ${color}35, ${color}15)`, border: `2px solid ${color}70`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', boxShadow: `0 0 32px ${color}45` }}>
                                {logo}
                            </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <span className="sd-nombre" style={{ fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>{nombre}</span>
                            <span className="sd-dept-badge" style={{ fontWeight: 700, color: badgeText, background: badgeBg, borderRadius: 20, letterSpacing: '0.1em', textTransform: 'uppercase', boxShadow: `0 0 10px ${color}50` }}>
                                {dept}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {renderStars(ranking, false, 0, undefined, undefined, 22)}
                        </div>
                    </div>

                    {/* Pill trigger — centrado, compacto */}
                    <button className="sd-pill" onClick={() => setFiltrosOpen(v => !v)} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.55rem',
                        borderRadius: 999,
                        background: filtrosOpen
                            ? `linear-gradient(135deg, ${color}30, ${color}18)`
                            : `linear-gradient(135deg, rgba(10,18,35,0.9), rgba(10,18,35,0.7))`,
                        border: `1.5px solid ${filtrosOpen ? color : color + '45'}`,
                        color: filtrosOpen ? textPrimary : '#94a3b8',
                        cursor: 'pointer',
                        fontWeight: 800, fontSize: '0.88rem',
                        backdropFilter: 'blur(12px)',
                        boxShadow: filtrosOpen
                            ? `0 0 24px ${color}40, inset 0 0 12px ${color}10`
                            : `0 2px 12px rgba(0,0,0,0.4)`,
                        transition: 'all 0.3s ease',
                    }}>
                        <span style={{ fontSize: '1rem', transition: 'transform 0.3s ease', transform: filtrosOpen ? 'rotate(90deg)' : 'none' }}>🔍</span>
                        Filtros de viajes
                        {(precioMin || precioMax || calidad > 0 || amenidades.length > 0 || pisosFiltro !== null || destinoFiltro.length > 0) && (
                            <span style={{ fontSize: '0.6rem', background: color, color: '#fff', borderRadius: 20, padding: '0.1rem 0.5rem', fontWeight: 700, boxShadow: `0 0 8px ${color}80` }}>activo</span>
                        )}
                        <span style={{ fontSize: '0.65rem', transition: 'transform 0.3s ease', transform: filtrosOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
                    </button>

                    {/* Panel expandible */}
                    <div className="sd-filter-panel-wrap" style={{
                        width: '100%',
                        maxHeight: filtrosOpen ? '900px' : '0px',
                        opacity: filtrosOpen ? 1 : 0,
                        overflow: 'hidden',
                        transition: 'max-height 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease',
                    }}>
                        <div style={{
                            background: `${bgCard}`,
                            backdropFilter: 'blur(24px)',
                            border: `1px solid ${borderHL}`,
                            borderTop: `3px solid ${textPrimary}`,
                            borderRadius: 18,
                            overflow: 'hidden',
                            boxShadow: `0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 ${borderDefault}, 0 -2px 16px ${textPrimary}40`,
                        }}>
                        <div style={{ padding: '1.1rem 1.4rem 1.3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem' }}>

                            {/* Fila 1: precio | separador | calidad | separador | pisos */}
                            <div className="sd-filter-row" style={{ width: '100%' }}>

                                {/* Precio */}
                                <div>
                                    <div style={{ fontSize: '0.58rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                        💰 Precio (Bs)
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                                        <input value={precioMin} onChange={e => setPrecioMin(e.target.value)} placeholder="Mín" type="number" style={inp({ flex: 1, padding: '0.48rem 0.6rem', fontSize: '0.82rem' })}
                                            onFocus={e => { e.target.style.borderColor = btnOutBorder; e.target.style.boxShadow = `0 0 0 2px ${btnOutBorder}25`; }}
                                            onBlur={e => { e.target.style.borderColor = `${btnOutBorder}45`; e.target.style.boxShadow = 'none'; }} />
                                        <span style={{ color: '#475569', fontWeight: 700, flexShrink: 0 }}>–</span>
                                        <input value={precioMax} onChange={e => setPrecioMax(e.target.value)} placeholder="Máx" type="number" style={inp({ flex: 1, padding: '0.48rem 0.6rem', fontSize: '0.82rem' })}
                                            onFocus={e => { e.target.style.borderColor = btnOutBorder; e.target.style.boxShadow = `0 0 0 2px ${btnOutBorder}25`; }}
                                            onBlur={e => { e.target.style.borderColor = `${btnOutBorder}45`; e.target.style.boxShadow = 'none'; }} />
                                    </div>
                                </div>

                                {/* Calidad */}
                                <div>
                                    <div style={{ fontSize: '0.58rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                        ⭐ Calidad mínima
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                        {renderStars(calidad, true, hoverStar, setHoverStar, setCalidad, 22)}
                                        {calidad > 0 && (
                                            <span style={{ fontSize: '0.7rem', color: starsColor, fontWeight: 800 }}>{calidad}+★</span>
                                        )}
                                    </div>
                                </div>

                                {/* Pisos */}
                                <div>
                                    <div style={{ fontSize: '0.58rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                        🚌 Pisos
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                        {[
                                            { val: null, label: 'Todos' },
                                            { val: 1,    label: '1 piso' },
                                            { val: 2,    label: '2 pisos' },
                                        ].map(opt => {
                                            const active = pisosFiltro === opt.val;
                                            return (
                                                <button key={String(opt.val)} onClick={() => setPisosFiltro(opt.val)}
                                                    style={{
                                                        padding: '0.42rem 0.7rem', borderRadius: 20,
                                                        border: `1.5px solid ${active ? btnOutBorder : 'rgba(100,116,139,0.35)'}`,
                                                        background: active ? `${btnOutBorder}22` : 'transparent',
                                                        color: active ? btnOutText : '#94a3b8',
                                                        fontSize: '0.75rem', fontWeight: 700,
                                                        cursor: 'pointer', transition: 'all 0.18s',
                                                        boxShadow: active ? `0 0 10px ${btnOutBorder}40` : 'none',
                                                        whiteSpace: 'nowrap',
                                                    }}>
                                                    {opt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Separador */}
                            <div style={{ width: '100%', maxWidth: 720, height: 1, background: `linear-gradient(90deg, transparent, ${btnOutBorder}30, transparent)` }} />

                            {/* Fila 2: Amenidades centradas */}
                            <div style={{ width: '100%' }}>
                                <div style={{ fontSize: '0.58rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                    🛠️ Características
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                                    {AMENIDADES_OPTS.map(a => {
                                        const active = amenidades.includes(a.id);
                                        return (
                                            <button key={a.id} onClick={() => toggleAmenidad(a.id)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                                                    padding: '0.38rem 0.85rem', borderRadius: 20,
                                                    border: `1.5px solid ${active ? btnOutBorder : 'rgba(100,116,139,0.35)'}`,
                                                    background: active ? `${btnOutBorder}22` : 'transparent',
                                                    color: active ? btnOutText : '#94a3b8',
                                                    fontSize: '0.78rem', fontWeight: 700,
                                                    cursor: 'pointer', transition: 'all 0.18s',
                                                    boxShadow: active ? `0 0 10px ${btnOutBorder}40` : 'none',
                                                }}>
                                                <span>{a.icon}</span>{a.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Separador */}
                            <div style={{ width: '100%', maxWidth: 720, height: 1, background: `linear-gradient(90deg, transparent, ${btnOutBorder}30, transparent)` }} />

                            {/* Filtro por departamento destino */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', width: '100%', maxWidth: 720 }}>
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b' }}>Destino</span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                                    {Object.keys(DEPARTAMENTOS).filter(d => d !== dept).map(d => {
                                        const active = destinoFiltro.includes(d);
                                        return (
                                            <button key={d} onClick={() => setDestinoFiltro(prev => active ? prev.filter(x => x !== d) : [...prev, d])}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                                                    padding: '0.38rem 0.85rem', borderRadius: 20,
                                                    border: `1.5px solid ${active ? btnOutBorder : 'rgba(100,116,139,0.35)'}`,
                                                    background: active ? `${btnOutBorder}22` : 'transparent',
                                                    color: active ? btnOutText : '#94a3b8',
                                                    fontSize: '0.78rem', fontWeight: 700,
                                                    cursor: 'pointer', transition: 'all 0.18s',
                                                    boxShadow: active ? `0 0 10px ${btnOutBorder}40` : 'none',
                                                }}>
                                                <span>{DEPARTAMENTOS[d]?.emoji || '📍'}</span>{d}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Separador */}
                            <div style={{ width: '100%', maxWidth: 720, height: 1, background: `linear-gradient(90deg, transparent, ${btnOutBorder}30, transparent)` }} />

                            {/* Botones centrados */}
                            <div style={{ display: 'flex', gap: '0.65rem' }}>
                                <button onClick={limpiarFiltros}
                                    style={{ padding: '0.5rem 1.2rem', background: 'transparent', border: `1px solid rgba(100,116,139,0.5)`, color: '#94a3b8', borderRadius: 20, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = btnOutBorder; e.currentTarget.style.color = btnOutText; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(100,116,139,0.5)'; e.currentTarget.style.color = '#94a3b8'; }}>
                                    Limpiar
                                </button>
                                <button onClick={() => { aplicarFiltros(); setFiltrosOpen(false); }}
                                    style={{ padding: '0.5rem 1.4rem', background: `linear-gradient(135deg, ${btnOutBorder}, ${btnOutBorder}cc)`, border: 'none', color: colorText, borderRadius: 20, fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', boxShadow: `0 0 18px ${btnOutBorder}50`, transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}>
                                    Aplicar →
                                </button>
                            </div>
                        </div>
                        </div>
                    </div>
                </div>

                {/* RESULTADOS */}
                {viajesFiltrados.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 1rem', background: bgCard, border: `1px dashed ${borderHL}`, borderRadius: 18 }}>
                        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                            <div style={{ width: 130, height: 130, borderRadius: 24, border: `1px solid ${borderDefault}`, background: gradientCard, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                {empresaLogo
                                    ? <img src={empresaLogo} alt={nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.13, filter: 'grayscale(60%)' }} />
                                    : <span style={{ fontSize: '4.5rem', opacity: 0.15 }}>{logo}</span>
                                }
                            </div>
                        </div>
                        <h3 style={{ color: textPrimary, marginBottom: '0.5rem', fontWeight: 800, textShadow: `0 0 20px ${textPrimary}60` }}>Sin viajes disponibles</h3>
                        <p style={{ fontSize: '0.85rem', color: `${textSecondary}` }}>
                            {sinFiltroFecha ? 'Esta empresa no tiene viajes registrados.' : 'Prueba desactivando el filtro de fecha con el botón 🕐.'}
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                            <button onClick={limpiarFiltros}
                                style={{ padding: '0.6rem 1.2rem', background: btnOutHover, border: `1px solid ${btnOutBorder}`, color: btnOutText, borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}>
                                Limpiar filtros
                            </button>
                            {!sinFiltroFecha && (
                                <button onClick={() => setSinFiltroFecha(true)}
                                    style={{ padding: '0.6rem 1.2rem', background: color, border: 'none', color: colorText, borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', boxShadow: `0 0 16px ${color}50` }}>
                                    🕐 Ver todos los horarios
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ── Barra selector de día ── */}
                        <style>{`
                            .sd-dia-chip { transition: background 0.16s, border-color 0.16s, color 0.16s; }
                            .sd-dia-chip:hover:not(:disabled) { filter: brightness(1.15); }
                            /* Mobile: 7 chips en una sola fila */
                            @media (max-width: 767px) {
                                .sd-dia-chips { flex-wrap: nowrap !important; overflow-x: auto; }
                                .sd-dia-chip { min-width: 0 !important; flex: 1 1 0; padding: 0.3rem 0.2rem !important; border-radius: 8px !important; }
                                .sd-dia-chip .sd-dia-num { font-size: 0.95rem !important; }
                                .sd-dia-chip .sd-dia-label { font-size: 0.5rem !important; }
                            }
                            /* Desktop: chips grandes centrados */
                            @media (min-width: 768px) {
                                .sd-dia-bar { padding: 1.4rem 1.8rem !important; }
                                .sd-dia-chip { min-width: 82px !important; padding: 0.7rem 1.1rem !important; border-radius: 13px !important; }
                                .sd-dia-chip .sd-dia-num { font-size: 1.5rem !important; }
                                .sd-dia-chip .sd-dia-label { font-size: 0.75rem !important; }
                                .sd-dia-chips { justify-content: center !important; gap: 0.75rem !important; }
                                .sd-dia-titulo { font-size: 1rem !important; }
                                .sd-dia-footer { font-size: 0.82rem !important; justify-content: center !important; }
                            }
                        `}</style>
                        <div className="sd-dia-bar" style={{ marginBottom: '1.1rem', padding: '1rem 1rem 0.85rem', background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(8px)', border: `1px solid rgba(255,255,255,0.10)`, borderRadius: 16 }}>
                            {/* Título centrado + ver todos */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.85rem', position: 'relative' }}>
                                <span className="sd-dia-titulo" style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#e2e8f0', textAlign: 'center' }}>
                                    📅 ¿QUÉ DÍA QUIERES VIAJAR?
                                </span>
                                {diaFiltro && (
                                    <button
                                        onClick={() => seleccionarDia(diaFiltro)}
                                        style={{ position: 'absolute', right: 0, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#f1f5f9', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '0.3rem 0.9rem', cursor: 'pointer' }}
                                    >
                                        ✕ VER TODOS
                                    </button>
                                )}
                            </div>
                            {/* Chips */}
                            <div className="sd-dia-chips" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {diasSemana.map(({ fecha, label, dia, dow }, idx) => {
                                    const esHoy   = idx === 0;
                                    const activo  = diaFiltro === fecha;
                                    const tieneViajes = viajesTotales.some(v => (v.fecha_salida || '').startsWith(fecha));
                                    // HOY: borde color empresa siempre visible
                                    const bgActivo  = color;
                                    const bgNormal  = esHoy ? `${color}15` : tieneViajes ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)';
                                    const bdNormal  = esHoy ? `2px solid ${color}` : tieneViajes ? '1px solid rgba(255,255,255,0.16)' : '1px solid rgba(255,255,255,0.05)';
                                    const txtNormal = esHoy ? color : tieneViajes ? '#cbd5e1' : '#334155';
                                    return (
                                        <button
                                            key={fecha}
                                            className="sd-dia-chip"
                                            onClick={() => seleccionarDia(fecha)}
                                            disabled={!tieneViajes}
                                            style={{
                                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                                padding: '0.45rem 0.7rem', borderRadius: 10, minWidth: 56,
                                                border: activo ? `2px solid ${color}` : bdNormal,
                                                background: activo ? bgActivo : bgNormal,
                                                color: activo ? '#fff' : txtNormal,
                                                cursor: tieneViajes ? 'pointer' : 'default',
                                                fontFamily: "'Rajdhani', sans-serif",
                                            }}
                                        >
                                            <span className="sd-dia-label" style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                                {label === 'Hoy' || label === 'Mañana' ? label.toUpperCase() : dow.toUpperCase()}
                                            </span>
                                            <span className="sd-dia-num" style={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1.2 }}>{dia}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            {/* Footer */}
                            <div className="sd-dia-footer" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.65rem', fontFamily: "'Rajdhani', sans-serif", fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>
                                <strong style={{ color: '#94a3b8' }}>{viajesFiltrados.length}</strong>
                                <span>VIAJE{viajesFiltrados.length !== 1 ? 'S' : ''} DISPONIBLE{viajesFiltrados.length !== 1 ? 'S' : ''}</span>
                                {diaFiltro && <><span>·</span><span style={{ color }}>{(diasSemana.find(d => d.fecha === diaFiltro)?.label || '').toUpperCase()}</span></>}
                                {sinFiltroFecha && <><span>·</span><span style={{ color: '#f59e0b' }}>TODOS LOS HORARIOS</span></>}
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="sd-grid">
                            {viajesPagina.map(viaje => (
                                <TarjetaViaje key={viaje.id} viaje={viaje} onSeleccionar={v => navigate('/reserva/' + v.id, { state: { viaje: { ...v, sucursalId: id, sucursalNombre: sucursal?.nombre }, cantidadBoletos } })} />
                            ))}
                        </div>

                        {/* Paginación */}
                        {totalPaginas > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.6rem', marginTop: '1.75rem' }}>
                                <button onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1}
                                    className="sd-pag-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', borderRadius: 9, background: paginaActual === 1 ? 'rgba(7,17,31,0.5)' : `${color}22`, color: paginaActual === 1 ? '#334155' : color, border: `1px solid ${paginaActual === 1 ? '#1e293b' : color + '60'}`, cursor: paginaActual === 1 ? 'not-allowed' : 'pointer', fontWeight: 700 }}>
                                    <ChevronLeft size={14} /> Anterior
                                </button>
                                {Array.from({ length: totalPaginas }, (_, i) => (
                                    <button key={i} onClick={() => setPaginaActual(i + 1)}
                                        className="sd-pag-num" style={{ borderRadius: 8, border: paginaActual === i + 1 ? 'none' : `1px solid ${color}30`, cursor: 'pointer', background: paginaActual === i + 1 ? color : 'rgba(7,17,31,0.5)', color: paginaActual === i + 1 ? '#fff' : `${color}80`, fontWeight: 800, boxShadow: paginaActual === i + 1 ? `0 0 14px ${color}70` : 'none' }}>
                                        {i + 1}
                                    </button>
                                ))}
                                <button onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}
                                    className="sd-pag-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', borderRadius: 9, background: paginaActual === totalPaginas ? 'rgba(7,17,31,0.5)' : `${color}22`, color: paginaActual === totalPaginas ? '#334155' : color, border: `1px solid ${paginaActual === totalPaginas ? '#1e293b' : color + '60'}`, cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer', fontWeight: 700 }}>
                                    Siguiente <ChevronRight size={14} />
                                </button>
                            </div>
                        )}
                    </>
                )}

                <div style={{ marginTop: '2.5rem' }}>
                    <FeedbackEmoji sucursalId={id} departamento={dept} color={color} starsColor={starsColor} badgeBg={badgeBg} badgeText={badgeText} bgCard={bgCard} borderDefault={borderDefault} onNuevoFeedback={recalcularRanking} textPrimary={textPrimary} accentText={btnOutText} />
                </div>
            </div>
        </div>
    );
};

export default SucursalDetalle;
