import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import { crearBoletosBatch } from '../../servicios/api';
import PanelDisponibilidad from '../../componentes/PanelDisponibilidad';
import FragmentoDept from '../../componentes/FragmentoDept';
import {
    getViajesSucursalProximos, updatePrecioViaje, updatePreciosGlobal,
    getReservasSucursal, getAsientosOcupados, crearReservaSupabase, updateReservaEstado,
} from '../../servicios/api';
import { jsPDF } from 'jspdf';
import TicketCard, { getTemaEmpresa, getLogoEmpresa } from '../../componentes/TicketCard';
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

const COLS_ASIENTO = ['A', 'B', 'C', 'D'];

const esPasado = (fechaSalida) => new Date(fechaSalida) < new Date();

const PanelCajero = () => {
    const navigate = useNavigate();
    const { perfil, logout } = useAuth();
    const rootRef = useRef(null);

    const sucursalNombre = perfil?.sucursal_nombre || 'Mi Sucursal';
    const sucursalLogo = perfil?.sucursal_logo || '🏷️';
    const deptNombre = perfil?.departamento || 'La Paz';
    const tema = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];

    const [tab, setTab] = useState('dashboard');
    const [reservas, setReservas] = useState([]);
    const [ventas, setVentas] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [horaActual, setHoraActual] = useState(new Date());

    const [viajes, setViajes] = useState([]);
    const [boleto, setBoleto] = useState({
        viajeId: '',
        pasajeroNombre: '',
        pasajeroCI: '',
        pasajeroTelefono: '',
        pasajeroEmail: '',
        asientosSeleccionados: [],
        metodoPago: 'efectivo',
        origen: '',
        destino: '',
        precio: 0,
        busPlaca: 'ABC-1234',
        fechaSalida: '',
    });
    const [pasoActivo, setPasoActivo] = useState(1); // 1=viaje 2=pasajero 3=asientos 4=pago
    const [pagado, setPagado] = useState(false);
    const [boletosEmitidos, setBoletosEmitidos] = useState([]);
    const [pdfCreando, setPdfCreando] = useState(false);
    const [datosTarjeta, setDatosTarjeta] = useState({ numero: '', expiry: '', cvv: '' });
    const [mensajeBoleto, setMensajeBoleto] = useState(null);
    const [boletoCreado, setBoletoCreado] = useState(null);
    const [asientosOcupados, setAsientosOcupados] = useState([]);
    const [notifs, setNotifs] = useState([]);
    const [aprobados, setAprobados] = useState({}); // { [reservaId]: { boletos, nombreEmpresa, email } }
    const [pdfEnProceso, setPdfEnProceso] = useState(null); // reservaId | null

    // ── Precios dinámicos ──────────────────────────────
    const [viajesPrecios, setViajesPrecios] = useState([]);
    const [cargandoPrecios, setCargandoPrecios] = useState(false);
    const [preciosEditados, setPreciosEditados] = useState({}); // { [id]: string }
    const [incrementoGlobal, setIncrementoGlobal] = useState('');
    const [guardandoPrecio, setGuardandoPrecio] = useState(null); // id | 'global' | null
    const [msgPrecios, setMsgPrecios] = useState(null); // { tipo, texto }

    useEffect(() => {
        const iv = setInterval(() => setHoraActual(new Date()), 1000);
        return () => clearInterval(iv);
    }, []);

    const recargar = useCallback(async () => {
        const sid = perfil?.sucursal_id;
        if (sid) {
            getReservasSucursal(sid).then(setReservas);
        }
    }, [perfil?.sucursal_id]);

    useEffect(() => { recargar(); }, [recargar]);

    // Cargar viajes reales cuando se abre crear-boleto
    useEffect(() => {
        if (tab === 'crear-boleto' && perfil?.sucursal_id) {
            getViajesSucursalProximos(perfil.sucursal_id).then(setViajes);
        }
    }, [tab, perfil?.sucursal_id]);

    // Cargar asientos ocupados cuando cambia el viaje seleccionado
    useEffect(() => {
        if (!boleto.viajeId) { setAsientosOcupados([]); return; }
        getAsientosOcupados(boleto.viajeId).then(setAsientosOcupados);
    }, [boleto.viajeId]);

    const cargarNotifs = useCallback(() => { setNotifs([]); }, []); // pending Supabase notificaciones table

    const cargarPrecios = useCallback(async () => {
        if (!perfil?.sucursal_id) return;
        setCargandoPrecios(true);
        const data = await getViajesSucursalProximos(perfil.sucursal_id);
        setViajesPrecios(data);
        setPreciosEditados({});
        setCargandoPrecios(false);
    }, [perfil?.sucursal_id]);

    useEffect(() => {
        if (tab === 'precios') cargarPrecios();
    }, [tab, cargarPrecios]);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-anim="header"]', { y: -30, opacity: 0, duration: 0.5, ease: 'power3.out' });
            gsap.from('[data-anim="sidebar"]', { x: -40, opacity: 0, duration: 0.55, ease: 'power3.out', delay: 0.1 });
            gsap.from('[data-anim="main"]', { y: 20, opacity: 0, duration: 0.5, ease: 'power3.out', delay: 0.2 });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    useEffect(() => {
        gsap.from('[data-anim="content"]', { opacity: 0, y: 16, duration: 0.35, ease: 'power2.out' });
    }, [tab]);

    const handleLogout = async () => { await logout(); navigate('/'); };

    const reservasFiltradas = reservas.filter(r =>
        !busqueda ||
        r.pasajeroNombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.pasajeroCI?.includes(busqueda) ||
        r.id?.includes(busqueda)
    );

    const totalIngresos = reservas.reduce((acc, r) => acc + (r.precio || 0), 0);
    const totalBoletos  = reservas.reduce((acc, r) => acc + (r.asientos?.length || 0), 0);

    const viajeSeleccionado = viajes.find(v => v.id === boleto.viajeId);

    const handleSeleccionarViaje = (v) => {
        if (esPasado(v.fecha_salida)) return;
        setBoleto(prev => ({
            ...prev,
            viajeId: v.id,
            origen: v.origen,
            destino: v.destino,
            precio: v.precio,
            busPlaca: v.buses?.placa || '—',
            fechaSalida: v.fecha_salida,
            asientosSeleccionados: [],
        }));
        setPasoActivo(2);
    };

    const toggleAsiento = (id) => {
        setBoleto(prev => {
            const ya = prev.asientosSeleccionados.includes(id);
            return {
                ...prev,
                asientosSeleccionados: ya
                    ? prev.asientosSeleccionados.filter(a => a !== id)
                    : [...prev.asientosSeleccionados, id],
            };
        });
    };

    const handleIrAPago = (e) => {
        e.preventDefault();
        setMensajeBoleto(null);
        if (!boleto.viajeId) return setMensajeBoleto({ tipo: 'error', texto: 'Selecciona un viaje.' });
        if (boleto.asientosSeleccionados.length === 0) return setMensajeBoleto({ tipo: 'error', texto: 'Selecciona al menos un asiento.' });
        if (!boleto.pasajeroNombre || !boleto.pasajeroCI) return setMensajeBoleto({ tipo: 'error', texto: 'Nombre y CI son obligatorios.' });
        setPasoCrear('pago');
    };

    const handleConfirmarPago = async () => {
        const monto = boleto.precio * boleto.asientosSeleccionados.length;
        const resultado = await crearReservaSupabase({
            viajeId:         boleto.viajeId,
            usuarioId:       perfil?.rol === 'cliente' ? perfil.id : null,
            asientos:        boleto.asientosSeleccionados,
            monto,
            emailCliente:    boleto.pasajeroEmail,
            telefonoCliente: boleto.pasajeroTelefono,
            metodoPago:      boleto.metodoPago,
            nombre:          boleto.pasajeroNombre,
            origen:          boleto.origen,
            destino:         boleto.destino,
            fechaSalida:     boleto.fechaSalida,
            empresa:         boleto.sucursalNombre,
        });

        if (resultado.error) {
            setMensajeBoleto({ tipo: 'error', texto: resultado.error });
        } else {
            const reservaCompleta = {
                id: resultado.id,
                viajeId:        boleto.viajeId,
                origen:         boleto.origen,
                destino:        boleto.destino,
                fechaSalida:    boleto.fechaSalida,
                pasajeroNombre: boleto.pasajeroNombre,
                pasajeroCI:     boleto.pasajeroCI,
                asientos:       boleto.asientosSeleccionados,
                precio:         monto,
                metodoPago:     boleto.metodoPago,
                busPlaca:       boleto.busPlaca,
            };
            const pasajerosObj = boleto.asientosSeleccionados.reduce((acc, asiento) => {
                acc[asiento] = { nombre: boleto.pasajeroNombre, ci: boleto.pasajeroCI, email: boleto.pasajeroEmail };
                return acc;
            }, {});
            const bs = await crearBoletosBatch({
                reservaId:      resultado.id,
                viajeId:        boleto.viajeId,
                asientos:       boleto.asientosSeleccionados,
                datosPasajeros: pasajerosObj,
                precioUnitario: boleto.precio,
                sucursalId:     perfil?.sucursal_id,
                departamentoId: perfil?.departamento,
                horarioSalida:  boleto.fechaSalida,
            });
            setBoletoCreado(reservaCompleta);
            setBoletosEmitidos(bs || []);
            setPagado(true);
            recargar();
        }
    };

    const noLeidas = notifs.filter(n => !n.leido).length;
    const handleMarcarLeida = () => {};
    const handleMarcarTodas = () => {};

    const pendientesValidacion = reservas.filter(r => r.estado === 'pendiente_documentos');

    const handleAprobarReserva = async (reservaId) => {
        const reserva = reservas.find(r => r.id === reservaId);
        if (!reserva) return;
        await updateReservaEstado(reservaId, 'autorizado');
        const bs = await crearBoletosBatch({
            reservaId,
            viajeId:        reserva.viaje_id || reserva.viajeId,
            asientos:       reserva.asientos || [],
            datosPasajeros: {},
            precioUnitario: reserva.precio || 0,
            sucursalId:     perfil?.sucursal_id,
            departamentoId: perfil?.departamento,
            horarioSalida:  reserva.fecha_salida || reserva.fechaSalida,
        });
        const email = reserva.email_cliente || null;
        setAprobados(prev => ({ ...prev, [reservaId]: { boletos: bs, nombreEmpresa: sucursalNombre, email } }));
        if (email) setTimeout(() => alert(`📧 Boletos enviados a ${email}`), 400);
        recargar();
    };

    const handleDescargarPDFAprobado = async (reservaId) => {
        const entry = aprobados[reservaId];
        if (!entry?.boletos?.length) return;
        setPdfEnProceso(reservaId);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const ticketEls = [...document.querySelectorAll(`[data-ticket-cajero="${reservaId}"]`)];
            if (!ticketEls.length) { setPdfEnProceso(null); return; }
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
                const canvas = await html2canvas(ticketEls[i], { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#f4f6f8', logging: false });
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin + col * (ticketW + margin), margin + localRow * (ticketH + margin), ticketW, ticketH);
            }
            pdf.save(`boletos-${reservaId.slice(-8)}.pdf`);
        } catch (err) { console.error('PDF error:', err); }
        setPdfEnProceso(null);
    };

    const handleRechazarReserva = async (reservaId) => {
        await updateReservaEstado(reservaId, 'cancelada');
        recargar();
    };

    const handleNuevoBoleto = () => {
        setPagado(false);
        setPasoActivo(1);
        setBoletoCreado(null);
        setBoletosEmitidos([]);
        setMensajeBoleto(null);
        setBoleto({ viajeId: '', pasajeroNombre: '', pasajeroCI: '', pasajeroTelefono: '', pasajeroEmail: '', asientosSeleccionados: [], metodoPago: 'efectivo', origen: '', destino: '', precio: 0, busPlaca: 'ABC-1234', fechaSalida: '' });
        setDatosTarjeta({ numero: '', expiry: '', cvv: '' });
    };

    const handleDescargarPDFCreado = async () => {
        if (!boletosEmitidos.length) return;
        setPdfCreando(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const ticketEls = [...document.querySelectorAll('[data-ticket-nuevo]')];
            if (!ticketEls.length) { setPdfCreando(false); return; }
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageW = 210, margin = 8;
            const ticketW = (pageW - margin * 3) / 2;
            const ticketH = ticketW * (360 / 600);
            const rowsPerPage = Math.floor((297 - margin * 2) / (ticketH + margin));
            for (let i = 0; i < ticketEls.length; i++) {
                const col = i % 2, globalRow = Math.floor(i / 2), localRow = globalRow % rowsPerPage;
                if (i > 0 && col === 0 && localRow === 0) pdf.addPage();
                const canvas = await html2canvas(ticketEls[i], { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#f4f6f8', logging: false });
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin + col * (ticketW + margin), margin + localRow * (ticketH + margin), ticketW, ticketH);
            }
            pdf.save(`boleto-${boletoCreado?.id?.slice(-8) || 'nuevo'}.pdf`);
        } catch (err) { console.error('PDF error:', err); }
        setPdfCreando(false);
    };

    const TABS = [
        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'disponibilidad', icon: '🟢', label: 'Disponibilidad' },
        { id: 'precios', icon: '💲', label: 'Precios' },
        { id: 'crear-boleto', icon: '🎫', label: 'Crear Boleto' },
        { id: 'pendientes', icon: '⏳', label: `Pendientes${pendientesValidacion.length > 0 ? ` (${pendientesValidacion.length})` : ''}` },
        { id: 'reservas', icon: '📋', label: 'Reservas' },
        { id: 'ventas', icon: '💰', label: 'Ventas' },
        { id: 'notificaciones', icon: '🔔', label: 'Notificaciones' },
    ];

    const inputStyle = {
        width: '100%', boxSizing: 'border-box',
        background: '#0d1a2e', border: `1px solid ${tema.color}40`,
        color: '#f1f5f9', padding: '0.65rem 1rem',
        borderRadius: '8px', fontSize: '0.88rem',
        outline: 'none', transition: 'border-color 0.2s',
    };

    const tituloStyle = {
        fontSize: 'clamp(1.3rem,2.5vw,1.7rem)', fontWeight: 900,
        background: `linear-gradient(90deg, ${tema.color}, ${tema.colorSecundario})`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        fontFamily: "'Rajdhani', system-ui, sans-serif",
        textTransform: 'uppercase', lineHeight: 1.1, marginTop: 0,
    };

    const totalPago = boleto.precio * boleto.asientosSeleccionados.length;

    const FONDOS_DEPT = {
        'La Paz': '/fondos/La_Paz.webp', 'Oruro': '/fondos/Oruro.webp',
        'Potosí': '/fondos/Potosi.webp', 'Cochabamba': '/fondos/Cochabamba.webp',
        'Chuquisaca': '/fondos/Chuquisaca.webp', 'Tarija': '/fondos/Tarija.webp',
        'Santa Cruz': '/fondos/Santa_Cruz.webp', 'Beni': '/fondos/Beni.webp',
        'Pando': '/fondos/Pando.webp',
    };
    const fondoUrl = FONDOS_DEPT[deptNombre] || FONDOS_DEPT['La Paz'];

    return (
        <>
            {/* Fondo fijo — fuera del stacking context del layout */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
                backgroundImage: `url(${fondoUrl})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
                transform: 'scale(0.99)',
                filter: 'blur(9px) saturate(0.75)',
            }} />
            <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'rgba(8, 12, 24, 0.68)' }} />

            <div ref={rootRef} style={{
                display: 'flex', flexDirection: 'column', minHeight: '100vh',
                color: '#dde5f0', fontFamily: "'Inter', system-ui, sans-serif",
                position: 'relative', zIndex: 1,
            }}>

                {/* Header */}
                <header data-anim="header" style={{
                    background: 'rgba(15, 23, 42, 0.72)',
                    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                    borderBottom: `1px solid ${tema.color}35`,
                    padding: '0.75rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    position: 'sticky', top: 0, zIndex: 20, gap: '1rem',
                }}>
                    {/* Izquierda: dept visual + título */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', minWidth: 0 }}>
                        <div style={{
                            width: 52, height: 52, borderRadius: '12px', flexShrink: 0,
                            background: `${tema.color}12`, border: `2px solid ${tema.color}40`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden', padding: '3px',
                        }}>
                            <FragmentoDept deptNombre={deptNombre} color={tema.color} size={44} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f1f5f9', letterSpacing: '-0.01em' }}>
                                {deptNombre}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: tema.acento, marginTop: '0.05rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                Panel Cajero
                            </div>
                        </div>
                    </div>

                    {/* Centro: reloj digital */}
                    <div style={{
                        background: tema.bg, border: `1px solid ${tema.color}35`,
                        borderRadius: '10px', padding: '0.4rem 1rem', textAlign: 'center', flexShrink: 0,
                    }}>
                        <div style={{
                            fontFamily: "'Courier New', monospace", fontSize: '1.35rem',
                            fontWeight: 700, color: tema.acento, letterSpacing: '0.05em', lineHeight: 1,
                        }}>
                            {horaActual.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                        </div>
                        <div style={{ fontSize: '0.58rem', color: '#475569', marginTop: '0.1rem' }}>
                            {horaActual.toLocaleDateString('es-BO', { weekday: 'short', day: '2-digit', month: 'short' })}
                        </div>
                    </div>

                    {/* Derecha: notif + cuenta + acciones */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
                        {noLeidas > 0 && (
                            <button
                                onClick={() => setTab('notificaciones')}
                                title={`${noLeidas} notificación${noLeidas !== 1 ? 'es' : ''} sin leer`}
                                style={{
                                    position: 'relative', background: `${tema.color}18`,
                                    border: `1px solid ${tema.color}50`, borderRadius: '50%',
                                    width: 34, height: 34, display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', cursor: 'pointer', fontSize: '1rem', flexShrink: 0,
                                }}
                            >
                                🔔
                                <span style={{
                                    position: 'absolute', top: -3, right: -3,
                                    background: '#ef4444', color: '#fff', borderRadius: '50%',
                                    width: 15, height: 15, fontSize: '0.55rem', fontWeight: 800,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: `2px solid ${tema.bg}`,
                                }}>{noLeidas > 9 ? '9+' : noLeidas}</span>
                            </button>
                        )}
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.82rem', color: '#f1f5f9', fontWeight: 600, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {perfil?.nombre_completo || perfil?.email}
                            </div>
                            <div style={{ fontSize: '0.62rem', color: tema.acento, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cajero</div>
                        </div>
                        <div style={{
                            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                            background: `${tema.color}20`, border: `2px solid ${tema.color}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.95rem', fontWeight: 700, color: tema.acento,
                        }}>
                            {(perfil?.nombre_completo || 'C').charAt(0).toUpperCase()}
                        </div>
                        <button onClick={() => navigate('/')} style={{
                            background: `${tema.color}12`, border: `1px solid ${tema.color}35`,
                            color: tema.acento, padding: '0.4rem 0.75rem', borderRadius: '8px',
                            cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap',
                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = `${tema.color}25`}
                            onMouseLeave={e => e.currentTarget.style.background = `${tema.color}12`}>
                            🏠 Inicio
                        </button>
                        <button onClick={handleLogout} style={{
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                            color: '#94a3b8', padding: '0.4rem 0.85rem', borderRadius: '8px',
                            cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500, whiteSpace: 'nowrap', transition: 'all 0.2s',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#fca5a5'; e.currentTarget.style.borderColor = '#ef444440'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}>
                            Salir
                        </button>
                    </div>
                </header>

                <div style={{ display: 'flex', flex: 1 }}>
                    {/* Sidebar */}
                    <aside data-anim="sidebar" style={{
                        width: 220, minHeight: 'calc(100vh - 62px)',
                        background: 'rgba(10, 15, 25, 0.72)',
                        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                        borderRight: `1px solid ${tema.color}25`,
                        padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem',
                        position: 'sticky', top: 62, alignSelf: 'flex-start',
                        height: 'calc(100vh - 62px)', overflowY: 'auto',
                    }}>
                        <div style={{
                            marginBottom: '0.85rem', borderRadius: '10px',
                            border: `1px solid ${tema.bandera1}33`,
                            background: `linear-gradient(180deg, ${tema.bandera1}10, ${tema.bandera2}08)`,
                            overflow: 'hidden',
                            width: '100%',
                        }}>
                            {getIconoEmpresa(sucursalNombre)
                                ? <img src={getIconoEmpresa(sucursalNombre)} alt={sucursalNombre}
                                    style={{ width: '100%', height: 'auto', display: 'block' }} />
                                : <div style={{
                                    height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: `linear-gradient(135deg, ${tema.bandera1}55, ${tema.bandera2}38)`, fontSize: '4rem'
                                }}>
                                    {sucursalLogo}
                                </div>
                            }
                            <div style={{
                                padding: '0.5rem 0.75rem 0.6rem',
                                background: 'rgba(0,0,0,0.75)',
                                borderTop: `1px solid ${tema.bandera1}22`,
                            }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: tema.acento, lineHeight: 1.2, fontFamily: "'Rajdhani', system-ui, sans-serif", textTransform: 'uppercase', letterSpacing: '0.04em' }}>{sucursalNombre}</div>
                                <div style={{ fontSize: '0.68rem', color: `${tema.acento}66`, marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {perfil?.nombre_completo || perfil?.email}
                                </div>
                            </div>
                        </div>

                        <div style={{ fontSize: '0.62rem', color: `${tema.color}99`, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.25rem', paddingLeft: '0.5rem', fontFamily: "'Rajdhani', system-ui, sans-serif", fontWeight: 700 }}>Módulos</div>

                        {TABS.map(t => {
                            const esNotif = t.id === 'notificaciones';
                            const esPend = t.id === 'pendientes';
                            const activo = tab === t.id;
                            return (
                                <button key={t.id} onClick={() => setTab(t.id)} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                                    padding: '0.6rem 0.85rem', borderRadius: '8px', border: 'none',
                                    background: activo ? `linear-gradient(90deg, ${tema.color}28, ${tema.colorSecundario}15)` : 'transparent',
                                    color: activo ? tema.acento : `${tema.acento}55`,
                                    cursor: 'pointer', fontSize: '0.82rem', fontWeight: activo ? 700 : 500,
                                    textAlign: 'left', transition: 'all 0.15s',
                                    outline: activo ? `1px solid ${tema.color}50` : '1px solid transparent',
                                    fontFamily: "'Rajdhani', system-ui, sans-serif",
                                    textTransform: 'uppercase', letterSpacing: '0.04em',
                                }}
                                    onMouseEnter={e => { if (!activo) { e.currentTarget.style.background = `${tema.color}10`; e.currentTarget.style.color = '#94a3b8'; } }}
                                    onMouseLeave={e => { if (!activo) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; } }}>
                                    <span>{t.icon}</span>
                                    <span>{t.label}</span>
                                    {esNotif && noLeidas > 0 && (
                                        <span style={{
                                            marginLeft: 'auto', background: '#ef4444', color: '#fff',
                                            borderRadius: 10, fontSize: '0.6rem', fontWeight: 800,
                                            padding: '0 5px', lineHeight: '16px', minWidth: 16, textAlign: 'center',
                                        }}>{noLeidas > 9 ? '9+' : noLeidas}</span>
                                    )}
                                    {esPend && pendientesValidacion.length > 0 && (
                                        <span style={{
                                            marginLeft: 'auto', background: '#7c3aed', color: '#fff',
                                            borderRadius: 10, fontSize: '0.6rem', fontWeight: 800,
                                            padding: '0 5px', lineHeight: '16px', minWidth: 16, textAlign: 'center',
                                        }}>{pendientesValidacion.length > 9 ? '9+' : pendientesValidacion.length}</span>
                                    )}
                                    {activo && !esNotif && !esPend && <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: tema.color }} />}
                                </button>
                            );
                        })}

                    </aside>

                    {/* Main Content */}
                    <main data-anim="main" style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>

                        {/* ── Dashboard ── */}
                        {tab === 'dashboard' && (
                            <div data-anim="content">
                                <h2 style={{ ...tituloStyle, marginBottom: '1.5rem' }}>Resumen del día</h2>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                                    {[
                                        { label: 'Reservas totales', valor: reservas.length, color: tema.color, icon: '🎫' },
                                        { label: 'Ventas del día', valor: ventas.length, color: '#10b981', icon: '💰' },
                                        { label: 'Ingresos', valor: `Bs ${totalIngresos.toFixed(2)}`, color: '#f59e0b', icon: '📊' },
                                        { label: 'Boletos vendidos', valor: totalBoletos, color: tema.acento, icon: '🏷️' },
                                    ].map(kpi => (
                                        <div key={kpi.label} style={{
                                            background: '#0d1a2e', borderRadius: '12px', padding: '1.25rem',
                                            border: `1px solid ${kpi.color}25`, position: 'relative', overflow: 'hidden',
                                        }}>
                                            <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '3rem', opacity: 0.06 }}>{kpi.icon}</div>
                                            <div style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>{kpi.icon}</div>
                                            <div style={{ color: kpi.color, fontSize: '1.6rem', fontWeight: 700, lineHeight: 1.2 }}>{kpi.valor}</div>
                                            <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>{kpi.label}</div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{
                                    background: `linear-gradient(135deg, ${tema.color}15 0%, ${tema.bg} 100%)`,
                                    border: `1px solid ${tema.color}40`, borderRadius: '14px',
                                    padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
                                }}>
                                    <div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' }}>¿Cliente en ventanilla?</div>
                                        <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>Crea un boleto manualmente en segundos.</div>
                                    </div>
                                    <button onClick={() => setTab('crear-boleto')} style={{
                                        background: tema.color, color: '#fff', border: 'none',
                                        borderRadius: '10px', padding: '0.75rem 1.5rem',
                                        fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
                                        boxShadow: `0 4px 20px ${tema.color}50`,
                                    }}>🎫 Crear Boleto</button>
                                </div>

                                <div style={{ marginTop: '2rem' }}>
                                    <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Últimas reservas</div>
                                    {reservas.slice(-5).reverse().map(r => (
                                        <div key={r.id} style={{
                                            background: '#0d1a2e', borderRadius: '10px', padding: '0.75rem 1rem',
                                            marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            border: '1px solid #1e293b',
                                        }}>
                                            <div>
                                                <span style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.88rem' }}>{r.pasajeroNombre}</span>
                                                <span style={{ color: '#475569', fontSize: '0.78rem', marginLeft: '0.5rem' }}>{r.origen} → {r.destino}</span>
                                            </div>
                                            <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.85rem' }}>Bs {r.precio}</span>
                                        </div>
                                    ))}
                                    {reservas.length === 0 && <div style={{ color: '#475569', fontSize: '0.85rem' }}>Sin reservas registradas.</div>}
                                </div>
                            </div>
                        )}

                        {/* ── Disponibilidad Flota ── */}
                        {tab === 'disponibilidad' && (
                            <div data-anim="content" style={{ background: '#0d1a2e', borderRadius: '14px', border: `1px solid ${tema.color}18`, padding: '1.25rem' }}>
                                <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
                                    🟢 Disponibilidad de Flota en Tiempo Real
                                </div>
                                <PanelDisponibilidad
                                    sucursalId={perfil?.sucursal_id}
                                    color={tema.color}
                                    soloLectura={true}
                                />
                            </div>
                        )}

                        {/* ── Precios Dinámicos ── */}
                        {tab === 'precios' && (
                            <div data-anim="content">
                                <h2 style={{ ...tituloStyle, marginBottom: '0.5rem' }}>Gestión de Precios</h2>
                                <p style={{ color: '#64748b', fontSize: '0.83rem', marginTop: 0, marginBottom: '1.5rem' }}>
                                    Ajusta precios de salidas próximas. El cambio global suma o resta al precio actual de cada salida.
                                </p>

                                {msgPrecios && (
                                    <div style={{
                                        padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.25rem',
                                        background: msgPrecios.tipo === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                        border: `1px solid ${msgPrecios.tipo === 'ok' ? '#065f46' : '#7f1d1d'}`,
                                        color: msgPrecios.tipo === 'ok' ? '#6ee7b7' : '#fca5a5',
                                        fontSize: '0.85rem',
                                    }}>
                                        {msgPrecios.texto}
                                    </div>
                                )}

                                {/* ── Global increment ── */}
                                <div style={{
                                    background: '#0d1a2e', border: `1px solid ${tema.color}30`,
                                    borderRadius: '14px', padding: '1.25rem 1.5rem', marginBottom: '1.75rem',
                                }}>
                                    <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: '0.85rem', fontSize: '0.9rem' }}>
                                        📈 Incremento / Decremento Global
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                        <div style={{ flex: '1 1 200px' }}>
                                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                                                Monto a sumar/restar (Bs) — negativo para bajar precio
                                            </label>
                                            <input
                                                type="number"
                                                value={incrementoGlobal}
                                                onChange={e => setIncrementoGlobal(e.target.value)}
                                                placeholder="ej. 10 o -5"
                                                style={{
                                                    width: '100%', boxSizing: 'border-box',
                                                    background: tema.bg, border: `1px solid ${tema.color}40`,
                                                    color: '#f1f5f9', padding: '0.6rem 0.9rem',
                                                    borderRadius: '8px', fontSize: '0.9rem', outline: 'none',
                                                }}
                                            />
                                        </div>
                                        <button
                                            disabled={!incrementoGlobal || guardandoPrecio === 'global'}
                                            onClick={async () => {
                                                if (!incrementoGlobal) return;
                                                setGuardandoPrecio('global');
                                                setMsgPrecios(null);
                                                const res = await updatePreciosGlobal(perfil.sucursal_id, Number(incrementoGlobal));
                                                if (res.ok) {
                                                    setMsgPrecios({ tipo: 'ok', texto: `Precios actualizados en ${res.total} salidas. +Bs ${incrementoGlobal} c/u.` });
                                                    setIncrementoGlobal('');
                                                    cargarPrecios();
                                                } else {
                                                    setMsgPrecios({ tipo: 'error', texto: res.error || 'Error al actualizar precios.' });
                                                }
                                                setGuardandoPrecio(null);
                                            }}
                                            style={{
                                                background: guardandoPrecio === 'global' ? '#334155' : tema.color,
                                                color: '#fff', border: 'none', borderRadius: '8px',
                                                padding: '0.6rem 1.25rem', fontWeight: 700, cursor: 'pointer',
                                                fontSize: '0.85rem', whiteSpace: 'nowrap', opacity: !incrementoGlobal ? 0.5 : 1,
                                            }}>
                                            {guardandoPrecio === 'global' ? 'Aplicando…' : 'Aplicar a todos'}
                                        </button>
                                    </div>
                                </div>

                                {/* ── Calendario semanal ── */}
                                <div style={{ fontWeight: 700, color: '#94a3b8', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                                    Calendario semanal — precio por salida
                                </div>

                                {cargandoPrecios ? (
                                    <div style={{ padding: '3rem', textAlign: 'center', color: '#475569', fontSize: '0.85rem' }}>Cargando salidas…</div>
                                ) : viajesPrecios.length === 0 ? (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: '#475569', fontSize: '0.85rem' }}>Sin salidas próximas registradas.</div>
                                ) : (() => {
                                    const DIAS_CAL = [
                                        { label: 'Lun', idx: 1 },
                                        { label: 'Mar', idx: 2 },
                                        { label: 'Mié', idx: 3 },
                                        { label: 'Jue', idx: 4 },
                                        { label: 'Vie', idx: 5 },
                                        { label: 'Sáb', idx: 6 },
                                        { label: 'Dom', idx: 0 },
                                    ];
                                    const porDiaHora = {};
                                    viajesPrecios.forEach(v => {
                                        const d = new Date(v.fecha_salida);
                                        const key = `${d.getDay()}-${d.getHours()}`;
                                        if (!porDiaHora[key]) porDiaHora[key] = [];
                                        porDiaHora[key].push(v);
                                    });
                                    const horas = [...new Set(viajesPrecios.map(v => new Date(v.fecha_salida).getHours()))].sort((a, b) => a - b);
                                    const thSt = {
                                        background: 'rgba(10, 15, 25, 0.85)', color: '#64748b',
                                        padding: '0.65rem 0.5rem', textAlign: 'center',
                                        fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                                        letterSpacing: '0.08em', borderBottom: '2px solid #1e293b',
                                        position: 'sticky', top: 0, zIndex: 2,
                                    };
                                    const tdHoraSt = {
                                        padding: '0.55rem 0.75rem', verticalAlign: 'middle',
                                        borderBottom: '1px solid #0f1e30', borderRight: '2px solid #1e293b',
                                        fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700,
                                        color: '#475569', whiteSpace: 'nowrap', textAlign: 'right',
                                        background: 'rgba(10, 15, 25, 0.85)', position: 'sticky', left: 0, zIndex: 1,
                                    };
                                    const tdDiaSt = {
                                        padding: '0.4rem 0.35rem', verticalAlign: 'top',
                                        borderBottom: '1px solid #0f1e30', borderRight: '1px solid #0f1e30',
                                        minWidth: 160,
                                    };
                                    return (
                                        <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #1e293b' }}>
                                            <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'auto' }}>
                                                <thead>
                                                    <tr>
                                                        <th style={{ ...thSt, position: 'sticky', left: 0, zIndex: 3, minWidth: 64, borderRight: '2px solid #1e293b' }}>Hora</th>
                                                        {DIAS_CAL.map(d => (
                                                            <th key={d.idx} style={{ ...thSt, minWidth: 160 }}>{d.label}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {horas.map((hora, ri) => (
                                                        <tr key={hora} style={{ background: ri % 2 === 0 ? 'rgba(10,15,25,0.45)' : `${tema.color}08` }}>
                                                            <td style={tdHoraSt}>{hora.toString().padStart(2, '0')}:00</td>
                                                            {DIAS_CAL.map(dia => {
                                                                const celdaViajes = porDiaHora[`${dia.idx}-${hora}`] || [];
                                                                return (
                                                                    <td key={dia.idx} style={tdDiaSt}>
                                                                        {celdaViajes.map(v => {
                                                                            const editado = preciosEditados[v.id];
                                                                            const guardando = guardandoPrecio === v.id;
                                                                            const cambiado = editado !== undefined && Number(editado) !== v.precio;
                                                                            return (
                                                                                <div key={v.id} style={{
                                                                                    background: '#0a1628',
                                                                                    border: `1px solid ${cambiado ? tema.color + '70' : '#1a2840'}`,
                                                                                    borderRadius: '8px', padding: '0.5rem 0.55rem',
                                                                                    marginBottom: '0.35rem',
                                                                                    boxShadow: cambiado ? `0 0 10px ${tema.color}18` : 'none',
                                                                                }}>
                                                                                    <div style={{
                                                                                        fontSize: '0.72rem', fontWeight: 600, color: '#dde5f0',
                                                                                        lineHeight: 1.3, marginBottom: '0.18rem',
                                                                                        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                                                                                    }}>
                                                                                        {v.origen} → {v.destino}
                                                                                    </div>
                                                                                    <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 700, marginBottom: '0.35rem' }}>
                                                                                        Bs {v.precio}
                                                                                    </div>
                                                                                    <input
                                                                                        type="number"
                                                                                        min="0"
                                                                                        value={editado !== undefined ? editado : v.precio}
                                                                                        onChange={e => setPreciosEditados(prev => ({ ...prev, [v.id]: e.target.value }))}
                                                                                        style={{
                                                                                            width: '100%', boxSizing: 'border-box',
                                                                                            background: tema.bg,
                                                                                            border: `1px solid ${cambiado ? tema.color : tema.color + '25'}`,
                                                                                            color: '#f1f5f9', padding: '0.25rem 0.4rem',
                                                                                            borderRadius: '5px', fontSize: '0.8rem',
                                                                                            outline: 'none', marginBottom: '0.3rem',
                                                                                        }}
                                                                                    />
                                                                                    <button
                                                                                        disabled={guardando || !cambiado}
                                                                                        onClick={async () => {
                                                                                            const nuevo = Number(editado);
                                                                                            if (isNaN(nuevo) || nuevo < 0) return;
                                                                                            setGuardandoPrecio(v.id);
                                                                                            setMsgPrecios(null);
                                                                                            const res = await updatePrecioViaje(v.id, nuevo);
                                                                                            if (res.ok) {
                                                                                                setMsgPrecios({ tipo: 'ok', texto: `✓ ${v.origen}→${v.destino} · Bs ${nuevo}` });
                                                                                                setViajesPrecios(prev => prev.map(x => x.id === v.id ? { ...x, precio: nuevo } : x));
                                                                                                setPreciosEditados(prev => { const n = { ...prev }; delete n[v.id]; return n; });
                                                                                            } else {
                                                                                                setMsgPrecios({ tipo: 'error', texto: res.error || 'Error al guardar.' });
                                                                                            }
                                                                                            setGuardandoPrecio(null);
                                                                                        }}
                                                                                        style={{
                                                                                            width: '100%',
                                                                                            background: guardando ? '#334155' : cambiado ? '#10b981' : '#111827',
                                                                                            color: '#fff', border: 'none', borderRadius: '5px',
                                                                                            padding: '0.28rem 0', fontWeight: 700,
                                                                                            cursor: cambiado ? 'pointer' : 'default',
                                                                                            fontSize: '0.68rem', opacity: cambiado ? 1 : 0.3,
                                                                                            transition: 'all 0.15s',
                                                                                        }}>
                                                                                        {guardando ? '…' : '✓ Guardar'}
                                                                                    </button>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* ── Crear Boleto ── */}
                        {tab === 'crear-boleto' && (
                            <div data-anim="content">
                                <h2 style={{ ...tituloStyle, marginBottom: '1.5rem' }}>Crear Boleto en Ventanilla</h2>

                                {/* Barra de progreso */}
                                {!pagado && (
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.75rem', background: 'rgba(13,26,46,0.7)', borderRadius: 12, padding: '0.75rem 1rem', border: '1px solid #1e293b' }}>
                                        {[
                                            { id: 1, icon: '🚌', label: 'Viaje' },
                                            { id: 2, icon: '👤', label: 'Pasajero' },
                                            { id: 3, icon: '🪑', label: 'Asientos' },
                                            { id: 4, icon: '💳', label: 'Pago' },
                                        ].map((paso, i) => {
                                            const activo = pasoActivo === paso.id;
                                            const completado = pasoActivo > paso.id;
                                            return (
                                                <React.Fragment key={paso.id}>
                                                    <button onClick={() => setPasoActivo(paso.id)} style={{
                                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem',
                                                        padding: '0.4rem 0.75rem', borderRadius: 10, border: 'none',
                                                        background: activo ? `${tema.color}18` : 'transparent',
                                                        outline: activo ? `1px solid ${tema.color}50` : '1px solid transparent',
                                                        cursor: 'pointer', transition: 'all 0.15s', flex: '0 0 auto',
                                                    }}>
                                                        <div style={{
                                                            width: 34, height: 34, borderRadius: '50%',
                                                            background: activo ? tema.color : completado ? `${tema.color}35` : '#1e293b',
                                                            border: `2px solid ${activo ? tema.color : completado ? tema.color + '60' : '#334155'}`,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: completado ? '0.85rem' : '1rem', fontWeight: 700,
                                                            color: activo ? '#fff' : completado ? tema.acento : '#475569',
                                                            transition: 'all 0.2s',
                                                        }}>
                                                            {completado ? '✓' : paso.icon}
                                                        </div>
                                                        <span style={{
                                                            fontSize: '0.65rem', fontWeight: activo ? 700 : 500,
                                                            color: activo ? tema.acento : completado ? `${tema.acento}80` : '#475569',
                                                            fontFamily: "'Rajdhani', system-ui, sans-serif",
                                                            textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
                                                        }}>{paso.label}</span>
                                                    </button>
                                                    {i < 3 && (
                                                        <div style={{
                                                            flex: 1, height: 2, borderRadius: 999, minWidth: 16,
                                                            background: pasoActivo > paso.id ? tema.color : '#1e293b',
                                                            transition: 'background 0.3s',
                                                        }} />
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </div>
                                )}

                                {mensajeBoleto && !pagado && (
                                    <div style={{
                                        padding: '0.85rem 1.1rem', marginBottom: '1.25rem', borderRadius: '10px',
                                        background: mensajeBoleto.tipo === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                        border: `1px solid ${mensajeBoleto.tipo === 'ok' ? '#065f46' : '#7f1d1d'}`,
                                        color: mensajeBoleto.tipo === 'ok' ? '#6ee7b7' : '#fca5a5', fontSize: '0.88rem',
                                    }}>{mensajeBoleto.texto}</div>
                                )}

                                {/* ── Estado: Pagado ── */}
                                {pagado && boletoCreado && (
                                    <div>
                                        {boletosEmitidos.map(b => {
                                            const te = getTemaEmpresa(sucursalNombre);
                                            const logoSrc = getLogoEmpresa(sucursalNombre);
                                            return (
                                                <div key={b.id} data-ticket-nuevo style={{ position: 'fixed', left: '-9999px', top: 0, width: 600, pointerEvents: 'none' }}>
                                                    <TicketCard boleto={b} te={te} logoSrc={logoSrc} empresaNombre={sucursalNombre} />
                                                </div>
                                            );
                                        })}
                                        <div style={{ maxWidth: 540, margin: '0 auto' }}>
                                            <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid #065f46', borderRadius: 16, padding: '1.75rem', marginBottom: '1.25rem', textAlign: 'center' }}>
                                                <div style={{ fontSize: '3rem', marginBottom: '0.6rem' }}>✅</div>
                                                <div style={{ fontSize: '1.6rem', fontWeight: 900, fontFamily: "'Rajdhani', system-ui, sans-serif", textTransform: 'uppercase', color: '#6ee7b7', marginBottom: '0.4rem' }}>Boleto Emitido</div>
                                                <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontFamily: 'monospace' }}>ID: {boletoCreado.id}</div>
                                                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                                                    {boleto.origen && `${boleto.origen} → ${boleto.destino}`}
                                                    {boleto.asientosSeleccionados.length > 0 && ` · Asientos: ${boleto.asientosSeleccionados.join(', ')}`}
                                                </div>
                                            </div>

                                            {boletosEmitidos.length > 0 && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', marginBottom: '1.25rem' }}>
                                                    {boletosEmitidos.map(b => {
                                                        const te = getTemaEmpresa(sucursalNombre);
                                                        const logoSrc = getLogoEmpresa(sucursalNombre);
                                                        const W = 600, H = 360, SCALE = 0.38;
                                                        return (
                                                            <div key={b.id} style={{ width: W * SCALE, height: H * SCALE, overflow: 'hidden', borderRadius: 24 * SCALE, pointerEvents: 'none', flexShrink: 0 }}>
                                                                <div style={{ width: W, height: H, transform: `scale(${SCALE})`, transformOrigin: 'top left' }}>
                                                                    <TicketCard boleto={b} te={te} logoSrc={logoSrc} empresaNombre={sucursalNombre} />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                                <button onClick={handleDescargarPDFCreado} disabled={pdfCreando || boletosEmitidos.length === 0} style={{
                                                    padding: '0.85rem', borderRadius: 10, border: 'none',
                                                    background: pdfCreando ? '#1e293b' : '#10b981',
                                                    color: '#fff', fontWeight: 700, cursor: pdfCreando ? 'wait' : 'pointer',
                                                    fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                                }}>
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                                    {pdfCreando ? 'Generando PDF...' : 'Descargar PDF'}
                                                </button>
                                                {boleto.pasajeroEmail && (
                                                    <button onClick={() => alert(`📧 Boleto enviado a ${boleto.pasajeroEmail}`)} style={{
                                                        padding: '0.85rem', borderRadius: 10,
                                                        border: `1px solid ${tema.color}50`, background: `${tema.color}12`,
                                                        color: tema.acento, fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
                                                    }}>📧 Enviar a {boleto.pasajeroEmail}</button>
                                                )}
                                                <button onClick={handleNuevoBoleto} style={{
                                                    padding: '0.75rem', borderRadius: 10, border: '1px solid #334155',
                                                    background: 'transparent', color: '#64748b', fontWeight: 600,
                                                    cursor: 'pointer', fontSize: '0.85rem',
                                                }}>+ Crear otro boleto</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── Paso 1: Viaje ── */}
                                {pasoActivo === 1 && !pagado && (
                                    <div>
                                        <div style={{ color: tema.acento, fontSize: '0.72rem', fontWeight: 700, fontFamily: "'Rajdhani', system-ui, sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                                            Viajes disponibles desde <span style={{ color: tema.color }}>{deptNombre}</span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                            {viajes.length === 0 && (
                                                <div style={{ color: '#475569', fontSize: '0.85rem', padding: '1.5rem', background: '#0d1a2e', borderRadius: '10px', gridColumn: '1/-1' }}>
                                                    No hay viajes disponibles desde {deptNombre}.
                                                </div>
                                            )}
                                            {viajes.map(v => {
                                                const pasado = esPasado(v.fecha_salida);
                                                const seleccionado = boleto.viajeId === v.id;
                                                return (
                                                    <div key={v.id} onClick={() => handleSeleccionarViaje(v)} title={pasado ? 'Viaje ya salió' : ''} style={{
                                                        background: pasado ? '#0d1320' : seleccionado ? `${tema.color}20` : '#0d1a2e',
                                                        border: `1px solid ${pasado ? '#1e293b' : seleccionado ? tema.color : '#1e293b'}`,
                                                        borderRadius: '10px', padding: '0.85rem 1rem',
                                                        cursor: pasado ? 'not-allowed' : 'pointer',
                                                        opacity: pasado ? 0.45 : 1, transition: 'all 0.15s',
                                                    }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <div style={{ fontWeight: 600, color: pasado ? '#475569' : '#f1f5f9', fontSize: '0.88rem' }}>{v.origen} → {v.destino}</div>
                                                            {pasado && <span style={{ fontSize: '0.65rem', color: '#475569', background: '#1e293b', borderRadius: 4, padding: '0.1rem 0.4rem' }}>Salió</span>}
                                                            {seleccionado && !pasado && <span style={{ fontSize: '0.65rem', background: `${tema.color}30`, color: tema.acento, borderRadius: 4, padding: '0.1rem 0.4rem', fontWeight: 700 }}>✓</span>}
                                                        </div>
                                                        <div style={{ color: pasado ? '#334155' : '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>{new Date(v.fecha_salida).toLocaleString('es-BO')}</div>
                                                        <div style={{ color: pasado ? '#334155' : '#10b981', fontWeight: 700, fontSize: '0.9rem', marginTop: '0.35rem' }}>Bs {v.precio}/asiento</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <button onClick={() => setPasoActivo(2)} style={{
                                                background: boleto.viajeId ? tema.color : '#1e293b', color: '#fff', border: 'none',
                                                borderRadius: 8, padding: '0.65rem 1.5rem', fontWeight: 700, cursor: 'pointer',
                                                fontSize: '0.85rem', fontFamily: "'Rajdhani', system-ui, sans-serif", textTransform: 'uppercase',
                                                boxShadow: boleto.viajeId ? `0 4px 14px ${tema.color}40` : 'none',
                                            }}>Siguiente →</button>
                                        </div>
                                    </div>
                                )}

                                {/* ── Paso 2: Pasajero ── */}
                                {pasoActivo === 2 && !pagado && (
                                    <div style={{ maxWidth: 560 }}>
                                        <div style={{ color: tema.acento, fontSize: '0.72rem', fontWeight: 700, fontFamily: "'Rajdhani', system-ui, sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                                            Datos del pasajero
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                            {[
                                                { key: 'pasajeroNombre', label: 'Nombre completo', type: 'text', req: true },
                                                { key: 'pasajeroCI', label: 'Carnet de Identidad', type: 'text', req: true },
                                                { key: 'pasajeroTelefono', label: 'Teléfono', type: 'tel', req: false },
                                                { key: 'pasajeroEmail', label: 'Correo electrónico', type: 'email', req: false },
                                            ].map(f => (
                                                <div key={f.key}>
                                                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        {f.label}{f.req && <span style={{ color: '#f87171', marginLeft: '0.25rem' }}>*</span>}
                                                    </label>
                                                    <input type={f.type} value={boleto[f.key]}
                                                        onChange={e => setBoleto(prev => ({ ...prev, [f.key]: e.target.value }))}
                                                        style={inputStyle}
                                                        onFocus={e => e.target.style.borderColor = tema.color}
                                                        onBlur={e => e.target.style.borderColor = `${tema.color}40`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ marginBottom: '1.25rem' }}>
                                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Método de pago</label>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                {[{ val: 'efectivo', label: '💵 Efectivo' }, { val: 'qr', label: '📱 QR' }, { val: 'tarjeta', label: '💳 Tarjeta' }].map(m => (
                                                    <button key={m.val} type="button" onClick={() => setBoleto(prev => ({ ...prev, metodoPago: m.val }))} style={{
                                                        flex: 1, padding: '0.6rem', borderRadius: 8, border: 'none',
                                                        background: boleto.metodoPago === m.val ? `${tema.color}25` : '#0d1a2e',
                                                        color: boleto.metodoPago === m.val ? tema.acento : '#64748b',
                                                        outline: boleto.metodoPago === m.val ? `1px solid ${tema.color}60` : '1px solid #1e293b',
                                                        fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
                                                    }}>{m.label}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                                            <button onClick={() => setPasoActivo(1)} style={{ background: 'transparent', border: '1px solid #334155', color: '#64748b', borderRadius: 8, padding: '0.65rem 1.25rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', fontFamily: "'Rajdhani', system-ui, sans-serif", textTransform: 'uppercase' }}>← Anterior</button>
                                            <button onClick={() => setPasoActivo(3)} style={{
                                                background: boleto.pasajeroNombre && boleto.pasajeroCI ? tema.color : '#1e293b',
                                                color: '#fff', border: 'none', borderRadius: 8, padding: '0.65rem 1.5rem',
                                                fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem',
                                                fontFamily: "'Rajdhani', system-ui, sans-serif", textTransform: 'uppercase',
                                                boxShadow: boleto.pasajeroNombre && boleto.pasajeroCI ? `0 4px 14px ${tema.color}40` : 'none',
                                            }}>Siguiente →</button>
                                        </div>
                                    </div>
                                )}

                                {/* ── Paso 3: Asientos ── */}
                                {pasoActivo === 3 && !pagado && (
                                    <div>
                                        <div style={{ color: tema.acento, fontSize: '0.72rem', fontWeight: 700, fontFamily: "'Rajdhani', system-ui, sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                                            Seleccionar asientos{boleto.asientosSeleccionados.length > 0 && <span style={{ color: tema.color }}> — {boleto.asientosSeleccionados.join(', ')}</span>}
                                        </div>
                                        {!boleto.viajeId ? (
                                            <div style={{ color: '#475569', fontSize: '0.85rem', padding: '2rem', background: '#0d1a2e', borderRadius: '10px', border: '1px solid #1e293b', textAlign: 'center', marginBottom: '1.25rem' }}>
                                                Vuelve al paso 1 para seleccionar un viaje primero
                                            </div>
                                        ) : (
                                            <div style={{ background: '#0d1a2e', borderRadius: '12px', border: `1px solid ${tema.color}25`, overflow: 'hidden', marginBottom: '1.25rem', maxWidth: 360 }}>
                                                <div style={{ background: tema.bg, borderBottom: `1px solid ${tema.color}20`, padding: '0.6rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                    <span style={{ fontSize: '0.72rem', color: '#475569' }}>🚌 {boleto.busPlaca}</span>
                                                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                                                        {[
                                                            { bg: '#131f35', border: '#1e3a5f', label: 'Libre' },
                                                            { bg: `${tema.color}30`, border: tema.color, label: 'Selec.' },
                                                            { bg: '#1e293b', border: '#374151', label: 'Ocupado' },
                                                            { bg: '#2d1a4a', border: '#4c1d95', label: 'Bloq.' },
                                                        ].map(l => (
                                                            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                                <div style={{ width: 10, height: 10, borderRadius: '2px', background: l.bg, border: `1px solid ${l.border}` }} />
                                                                <span style={{ fontSize: '0.6rem', color: '#64748b' }}>{l.label}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div style={{ padding: '1rem', overflowY: 'auto', maxHeight: 360 }}>
                                                    <div style={{ textAlign: 'center', fontSize: '0.62rem', color: '#334155', marginBottom: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>▲ FRENTE</div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr 1fr 14px 1fr 1fr', gap: '0.3rem', marginBottom: '0.35rem' }}>
                                                        <div />
                                                        {['A', 'B'].map(c => <div key={c} style={{ textAlign: 'center', fontSize: '0.62rem', color: '#475569', fontWeight: 700 }}>{c}</div>)}
                                                        <div />
                                                        {['C', 'D'].map(c => <div key={c} style={{ textAlign: 'center', fontSize: '0.62rem', color: '#475569', fontWeight: 700 }}>{c}</div>)}
                                                    </div>
                                                    {Array.from({ length: 10 }, (_, i) => i + 1).map(fila => (
                                                        <div key={fila} style={{ display: 'grid', gridTemplateColumns: '26px 1fr 1fr 14px 1fr 1fr', gap: '0.3rem', marginBottom: '0.28rem', alignItems: 'center' }}>
                                                            <div style={{ textAlign: 'center', fontSize: '0.62rem', color: '#334155', fontWeight: 700 }}>{fila}</div>
                                                            {COLS_ASIENTO.map((col, colIdx) => {
                                                                const id = `${fila}${col}`;
                                                                const ocupado = asientosOcupados.includes(id);
                                                                const bloqueado = !ocupado && bloqueados.includes(id);
                                                                const seleccionado = boleto.asientosSeleccionados.includes(id);
                                                                const seatBtn = (
                                                                    <button key={id}
                                                                        onClick={() => !ocupado && !bloqueado && toggleAsiento(id)}
                                                                        disabled={ocupado || bloqueado}
                                                                        style={{
                                                                            padding: '0.38rem 0',
                                                                            background: ocupado ? '#1e293b' : bloqueado ? '#2d1a4a' : seleccionado ? `${tema.color}30` : '#131f35',
                                                                            border: `1px solid ${ocupado ? '#374151' : bloqueado ? '#4c1d95' : seleccionado ? tema.color : '#1e3a5f'}`,
                                                                            color: ocupado ? '#374151' : bloqueado ? '#a78bfa' : seleccionado ? tema.acento : '#64748b',
                                                                            borderRadius: '5px', cursor: ocupado || bloqueado ? 'not-allowed' : 'pointer',
                                                                            fontSize: '0.65rem', fontWeight: 600, transition: 'all 0.12s', width: '100%',
                                                                        }}>{id}</button>
                                                                );
                                                                if (colIdx === 1) return [seatBtn, <div key={`aisle-${fila}`} style={{ width: '100%' }} />];
                                                                return seatBtn;
                                                            })}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                                            <button onClick={() => setPasoActivo(2)} style={{ background: 'transparent', border: '1px solid #334155', color: '#64748b', borderRadius: 8, padding: '0.65rem 1.25rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', fontFamily: "'Rajdhani', system-ui, sans-serif", textTransform: 'uppercase' }}>← Anterior</button>
                                            <button onClick={() => setPasoActivo(4)} style={{
                                                background: boleto.asientosSeleccionados.length > 0 ? tema.color : '#1e293b',
                                                color: '#fff', border: 'none', borderRadius: 8, padding: '0.65rem 1.5rem',
                                                fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem',
                                                fontFamily: "'Rajdhani', system-ui, sans-serif", textTransform: 'uppercase',
                                                boxShadow: boleto.asientosSeleccionados.length > 0 ? `0 4px 14px ${tema.color}40` : 'none',
                                            }}>Ir a Pago →</button>
                                        </div>
                                    </div>
                                )}

                                {/* ── Paso 4: Pago ── */}
                                {pasoActivo === 4 && !pagado && (() => {
                                    const listo = boleto.viajeId && boleto.pasajeroNombre && boleto.pasajeroCI && boleto.asientosSeleccionados.length > 0;
                                    return (
                                        <div style={{ maxWidth: 480, margin: '0 auto' }}>
                                            {/* Resumen */}
                                            <div style={{ background: '#0d1a2e', border: `1px solid ${tema.color}30`, borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
                                                <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', fontFamily: "'Rajdhani', system-ui, sans-serif", fontWeight: 700 }}>Resumen del boleto</div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                                                    {[
                                                        ['Pasajero', boleto.pasajeroNombre || '⚠ Pendiente', boleto.pasajeroNombre],
                                                        ['CI', boleto.pasajeroCI || '⚠ Pendiente', boleto.pasajeroCI],
                                                        ['Ruta', boleto.viajeId ? `${boleto.origen} → ${boleto.destino}` : '⚠ Sin viaje', boleto.viajeId],
                                                        ['Asientos', boleto.asientosSeleccionados.length > 0 ? boleto.asientosSeleccionados.join(', ') : '⚠ Sin seleccionar', boleto.asientosSeleccionados.length > 0],
                                                        ['Método', { efectivo: '💵 Efectivo', qr: '📱 QR', tarjeta: '💳 Tarjeta' }[boleto.metodoPago], true],
                                                    ].map(([k, v, ok]) => (
                                                        <React.Fragment key={k}>
                                                            <span style={{ color: '#64748b' }}>{k}</span>
                                                            <span style={{ color: ok ? (k === 'Asientos' ? tema.acento : '#f1f5f9') : '#ef4444', fontWeight: k === 'Asientos' || k === 'Pasajero' ? 600 : 400 }}>{v}</span>
                                                        </React.Fragment>
                                                    ))}
                                                </div>
                                                <div style={{ borderTop: `1px solid ${tema.color}20`, marginTop: '1rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ color: '#64748b', fontSize: '0.88rem' }}>Total a cobrar</span>
                                                    <span style={{ color: '#10b981', fontSize: '1.4rem', fontWeight: 800 }}>Bs {totalPago.toFixed(2)}</span>
                                                </div>
                                            </div>

                                            {/* Warning incompleto */}
                                            {!listo && (
                                                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid #92400e', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#fbbf24' }}>
                                                    ⚠ Completa los pasos anteriores para habilitar el pago
                                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                                        {!boleto.viajeId && <button onClick={() => setPasoActivo(1)} style={{ background: '#92400e', border: 'none', color: '#fbbf24', borderRadius: 6, padding: '0.2rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>→ Viaje</button>}
                                                        {(!boleto.pasajeroNombre || !boleto.pasajeroCI) && <button onClick={() => setPasoActivo(2)} style={{ background: '#92400e', border: 'none', color: '#fbbf24', borderRadius: 6, padding: '0.2rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>→ Pasajero</button>}
                                                        {boleto.asientosSeleccionados.length === 0 && <button onClick={() => setPasoActivo(3)} style={{ background: '#92400e', border: 'none', color: '#fbbf24', borderRadius: 6, padding: '0.2rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>→ Asientos</button>}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Efectivo */}
                                            {boleto.metodoPago === 'efectivo' && (
                                                <div style={{ background: '#0d1a2e', border: '1px solid #1e293b', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', marginBottom: '0.75rem' }}>
                                                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💵</div>
                                                    <div style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: '0.35rem' }}>Pago en efectivo</div>
                                                    <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>Recibe <strong style={{ color: '#10b981' }}>Bs {totalPago.toFixed(2)}</strong> y confirma.</div>
                                                    <button onClick={handleConfirmarPago} disabled={!listo} style={{
                                                        background: listo ? '#10b981' : '#1e293b', color: '#fff', border: 'none', borderRadius: 10, padding: '0.85rem 2rem',
                                                        fontWeight: 700, fontSize: '0.95rem', cursor: listo ? 'pointer' : 'not-allowed', width: '100%',
                                                        boxShadow: listo ? '0 4px 16px rgba(16,185,129,0.35)' : 'none',
                                                    }}>✅ Efectivo recibido — Emitir boleto</button>
                                                </div>
                                            )}
                                            {/* QR */}
                                            {boleto.metodoPago === 'qr' && (
                                                <div style={{ background: '#0d1a2e', border: '1px solid #1e293b', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', marginBottom: '0.75rem' }}>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem' }}>Muestra este código al cliente</div>
                                                    <div style={{ width: 140, height: 140, margin: '0 auto 1rem', background: '#fff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 4px #0d1a2e, 0 0 0 6px #334155' }}>
                                                        <div style={{ textAlign: 'center' }}>
                                                            <div style={{ fontSize: '3rem', lineHeight: 1 }}>▦</div>
                                                            <div style={{ fontSize: '0.5rem', color: '#334155', marginTop: '0.3rem' }}>TBB · Bs {totalPago.toFixed(2)}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ color: '#f59e0b', fontSize: '0.8rem', marginBottom: '1rem' }}>Esperando confirmación...</div>
                                                    <button onClick={handleConfirmarPago} disabled={!listo} style={{
                                                        background: listo ? '#f59e0b' : '#1e293b', color: listo ? '#0d1a2e' : '#475569', border: 'none', borderRadius: 10, padding: '0.85rem 2rem',
                                                        fontWeight: 700, fontSize: '0.95rem', cursor: listo ? 'pointer' : 'not-allowed', width: '100%',
                                                    }}>📱 QR pagado — Emitir boleto</button>
                                                </div>
                                            )}
                                            {/* Tarjeta */}
                                            {boleto.metodoPago === 'tarjeta' && (
                                                <div style={{ background: '#0d1a2e', border: '1px solid #1e293b', borderRadius: '12px', padding: '1.5rem', marginBottom: '0.75rem' }}>
                                                    <div style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: '1rem' }}>💳 Datos de la tarjeta</div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1rem' }}>
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Número</label>
                                                            <input type="text" maxLength={19} placeholder="0000 0000 0000 0000" value={datosTarjeta.numero}
                                                                onChange={e => setDatosTarjeta(prev => ({ ...prev, numero: e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim() }))}
                                                                style={inputStyle} onFocus={e => e.target.style.borderColor = tema.color} onBlur={e => e.target.style.borderColor = `${tema.color}40`} />
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                                                            <div>
                                                                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Vencimiento</label>
                                                                <input type="text" maxLength={5} placeholder="MM/AA" value={datosTarjeta.expiry}
                                                                    onChange={e => setDatosTarjeta(prev => ({ ...prev, expiry: e.target.value }))}
                                                                    style={inputStyle} onFocus={e => e.target.style.borderColor = tema.color} onBlur={e => e.target.style.borderColor = `${tema.color}40`} />
                                                            </div>
                                                            <div>
                                                                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.3rem' }}>CVV</label>
                                                                <input type="password" maxLength={4} placeholder="•••" value={datosTarjeta.cvv}
                                                                    onChange={e => setDatosTarjeta(prev => ({ ...prev, cvv: e.target.value }))}
                                                                    style={inputStyle} onFocus={e => e.target.style.borderColor = tema.color} onBlur={e => e.target.style.borderColor = `${tema.color}40`} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button onClick={handleConfirmarPago}
                                                        disabled={!listo || datosTarjeta.numero.replace(/\s/g, '').length < 16 || !datosTarjeta.expiry || datosTarjeta.cvv.length < 3}
                                                        style={{
                                                            background: (listo && datosTarjeta.numero.replace(/\s/g, '').length >= 16 && datosTarjeta.expiry && datosTarjeta.cvv.length >= 3) ? '#3b82f6' : '#1e293b',
                                                            color: '#fff', border: 'none', borderRadius: 10, padding: '0.85rem',
                                                            fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', width: '100%',
                                                        }}>💳 Procesar pago y emitir boleto</button>
                                                </div>
                                            )}

                                            <button onClick={() => setPasoActivo(3)} style={{
                                                background: 'transparent', border: '1px solid #334155', color: '#64748b',
                                                borderRadius: 10, padding: '0.65rem', cursor: 'pointer', fontSize: '0.85rem', width: '100%',
                                                fontFamily: "'Rajdhani', system-ui, sans-serif", textTransform: 'uppercase',
                                            }}>← Volver a asientos</button>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* ── Pendientes de validación ── */}
                        {tab === 'pendientes' && (
                            <div data-anim="content">
                                <h2 style={{ ...tituloStyle, marginBottom: '0.35rem' }}>Pendientes de Validación</h2>
                                <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
                                    Reservas con infantes o declaraciones especiales que requieren verificación presencial.
                                </p>
                                {pendientesValidacion.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: '#475569', padding: '3rem', background: '#0d1a2e', borderRadius: '12px', border: '1px solid #1e293b' }}>
                                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
                                        Sin reservas pendientes de validación.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {pendientesValidacion.map(r => {
                                            const pasajeros = Object.values(r.pasajeros || {});
                                            const tieneInfante = pasajeros.some(p => p.esInfante);
                                            const tieneDeclaracion = pasajeros.some(p => p.lleva1000 || p.llevaAnimales || p.llevaProductos);
                                            const aprobado = aprobados[r.id];
                                            return (
                                                <div key={r.id} style={{ background: '#0d1a2e', borderRadius: '14px', border: `1px solid ${aprobado ? '#065f46' : '#4c1d95'}`, padding: '1.25rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                        <div>
                                                            <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '1rem' }}>{r.pasajeroNombre}</div>
                                                            <div style={{ color: '#64748b', fontSize: '0.78rem' }}>CI: {r.pasajeroCI} · Tel: {r.pasajeroTelefono || '—'}</div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                            {aprobado && <span style={{ background: '#065f46', color: '#6ee7b7', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>✓ APROBADO</span>}
                                                            {tieneInfante && <span style={{ background: '#78350f', color: '#fbbf24', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>INFANTE</span>}
                                                            {tieneDeclaracion && <span style={{ background: '#7f1d1d', color: '#fca5a5', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>DECLARACIÓN</span>}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.8rem' }}>
                                                        <div>
                                                            <div style={{ color: '#475569', fontSize: '0.7rem' }}>RUTA</div>
                                                            <div style={{ color: '#94a3b8', fontWeight: 600 }}>{r.origen} → {r.destino}</div>
                                                        </div>
                                                        <div>
                                                            <div style={{ color: '#475569', fontSize: '0.7rem' }}>ASIENTOS</div>
                                                            <div style={{ color: tema.acento, fontWeight: 700 }}>{r.asientos?.join(', ')}</div>
                                                        </div>
                                                        <div>
                                                            <div style={{ color: '#475569', fontSize: '0.7rem' }}>MONTO</div>
                                                            <div style={{ color: '#10b981', fontWeight: 700 }}>Bs {r.precio}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ marginBottom: '0.75rem', background: 'rgba(124,58,237,0.08)', borderRadius: '8px', padding: '0.6rem', fontSize: '0.75rem', color: '#a78bfa' }}>
                                                        ID: {r.id}
                                                        {aprobado?.email && <span style={{ marginLeft: '1rem', color: '#6ee7b7' }}>📧 {aprobado.email}</span>}
                                                    </div>

                                                    {/* Boletos aprobados — TicketCards ocultos para PDF + preview */}
                                                    {aprobado && (
                                                        <div style={{ marginBottom: '0.85rem' }}>
                                                            <div style={{ color: '#6ee7b7', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                                ✓ Boletos emitidos — vista previa:
                                                            </div>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                                                {aprobado.boletos.map(b => {
                                                                    const te = getTemaEmpresa(aprobado.nombreEmpresa);
                                                                    const logoSrc = getLogoEmpresa(aprobado.nombreEmpresa);
                                                                    const W = 600, H = 360, SCALE = 0.33;
                                                                    return (
                                                                        <div key={b.id} style={{ position: 'relative' }}>
                                                                            {/* Visible miniatura */}
                                                                            <div style={{ width: W * SCALE, height: H * SCALE, overflow: 'hidden', borderRadius: 24 * SCALE, flexShrink: 0, pointerEvents: 'none' }}>
                                                                                <div style={{ width: W, height: H, transform: `scale(${SCALE})`, transformOrigin: 'top left' }}>
                                                                                    <TicketCard boleto={b} te={te} logoSrc={logoSrc} empresaNombre={aprobado.nombreEmpresa} />
                                                                                </div>
                                                                            </div>
                                                                            {/* Copia tamaño real oculta para html2canvas */}
                                                                            <div data-ticket-cajero={r.id} style={{ position: 'fixed', left: '-9999px', top: 0, width: 600, pointerEvents: 'none' }}>
                                                                                <TicketCard boleto={b} te={te} logoSrc={logoSrc} empresaNombre={aprobado.nombreEmpresa} />
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                                                        {!aprobado && (
                                                            <>
                                                                <button onClick={() => handleRechazarReserva(r.id)} style={{
                                                                    flex: 1, padding: '0.6rem', background: 'rgba(239,68,68,0.12)',
                                                                    border: '1px solid #7f1d1d', color: '#fca5a5',
                                                                    borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
                                                                }}>
                                                                    Rechazar
                                                                </button>
                                                                <button onClick={() => handleAprobarReserva(r.id)} style={{
                                                                    flex: 2, padding: '0.6rem', background: 'rgba(16,185,129,0.15)',
                                                                    border: '1px solid #065f46', color: '#6ee7b7',
                                                                    borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                                                                }}>
                                                                    Aprobar y Emitir Boletos
                                                                </button>
                                                            </>
                                                        )}
                                                        {aprobado && (
                                                            <button
                                                                onClick={() => handleDescargarPDFAprobado(r.id)}
                                                                disabled={pdfEnProceso === r.id}
                                                                style={{
                                                                    flex: 1, padding: '0.6rem', background: pdfEnProceso === r.id ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.18)',
                                                                    border: '1px solid #065f46', color: '#6ee7b7',
                                                                    borderRadius: '8px', cursor: pdfEnProceso === r.id ? 'not-allowed' : 'pointer',
                                                                    fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                                                                }}
                                                            >
                                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                                                {pdfEnProceso === r.id ? 'Generando...' : 'Descargar PDF para imprimir'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Reservas ── */}
                        {tab === 'reservas' && (
                            <div data-anim="content">
                                <h2 style={{ ...tituloStyle, marginBottom: '1rem' }}>Gestión de Reservas</h2>
                                <input
                                    type="text" placeholder="Buscar por nombre, CI o ID..."
                                    value={busqueda} onChange={e => setBusqueda(e.target.value)}
                                    style={{ ...inputStyle, marginBottom: '1rem' }}
                                />
                                <div style={{ background: '#0d1a2e', borderRadius: '12px', border: '1px solid #1e293b', overflow: 'hidden' }}>
                                    {reservasFiltradas.length === 0 ? (
                                        <div style={{ textAlign: 'center', color: '#475569', padding: '2.5rem' }}>
                                            {busqueda ? 'Sin resultados.' : 'No hay reservas registradas.'}
                                        </div>
                                    ) : (
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                                                <thead>
                                                    <tr style={{ background: tema.bg, borderBottom: `1px solid ${tema.color}20` }}>
                                                        {['Pasajero', 'CI', 'Ruta', 'Asientos', 'Monto', 'Método', 'Estado', 'Fecha'].map(h => (
                                                            <th key={h} style={{ padding: '0.75rem 0.6rem', textAlign: 'left', color: '#475569', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {reservasFiltradas.map(r => (
                                                        <tr key={r.id} style={{ borderBottom: '1px solid #0d1a2e' }}>
                                                            <td style={{ padding: '0.6rem 0.6rem', color: '#f1f5f9', fontWeight: 500 }}>{r.pasajeroNombre}</td>
                                                            <td style={{ padding: '0.6rem 0.6rem', color: '#94a3b8' }}>{r.pasajeroCI}</td>
                                                            <td style={{ padding: '0.6rem 0.6rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{r.origen} → {r.destino}</td>
                                                            <td style={{ padding: '0.6rem 0.6rem', color: tema.acento }}>{r.asientos?.join(', ')}</td>
                                                            <td style={{ padding: '0.6rem 0.6rem', color: '#10b981', fontWeight: 600 }}>Bs {r.precio}</td>
                                                            <td style={{ padding: '0.6rem 0.6rem', color: '#64748b', fontSize: '0.75rem' }}>{r.metodoPago || '—'}</td>
                                                            <td style={{ padding: '0.6rem 0.6rem' }}>
                                                                {(() => {
                                                                    const ES = {
                                                                        confirmada: { bg: '#065f46', c: '#6ee7b7' },
                                                                        pendiente_efectivo: { bg: '#92400e', c: '#fbbf24' },
                                                                        pendiente_documentos: { bg: '#4c1d95', c: '#c4b5fd' },
                                                                        cancelada: { bg: '#7f1d1d', c: '#fca5a5' },
                                                                    }[r.estado] || { bg: '#1e293b', c: '#64748b' };
                                                                    return (
                                                                        <span style={{ background: ES.bg, color: ES.c, padding: '0.15rem 0.55rem', borderRadius: '999px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                                                                            {r.estado?.replace('_', ' ')}
                                                                        </span>
                                                                    );
                                                                })()}
                                                            </td>
                                                            <td style={{ padding: '0.6rem 0.6rem', color: '#475569', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                                                                {new Date(r.creadoEn).toLocaleDateString('es-BO')}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── Notificaciones ── */}
                        {tab === 'notificaciones' && (
                            <div data-anim="content">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                    <h2 style={{ ...tituloStyle, margin: 0 }}>
                                        Notificaciones
                                        {noLeidas > 0 && (
                                            <span style={{
                                                marginLeft: '0.6rem', background: '#ef4444', color: '#fff',
                                                borderRadius: 12, fontSize: '0.7rem', fontWeight: 800,
                                                padding: '0.1rem 0.55rem', verticalAlign: 'middle',
                                            }}>{noLeidas} nueva{noLeidas !== 1 ? 's' : ''}</span>
                                        )}
                                    </h2>
                                    {noLeidas > 0 && (
                                        <button onClick={handleMarcarTodas} style={{
                                            background: 'transparent', border: `1px solid ${tema.color}40`,
                                            color: tema.acento, padding: '0.4rem 0.9rem', borderRadius: 8,
                                            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                                        }}>
                                            ✓ Marcar todas leídas
                                        </button>
                                    )}
                                </div>

                                {notifs.length === 0 ? (
                                    <div style={{
                                        background: '#0d1a2e', borderRadius: 12, border: '1px solid #1e293b',
                                        padding: '3rem', textAlign: 'center', color: '#475569', fontSize: '0.9rem',
                                    }}>
                                        Sin notificaciones recibidas
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                        {notifs.map(n => (
                                            <div
                                                key={n.id}
                                                onClick={() => !n.leido && handleMarcarLeida(n.id)}
                                                style={{
                                                    display: 'flex', gap: '1rem', alignItems: 'flex-start',
                                                    background: n.leido ? '#0b1628' : `${tema.color}0a`,
                                                    border: `1px solid ${n.leido ? '#1e293b' : tema.color + '35'}`,
                                                    borderRadius: 10, padding: '0.9rem 1.1rem',
                                                    cursor: n.leido ? 'default' : 'pointer',
                                                    transition: 'all 0.15s',
                                                }}
                                                onMouseEnter={e => { if (!n.leido) e.currentTarget.style.background = `${tema.color}14`; }}
                                                onMouseLeave={e => { if (!n.leido) e.currentTarget.style.background = `${tema.color}0a`; }}
                                            >
                                                <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>
                                                    {n.leido ? '📭' : '📬'}
                                                </span>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{
                                                        fontSize: '0.88rem', lineHeight: 1.5,
                                                        color: n.leido ? '#64748b' : '#e2e8f0',
                                                        fontWeight: n.leido ? 400 : 500,
                                                        marginBottom: '0.3rem',
                                                    }}>
                                                        {n.mensaje}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.72rem', color: '#475569' }}>
                                                        <span>{n.fecha} {n.hora}</span>
                                                        {n.viajeId && <span>· Viaje: {n.viajeId}</span>}
                                                        {n.busPlaca && <span>· Bus: {n.busPlaca}</span>}
                                                    </div>
                                                </div>
                                                {!n.leido && (
                                                    <span style={{
                                                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                                        background: tema.color, marginTop: 6,
                                                    }} />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Ventas ── */}
                        {tab === 'ventas' && (
                            <div data-anim="content">
                                <h2 style={{ ...tituloStyle, marginBottom: '1rem' }}>Registro de Ventas</h2>
                                <div style={{ background: '#0d1a2e', borderRadius: '12px', border: '1px solid #1e293b', overflow: 'hidden' }}>
                                    {ventas.length === 0 ? (
                                        <div style={{ textAlign: 'center', color: '#475569', padding: '2.5rem' }}>No hay ventas registradas.</div>
                                    ) : (
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                                                <thead>
                                                    <tr style={{ background: tema.bg, borderBottom: `1px solid ${tema.color}20` }}>
                                                        {['Ruta', 'Boletos', 'Monto', 'Fecha'].map(h => (
                                                            <th key={h} style={{ padding: '0.75rem 0.6rem', textAlign: 'left', color: '#475569', fontWeight: 500 }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {ventas.map(v => (
                                                        <tr key={v.id} style={{ borderBottom: '1px solid #0d1a2e' }}>
                                                            <td style={{ padding: '0.6rem 0.6rem', color: '#f1f5f9' }}>{v.ruta}</td>
                                                            <td style={{ padding: '0.6rem 0.6rem', color: tema.acento, fontWeight: 600 }}>{v.boletos}</td>
                                                            <td style={{ padding: '0.6rem 0.6rem', color: '#10b981', fontWeight: 600 }}>Bs {v.monto}</td>
                                                            <td style={{ padding: '0.6rem 0.6rem', color: '#475569', fontSize: '0.75rem' }}>
                                                                {new Date(v.fecha).toLocaleString('es-BO')}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </>
    );
};

export default PanelCajero;
