import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../servicios/supabase';
import TarjetaViaje from '../componentes/TarjetaViaje';
import PanelFiltros from '../componentes/PanelFiltros';

// Importamos los estilos respetando tu estructura de carpetas
import '../estilos/escritorio/buscador.css';
import '../estilos/escritorio/filtros.css';
import '../estilos/movil/buscador-responsivo.css';
import '../estilos/movil/filtros-responsivo.css';

const SucursalDetalle = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Estados de Sucursal
    const [sucursal, setSucursal] = useState(null);
    const [cargandoSucursal, setCargandoSucursal] = useState(true);

    // Estados de Viajes
    const [viajes, setViajes] = useState([]);
    const [cargandoViajes, setCargandoViajes] = useState(false);
    const [buscado, setBuscado] = useState(false);

    // Filtros Avanzados (Scoped a esta sucursal)
    const [filtrosAvanzados, setFiltrosAvanzados] = useState({
        precioMin: '',
        precioMax: '',
        calidadMinima: 0,
        amenidades: [],
    });

    useEffect(() => {
        cargarSucursal();
        // eslint-disable-next-line
    }, [id]);

    const cargarSucursal = async () => {
        setCargandoSucursal(true);

        // Lógica de detección de datos Demo (IDs '1', '2', '3', '4' o que empiecen con 'demo-')
        const esDemo = id.length < 5 || id.startsWith('demo-');

        if (esDemo) {
            const sucursalesDemo = [
                { id: '1', nombre: 'Bolívar', ranking: 4.8, amenidades: ['WiFi', 'Bus Cama', 'Baño', 'TV'] },
                { id: '2', nombre: 'Trans Copacabana 1 MEM', ranking: 4.8, amenidades: ['WiFi', 'Bus Cama', 'Baño'] },
                { id: '3', nombre: 'El Dorado', ranking: 4.5, amenidades: ['WiFi', 'TV'] },
                { id: '4', nombre: 'Trans Azul', ranking: 3.8, amenidades: ['Baño'] },
            ];
            const demoEncontrada = sucursalesDemo.find(s => s.id === id);
            setSucursal(demoEncontrada || { id, nombre: 'Sucursal Demo', ranking: 4.0 });
            setCargandoSucursal(false);
            cargarViajesDemo(demoEncontrada?.nombre);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('sucursales')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setSucursal(data);
            cargarViajesSucursal(data.id);
        } catch (err) {
            console.warn('Sucursal no encontrada en DB, usando fallback');
            setSucursal({ id, nombre: 'Sucursal no encontrada', ranking: 0 });
        } finally {
            setCargandoSucursal(false);
        }
    };

    const cargarViajesSucursal = async (sucursalId) => {
        setCargandoViajes(true);
        setBuscado(true);
        try {
            let query = supabase
                .from('viajes')
                .select(`
                    id, origen, destino, salida, precio, duracion_estimada, estado,
                    buses!inner (
                        id, sucursal_id,
                        sucursales!inner (id, nombre, ranking, amenidades)
                    )
                `)
                .eq('buses.sucursal_id', sucursalId)
                .eq('estado', 'programado');

            if (filtrosAvanzados.precioMin) query = query.gte('precio', filtrosAvanzados.precioMin);
            if (filtrosAvanzados.precioMax) query = query.lte('precio', filtrosAvanzados.precioMax);

            const { data, error } = await query;
            if (error) throw error;

            let filtrados = data.map(v => ({
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

            // Filtros del lado del cliente
            if (filtrosAvanzados.calidadMinima > 0) {
                filtrados = filtrados.filter(v => v.ranking >= filtrosAvanzados.calidadMinima);
            }
            if (filtrosAvanzados.amenidades.length > 0) {
                filtrados = filtrados.filter(v =>
                    filtrosAvanzados.amenidades.every(a => v.amenidades.includes(a))
                );
            }
            setViajes(filtrados);
        } catch (err) {
            cargarViajesDemo();
        } finally {
            setCargandoViajes(false);
        }
    };

    const cargarViajesDemo = (nombre) => {
        setViajes([
            {
                id: 'demo-v1',
                sucursal_nombre: nombre || sucursal?.nombre,
                ranking: sucursal?.ranking || 4.5,
                origen: 'La Paz',
                destino: 'Cochabamba',
                salida: new Date().toISOString(),
                precio: 60,
                duracion_estimada: '7h',
                amenidades: ['WiFi', 'Baño']
            }
        ]);
        setBuscado(true);
    };

    const handleSeleccionar = (viaje) => {
        // Esta es la puerta de entrada al SPRINT 2 (Mapa de Asientos)
        navigate(`/reserva/${viaje.id}`);
    };

    if (cargandoSucursal) return <div className="estado-carga">Cargando sucursal...</div>;

    return (
        <div className="contenedor-buscador">
            <div className="buscador-header">
                <button className="btn-volver" onClick={() => navigate('/')}>
                    ← Volver
                </button>
                <h1>{sucursal?.nombre}</h1>
                <div className="sucursal-detalle-info">
                    <span className="rating-numero">⭐ {sucursal?.ranking}</span>
                </div>
            </div>

            <PanelFiltros
                filtros={filtrosAvanzados}
                onFiltrosChange={setFiltrosAvanzados}
                modoSucursal={true}
                onBuscar={() => cargarViajesSucursal(id)}
            />

            <div className="buscador-resultados">
                {viajes.length > 0 ? (
                    <div className="lista-viajes">
                        {viajes.map(v => (
                            <TarjetaViaje key={v.id} viaje={v} onSeleccionar={() => handleSeleccionar(v)} />
                        ))}
                    </div>
                ) : (
                    <div className="estado-vacio">No hay viajes programados para esta empresa.</div>
                )}
            </div>
        </div>
    );
};

export default SucursalDetalle;