import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../servicios/supabase';
import { useAuth } from '../contextos/AuthContext';
import TarjetaViaje from '../componentes/TarjetaViaje';
import PanelFiltros from '../componentes/PanelFiltros';
import '../estilos/escritorio/buscador.css';
import '../estilos/escritorio/filtros.css';
import '../estilos/movil/buscador-responsivo.css';
import '../estilos/movil/filtros-responsivo.css';

/**
 * Predefined Bolivian cities for origin/destination selectors.
 * Sorted alphabetically for easy lookup.
 */
const CIUDADES_BOLIVIA = [
    'Cobija',
    'Cochabamba',
    'La Paz',
    'Oruro',
    'Potosí',
    'Santa Cruz',
    'Sucre',
    'Tarija',
    'Trinidad',
];

/**
 * Demo data for visualizing the design without a Supabase connection.
 * NOTE: Remove when connected to the real database.
 */
const DATOS_DEMO = [
    {
        id: 'demo-1',
        sucursal_nombre: 'Trans Copacabana',
        ranking: 4.5,
        origen: 'La Paz',
        destino: 'Cochabamba',
        salida: '2026-03-23T08:00:00',
        precio: 45.00,
        duracion_estimada: '7h 30min',
        amenidades: ['WiFi', 'Bus Cama', 'Baño'],
    },
    {
        id: 'demo-2',
        sucursal_nombre: 'El Dorado',
        ranking: 4.0,
        origen: 'La Paz',
        destino: 'Cochabamba',
        salida: '2026-03-23T10:30:00',
        precio: 35.00,
        duracion_estimada: '8h 00min',
        amenidades: ['WiFi', 'TV'],
    },
    {
        id: 'demo-3',
        sucursal_nombre: 'Bolívar',
        ranking: 4.8,
        origen: 'La Paz',
        destino: 'Cochabamba',
        salida: '2026-03-23T21:00:00',
        precio: 65.00,
        duracion_estimada: '7h 00min',
        amenidades: ['WiFi', 'Bus Cama', 'Baño', 'TV', 'Aire Acondicionado'],
    },
    {
        id: 'demo-4',
        sucursal_nombre: 'Trans Copacabana',
        ranking: 4.5,
        origen: 'La Paz',
        destino: 'Cochabamba',
        salida: '2026-03-23T23:30:00',
        precio: 50.00,
        duracion_estimada: '7h 15min',
        amenidades: ['WiFi', 'Baño', 'Aire Acondicionado'],
    },
];

/**
 * BuscadorViajes - Global trip search page with advanced multi-scope filtering.
 * Queries all branches (sucursales) with dynamic filters:
 * - Origin/Destination/Date (basic)
 * - Price range, quality stars, amenities (advanced via PanelFiltros)
 * Uses react-router-dom useNavigate for the back button.
 */
const BuscadorViajes = () => {
    const navigate = useNavigate();

    // Basic search filters
    const [origen, setOrigen] = useState('');
    const [destino, setDestino] = useState('');
    const [fecha, setFecha] = useState('');

    // Advanced filter state managed by PanelFiltros
    const [filtrosAvanzados, setFiltrosAvanzados] = useState({
        precioMin: '',
        precioMax: '',
        calidadMinima: 0,
        amenidades: [],
    });

    // Results state
    const [resultados, setResultados] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [buscado, setBuscado] = useState(false);

    /**
     * Executes trip search against Supabase with all active filters.
     * Builds query dynamically: basic filters (origin, destination, date)
     * plus advanced filters (price range, star rating, amenities).
     * Falls back to filtered demo data if Supabase is unavailable.
     */
    const buscarViajes = async () => {
        if (!origen || !destino) return;

        setCargando(true);
        setBuscado(true);

        try {
            // Build Supabase query with implicit JOINs
            let query = supabase
                .from('viajes')
                .select(`
                    id,
                    origen,
                    destino,
                    salida,
                    precio,
                    duracion_estimada,
                    estado,
                    buses!inner (
                        id,
                        capacidad,
                        sucursales!inner (
                            nombre,
                            ranking,
                            amenidades
                        )
                    )
                `)
                .eq('origen', origen)
                .eq('destino', destino)
                .eq('estado', 'programado')
                .order('salida', { ascending: true });

            // Optional date filter
            if (fecha) {
                const fechaInicio = `${fecha}T00:00:00`;
                const fechaFin = `${fecha}T23:59:59`;
                query = query.gte('salida', fechaInicio).lte('salida', fechaFin);
            }

            // Advanced filter: price range
            if (filtrosAvanzados.precioMin !== '') {
                query = query.gte('precio', parseFloat(filtrosAvanzados.precioMin));
            }
            if (filtrosAvanzados.precioMax !== '') {
                query = query.lte('precio', parseFloat(filtrosAvanzados.precioMax));
            }

            const { data, error } = await query;

            if (error) {
                console.warn('Error consultando Supabase, cargando datos demo:', error.message);
                cargarDatosDemo();
                return;
            }

            if (data && data.length > 0) {
                // Transform Supabase response to the format expected by TarjetaViaje
                let viajesTransformados = data.map(v => ({
                    id: v.id,
                    sucursal_nombre: v.buses.sucursales.nombre,
                    ranking: v.buses.sucursales.ranking,
                    origen: v.origen,
                    destino: v.destino,
                    salida: v.salida,
                    precio: v.precio,
                    duracion_estimada: v.duracion_estimada,
                    amenidades: v.buses.sucursales.amenidades || [],
                }));

                // Client-side filter: minimum star rating
                if (filtrosAvanzados.calidadMinima > 0) {
                    viajesTransformados = viajesTransformados.filter(
                        v => v.ranking >= filtrosAvanzados.calidadMinima
                    );
                }

                // Client-side filter: amenities (must have ALL selected amenities)
                if (filtrosAvanzados.amenidades.length > 0) {
                    viajesTransformados = viajesTransformados.filter(v =>
                        filtrosAvanzados.amenidades.every(a =>
                            v.amenidades.includes(a)
                        )
                    );
                }

                setResultados(viajesTransformados);
            } else {
                cargarDatosDemo();
            }
        } catch (err) {
            console.warn('Conexión a Supabase no disponible, cargando datos demo:', err);
            cargarDatosDemo();
        } finally {
            setCargando(false);
        }
    };

    /**
     * Loads demo data filtered by selected origin, destination, and advanced filters.
     * Fallback when Supabase is not available.
     */
    const cargarDatosDemo = () => {
        let filtrados = DATOS_DEMO.filter(v =>
            v.origen.toLowerCase() === origen.toLowerCase() &&
            v.destino.toLowerCase() === destino.toLowerCase()
        );

        // Apply advanced filters to demo data as well
        if (filtrosAvanzados.precioMin !== '') {
            filtrados = filtrados.filter(v => v.precio >= parseFloat(filtrosAvanzados.precioMin));
        }
        if (filtrosAvanzados.precioMax !== '') {
            filtrados = filtrados.filter(v => v.precio <= parseFloat(filtrosAvanzados.precioMax));
        }
        if (filtrosAvanzados.calidadMinima > 0) {
            filtrados = filtrados.filter(v => v.ranking >= filtrosAvanzados.calidadMinima);
        }
        if (filtrosAvanzados.amenidades.length > 0) {
            filtrados = filtrados.filter(v =>
                filtrosAvanzados.amenidades.every(a => v.amenidades.includes(a))
            );
        }

        setResultados(filtrados.length > 0 ? filtrados : DATOS_DEMO);
        setCargando(false);
    };

    const { sesion, login } = useAuth();
    const [viajeSeleccionado, setViajeSeleccionado] = useState(null);
    const [mostrarAuthModal, setMostrarAuthModal] = useState(false);
    
    // Auth Modal Forms
    const [authEmail, setAuthEmail] = useState('');
    const [authPass, setAuthPass] = useState('');
    const [authModo, setAuthModo] = useState('login'); // 'login' | 'registro'
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState('');

    /**
     * Handler for the "Seleccionar" button on each trip card.
     * Starts the simulated seat selection module.
     */
    const handleSeleccionar = (viaje) => {
        setViajeSeleccionado(viaje);
        // Resetea auth forms
        setAuthError('');
        setAuthEmail('');
        setAuthPass('');
    };

    /**
     * Handler for "Pagar/Confirmar" inside the simulated seat map.
     */
    const handleConfirmarReserva = () => {
        if (!sesion) {
            // Usuario no autenticado -> mostrar popup no intrusivo
            setMostrarAuthModal(true);
        } else {
            // Usuario autenticado -> Simular éxito
            alert(`¡Reserva Confirmada Exitosamente!\nViaje: ${viajeSeleccionado.origen} → ${viajeSeleccionado.destino}\nUsuario: ${sesion.user.email}`);
            setViajeSeleccionado(null);
        }
    };

    /**
     * Maneja el login/registro del cliente desde el modal.
     */
    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError('');
        
        if (authModo === 'login') {
            const { exito, error } = await login(authEmail, authPass);
            if (exito) {
                setMostrarAuthModal(false);
                // Auto-confirmar
                alert(`¡Login Exitoso! Reserva Confirmada ✅\nViaje: ${viajeSeleccionado.origen} → ${viajeSeleccionado.destino}`);
                setViajeSeleccionado(null);
            } else {
                setAuthError(error || 'Credenciales inválidas.');
            }
        } else {
            // Simulación de registro super rápida con Supabase SignUp
            try {
                const { error } = await supabase.auth.signUp({
                    email: authEmail,
                    password: authPass
                });
                if (error) throw error;
                // Si el signUp requiere confirmación de email, en dev mode a veces auto-inicia
                alert('Registro exitoso. Verifique su email o inicie sesión.');
                setAuthModo('login');
            } catch (err) {
                setAuthError(err.message);
            }
        }
        setAuthLoading(false);
    };

    // Minimum date: today (don't allow past date search)
    const fechaMinima = new Date().toISOString().split('T')[0];

    return (
        <div className="contenedor-buscador">
            {/* Header with back button */}
            <div className="buscador-header">
                <button className="btn-volver" onClick={() => navigate('/')} id="btn-volver">
                    ← Volver
                </button>
                <h1>Buscar Viajes</h1>
                <p>Encuentra tu próximo destino en Bolivia</p>
            </div>

            {/* Basic search form */}
            <div className="buscador-filtros" id="filtros-busqueda">
                <div className="filtro-grupo">
                    <label htmlFor="select-origen">Origen</label>
                    <select
                        id="select-origen"
                        value={origen}
                        onChange={(e) => setOrigen(e.target.value)}
                        className="filtro-select"
                    >
                        <option value="">¿De dónde sales?</option>
                        {CIUDADES_BOLIVIA.map(ciudad => (
                            <option key={ciudad} value={ciudad}>{ciudad}</option>
                        ))}
                    </select>
                </div>

                <div className="filtro-grupo">
                    <label htmlFor="select-destino">Destino</label>
                    <select
                        id="select-destino"
                        value={destino}
                        onChange={(e) => setDestino(e.target.value)}
                        className="filtro-select"
                    >
                        <option value="">¿A dónde vas?</option>
                        {CIUDADES_BOLIVIA.filter(c => c !== origen).map(ciudad => (
                            <option key={ciudad} value={ciudad}>{ciudad}</option>
                        ))}
                    </select>
                </div>

                <div className="filtro-grupo">
                    <label htmlFor="input-fecha">Fecha de viaje</label>
                    <input
                        type="date"
                        id="input-fecha"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        min={fechaMinima}
                        className="filtro-input"
                    />
                </div>

                <button
                    className="btn-buscar"
                    onClick={buscarViajes}
                    disabled={!origen || !destino || cargando}
                    id="btn-buscar"
                >
                    {cargando ? 'Buscando...' : '🔍 Buscar Viajes'}
                </button>
            </div>

            {/* Advanced filter panel (global scope) */}
            <PanelFiltros
                filtros={filtrosAvanzados}
                onFiltrosChange={setFiltrosAvanzados}
                modoSucursal={false}
                onBuscar={origen && destino ? buscarViajes : null}
            />

            {/* Results */}
            <div className="buscador-resultados" id="resultados-viajes">
                {cargando && (
                    <div className="estado-carga">
                        <div className="spinner"></div>
                        <p>Buscando los mejores viajes para ti...</p>
                    </div>
                )}

                {!cargando && buscado && resultados.length === 0 && (
                    <div className="estado-vacio">
                        <span className="icono-vacio">🚌</span>
                        <h3>No encontramos viajes disponibles</h3>
                        <p>Intenta con otra fecha, ruta o ajusta los filtros</p>
                    </div>
                )}

                {!cargando && resultados.length > 0 && (
                    <>
                        <div className="resultados-info">
                            <p>{resultados.length} viaje{resultados.length !== 1 ? 's' : ''} encontrado{resultados.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="lista-viajes">
                            {resultados.map(viaje => (
                                <TarjetaViaje
                                    key={viaje.id}
                                    viaje={viaje}
                                    onSeleccionar={handleSeleccionar}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
            {/* ======== MODAL MOCK DE ASIENTOS ======== */}
            {viajeSeleccionado && !mostrarAuthModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
                    <div style={{ background: '#1e293b', width: '100%', maxWidth: '500px', borderRadius: '12px', padding: '2rem', border: '1px solid #334155' }}>
                        <h2 style={{ margin: '0 0 1rem 0', color: '#f1f5f9' }}>Reserva Rápida (Test Mode)</h2>
                        <p style={{ color: '#94a3b8', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                            Simulando el módulo de Mapa de Asientos.<br/>
                            Viaje: {viajeSeleccionado.origen} → {viajeSeleccionado.destino}<br/>
                            Precio Total: Bs {viajeSeleccionado.precio}
                        </p>
                        
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setViajeSeleccionado(null)} style={{ padding: '0.8rem 1.5rem', border: 'none', borderRadius: '8px', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>
                                Cancelar
                            </button>
                            <button onClick={handleConfirmarReserva} style={{ padding: '0.8rem 1.5rem', border: 'none', borderRadius: '8px', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                                Pagar / Confirmar Asiento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ======== MODAL AUTH NO INTRUSIVO (CLIENTE) ======== */}
            {mostrarAuthModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '1rem', backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: '#1e293b', width: '100%', maxWidth: '400px', borderRadius: '12px', padding: '2rem', border: '1px solid #334155', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, color: '#f1f5f9', fontSize: '1.25rem' }}>
                                {authModo === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
                            </h2>
                            <button onClick={() => setMostrarAuthModal(false)} style={{ background:'transparent', border:'none', color:'#94a3b8', fontSize:'1.5rem', cursor:'pointer' }}>×</button>
                        </div>

                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            Solo necesitas una cuenta rápida para finalizar el pago o guardar tu pasaje.
                        </p>

                        <form onSubmit={handleAuthSubmit}>
                            {authError && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>{authError}</div>}
                            
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Email</label>
                                <input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} required style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', padding: '0.8rem', borderRadius: '8px' }} />
                            </div>
                            
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Contraseña</label>
                                <input type="password" value={authPass} onChange={e=>setAuthPass(e.target.value)} required style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', padding: '0.8rem', borderRadius: '8px' }} />
                            </div>

                            <button type="submit" disabled={authLoading} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 600, cursor: authLoading ? 'wait' : 'pointer' }}>
                                {authLoading ? 'Procesando...' : (authModo === 'login' ? 'Ingresar y Continuar' : 'Registrarse y Continuar')}
                            </button>
                        </form>

                        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
                            {authModo === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                            <button type="button" onClick={() => { setAuthModo(m => m==='login'?'registro':'login'); setAuthError(''); }} style={{ background:'transparent', border:'none', color:'#3b82f6', cursor:'pointer', textDecoration:'underline', padding:0 }}>
                                {authModo === 'login' ? 'Regístrate aquí' : 'Inicia Sesión'}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default BuscadorViajes;
