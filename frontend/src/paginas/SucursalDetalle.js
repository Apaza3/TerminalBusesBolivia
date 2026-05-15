import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { obtenerSucursalPorId, obtenerViajesSucursal } from '../data/mockDiscoveryDB';
import FeedbackEmoji from '../componentes/FeedbackEmoji';
import TarjetaViaje from '../componentes/TarjetaViaje';
import PanelFiltros from '../componentes/PanelFiltros';
import '../estilos/escritorio/buscador.css';
import '../estilos/escritorio/filtros.css';
import '../estilos/movil/buscador-responsivo.css';
import '../estilos/movil/filtros-responsivo.css';

const VIAJES_POR_PAGINA = 4;

/**
 * SucursalDetalle - V4: Branch detail with paginated trips and emoji feedback.
 * Uses mockDiscoveryDB for data. Pagination with Prev/Next buttons.
 * FeedbackEmoji section in footer for user reviews.
 */
const SucursalDetalle = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [sucursal, setSucursal] = useState(null);
    const [cargandoSucursal, setCargandoSucursal] = useState(true);
    const [viajesTotales, setViajesTotales] = useState([]);
    const [viajesFiltrados, setViajesFiltrados] = useState([]);
    const [paginaActual, setPaginaActual] = useState(1);

    const [filtrosAvanzados, setFiltrosAvanzados] = useState({
        precioMin: '',
        precioMax: '',
        calidadMinima: 0,
        amenidades: [],
    });

    useEffect(() => {
        cargarDatos();
    }, [id]);

    const cargarDatos = () => {
        setCargandoSucursal(true);

        // Load sucursal from mockDiscoveryDB
        const suc = obtenerSucursalPorId(id);
        if (suc) {
            setSucursal(suc);
        } else {
            // Fallback for non-demo IDs
            setSucursal({ id, nombre: 'Sucursal', ranking: 4.0, logoEmoji: '🚌', colorAccent: '#3b82f6', amenidades: [] });
        }

        // Load trips
        const trips = obtenerViajesSucursal(id).map(v => ({
            ...v,
            sucursal_nombre: suc?.nombre || 'Sucursal',
            ranking: suc?.ranking || 4.0,
            amenidades: suc?.amenidades || [],
        }));
        setViajesTotales(trips);
        setViajesFiltrados(trips);
        setCargandoSucursal(false);
    };

    // Apply filters + reset pagination
    const aplicarFiltros = () => {
        let filtrados = [...viajesTotales];

        if (filtrosAvanzados.precioMin !== '') {
            filtrados = filtrados.filter(v => v.precio >= parseFloat(filtrosAvanzados.precioMin));
        }
        if (filtrosAvanzados.precioMax !== '') {
            filtrados = filtrados.filter(v => v.precio <= parseFloat(filtrosAvanzados.precioMax));
        }
        if (filtrosAvanzados.amenidades.length > 0) {
            filtrados = filtrados.filter(v =>
                filtrosAvanzados.amenidades.every(a => v.amenidades.includes(a))
            );
        }

        setViajesFiltrados(filtrados);
        setPaginaActual(1); // Reset to page 1 on filter change
    };

    // Pagination logic
    const totalPaginas = Math.ceil(viajesFiltrados.length / VIAJES_POR_PAGINA);
    const inicio = (paginaActual - 1) * VIAJES_POR_PAGINA;
    const viajesPagina = viajesFiltrados.slice(inicio, inicio + VIAJES_POR_PAGINA);

    const handleSeleccionar = (viaje) => {
        navigate('/reserva/' + viaje.id);
    };

    // Star rendering with lucide-react
    const renderEstrellas = (ranking) => {
        const stars = [];
        const num = parseFloat(ranking) || 0;
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.floor(num)) {
                stars.push(<Star key={i} size={16} fill="#f59e0b" color="#f59e0b" strokeWidth={1.5} />);
            } else {
                stars.push(<Star key={i} size={16} fill="none" color="#475569" strokeWidth={1.5} />);
            }
        }
        return stars;
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
            {/* Header */}
            <div className="buscador-header">
                <button className="btn-volver" onClick={() => navigate(-1)} id="btn-volver-sucursal">
                    ← Volver
                </button>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    {sucursal?.logoEmoji && (
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '12px',
                            background: `${sucursal.colorAccent || '#3b82f6'}15`,
                            border: `1px solid ${sucursal.colorAccent || '#3b82f6'}30`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.5rem', flexShrink: 0,
                        }}>
                            {sucursal.logoEmoji}
                        </div>
                    )}
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.3rem' }}>{sucursal?.nombre || 'Sucursal'}</h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.3rem' }}>
                            {renderEstrellas(sucursal?.ranking)}
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem', marginLeft: '0.3rem' }}>
                                ({sucursal?.ranking})
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <PanelFiltros
                filtros={filtrosAvanzados}
                onFiltrosChange={setFiltrosAvanzados}
                modoSucursal={true}
                onBuscar={aplicarFiltros}
            />

            {/* Trip Results with Pagination */}
            <div className="buscador-resultados" id="resultados-sucursal">
                {viajesFiltrados.length === 0 ? (
                    <div className="estado-vacio">
                        <span className="icono-vacio">🚌</span>
                        <h3>No hay viajes disponibles</h3>
                        <p>Ajusta los filtros o vuelve más tarde</p>
                    </div>
                ) : (
                    <>
                        <div className="resultados-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p>
                                {viajesFiltrados.length} viaje{viajesFiltrados.length !== 1 ? 's' : ''} de {sucursal?.nombre}
                            </p>
                            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                                Página {paginaActual} de {totalPaginas}
                            </span>
                        </div>

                        <div className="lista-viajes">
                            {viajesPagina.map(viaje => (
                                <TarjetaViaje
                                    key={viaje.id}
                                    viaje={viaje}
                                    onSeleccionar={handleSeleccionar}
                                />
                            ))}
                        </div>

                        {/* Pagination Controls */}
                        {totalPaginas > 1 && (
                            <div style={{
                                display: 'flex', justifyContent: 'center', alignItems: 'center',
                                gap: '1rem', marginTop: '1.5rem', paddingBottom: '0.5rem',
                            }}>
                                <button
                                    onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                                    disabled={paginaActual === 1}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                                        padding: '0.6rem 1.2rem', borderRadius: '10px',
                                        background: paginaActual === 1 ? '#1e293b' : '#3b82f6',
                                        color: paginaActual === 1 ? '#475569' : 'white',
                                        border: '1px solid #334155',
                                        cursor: paginaActual === 1 ? 'not-allowed' : 'pointer',
                                        fontWeight: 600, fontSize: '0.85rem',
                                    }}>
                                    <ChevronLeft size={16} /> Anterior
                                </button>

                                {/* Page dots */}
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    {Array.from({ length: totalPaginas }, (_, i) => (
                                        <button key={i} onClick={() => setPaginaActual(i + 1)}
                                            style={{
                                                width: '32px', height: '32px', borderRadius: '8px',
                                                border: 'none', cursor: 'pointer',
                                                background: paginaActual === i + 1 ? '#3b82f6' : '#1e293b',
                                                color: paginaActual === i + 1 ? 'white' : '#64748b',
                                                fontWeight: 600, fontSize: '0.85rem',
                                            }}>
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                                    disabled={paginaActual === totalPaginas}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                                        padding: '0.6rem 1.2rem', borderRadius: '10px',
                                        background: paginaActual === totalPaginas ? '#1e293b' : '#3b82f6',
                                        color: paginaActual === totalPaginas ? '#475569' : 'white',
                                        border: '1px solid #334155',
                                        cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer',
                                        fontWeight: 600, fontSize: '0.85rem',
                                    }}>
                                    Siguiente <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ═══════ Feedback Section ═══════ */}
            <FeedbackEmoji sucursalId={id} />
        </div>
    );
};

export default SucursalDetalle;
