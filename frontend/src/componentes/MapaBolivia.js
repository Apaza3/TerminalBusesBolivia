import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import gsap from 'gsap';
import { DEPARTAMENTOS } from '../contextos/DepartamentoContext';

const MAP_W = 500;
const MAP_H = 560;

const GEO_MAP = {
    'Beni':       'Beni',
    'El Beni':    'Beni',
    'Chuquisaca': 'Chuquisaca',
    'Cochabamba': 'Cochabamba',
    'La Paz':     'La Paz',
    'Oruro':      'Oruro',
    'Pando':      'Pando',
    'Potosí':     'Potosí',
    'Potosi':     'Potosí',
    'Santa Cruz': 'Santa Cruz',
    'Tarija':     'Tarija',
};

let _cache = null;

// Irregular multi-segment road path between two points
// 5 waypoints on alternating sides — deterministic, no random
const ROAD_SHAPES = [
    [ 1.2, -0.5,  1.6, -1.0,  0.4, -1.4],   // patrón A — pico brusco al centro, suave al final
    [ 0.6, -1.3,  0.3, -0.8,  1.5, -0.4],   // patrón B — inicio curvo, recta larga, giro tardío
    [ 1.4, -1.1,  0.5, -0.3,  1.7, -0.9],   // patrón C — zigzag moderado con reposo
    [-0.8,  1.0, -0.4,  1.5, -1.2,  0.3],   // patrón D — inversión suave
    [ 0.9, -0.4,  1.3, -1.5,  0.6, -1.1],   // patrón E — curva amplia tardía
    [ 0.5, -1.2,  1.1, -0.6,  0.8, -1.6],   // patrón F — oscilación decreciente
];
const roadPath = (x1, y1, x2, y2) => {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx*dx + dy*dy) || 1;
    const nx = -dy/len, ny = dx/len;
    const f = len * 0.14;
    // pick shape deterministically from endpoint coords
    const shape = ROAD_SHAPES[Math.abs(Math.round(x1+y2)) % ROAD_SHAPES.length];
    const pts = [
        { t: 0.14, o: shape[0] },
        { t: 0.28, o: shape[1] },
        { t: 0.43, o: shape[2] },
        { t: 0.57, o: shape[3] },
        { t: 0.71, o: shape[4] },
        { t: 0.86, o: shape[5] },
    ];
    let d = `M ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    let px = x1, py = y1;
    pts.forEach(({ t, o }) => {
        const wx = x1 + t*dx + nx*f*o;
        const wy = y1 + t*dy + ny*f*o;
        const cpx = (px + wx) / 2 + nx*f*o*0.38;
        const cpy = (py + wy) / 2 + ny*f*o*0.38;
        d += ` Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${wx.toFixed(1)} ${wy.toFixed(1)}`;
        px = wx; py = wy;
    });
    d += ` Q ${((px+x2)/2).toFixed(1)} ${((py+y2)/2).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    return d;
};

/*
  Props:
  - departamentoActivo  : string — dept resaltado (single mode)
  - onSelect            : fn(deptName)
  - linea               : { desde: string, hasta: string } — traza ruta animada
  - origen              : string — dept origen (color especial)
  - destino             : string — dept destino (color especial)
  - modoMulti           : bool — en true, origen/destino tienen colores distintos
*/
const MapaBolivia = ({ departamentoActivo, onSelect, linea, origen, destino, modoMulti = false }) => {
    const [geojson, setGeojson] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(false);
    const [hovered, setHovered] = useState(null);
    const [tooltip, setTooltip] = useState({ visible: false, name: '', x: 0, y: 0 });
    const lineRef   = useRef(null);
    const linePathId = 'tbb-route-path';

    useEffect(() => {
        if (_cache) { setGeojson(_cache); setLoading(false); return; }
        fetch('https://code.highcharts.com/mapdata/countries/bo/bo-all.geo.json')
            .then(r => r.json())
            .then(data => { _cache = data; setGeojson(data); setLoading(false); })
            .catch(() => { setError(true); setLoading(false); });
    }, []);

    const { paths, centroids } = useMemo(() => {
        if (!geojson?.features) return { paths: [], centroids: {} };

        let isCartesian = false;
        try {
            const geom = geojson.features[0].geometry;
            const fc = geom.type === 'Polygon' ? geom.coordinates[0][0] : geom.coordinates[0][0][0];
            isCartesian = Math.abs(fc[0]) > 180 || Math.abs(fc[1]) > 90;
        } catch (_) {}

        const projection = isCartesian
            ? d3.geoIdentity().reflectY(true).fitSize([MAP_W, MAP_H], geojson)
            : d3.geoMercator().fitSize([MAP_W, MAP_H], geojson);

        const pathGen = d3.geoPath().projection(projection);
        const ctr = {};

        const pts = geojson.features.map((feature, i) => {
            const rawName  = feature.properties.name || feature.properties['NAME_1'] || '';
            const deptName = GEO_MAP[rawName] || rawName;
            const tema     = DEPARTAMENTOS[deptName];
            const centroid = pathGen.centroid(feature);
            if (deptName && !isNaN(centroid[0])) ctr[deptName] = centroid;
            return { d: pathGen(feature), rawName, deptName, tema, i };
        });

        return { paths: pts, centroids: ctr };
    }, [geojson]);

    const lineaPath = useMemo(() => {
        if (!linea?.desde || !linea?.hasta) return null;
        const c1 = centroids[linea.desde];
        const c2 = centroids[linea.hasta];
        if (!c1 || !c2 || isNaN(c1[0]) || isNaN(c2[0])) return null;
        return roadPath(c1[0], c1[1], c2[0], c2[1]);
    }, [centroids, linea]);

    // Animate line when it appears
    useEffect(() => {
        if (!lineRef.current || !lineaPath) return;
        const el = lineRef.current;
        const len = el.getTotalLength ? el.getTotalLength() : 350;
        gsap.fromTo(el,
            { strokeDasharray: len, strokeDashoffset: len, opacity: 0 },
            { strokeDashoffset: 0, opacity: 1, duration: 2, ease: 'power2.inOut', delay: 0.2 }
        );
    }, [lineaPath]);

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260, color: '#475569', fontSize: '0.88rem' }}>
            Trazando silueta...
        </div>
    );
    if (error) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260, color: '#ef4444', fontSize: '0.82rem' }}>
            Error al cargar el mapa
        </div>
    );

    const activoTema = DEPARTAMENTOS[departamentoActivo];
    const origenColor = '#22c55e';
    const destinoColor = '#f59e0b';

    const DEPT_COLORS = {
        'La Paz':     '#00F0FF',
        'Oruro':      '#FF6B00',
        'Potosí':     '#90E0EF',
        'Cochabamba': '#7209B7',
        'Chuquisaca': '#EF233C',
        'Tarija':     '#70E000',
        'Santa Cruz': '#39FF14',
        'Beni':       '#FEE440',
        'Pando':      '#06D6A0',
    };

    const getColor = (deptName) => {
        if (modoMulti) {
            if (deptName === origen)  return origenColor;
            if (deptName === destino) return destinoColor;
            if (deptName === hovered) return `${DEPT_COLORS[deptName] || '#334155'}80`;
            return '#1e3a5f';
        }
        const c = DEPT_COLORS[deptName] || '#334155';
        if (deptName === departamentoActivo) return c;
        if (deptName === hovered)            return `${c}70`;
        return '#1e3a5f';
    };

    return (
        <div style={{ position: 'relative', userSelect: 'none' }}>
            <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                {/* Departamentos */}
                {paths.map(p => (
                    <path
                        key={p.i}
                        d={p.d}
                        fill={getColor(p.deptName)}
                        stroke="#07111f"
                        strokeWidth={1.5}
                        style={{ cursor: onSelect ? 'pointer' : 'default', transition: 'fill 0.22s ease' }}
                        onClick={() => { setHovered(null); setTooltip(prev => ({ ...prev, visible: false })); onSelect && p.deptName && onSelect(p.deptName); }}
                        onMouseEnter={(e) => {
                            setHovered(p.deptName);
                            const rect = e.currentTarget.closest('svg').getBoundingClientRect();
                            setTooltip({ visible: true, name: p.deptName, x: e.clientX - rect.left, y: e.clientY - rect.top });
                        }}
                        onMouseMove={(e) => {
                            const rect = e.currentTarget.closest('svg').getBoundingClientRect();
                            setTooltip(prev => ({ ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top }));
                        }}
                        onMouseLeave={() => { setHovered(null); setTooltip(prev => ({ ...prev, visible: false })); }}
                        onTouchEnd={() => { setHovered(null); setTooltip(prev => ({ ...prev, visible: false })); }}
                    />
                ))}

                {/* Ruta animada */}
                {lineaPath && (
                    <g>
                        {/* Sombra de la ruta */}
                        <path d={lineaPath} fill="none" stroke="#000" strokeWidth={5} opacity={0.2} strokeLinecap="round" />
                        {/* Ruta principal */}
                        <path
                            id={linePathId}
                            ref={lineRef}
                            d={lineaPath}
                            fill="none"
                            stroke="#fff"
                            strokeWidth={2.5}
                            strokeDasharray="8 5"
                            strokeLinecap="round"
                        />
                        {/* Punto de origen */}
                        {centroids[linea?.desde] && !isNaN(centroids[linea.desde][0]) && (
                            <circle cx={centroids[linea.desde][0]} cy={centroids[linea.desde][1]} r={6} fill={origenColor} stroke="#fff" strokeWidth={1.5} />
                        )}
                        {/* Punto de destino */}
                        {centroids[linea?.hasta] && !isNaN(centroids[linea.hasta][0]) && (
                            <circle cx={centroids[linea.hasta][0]} cy={centroids[linea.hasta][1]} r={6} fill={destinoColor} stroke="#fff" strokeWidth={1.5} />
                        )}
                        {/* Avión/vehículo animado sobre la ruta */}
                        <circle r={4} fill="#fff" opacity={0.9}>
                            <animateMotion dur="3s" repeatCount="indefinite" rotate="auto">
                                <mpath href={`#${linePathId}`} />
                            </animateMotion>
                        </circle>
                    </g>
                )}

                {/* Puntos de centroides en modo multi (origen/destino seleccionados) */}
                {modoMulti && origen && centroids[origen] && !isNaN(centroids[origen][0]) && !lineaPath && (
                    <circle cx={centroids[origen][0]} cy={centroids[origen][1]} r={7} fill={origenColor} stroke="#fff" strokeWidth={2} />
                )}

                {/* Tooltip */}
                {tooltip.visible && tooltip.name && (
                    <g transform={`translate(${Math.min(tooltip.x + 10, MAP_W - 140)}, ${Math.max(tooltip.y - 34, 4)})`}>
                        <rect rx={6} ry={6} width={130} height={28} fill="#0b1628" stroke="#1e3a5f" strokeWidth={1} />
                        <text x={65} y={19} textAnchor="middle" fill="#e2e8f0" fontSize={11.5} fontFamily="Inter, system-ui, sans-serif" fontWeight={600}>
                            {tooltip.name}
                        </text>
                    </g>
                )}
            </svg>

            {/* Indicador dept activo (modo simple) */}
            {!modoMulti && departamentoActivo && activoTema && (
                <div style={{ textAlign: 'center', marginTop: '0.6rem', overflow: 'hidden' }}>
                    <span style={{
                        background: `${DEPT_COLORS[departamentoActivo] || activoTema.primary}20`,
                        border: `1px solid ${DEPT_COLORS[departamentoActivo] || activoTema.primary}50`,
                        color: DEPT_COLORS[departamentoActivo] || activoTema.acento,
                        padding: '0.22rem 0.7rem', borderRadius: 20,
                        fontSize: '0.75rem', fontWeight: 700,
                        whiteSpace: 'nowrap', display: 'inline-block',
                        maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {activoTema.emoji} {departamentoActivo} seleccionado
                    </span>
                </div>
            )}

        </div>
    );
};

export default MapaBolivia;
