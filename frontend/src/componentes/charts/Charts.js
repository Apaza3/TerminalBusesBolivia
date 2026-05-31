// Gráficas reutilizables (D3 + SVG, estilos inline). `light` = modo claro (para PDF imprimible).
import React from 'react';
import {
    scaleLinear, scaleTime, line as d3line, area as d3area, curveMonotoneX,
    max, min, pie as d3pie, arc as d3arc, hierarchy, pack as d3pack, format,
} from 'd3';

const PALETTE = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];
// colores de UI según tema (oscuro panel / claro PDF)
const ui = (light) => ({
    grid: light ? '#d8dee9' : '#1e293b',
    axis: light ? '#64748b' : '#475569',
    leg: light ? '#334155' : '#94a3b8',
    center: light ? '#0f172a' : '#f1f5f9',
    track: light ? '#eef2f7' : '#0a1322',
    barTxt: '#06121f',
});
const Vacio = ({ texto = 'Sin datos', light }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: light ? '#94a3b8' : '#475569', fontSize: '0.85rem' }}>{texto}</div>
);

// ── AREA multi-serie ─────────────────────────────────────────────────────────
export function AreaChart({ data = [], series = [], height = 240, light = false }) {
    if (!data.length || !series.length) return <Vacio light={light} />;
    const C = ui(light), n = data.length;
    const xS = scaleLinear().domain([0, Math.max(1, n - 1)]).range([0, 100]);
    const maxV = max(data, d => Math.max(...series.map(s => Number(d[s.key]) || 0))) || 1;
    const yS = scaleLinear().domain([0, maxV]).range([100, 0]);
    const mkLine = d3line().x((_, i) => xS(i)).y(d => d).curve(curveMonotoneX);
    const mkArea = d3area().x((_, i) => xS(i)).y0(yS(0)).y1(d => d).curve(curveMonotoneX);
    return (
        <div style={{ position: 'relative', width: '100%', height }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                {yS.ticks(4).map((t, i) => <line key={i} x1={0} x2={100} y1={yS(t)} y2={yS(t)} stroke={C.grid} strokeDasharray="4,4" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />)}
                {series.map((s) => {
                    const ys = data.map(d => yS(Number(d[s.key]) || 0));
                    return (
                        <g key={s.key}>
                            <defs>
                                <linearGradient id={`ag-${s.key}-${light ? 'l' : 'd'}`} x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                                    <stop offset="100%" stopColor={s.color} stopOpacity={0.03} />
                                </linearGradient>
                            </defs>
                            <path d={mkArea(ys)} fill={`url(#ag-${s.key}-${light ? 'l' : 'd'})`} />
                            <path d={mkLine(ys)} fill="none" stroke={s.color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
                        </g>
                    );
                })}
            </svg>
            {data.map((d, i) => {
                if (n > 8 && i % Math.ceil(n / 6) !== 0) return null;
                return <div key={i} style={{ position: 'absolute', left: `${xS(i)}%`, top: '100%', transform: 'translateX(-50%)', fontSize: '0.62rem', color: C.axis }}>{d.label}</div>;
            })}
            <div style={{ position: 'absolute', top: -2, right: 0, display: 'flex', gap: '0.75rem' }}>
                {series.map(s => <span key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.66rem', color: C.leg }}><span style={{ width: 9, height: 9, borderRadius: 2, background: s.color }} /> {s.nombre || s.key}</span>)}
            </div>
        </div>
    );
}

// ── BAR horizontal ───────────────────────────────────────────────────────────
export function BarChartH({ data = [], color = '#3b82f6', height = 260, unidad = '', light = false }) {
    if (!data.length) return <Vacio light={light} />;
    const C = ui(light);
    const maxV = max(data, d => Number(d.value) || 0) || 1;
    const xS = scaleLinear().domain([0, maxV]).range([0, 100]);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', height, justifyContent: 'center' }}>
            {data.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: 22, textAlign: 'center', fontSize: '1rem' }}>{d.icon || '🚌'}</span>
                    <div style={{ flex: 1, position: 'relative', height: 26, background: C.track, borderRadius: 6 }}>
                        <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${Math.max(1, xS(Number(d.value) || 0))}%`, background: `linear-gradient(90deg, ${color}cc, ${color})`, borderRadius: 6 }} />
                        <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: '0.72rem', fontWeight: 700, color: C.barTxt, whiteSpace: 'nowrap' }}>{d.key}</span>
                    </div>
                    <span style={{ width: 64, textAlign: 'right', fontSize: '0.74rem', fontWeight: 800, color }}>{unidad}{(Number(d.value) || 0).toLocaleString()}</span>
                </div>
            ))}
        </div>
    );
}

// ── SCATTER ──────────────────────────────────────────────────────────────────
export function ScatterChart({ data = [], color = '#a78bfa', height = 260, ejes = {}, light = false }) {
    if (!data.length) return <Vacio light={light} />;
    const C = ui(light);
    const xMax = max(data, d => d.x) || 1, xMin = min(data, d => d.x) || 0;
    const yMax = max(data, d => d.y) || 1, yMin = min(data, d => d.y) || 0;
    const xS = scaleLinear().domain([xMin, xMax || 1]).range([0, 100]);
    const yS = scaleLinear().domain([Math.max(0, yMin - 5), yMax + 5]).range([100, 0]);
    return (
        <div style={{ position: 'relative', width: '100%', height, paddingLeft: 28, paddingBottom: 20, boxSizing: 'border-box' }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                {yS.ticks(5).map((t, i) => <line key={`y${i}`} x1={0} x2={100} y1={yS(t)} y2={yS(t)} stroke={C.grid} strokeDasharray="4,4" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />)}
                {xS.ticks(6).map((t, i) => <line key={`x${i}`} x1={xS(t)} x2={xS(t)} y1={0} y2={100} stroke={C.grid} strokeDasharray="4,4" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />)}
                {data.map((d, i) => <path key={i} d={`M ${xS(d.x)} ${yS(d.y)} l 0.0001 0`} vectorEffect="non-scaling-stroke" strokeWidth={9} strokeLinecap="round" fill="none" stroke={color}><title>{`${d.label}: ${d.x} / ${d.y}`}</title></path>)}
            </svg>
            {ejes.y && <div style={{ position: 'absolute', left: -2, top: '50%', transform: 'rotate(-90deg)', transformOrigin: 'left', fontSize: '0.6rem', color: C.axis }}>{ejes.y}</div>}
            {ejes.x && <div style={{ position: 'absolute', bottom: 0, left: '55%', transform: 'translateX(-50%)', fontSize: '0.6rem', color: C.axis }}>{ejes.x}</div>}
        </div>
    );
}

// ── BUBBLE ───────────────────────────────────────────────────────────────────
export function BubbleChart({ data = [], colors = PALETTE, size = 280, light = false }) {
    if (!data.length) return <Vacio light={light} />;
    const pack = d3pack().size([1000, 1000]).padding(10);
    const root = pack(hierarchy({ children: data }).sum(d => d.value || 0));
    const nodes = root.leaves();
    const maxV = max(data, d => d.value) || 1;
    return (
        <div style={{ position: 'relative', width: '100%', maxWidth: size, aspectRatio: '1 / 1', margin: '0 auto' }}>
            {nodes.map((node, i) => {
                const r = node.r, big = node.data.value > maxV * 0.25;
                return (
                    <div key={i} title={`${node.data.name}: ${node.data.value}`} style={{
                        position: 'absolute', left: `${(node.x / 1000) * 100}%`, top: `${(node.y / 1000) * 100}%`,
                        width: `${(r * 2 / 1000) * 100}%`, height: `${(r * 2 / 1000) * 100}%`,
                        transform: 'translate(-50%,-50%)', borderRadius: '50%',
                        background: colors[i % colors.length], border: '1px solid #ffffff44',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#06121f',
                    }}>
                        {big && <>
                            <span style={{ fontSize: `${r / 11}px`, fontWeight: 800, lineHeight: 1, textAlign: 'center', padding: '0 2px' }}>{node.data.name}</span>
                            <span style={{ fontSize: `${r / 13}px`, opacity: 0.8 }}>{node.data.value}</span>
                        </>}
                    </div>
                );
            })}
        </div>
    );
}

// ── DONUT con total al centro ────────────────────────────────────────────────
export function DonutChart({ data = [], colors = PALETTE, totalLabel = 'Total', height = 240, light = false }) {
    if (!data.length || data.every(d => !d.value)) return <Vacio light={light} />;
    const C = ui(light), radius = 100, gap = 0.02, inner = radius / 1.7;
    const arcs = d3pie().value(d => d.value).padAngle(gap)(data);
    const arcGen = d3arc().innerRadius(inner).outerRadius(radius).cornerRadius(4);
    const total = data.reduce((s, d) => s + (d.value || 0), 0);
    return (
        <div style={{ position: 'relative', height }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', pointerEvents: 'none' }}>
                <span style={{ fontSize: '0.72rem', color: C.axis }}>{totalLabel}</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: C.center }}>{total}</span>
            </div>
            <svg viewBox={`-${radius + 6} -${radius + 6} ${(radius + 6) * 2} ${(radius + 6) * 2}`} style={{ maxWidth: 220, height: '100%', margin: '0 auto', display: 'block' }}>
                {arcs.map((d, i) => <path key={i} d={arcGen(d)} fill={d.data.color || colors[i % colors.length]} stroke={light ? '#fff' : '#0b1628'} strokeWidth={1}><title>{`${d.data.name}: ${d.data.value}`}</title></path>)}
            </svg>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                {data.map((d, i) => <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', color: C.leg }}><span style={{ width: 9, height: 9, borderRadius: 2, background: d.color || colors[i % colors.length] }} /> {d.name} ({d.value})</span>)}
            </div>
        </div>
    );
}

// ── LINE curva con puntos ────────────────────────────────────────────────────
export function LineChart({ data = [], color = '#3b82f6', height = 240, light = false }) {
    if (!data.length) return <Vacio light={light} />;
    const C = ui(light);
    const pts = data.map(d => ({ date: d.date instanceof Date ? d.date : new Date(d.date), value: Number(d.value) || 0 }));
    const xS = scaleTime().domain([pts[0].date, pts[pts.length - 1].date]).range([0, 100]);
    const yS = scaleLinear().domain([0, max(pts, d => d.value) || 1]).range([100, 0]);
    const mkLine = d3line().x(d => xS(d.date)).y(d => yS(d.value)).curve(curveMonotoneX);
    return (
        <div style={{ position: 'relative', width: '100%', height, paddingLeft: 26, paddingBottom: 20, boxSizing: 'border-box' }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                {yS.ticks(5).map((t, i) => <line key={i} x1={0} x2={100} y1={yS(t)} y2={yS(t)} stroke={C.grid} strokeDasharray="4,4" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />)}
                <path d={mkLine(pts)} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
                {pts.map((d, i) => <path key={i} d={`M ${xS(d.date)} ${yS(d.value)} l 0.0001 0`} vectorEffect="non-scaling-stroke" strokeWidth={6} strokeLinecap="round" fill="none" stroke={color} opacity={0.7} />)}
            </svg>
            <div style={{ position: 'absolute', bottom: 0, left: 26, fontSize: '0.62rem', color: C.axis }}>{pts[0].date.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })}</div>
            <div style={{ position: 'absolute', bottom: 0, right: 0, fontSize: '0.62rem', color: C.axis }}>{pts[pts.length - 1].date.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })}</div>
        </div>
    );
}

// ── PIE con etiquetas ────────────────────────────────────────────────────────
export function PieChart({ data = [], colors = PALETTE, height = 240, light = false }) {
    if (!data.length || data.every(d => !d.value)) return <Vacio light={light} />;
    const C = ui(light), radius = 100, gap = 0.02;
    const arcs = d3pie().value(d => d.value).padAngle(gap)(data);
    const arcGen = d3arc().innerRadius(20).outerRadius(radius).cornerRadius(5);
    const labelArc = d3arc().innerRadius(radius * 0.7).outerRadius(radius * 0.7);
    const fmt = format(',d');
    return (
        <div style={{ position: 'relative', height }}>
            <svg viewBox={`-${radius + 6} -${radius + 6} ${(radius + 6) * 2} ${(radius + 6) * 2}`} style={{ maxWidth: 220, height: '100%', margin: '0 auto', display: 'block' }}>
                {arcs.map((d, i) => {
                    const [lx, ly] = labelArc.centroid(d);
                    const ang = ((d.endAngle - d.startAngle) * 180) / Math.PI;
                    return (
                        <g key={i}>
                            <path d={arcGen(d)} fill={d.data.color || colors[i % colors.length]} stroke={light ? '#fff' : '#0b1628'} strokeWidth={1}><title>{`${d.data.name}: ${d.data.value}`}</title></path>
                            {ang > 18 && <text x={lx} y={ly} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.barTxt}>{fmt(d.data.value)}</text>}
                        </g>
                    );
                })}
            </svg>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                {data.map((d, i) => <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', color: C.leg }}><span style={{ width: 9, height: 9, borderRadius: 2, background: d.color || colors[i % colors.length] }} /> {d.name} ({d.value})</span>)}
            </div>
        </div>
    );
}
