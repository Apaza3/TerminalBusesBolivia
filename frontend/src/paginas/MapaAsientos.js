import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contextos/AuthContext';
import { crearReserva, obtenerReservas } from '../data/mockStorage';
import { obtenerTripulacionViaje } from '../data/mockStaffDB';
import { obtenerCliente } from '../data/mockClientDB';
import { useToast } from '../componentes/ToastNotifications';
import TicketGenerator from '../componentes/TicketGenerator';
import TripulacionInfo from '../componentes/TripulacionInfo';
import PasarelaPago from '../componentes/PasarelaPago';
import '../estilos/escritorio/mapa-asientos.css';

/**
 * MapaAsientos — V3: Full reservation flow with seat selection,
 * passenger form, ticket generation (PDF+QR), and WhatsApp share.
 */
const MapaAsientos = () => {
    const { viajeId } = useParams();
    const navigate = useNavigate();
    const { sesion, perfil } = useAuth();
    const toast = useToast();

    // Seat state
    const [cargando, setCargando] = useState(true);
    const [asientosReservados, setAsientosReservados] = useState([]);
    const [asientosSeleccionados, setAsientosSeleccionados] = useState([]);

    // Flow state: 'mapa' → 'formulario' → 'ticket'
    const [paso, setPaso] = useState('mapa');

    // Multi-passenger data: { seatId: { nombre, ci, telefono, esInfante, lleva1000, llevaAnimales, llevaProductos } }
    const [datosPasajeros, setDatosPasajeros] = useState({});

    // Generated reservation
    const [reservaGenerada, setReservaGenerada] = useState(null);

    // Crew info
    const [tripulacion, setTripulacion] = useState(null);

    useEffect(() => {
        setTimeout(() => setCargando(false), 500);
        // Load crew info for this trip
        const crew = obtenerTripulacionViaje(viajeId);
        setTripulacion(crew);
        // Load real occupied seats from storage (fix #5)
        const reservas = obtenerReservas(viajeId);
        const ocupados = reservas
            .filter(r => r.estado === 'confirmada')
            .flatMap(r => r.asientos);
        setAsientosReservados(ocupados);
    }, [viajeId]);

    const toggleAsiento = (id) => {
        if (asientosReservados.includes(id)) return;
        setAsientosSeleccionados(prev =>
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        );
    };

    // Init passenger forms when moving to form step
    const handleContinuar = () => {
        if (asientosSeleccionados.length === 0) {
            toast.mostrar('Seleccione al menos un asiento.', 'alerta');
            return;
        }
        if (!sesion || (perfil?.rol !== 'cliente')) {
            toast.mostrar('Debe iniciar sesión como cliente para comprar boletos.', 'error');
            // Fix #6: redirect back to this page after login
            setTimeout(() => navigate(`/login-cliente?redirect=/reserva/${viajeId}`), 1500);
            return;
        }
        // Initialize forms: first seat = buyer data auto-filled
        const initial = {};
        asientosSeleccionados.forEach((seat, i) => {
            if (i === 0 && perfil) {
                initial[seat] = {
                    nombre: perfil.nombreCompleto || perfil.nombre_completo || '',
                    ci: perfil.ci || '',
                    telefono: perfil.telefono || '',
                    esInfante: false,
                    lleva1000: false, llevaAnimales: false, llevaProductos: false,
                };
            } else {
                initial[seat] = {
                    nombre: '', ci: '', telefono: '',
                    esInfante: false,
                    lleva1000: false, llevaAnimales: false, llevaProductos: false,
                };
            }
        });
        setDatosPasajeros(initial);
        setPaso('formulario');
    };

    // Update a specific passenger's field
    const handlePasajeroChange = (seat, field, value) => {
        setDatosPasajeros(prev => ({
            ...prev,
            [seat]: { ...prev[seat], [field]: value },
        }));
    };

    // Auto-fill by CI lookup
    const handleCIChange = (seat, ciValue) => {
        handlePasajeroChange(seat, 'ci', ciValue);
        if (ciValue.length >= 5) {
            const cliente = obtenerCliente(ciValue);
            if (cliente) {
                setDatosPasajeros(prev => ({
                    ...prev,
                    [seat]: {
                        ...prev[seat],
                        ci: ciValue,
                        nombre: cliente.nombreCompleto || prev[seat].nombre,
                        telefono: cliente.telefono || prev[seat].telefono,
                    },
                }));
                toast.mostrar(`Datos de ${cliente.nombreCompleto} cargados automáticamente`, 'info');
            }
        }
    };

    // Validate all passengers and go to payment
    const handleConfirmarReserva = (e) => {
        e.preventDefault();
        const pasajeros = Object.entries(datosPasajeros);
        for (const [seat, data] of pasajeros) {
            if (!data.nombre || !data.ci) {
                toast.mostrar(`Complete nombre y CI para el asiento ${seat}.`, 'alerta');
                return;
            }
        }
        const compradorSeat = asientosSeleccionados[0];
        const comprador = datosPasajeros[compradorSeat];
        if (!comprador.telefono) {
            toast.mostrar('El comprador debe ingresar su número de WhatsApp.', 'alerta');
            return;
        }
        // Move to payment step
        setPaso('pago');
    };

    // Payment confirmed → create reservation → show tickets
    const handlePagoConfirmado = (metodo) => {
        const compradorSeat = asientosSeleccionados[0];
        const comprador = datosPasajeros[compradorSeat];

        const resultado = crearReserva({
            viajeId,
            pasajeroNombre: comprador.nombre,
            pasajeroCI: comprador.ci,
            pasajeroTelefono: comprador.telefono,
            asientos: asientosSeleccionados,
            busPlaca: busInfo.placa || 'ABC-1234',
            origen: 'La Paz',
            destino: 'Cochabamba',
            precio: asientosSeleccionados.length * 45,
            fechaSalida: '2026-04-02T08:00:00',
            pasajeros: datosPasajeros,
            metodoPago: metodo,
        });

        if (resultado.error) {
            toast.mostrar(resultado.mensaje, 'error');
            setPaso('formulario');
            return;
        }

        toast.mostrar(`¡Pago con ${metodo === 'qr' ? 'QR' : 'tarjeta'} confirmado!`, 'exito');
        setReservaGenerada(resultado);
        setPaso('ticket');
    };

    // Multi-floor state
    const [pisoActivo, setPisoActivo] = useState(1);

    // Bus info from crew data (pisos, capacidad)
    const busInfo = tripulacion?.bus || { pisos: 1, capacidad: 40 };

    // Render bus layout — dynamic by floor
    const filasPiso1 = Array.from({ length: 10 }, (_, i) => i + 1);
    const filasPiso2 = Array.from({ length: 10 }, (_, i) => i + 11);
    const filasActivas = busInfo.pisos >= 2
        ? (pisoActivo === 1 ? filasPiso1 : filasPiso2)
        : filasPiso1;
    const columnas = ['A', 'B', 'pasillo', 'C', 'D'];

    return (
        <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: '#f1f5f9', padding: '1.5rem' }}>
            <div style={{ maxWidth: '850px', margin: '0 auto' }}>

                {/* Navigation */}
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        background: 'transparent', border: '1px solid #475569', color: '#cbd5e1',
                        padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', marginBottom: '1rem'
                    }}
                >
                    ← Volver
                </button>

                {/* Progress indicator — 4 steps */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    {['Asientos', 'Datos', 'Pago', 'Ticket'].map((label, i) => {
                        const pasos = ['mapa', 'formulario', 'pago', 'ticket'];
                        const activo = pasos.indexOf(paso) >= i;
                        return (
                            <div key={label} style={{
                                flex: 1, padding: '0.5rem', textAlign: 'center', borderRadius: '6px',
                                background: activo ? '#3b82f6' : '#1e293b',
                                color: activo ? 'white' : '#64748b',
                                fontSize: '0.8rem', fontWeight: activo ? 600 : 400, transition: 'all 0.3s'
                            }}>
                                {i + 1}. {label}
                            </div>
                        );
                    })}
                </div>

                {cargando ? (
                    <p style={{ textAlign: 'center', color: '#60a5fa' }}>Cargando distribución del bus...</p>
                ) : (
                    <>
                        {/* ═══════ PASO 1: MAPA DE ASIENTOS ═══════ */}
                        {paso === 'mapa' && (
                            <div>
                                {/* Crew & Bus Info Panel */}
                                {tripulacion && (
                                    <TripulacionInfo
                                        conductor={tripulacion.conductor}
                                        ayudante={tripulacion.ayudante}
                                        bus={tripulacion.bus}
                                    />
                                )}
                            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                <div className="bus-cuerpo">
                                    <div className="bus-frente">
                                        <span className="bus-volante">🔘 Volante</span>
                                        <span className="bus-puerta-etiqueta">Puerta 🚪</span>
                                    </div>
                                    {/* Bathroom near the door (front) */}
                                    <div className="bus-zona-bano" style={{ marginBottom: '0.5rem' }}>🚻 Baño</div>

                                    {/* Floor Tabs (only if 2+ floors) */}
                                    {busInfo.pisos >= 2 && (
                                        <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.5rem' }}>
                                            {[1, 2].map(p => (
                                                <button key={p} onClick={() => setPisoActivo(p)}
                                                    style={{
                                                        flex: 1, padding: '0.5rem', borderRadius: '8px',
                                                        border: pisoActivo === p ? '2px solid #3b82f6' : '1px solid #334155',
                                                        background: pisoActivo === p ? 'rgba(59,130,246,0.15)' : '#0f172a',
                                                        color: pisoActivo === p ? '#93c5fd' : '#64748b',
                                                        cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
                                                    }}>
                                                    {p === 1 ? '⬇️ Piso 1' : '⬆️ Piso 2'}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div className="bus-piso">
                                        {filasActivas.map(fila => (
                                            <div key={fila} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem' }}>
                                                <div style={{ width: '1.8rem', textAlign: 'center', color: '#64748b', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{fila}</div>
                                                {columnas.map(col => {
                                                    if (col === 'pasillo') {
                                                        return <div key="p" style={{ width: '24px' }} className="bus-pasillo-visual" />;
                                                    }
                                                    const id = `${fila}${col}`;
                                                    const reservado = asientosReservados.includes(id);
                                                    const seleccionado = asientosSeleccionados.includes(id);
                                                    let cls = 'disponible';
                                                    if (reservado) cls = 'ocupado';
                                                    if (seleccionado) cls = 'pendiente';
                                                    return (
                                                        <button key={col} className={`asiento-btn ${cls}`}
                                                            style={{ width: '38px', height: '38px', fontSize: '0.7rem', cursor: reservado ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                                                            onClick={() => toggleAsiento(id)}
                                                        >
                                                            {id}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Side panel */}
                                <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155', minWidth: '280px', flex: 1 }}>
                                    <h3 style={{ marginTop: 0, color: '#f1f5f9' }}>Resumen</h3>
                                    <div style={{ color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                        Viaje: La Paz → Cochabamba
                                    </div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                        Asientos: {asientosSeleccionados.length > 0 ? asientosSeleccionados.join(', ') : 'Ninguno'}
                                    </div>

                                    {/* Leyenda */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '0.8rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <div style={{ width: 14, height: 14, borderRadius: 3, background: '#334155', border: '1px solid #475569' }} /> Libre
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <div style={{ width: 14, height: 14, borderRadius: 3, background: '#b45309', border: '1px solid #d97706' }} /> Tuyo
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <div style={{ width: 14, height: 14, borderRadius: 3, background: '#7f1d1d', border: '1px solid #991b1b' }} /> Ocupado
                                        </div>
                                    </div>

                                    <div style={{ borderTop: '1px solid #334155', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <span style={{ color: '#94a3b8' }}>Total:</span>
                                        <span style={{ fontWeight: 'bold', fontSize: '1.3rem', color: '#10b981' }}>Bs {asientosSeleccionados.length * 45}</span>
                                    </div>

                                    <button onClick={handleContinuar}
                                        disabled={asientosSeleccionados.length === 0}
                                        style={{
                                            width: '100%', padding: '0.9rem', border: 'none', borderRadius: '10px',
                                            background: asientosSeleccionados.length > 0 ? '#3b82f6' : '#475569',
                                            color: 'white', fontWeight: 600, cursor: asientosSeleccionados.length > 0 ? 'pointer' : 'not-allowed',
                                            fontSize: '0.95rem'
                                        }}
                                    >
                                        Continuar →
                                    </button>
                                </div>
                            </div>
                            </div>
                        )}

                        {/* ═══════ PASO 2: FORMULARIOS MULTI-PASAJERO ═══════ */}
                        {paso === 'formulario' && (
                            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                                <h2 style={{ marginBottom: '0.25rem' }}>Datos de Pasajeros</h2>
                                <p style={{ color: '#94a3b8', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                                    {asientosSeleccionados.length} boleto{asientosSeleccionados.length > 1 ? 's' : ''} — Complete los datos de cada pasajero
                                </p>

                                <form onSubmit={handleConfirmarReserva} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {asientosSeleccionados.map((seat, idx) => {
                                        const datos = datosPasajeros[seat] || {};
                                        const esComprador = idx === 0;
                                        const isInfante = datos.esInfante;
                                        return (
                                            <div key={seat} style={{
                                                background: isInfante ? 'rgba(251,191,36,0.08)' : '#1e293b',
                                                borderRadius: '14px', padding: '1.25rem',
                                                border: `1px solid ${isInfante ? '#f59e0b40' : esComprador ? '#3b82f640' : '#334155'}`,
                                            }}>
                                                {/* Card header */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{
                                                            background: isInfante ? '#f59e0b' : '#3b82f6',
                                                            color: 'white', fontWeight: 700, fontSize: '0.75rem',
                                                            padding: '0.3rem 0.6rem', borderRadius: '6px',
                                                        }}>
                                                            {isInfante ? '👶 Infante' : `💺 ${seat}`}
                                                        </span>
                                                        {esComprador && (
                                                            <span style={{ color: '#10b981', fontSize: '0.7rem', fontWeight: 600 }}>Comprador</span>
                                                        )}
                                                    </div>
                                                    {datos.nombre && (
                                                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{datos.nombre}</span>
                                                    )}
                                                </div>

                                                {/* CI with auto-fill */}
                                                <div style={{ marginBottom: '0.75rem' }}>
                                                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                                                        CI <span style={{ color: '#ef4444' }}>*</span>
                                                    </label>
                                                    <input type="text" value={datos.ci || ''}
                                                        onChange={e => handleCIChange(seat, e.target.value)}
                                                        placeholder="Ingrese CI para buscar datos"
                                                        style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', padding: '0.7rem', borderRadius: '8px', fontSize: '0.9rem' }}
                                                    />
                                                </div>

                                                {/* Name */}
                                                <div style={{ marginBottom: '0.75rem' }}>
                                                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                                                        Nombre Completo <span style={{ color: '#ef4444' }}>*</span>
                                                    </label>
                                                    <input type="text" value={datos.nombre || ''}
                                                        onChange={e => handlePasajeroChange(seat, 'nombre', e.target.value)}
                                                        placeholder="Nombre del pasajero"
                                                        style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', padding: '0.7rem', borderRadius: '8px', fontSize: '0.9rem' }}
                                                    />
                                                </div>

                                                {/* WhatsApp (mandatory for buyer) */}
                                                {esComprador && (
                                                    <div style={{ marginBottom: '0.75rem' }}>
                                                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                                                            WhatsApp <span style={{ color: '#ef4444' }}>*</span>
                                                        </label>
                                                        <input type="tel" value={datos.telefono || ''}
                                                            onChange={e => handlePasajeroChange(seat, 'telefono', e.target.value)}
                                                            placeholder="Ej. 67146215"
                                                            style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', padding: '0.7rem', borderRadius: '8px', fontSize: '0.9rem' }}
                                                        />
                                                        <span style={{ fontSize: '0.7rem', color: '#f59e0b' }}>📱 Los boletos se enviarán a este número</span>
                                                    </div>
                                                )}

                                                {/* Infant checkbox — fix #1: only show when multiple seats */}
                                                {asientosSeleccionados.length > 1 && (
                                                    <>
                                                        <label style={{
                                                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                            color: '#94a3b8', fontSize: '0.85rem', cursor: 'pointer',
                                                            marginBottom: '0.5rem', padding: '0.4rem 0',
                                                        }}>
                                                            <input type="checkbox" checked={isInfante}
                                                                onChange={e => handlePasajeroChange(seat, 'esInfante', e.target.checked)}
                                                                style={{ accentColor: '#f59e0b', width: '18px', height: '18px' }}
                                                            />
                                                            👶 Este pasajero es un infante (menor de edad)
                                                        </label>
                                                        {isInfante && (
                                                            <div style={{
                                                                background: 'rgba(245,158,11,0.1)', border: '1px solid #f59e0b60',
                                                                borderRadius: '10px', padding: '0.85rem', marginBottom: '0.5rem',
                                                            }}>
                                                                <p style={{ color: '#fbbf24', fontSize: '0.8rem', margin: 0, fontWeight: 600 }}>⚠️ Advertencia sobre infantes</p>
                                                                <p style={{ color: '#fcd34d', fontSize: '0.75rem', margin: '0.4rem 0 0' }}>
                                                                    El menor debe presentar documentación vigente (certificado de nacimiento o CI) en la sucursal antes del viaje.
                                                                    Sin validación presencial, los boletos serán <strong>cancelados automáticamente</strong>.
                                                                    Las devoluciones se realizan únicamente de forma física en la sucursal donde se realizó la reserva.
                                                                </p>
                                                            </div>
                                                        )}
                                                    </>
                                                )}

                                                {/* Declarations (buyer only) */}
                                                {esComprador && (
                                                    <div style={{ borderTop: '1px solid #334155', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                                                        <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Declaraciones:</p>
                                                        {[
                                                            { key: 'lleva1000', label: '💰 Lleva más de $1,000 en efectivo' },
                                                            { key: 'llevaAnimales', label: '🐾 Lleva animales' },
                                                            { key: 'llevaProductos', label: '📦 Lleva productos por más de $1,000' },
                                                        ].map(d => (
                                                            <label key={d.key} style={{
                                                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                                color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer',
                                                                marginBottom: '0.3rem',
                                                            }}>
                                                                <input type="checkbox" checked={datos[d.key] || false}
                                                                    onChange={e => handlePasajeroChange(seat, d.key, e.target.checked)}
                                                                    style={{ accentColor: '#ef4444', width: '16px', height: '16px' }}
                                                                />
                                                                {d.label}
                                                            </label>
                                                        ))}
                                                        {(datos.lleva1000 || datos.llevaAnimales || datos.llevaProductos) && (
                                                            <div style={{
                                                                background: 'rgba(239,68,68,0.1)', border: '1px solid #7f1d1d',
                                                                borderRadius: '8px', padding: '0.6rem', marginTop: '0.5rem',
                                                                color: '#fca5a5', fontSize: '0.75rem',
                                                            }}>
                                                                ⚠️ Debe declarar sus pertenencias físicamente en la sucursal antes del viaje.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                        <button type="button" onClick={() => setPaso('mapa')}
                                            style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: '10px', cursor: 'pointer' }}
                                        >
                                            ← Volver
                                        </button>
                                        <button type="submit"
                                            style={{ flex: 2, padding: '0.8rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}
                                        >
                                            Confirmar Reserva ✓
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* ═══════ PASO 3: PASARELA DE PAGO ═══════ */}
                        {paso === 'pago' && (
                            <PasarelaPago
                                monto={asientosSeleccionados.length * 45}
                                onPagoConfirmado={handlePagoConfirmado}
                                onCancelar={() => setPaso('formulario')}
                            />
                        )}

                        {/* ═══════ PASO 4: TICKET GENERADO ═══════ */}
                        {paso === 'ticket' && reservaGenerada && (
                            <TicketGenerator
                                reserva={reservaGenerada}
                                onCerrar={() => navigate('/')}
                            />
                        )}
                    </>
                )}
            </div>


        </div>
    );
};

export default MapaAsientos;
