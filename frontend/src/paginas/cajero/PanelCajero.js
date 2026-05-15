import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS, ciudadADepartamento } from '../../contextos/DepartamentoContext';
import { obtenerReservas, obtenerVentas, crearReserva } from '../../data/mockStorage';
import { SUCURSALES_MOCK, obtenerViajesSucursal } from '../../data/mockDiscoveryDB';
import gsap from 'gsap';

const CIUDADES_BO = ['La Paz', 'Cochabamba', 'Santa Cruz', 'Oruro', 'Potosí', 'Sucre', 'Tarija', 'Trinidad', 'Cobija'];

const generarAsientos = () => {
    const asientos = [];
    for (let fila = 1; fila <= 10; fila++) {
        ['A', 'B', 'C', 'D'].forEach(col => asientos.push(`${fila}${col}`));
    }
    return asientos;
};

const PanelCajero = () => {
    const navigate = useNavigate();
    const { perfil, logout } = useAuth();
    const rootRef = useRef(null);

    // Detectar departamento y sucursal automáticamente desde el perfil
    const sucursalInfo = SUCURSALES_MOCK.find(s => s.id === perfil?.sucursal_id) || SUCURSALES_MOCK[0];
    const deptNombre = perfil?.departamento || sucursalInfo?.departamento || 'La Paz';
    const tema = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];

    const [tab, setTab] = useState('dashboard');
    const [reservas, setReservas] = useState([]);
    const [ventas, setVentas] = useState([]);
    const [busqueda, setBusqueda] = useState('');

    // Estado para crear boleto
    const [viajes, setViajes] = useState([]);
    const [boleto, setBoleto] = useState({
        viajeId: '',
        pasajeroNombre: '',
        pasajeroCI: '',
        pasajeroTelefono: '',
        asientosSeleccionados: [],
        metodoPago: 'efectivo',
        origen: '',
        destino: '',
        precio: 0,
        busPlaca: 'ABC-1234',
        fechaSalida: '',
    });
    const [mensajeBoleto, setMensajeBoleto] = useState(null);
    const [boletoCreado, setBoletoCreado] = useState(null);

    const recargar = useCallback(() => {
        setReservas(obtenerReservas());
        setVentas(obtenerVentas());
        // Cargar viajes de todas las sucursales
        const todos = SUCURSALES_MOCK.flatMap(s => obtenerViajesSucursal(s.id));
        setViajes(todos);
    }, []);

    useEffect(() => {
        recargar();
    }, [recargar]);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-anim="header"]', { y: -30, opacity: 0, duration: 0.5, ease: 'power3.out' });
            gsap.from('[data-anim="sidebar"]', { x: -40, opacity: 0, duration: 0.55, ease: 'power3.out', delay: 0.1 });
            gsap.from('[data-anim="main"]', { y: 20, opacity: 0, duration: 0.5, ease: 'power3.out', delay: 0.2 });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    // Animar cambio de tab
    useEffect(() => {
        gsap.from('[data-anim="content"]', { opacity: 0, y: 16, duration: 0.35, ease: 'power2.out' });
    }, [tab]);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const reservasFiltradas = reservas.filter(r =>
        !busqueda ||
        r.pasajeroNombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.pasajeroCI?.includes(busqueda) ||
        r.id?.includes(busqueda)
    );

    const totalIngresos = ventas.reduce((acc, v) => acc + (v.monto || 0), 0);
    const totalBoletos = ventas.reduce((acc, v) => acc + (v.boletos || 0), 0);

    const viajeSeleccionado = viajes.find(v => v.id === boleto.viajeId);

    const handleSeleccionarViaje = (v) => {
        setBoleto(prev => ({
            ...prev,
            viajeId: v.id,
            origen: v.origen,
            destino: v.destino,
            precio: v.precio,
            fechaSalida: v.salida,
            asientosSeleccionados: [],
        }));
    };

    const toggleAsiento = (asiento) => {
        setBoleto(prev => {
            const ya = prev.asientosSeleccionados.includes(asiento);
            const nuevos = ya
                ? prev.asientosSeleccionados.filter(a => a !== asiento)
                : [...prev.asientosSeleccionados, asiento];
            return { ...prev, asientosSeleccionados: nuevos };
        });
    };

    const asientosOcupados = boleto.viajeId
        ? obtenerReservas(boleto.viajeId).flatMap(r => r.asientos)
        : [];

    const handleCrearBoleto = (e) => {
        e.preventDefault();
        setMensajeBoleto(null);
        if (!boleto.viajeId) return setMensajeBoleto({ tipo: 'error', texto: 'Selecciona un viaje.' });
        if (boleto.asientosSeleccionados.length === 0) return setMensajeBoleto({ tipo: 'error', texto: 'Selecciona al menos un asiento.' });
        if (!boleto.pasajeroNombre || !boleto.pasajeroCI) return setMensajeBoleto({ tipo: 'error', texto: 'Nombre y CI son obligatorios.' });

        const resultado = crearReserva({
            viajeId: boleto.viajeId,
            pasajeroNombre: boleto.pasajeroNombre,
            pasajeroCI: boleto.pasajeroCI,
            pasajeroTelefono: boleto.pasajeroTelefono,
            asientos: boleto.asientosSeleccionados,
            busPlaca: boleto.busPlaca,
            origen: boleto.origen,
            destino: boleto.destino,
            precio: boleto.precio * boleto.asientosSeleccionados.length,
            fechaSalida: boleto.fechaSalida,
            metodoPago: boleto.metodoPago,
        });

        if (resultado.error) {
            setMensajeBoleto({ tipo: 'error', texto: resultado.mensaje });
        } else {
            setBoletoCreado(resultado);
            setMensajeBoleto({ tipo: 'ok', texto: `Boleto creado exitosamente. ID: ${resultado.id.slice(0, 16)}` });
            recargar();
            setBoleto({ viajeId: '', pasajeroNombre: '', pasajeroCI: '', pasajeroTelefono: '', asientosSeleccionados: [], metodoPago: 'efectivo', origen: '', destino: '', precio: 0, busPlaca: 'ABC-1234', fechaSalida: '' });
        }
    };

    const TABS = [
        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'crear-boleto', icon: '🎫', label: 'Crear Boleto' },
        { id: 'reservas', icon: '📋', label: 'Reservas' },
        { id: 'ventas', icon: '💰', label: 'Ventas' },
    ];

    const inputStyle = {
        width: '100%', boxSizing: 'border-box',
        background: '#0d1a2e', border: `1px solid ${tema.color}40`,
        color: '#f1f5f9', padding: '0.65rem 1rem',
        borderRadius: '8px', fontSize: '0.88rem',
        outline: 'none', transition: 'border-color 0.2s',
    };

    return (
        <div ref={rootRef} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#07111f', color: '#dde5f0', fontFamily: "'Inter', system-ui, sans-serif" }}>

            {/* Header */}
            <header data-anim="header" style={{
                background: `linear-gradient(135deg, ${tema.bg} 0%, ${tema.colorSecundario}80 100%)`,
                borderBottom: `2px solid ${tema.color}60`,
                padding: '0.9rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                position: 'sticky', top: 0, zIndex: 20,
                backdropFilter: 'blur(12px)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        width: 42, height: 42, borderRadius: '10px',
                        background: `${tema.color}20`, border: `2px solid ${tema.color}60`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.3rem',
                    }}>🏷️</div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f1f5f9' }}>Panel Cajero</div>
                        <div style={{ fontSize: '0.75rem', color: tema.acento, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span>{sucursalInfo?.nombre || 'Sucursal'}</span>
                            <span style={{ opacity: 0.5 }}>·</span>
                            <span style={{ color: tema.color, fontWeight: 600 }}>{deptNombre}</span>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', color: '#f1f5f9', fontWeight: 600 }}>{perfil?.nombre_completo || perfil?.email}</div>
                        <div style={{ fontSize: '0.7rem', color: tema.acento, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cajero</div>
                    </div>
                    <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: `${tema.color}20`, border: `2px solid ${tema.color}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1rem', color: tema.acento,
                    }}>
                        {(perfil?.nombre_completo || 'C').charAt(0).toUpperCase()}
                    </div>
                    <button onClick={handleLogout} style={{
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                        color: '#94a3b8', padding: '0.4rem 0.9rem', borderRadius: '8px',
                        cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
                        transition: 'all 0.2s',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#f1f5f9'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8'; }}>
                        Salir
                    </button>
                </div>
            </header>

            <div style={{ display: 'flex', flex: 1 }}>
                {/* Sidebar — permanente, no desaparece */}
                <aside data-anim="sidebar" style={{
                    width: 220, minHeight: 'calc(100vh - 62px)',
                    background: '#0b1628', borderRight: `1px solid ${tema.color}20`,
                    padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem',
                    position: 'sticky', top: 62, alignSelf: 'flex-start',
                    height: 'calc(100vh - 62px)', overflowY: 'auto',
                }}>
                    {/* Badge de sucursal */}
                    <div style={{
                        background: `${tema.color}15`, border: `1px solid ${tema.color}40`,
                        borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1rem',
                    }}>
                        <div style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>{sucursalInfo?.logoEmoji || '🏷️'}</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: tema.acento }}>{sucursalInfo?.nombre || 'Mi Sucursal'}</div>
                        <div style={{ fontSize: '0.7rem', color: tema.color, marginTop: '0.1rem' }}>{deptNombre}</div>
                    </div>

                    <div style={{ fontSize: '0.65rem', color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem', paddingLeft: '0.5rem' }}>Módulos</div>

                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            display: 'flex', alignItems: 'center', gap: '0.6rem',
                            padding: '0.6rem 0.85rem', borderRadius: '8px', border: 'none',
                            background: tab === t.id ? `${tema.color}20` : 'transparent',
                            color: tab === t.id ? tema.acento : '#64748b',
                            cursor: 'pointer', fontSize: '0.85rem', fontWeight: tab === t.id ? 600 : 400,
                            textAlign: 'left', transition: 'all 0.15s',
                            outline: tab === t.id ? `1px solid ${tema.color}50` : '1px solid transparent',
                        }}
                            onMouseEnter={e => { if (tab !== t.id) { e.currentTarget.style.background = `${tema.color}10`; e.currentTarget.style.color = '#94a3b8'; } }}
                            onMouseLeave={e => { if (tab !== t.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; } }}>
                            <span>{t.icon}</span>
                            <span>{t.label}</span>
                            {tab === t.id && (
                                <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: tema.color }} />
                            )}
                        </button>
                    ))}

                    <div style={{ height: 1, background: '#1e293b', margin: '0.75rem 0' }} />

                    <button onClick={() => navigate('/')} style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        padding: '0.6rem 0.85rem', borderRadius: '8px', border: 'none',
                        background: 'transparent', color: '#475569',
                        cursor: 'pointer', fontSize: '0.8rem', textAlign: 'left',
                    }}>
                        <span>🏠</span><span>Inicio</span>
                    </button>
                </aside>

                {/* Main Content */}
                <main data-anim="main" style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>

                    {/* ── Dashboard ── */}
                    {tab === 'dashboard' && (
                        <div data-anim="content">
                            <h2 style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: '1.5rem', marginTop: 0 }}>
                                Resumen del día
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                                {[
                                    { label: 'Reservas totales', valor: reservas.length, color: tema.color, icon: '🎫' },
                                    { label: 'Ventas del día', valor: ventas.length, color: '#10b981', icon: '💰' },
                                    { label: 'Ingresos', valor: `Bs ${totalIngresos.toFixed(2)}`, color: '#f59e0b', icon: '📊' },
                                    { label: 'Boletos vendidos', valor: totalBoletos, color: tema.acento, icon: '🏷️' },
                                ].map(kpi => (
                                    <div key={kpi.label} style={{
                                        background: '#0d1a2e', borderRadius: '12px', padding: '1.25rem',
                                        border: `1px solid ${kpi.color}25`,
                                        position: 'relative', overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            position: 'absolute', top: -10, right: -10,
                                            fontSize: '3rem', opacity: 0.06,
                                        }}>{kpi.icon}</div>
                                        <div style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>{kpi.icon}</div>
                                        <div style={{ color: kpi.color, fontSize: '1.6rem', fontWeight: 700, lineHeight: 1.2 }}>{kpi.valor}</div>
                                        <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>{kpi.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* CTA crear boleto */}
                            <div style={{
                                background: `linear-gradient(135deg, ${tema.color}15 0%, ${tema.bg} 100%)`,
                                border: `1px solid ${tema.color}40`, borderRadius: '14px',
                                padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                flexWrap: 'wrap', gap: '1rem',
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
                                }}>
                                    🎫 Crear Boleto
                                </button>
                            </div>

                            {/* Últimas reservas */}
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

                    {/* ── Crear Boleto ── */}
                    {tab === 'crear-boleto' && (
                        <div data-anim="content">
                            <h2 style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: '1.5rem', marginTop: 0 }}>Crear Boleto en Ventanilla</h2>

                            {mensajeBoleto && (
                                <div style={{
                                    padding: '0.85rem 1.1rem', marginBottom: '1.5rem', borderRadius: '10px',
                                    background: mensajeBoleto.tipo === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                    border: `1px solid ${mensajeBoleto.tipo === 'ok' ? '#065f46' : '#7f1d1d'}`,
                                    color: mensajeBoleto.tipo === 'ok' ? '#6ee7b7' : '#fca5a5',
                                    fontSize: '0.88rem',
                                }}>
                                    {mensajeBoleto.texto}
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                {/* Paso 1: Seleccionar viaje */}
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <div style={{ color: tema.acento, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                                        1 · Seleccionar viaje
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem', maxHeight: 280, overflowY: 'auto' }}>
                                        {viajes.map(v => (
                                            <div key={v.id} onClick={() => handleSeleccionarViaje(v)} style={{
                                                background: boleto.viajeId === v.id ? `${tema.color}20` : '#0d1a2e',
                                                border: `1px solid ${boleto.viajeId === v.id ? tema.color : '#1e293b'}`,
                                                borderRadius: '10px', padding: '0.85rem 1rem', cursor: 'pointer',
                                                transition: 'all 0.15s',
                                            }}>
                                                <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.88rem' }}>{v.origen} → {v.destino}</div>
                                                <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                                    {new Date(v.salida).toLocaleString('es-BO')}
                                                </div>
                                                <div style={{ color: '#10b981', fontWeight: 700, fontSize: '0.9rem', marginTop: '0.35rem' }}>Bs {v.precio}/asiento</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Paso 2: Datos pasajero */}
                                <div>
                                    <div style={{ color: tema.acento, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                                        2 · Datos del pasajero
                                    </div>
                                    <form onSubmit={handleCrearBoleto} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {[
                                            { key: 'pasajeroNombre', label: 'Nombre completo', type: 'text', required: true },
                                            { key: 'pasajeroCI', label: 'Carnet de Identidad', type: 'text', required: true },
                                            { key: 'pasajeroTelefono', label: 'Teléfono', type: 'tel', required: false },
                                        ].map(f => (
                                            <div key={f.key}>
                                                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.35rem' }}>{f.label}</label>
                                                <input
                                                    type={f.type} required={f.required}
                                                    value={boleto[f.key]}
                                                    onChange={e => setBoleto(prev => ({ ...prev, [f.key]: e.target.value }))}
                                                    style={inputStyle}
                                                    onFocus={e => e.target.style.borderColor = tema.color}
                                                    onBlur={e => e.target.style.borderColor = `${tema.color}40`}
                                                />
                                            </div>
                                        ))}
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Método de pago</label>
                                            <select value={boleto.metodoPago} onChange={e => setBoleto(prev => ({ ...prev, metodoPago: e.target.value }))} style={inputStyle}>
                                                <option value="efectivo">💵 Efectivo</option>
                                                <option value="qr">📱 QR</option>
                                                <option value="tarjeta">💳 Tarjeta</option>
                                            </select>
                                        </div>

                                        {boleto.asientosSeleccionados.length > 0 && (
                                            <div style={{ background: `${tema.color}10`, border: `1px solid ${tema.color}30`, borderRadius: '8px', padding: '0.75rem 1rem' }}>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Resumen</div>
                                                <div style={{ color: '#f1f5f9', fontWeight: 600 }}>
                                                    {boleto.asientosSeleccionados.length} asiento(s) · Bs {(boleto.precio * boleto.asientosSeleccionados.length).toFixed(2)}
                                                </div>
                                                <div style={{ color: '#64748b', fontSize: '0.78rem' }}>
                                                    Asientos: {boleto.asientosSeleccionados.join(', ')}
                                                </div>
                                            </div>
                                        )}

                                        <button type="submit" disabled={!boleto.viajeId || boleto.asientosSeleccionados.length === 0} style={{
                                            background: boleto.viajeId && boleto.asientosSeleccionados.length > 0 ? tema.color : '#1e293b',
                                            color: boleto.viajeId && boleto.asientosSeleccionados.length > 0 ? '#fff' : '#475569',
                                            border: 'none', borderRadius: '10px', padding: '0.85rem',
                                            fontWeight: 700, cursor: boleto.viajeId && boleto.asientosSeleccionados.length > 0 ? 'pointer' : 'not-allowed',
                                            fontSize: '0.9rem', marginTop: '0.25rem',
                                            transition: 'all 0.2s',
                                        }}>
                                            🎫 Emitir Boleto
                                        </button>
                                    </form>
                                </div>

                                {/* Paso 3: Selección de asientos */}
                                <div>
                                    <div style={{ color: tema.acento, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                                        3 · Seleccionar asientos
                                    </div>
                                    {!boleto.viajeId ? (
                                        <div style={{ color: '#475569', fontSize: '0.85rem', padding: '1rem', background: '#0d1a2e', borderRadius: '10px', border: '1px solid #1e293b', textAlign: 'center' }}>
                                            Primero selecciona un viaje
                                        </div>
                                    ) : (
                                        <>
                                            {/* Leyenda */}
                                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.72rem', flexWrap: 'wrap' }}>
                                                {[
                                                    { color: '#1e293b', label: 'Disponible' },
                                                    { color: tema.color, label: 'Seleccionado' },
                                                    { color: '#374151', label: 'Ocupado' },
                                                ].map(l => (
                                                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                        <div style={{ width: 12, height: 12, borderRadius: '3px', background: l.color, border: '1px solid #334155' }} />
                                                        <span style={{ color: '#64748b' }}>{l.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem', maxHeight: 320, overflowY: 'auto' }}>
                                                {generarAsientos().map(a => {
                                                    const ocupado = asientosOcupados.includes(a);
                                                    const seleccionado = boleto.asientosSeleccionados.includes(a);
                                                    return (
                                                        <button key={a} onClick={() => !ocupado && toggleAsiento(a)} disabled={ocupado} style={{
                                                            padding: '0.4rem',
                                                            background: ocupado ? '#1e293b' : seleccionado ? tema.color : '#0d1a2e',
                                                            border: `1px solid ${ocupado ? '#334155' : seleccionado ? tema.color : '#334155'}`,
                                                            color: ocupado ? '#374151' : seleccionado ? '#fff' : '#94a3b8',
                                                            borderRadius: '6px', cursor: ocupado ? 'not-allowed' : 'pointer',
                                                            fontSize: '0.72rem', fontWeight: 600,
                                                            transition: 'all 0.12s',
                                                        }}>
                                                            {a}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Reservas ── */}
                    {tab === 'reservas' && (
                        <div data-anim="content">
                            <h2 style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: '1rem', marginTop: 0 }}>Gestión de Reservas</h2>
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
                                                <tr style={{ background: '#07111f', borderBottom: `1px solid ${tema.color}20` }}>
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
                                                            <span style={{
                                                                background: r.estado === 'confirmada' ? '#065f46' : '#7f1d1d',
                                                                color: r.estado === 'confirmada' ? '#6ee7b7' : '#fca5a5',
                                                                padding: '0.15rem 0.55rem', borderRadius: '999px', fontSize: '0.72rem', whiteSpace: 'nowrap',
                                                            }}>
                                                                {r.estado}
                                                            </span>
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

                    {/* ── Ventas ── */}
                    {tab === 'ventas' && (
                        <div data-anim="content">
                            <h2 style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: '1rem', marginTop: 0 }}>Registro de Ventas</h2>
                            <div style={{ background: '#0d1a2e', borderRadius: '12px', border: '1px solid #1e293b', overflow: 'hidden' }}>
                                {ventas.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: '#475569', padding: '2.5rem' }}>No hay ventas registradas.</div>
                                ) : (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                                            <thead>
                                                <tr style={{ background: '#07111f', borderBottom: `1px solid ${tema.color}20` }}>
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
    );
};

export default PanelCajero;
