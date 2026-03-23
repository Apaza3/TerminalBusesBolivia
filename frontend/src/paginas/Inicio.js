import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../servicios/supabase';
import '../estilos/escritorio/principal.css';
import '../estilos/movil/responsivo.css';

/**
 * Inicio - Main landing page displaying available branches (sucursales).
 * Uses react-router-dom Link for navigation instead of prop callbacks.
 * Clicking "Ver Salidas" navigates to /sucursal/:id (scoped branch view).
 */
const Inicio = () => {
    const [sucursales, setSucursales] = useState([]);

    useEffect(() => {
        obtenerSucursales();
    }, []);

    /**
     * Fetches branches from Supabase ordered by ranking (descending).
     * Falls back to demo data if Supabase connection is unavailable.
     */
    const obtenerSucursales = async () => {
        try {
            const { data, error } = await supabase
                .from('sucursales')
                .select('*')
                .order('ranking', { ascending: false });

            if (error) {
                console.warn('Supabase no disponible, cargando datos demo:', error.message);
                cargarSucursalesDemo();
            } else if (data && data.length > 0) {
                setSucursales(data);
            } else {
                cargarSucursalesDemo();
            }
        } catch (err) {
            console.warn('Sin conexión a Supabase:', err);
            cargarSucursalesDemo();
        }
    };

    /**
     * Demo data for branches. Fallback when Supabase is not connected.
     * TODO: Remove once production Supabase is fully operational.
     */
    const cargarSucursalesDemo = () => {
        setSucursales([
            { id: 'demo-s1', nombre: 'Trans Copacabana', ranking: 4.5, amenidades: ['WiFi', 'Bus Cama', 'Baño'] },
            { id: 'demo-s2', nombre: 'El Dorado', ranking: 4.0, amenidades: ['WiFi', 'TV'] },
            { id: 'demo-s3', nombre: 'Bolívar', ranking: 4.8, amenidades: ['WiFi', 'Bus Cama', 'Baño', 'TV', 'Aire Acondicionado'] },
            { id: 'demo-s4', nombre: 'Todo Turismo', ranking: 4.3, amenidades: ['WiFi', 'Baño', 'Aire Acondicionado'] },
        ]);
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

    return (
        <div className="contenedor-inicio">
            <h1>Terminal de Buses Bolivia</h1>
            <p>Selecciona tu empresa de transporte para comenzar</p>

            {/* Main CTA button to navigate to search */}
            <Link to="/buscar" className="btn-buscar-viajes" id="btn-ir-buscador">
                🔍 Buscar Viajes Disponibles
            </Link>

            <div className="lista-sucursales">
                {sucursales.map(s => (
                    <div key={s.id} className="tarjeta-sucursal">
                        <h3>{s.nombre}</h3>
                        <p>Calificación: {s.ranking} ⭐</p>

                        {/* Amenity tags */}
                        {s.amenidades && s.amenidades.length > 0 && (
                            <div className="sucursal-amenidades">
                                {s.amenidades.map((amenidad, index) => (
                                    <span key={index} className={`amenidad-tag ${colorAmenidad(amenidad)}`}>
                                        {amenidad}
                                    </span>
                                ))}
                            </div>
                        )}

                        <Link to={`/sucursal/${s.id}`} className="btn-ver-salidas">
                            Ver Salidas
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Inicio;