import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../servicios/supabase';
import '../estilos/escritorio/principal.css';
import '../estilos/movil/responsivo.css';

const Inicio = () => {
    const [sucursales, setSucursales] = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        obtenerSucursales();
    }, []);

    const obtenerSucursales = async () => {
        try {
            // Obtenemos sucursales ordenadas por el ranking más alto
            const { data, error } = await supabase
                .from('sucursales')
                .select('*')
                .order('ranking', { ascending: false });

            if (error) {
                console.warn('Error de Supabase, cargando demo:', error.message);
                cargarSucursalesDemo();
            } else if (data && data.length > 0) {
                setSucursales(data);
            } else {
                cargarSucursalesDemo();
            }
        } catch (err) {
            console.warn('Sin conexión a Supabase:', err);
            cargarSucursalesDemo();
        } finally {
            setCargando(false);
        }
    };

    const cargarSucursalesDemo = () => {
        setSucursales([
            { id: '1', nombre: 'Bolívar', ranking: 4.8 },
            { id: '2', nombre: 'Trans Copacabana 1 MEM', ranking: 4.8 },
            { id: '3', nombre: 'El Dorado', ranking: 4.5 },
            { id: '4', nombre: 'Trans Azul', ranking: 3.8 }
        ]);
    };

    return (
        <div className="contenedor-inicio">
            <header className="cabecera-inicio">
                <h1>Terminal de Buses Bolivia</h1>
                <p>Selecciona tu empresa de transporte para comenzar</p>
            </header>

            {/* Botón Principal para Búsqueda Global */}
            <div className="acciones-globales">
                <Link to="/buscar" className="btn-buscar-viajes" id="btn-ir-buscador">
                    🔍 Buscar Viajes Disponibles
                </Link>
            </div>

            {cargando ? (
                <div className="estado-carga">Cargando empresas...</div>
            ) : (
                /* Contenedor tipo Matriz (Grid) */
                <div className="matriz-sucursales">
                    {sucursales.map(s => (
                        <Link to={`/sucursal/${s.id}`} key={s.id} className="tarjeta-matriz">
                            <div className="logo-contenedor">
                                {s.logo_url ? (
                                    <img src={s.logo_url} alt={`Logo ${s.nombre}`} />
                                ) : (
                                    <div className="logo-placeholder">{s.nombre.charAt(0)}</div>
                                )}
                            </div>
                            <h3 className="sucursal-nombre">{s.nombre}</h3>
                            <div className="sucursal-ranking">
                                ⭐ {s.ranking ? s.ranking.toFixed(1) : 'N/A'}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Inicio;