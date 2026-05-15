import React from 'react';

/**
 * TarjetaViaje - Componente reutilizable para mostrar un viaje individual.
 * Muestra: sucursal, ranking (estrellas), ruta, hora, precio, duración y amenidades.
 * Props:
 *   - viaje: objeto con datos del viaje (sucursal, origen, destino, salida, precio, etc.)
 *   - onSeleccionar: callback al presionar "Seleccionar" (futuro módulo de asientos)
 */
const CATEGORIA_CONFIG = {
    economico:  { label: 'Económico',  color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
    semicama:   { label: 'Semi-Cama',  color: '#38bdf8', bg: 'rgba(56,189,248,0.12)'  },
    cama:       { label: 'Cama',       color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
    vip:        { label: 'VIP ⭐',     color: '#fbbf24', bg: 'rgba(251,191,36,0.12)'  },
    ejecutivo:  { label: 'Ejecutivo',  color: '#34d399', bg: 'rgba(52,211,153,0.12)'  },
};

const TarjetaViaje = ({ viaje, onSeleccionar }) => {

    // Genera estrellas visuales basadas en el ranking (1-5)
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

    // Mapeo de colores para cada tipo de amenidad
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

    // Formatear hora de salida a formato legible
    const formatearHora = (fechaStr) => {
        try {
            const fecha = new Date(fechaStr);
            return fecha.toLocaleTimeString('es-BO', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch {
            return '--:--';
        }
    };

    // Formatear fecha completa
    const formatearFecha = (fechaStr) => {
        try {
            const fecha = new Date(fechaStr);
            return fecha.toLocaleDateString('es-BO', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            });
        } catch {
            return '';
        }
    };

    return (
        <div className="tarjeta-viaje" id={`viaje-${viaje.id}`}>
            {/* Cabecera: Sucursal + Rating */}
            <div className="viaje-cabecera">
                <div className="viaje-sucursal">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <h3 className="sucursal-nombre">{viaje.sucursal_nombre}</h3>
                        {viaje.categoria && CATEGORIA_CONFIG[viaje.categoria] && (
                            <span style={{
                                fontSize: '0.72rem', fontWeight: 700,
                                color: CATEGORIA_CONFIG[viaje.categoria].color,
                                background: CATEGORIA_CONFIG[viaje.categoria].bg,
                                padding: '0.15rem 0.6rem', borderRadius: 999,
                                border: `1px solid ${CATEGORIA_CONFIG[viaje.categoria].color}44`,
                                letterSpacing: '0.02em',
                            }}>
                                {CATEGORIA_CONFIG[viaje.categoria].label}
                            </span>
                        )}
                    </div>
                    <div className="viaje-rating">
                        {renderEstrellas(viaje.ranking)}
                        <span className="rating-numero">({viaje.ranking})</span>
                    </div>
                </div>
            </div>

            {/* Ruta: Origen → Destino */}
            <div className="viaje-ruta">
                <div className="ruta-punto origen">
                    <span className="ruta-icono">📍</span>
                    <span className="ruta-ciudad">{viaje.origen}</span>
                </div>
                <div className="ruta-linea">
                    <span className="ruta-flecha">→</span>
                    {viaje.duracion_estimada && (
                        <span className="ruta-duracion">🕐 {viaje.duracion_estimada}</span>
                    )}
                </div>
                <div className="ruta-punto destino">
                    <span className="ruta-icono">📍</span>
                    <span className="ruta-ciudad">{viaje.destino}</span>
                </div>
            </div>

            {/* Detalles: Fecha, Hora, Precio */}
            <div className="viaje-detalles">
                <div className="detalle-item">
                    <span className="detalle-label">Salida</span>
                    <span className="detalle-valor">
                        {formatearFecha(viaje.salida)} • {formatearHora(viaje.salida)}
                    </span>
                </div>
                <div className="detalle-item detalle-precio">
                    <span className="detalle-label">Precio</span>
                    <span className="detalle-valor precio-valor">
                        Bs {parseFloat(viaje.precio || 0).toFixed(2)}
                    </span>
                </div>
            </div>

            {/* Tags de amenidades */}
            {viaje.amenidades && viaje.amenidades.length > 0 && (
                <div className="viaje-amenidades">
                    {viaje.amenidades.map((amenidad, index) => (
                        <span key={index} className={`amenidad-tag ${colorAmenidad(amenidad)}`}>
                            {amenidad}
                        </span>
                    ))}
                </div>
            )}

            {/* Botón de acción */}
            <button
                className="btn-seleccionar"
                onClick={() => onSeleccionar && onSeleccionar(viaje)}
                id={`btn-seleccionar-${viaje.id}`}
            >
                Seleccionar
            </button>
        </div>
    );
};

export default TarjetaViaje;
