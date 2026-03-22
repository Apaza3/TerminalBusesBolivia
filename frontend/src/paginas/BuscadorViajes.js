import React, { useState } from 'react';
import { supabase } from '../servicios/supabase';
import TarjetaViaje from '../componentes/TarjetaViaje';
import '../estilos/escritorio/buscador.css';
import '../estilos/movil/buscador-responsivo.css';

/**
 * Ciudades principales de Bolivia para los selectores de Origen y Destino.
 * Ordenadas alfabéticamente para facilitar la búsqueda del usuario.
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
 * Datos de demostración para visualizar el diseño sin conexión a Supabase.
 * NOTA: Remover cuando se conecte a la base de datos real.
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
 * BuscadorViajes - Página principal del módulo de búsqueda de rutas.
 * Permite filtrar viajes por Origen, Destino y Fecha.
 * Muestra resultados como tarjetas con rankings y amenidades.
 */
const BuscadorViajes = ({ onVolver }) => {
    // Estado de los filtros de búsqueda
    const [origen, setOrigen] = useState('');
    const [destino, setDestino] = useState('');
    const [fecha, setFecha] = useState('');

    // Estado de los resultados
    const [resultados, setResultados] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [buscado, setBuscado] = useState(false);

    /**
     * Ejecuta la búsqueda de viajes en Supabase.
     * Realiza un JOIN entre viajes, buses y sucursales para obtener todos los datos.
     * Si falla la conexión a Supabase, carga datos de demostración.
     */
    const buscarViajes = async () => {
        // Validación: al menos origen y destino son requeridos
        if (!origen || !destino) {
            return;
        }

        setCargando(true);
        setBuscado(true);

        try {
            // Consulta a Supabase con relaciones (JOIN implícito)
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

            // Filtro opcional por fecha
            if (fecha) {
                const fechaInicio = `${fecha}T00:00:00`;
                const fechaFin = `${fecha}T23:59:59`;
                query = query.gte('salida', fechaInicio).lte('salida', fechaFin);
            }

            const { data, error } = await query;

            if (error) {
                console.warn('Error consultando Supabase, cargando datos demo:', error.message);
                // Fallback: usar datos de demostración filtrados
                cargarDatosDemo();
                return;
            }

            if (data && data.length > 0) {
                // Transformar datos de Supabase al formato esperado por TarjetaViaje
                const viajesTransformados = data.map(v => ({
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
                setResultados(viajesTransformados);
            } else {
                // Sin resultados reales, intentar datos demo
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
     * Carga datos de demostración filtrados por origen y destino seleccionados.
     * Usado como fallback cuando Supabase no está disponible.
     */
    const cargarDatosDemo = () => {
        const filtrados = DATOS_DEMO.filter(v =>
            v.origen.toLowerCase() === origen.toLowerCase() &&
            v.destino.toLowerCase() === destino.toLowerCase()
        );
        setResultados(filtrados.length > 0 ? filtrados : DATOS_DEMO);
        setCargando(false);
    };

    /**
     * Handler para el botón "Seleccionar" en cada tarjeta.
     * Preparado para futuro módulo de selección de asientos.
     */
    const handleSeleccionar = (viaje) => {
        console.log('Viaje seleccionado:', viaje);
        // TODO: Navegar al módulo de selección de asientos
        alert(`Has seleccionado el viaje de ${viaje.sucursal_nombre}\n${viaje.origen} → ${viaje.destino}\nPrecio: Bs ${viaje.precio}`);
    };

    // Fecha mínima: hoy (no permitir buscar en el pasado)
    const fechaMinima = new Date().toISOString().split('T')[0];

    return (
        <div className="contenedor-buscador">
            {/* Cabecera con botón de retorno */}
            <div className="buscador-header">
                <button className="btn-volver" onClick={onVolver} id="btn-volver">
                    ← Volver
                </button>
                <h1>Buscar Viajes</h1>
                <p>Encuentra tu próximo destino en Bolivia</p>
            </div>

            {/* Formulario de filtros */}
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

            {/* Resultados */}
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
                        <p>Intenta con otra fecha o ruta diferente</p>
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
