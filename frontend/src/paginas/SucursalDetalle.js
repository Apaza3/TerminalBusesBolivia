import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../servicios/supabase';
import TarjetaViaje from '../componentes/TarjetaViaje';
import PanelFiltros from '../componentes/PanelFiltros';
import '../estilos/escritorio/buscador.css';
import '../estilos/escritorio/filtros.css';
import '../estilos/movil/buscador-responsivo.css';
import '../estilos/movil/filtros-responsivo.css';

/**
 * SucursalDetalle - Branch detail page with scoped filtering.
 * Shows trips ONLY from the specific branch (sucursal) identified by URL param :id.
 * Advanced filters (price, quality, amenities) scope exclusively to this branch.
 * No results from competitors should appear in this view.
 */
const SucursalDetalle = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Branch info
    const [sucursal, setSucursal] = useState(null);
    const [cargandoSucursal, setCargandoSucursal] = useState(true);

    // Trips and filtering
    const [viajes, setViajes] = useState([]);
    const [cargandoViajes, setCargandoViajes] = useState(false);
    const [buscado, setBuscado] = useState(false);

    // Advanced filters (scoped to this branch only)
    const [filtrosAvanzados, setFiltrosAvanzados] = useState({
        precioMin: '',
        precioMax: '',
        calidadMinima: 0,
        amenidades: [],
    });

    // Load branch data on mount
    useEffect(() => {
        cargarSucursal();
    }, [id]);

    /**
     * Fetches branch details from Supabase by UUID.
     * Falls back to demo data if the ID starts with 'demo-'.
     */
    const cargarSucursal = async () => {
        setCargandoSucursal(true);

        // Handle demo IDs (from fallback data in Inicio.js)
        if (id.startsWith('demo-')) {
            const sucursalesDemo = [
                { id: 'demo-s1', nombre: 'Trans Copacabana', ranking: 4.5, amenidades: ['WiFi', 'Bus Cama', 'Baño'] },
                { id: 'demo-s2', nombre: 'El Dorado', ranking: 4.0, amenidades: ['WiFi', 'TV'] },
                { id: 'demo-s3', nombre: 'Bolívar', ranking: 4.8, amenidades: ['WiFi', 'Bus Cama', 'Baño', 'TV', 'Aire Acondicionado'] },
                { id: 'demo-s4', nombre: 'Todo Turismo', ranking: 4.3, amenidades: ['WiFi', 'Baño', 'Aire Acondicionado'] },
            ];
            const demoSucursal = sucursalesDemo.find(s => s.id === id);
            setSucursal(demoSucursal || { id, nombre: 'Sucursal Demo', ranking: 4.0, amenidades: [] });
            setCargandoSucursal(false);
            cargarViajesDemo();
            return;
        }

        try {
            const { data, error } = await supabase
                .from('sucursales')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.warn('Error cargando sucursal:', error.message);
                setSucursal({ id, nombre: 'Sucursal no encontrada', ranking: 0, amenidades: [] });
            } else {
                setSucursal(data);
                // Auto-load trips for this branch
                cargarViajesSucursal(data.id);
            }
        } catch (err) {
            console.warn('Sin conexión a Supabase:', err);
            setSucursal({ id, nombre: 'Sin conexión', ranking: 0, amenidades: [] });
        } finally {
            setCargandoSucursal(false);
        }
    };

    /**
     * Fetches trips scoped exclusively to this branch.
     * Applies advanced filters (price range) at the query level.
     * Star rating and amenity filters are applied client-side after fetch.
     */
    const cargarViajesSucursal = async (sucursalId) => {
        setCargandoViajes(true);
        setBuscado(true);

        try {
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
                        sucursal_id,
                        sucursales!inner (
                            id,
                            nombre,
                            ranking,
                            amenidades
                        )
                    )
                `)
                .eq('buses.sucursal_id', sucursalId || id)
                .eq('estado', 'programado')
                .order('salida', { ascending: true });

            // Price range filters at query level
            if (filtrosAvanzados.precioMin !== '') {
                query = query.gte('precio', parseFloat(filtrosAvanzados.precioMin));
            }
            if (filtrosAvanzados.precioMax !== '') {
                query = query.lte('precio', parseFloat(filtrosAvanzados.precioMax));
            }

            const { data, error } = await query;

            if (error) {
                console.warn('Error cargando viajes de sucursal:', error.message);
                cargarViajesDemo();
                return;
            }

            if (data && data.length > 0) {
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

                // Client-side: minimum star rating
                if (filtrosAvanzados.calidadMinima > 0) {
                    viajesTransformados = viajesTransformados.filter(
                        v => v.ranking >= filtrosAvanzados.calidadMinima
                    );
                }

                // Client-side: amenity match (must have ALL selected)
                if (filtrosAvanzados.amenidades.length > 0) {
                    viajesTransformados = viajesTransformados.filter(v =>
                        filtrosAvanzados.amenidades.every(a => v.amenidades.includes(a))
                    );
                }

                setViajes(viajesTransformados);
            } else {
                setViajes([]);
            }
        } catch (err) {
            console.warn('Error de conexión, cargando datos demo:', err);
            cargarViajesDemo();
        } finally {
            setCargandoViajes(false);
        }
    };

    /**
     * Demo trip data for this branch view when Supabase is unavailable.
     */
    const cargarViajesDemo = () => {
        let viajesDemo = [
            {
                id: 'demo-v1',
                sucursal_nombre: sucursal?.nombre || 'Sucursal',
                ranking: sucursal?.ranking || 4.0,
                origen: 'La Paz',
                destino: 'Cochabamba',
                salida: '2026-03-23T08:00:00',
                precio: 45.00,
                duracion_estimada: '7h 30min',
                amenidades: sucursal?.amenidades || ['WiFi'],
            },
            {
                id: 'demo-v2',
                sucursal_nombre: sucursal?.nombre || 'Sucursal',
                ranking: sucursal?.ranking || 4.0,
                origen: 'La Paz',
                destino: 'Santa Cruz',
                salida: '2026-03-23T20:00:00',
                precio: 85.00,
                duracion_estimada: '12h 00min',
                amenidades: sucursal?.amenidades || ['WiFi'],
            },
        ];

        // Apply advanced filters to demo data
        if (filtrosAvanzados.precioMin !== '') {
            viajesDemo = viajesDemo.filter(v => v.precio >= parseFloat(filtrosAvanzados.precioMin));
        }
        if (filtrosAvanzados.precioMax !== '') {
            viajesDemo = viajesDemo.filter(v => v.precio <= parseFloat(filtrosAvanzados.precioMax));
        }
        if (filtrosAvanzados.amenidades.length > 0) {
            viajesDemo = viajesDemo.filter(v =>
                filtrosAvanzados.amenidades.every(a => v.amenidades.includes(a))
            );
        }

        setViajes(viajesDemo);
        setCargandoViajes(false);
        setBuscado(true);
    };

    /**
     * Re-fetch trips with updated filters.
     */

    const aplicarFiltros = () => {
        if (id.startsWith('demo-')) {
            cargarViajesDemo();
        } else if (sucursal) {
            cargarViajesSucursal(sucursal.id);
        }
    };

    /**
     * Navega al Mapa de Asientos para realizar la reserva.
     */
    const handleSeleccionar = (viaje) => {
        navigate('/reserva/' + viaje.id);
    };

    // Color mapping for amenity tags
    const colorAmenidad = (amenidad) => {
        const colores = {
            'WiFi': 'tag-wifi',
            'Bus Cama': 'tag-cama',
            'Baño': 'tag-bano',
            'TV': 'tag-tv',
            'Aire Acondicionado': 'tag-aire',
        };
        return colores[amenidad] || 'tag-default';
    };

    // Star rendering for branch header
    const renderEstrellas = (ranking) => {
        const estrellas = [];
        const rankingNum = parseFloat(ranking) || 0;
        const llenas = Math.floor(rankingNum);
        const tieneMedia = rankingNum % 1 >= 0.5;

        for (let i = 0; i < llenas; i++) {
            estrellas.push(<span key={`full-${i}`} className="estrella llena">★</span>);
        }
        if (tieneMedia) {
            estrellas.push(<span key="half" className="estrella media">★</span>);
        }
        const vacias = 5 - llenas - (tieneMedia ? 1 : 0);
        for (let i = 0; i < vacias; i++) {
            estrellas.push(<span key={`empty-${i}`} className="estrella vacia">☆</span>);
        }
        return estrellas;
    };

    if (cargandoSucursal) {
        return (
            <div className="contenedor-buscador">
                <div className="estado-carga">
                    <div className="spinner"></div>
                    <p>Cargando información de la sucursal...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="contenedor-buscador">
            {/* Header with back button and branch info */}
            <div className="buscador-header">
                <button className="btn-volver" onClick={() => navigate(-1)} id="btn-volver-sucursal">
                    ← Volver
                </button>
                <h1>{sucursal?.nombre || 'Sucursal'}</h1>
                {sucursal && (
                    <div className="sucursal-detalle-info">
                        <div className="viaje-rating detalle-rating">
                            {renderEstrellas(sucursal.ranking)}
                            <span className="rating-numero">({sucursal.ranking})</span>
                        </div>
                        {sucursal.amenidades && sucursal.amenidades.length > 0 && (
                            <div className="detalle-amenidades">
                                {sucursal.amenidades.map((amenidad, index) => (
                                    <span key={index} className={`amenidad-tag ${colorAmenidad(amenidad)}`}>
                                        {amenidad}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Scoped filter panel (only this branch's trips) */}
            <PanelFiltros
                filtros={filtrosAvanzados}
                onFiltrosChange={setFiltrosAvanzados}
                modoSucursal={true}
                onBuscar={aplicarFiltros}
            />

            {/* Trip results */}
            <div className="buscador-resultados" id="resultados-sucursal">
                {cargandoViajes && (
                    <div className="estado-carga">
                        <div className="spinner"></div>
                        <p>Cargando viajes disponibles...</p>
                    </div>
                )}

                {!cargandoViajes && buscado && viajes.length === 0 && (
                    <div className="estado-vacio">
                        <span className="icono-vacio">🚌</span>
                        <h3>No hay viajes disponibles</h3>
                        <p>Esta sucursal no tiene viajes programados con los filtros seleccionados</p>
                    </div>
                )}

                {!cargandoViajes && viajes.length > 0 && (
                    <>
                        <div className="resultados-info">
                            <p>
                                {viajes.length} viaje{viajes.length !== 1 ? 's' : ''} de {sucursal?.nombre}
                            </p>
                        </div>
                        <div className="lista-viajes">
                            {viajes.map(viaje => (
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

export default SucursalDetalle;
