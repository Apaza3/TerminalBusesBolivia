import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import { getEmpresaTema } from '../../data/empresasTemas';
import { crearNotificacion, crearIncidente } from '../../data/mockStorage';
import {
    getTripulacionByUsuario, getViajesConductor,
    getReservasViaje, updateViajeEstado,
} from '../../servicios/api';
import FragmentoDept from '../../componentes/FragmentoDept';
import gsap from 'gsap';

const TIPOS_INCIDENTE = [
    { value: 'retraso', label: '⏰ Retraso' },
    { value: 'mecanico', label: '🔧 Falla mecánica' },
    { value: 'percance', label: '⚠️ Percance en ruta' },
    { value: 'accidente', label: '🚨 Accidente' },
    { value: 'otro', label: '📋 Otro' },
];

const IconViajes = ({ color, size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.15s ease' }}>
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 .6.4 1 1 1h1" />
        <circle cx="7" cy="17" r="2" />
        <path d="M9 17h6" />
        <circle cx="17" cy="17" r="2" />
    </svg>
);

const IconNotificar = ({ color, size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.15s ease' }}>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
);

const IconEscanear = ({ color, size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.15s ease' }}>
        <path d="M3 7V5a2 2 0 0 1 2-2h2" />
        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
        <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const IconPasajeros = ({ color, size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.15s ease' }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

const IconHome = ({ color, size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
);

const IconLogout = ({ color, size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

const badgeEstado = (estado, color) => {
    const m = {
        programado:  { bg: '#1e3a8a22', c: '#93c5fd',  label: '📅 Programado'  },
        autorizado:  { bg: '#14532d22', c: '#86efac',  label: '✅ Autorizado'   },
        en_viaje:    { bg: color + '22', c: color,     label: '🚌 En Viaje'     },
        completado:  { bg: '#37415122', c: '#9ca3af',  label: '✅ Completado'   },
        cancelado:   { bg: '#7f1d1d22', c: '#fca5a5',  label: '❌ Cancelado'    },
    };
    const s = m[estado] || m.programado;
    return (
        <span style={{ background: s.bg, color: s.c, padding: '0.28rem 0.7rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>
            {s.label}
        </span>
    );
};

const PanelConductor = () => {
    const navigate = useNavigate();
    const { perfil, logout } = useAuth();
    const rootRef = useRef(null);
    const scannerRef = useRef(null);

    const sucursalNombre = perfil?.sucursal_nombre || 'Mi Sucursal';
    const deptNombre = perfil?.departamento || 'La Paz';
    const tema = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];
    const empresaTema = getEmpresaTema(sucursalNombre);
    const empresaColor = empresaTema?.primary || tema.primary;
    const empresaTextColor = empresaTema?.primaryText || '#ffffff';

    const esConductor = perfil?.rol === 'conductor' || perfil?.rol === 'admin_sucursal';

    const [tab, setTab] = useState('viajes');
    const [tripulacionId, setTripulacionId] = useState(null);
    const [viajes, setViajes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [viajeActivo, setViajeActivo] = useState(null);
    const [pasajerosMap, setPasajerosMap] = useState({});
    const [busquedaPasajero, setBusquedaPasajero] = useState('');
    const [confirmandoCancelar, setConfirmandoCancelar] = useState(null);
    const [horaActual, setHoraActual] = useState(new Date());

    // Notificación / incidente
    const [notifViajeId, setNotifViajeId] = useState('');
    const [notifTipo, setNotifTipo] = useState('retraso');
    const [notifDesc, setNotifDesc] = useState('');
    const [notifEnviando, setNotifEnviando] = useState(false);
    const [notifResultado, setNotifResultado] = useState(null);

    // QR scanner
    const [scanResultado, setScanResultado] = useState(null);
    const [scanViajeId, setScanViajeId] = useState('');
    const [scannerActivo, setScannerActivo] = useState(false);

    // Tab Pasajeros
    const [listaViajeId, setListaViajeId] = useState('');
    const [listaPasajeros, setListaPasajeros] = useState([]);

    // Reloj
    useEffect(() => {
        const iv = setInterval(() => setHoraActual(new Date()), 1000);
        return () => clearInterval(iv);
    }, []);

    // Lookup tripulacion.id para este usuario
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
        const activos = lista.filter(v => v.estado === 'programado' || v.estado === 'autorizado');
        const proximos = activos.filter(v => new Date(v.fecha_salida) >= new Date());
        if (proximos.length > 0) return proximos[0].id;
        return activos.length > 0 ? activos[activos.length - 1].id : '';
    }, []);

    const cargarViajes = useCallback(async () => {
        if (!tripulacionId) return;
        const data = await getViajesConductor(tripulacionId, 1);
        const sorted = [...data].sort((a, b) => new Date(a.fecha_salida) - new Date(b.fecha_salida));
        setViajes(sorted);
        setCargando(false);
        const actual = detectarViajeActual(sorted);
        if (actual) {
            setNotifViajeId(prev => prev || actual);
            setScanViajeId(prev => prev || actual);
            setListaViajeId(prev => prev || actual);
        }
    }, [tripulacionId, detectarViajeActual]);

    useEffect(() => {
        if (!tripulacionId) return;
        cargarViajes();
        const iv = setInterval(cargarViajes, 30000);
        return () => clearInterval(iv);
    }, [tripulacionId, cargarViajes]);

    // Cargar pasajeros on-demand cuando se expande un viaje
    useEffect(() => {
        if (!viajeActivo) return;
        if (pasajerosMap[viajeActivo]) return;
        getReservasViaje(viajeActivo).then(p => {
            setPasajerosMap(prev => ({ ...prev, [viajeActivo]: p }));
        });
    }, [viajeActivo]); // eslint-disable-line

    // Cargar pasajeros para tab Pasajeros
    useEffect(() => {
        if (!listaViajeId) { setListaPasajeros([]); return; }
        getReservasViaje(listaViajeId).then(setListaPasajeros);
    }, [listaViajeId, tab]);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-anim="header"]', { y: -24, opacity: 0, duration: 0.45, ease: 'power3.out' });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    // ── QR Scanner lifecycle ──────────────────────────────────────────────────
    useEffect(() => {
        if (tab !== 'escanear') return;
        if (scannerRef.current) return;

        const scanner = new Html5QrcodeScanner(
            'qr-lector-conductor',
            { fps: 10, qrbox: { width: 240, height: 240 }, supportedScanTypes: [0] },
            false
        );
        scanner.render(
            (texto) => {
                setScanResultado({ tipo: 'info', mensaje: `QR leído: ${texto.trim().slice(0, 40)}` });
                scanner.pause(true);
                setScannerActivo(false);
            },
            () => { }
        );
        scannerRef.current = scanner;
        setScannerActivo(true);

        return () => {
            scanner.clear().catch(() => { });
            scannerRef.current = null;
            setScannerActivo(false);
        };
    }, [tab]);

    const reanudarScanner = () => {
        setScanResultado(null);
        if (scannerRef.current) {
            try { scannerRef.current.resume(); setScannerActivo(true); } catch { /* ignore */ }
        }
    };

    // ── Cambios de estado del viaje (Supabase) ──────────────────────────────
    const cambiarEstado = async (viajeId, nuevoEstado) => {
        await updateViajeEstado(viajeId, nuevoEstado);
        setViajes(prev => prev.map(v => v.id === viajeId ? { ...v, estado: nuevoEstado } : v));
    };

    const handleCancelar = async (viajeId) => {
        await updateViajeEstado(viajeId, 'cancelado');
        setViajes(prev => prev.map(v => v.id === viajeId ? { ...v, estado: 'cancelado' } : v));
        setConfirmandoCancelar(null);
    };

    const esTemprano = (viaje) => {
        const diffMs = new Date(viaje.fecha_salida) - new Date();
        return diffMs > 60 * 60 * 1000;
    };

    // ── Enviar notificación / incidente ──────────────────────────────────────
    const handleEnviarNotificacion = (e) => {
        e.preventDefault();
        setNotifEnviando(true);
        setNotifResultado(null);

        const viaje = viajes.find(v => v.id === notifViajeId);
        if (!viaje) { setNotifResultado({ tipo: 'error', texto: 'Selecciona un viaje.' }); setNotifEnviando(false); return; }

        const busPlaca = viaje.buses?.placa || '';
        const mensajeBase = `[${TIPOS_INCIDENTE.find(t => t.value === notifTipo)?.label || notifTipo}] ${viaje.origen} → ${viaje.destino} · Bus ${busPlaca}: ${notifDesc}`;

        crearIncidente({
            viajeId: viaje.id, busPlaca,
            conductor: perfil?.nombre_completo || perfil?.email,
            origen: viaje.origen, destino: viaje.destino,
            salida: viaje.fecha_salida, tipo: notifTipo, descripcion: notifDesc,
            sucursalId: perfil?.sucursal_id,
        });

        crearNotificacion({ tipo: notifTipo, para: 'admin', sucursalId: perfil?.sucursal_id, viajeId: viaje.id, busPlaca, mensaje: mensajeBase });
        crearNotificacion({ tipo: notifTipo, para: 'cajero', sucursalId: perfil?.sucursal_id, viajeId: viaje.id, busPlaca, mensaje: `⚠️ Viaje ${viaje.origen} → ${viaje.destino} bus ${busPlaca} reportó: ${notifTipo}` });

        setNotifEnviando(false);
        setNotifResultado({ tipo: 'ok', texto: `Notificación enviada a admins y cajeros.` });
        setNotifDesc('');
    };

    // ── Manifiesto ───────────────────────────────────────────────────────────
    const imprimirManifiesto = async (viaje) => {
        const pasajeros = pasajerosMap[viaje.id] || await getReservasViaje(viaje.id);
        const busPlaca = viaje.buses?.placa || '';
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

    const inputStyle = {
        width: '100%', boxSizing: 'border-box',
        background: '#0d1a2e', border: `1px solid ${tema.color}40`,
        color: '#f1f5f9', padding: '0.65rem 1rem',
        borderRadius: '8px', fontSize: '0.88rem', outline: 'none',
    };

    const TABS = [
        { id: 'viajes',    icon: IconViajes,    label: 'Viajes'    },
        { id: 'notificar', icon: IconNotificar,  label: 'Notificar' },
        { id: 'escanear',  icon: IconEscanear,   label: 'Escanear'  },
        { id: 'pasajeros', icon: IconPasajeros,  label: 'Pasajeros' },
    ];

    return (
        <div ref={rootRef} style={{
            position: 'relative',
            height: '100dvh', width: '100%',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            color: '#dde5f0', fontFamily: "'Rajdhani', system-ui, sans-serif",
            textTransform: 'uppercase', letterSpacing: '0.03em',
        }}>
            <style>{`
                @media (max-width: 768px) {
                    .conductor-tab-bar-top { display: none !important; }
                    .conductor-tab-bar-bottom { display: flex !important; }
                    .conductor-main-content { padding-bottom: calc(58px + env(safe-area-inset-bottom, 0px)) !important; }
                }
                @media (min-width: 769px) {
                    .conductor-tab-bar-top { display: flex !important; }
                    .conductor-tab-bar-bottom { display: none !important; }
                }
            `}</style>

            <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: tema.bg }} />

            {/* Header */}
            <header data-anim="header" style={{
                position: 'relative', zIndex: 30, flexShrink: 0,
                background: `linear-gradient(135deg, ${empresaColor}dd 0%, ${empresaColor}b3 60%, ${(empresaTema?.secondary || empresaColor)}99 100%)`,
                backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                borderBottom: '1px solid rgba(255,255,255,0.15)',
            }}>
                <div style={{
                    padding: '0.22rem 0.75rem',
                    background: 'rgba(0,0,0,0.25)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <div style={{ fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.62rem', color: '#ffffff', letterSpacing: '0.04em' }}>
                            {sucursalNombre}
                        </span>
                        <span style={{ fontSize: '0.55rem', color: `${empresaTextColor}b3`, fontWeight: 500, letterSpacing: '0.02em', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '0.45rem' }}>
                            Chofer: {perfil?.nombre_completo || 'Conductor'}
                        </span>
                    </div>
                    <div style={{ fontSize: '0.5rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem', letterSpacing: '0.05em' }}>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                        ACTIVO
                    </div>
                </div>

                <div style={{ padding: '0.45rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '7px', flexShrink: 0, background: 'rgba(0,0,0,0.3)', border: `1.2px solid ${empresaTema?.secondary ? `${empresaTema.secondary}60` : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '2px' }}>
                        <FragmentoDept deptNombre={deptNombre} color={empresaTextColor} size={22} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.15)', borderRadius: '7px', padding: '0.2rem 0.65rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.92rem', fontWeight: 700, color: empresaTextColor, lineHeight: 1.1 }}>
                            {horaActual.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                        </div>
                        <div style={{ fontSize: '0.52rem', color: `${empresaTextColor}a0`, fontWeight: 600, letterSpacing: '0.04em', marginTop: '0.05rem', fontFamily: "'Outfit', sans-serif" }}>
                            {horaActual.toLocaleDateString('es-BO', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()}
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <button onClick={() => navigate('/')} title="Volver a Inicio" style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: empresaTextColor, padding: '0.38rem', borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}>
                            <IconHome color={empresaTextColor} size={16} />
                        </button>
                        <button onClick={handleLogout} title="Cerrar Sesión" style={{ background: 'rgba(239,68,68,0.15)', border: 'none', color: '#fca5a5', padding: '0.38rem', borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.querySelector('svg').setAttribute('stroke', '#ffffff'); }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.querySelector('svg').setAttribute('stroke', '#fca5a5'); }}>
                            <IconLogout color="#fca5a5" size={16} />
                        </button>
                    </div>
                </div>

                <div className="conductor-tab-bar-top" style={{ display: 'flex', gap: '0.4rem', marginTop: '0.65rem', background: 'rgba(0,0,0,0.25)', borderRadius: '9px', padding: '0.25rem' }}>
                    {TABS.map(t => {
                        const activo = tab === t.id;
                        const iconColor = activo ? '#ffffff' : 'rgba(255,255,255,0.45)';
                        return (
                            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.55rem 0', borderRadius: '6px', border: 'none', background: activo ? empresaColor : 'transparent', color: activo ? '#ffffff' : 'rgba(255,255,255,0.55)', fontWeight: activo ? 700 : 500, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: "'Outfit', sans-serif", letterSpacing: '0.04em' }}>
                                <t.icon color={iconColor} size={16} />
                                <span>{t.label}</span>
                            </button>
                        );
                    })}
                </div>
            </header>

            {/* Main */}
            <main className="conductor-main-content" style={{ flex: 1, position: 'relative', zIndex: 1, padding: '1rem', overflowY: 'auto' }}>
                <div>

                {/* ── Tab Viajes ── */}
                {tab === 'viajes' && (
                    <div>
                        {cargando && (
                            <div style={{ textAlign: 'center', color: '#475569', padding: '3.5rem 2rem' }}>
                                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
                                Cargando viajes...
                            </div>
                        )}
                        {!cargando && !tripulacionId && (
                            <div style={{ textAlign: 'center', color: '#f59e0b', padding: '3.5rem 2rem', background: '#0d1a2e', borderRadius: '14px', border: '1px solid #92400e' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
                                No se encontró registro de tripulación para este usuario.
                            </div>
                        )}
                        {!cargando && tripulacionId && viajes.length === 0 && (
                            <div style={{ textAlign: 'center', color: '#475569', padding: '3.5rem 2rem', background: '#0d1a2e', borderRadius: '14px', border: '1px solid #1e293b' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚌</div>
                                Sin viajes asignados para hoy.
                            </div>
                        )}

                        {viajes.map(viaje => {
                            const busPlaca = viaje.buses?.placa || '—';
                            const pasajeros = pasajerosMap[viaje.id] || [];
                            const temprano = esTemprano(viaje);
                            return (
                                <div key={viaje.id} style={{ background: '#0d1a2e', borderRadius: '14px', marginBottom: '1.25rem', overflow: 'hidden', border: `1px solid ${viaje.estado === 'en_viaje' ? tema.color + '60' : viaje.estado === 'cancelado' ? '#7f1d1d60' : '#1e293b'}`, boxShadow: viaje.estado === 'en_viaje' ? `0 0 16px ${tema.color}20` : 'none' }}>
                                    {/* Trip header */}
                                    <div style={{ padding: '1rem 1.25rem', background: tema.bg, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f1f5f9' }}>
                                                {viaje.origen} → {viaje.destino}
                                            </div>
                                            <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                                                🚍 {busPlaca} · {new Date(viaje.fecha_salida).toLocaleString('es-BO')}
                                                {viaje.anden && <> · Andén {viaje.anden}</>}
                                            </div>
                                        </div>
                                        {badgeEstado(viaje.estado, tema.color)}
                                    </div>

                                    {/* Passenger list */}
                                    {viaje.estado !== 'cancelado' && (
                                        <div style={{ padding: '0.85rem 1.25rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
                                                    👥 {viajeActivo === viaje.id ? `${pasajeros.length} pasajeros` : 'Pasajeros'}
                                                </span>
                                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                    <button onClick={() => setViajeActivo(viajeActivo === viaje.id ? null : viaje.id)} style={{ background: `${tema.color}15`, border: `1px solid ${tema.color}30`, color: tema.acento, padding: '0.3rem 0.65rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.73rem' }}>
                                                        {viajeActivo === viaje.id ? '▲ Ocultar' : '▼ Lista'}
                                                    </button>
                                                    <button onClick={() => imprimirManifiesto(viaje)} style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #065f46', color: '#6ee7b7', padding: '0.3rem 0.65rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.73rem' }}>🖨️</button>
                                                </div>
                                            </div>

                                            {viajeActivo === viaje.id && (
                                                <>
                                                    <input type="text" placeholder="Buscar por nombre o CI..."
                                                        value={busquedaPasajero} onChange={e => setBusquedaPasajero(e.target.value)}
                                                        style={{ ...inputStyle, marginBottom: '0.65rem', fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
                                                    />
                                                    {pasajeros.length === 0 ? (
                                                        <div style={{ color: '#475569', fontSize: '0.82rem', textAlign: 'center', padding: '1rem' }}>Sin pasajeros registrados.</div>
                                                    ) : (
                                                        <div style={{ overflowX: 'auto' }}>
                                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                                                <thead>
                                                                    <tr style={{ borderBottom: `1px solid ${tema.color}20` }}>
                                                                        {['Asiento', 'Nombre', 'CI', 'Tel'].map(h => (
                                                                            <th key={h} style={{ textAlign: 'left', padding: '0.4rem', color: '#475569', fontWeight: 500 }}>{h}</th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {pasajeros.filter(p =>
                                                                        !busquedaPasajero ||
                                                                        p.nombre.toLowerCase().includes(busquedaPasajero.toLowerCase()) ||
                                                                        p.ci.includes(busquedaPasajero)
                                                                    ).map((p, i) => (
                                                                        <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                                                                            <td style={{ padding: '0.45rem 0.4rem', color: tema.acento, fontWeight: 700 }}>{p.asiento}</td>
                                                                            <td style={{ padding: '0.45rem 0.4rem', color: '#f1f5f9' }}>{p.nombre}</td>
                                                                            <td style={{ padding: '0.45rem 0.4rem', color: '#94a3b8' }}>{p.ci}</td>
                                                                            <td style={{ padding: '0.45rem 0.4rem', color: '#64748b' }}>{p.telefono}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Controls */}
                                    <div style={{ padding: '0.85rem 1.25rem', background: tema.bg, borderTop: '1px solid #1e293b', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                                        {esConductor ? (
                                            <>
                                                {(viaje.estado === 'programado' || viaje.estado === 'autorizado') && (
                                                    <>
                                                        <button onClick={() => cambiarEstado(viaje.id, 'en_viaje')} style={{
                                                            flex: 1, padding: '0.7rem',
                                                            background: temprano ? '#d97706' : empresaColor,
                                                            color: '#fff', border: 'none', borderRadius: '8px',
                                                            fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', minWidth: 120,
                                                        }}>
                                                            {temprano ? '⚡ Inicio anticipado' : '🚀 Iniciar viaje'}
                                                        </button>
                                                        {confirmandoCancelar === viaje.id ? (
                                                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flex: 1 }}>
                                                                <span style={{ color: '#fca5a5', fontSize: '0.75rem' }}>¿Confirmar?</span>
                                                                <button onClick={() => handleCancelar(viaje.id)} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.45rem 0.7rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}>Sí</button>
                                                                <button onClick={() => setConfirmandoCancelar(null)} style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: '6px', padding: '0.45rem 0.7rem', cursor: 'pointer', fontSize: '0.75rem' }}>No</button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => setConfirmandoCancelar(viaje.id)} style={{ padding: '0.7rem 0.9rem', background: 'rgba(220,38,38,0.08)', border: '1px solid #7f1d1d', color: '#fca5a5', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>❌ Cancelar</button>
                                                        )}
                                                    </>
                                                )}
                                                {viaje.estado === 'en_viaje' && (
                                                    <button onClick={() => cambiarEstado(viaje.id, 'completado')} style={{ flex: 1, padding: '0.7rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>🏁 Finalizar viaje</button>
                                                )}
                                                {viaje.estado === 'completado' && (
                                                    <div style={{ flex: 1, textAlign: 'center', color: '#475569', padding: '0.7rem', fontSize: '0.85rem' }}>
                                                        Viaje completado ✅
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div style={{ color: '#475569', fontSize: '0.78rem', padding: '0.5rem 0' }}>
                                                Solo el conductor puede cambiar el estado del viaje.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Tab Notificar ── */}
                {tab === 'notificar' && (
                    <div>
                        <div style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600, marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Enviar notificación de incidente
                        </div>

                        {notifResultado && (
                            <div style={{ padding: '0.85rem 1rem', marginBottom: '1.25rem', borderRadius: '10px', background: notifResultado.tipo === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${notifResultado.tipo === 'ok' ? '#065f46' : '#7f1d1d'}`, color: notifResultado.tipo === 'ok' ? '#6ee7b7' : '#fca5a5', fontSize: '0.85rem' }}>
                                {notifResultado.texto}
                            </div>
                        )}

                        <form onSubmit={handleEnviarNotificacion} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.73rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Viaje afectado</label>
                                <select value={notifViajeId} onChange={e => setNotifViajeId(e.target.value)} required style={inputStyle}>
                                    <option value="">— Selecciona un viaje —</option>
                                    {viajes.filter(v => v.estado !== 'completado' && v.estado !== 'cancelado').map(v => (
                                        <option key={v.id} value={v.id}>{v.origen} → {v.destino} · {new Date(v.fecha_salida).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.73rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Tipo de incidente</label>
                                <select value={notifTipo} onChange={e => setNotifTipo(e.target.value)} style={inputStyle}>
                                    {TIPOS_INCIDENTE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.73rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Descripción del incidente</label>
                                <textarea value={notifDesc} onChange={e => setNotifDesc(e.target.value)} required rows={4} placeholder="Describe brevemente lo que ocurrió..."
                                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                                />
                            </div>

                            <div style={{ background: '#0d1a2e', border: `1px solid ${tema.color}20`, borderRadius: '10px', padding: '0.85rem 1rem' }}>
                                <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Se notificará a:</div>
                                {[
                                    { icon: '🛠️', label: 'Administradores', desc: 'Registro permanente en sección Incidentes' },
                                    { icon: '🎫', label: 'Cajeros de tu sucursal', desc: 'Alerta del viaje y bus afectado' },
                                ].map(item => (
                                    <div key={item.icon} style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.4rem', alignItems: 'flex-start' }}>
                                        <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                                        <div>
                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>{item.label}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#475569' }}>{item.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button type="submit" disabled={notifEnviando || !notifViajeId || !notifDesc.trim()} style={{ background: notifEnviando || !notifViajeId || !notifDesc.trim() ? '#1e293b' : '#dc2626', color: notifEnviando || !notifViajeId || !notifDesc.trim() ? '#475569' : '#fff', border: 'none', borderRadius: '10px', padding: '0.9rem', fontWeight: 700, fontSize: '0.95rem', cursor: notifEnviando || !notifViajeId || !notifDesc.trim() ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                                🔔 {notifEnviando ? 'Enviando...' : 'Enviar notificación'}
                            </button>
                        </form>
                    </div>
                )}

                {/* ── Tab Escanear QR ── */}
                {tab === 'escanear' && (
                    <div>
                        <div style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Validar abordaje con QR
                        </div>

                        <select value={scanViajeId} onChange={e => setScanViajeId(e.target.value)} style={{ ...inputStyle, marginBottom: '1rem' }}>
                            <option value="">— Todos los viajes —</option>
                            {viajes.filter(v => v.estado !== 'completado' && v.estado !== 'cancelado').map(v => (
                                <option key={v.id} value={v.id}>{v.origen} → {v.destino} · {v.buses?.placa}</option>
                            ))}
                        </select>

                        {scanResultado && (
                            <div style={{ padding: '1rem', marginBottom: '1rem', borderRadius: '12px', textAlign: 'center', background: 'rgba(59,130,246,0.12)', border: '1px solid #1e40af', color: '#93c5fd' }}>
                                <div style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>📷</div>
                                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{scanResultado.mensaje}</div>
                                <button onClick={reanudarScanner} style={{ marginTop: '0.85rem', background: tema.color, color: '#fff', border: 'none', borderRadius: '8px', padding: '0.55rem 1.25rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>
                                    📷 Escanear siguiente
                                </button>
                            </div>
                        )}

                        <div style={{ background: '#0d1a2e', borderRadius: '14px', border: `1px solid ${tema.color}25`, overflow: 'hidden', marginBottom: '1.25rem' }}>
                            <div style={{ padding: '0.75rem 1rem', background: tema.bg, borderBottom: `1px solid ${tema.color}20`, fontSize: '0.75rem', color: '#64748b' }}>
                                📷 Apunta la cámara al código QR del boleto
                            </div>
                            <div id="qr-lector-conductor" style={{ padding: '0.5rem' }} />
                        </div>
                    </div>
                )}

                {/* ── Tab Pasajeros ── */}
                {tab === 'pasajeros' && (
                    <div>
                        <div style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Lista de pasajeros por viaje
                        </div>

                        <select value={listaViajeId} onChange={e => setListaViajeId(e.target.value)} style={{ ...inputStyle, marginBottom: '1.25rem' }}>
                            <option value="">— Selecciona un viaje —</option>
                            {viajes.map(v => (
                                <option key={v.id} value={v.id}>
                                    {v.origen} → {v.destino} · {new Date(v.fecha_salida).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false })} · {v.buses?.placa}
                                    {v.estado === 'en_viaje' ? ' 🚌' : v.estado === 'completado' ? ' ✅' : ''}
                                </option>
                            ))}
                        </select>

                        {listaViajeId && (() => {
                            const v = viajes.find(x => x.id === listaViajeId);
                            const total = listaPasajeros.length;
                            return (
                                <div>
                                    {v && (
                                        <div style={{ background: '#0d1a2e', border: `1px solid ${tema.color}25`, borderRadius: '10px', padding: '0.85rem 1.1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.92rem' }}>{v.origen} → {v.destino}</div>
                                                <div style={{ color: '#64748b', fontSize: '0.73rem', marginTop: '0.15rem' }}>🚍 {v.buses?.placa} · {new Date(v.fecha_salida).toLocaleString('es-BO')}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: tema.acento }}>{total}</div>
                                                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>pasajeros</div>
                                            </div>
                                        </div>
                                    )}

                                    {listaPasajeros.length === 0 ? (
                                        <div style={{ textAlign: 'center', color: '#475569', padding: '2.5rem', background: '#0d1a2e', borderRadius: '10px', border: '1px solid #1e293b' }}>
                                            Sin pasajeros registrados para este viaje.
                                        </div>
                                    ) : (
                                        <div style={{ background: '#0d1a2e', borderRadius: '12px', border: '1px solid #1e293b', overflow: 'hidden' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr auto', gap: '0.5rem', padding: '0.55rem 1rem', background: tema.bg, borderBottom: `1px solid ${tema.color}15` }}>
                                                {['Asiento', 'Pasajero', 'CI'].map(h => (
                                                    <div key={h} style={{ fontSize: '0.65rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                                                ))}
                                            </div>
                                            {listaPasajeros.map((p, i) => (
                                                <div key={i} style={{ display: 'grid', gridTemplateColumns: '52px 1fr auto', gap: '0.5rem', padding: '0.65rem 1rem', borderBottom: '1px solid #1e293b', background: i % 2 === 0 ? 'transparent' : 'rgba(15,23,42,0.3)', alignItems: 'center' }}>
                                                    <div style={{ color: tema.acento, fontWeight: 800, fontSize: '0.88rem' }}>{p.asiento}</div>
                                                    <div>
                                                        <div style={{ color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 500 }}>{p.nombre}</div>
                                                        <div style={{ color: '#475569', fontSize: '0.7rem' }}>{p.telefono}</div>
                                                    </div>
                                                    <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{p.ci}</div>
                                                </div>
                                            ))}
                                            <div style={{ padding: '0.65rem 1rem', background: tema.bg, borderTop: `1px solid ${tema.color}15`, fontSize: '0.75rem', color: '#64748b' }}>
                                                Total: <strong style={{ color: '#f1f5f9' }}>{total}</strong> pasajero(s)
                                            </div>
                                        </div>
                                    )}

                                    <button onClick={() => getReservasViaje(listaViajeId).then(setListaPasajeros)} style={{ marginTop: '0.85rem', width: '100%', background: `${tema.color}12`, border: `1px solid ${tema.color}30`, color: tema.acento, borderRadius: '8px', padding: '0.6rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                                        🔄 Actualizar lista
                                    </button>
                                </div>
                            );
                        })()}

                        {!listaViajeId && (
                            <div style={{ textAlign: 'center', color: '#475569', padding: '3rem 2rem', background: '#0d1a2e', borderRadius: '12px', border: '1px solid #1e293b' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
                                Selecciona un viaje para ver la lista.
                            </div>
                        )}
                    </div>
                )}

                </div>
            </main>

            {/* Bottom Nav Bar */}
            <div className="conductor-tab-bar-bottom" style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40,
                background: 'linear-gradient(180deg, #020203 0%, #2b3542 100%)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                borderTop: '1px solid rgba(255,255,255,0.12)',
                display: 'none', justifyContent: 'space-around', alignItems: 'center',
                padding: '0.4rem 0.4rem calc(0.4rem + env(safe-area-inset-bottom, 0px)) 0.4rem',
            }}>
                {TABS.map(t => {
                    const activo = tab === t.id;
                    const itemColor = activo ? (empresaTextColor || '#ffffff') : '#64748b';
                    return (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            background: activo ? empresaColor : 'transparent', border: 'none', borderRadius: '10px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            gap: '0.1rem', flex: 1, padding: '0.44rem 0.2rem', margin: '0 0.2rem', cursor: 'pointer',
                            color: itemColor, boxShadow: activo ? `0 3px 10px ${empresaColor}30` : 'none',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}>
                            <t.icon color={itemColor} size={17} />
                            <span style={{ fontSize: '0.53rem', fontWeight: activo ? 800 : 500, color: itemColor, fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '0.08rem' }}>{t.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default PanelConductor;
