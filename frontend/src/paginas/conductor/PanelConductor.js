import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS, ciudadADepartamento } from '../../contextos/DepartamentoContext';
import { SUCURSALES_MOCK, obtenerViajesSucursal } from '../../data/mockDiscoveryDB';
import {
    obtenerEstadoViaje, actualizarEstadoViaje, cancelarViaje,
    obtenerReservas, validarBoleto, marcarAbordado,
    crearNotificacion, crearIncidente, registrarViajeFinalizados,
    obtenerBoletosViaje,
} from '../../data/mockStorage';
import { actualizarPerfilStaff } from '../../data/mockAuthDB';
import FragmentoDept from '../../componentes/FragmentoDept';
import gsap from 'gsap';

const ICONOS_EMPRESAS = {
    andino: '/iconos/andino.svg', atlas: '/iconos/atlas.svg',
    bolivar: '/iconos/bolivar.svg', copacabana: '/iconos/copacabana.svg',
    cosmos: '/iconos/cosmos.svg', dorado: '/iconos/dorado.svg',
    emperador: '/iconos/emperador.svg', illimani: '/iconos/illimani.svg',
    imperal: '/iconos/imperal.svg', naser: '/iconos/naser.svg',
};
const getIconoEmpresa = (nombre) => {
    if (!nombre) return null;
    const n = nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const clave = Object.keys(ICONOS_EMPRESAS).find(k => n.includes(k));
    return clave ? ICONOS_EMPRESAS[clave] : null;
};

const TIPOS_INCIDENTE = [
    { value: 'retraso', label: '⏰ Retraso' },
    { value: 'mecanico', label: '🔧 Falla mecánica' },
    { value: 'percance', label: '⚠️ Percance en ruta' },
    { value: 'accidente', label: '🚨 Accidente' },
    { value: 'otro', label: '📋 Otro' },
];

const badgeEstado = (estado, color) => {
    const m = {
        programado: { bg: '#1e3a8a22', c: '#93c5fd', label: '📅 Programado' },
        en_ruta: { bg: color + '22', c: color, label: '🚌 En Ruta' },
        finalizado: { bg: '#37415122', c: '#9ca3af', label: '✅ Finalizado' },
        cancelado: { bg: '#7f1d1d22', c: '#fca5a5', label: '❌ Cancelado' },
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
    const { perfil, logout, actualizarPerfil } = useAuth();
    const rootRef = useRef(null);
    const scannerRef = useRef(null);

    const sucursalNombre = perfil?.sucursal_nombre || 'Mi Sucursal';
    const sucursalLogo = perfil?.sucursal_logo || '🚌';
    const deptNombre = perfil?.departamento || 'La Paz';
    const tema = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];
    const sucursalData = SUCURSALES_MOCK.find(s => s.nombre === sucursalNombre);
    const empresaColor = sucursalData?.colorAccent || tema.color;

    // conductor = all controls; ayudante = solo scan + lista + notif
    const esConductor = perfil?.rol === 'conductor' || perfil?.rol === 'admin_sucursal';

    const [tab, setTab] = useState('viajes');
    const [viajes, setViajes] = useState([]);
    const [viajeActivo, setViajeActivo] = useState(null);
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

    // Detecta el viaje más relevante en este momento (en_ruta > próximo programado)
    const detectarViajeActual = useCallback((lista) => {
        const enRuta = lista.find(v => v.estado === 'en_ruta');
        if (enRuta) return enRuta.id;
        const ahoraMin = new Date().getHours() * 60 + new Date().getMinutes();
        const programados = lista.filter(v => v.estado === 'programado');
        const proximos = programados.filter(v => {
            const d = new Date(v.salida);
            return d.getHours() * 60 + d.getMinutes() >= ahoraMin;
        });
        if (proximos.length > 0) return proximos[0].id;
        return programados.length > 0 ? programados[programados.length - 1].id : '';
    }, []);

    const cargarViajes = useCallback(() => {
        // Deduplicar por id (mismo viaje puede aparecer de varias sucursales mock)
        const vistos = new Set();
        const todos = SUCURSALES_MOCK
            .filter(s => !s.departamento || s.departamento === deptNombre)
            .flatMap(s => obtenerViajesSucursal(s.id))
            .filter(v => v.origen === deptNombre)
            .filter(v => { if (vistos.has(v.id)) return false; vistos.add(v.id); return true; });

        const conEstado = todos
            .map(v => {
                const reservas = obtenerReservas(v.id);
                const pasajeros = reservas.flatMap(r =>
                    r.asientos.map(asiento => ({
                        nombre: r.pasajeroNombre,
                        ci: r.pasajeroCI,
                        asiento,
                        telefono: r.pasajeroTelefono || '',
                        email: r.pasajeroEmail || '',
                    }))
                );
                return { ...v, estado: obtenerEstadoViaje(v.id), pasajeros };
            })
            // Orden cronológico: por hora del día, luego por fecha completa
            .sort((a, b) => {
                const da = new Date(a.salida), db = new Date(b.salida);
                const minA = da.getHours() * 60 + da.getMinutes();
                const minB = db.getHours() * 60 + db.getMinutes();
                if (minA !== minB) return minA - minB;
                return da - db;
            });

        setViajes(conEstado);

        // Pre-seleccionar viaje actual en tabs Notificar, Escanear, Pasajeros
        const actual = detectarViajeActual(conEstado);
        if (actual) {
            setNotifViajeId(prev => prev || actual);
            setScanViajeId(prev => prev || actual);
            setListaViajeId(prev => prev || actual);
        }
    }, [deptNombre, detectarViajeActual]);

    useEffect(() => {
        cargarViajes();
        const iv = setInterval(cargarViajes, 15000);
        return () => clearInterval(iv);
    }, [cargarViajes]);

    // Recargar lista de pasajeros con estado de abordaje al cambiar de viaje o tab
    useEffect(() => {
        if (!listaViajeId) { setListaPasajeros([]); return; }
        const boletos = obtenerBoletosViaje(listaViajeId);
        const reservas = obtenerReservas(listaViajeId);
        const lista = reservas
            .flatMap(r => r.asientos.map(asiento => {
                const boleto = boletos.find(b => b.asiento === asiento && b.reservaId === r.id);
                return {
                    nombre: r.pasajeroNombre,
                    ci: r.pasajeroCI,
                    asiento,
                    telefono: r.pasajeroTelefono || '',
                    abordado: boleto?.abordado ?? false,
                    horaAbordaje: boleto?.horaAbordaje || null,
                };
            }))
            .sort((a, b) => a.asiento.localeCompare(b.asiento, undefined, { numeric: true }));
        setListaPasajeros(lista);
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
                let boletoId = texto.trim();
                try {
                    const parsed = JSON.parse(boletoId);
                    if (parsed?.id) boletoId = parsed.id;
                } catch { /* plain ID fallback */ }

                const boleto = validarBoleto(boletoId) || validarBoleto(boletoId.toUpperCase());
                if (!boleto) {
                    setScanResultado({ tipo: 'error', mensaje: 'Boleto no encontrado o inválido.' });
                } else if (boleto.abordado) {
                    setScanResultado({ tipo: 'ya', boleto, mensaje: `${boleto.pasajeroNombre} — ya abordó (${boleto.asiento})` });
                } else {
                    marcarAbordado(boleto.id);
                    setScanResultado({ tipo: 'ok', boleto, mensaje: `✅ ${boleto.pasajeroNombre} · Asiento ${boleto.asiento}` });
                    cargarViajes();
                }
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
    }, [tab, cargarViajes]);

    const reanudarScanner = () => {
        setScanResultado(null);
        if (scannerRef.current) {
            try { scannerRef.current.resume(); setScannerActivo(true); } catch { /* ignore */ }
        }
    };

    // ── Cambios de estado del viaje ──────────────────────────────────────────
    const cambiarEstado = (viajeId, nuevoEstado, viaje) => {
        actualizarEstadoViaje(viajeId, nuevoEstado);
        setViajes(prev => prev.map(v => v.id === viajeId ? { ...v, estado: nuevoEstado } : v));

        if (nuevoEstado === 'finalizado') {
            registrarViajeFinalizados({
                viajeId, busPlaca: viaje.busPlaca,
                origen: viaje.origen, destino: viaje.destino, salida: viaje.salida,
                sucursalId: perfil?.sucursal_id,
                pasajeros: viaje.pasajeros,
            });
            const nuevoDept = ciudadADepartamento(viaje.destino);
            if (nuevoDept !== deptNombre && perfil?.id) {
                actualizarPerfilStaff(perfil.id, { departamento: nuevoDept });
                if (actualizarPerfil) actualizarPerfil({ departamento: nuevoDept });
            }
        }
    };

    const handleCancelar = (viajeId) => {
        cancelarViaje(viajeId);
        setViajes(prev => prev.map(v => v.id === viajeId ? { ...v, estado: 'cancelado' } : v));
        setConfirmandoCancelar(null);
    };

    // ── Enviar notificación / incidente ──────────────────────────────────────
    const handleEnviarNotificacion = (e) => {
        e.preventDefault();
        setNotifEnviando(true);
        setNotifResultado(null);

        const viaje = viajes.find(v => v.id === notifViajeId);
        if (!viaje) { setNotifResultado({ tipo: 'error', texto: 'Selecciona un viaje.' }); setNotifEnviando(false); return; }

        const mensajeBase = `[${TIPOS_INCIDENTE.find(t => t.value === notifTipo)?.label || notifTipo}] ${viaje.origen} → ${viaje.destino} · Bus ${viaje.busPlaca}: ${notifDesc}`;

        // Registro de incidente (para admin)
        crearIncidente({
            viajeId: viaje.id, busPlaca: viaje.busPlaca,
            conductor: perfil?.nombre_completo || perfil?.email,
            ayudante: '', origen: viaje.origen, destino: viaje.destino,
            salida: viaje.salida, tipo: notifTipo, descripcion: notifDesc,
            sucursalId: perfil?.sucursal_id,
        });

        // Notificación para admins
        crearNotificacion({ tipo: notifTipo, para: 'admin', sucursalId: perfil?.sucursal_id, viajeId: viaje.id, busPlaca: viaje.busPlaca, mensaje: mensajeBase });

        // Notificación para cajeros (misma sucursal)
        crearNotificacion({ tipo: notifTipo, para: 'cajero', sucursalId: perfil?.sucursal_id, viajeId: viaje.id, busPlaca: viaje.busPlaca, mensaje: `⚠️ Viaje ${viaje.origen} → ${viaje.destino} bus ${viaje.busPlaca} reportó: ${notifTipo}` });

        // Notificaciones para clientes con reserva
        const reservas = obtenerReservas(viaje.id);
        const cis = [...new Set(reservas.map(r => r.pasajeroCI).filter(Boolean))];
        cis.forEach(ci => {
            crearNotificacion({
                tipo: notifTipo, para: 'cliente', clienteCI: ci,
                viajeId: viaje.id, busPlaca: viaje.busPlaca,
                mensaje: `Tu viaje ${viaje.origen} → ${viaje.destino} (bus ${viaje.busPlaca}) tiene una novedad: ${notifDesc}. Disculpa los inconvenientes.`,
            });
        });

        setNotifEnviando(false);
        setNotifResultado({ tipo: 'ok', texto: `Notificación enviada a admins, cajeros y ${cis.length} cliente(s).` });
        setNotifDesc('');
    };

    // ── Manifiesto ───────────────────────────────────────────────────────────
    const imprimirManifiesto = (viaje) => {
        const html = `<html><head><title>Manifiesto</title>
        <style>body{font-family:monospace;font-size:12px;margin:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #000;padding:4px 8px}th{background:#eee}</style>
        </head><body>
        <h2 style="text-align:center">MANIFIESTO — ${viaje.origen} → ${viaje.destino}</h2>
        <p><strong>Bus:</strong> ${viaje.busPlaca} · <strong>Salida:</strong> ${new Date(viaje.salida).toLocaleString('es-BO')}</p>
        <table><thead><tr><th>Asiento</th><th>Nombre</th><th>CI</th><th>Teléfono</th></tr></thead>
        <tbody>${viaje.pasajeros.map(p => `<tr><td>${p.asiento}</td><td>${p.nombre}</td><td>${p.ci}</td><td>${p.telefono || '—'}</td></tr>`).join('')}</tbody>
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
        { id: 'viajes', icon: '🚌', label: 'Viajes' },
        { id: 'notificar', icon: '🔔', label: 'Notificar' },
        { id: 'escanear', icon: '📷', label: 'Escanear' },
        { id: 'pasajeros', icon: '👥', label: 'Pasajeros' },
    ];

    return (
        <div ref={rootRef} style={{ background: tema.bg, minHeight: '100vh', color: '#dde5f0', fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 680, margin: '0 auto' }}>

            {/* Header */}
            <header data-anim="header" style={{
                background: `linear-gradient(135deg, ${empresaColor}dd 0%, ${empresaColor}88 60%, ${tema.bg}cc 100%)`,
                borderBottom: `2px solid ${tema.color}50`,
                padding: '0.75rem 1.25rem',
                position: 'sticky', top: 0, zIndex: 30,
                backdropFilter: 'blur(12px)',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            {/* Fragmento departamento */}
                            <div style={{
                                width: 56, height: 56, borderRadius: '10px', flexShrink: 0,
                                background: tema.bg, border: `1px solid ${tema.color}35`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                overflow: 'hidden', padding: '3px',
                            }}>
                                <FragmentoDept deptNombre={deptNombre} color={tema.color} size={48} />
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {/* Reloj */}
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700, color: tema.acento, lineHeight: 1 }}>
                                {horaActual.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                            </div>
                            <div style={{ fontSize: '0.58rem', color: '#475569' }}>
                                {horaActual.toLocaleDateString('es-BO', { weekday: 'short', day: '2-digit', month: 'short' })}
                            </div>
                        </div>
                        <button onClick={handleLogout} style={{
                            background: tema.bg, border: `1px solid ${tema.color}40`,
                            color: '#94a3b8', padding: '0.35rem 0.75rem', borderRadius: '7px',
                            cursor: 'pointer', fontSize: '0.75rem',
                        }}>Salir</button>
                    </div>
                </div>

                {/* Tab bar */}
                <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.75rem' }}>
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: '0.4rem', padding: '0.55rem 0', borderRadius: '8px', border: 'none',
                            background: tab === t.id ? empresaColor : tema.bg,
                            color: tab === t.id ? '#fff' : '#94a3b8',
                            fontWeight: tab === t.id ? 700 : 400, fontSize: '0.82rem',
                            cursor: 'pointer', transition: 'all 0.15s',
                            outline: tab === t.id ? `1px solid ${tema.color}60` : '1px solid transparent',
                        }}>
                            <span>{t.icon}</span>
                            <span>{t.label}</span>
                        </button>
                    ))}
                </div>
            </header>

            <main style={{
                padding: '1.25rem',
                position: 'relative',
                ...(getIconoEmpresa(sucursalNombre) ? {
                    backgroundImage: `url(${getIconoEmpresa(sucursalNombre)})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    backgroundAttachment: 'fixed',
                } : {}),
            }}>
                {getIconoEmpresa(sucursalNombre) && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 0,
                        background: 'rgba(5,8,15,0.82)',
                        backdropFilter: 'blur(6px)',
                        WebkitBackdropFilter: 'blur(6px)',
                        pointerEvents: 'none',
                    }} />
                )}
                <div style={{ position: 'relative', zIndex: 1 }}>

                {/* ── Tab Viajes ── */}
                {tab === 'viajes' && (
                    <div>
                        {viajes.length === 0 && (
                            <div style={{ textAlign: 'center', color: '#475569', padding: '3.5rem 2rem', background: '#0d1a2e', borderRadius: '14px', border: '1px solid #1e293b' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚌</div>
                                No hay viajes asignados desde {deptNombre}.
                            </div>
                        )}

                        {viajes.map(viaje => (
                            <div key={viaje.id} style={{
                                background: '#0d1a2e', borderRadius: '14px', marginBottom: '1.25rem', overflow: 'hidden',
                                border: `1px solid ${viaje.estado === 'en_ruta' ? tema.color + '60' : viaje.estado === 'cancelado' ? '#7f1d1d60' : '#1e293b'}`,
                                boxShadow: viaje.estado === 'en_ruta' ? `0 0 16px ${tema.color}20` : 'none',
                            }}>
                                {/* Trip header */}
                                <div style={{ padding: '1rem 1.25rem', background: tema.bg, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f1f5f9' }}>
                                            {viaje.origen} → {viaje.destino}
                                        </div>
                                        <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                                            🚍 {viaje.busPlaca} · {new Date(viaje.salida).toLocaleString('es-BO')}
                                        </div>
                                    </div>
                                    {badgeEstado(viaje.estado, tema.color)}
                                </div>

                                {/* Passenger list */}
                                {viaje.estado !== 'cancelado' && (
                                    <div style={{ padding: '0.85rem 1.25rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                                            <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
                                                👥 {viaje.pasajeros.length} pasajeros
                                            </span>
                                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                <button onClick={() => setViajeActivo(viajeActivo === viaje.id ? null : viaje.id)} style={{
                                                    background: `${tema.color}15`, border: `1px solid ${tema.color}30`,
                                                    color: tema.acento, padding: '0.3rem 0.65rem', borderRadius: '6px',
                                                    cursor: 'pointer', fontSize: '0.73rem',
                                                }}>
                                                    {viajeActivo === viaje.id ? '▲ Ocultar' : '▼ Lista'}
                                                </button>
                                                <button onClick={() => imprimirManifiesto(viaje)} style={{
                                                    background: 'rgba(16,185,129,0.1)', border: '1px solid #065f46',
                                                    color: '#6ee7b7', padding: '0.3rem 0.65rem', borderRadius: '6px',
                                                    cursor: 'pointer', fontSize: '0.73rem',
                                                }}>🖨️</button>
                                            </div>
                                        </div>

                                        {viajeActivo === viaje.id && (
                                            <>
                                                <input
                                                    type="text" placeholder="Buscar por nombre o CI..."
                                                    value={busquedaPasajero} onChange={e => setBusquedaPasajero(e.target.value)}
                                                    style={{ ...inputStyle, marginBottom: '0.65rem', fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
                                                />
                                                {viaje.pasajeros.length === 0 ? (
                                                    <div style={{ color: '#475569', fontSize: '0.82rem', textAlign: 'center', padding: '1rem' }}>Sin pasajeros registrados aún.</div>
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
                                                                {viaje.pasajeros.filter(p =>
                                                                    !busquedaPasajero ||
                                                                    p.nombre.toLowerCase().includes(busquedaPasajero.toLowerCase()) ||
                                                                    p.ci.includes(busquedaPasajero)
                                                                ).map((p, i) => (
                                                                    <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                                                                        <td style={{ padding: '0.45rem 0.4rem', color: tema.acento, fontWeight: 700 }}>{p.asiento}</td>
                                                                        <td style={{ padding: '0.45rem 0.4rem', color: '#f1f5f9' }}>{p.nombre}</td>
                                                                        <td style={{ padding: '0.45rem 0.4rem', color: '#94a3b8' }}>{p.ci}</td>
                                                                        <td style={{ padding: '0.45rem 0.4rem', color: '#64748b' }}>{p.telefono || '—'}</td>
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

                                {/* Controls — solo conductor */}
                                <div style={{ padding: '0.85rem 1.25rem', background: tema.bg, borderTop: '1px solid #1e293b', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                                    {esConductor ? (
                                        <>
                                            {viaje.estado === 'programado' && (
                                                <>
                                                    <button onClick={() => cambiarEstado(viaje.id, 'en_ruta', viaje)} style={{
                                                        flex: 1, padding: '0.7rem', background: tema.color, color: '#fff',
                                                        border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', minWidth: 120,
                                                    }}>🚀 Iniciar viaje</button>
                                                    {confirmandoCancelar === viaje.id ? (
                                                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flex: 1 }}>
                                                            <span style={{ color: '#fca5a5', fontSize: '0.75rem' }}>¿Confirmar?</span>
                                                            <button onClick={() => handleCancelar(viaje.id)} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.45rem 0.7rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}>Sí</button>
                                                            <button onClick={() => setConfirmandoCancelar(null)} style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: '6px', padding: '0.45rem 0.7rem', cursor: 'pointer', fontSize: '0.75rem' }}>No</button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => setConfirmandoCancelar(viaje.id)} style={{
                                                            padding: '0.7rem 0.9rem', background: 'rgba(220,38,38,0.08)',
                                                            border: '1px solid #7f1d1d', color: '#fca5a5', borderRadius: '8px',
                                                            fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem',
                                                        }}>❌ Cancelar</button>
                                                    )}
                                                </>
                                            )}

                                            {viaje.estado === 'en_ruta' && (
                                                <button onClick={() => cambiarEstado(viaje.id, 'finalizado', viaje)} style={{
                                                    flex: 1, padding: '0.7rem', background: '#dc2626', color: '#fff',
                                                    border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem',
                                                }}>🏁 Finalizar viaje</button>
                                            )}

                                            {viaje.estado === 'finalizado' && (
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
                        ))}
                    </div>
                )}

                {/* ── Tab Notificar ── */}
                {tab === 'notificar' && (
                    <div>
                        <div style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600, marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Enviar notificación de incidente
                        </div>

                        {notifResultado && (
                            <div style={{
                                padding: '0.85rem 1rem', marginBottom: '1.25rem', borderRadius: '10px',
                                background: notifResultado.tipo === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                border: `1px solid ${notifResultado.tipo === 'ok' ? '#065f46' : '#7f1d1d'}`,
                                color: notifResultado.tipo === 'ok' ? '#6ee7b7' : '#fca5a5', fontSize: '0.85rem',
                            }}>
                                {notifResultado.texto}
                            </div>
                        )}

                        <form onSubmit={handleEnviarNotificacion} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.73rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Viaje afectado</label>
                                <select value={notifViajeId} onChange={e => setNotifViajeId(e.target.value)} required style={inputStyle}>
                                    <option value="">— Selecciona un viaje —</option>
                                    {viajes.filter(v => v.estado !== 'finalizado' && v.estado !== 'cancelado').map(v => (
                                        <option key={v.id} value={v.id}>{v.origen} → {v.destino} · {new Date(v.salida).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}</option>
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
                                <textarea
                                    value={notifDesc} onChange={e => setNotifDesc(e.target.value)}
                                    required rows={4} placeholder="Describe brevemente lo que ocurrió..."
                                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                                />
                            </div>

                            {/* Info a quiénes se notifica */}
                            <div style={{ background: '#0d1a2e', border: `1px solid ${tema.color}20`, borderRadius: '10px', padding: '0.85rem 1rem' }}>
                                <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Se notificará a:</div>
                                {[
                                    { icon: '🛠️', label: 'Administradores', desc: 'Registro permanente en sección Incidentes' },
                                    { icon: '🎫', label: 'Cajeros de tu sucursal', desc: 'Alerta del viaje y bus afectado' },
                                    { icon: '👤', label: 'Clientes con reserva', desc: 'Notificación en app + correo (simulado)' },
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

                            <button type="submit" disabled={notifEnviando || !notifViajeId || !notifDesc.trim()} style={{
                                background: notifEnviando || !notifViajeId || !notifDesc.trim() ? '#1e293b' : '#dc2626',
                                color: notifEnviando || !notifViajeId || !notifDesc.trim() ? '#475569' : '#fff',
                                border: 'none', borderRadius: '10px', padding: '0.9rem',
                                fontWeight: 700, fontSize: '0.95rem',
                                cursor: notifEnviando || !notifViajeId || !notifDesc.trim() ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                            }}>
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

                        {/* Selector de viaje (opcional, para filtrar manifiesto) */}
                        <select
                            value={scanViajeId} onChange={e => setScanViajeId(e.target.value)}
                            style={{ ...inputStyle, marginBottom: '1rem' }}
                        >
                            <option value="">— Todos los viajes —</option>
                            {viajes.filter(v => v.estado !== 'finalizado' && v.estado !== 'cancelado').map(v => (
                                <option key={v.id} value={v.id}>{v.origen} → {v.destino} · {v.busPlaca}</option>
                            ))}
                        </select>

                        {/* Resultado del último escaneo */}
                        {scanResultado && (
                            <div style={{
                                padding: '1rem', marginBottom: '1rem', borderRadius: '12px', textAlign: 'center',
                                background: scanResultado.tipo === 'ok' ? 'rgba(16,185,129,0.12)' : scanResultado.tipo === 'ya' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                                border: `1px solid ${scanResultado.tipo === 'ok' ? '#065f46' : scanResultado.tipo === 'ya' ? '#92400e' : '#7f1d1d'}`,
                                color: scanResultado.tipo === 'ok' ? '#6ee7b7' : scanResultado.tipo === 'ya' ? '#fbbf24' : '#fca5a5',
                            }}>
                                <div style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>
                                    {scanResultado.tipo === 'ok' ? '✅' : scanResultado.tipo === 'ya' ? '⚠️' : '❌'}
                                </div>
                                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{scanResultado.mensaje}</div>
                                {scanResultado.boleto && (
                                    <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: '0.3rem' }}>
                                        {scanResultado.boleto.origen} → {scanResultado.boleto.destino} · {new Date(scanResultado.boleto.fechaSalida).toLocaleString('es-BO')}
                                    </div>
                                )}
                                <button onClick={reanudarScanner} style={{
                                    marginTop: '0.85rem', background: tema.color, color: '#fff', border: 'none',
                                    borderRadius: '8px', padding: '0.55rem 1.25rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                                }}>
                                    📷 Escanear siguiente
                                </button>
                            </div>
                        )}

                        {/* Contenedor del escáner */}
                        <div style={{ background: '#0d1a2e', borderRadius: '14px', border: `1px solid ${tema.color}25`, overflow: 'hidden', marginBottom: '1.25rem' }}>
                            <div style={{ padding: '0.75rem 1rem', background: tema.bg, borderBottom: `1px solid ${tema.color}20`, fontSize: '0.75rem', color: '#64748b' }}>
                                📷 Apunta la cámara al código QR del boleto
                            </div>
                            <div id="qr-lector-conductor" style={{ padding: '0.5rem' }} />
                        </div>

                        {/* Mini manifiesto del viaje seleccionado */}
                        {scanViajeId && (() => {
                            const v = viajes.find(x => x.id === scanViajeId);
                            if (!v) return null;
                            return (
                                <div style={{ background: '#0d1a2e', borderRadius: '12px', border: '1px solid #1e293b', overflow: 'hidden' }}>
                                    <div style={{ padding: '0.65rem 1rem', background: tema.bg, borderBottom: `1px solid ${tema.color}20`, fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Lista de pasajeros — {v.origen} → {v.destino}</span>
                                        <span style={{ color: tema.acento }}>{v.pasajeros.length} pasajeros</span>
                                    </div>
                                    {v.pasajeros.map((p, i) => (
                                        <div key={i} style={{ padding: '0.55rem 1rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <span style={{ color: tema.acento, fontWeight: 700, fontSize: '0.8rem', marginRight: '0.5rem' }}>{p.asiento}</span>
                                                <span style={{ color: '#f1f5f9', fontSize: '0.82rem' }}>{p.nombre}</span>
                                            </div>
                                            <span style={{ color: '#64748b', fontSize: '0.72rem' }}>{p.ci}</span>
                                        </div>
                                    ))}
                                    {v.pasajeros.length === 0 && (
                                        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#475569', fontSize: '0.82rem' }}>Sin pasajeros.</div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                )}
                {/* ── Tab Pasajeros ── */}
                {tab === 'pasajeros' && (
                    <div>
                        <div style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Lista de pasajeros por viaje
                        </div>

                        <select
                            value={listaViajeId} onChange={e => setListaViajeId(e.target.value)}
                            style={{ ...inputStyle, marginBottom: '1.25rem' }}
                        >
                            <option value="">— Selecciona un viaje —</option>
                            {viajes.map(v => (
                                <option key={v.id} value={v.id}>
                                    {v.origen} → {v.destino} · {new Date(v.salida).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false })} · {v.busPlaca}
                                    {v.estado === 'en_ruta' ? ' 🚌' : v.estado === 'finalizado' ? ' ✅' : ''}
                                </option>
                            ))}
                        </select>

                        {listaViajeId && (() => {
                            const v = viajes.find(x => x.id === listaViajeId);
                            const abordados = listaPasajeros.filter(p => p.abordado).length;
                            const total = listaPasajeros.length;
                            return (
                                <div>
                                    {/* Resumen */}
                                    {v && (
                                        <div style={{ background: '#0d1a2e', border: `1px solid ${tema.color}25`, borderRadius: '10px', padding: '0.85rem 1.1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.92rem' }}>{v.origen} → {v.destino}</div>
                                                <div style={{ color: '#64748b', fontSize: '0.73rem', marginTop: '0.15rem' }}>🚍 {v.busPlaca} · {new Date(v.salida).toLocaleString('es-BO')}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: abordados === total && total > 0 ? '#10b981' : tema.acento }}>
                                                    {abordados}/{total}
                                                </div>
                                                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>abordados</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Lista */}
                                    {listaPasajeros.length === 0 ? (
                                        <div style={{ textAlign: 'center', color: '#475569', padding: '2.5rem', background: '#0d1a2e', borderRadius: '10px', border: '1px solid #1e293b' }}>
                                            Sin pasajeros registrados para este viaje.
                                        </div>
                                    ) : (
                                        <div style={{ background: '#0d1a2e', borderRadius: '12px', border: '1px solid #1e293b', overflow: 'hidden' }}>
                                            {/* Header */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr auto', gap: '0.5rem', padding: '0.55rem 1rem', background: tema.bg, borderBottom: `1px solid ${tema.color}15` }}>
                                                {['Asiento', 'Pasajero', 'Estado'].map(h => (
                                                    <div key={h} style={{ fontSize: '0.65rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                                                ))}
                                            </div>
                                            {listaPasajeros.map((p, i) => (
                                                <div key={i} style={{
                                                    display: 'grid', gridTemplateColumns: '52px 1fr auto', gap: '0.5rem',
                                                    padding: '0.65rem 1rem', borderBottom: '1px solid #1e293b',
                                                    background: i % 2 === 0 ? 'transparent' : 'rgba(15,23,42,0.3)',
                                                    alignItems: 'center',
                                                }}>
                                                    <div style={{ color: tema.acento, fontWeight: 800, fontSize: '0.88rem' }}>{p.asiento}</div>
                                                    <div>
                                                        <div style={{ color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 500 }}>{p.nombre}</div>
                                                        <div style={{ color: '#475569', fontSize: '0.7rem' }}>CI: {p.ci}</div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        {p.abordado ? (
                                                            <div>
                                                                <span style={{ background: 'rgba(16,185,129,0.12)', color: '#6ee7b7', padding: '0.18rem 0.55rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700 }}>
                                                                    ✅ Abordó
                                                                </span>
                                                                {p.horaAbordaje && (
                                                                    <div style={{ color: '#475569', fontSize: '0.62rem', marginTop: '0.15rem' }}>
                                                                        {new Date(p.horaAbordaje).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24', padding: '0.18rem 0.55rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700 }}>
                                                                ⏳ No llegó
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Footer resumen */}
                                            <div style={{ padding: '0.65rem 1rem', background: tema.bg, borderTop: `1px solid ${tema.color}15`, display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                                                <span>✅ Abordaron: <strong style={{ color: '#6ee7b7' }}>{abordados}</strong></span>
                                                <span>⏳ No llegaron: <strong style={{ color: '#fbbf24' }}>{total - abordados}</strong></span>
                                                <span>Total: <strong style={{ color: '#f1f5f9' }}>{total}</strong></span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Botón refrescar */}
                                    <button onClick={() => setListaViajeId(v => v)} style={{
                                        marginTop: '0.85rem', width: '100%', background: `${tema.color}12`,
                                        border: `1px solid ${tema.color}30`, color: tema.acento,
                                        borderRadius: '8px', padding: '0.6rem', cursor: 'pointer', fontSize: '0.8rem',
                                    }}>
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
        </div>
    );
};

export default PanelConductor;
