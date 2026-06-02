import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import { getEmpresaTema } from '../../data/empresasTemas';
import {
    getTripulacionByUsuario, getViajesConductor,
    getReservasViaje, updateViajeEstado,
    getBoletoPorQR, marcarBoletoValidado,
    crearNotificacion, crearIncidente, getEmailsViaje, enviarAvisoIncidente,
} from '../../servicios/api';
import { supabase } from '../../servicios/supabase';
import { API_BASE } from '../../config';
import FragmentoDept from '../../componentes/FragmentoDept';
import gsap from 'gsap';

const TIPOS_INCIDENTE = [
    { value: 'retraso',   label: 'Retraso',         icon: '⏰' },
    { value: 'mecanico',  label: 'Falla mecánica',   icon: '🔧' },
    { value: 'percance',  label: 'Percance en ruta', icon: '⚠️' },
    { value: 'accidente', label: 'Accidente',        icon: '🚨' },
    { value: 'otro',      label: 'Otro',             icon: '📋' },
];

const IconViajes    = ({ color, size = 18 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 .6.4 1 1 1h1" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" /></svg>);
const IconNotificar = ({ color, size = 18 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>);
const IconEscanear  = ({ color, size = 18 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><line x1="5" y1="12" x2="19" y2="12" /></svg>);
const IconPasajeros = ({ color, size = 18 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>);
const IconHome      = ({ color, size = 18 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>);
const IconLogout    = ({ color, size = 18 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>);

const ESTADO_META = {
    programado: { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)',  text: '#93c5fd', dot: '#3b82f6', label: 'Programado'  },
    autorizado:  { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#6ee7b7', dot: '#10b981', label: 'Autorizado'   },
    en_viaje:    { bg: null,                    border: null,                   text: null,       dot: '#f59e0b', label: 'En viaje'     },
    completado:  { bg: 'rgba(100,116,139,0.12)',border: 'rgba(100,116,139,0.3)',text: '#94a3b8', dot: '#64748b', label: 'Completado'   },
    cancelado:   { bg: 'rgba(220,38,38,0.1)',   border: 'rgba(220,38,38,0.25)', text: '#fca5a5', dot: '#ef4444', label: 'Cancelado'    },
};

const StatusBadge = ({ estado, empresaColor }) => {
    const m = ESTADO_META[estado] || ESTADO_META.programado;
    const bg     = estado === 'en_viaje' ? `${empresaColor}18` : m.bg;
    const border = estado === 'en_viaje' ? `${empresaColor}40` : m.border;
    const text   = estado === 'en_viaje' ? empresaColor        : m.text;
    const dot    = estado === 'en_viaje' ? empresaColor        : m.dot;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            background: bg, border: `1px solid ${border}`, color: text,
            padding: '0.22rem 0.65rem', borderRadius: '999px',
            fontSize: '0.72rem', fontWeight: 600, fontFamily: "'Outfit', sans-serif",
            letterSpacing: '0.02em',
        }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
            {m.label}
        </span>
    );
};

const InitialsAvatar = ({ name, color }) => {
    const parts = (name || '').trim().split(' ');
    const initials = parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : (parts[0] || '?')[0].toUpperCase();
    return (
        <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: `${color}18`, border: `1px solid ${color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.65rem', fontWeight: 700, color,
        }}>
            {initials}
        </div>
    );
};

const TABS = [
    { id: 'viajes',    icon: IconViajes,    label: 'Viajes'    },
    { id: 'notificar', icon: IconNotificar, label: 'Notificar' },
    { id: 'escanear',  icon: IconEscanear,  label: 'Escanear'  },
    { id: 'pasajeros', icon: IconPasajeros, label: 'Pasajeros' },
];

const PanelConductor = () => {
    const navigate = useNavigate();
    const { perfil, logout } = useAuth();
    const rootRef    = useRef(null);
    const contentRef = useRef(null);
    const scannerRef = useRef(null);
    const scannerBoxRef = useRef(null);  // contenedor cámara — para auto-scroll
    const scanResultRef = useRef(null);  // bloque de resultado — para auto-scroll

    const sucursalNombre = perfil?.sucursal_nombre || 'Mi Sucursal';
    const deptNombre     = perfil?.departamento || 'La Paz';
    const tema           = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];
    const empresaTema    = getEmpresaTema(sucursalNombre);
    const empresaColor   = empresaTema?.primary || tema.primary;
    const empresaColor2  = empresaTema?.secondary || tema.colorSecundario || empresaColor;  // color secundario (acentos del selector)
    const empresaTextColor = empresaTema?.primaryText || '#ffffff';
    const diaKeyOf = (v) => new Date(v.fecha_salida).toISOString().slice(0, 10);

    const esConductor = perfil?.rol === 'conductor' || perfil?.rol === 'admin_sucursal';

    const [tab,               setTab]               = useState('viajes');
    const [tripulacionId,     setTripulacionId]     = useState(null);
    const [viajes,            setViajes]            = useState([]);
    const [cargando,          setCargando]          = useState(true);
    const [viajeActivo,       setViajeActivo]       = useState(null);
    const [pasajerosMap,      setPasajerosMap]      = useState({});
    const [busquedaPasajero,  setBusquedaPasajero]  = useState('');
    const [confirmandoCancelar, setConfirmandoCancelar] = useState(null);
    const [horaActual,        setHoraActual]        = useState(new Date());

    const [viajeSel,     setViajeSel]     = useState('');   // viaje activo compartido por las 4 vistas
    const [diaFiltro,    setDiaFiltro]    = useState(null);  // filtro opcional por día (clave fecha)
    const [selectorAbierto, setSelectorAbierto] = useState(false);
    const [notifTipo,    setNotifTipo]    = useState('retraso');
    const [notifDesc,    setNotifDesc]    = useState('');
    const [notifEnviando,setNotifEnviando]= useState(false);
    const [notifResultado, setNotifResultado] = useState(null);

    const [scanResultado,  setScanResultado]  = useState(null);
    const [scannerActivo,  setScannerActivo]  = useState(false);
    const [scanValidando,  setScanValidando]  = useState(false);

    const [listaPasajeros,setListaPasajeros]= useState([]);

    useEffect(() => {
        const iv = setInterval(() => setHoraActual(new Date()), 1000);
        return () => clearInterval(iv);
    }, []);

    useEffect(() => {
        if (!perfil?.id) return;
        getTripulacionByUsuario(perfil.id).then(t => {
            if (t) setTripulacionId(t.id);
            else setCargando(false);
        });
    }, [perfil?.id]);

    const detectarViajeActual = useCallback((lista) => {
        const enViaje = lista.find(v => v.estado === 'en_viaje');
        if (enViaje) return enViaje.id;
        const activos  = lista.filter(v => v.estado === 'programado' || v.estado === 'autorizado');
        const proximos = activos.filter(v => new Date(v.fecha_salida) >= new Date());
        if (proximos.length > 0) return proximos[0].id;
        return activos.length > 0 ? activos[activos.length - 1].id : '';
    }, []);

    // Parsea "8h 30min" | "2h" | "45min" → minutos
    const parseDuracion = (texto) => {
        if (!texto) return 0;
        const h = texto.match(/(\d+)\s*h/);
        const m = texto.match(/(\d+)\s*min/);
        return (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0);
    };

    const cargarViajes = useCallback(async () => {
        if (!tripulacionId) return;
        const data   = await getViajesConductor(tripulacionId, 1);
        const sorted = [...data].sort((a, b) => new Date(a.fecha_salida) - new Date(b.fecha_salida));
        const ahora  = Date.now();

        // Auto-estado por tiempo — independiente del botón del conductor
        for (const v of sorted) {
            const tSalida   = new Date(v.fecha_salida).getTime();
            const durMin    = parseDuracion(v.duracion_estimada);
            const tLlegada  = tSalida + durMin * 60 * 1000;

            if ((v.estado === 'programado' || v.estado === 'autorizado') && ahora >= tSalida) {
                // Pasó la hora de salida → iniciar automáticamente
                await updateViajeEstado(v.id, 'en_viaje');
                v.estado = 'en_viaje';
            } else if (v.estado === 'en_viaje' && durMin > 0 && ahora >= tLlegada) {
                // Pasó el tiempo estimado de llegada → completar automáticamente
                await updateViajeEstado(v.id, 'completado');
                v.estado = 'completado';
            }
        }

        setViajes(sorted);
        setCargando(false);
        const actual = detectarViajeActual(sorted);
        if (actual) setViajeSel(prev => prev || actual);
    }, [tripulacionId, detectarViajeActual]);

    useEffect(() => {
        if (!tripulacionId) return;
        cargarViajes();
        const iv = setInterval(cargarViajes, 30000);
        return () => clearInterval(iv);
    }, [tripulacionId, cargarViajes]);

    useEffect(() => {
        if (!viajeActivo || pasajerosMap[viajeActivo]) return;
        getReservasViaje(viajeActivo).then(p => {
            setPasajerosMap(prev => ({ ...prev, [viajeActivo]: p }));
        });
    }, [viajeActivo]); // eslint-disable-line

    useEffect(() => {
        if (!viajeSel) { setListaPasajeros([]); return; }
        getReservasViaje(viajeSel).then(setListaPasajeros);
    }, [viajeSel, tab]);

    // Header entrance
    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-anim="header"]', { y: -20, opacity: 0, duration: 0.4, ease: 'power3.out' });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    // Tab content transition
    useEffect(() => {
        if (!contentRef.current) return;
        gsap.fromTo(contentRef.current,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' }
        );
    }, [tab]);

    // QR scanner con validación real contra backend
    const validarQR = useCallback(async (texto) => {
        setScanValidando(true);

        // Intentar parsear JSON del QR (formato: { id, asiento, ci } o { qr_codigo, ... })
        let qrCodigo = texto.trim();
        let qrData   = null;
        try {
            qrData   = JSON.parse(texto);
            // TicketGenerator embeds: { id: "reservaId-asiento", asiento, ci }
            // Flujo Supabase embeds: qr_codigo = UUID
            qrCodigo = qrData.qr_codigo || qrData.id || texto.trim();
        } catch { /* texto plano = código directo */ }

        if (!viajeSel) {
            setScanResultado({ tipo: 'error', mensaje: 'Selecciona el viaje antes de escanear.' });
            setScanValidando(false);
            return;
        }

        try {
            // El QR codifica la URL .../boleto?token=<qr_token>; extraer el token
            let qrToken = qrCodigo;
            try { const u = new URL(qrCodigo); const t = u.searchParams.get('token'); if (t) qrToken = t; } catch { /* token plano */ }

            const boleto = await getBoletoPorQR(qrToken);
            if (!boleto) {
                setScanResultado({ tipo: 'error', mensaje: 'Boleto no encontrado.' });
            } else if (boleto.viajeId !== viajeSel) {
                setScanResultado({ tipo: 'error', mensaje: 'El boleto no pertenece a este viaje.' });
            } else if (boleto.estado === 'validado') {
                setScanResultado({ tipo: 'yaAbordado', mensaje: 'Este pasajero ya abordó', pasajero: boleto.pasajeroNombre, ci: boleto.pasajeroCI, asiento: boleto.asiento });
            } else {
                const ok = await marcarBoletoValidado(boleto.id, perfil?.id || null);
                if (ok) {
                    setScanResultado({ tipo: 'ok', mensaje: 'Abordaje válido', pasajero: boleto.pasajeroNombre, ci: boleto.pasajeroCI, asiento: boleto.asiento });
                    getReservasViaje(viajeSel).then(ps => setPasajerosMap(prev => ({ ...prev, [viajeSel]: ps })));
                } else {
                    setScanResultado({ tipo: 'error', mensaje: 'No se pudo registrar el abordaje.' });
                }
            }
        } catch (err) {
            setScanResultado({ tipo: 'error', mensaje: `Error: ${err.message}` });
        }

        setScanValidando(false);
    }, [viajeSel, perfil?.id]); // eslint-disable-line

    // QR scanner — Html5Qrcode (core): solo cámara trasera, control manual
    const stopScan = useCallback(async () => {
        const h = scannerRef.current;
        scannerRef.current = null;
        setScannerActivo(false);
        if (h) { try { await h.stop(); } catch { /* */ } try { h.clear(); } catch { /* */ } }
    }, []);

    const startScan = useCallback(async () => {
        if (scannerRef.current) return;
        setScanResultado(null);
        try {
            const h = new Html5Qrcode('qr-lector-conductor');
            scannerRef.current = h;
            await h.start(
                { facingMode: 'environment' },               // cámara trasera
                { fps: 10, qrbox: { width: 240, height: 240 } },
                async (texto) => {
                    try { await h.stop(); } catch { /* */ } try { h.clear(); } catch { /* */ }
                    scannerRef.current = null;
                    setScannerActivo(false);
                    validarQR(texto);
                },
                () => { /* sin lectura — ignorar */ },
            );
            setScannerActivo(true);
        } catch {
            scannerRef.current = null;
            setScannerActivo(false);
            setScanResultado({ tipo: 'error', mensaje: 'No se pudo abrir la cámara. Permití el acceso desde el navegador.' });
        }
    }, [validarQR]);

    const reanudarScanner = () => { setScanResultado(null); startScan(); };

    // Auto-desplazar a la cámara cuando se activa (evita scroll manual)
    useEffect(() => {
        if (scannerActivo) {
            const t = setTimeout(() => scannerBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250);
            return () => clearTimeout(t);
        }
    }, [scannerActivo]);

    // Auto-desplazar al resultado (con el botón "Escanear siguiente") al validar
    useEffect(() => {
        if (scanResultado) {
            const t = setTimeout(() => scanResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
            return () => clearTimeout(t);
        }
    }, [scanResultado]);

    // Detener cámara al salir del tab o desmontar
    useEffect(() => {
        if (tab !== 'escanear') stopScan();
        return () => { stopScan(); };
    }, [tab, stopScan]);

    const cambiarEstado = async (viajeId, nuevoEstado) => {
        await updateViajeEstado(viajeId, nuevoEstado);
        setViajes(prev => prev.map(v => v.id === viajeId ? { ...v, estado: nuevoEstado } : v));
    };

    const handleCancelar = async (viajeId) => {
        await updateViajeEstado(viajeId, 'cancelado');
        setViajes(prev => prev.map(v => v.id === viajeId ? { ...v, estado: 'cancelado' } : v));
        setConfirmandoCancelar(null);
    };

    const esTemprano = (viaje) => new Date(viaje.fecha_salida) - new Date() > 60 * 60 * 1000;

    const handleEnviarNotificacion = async (e) => {
        e.preventDefault();
        setNotifEnviando(true);
        setNotifResultado(null);
        const viaje = viajes.find(v => v.id === viajeSel);
        if (!viaje) { setNotifResultado({ tipo: 'error', texto: 'Selecciona un viaje.' }); setNotifEnviando(false); return; }
        const busPlaca  = viaje.buses?.placa || '';
        const tipoLabel = TIPOS_INCIDENTE.find(t => t.value === notifTipo)?.label || notifTipo;
        const mensajeBase = `[${tipoLabel}] ${viaje.origen} → ${viaje.destino} · Bus ${busPlaca}: ${notifDesc}`;
        const empresaNombre = perfil?.sucursal_nombre || viaje.sucursales?.nombre || '';

        // 1) Incidencia permanente (admin la ve en Incidentes)
        // Mapear a tipos validos del CHECK de incidencias (accidente/desvio/pasajero_conflictivo/mecanico/retraso/otro)
        const TIPO_INCIDENCIA = { retraso: 'retraso', mecanico: 'mecanico', percance: 'desvio', accidente: 'accidente', otro: 'otro' };
        await crearIncidente({ viajeId: viaje.id, tipo: TIPO_INCIDENCIA[notifTipo] || 'otro', descripcion: notifDesc || tipoLabel, severidad: 'alta', reportadoPor: perfil?.id });
        // 2) Notificación temporal para el cajero (5h o hasta marcar leída)
        await crearNotificacion({ sucursalId: perfil?.sucursal_id, viajeId: viaje.id, busPlaca, tipo: notifTipo, mensaje: mensajeBase, severidad: 'alta' });
        // 3) Aviso con disculpa por correo SOLO a los pasajeros de ESTE viaje (el bus afectado)
        const emails = await getEmailsViaje(viaje.id);
        let emailMsg = ' · sin pasajeros con correo en este viaje';
        if (emails.length) {
            const env = await enviarAvisoIncidente({
                emails, empresa: empresaNombre, origen: viaje.origen, destino: viaje.destino,
                fechaSalida: viaje.fecha_salida, tipo: notifTipo, motivo: notifDesc || tipoLabel,
            });
            emailMsg = env.ok ? ` · 📧 ${env.enviados} pasajero(s) avisado(s)` : ` · ⚠ correo: ${env.error}`;
        }
        setNotifEnviando(false);
        setNotifResultado({ tipo: 'ok', texto: `Reportado a admin y cajero${emailMsg}` });
        setNotifDesc('');
    };

    const imprimirManifiesto = async (viaje) => {
        const pasajeros = pasajerosMap[viaje.id] || await getReservasViaje(viaje.id);
        const busPlaca  = viaje.buses?.placa || '';
        const html = `<html><head><title>Manifiesto</title>
        <style>body{font-family:monospace;font-size:12px;margin:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #000;padding:4px 8px}th{background:#eee}</style>
        </head><body>
        <h2 style="text-align:center">MANIFIESTO — ${viaje.origen} → ${viaje.destino}</h2>
        <p><strong>Bus:</strong> ${busPlaca} · <strong>Salida:</strong> ${new Date(viaje.fecha_salida).toLocaleString('es-BO')}</p>
        <table><thead><tr><th>Asiento</th><th>Nombre</th><th>CI</th><th>Teléfono</th></tr></thead>
        <tbody>${pasajeros.map(p => `<tr><td>${p.asiento}</td><td>${p.nombre}</td><td>${p.ci}</td><td>${p.telefono || '—'}</td></tr>`).join('')}</tbody>
        </table></body></html>`;
        const w = window.open('', '_blank', 'width=700,height=600');
        if (w) { w.document.write(html); w.document.close(); w.print(); }
    };

    const handleLogout = async () => { await logout(); navigate('/'); };

    // ── Shared style helpers ─────────────────────────────────────────────────
    const surface   = '#0c1421';
    const surfaceHi = '#111b2d';
    const border    = 'rgba(255,255,255,0.07)';
    const textMuted = '#64748b';
    const textSub   = '#94a3b8';

    const inputStyle = {
        width: '100%', boxSizing: 'border-box',
        background: surfaceHi, border: `1px solid ${border}`,
        color: '#e2e8f0', padding: '0.7rem 1rem',
        borderRadius: '8px', fontSize: '0.875rem',
        outline: 'none', fontFamily: "'Outfit', system-ui, sans-serif",
        transition: 'border-color 0.15s',
    };

    const labelStyle = {
        display: 'block', fontSize: '0.7rem', fontWeight: 600,
        color: textMuted, marginBottom: '0.4rem',
        textTransform: 'uppercase', letterSpacing: '0.07em',
        fontFamily: "'Outfit', sans-serif",
    };

    const sectionTitle = {
        fontSize: '0.7rem', fontWeight: 700, color: textMuted,
        textTransform: 'uppercase', letterSpacing: '0.09em',
        marginBottom: '1rem', fontFamily: "'Outfit', sans-serif",
    };

    return (
        <div ref={rootRef} style={{
            position: 'relative', height: '100dvh', width: '100%',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            color: '#dde5f0', fontFamily: "'Outfit', system-ui, sans-serif",
            background: '#080f1a',
        }}>
            <style>{`
                @media (max-width: 768px) {
                    .conductor-tab-bar-top    { display: none   !important; }
                    .conductor-tab-bar-bottom { display: flex   !important; }
                    .conductor-main-content   { padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px)) !important; }
                }
                @media (min-width: 769px) {
                    .conductor-tab-bar-top    { display: flex   !important; }
                    .conductor-tab-bar-bottom { display: none   !important; }
                }
                @keyframes scanMove {
                    0%   { top: 0%; opacity: 0.8; }
                    48%  { opacity: 0.8; }
                    50%  { top: calc(100% - 2px); opacity: 0.3; }
                    52%  { opacity: 0.8; }
                    100% { top: 0%; opacity: 0.8; }
                }
                @keyframes pulseRing {
                    0%, 100% { opacity: 0.4; transform: scale(1); }
                    50%       { opacity: 0.15; transform: scale(1.04); }
                }
                #qr-lector-conductor video { border-radius: 8px; }
                #qr-lector-conductor img   { border-radius: 8px; }

                .cond-tab-btn { transition: color 0.18s, background 0.18s; }
                .cond-tab-btn:hover { background: rgba(255,255,255,0.06) !important; }

                .cond-incident-pill { transition: background 0.15s, border-color 0.15s, color 0.15s; cursor: pointer; }

                .viaje-card { transition: border-color 0.2s; }
                .viaje-card:hover { border-color: rgba(255,255,255,0.12) !important; }

                .action-btn { transition: filter 0.15s, transform 0.1s; }
                .action-btn:hover  { filter: brightness(1.1); }
                .action-btn:active { transform: scale(0.97); }

                .cond-input:focus { border-color: ${empresaColor}70 !important; }

                select option { background: #111b2d; }
            `}</style>

            {/* ── Header ─────────────────────────────────────────────────── */}
            <header data-anim="header" style={{
                position: 'relative', zIndex: 30, flexShrink: 0,
                background: `linear-gradient(160deg, ${empresaColor}e8 0%, ${empresaColor}b0 55%, ${(empresaTema?.secondary || empresaColor)}90 100%)`,
                borderBottom: `1px solid rgba(255,255,255,0.1)`,
            }}>
                {/* Sub-bar */}
                <div style={{
                    padding: '0.25rem 0.85rem',
                    background: 'rgba(0,0,0,0.22)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.6rem', color: empresaTextColor, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                            {sucursalNombre}
                        </span>
                        <span style={{ width: 1, height: 10, background: 'rgba(255,255,255,0.2)' }} />
                        <span style={{ fontSize: '0.6rem', color: `${empresaTextColor}b0`, fontWeight: 500 }}>
                            {perfil?.nombre_completo || 'Conductor'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.55rem', color: '#34d399', fontWeight: 700, letterSpacing: '0.06em' }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399' }} />
                        ACTIVO
                    </div>
                </div>

                {/* Main header row */}
                <div style={{ padding: '0.5rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '8px', flexShrink: 0, background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '3px' }}>
                        <FragmentoDept deptNombre={deptNombre} color={empresaTextColor} size={22} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.18)', borderRadius: '8px', padding: '0.22rem 0.8rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.95rem', fontWeight: 700, color: empresaTextColor, lineHeight: 1.1, letterSpacing: '0.02em' }}>
                            {horaActual.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                        </div>
                        <div style={{ fontSize: '0.5rem', color: `${empresaTextColor}90`, fontWeight: 600, letterSpacing: '0.05em', marginTop: '0.05rem', textTransform: 'uppercase' }}>
                            {horaActual.toLocaleDateString('es-BO', { weekday: 'short', day: '2-digit', month: 'short' })}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)', color: empresaTextColor, padding: '0.4rem', borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
                            <IconHome color={empresaTextColor} size={15} />
                        </button>
                        <button onClick={handleLogout} style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', padding: '0.4rem', borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}>
                            <IconLogout color="#fca5a5" size={15} />
                        </button>
                    </div>
                </div>

                {/* Tab bar — desktop */}
                <div className="conductor-tab-bar-top" style={{ padding: '0 0.85rem 0.6rem', display: 'flex', gap: '0.25rem' }}>
                    {TABS.map(t => {
                        const activo = tab === t.id;
                        return (
                            <button key={t.id} className="cond-tab-btn" onClick={() => setTab(t.id)} style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                                padding: '0.5rem 0', borderRadius: '7px', border: 'none',
                                background: activo ? 'rgba(0,0,0,0.3)' : 'transparent',
                                color: activo ? '#ffffff' : `${empresaTextColor}70`,
                                fontWeight: activo ? 700 : 500, fontSize: '0.78rem',
                                cursor: 'pointer', fontFamily: "'Outfit', sans-serif", letterSpacing: '0.03em',
                                boxShadow: activo ? 'inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
                            }}>
                                <t.icon color={activo ? '#ffffff' : `${empresaTextColor}60`} size={15} />
                                <span>{t.label}</span>
                            </button>
                        );
                    })}
                </div>
            </header>

            {/* ── Main content ───────────────────────────────────────────── */}
            <main className="conductor-main-content" style={{ flex: 1, position: 'relative', zIndex: 1, overflowY: 'auto' }}>
                <div ref={contentRef} style={{ padding: '1.1rem 1rem' }}>

                {/* ── Selector de VIAJE ACTUAL (compartido por las 4 vistas) + filtro de día ── */}
                {!cargando && tripulacionId && viajes.length > 0 && (() => {
                    const diaKey = (v) => new Date(v.fecha_salida).toISOString().slice(0, 10);
                    const dias = [...new Set(viajes.map(diaKey))].sort();
                    const lista = diaFiltro ? viajes.filter(v => diaKey(v) === diaFiltro) : viajes;
                    const sel = viajes.find(v => v.id === viajeSel);
                    const horaTxt = (v) => new Date(v.fecha_salida).toLocaleTimeString('es-BO', { hour: 'numeric', minute: '2-digit', hour12: true });
                    const chip = (on) => ({ padding: '0.3rem 0.7rem', borderRadius: 999, border: `1px solid ${on ? empresaColor2 : border}`, background: on ? `${empresaColor2}22` : 'transparent', color: on ? empresaColor2 : textMuted, fontWeight: on ? 700 : 500, fontSize: '0.72rem', cursor: 'pointer', whiteSpace: 'nowrap', textTransform: 'capitalize', fontFamily: "'Outfit', sans-serif" });
                    return (
                        <div style={{ marginBottom: '1.2rem' }}>
                            {dias.length > 1 && (
                                <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', marginBottom: '0.6rem', paddingBottom: '0.15rem' }}>
                                    <button onClick={() => setDiaFiltro(null)} style={chip(!diaFiltro)}>Todos</button>
                                    {dias.map(k => (
                                        <button key={k} onClick={() => setDiaFiltro(diaFiltro === k ? null : k)} style={chip(diaFiltro === k)}>
                                            {new Date(k + 'T12:00:00').toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric' })}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div onClick={() => setSelectorAbierto(o => !o)} style={{ cursor: 'pointer', background: surface, border: `1.5px solid ${empresaColor2}`, borderLeft: `4px solid ${empresaColor2}`, borderRadius: 12, padding: '0.85rem 1rem', boxShadow: `0 0 0 1px ${empresaColor2}22` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.1em', color: empresaColor2, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Viaje actual</div>
                                        {sel ? (
                                            <>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.02em' }}>{sel.origen} <span style={{ color: empresaColor2 }}>→</span> {sel.destino}</div>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: textSub, textTransform: 'uppercase', marginTop: '0.2rem' }}>
                                                    {new Date(sel.fecha_salida).toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })} · {horaTxt(sel)} · 🚍 {sel.buses?.placa || '—'}
                                                </div>
                                            </>
                                        ) : <div style={{ color: textMuted }}>Selecciona un viaje</div>}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem', flexShrink: 0 }}>
                                        {sel && <StatusBadge estado={sel.estado} empresaColor={empresaColor} />}
                                        <span style={{ color: empresaColor2, fontSize: '0.74rem', fontWeight: 700 }}>{selectorAbierto ? '▲ cerrar' : '▼ cambiar'}</span>
                                    </div>
                                </div>
                            </div>
                            {selectorAbierto && (
                                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {lista.map(v => {
                                        const activo = v.id === viajeSel;
                                        const fin = v.estado === 'completado' || v.estado === 'cancelado';
                                        return (
                                            <div key={v.id} onClick={() => { setViajeSel(v.id); setSelectorAbierto(false); }} style={{
                                                cursor: 'pointer', background: activo ? `${empresaColor2}1f` : surfaceHi,
                                                border: `1px solid ${activo ? empresaColor2 : border}`, borderRadius: 10, padding: '0.6rem 0.85rem',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', opacity: fin ? 0.5 : 1,
                                            }}>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9' }}>{v.origen} → {v.destino}</div>
                                                    <div style={{ fontSize: '0.72rem', color: textMuted, textTransform: 'capitalize' }}>
                                                        {new Date(v.fecha_salida).toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'short' })} · {horaTxt(v)} · {v.buses?.placa || '—'}
                                                    </div>
                                                </div>
                                                <StatusBadge estado={v.estado} empresaColor={empresaColor} />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* ── Tab: VIAJES ── */}
                {tab === 'viajes' && (
                    <div>
                        {cargando && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                {[1,2].map(i => (
                                    <div key={i} style={{ height: 110, borderRadius: '12px', background: surfaceHi, border: `1px solid ${border}`, opacity: 0.5 }} />
                                ))}
                            </div>
                        )}
                        {!cargando && !tripulacionId && (
                            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: surfaceHi, borderRadius: '14px', border: '1px solid rgba(245,158,11,0.2)' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚠️</div>
                                <div style={{ color: '#fbbf24', fontWeight: 600, fontSize: '0.9rem' }}>Sin registro de tripulación</div>
                                <div style={{ color: textMuted, fontSize: '0.8rem', marginTop: '0.35rem' }}>Este usuario no está vinculado a ningún conductor en el sistema.</div>
                            </div>
                        )}
                        {!cargando && tripulacionId && viajes.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: surfaceHi, borderRadius: '14px', border: `1px solid ${border}` }}>
                                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🚌</div>
                                <div style={{ color: textSub, fontWeight: 600, fontSize: '0.9rem' }}>Sin viajes asignados</div>
                                <div style={{ color: textMuted, fontSize: '0.8rem', marginTop: '0.35rem' }}>No hay viajes programados para hoy.</div>
                            </div>
                        )}

                        {(diaFiltro ? viajes.filter(v => diaKeyOf(v) === diaFiltro) : viajes).map(viaje => {
                            const busPlaca  = viaje.buses?.placa || '—';
                            const pasajeros = pasajerosMap[viaje.id] || [];
                            const temprano  = esTemprano(viaje);
                            const enViaje   = viaje.estado === 'en_viaje';
                            const cancelado = viaje.estado === 'cancelado';
                            return (
                                <div key={viaje.id} className="viaje-card" style={{
                                    background: surface, borderRadius: '12px', marginBottom: '1rem',
                                    overflow: 'hidden',
                                    border: `1px solid ${enViaje ? `${empresaColor}40` : cancelado ? 'rgba(239,68,68,0.15)' : border}`,
                                    borderLeft: `4px solid ${cancelado ? '#dc2626' : empresaColor}`,
                                }}>
                                    {/* Route header */}
                                    <div style={{ padding: '1rem 1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#f8fafc', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                                                {viaje.origen} <span style={{ color: empresaColor }}>→</span> {viaje.destino}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.92rem', fontWeight: 800, color: empresaColor, background: `${empresaColor}18`, border: `1px solid ${empresaColor}40`, padding: '0.3rem 0.7rem', borderRadius: 7, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                                    📅 {new Date(viaje.fecha_salida).toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                </span>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.95rem', fontWeight: 900, color: '#f8fafc', background: `${empresaColor}2e`, border: `1px solid ${empresaColor}55`, padding: '0.3rem 0.7rem', borderRadius: 7 }}>
                                                    🕐 {new Date(viaje.fecha_salida).toLocaleTimeString('es-BO', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                </span>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.74rem', fontWeight: 600, color: textSub, background: surfaceHi, border: `1px solid ${border}`, padding: '0.22rem 0.55rem', borderRadius: 6 }}>🚍 {busPlaca}</span>
                                                {viaje.anden && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.74rem', fontWeight: 600, color: textSub, background: surfaceHi, border: `1px solid ${border}`, padding: '0.22rem 0.55rem', borderRadius: 6 }}>📍 Andén {viaje.anden}</span>}
                                            </div>
                                        </div>
                                        <StatusBadge estado={viaje.estado} empresaColor={empresaColor} />
                                    </div>

                                    {/* Passenger section */}
                                    {!cancelado && (
                                        <div style={{ borderTop: `1px solid ${border}`, padding: '0.75rem 1.1rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: viajeActivo === viaje.id ? '0.75rem' : 0 }}>
                                                <span style={{ fontSize: '0.75rem', color: textSub, fontWeight: 600 }}>
                                                    {viajeActivo === viaje.id
                                                        ? <><span style={{ color: '#6ee7b7', fontWeight: 800 }}>{pasajeros.filter(p => p.abordado).length}</span> / {pasajeros.length} presentes</>
                                                        : 'Pasajeros'}
                                                </span>
                                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                    <button className="action-btn" onClick={() => setViajeActivo(viajeActivo === viaje.id ? null : viaje.id)} style={{ background: 'transparent', border: `1px solid ${border}`, color: textSub, padding: '0.28rem 0.65rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', fontFamily: "'Outfit', sans-serif" }}>
                                                        {viajeActivo === viaje.id ? 'Ocultar ▲' : 'Ver lista ▼'}
                                                    </button>
                                                    <button className="action-btn" onClick={() => imprimirManifiesto(viaje)} style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#6ee7b7', padding: '0.28rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem' }}>
                                                        🖨️
                                                    </button>
                                                </div>
                                            </div>

                                            {viajeActivo === viaje.id && (
                                                <div>
                                                    <input type="text" placeholder="Buscar nombre o CI..." value={busquedaPasajero}
                                                        onChange={e => setBusquedaPasajero(e.target.value)}
                                                        className="cond-input"
                                                        style={{ ...inputStyle, marginBottom: '0.6rem', fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}
                                                    />
                                                    {pasajeros.length === 0 ? (
                                                        <div style={{ color: textMuted, fontSize: '0.82rem', textAlign: 'center', padding: '1.25rem' }}>Sin pasajeros registrados.</div>
                                                    ) : (
                                                        <div style={{ borderRadius: '8px', overflow: 'hidden', border: `1px solid ${border}` }}>
                                                            {pasajeros
                                                                .filter(p => !busquedaPasajero || p.nombre.toLowerCase().includes(busquedaPasajero.toLowerCase()) || p.ci.includes(busquedaPasajero))
                                                                .map((p, i) => (
                                                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.55rem 0.75rem', borderBottom: i < pasajeros.length - 1 ? `1px solid ${border}` : 'none', background: i % 2 === 0 ? 'transparent' : `${surfaceHi}80` }}>
                                                                        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem', fontWeight: 700, color: empresaColor, minWidth: 32, textAlign: 'center', background: `${empresaColor}15`, padding: '0.18rem 0.3rem', borderRadius: '4px' }}>{p.asiento}</span>
                                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                                            <div style={{ color: '#e2e8f0', fontSize: '0.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</div>
                                                                            <div style={{ color: textMuted, fontSize: '0.7rem' }}>{p.ci}{p.telefono ? ` · ${p.telefono}` : ''}</div>
                                                                        </div>
                                                                        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: 999, whiteSpace: 'nowrap', background: p.abordado ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)', color: p.abordado ? '#6ee7b7' : '#fca5a5', border: `1px solid ${p.abordado ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.28)'}` }}>
                                                                            {p.abordado ? '✓ Presente' : '○ Ausente'}
                                                                        </span>
                                                                    </div>
                                                                ))
                                                            }
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    {!cancelado && esConductor && (
                                        <div style={{ borderTop: `1px solid ${border}`, padding: '0.75rem 1.1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {(viaje.estado === 'programado' || viaje.estado === 'autorizado') && (
                                                <>
                                                    <button className="action-btn" onClick={() => cambiarEstado(viaje.id, 'en_viaje')} style={{
                                                        flex: 1, padding: '0.65rem 1rem', borderRadius: '8px', border: 'none',
                                                        background: temprano ? '#d97706' : empresaColor,
                                                        color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem',
                                                        fontFamily: "'Outfit', sans-serif", minWidth: 120,
                                                    }}>
                                                        {temprano ? '⚡ Inicio anticipado' : '🚀 Iniciar viaje'}
                                                    </button>
                                                    {confirmandoCancelar === viaje.id ? (
                                                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                                                            <span style={{ color: '#fca5a5', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>¿Confirmar?</span>
                                                            <button className="action-btn" onClick={() => handleCancelar(viaje.id)} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 0.75rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}>Sí</button>
                                                            <button className="action-btn" onClick={() => setConfirmandoCancelar(null)} style={{ background: surfaceHi, color: textSub, border: `1px solid ${border}`, borderRadius: '6px', padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '0.75rem' }}>No</button>
                                                        </div>
                                                    ) : (
                                                        <button className="action-btn" onClick={() => setConfirmandoCancelar(viaje.id)} style={{ padding: '0.65rem 0.9rem', background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', color: '#fca5a5', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>
                                                            Cancelar
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                            {viaje.estado === 'en_viaje' && (
                                                <button className="action-btn" onClick={() => cambiarEstado(viaje.id, 'completado')} style={{ flex: 1, padding: '0.65rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', fontFamily: "'Outfit', sans-serif" }}>
                                                    🏁 Finalizar viaje
                                                </button>
                                            )}
                                            {viaje.estado === 'completado' && (
                                                <div style={{ flex: 1, textAlign: 'center', color: textMuted, padding: '0.65rem', fontSize: '0.85rem' }}>
                                                    Viaje completado ✓
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {cancelado && (
                                        <div style={{ borderTop: `1px solid rgba(239,68,68,0.1)`, padding: '0.6rem 1.1rem' }}>
                                            <span style={{ color: '#fca5a5', fontSize: '0.78rem' }}>Viaje cancelado</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Tab: NOTIFICAR ── */}
                {tab === 'notificar' && (
                    <div>
                        <p style={sectionTitle}>Reportar incidente</p>

                        {notifResultado && (
                            <div style={{
                                padding: '0.85rem 1rem', marginBottom: '1.25rem', borderRadius: '10px',
                                background: notifResultado.tipo === 'ok' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                                border: `1px solid ${notifResultado.tipo === 'ok' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                                color: notifResultado.tipo === 'ok' ? '#6ee7b7' : '#fca5a5',
                                fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                            }}>
                                {notifResultado.tipo === 'ok' ? '✓' : '✕'} {notifResultado.texto}
                            </div>
                        )}

                        <form onSubmit={handleEnviarNotificacion} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                            {/* Viaje */}
                            <div>
                                <label style={labelStyle}>Viaje afectado</label>
                                <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', color: viajes.find(x => x.id === viajeSel) ? '#e2e8f0' : textMuted }}>
                                    {(() => { const v = viajes.find(x => x.id === viajeSel); return v ? `${v.origen} → ${v.destino} · ${new Date(v.fecha_salida).toLocaleTimeString('es-BO', { hour: 'numeric', minute: '2-digit', hour12: true })}` : 'Elegí el viaje en el selector de arriba'; })()}
                                </div>
                            </div>

                            {/* Tipo — pill grid */}
                            <div>
                                <label style={labelStyle}>Tipo de incidente</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                    {TIPOS_INCIDENTE.map(t => {
                                        const sel = notifTipo === t.value;
                                        return (
                                            <button key={t.value} type="button" className="cond-incident-pill"
                                                onClick={() => setNotifTipo(t.value)}
                                                style={{
                                                    padding: '0.6rem 0.4rem', borderRadius: '8px',
                                                    border: `1px solid ${sel ? `${empresaColor}60` : border}`,
                                                    background: sel ? `${empresaColor}18` : surfaceHi,
                                                    color: sel ? empresaColor : textSub,
                                                    fontSize: '0.75rem', fontWeight: sel ? 700 : 500,
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem',
                                                    fontFamily: "'Outfit', sans-serif",
                                                }}>
                                                <span style={{ fontSize: '1rem' }}>{t.icon}</span>
                                                <span>{t.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Descripción */}
                            <div>
                                <label style={labelStyle}>Descripción</label>
                                <textarea value={notifDesc} onChange={e => setNotifDesc(e.target.value)} required rows={4}
                                    placeholder="Describe brevemente lo que ocurrió..."
                                    className="cond-input"
                                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                                />
                                <div style={{ textAlign: 'right', fontSize: '0.65rem', color: textMuted, marginTop: '0.3rem' }}>
                                    {notifDesc.length} caracteres
                                </div>
                            </div>

                            {/* Recipients info */}
                            <div style={{ background: surfaceHi, border: `1px solid ${border}`, borderRadius: '10px', padding: '0.85rem 1rem' }}>
                                <div style={{ ...labelStyle, marginBottom: '0.65rem' }}>Se notificará a:</div>
                                {[
                                    { icon: '🛠️', title: 'Administradores', desc: 'Registro permanente en incidentes' },
                                    { icon: '🎫', title: 'Cajeros de tu sucursal', desc: 'Alerta del viaje y bus afectado' },
                                ].map(item => (
                                    <div key={item.icon} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.95rem', flexShrink: 0, marginTop: '0.05rem' }}>{item.icon}</span>
                                        <div>
                                            <div style={{ fontSize: '0.8rem', color: textSub, fontWeight: 600 }}>{item.title}</div>
                                            <div style={{ fontSize: '0.7rem', color: textMuted }}>{item.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button type="submit" className="action-btn"
                                disabled={notifEnviando || !viajeSel || !notifDesc.trim()}
                                style={{
                                    background: (notifEnviando || !viajeSel || !notifDesc.trim()) ? surfaceHi : '#dc2626',
                                    color:      (notifEnviando || !viajeSel || !notifDesc.trim()) ? textMuted  : '#fff',
                                    border:     (notifEnviando || !viajeSel || !notifDesc.trim()) ? `1px solid ${border}` : 'none',
                                    borderRadius: '9px', padding: '0.88rem',
                                    fontWeight: 700, fontSize: '0.9rem', cursor: (!viajeSel || !notifDesc.trim()) ? 'not-allowed' : 'pointer',
                                    fontFamily: "'Outfit', sans-serif",
                                }}>
                                {notifEnviando ? 'Enviando...' : 'Enviar notificación'}
                            </button>
                        </form>
                    </div>
                )}

                {/* ── Tab: ESCANEAR ── */}
                {tab === 'escanear' && (
                    <div>
                        <p style={sectionTitle}>Validar abordaje con QR</p>

                        <div style={{ background: `${empresaColor}12`, border: `1px solid ${empresaColor}35`, borderRadius: 10, padding: '0.6rem 0.9rem', marginBottom: '1rem', fontSize: '0.82rem' }}>
                            <span style={{ color: textMuted }}>Escaneando para: </span>
                            <span style={{ color: '#f1f5f9', fontWeight: 700 }}>
                                {(() => { const v = viajes.find(x => x.id === viajeSel); return v ? `${v.origen} → ${v.destino}` : 'sin viaje — elegí arriba'; })()}
                            </span>
                        </div>

                        {scanValidando && (
                            <div style={{ padding: '1.25rem', textAlign: 'center', background: `${empresaColor}10`, border: `1px solid ${empresaColor}30`, borderRadius: '12px', marginBottom: '1rem' }}>
                                <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>⏳</div>
                                <div style={{ color: empresaColor, fontWeight: 600, fontSize: '0.85rem' }}>Verificando boleto...</div>
                            </div>
                        )}

                        {!scanValidando && scanResultado && (() => {
                            const colores = {
                                ok:        { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.3)', text: '#6ee7b7', icon: '✅' },
                                yaAbordado:{ bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)', text: '#fbbf24', icon: '⚠️' },
                                info:      { bg: `${empresaColor}10`,     border: `${empresaColor}30`,    text: empresaColor, icon: 'ℹ️' },
                                error:     { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.3)',  text: '#fca5a5', icon: '❌' },
                            };
                            const c = colores[scanResultado.tipo] || colores.error;
                            return (
                                <div ref={scanResultRef} style={{ padding: '1.1rem', marginBottom: '1rem', borderRadius: '12px', background: c.bg, border: `1px solid ${c.border}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: scanResultado.pasajero ? '0.75rem' : 0 }}>
                                        <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{c.icon}</span>
                                        <span style={{ color: c.text, fontWeight: 700, fontSize: '0.88rem' }}>{scanResultado.mensaje}</span>
                                    </div>
                                    {scanResultado.pasajero && (
                                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '0.65rem 0.9rem', display: 'grid', gridTemplateColumns: '44px 1fr', gap: '0.5rem 0.75rem', alignItems: 'center' }}>
                                            <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.85rem', fontWeight: 800, color: empresaColor, background: `${empresaColor}18`, borderRadius: '5px', textAlign: 'center', padding: '0.25rem 0' }}>
                                                {scanResultado.asiento}
                                            </div>
                                            <div>
                                                <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.85rem' }}>{scanResultado.pasajero}</div>
                                                <div style={{ color: textMuted, fontSize: '0.72rem' }}>CI: {scanResultado.ci}</div>
                                            </div>
                                        </div>
                                    )}
                                    <button className="action-btn" onClick={reanudarScanner} style={{
                                        marginTop: '0.85rem', width: '100%', background: empresaColor, color: '#fff',
                                        border: 'none', borderRadius: '8px', padding: '0.55rem 1rem',
                                        cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                                        fontFamily: "'Outfit', sans-serif",
                                    }}>
                                        Escanear siguiente
                                    </button>
                                </div>
                            );
                        })()}

                        {/* Scanner container with animated scan line */}
                        <div ref={scannerBoxRef} style={{ background: surface, borderRadius: '12px', border: `1px solid ${border}`, overflow: 'hidden', marginBottom: '1.25rem', scrollMarginTop: '70px' }}>
                            <div style={{ padding: '0.7rem 1rem', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: scannerActivo ? '#10b981' : textMuted, display: 'inline-block', transition: 'background 0.3s' }} />
                                <span style={{ fontSize: '0.72rem', color: textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    {scannerActivo ? 'Cámara activa' : 'Esperando cámara'}
                                </span>
                            </div>
                            <div style={{ position: 'relative' }}>
                                {scannerActivo && (
                                    <div style={{
                                        position: 'absolute', left: '10%', right: '10%', height: '2px',
                                        background: `linear-gradient(90deg, transparent, ${empresaColor}, transparent)`,
                                        zIndex: 10, pointerEvents: 'none',
                                        animation: 'scanMove 2.5s ease-in-out infinite',
                                    }} />
                                )}
                                <div id="qr-lector-conductor" style={{ padding: scannerActivo ? '0.5rem' : 0 }} />
                                <div style={{ padding: scannerActivo ? '0 0.85rem 0.95rem' : '1.75rem 0.85rem' }}>
                                    {!scannerActivo && (
                                        <div style={{ textAlign: 'center', marginBottom: '1rem', color: textMuted, fontSize: '0.82rem' }}>
                                            <div style={{ fontSize: '2.2rem', marginBottom: '0.4rem' }}>📷</div>
                                            Cámara apagada
                                        </div>
                                    )}
                                    <button className="action-btn" onClick={scannerActivo ? stopScan : startScan} style={{
                                        width: '100%', padding: '0.9rem', borderRadius: 10, border: 'none', cursor: 'pointer',
                                        fontWeight: 800, fontSize: '0.95rem', fontFamily: "'Outfit', sans-serif",
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                        background: scannerActivo ? 'rgba(220,38,38,0.92)' : `linear-gradient(135deg, ${empresaColor}, ${empresaTema?.secondary || empresaColor})`,
                                        color: '#fff', boxShadow: scannerActivo ? 'none' : `0 4px 16px ${empresaColor}45`,
                                    }}>
                                        {scannerActivo ? '⏹ Detener escaneo' : '📷 Iniciar escaneo'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div style={{ background: surfaceHi, border: `1px solid ${border}`, borderRadius: '10px', padding: '0.8rem 1rem' }}>
                            <div style={{ fontSize: '0.72rem', color: textMuted, lineHeight: 1.55 }}>
                                Apunta la cámara al código QR del boleto del pasajero. El sistema validará automáticamente el abordaje.
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Tab: PASAJEROS ── */}
                {tab === 'pasajeros' && (
                    <div>
                        <p style={sectionTitle}>Lista de pasajeros</p>

                        {!viajeSel && (
                            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: surfaceHi, borderRadius: '12px', border: `1px solid ${border}` }}>
                                <div style={{ fontSize: '1.75rem', marginBottom: '0.65rem', opacity: 0.5 }}>👥</div>
                                <div style={{ color: textSub, fontWeight: 600, fontSize: '0.88rem' }}>Selecciona un viaje</div>
                                <div style={{ color: textMuted, fontSize: '0.78rem', marginTop: '0.3rem' }}>Para ver la lista de pasajeros.</div>
                            </div>
                        )}

                        {viajeSel && (() => {
                            const v = viajes.find(x => x.id === viajeSel);
                            return (
                                <div>
                                    {/* Viaje info + stats */}
                                    {v && (() => {
                                        const abordados = listaPasajeros.filter(p => p.abordado).length;
                                        const total     = listaPasajeros.length;
                                        return (
                                            <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '10px', padding: '0.85rem 1.1rem', marginBottom: '1rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: total > 0 ? '0.65rem' : 0 }}>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.92rem', letterSpacing: '-0.01em' }}>{v.origen} → {v.destino}</div>
                                                        <div style={{ color: textMuted, fontSize: '0.72rem', marginTop: '0.2rem' }}>
                                                            {v.buses?.placa} · {new Date(v.fecha_salida).toLocaleString('es-BO')}
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                        <div style={{ fontSize: '1.3rem', fontWeight: 800, lineHeight: 1 }}>
                                                            <span style={{ color: '#10b981' }}>{abordados}</span>
                                                            <span style={{ color: textMuted, fontSize: '0.9rem' }}>/{total}</span>
                                                        </div>
                                                        <div style={{ fontSize: '0.58rem', color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.1rem' }}>abordaron</div>
                                                    </div>
                                                </div>
                                                {total > 0 && (
                                                    <div style={{ height: 4, background: border, borderRadius: '999px', overflow: 'hidden' }}>
                                                        <div style={{
                                                            height: '100%',
                                                            width: `${Math.round((abordados / total) * 100)}%`,
                                                            background: '#10b981',
                                                            borderRadius: '999px',
                                                            transition: 'width 0.6s ease',
                                                        }} />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {listaPasajeros.length === 0 ? (
                                        <div style={{ textAlign: 'center', color: textMuted, padding: '2.5rem', background: surfaceHi, borderRadius: '10px', border: `1px solid ${border}` }}>
                                            Sin pasajeros registrados.
                                        </div>
                                    ) : (
                                        <div style={{ background: surface, borderRadius: '12px', border: `1px solid ${border}`, overflow: 'hidden' }}>
                                            {/* Header row */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 80px', gap: '0.75rem', padding: '0.5rem 0.9rem', borderBottom: `1px solid ${border}` }}>
                                                {['Asiento', 'Pasajero', 'CI'].map(h => (
                                                    <div key={h} style={{ fontSize: '0.62rem', color: textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</div>
                                                ))}
                                            </div>
                                            {listaPasajeros.map((p, i) => (
                                                <div key={i} style={{
                                                    display: 'grid', gridTemplateColumns: '44px 1fr auto',
                                                    gap: '0.6rem', padding: '0.6rem 0.9rem', alignItems: 'center',
                                                    borderBottom: i < listaPasajeros.length - 1 ? `1px solid ${border}` : 'none',
                                                    background: p.abordado ? 'rgba(16,185,129,0.04)' : (i % 2 === 0 ? 'transparent' : `${surfaceHi}60`),
                                                    transition: 'background 0.3s',
                                                }}>
                                                    <div style={{
                                                        fontFamily: 'ui-monospace, monospace', fontSize: '0.78rem', fontWeight: 700,
                                                        color: p.abordado ? '#6ee7b7' : empresaColor,
                                                        background: p.abordado ? 'rgba(16,185,129,0.12)' : `${empresaColor}14`,
                                                        padding: '0.2rem 0', borderRadius: '5px', textAlign: 'center',
                                                    }}>
                                                        {p.asiento}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                                                        <InitialsAvatar name={p.nombre} color={p.abordado ? '#10b981' : empresaColor} />
                                                        <div style={{ minWidth: 0 }}>
                                                            <div style={{ color: '#e2e8f0', fontSize: '0.83rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</div>
                                                            <div style={{ color: textMuted, fontSize: '0.7rem' }}>{p.ci}{p.telefono && p.telefono !== '—' ? ` · ${p.telefono}` : ''}</div>
                                                        </div>
                                                    </div>
                                                    <span style={{
                                                        fontSize: '0.62rem', fontWeight: 700, padding: '0.18rem 0.55rem',
                                                        borderRadius: '999px', whiteSpace: 'nowrap',
                                                        background: p.abordado ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
                                                        border: `1px solid ${p.abordado ? 'rgba(16,185,129,0.35)' : border}`,
                                                        color: p.abordado ? '#6ee7b7' : textMuted,
                                                    }}>
                                                        {p.abordado ? '✓ Abordó' : 'Pendiente'}
                                                    </span>
                                                </div>
                                            ))}
                                            <div style={{ padding: '0.6rem 0.9rem', borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.72rem', color: textMuted }}>
                                                    Total: <strong style={{ color: textSub }}>{listaPasajeros.length}</strong> pasajero(s)
                                                </span>
                                                <button className="action-btn" onClick={() => getReservasViaje(viajeSel).then(setListaPasajeros)} style={{ background: 'transparent', border: `1px solid ${border}`, color: textMuted, padding: '0.28rem 0.65rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', fontFamily: "'Outfit', sans-serif" }}>
                                                    Actualizar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                )}

                </div>
            </main>

            {/* ── Bottom nav (mobile) ─────────────────────────────────────── */}
            <div className="conductor-tab-bar-bottom" style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40,
                background: 'rgba(8,15,26,0.95)',
                backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                borderTop: `1px solid ${border}`,
                display: 'none', justifyContent: 'space-around', alignItems: 'stretch',
                padding: `0.35rem 0.25rem calc(0.35rem + env(safe-area-inset-bottom, 0px)) 0.25rem`,
            }}>
                {TABS.map(t => {
                    const activo = tab === t.id;
                    return (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            background: 'transparent', border: 'none', borderRadius: '10px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            gap: '0.18rem', flex: 1, padding: '0.45rem 0.2rem', cursor: 'pointer',
                            color: activo ? empresaColor : '#475569',
                            transition: 'color 0.18s',
                            position: 'relative',
                        }}>
                            {activo && (
                                <span style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '2px', borderRadius: '0 0 3px 3px', background: empresaColor }} />
                            )}
                            <t.icon color={activo ? empresaColor : '#475569'} size={18} />
                            <span style={{ fontSize: '0.52rem', fontWeight: activo ? 700 : 500, fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                {t.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default PanelConductor;
