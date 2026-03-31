import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../servicios/supabase';
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

    /**
     * Handler for the "Seleccionar" button on each trip card.
     * Prepared for the future seat selection module.
     */
    const handleSeleccionar = (viaje) => {
        // Navigate to the seat map for the selected trip
        navigate(`/reserva/${viaje.id}`);
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
        </div>
    );
};

export default BuscadorViajes;
