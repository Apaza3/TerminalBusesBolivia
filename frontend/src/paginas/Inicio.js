import React, { useEffect, useState } from 'react';
import { supabase } from '../servicios/supabase';
import '../estilos/escritorio/principal.css';
import '../estilos/movil/responsivo.css';

/**
 * Inicio - Página principal que muestra las sucursales disponibles.
 * Incluye botón para navegar al buscador de viajes.
 * Props:
 *   - onBuscarViajes: callback para navegar al módulo de búsqueda
 */
const Inicio = ({ onBuscarViajes }) => {
    const [sucursales, setSucursales] = useState([]);

    useEffect(() => {
        obtenerSucursales();
    }, []);

    /**
     * Obtiene las sucursales desde Supabase ordenadas por ranking.
     * Si falla, carga datos de demostración.
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
     * Datos de demostración para sucursales.
     * NOTA: Remover cuando se conecte a la base de datos real.
     */
    const cargarSucursalesDemo = () => {
        setSucursales([
            { id: 'demo-s1', nombre: 'Trans Copacabana', ranking: 4.5, amenidades: ['WiFi', 'Bus Cama', 'Baño'] },
            { id: 'demo-s2', nombre: 'El Dorado', ranking: 4.0, amenidades: ['WiFi', 'TV'] },
            { id: 'demo-s3', nombre: 'Bolívar', ranking: 4.8, amenidades: ['WiFi', 'Bus Cama', 'Baño', 'TV', 'Aire Acondicionado'] },
            { id: 'demo-s4', nombre: 'Todo Turismo', ranking: 4.3, amenidades: ['WiFi', 'Baño', 'Aire Acondicionado'] },
        ]);
    };

    // Mapeo de colores para tags de amenidades
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

            {/* Botón principal para ir al buscador */}
            <button
                className="btn-buscar-viajes"
                onClick={onBuscarViajes}
                id="btn-ir-buscador"
            >
                🔍 Buscar Viajes Disponibles
            </button>

            <div className="lista-sucursales">
                {sucursales.map(s => (
                    <div key={s.id} className="tarjeta-sucursal">
                        <h3>{s.nombre}</h3>
                        <p>Calificación: {s.ranking} ⭐</p>

                        {/* Tags de amenidades */}
                        {s.amenidades && s.amenidades.length > 0 && (
                            <div className="sucursal-amenidades">
                                {s.amenidades.map((amenidad, index) => (
                                    <span key={index} className={`amenidad-tag ${colorAmenidad(amenidad)}`}>
                                        {amenidad}
                                    </span>
                                ))}
                            </div>
                        )}

                        <button onClick={() => window.location.href = `/sucursal/${s.id}`}>
                            Ver Salidas
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Inicio;