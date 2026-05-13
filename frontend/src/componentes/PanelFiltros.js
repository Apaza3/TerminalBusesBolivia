import React, { useState } from 'react';

/**
 * PanelFiltros - Reusable filter panel component for multi-scope filtering.
 * Supports: Price range (min/max in Bs), Quality (minimum stars 1-5),
 * and Amenities (checkbox toggles for WiFi, Bus Cama, Baño, TV, Aire Acondicionado).
 *
 * Props:
 *   - filtros: current filter state object
 *   - onFiltrosChange: callback(newFiltros) when filters are modified
 *   - modoSucursal: boolean - if true, hides scope label (used inside branch view)
 *   - onBuscar: callback to trigger search with current filters
 */

const AMENIDADES_DISPONIBLES = [
    { id: 'WiFi', label: 'WiFi', icono: '📶' },
    { id: 'Bus Cama', label: 'Bus Cama', icono: '🛏️' },
    { id: 'Baño', label: 'Baño', icono: '🚿' },
    { id: 'TV', label: 'TV', icono: '📺' },
    { id: 'Aire Acondicionado', label: 'Aire Acondicionado', icono: '❄️' },
];

const PanelFiltros = ({ filtros, onFiltrosChange, modoSucursal = false, onBuscar }) => {
    const [expandido, setExpandido] = useState(false);

    // Update a single filter field
    const actualizarFiltro = (campo, valor) => {
        onFiltrosChange({ ...filtros, [campo]: valor });
    };

    // Toggle an amenity in the selected amenities array
    const toggleAmenidad = (amenidadId) => {
        const actuales = filtros.amenidades || [];
        const nuevas = actuales.includes(amenidadId)
            ? actuales.filter(a => a !== amenidadId)
            : [...actuales, amenidadId];
        actualizarFiltro('amenidades', nuevas);
    };

    // Reset all filters to default values
    const limpiarFiltros = () => {
        onFiltrosChange({
            precioMin: '',
            precioMax: '',
            calidadMinima: 0,
            amenidades: [],
        });
    };

    // Render interactive star rating selector (1-5)
    const renderEstrellasFiltro = () => {
        const estrellas = [];
        for (let i = 1; i <= 5; i++) {
            estrellas.push(
                <button
                    key={i}
                    type="button"
                    className={`estrella-filtro ${i <= filtros.calidadMinima ? 'activa' : ''}`}
                    onClick={() => actualizarFiltro('calidadMinima', i === filtros.calidadMinima ? 0 : i)}
                    aria-label={`Mínimo ${i} estrellas`}
                    id={`filtro-estrella-${i}`}
                >
                    {i <= filtros.calidadMinima ? '★' : '☆'}
                </button>
            );
        }
        return estrellas;
    };

    // Check if any filter is active (for visual feedback)
    const tienesFiltrosActivos = () => {
        return (
            filtros.precioMin !== '' ||
            filtros.precioMax !== '' ||
            filtros.calidadMinima > 0 ||
            (filtros.amenidades && filtros.amenidades.length > 0)
        );
    };

    return (
        <div className={`panel-filtros ${expandido ? 'expandido' : ''}`} id="panel-filtros-avanzados">
            {/* Toggle button for mobile collapse/expand */}
            <button
                className="filtros-toggle"
                onClick={() => setExpandido(!expandido)}
                id="btn-toggle-filtros"
                type="button"
            >
                <span className="filtros-toggle-icono">⚙️</span>
                <span>Filtros Avanzados</span>
                {tienesFiltrosActivos() && <span className="filtros-badge">●</span>}
                <span className={`filtros-flecha ${expandido ? 'abierta' : ''}`}>▼</span>
            </button>

            {/* Scope indicator */}
            {!modoSucursal && (
                <div className="filtros-scope">
                    <span className="scope-icono">🌐</span>
                    <span>Buscando en todas las sucursales</span>
                </div>
            )}
            {modoSucursal && (
                <div className="filtros-scope filtros-scope-sucursal">
                    <span className="scope-icono">🏢</span>
                    <span>Filtros de esta sucursal</span>
                </div>
            )}

            <div className="filtros-contenido">
                {/* Price range filter */}
                <div className="filtro-seccion">
                    <label className="filtro-seccion-label">Rango de Precio (Bs)</label>
                    <div className="filtro-rango-precio">
                        <input
                            type="number"
                            className="filtro-input filtro-precio"
                            placeholder="Mín"
                            value={filtros.precioMin}
                            onChange={(e) => actualizarFiltro('precioMin', e.target.value)}
                            min="0"
                            id="filtro-precio-min"
                        />
                        <span className="filtro-rango-separador">—</span>
                        <input
                            type="number"
                            className="filtro-input filtro-precio"
                            placeholder="Máx"
                            value={filtros.precioMax}
                            onChange={(e) => actualizarFiltro('precioMax', e.target.value)}
                            min="0"
                            id="filtro-precio-max"
                        />
                    </div>
                </div>

                {/* Quality (stars) filter */}
                <div className="filtro-seccion">
                    <label className="filtro-seccion-label">Calidad Mínima</label>
                    <div className="filtro-estrellas">
                        {renderEstrellasFiltro()}
                        {filtros.calidadMinima > 0 && (
                            <span className="filtro-estrellas-texto">
                                {filtros.calidadMinima}+ estrellas
                            </span>
                        )}
                    </div>
                </div>

                {/* Amenities filter */}
                <div className="filtro-seccion">
                    <label className="filtro-seccion-label">Características del Bus</label>
                    <div className="filtro-amenidades-grid">
                        {AMENIDADES_DISPONIBLES.map(amenidad => (
                            <button
                                key={amenidad.id}
                                type="button"
                                className={`filtro-amenidad-btn ${
                                    (filtros.amenidades || []).includes(amenidad.id) ? 'seleccionada' : ''
                                }`}
                                onClick={() => toggleAmenidad(amenidad.id)}
                                id={`filtro-amenidad-${amenidad.id.replace(/\s+/g, '-').toLowerCase()}`}
                            >
                                <span className="amenidad-btn-icono">{amenidad.icono}</span>
                                <span className="amenidad-btn-label">{amenidad.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="filtros-acciones">
                    {tienesFiltrosActivos() && (
                        <button
                            type="button"
                            className="btn-limpiar-filtros"
                            onClick={limpiarFiltros}
                            id="btn-limpiar-filtros"
                        >
                            ✕ Limpiar filtros
                        </button>
                    )}
                    {onBuscar && (
                        <button
                            type="button"
                            className="btn-aplicar-filtros"
                            onClick={onBuscar}
                            id="btn-aplicar-filtros"
                        >
                            Aplicar Filtros
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PanelFiltros;
