import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../servicios/supabase';
import ModalPasajero from '../componentes/ModalPasajero';
import '../estilos/escritorio/mapa-asientos.css';
import '../estilos/movil/mapa-asientos-responsivo.css';

// ============================================================
// BUS CONFIGURATION STANDARD
// This object defines the standard bus layout until the
// administrator module for custom bus configurations is built.
// Fields:
//   pisos       - number of floors (1 or 2)
//   columnas    - seat columns per row (3 or 4)
//   filasPiso1  - rows on floor 1
//   filasPiso2  - rows on floor 2 (only when pisos === 2)
//   tieneBano   - bathroom present on floor 1 (rear)
//   columnasDer - right-side column count (default 2, can be 1 for cols-3)
// ============================================================
const CONFIG_BUS_ESTANDAR = {
    pisos: 1,
    columnas: 4,        // 4 columnas: 2 izq + pasillo + 2 der
    filasPiso1: 10,     // 10 filas × 4 asientos = 40 asientos totales
    filasPiso2: 0,
    tieneBano: false,
};

// =================== DEMO DATA ===================
/**
 * generateDemoSeats - Generates mock seat data for demo trips.
 * Uses the standard config above to produce a realistic layout.
 */
const generarAsientosDemo = (viajeId, config) => {
    const asientos = [];
    const estadosRandom = ['disponible', 'disponible', 'disponible', 'disponible', 'ocupado', 'pendiente'];

    const agregarPiso = (piso, filas) => {
        for (let fila = 1; fila <= filas; fila++) {
            const colsDer = config.columnas === 4 ? 2 : 1;
            const colsIzq = 2;
            for (let col = 1; col <= colsIzq + colsDer; col++) {
                const numero = piso === 1
                    ? `${fila}${String.fromCharCode(64 + col)}`
                    : `P2-${fila}${String.fromCharCode(64 + col)}`;
                const estadoRand = estadosRandom[Math.floor(Math.random() * estadosRandom.length)];
                asientos.push({
                    id: `${viajeId}-p${piso}-${numero}`,
                    viaje_id: viajeId,
                    numero_asiento: numero,
                    piso,
                    fila,
                    columna: col,
                    estado: estadoRand,
                    bloqueado_hasta: estadoRand === 'pendiente' ? new Date(Date.now() + 8 * 60000).toISOString() : null,
                    datos_pasajero: null,
                });
            }
        }
    };

    agregarPiso(1, config.filasPiso1);
    if (config.pisos === 2 && config.filasPiso2 > 0) {
        agregarPiso(2, config.filasPiso2);
    }
    return asientos;
};

// ============================================================
// MapaAsientos — Main Page Component
// Route: /reserva/:viajeId
// ============================================================
const MapaAsientos = () => {
    const { viajeId } = useParams();
    const navigate = useNavigate();

    // ---- State ----
    const [viaje, setViaje]                     = useState(null);
    const [asientos, setAsientos]               = useState([]);
    const [seleccionados, setSeleccionados]     = useState([]); // IDs seleccionados localmente
    const [propios, setPropios]                 = useState([]);  // IDs bloqueados por este usuario
    const [cargando, setCargando]               = useState(true);
    const [error, setError]                     = useState(null);
    const [segundosRestantes, setSegundosRestantes] = useState(null); // null = sin timer activo
    const [mostrarModal, setMostrarModal]       = useState(false);
    const [configBus, setConfigBus]             = useState(CONFIG_BUS_ESTANDAR);

    // Refs for cleanup
    const countdownRef  = useRef(null);
    const realtimeRef   = useRef(null);
    const revertirRef   = useRef(null); // holds latest revertirAsientos to avoid stale closure
    const esDemo        = viajeId?.startsWith('demo-') || (viajeId?.length < 5);

    // ============================================================
    // DATA LOADING
    // ============================================================
    const cargarDatos = useCallback(async () => {
        setCargando(true);
        setError(null);

        if (esDemo) {
            // Use deterministic demo data (no Supabase call)
            setViaje({
                id: viajeId,
                origen: 'La Paz',
                destino: 'Cochabamba',
                salida: new Date().toISOString(),
                precio: 60,
                duracion_estimada: '7h',
            });
            setAsientos(generarAsientosDemo(viajeId, CONFIG_BUS_ESTANDAR));
            setConfigBus(CONFIG_BUS_ESTANDAR);
            setCargando(false);
            return;
        }

        try {
            // Fetch trip info
            const { data: viajeData, error: viajeErr } = await supabase
                .from('viajes')
                .select('id, origen, destino, salida, precio, duracion_estimada, buses(config_layout)')
                .eq('id', viajeId)
                .single();

            if (viajeErr) throw viajeErr;
            setViaje(viajeData);

            // Use bus config from DB if available, else use standard config
            const config = viajeData?.buses?.config_layout || CONFIG_BUS_ESTANDAR;
            setConfigBus(config);

            // Fetch seats for this trip
            const { data: asientosData, error: asientosErr } = await supabase
                .from('asientos_viaje')
                .select('*')
                .eq('viaje_id', viajeId)
                .order('piso').order('fila').order('columna');

            if (asientosErr) throw asientosErr;
            setAsientos(asientosData || []);
        } catch (err) {
            console.error('MapaAsientos - Error cargando datos:', err);
            setError('No se pudo cargar el mapa de asientos. Intente nuevamente.');
        } finally {
            setCargando(false);
        }
    }, [viajeId, esDemo]);

    // ============================================================
    // SUPABASE REALTIME — Seat updates from other users
    // ============================================================
    const suscribirRealtime = useCallback(() => {
        if (esDemo) return; // Skip realtime in demo mode

        const channel = supabase
            .channel(`asientos_viaje:viaje_id=eq.${viajeId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'asientos_viaje',
                    filter: `viaje_id=eq.${viajeId}`,
                },
                (payload) => {
                    // Update only the changed seat; no full re-fetch needed
                    setAsientos(prev =>
                        prev.map(a =>
                            a.id === payload.new?.id ? { ...a, ...payload.new } : a
                        )
                    );
                }
            )
            .subscribe();

        realtimeRef.current = channel;
    }, [viajeId, esDemo]);

    // ============================================================
    // 15-MINUTE COUNTDOWN TIMER
    // ============================================================
    const iniciarCountdown = useCallback((segundos) => {
        clearInterval(countdownRef.current);
        setSegundosRestantes(segundos);

        countdownRef.current = setInterval(() => {
            setSegundosRestantes(prev => {
                if (prev <= 1) {
                    clearInterval(countdownRef.current);
                    // Call via ref to always use the latest version (avoids stale closure)
                    revertirRef.current?.();
                    return null;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    const formatCountdown = (segundos) => {
        if (segundos === null) return null;
        const m = String(Math.floor(segundos / 60)).padStart(2, '0');
        const s = String(segundos % 60).padStart(2, '0');
        return `${m}:${s}`;
    };

    // ============================================================
    // SEAT SELECTION
    // ============================================================
    const toggleAsiento = (asiento) => {
        // Cannot select occupied or pending-by-others seats
        if (asiento.estado === 'ocupado') return;
        if (asiento.estado === 'pendiente' && !propios.includes(asiento.id)) return;
        // Cannot select more seats while a lock is active
        if (propios.length > 0) return;

        setSeleccionados(prev =>
            prev.includes(asiento.id)
                ? prev.filter(id => id !== asiento.id)
                : [...prev, asiento.id]
        );
    };

    // ============================================================
    // CONFIRM SEATS — Locks seats in DB for 15 minutes
    // ============================================================
    const confirmarAsientos = async () => {
        if (seleccionados.length === 0) return;

        const ahora = new Date();
        const bloqueadoHasta = new Date(ahora.getTime() + 15 * 60000).toISOString();

        if (esDemo) {
            // Simulate lock in demo mode
            setAsientos(prev =>
                prev.map(a =>
                    seleccionados.includes(a.id)
                        ? { ...a, estado: 'pendiente', bloqueado_hasta: bloqueadoHasta }
                        : a
                )
            );
            setPropios(seleccionados);
            setSeleccionados([]);
            iniciarCountdown(15 * 60);
            setMostrarModal(true);
            return;
        }

        try {
            const { error } = await supabase
                .from('asientos_viaje')
                .update({
                    estado: 'pendiente',
                    bloqueado_hasta: bloqueadoHasta,
                })
                .in('id', seleccionados)
                .eq('estado', 'disponible'); // Race condition guard

            if (error) throw error;

            setPropios(seleccionados);
            setSeleccionados([]);
            iniciarCountdown(15 * 60);
            setMostrarModal(true);
        } catch (err) {
            console.error('MapaAsientos - Error al confirmar asientos:', err);
            alert('Error al bloquear los asientos. Por favor, intente de nuevo.');
        }
    };

    // ============================================================
    // REVERT SEATS — Called when timer expires without payment
    // ============================================================
    const revertirAsientos = useCallback(async () => {
        if (propios.length === 0) return;

        if (esDemo) {
            setAsientos(prev =>
                prev.map(a =>
                    propios.includes(a.id)
                        ? { ...a, estado: 'disponible', bloqueado_hasta: null }
                        : a
                )
            );
            setPropios([]);
            setMostrarModal(false);
            return;
        }

        try {
            await supabase
                .from('asientos_viaje')
                .update({ estado: 'disponible', bloqueado_hasta: null })
                .in('id', propios);

            setPropios([]);
            setMostrarModal(false);
        } catch (err) {
            console.error('MapaAsientos - Error al revertir asientos:', err);
        }
    }, [propios, esDemo]);

    // Keep revertirRef in sync with the latest version of revertirAsientos
    useEffect(() => {
        revertirRef.current = revertirAsientos;
    }, [revertirAsientos]);

    // ============================================================
    // EFFECTS
    // ============================================================
    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    useEffect(() => {
        suscribirRealtime();
        return () => {
            if (realtimeRef.current) {
                supabase.removeChannel(realtimeRef.current);
            }
        };
    }, [suscribirRealtime]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            clearInterval(countdownRef.current);
        };
    }, []);

    // ============================================================
    // SEAT STATE RESOLVER
    // Returns the visual state of a seat from the user's perspective
    // ============================================================
    const resolverEstado = (asiento) => {
        if (seleccionados.includes(asiento.id)) return 'seleccionado';
        if (propios.includes(asiento.id)) return 'pendiente'; // user's own lock
        return asiento.estado; // 'disponible' | 'pendiente' | 'ocupado'
    };

    // ============================================================
    // BUS LAYOUT BUILDER
    // Renders a cenital (top-down) view of one bus floor.
    // Each row: [seatL1][seatL2] [aisle] [seatR1][seatR2] [rowNum]
    // ============================================================
    const renderPiso = (pisoNum, filas, config) => {
        const asientosPiso = asientos.filter(a => a.piso === pisoNum);
        const colsIzq = 2;
        const colsDer = config.columnas === 4 ? 2 : 1;

        const filasCelda = [];
        for (let fila = 1; fila <= filas; fila++) {
            const asientosFila = asientosPiso
                .filter(a => a.fila === fila)
                .sort((a, b) => a.columna - b.columna);

            filasCelda.push(
                <React.Fragment key={`fila-${pisoNum}-${fila}`}>
                    {/* Left seats */}
                    {Array.from({ length: colsIzq }, (_, i) => {
                        const a = asientosFila[i] || null;
                        return a ? renderAsiento(a) : <div key={`vl-${fila}-${i}`} />;
                    })}
                    {/* Aisle — visual walkway */}
                    <div className="bus-pasillo-visual" aria-hidden="true" />
                    {/* Right seats */}
                    {Array.from({ length: colsDer }, (_, i) => {
                        const a = asientosFila[colsIzq + i] || null;
                        return a ? renderAsiento(a) : <div key={`vr-${fila}-${i}`} />;
                    })}
                    {/* Row number label */}
                    <div className="fila-numero">{fila}</div>
                </React.Fragment>
            );
        }

        return (
            <div
                className={`bus-grid-asientos cols-${config.columnas}`}
                role="group"
                aria-label={`Piso ${pisoNum}`}
            >
                {filasCelda}
            </div>
        );
    };


    const renderAsiento = (asiento) => {
        const estado  = resolverEstado(asiento);
        const esPropio = propios.includes(asiento.id);
        const deshabilitado = estado === 'ocupado' || (estado === 'pendiente' && !esPropio) || propios.length > 0;

        return (
            <button
                key={asiento.id}
                className={`asiento-btn ${estado} ${esPropio ? 'propio' : ''}`}
                onClick={() => toggleAsiento(asiento)}
                disabled={deshabilitado}
                title={`Asiento ${asiento.numero_asiento} — ${estado}`}
                aria-label={`Asiento ${asiento.numero_asiento}, ${estado}`}
                id={`asiento-${asiento.id}`}
            >
                <span className="asiento-numero">{asiento.numero_asiento}</span>
            </button>
        );
    };

    // ============================================================
    // Helpers
    // ============================================================
    const formatearHora = (fechaStr) => {
        try {
            return new Date(fechaStr).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: true });
        } catch { return '--:--'; }
    };

    const formatearFecha = (fechaStr) => {
        try {
            return new Date(fechaStr).toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'short' });
        } catch { return ''; }
    };

    const totalPrecio = () => {
        if (!viaje) return '0.00';
        const cantidad = seleccionados.length || propios.length;
        return (cantidad * parseFloat(viaje.precio || 0)).toFixed(2);
    };

    const asientosActivos = seleccionados.length > 0 ? seleccionados : propios;

    // ============================================================
    // RENDER
    // ============================================================
    if (cargando) {
        return (
            <div className="pagina-mapa">
                <div className="mapa-estado">
                    <span className="mapa-estado-spinner">⚙️</span>
                    Cargando mapa de asientos...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="pagina-mapa">
                <div className="mapa-estado">
                    <p>⚠️ {error}</p>
                    <button className="btn-volver-mapa" onClick={() => navigate(-1)} style={{ marginTop: '1rem' }}>
                        ← Volver
                    </button>
                </div>
            </div>
        );
    }

    const tiempoDisplay  = formatCountdown(segundosRestantes);
    const esUrgente      = segundosRestantes !== null && segundosRestantes < 120;

    return (
        <div className="pagina-mapa">
            {/* ---- HEADER ---- */}
            <header className="mapa-header">
                <button
                    className="btn-volver-mapa"
                    onClick={() => navigate(-1)}
                    id="btn-volver-mapa"
                    aria-label="Volver a la lista de viajes"
                >
                    ← Volver
                </button>

                <div className="mapa-header-info">
                    <h2>Seleccioná tus asientos</h2>
                    <div className="mapa-header-ruta">
                        {viaje?.origen} → {viaje?.destino} &nbsp;•&nbsp;
                        {formatearFecha(viaje?.salida)}, {formatearHora(viaje?.salida)}
                    </div>
                </div>

                {tiempoDisplay && (
                    <div className={`countdown-container ${esUrgente ? 'urgente' : ''}`}
                         role="timer"
                         aria-live="polite">
                        <span className="countdown-label">Reservado</span>
                        <span className="countdown-tiempo">{tiempoDisplay}</span>
                    </div>
                )}
            </header>

            {/* ---- MAIN LAYOUT ---- */}
            <div className="mapa-layout">
                {/* LEFT: Leyenda */}
                <aside className="mapa-leyenda" aria-label="Leyenda de estados">
                    <div className="leyenda-titulo">Leyenda</div>
                    {[
                        { estado: 'disponible',   label: 'Disponible' },
                        { estado: 'seleccionado', label: 'Tu selección' },
                        { estado: 'pendiente',    label: 'En reserva' },
                        { estado: 'ocupado',      label: 'Ocupado' },
                    ].map(({ estado, label }) => (
                        <div key={estado} className="leyenda-item">
                            <div className={`leyenda-asiento ${estado}`} aria-hidden="true" />
                            <span>{label}</span>
                        </div>
                    ))}
                </aside>

                {/* CENTER: Bus cenital view */}
                <main className="bus-contenedor" aria-label="Mapa cenital del bus">
                    <div className="bus-cuerpo">
                        {/* Front windshield + driver cabin */}
                        <div className="bus-frente">
                            <span className="bus-volante" aria-hidden="true">🚌</span>
                            <span className="bus-puerta-etiqueta">🚪 Puerta</span>
                        </div>

                        {/* Passenger interior */}
                        <div className="bus-interior">
                            {/* Floor 1 */}
                            <div className="bus-piso">
                                {configBus.pisos === 2 && (
                                    <div className="bus-piso-label">Piso 1</div>
                                )}
                                {renderPiso(1, configBus.filasPiso1, configBus)}

                                {/* Bathroom at rear of floor 1 */}
                                {configBus.tieneBano && (
                                    <div className="bus-zona-bano" aria-label="Zona de baño">
                                        🚿 Baño
                                    </div>
                                )}
                            </div>

                            {/* Floor 2 (if applicable) */}
                            {configBus.pisos === 2 && configBus.filasPiso2 > 0 && (
                                <>
                                    <hr className="bus-separador-piso" />
                                    <div className="bus-piso">
                                        <div className="bus-piso-label">Piso 2</div>
                                        {renderPiso(2, configBus.filasPiso2, configBus)}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Rear bumper */}
                        <div className="bus-trasera" aria-hidden="true" />
                    </div>
                </main>

                {/* RIGHT: Action panel */}
                <aside className="mapa-panel-accion" aria-label="Panel de reserva">
                    <div className="panel-seleccion-titulo">Asientos</div>

                    <div className="panel-asientos-lista">
                        {asientosActivos.length === 0 ? (
                            <span className="panel-vacio">Ninguno seleccionado</span>
                        ) : (
                            asientosActivos.map(id => {
                                const a = asientos.find(s => s.id === id);
                                return a ? (
                                    <div key={id} className="panel-asiento-item">
                                        💺 {a.numero_asiento}
                                    </div>
                                ) : null;
                            })
                        )}
                    </div>

                    <div className="panel-precio-total">
                        Total:
                        <strong>Bs {totalPrecio()}</strong>
                    </div>

                    <button
                        className="btn-confirmar"
                        onClick={confirmarAsientos}
                        disabled={seleccionados.length === 0 || propios.length > 0}
                        id="btn-confirmar-asientos"
                        aria-label={`Confirmar ${seleccionados.length} asiento(s)`}
                    >
                        {propios.length > 0
                            ? `✅ Reservado (${propios.length})`
                            : seleccionados.length > 0
                                ? `Confirmar (${seleccionados.length})`
                                : 'Seleccioná un asiento'}
                    </button>
                </aside>
            </div>

            {/* ---- MODAL DE PASAJERO ---- */}
            {mostrarModal && (
                <ModalPasajero
                    asientosIds={propios}
                    asientos={asientos.filter(a => propios.includes(a.id))}
                    esModoDemo={esDemo}
                    onCerrar={() => setMostrarModal(false)}
                    onConfirmado={() => {
                        setMostrarModal(false);
                        clearInterval(countdownRef.current);
                        // Navigate to confirmation (future sprint) or back
                        navigate('/');
                    }}
                />
            )}
        </div>
    );
};

export default MapaAsientos;
