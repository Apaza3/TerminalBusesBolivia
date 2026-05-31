import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Users, Bus, MapPin, BarChart3, Activity } from 'lucide-react';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import { obtenerAnaliticaSucursal } from '../../servicios/analyticsService';
import ExportReportes from '../../componentes/ExportReportes';
import { AreaChart, BarChartH, ScatterChart, BubbleChart, DonutChart, LineChart, PieChart } from '../../componentes/charts/Charts';

const FF = "'Rajdhani', system-ui, sans-serif";

const ESTADO_VIAJE_COLOR = {
    programado: '#3b82f6', autorizado: '#86efac', en_viaje: '#f59e0b',
    completado: '#10b981', cancelado: '#ef4444', deshabilitado: '#64748b',
};
const ESTADO_VIAJE_LABEL = {
    programado: 'Programado', autorizado: 'Autorizado', en_viaje: 'En ruta',
    completado: 'Completado', cancelado: 'Cancelado', deshabilitado: 'Deshabilitado',
};
const ESTADO_BUS_COLOR = {
    disponible: '#10b981', en_viaje: '#f59e0b', mantenimiento: '#a78bfa',
    accidentado: '#ef4444', no_disponible: '#64748b',
};

const DashboardAnalitico = () => {
    const { perfil } = useAuth();
    const deptNombre = perfil?.departamento || 'La Paz';
    const sucursal = perfil?.sucursal_nombre || '';
    const tema = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];
    const P = tema.color, S = tema.colorSecundario;

    const [ana, setAna] = useState(null);
    const [periodo, setPeriodo] = useState('mes');
    const [tab, setTab] = useState('trafico');
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        if (!perfil?.sucursal_id) return;
        setCargando(true);
        obtenerAnaliticaSucursal({ sucursalId: perfil.sucursal_id, periodo }).then(d => { setAna(d); setCargando(false); });
    }, [perfil?.sucursal_id, periodo]);

    const kpis = ana?.kpis || {};
    const rutas = ana?.rutas || [];

    // datasets para gráficas
    const trafico = useMemo(() => (ana?.trafico || []).map(t => ({ label: `${String(t.hora).padStart(2, '0')}h`, salidas: t.salidas, llegadas: t.llegadas })), [ana]);
    const barIngresos = rutas.map(r => ({ key: r.ruta, value: Number(r.ingresos) || 0, icon: '🚌' }));
    const bubbleRutas = rutas.map(r => ({ name: r.ruta.split('→')[1] || r.ruta, value: Number(r.num_viajes) || 0 }));
    const scatterOcup = rutas.map(r => ({
        x: Number(r.ingresos) || 0,
        y: r.num_viajes > 0 ? Math.round((r.num_boletos / (r.num_viajes * 45)) * 100) : 0,
        label: r.ruta,
    }));
    const flota = (ana?.flota || []).map(f => ({ name: f.estado, value: f.c, color: ESTADO_BUS_COLOR[f.estado] || '#64748b' }));
    const estados = (ana?.estados || []).map(e => ({ name: ESTADO_VIAJE_LABEL[e.estado] || e.estado, value: e.c, color: ESTADO_VIAJE_COLOR[e.estado] || '#64748b' }));
    const ventas = ana?.ventas || [];

    const KPIS = [
        { label: 'Ingresos', value: `Bs ${(kpis.ingresos || 0).toLocaleString()}`, icon: <TrendingUp size={18} />, color: '#10b981' },
        { label: 'Boletos', value: kpis.boletos ?? 0, icon: <Users size={18} />, color: '#3b82f6' },
        { label: 'Rutas activas', value: kpis.rutasActivas ?? 0, icon: <MapPin size={18} />, color: '#8b5cf6' },
        { label: 'Buses en ruta', value: kpis.busesEnServicio ?? 0, icon: <Bus size={18} />, color: '#f59e0b' },
        { label: 'Ocupación prom.', value: `${kpis.ocupacionProm ?? 0}%`, icon: <BarChart3 size={18} />, color: '#ef4444' },
        { label: 'Salidas/día', value: kpis.salidasDia ?? 0, icon: <Activity size={18} />, color: '#06b6d4' },
    ];

    const TABS = [
        { key: 'trafico', label: '🗓️ Tráfico' },
        { key: 'rutas', label: '🛣️ Rutas' },
        { key: 'ocupacion', label: '📊 Ocupación' },
        { key: 'flota', label: '🚌 Flota' },
        { key: 'ventas', label: '📈 Ventas' },
    ];

    const cardSec = { background: '#0d1a2e', borderRadius: 14, padding: '1.25rem', border: `1px solid ${P}1f`, marginBottom: '1.5rem' };
    const h3 = { margin: '0 0 1rem', fontSize: '0.95rem', color: '#f1f5f9', fontWeight: 700 };

    return (
        <div style={{ color: '#f1f5f9', padding: '1.5rem 1rem 3rem' }}>
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                        <div style={{ fontSize: 'clamp(1.6rem,4vw,2.2rem)', fontWeight: 900, lineHeight: 1, textTransform: 'uppercase', background: `linear-gradient(90deg, ${P}, ${S})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: FF }}>Panel Analítico</div>
                        <div style={{ fontSize: '0.72rem', color: `${S}90`, marginTop: '0.3rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: FF }}>{sucursal || deptNombre} · Inteligencia operativa</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                            {[{ k: 'semana', l: '7d' }, { k: 'mes', l: '30d' }, { k: 'trimestre', l: '90d' }].map(p => (
                                <button key={p.k} onClick={() => setPeriodo(p.k)} style={{ padding: '0.3rem 0.7rem', borderRadius: 6, border: 'none', fontSize: '0.73rem', fontWeight: 600, background: periodo === p.k ? P : '#1e293b', color: periodo === p.k ? '#06121f' : '#94a3b8', cursor: 'pointer' }}>{p.l}</button>
                            ))}
                        </div>
                        <ExportReportes
                            titulo={`Panel Analítico — ${sucursal} (${periodo})`}
                            columnas={['Ruta', 'Viajes', 'Ingresos (Bs)', 'Boletos']}
                            filas={rutas.map(r => [r.ruta, r.num_viajes, r.ingresos, r.num_boletos])}
                            datosExcel={rutas.map(r => ({ Ruta: r.ruta, Viajes: r.num_viajes, 'Ingresos (Bs)': r.ingresos, Boletos: r.num_boletos }))}
                            nombreArchivo="analitica" formatos={['pdf', 'excel', 'csv']}
                            capturaId="reporte-analitica"
                            hojas={[
                                { nombre: 'KPIs', datos: KPIS.map(k => ({ Indicador: k.label, Valor: String(k.value) })) },
                                { nombre: 'Rutas', datos: rutas.map(r => ({ Ruta: r.ruta, Viajes: r.num_viajes, 'Ingresos (Bs)': r.ingresos, Boletos: r.num_boletos })) },
                                { nombre: 'Trafico', datos: trafico.map(t => ({ Hora: t.label, Salidas: t.salidas, Llegadas: t.llegadas })) },
                                { nombre: 'Estado viajes', datos: estados.map(e => ({ Estado: e.name, Cantidad: e.value })) },
                                { nombre: 'Flota', datos: flota.map(f => ({ Estado: f.name, Cantidad: f.value })) },
                            ]}
                        />
                    </div>
                </div>

                {/* KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {KPIS.map((kpi, i) => (
                        <div key={i} style={{ background: '#0d1a2e', borderRadius: 12, padding: '1rem', border: '1px solid #1e293b' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                                <span style={{ color: kpi.color }}>{kpi.icon}</span>
                                <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 500 }}>{kpi.label}</span>
                            </div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f1f5f9' }}>{kpi.value}</div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto' }}>
                    {TABS.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '0.55rem 1rem', borderRadius: 8, border: 'none', background: tab === t.key ? P : '#1e293b', color: tab === t.key ? '#06121f' : '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{t.label}</button>
                    ))}
                </div>

                {cargando ? (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: '4rem' }}>Cargando analítica…</div>
                ) : (
                    <>
                        {tab === 'trafico' && (
                            <div style={cardSec}>
                                <h3 style={h3}>Tráfico por hora — Salidas vs Llegadas</h3>
                                <AreaChart data={trafico} series={[
                                    { key: 'salidas', color: '#3b82f6', nombre: 'Salidas' },
                                    { key: 'llegadas', color: '#10b981', nombre: 'Llegadas' },
                                ]} />
                            </div>
                        )}

                        {tab === 'rutas' && (
                            <>
                                <div style={cardSec}>
                                    <h3 style={h3}>Ingresos por ruta (Bs)</h3>
                                    <BarChartH data={barIngresos} color={P} unidad="Bs " />
                                </div>
                                <div style={cardSec}>
                                    <h3 style={h3}>Volumen de viajes por destino</h3>
                                    <BubbleChart data={bubbleRutas} />
                                </div>
                            </>
                        )}

                        {tab === 'ocupacion' && (
                            <div style={cardSec}>
                                <h3 style={h3}>Ocupación vs Ingresos por ruta</h3>
                                <ScatterChart data={scatterOcup} color="#a78bfa" ejes={{ x: 'Ingresos (Bs)', y: 'Ocupación %' }} />
                            </div>
                        )}

                        {tab === 'flota' && (
                            <>
                                <div style={cardSec}>
                                    <h3 style={h3}>Estado de la flota</h3>
                                    <DonutChart data={flota} totalLabel="Buses" />
                                </div>
                                <div style={cardSec}>
                                    <h3 style={h3}>Estado de los viajes</h3>
                                    <PieChart data={estados} />
                                </div>
                            </>
                        )}

                        {tab === 'ventas' && (
                            <div style={cardSec}>
                                <h3 style={h3}>Ventas históricas (ingresos/día)</h3>
                                {(kpis.ingresos || 0) === 0
                                    ? <div style={{ textAlign: 'center', color: '#475569', padding: '2.5rem', fontSize: '0.85rem' }}>Sin ventas registradas aún en el período.</div>
                                    : <LineChart data={ventas} color={P} />}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Contenedor OFFSCREEN para el PDF — fondo claro, captura por bloque */}
            <div id="reporte-analitica" style={{ position: 'fixed', left: -99999, top: 0, width: 720, background: '#ffffff', padding: '1.25rem', color: '#0f172a', fontFamily: "'Inter', system-ui, sans-serif" }}>
                <div className="pdf-block" style={{ background: '#ffffff', padding: '0.5rem 0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                        {KPIS.map((k, i) => (
                            <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.75rem' }}>
                                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{k.label}</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: k.color }}>{k.value}</div>
                            </div>
                        ))}
                    </div>
                </div>
                {[
                    { t: 'Tráfico por hora — Salidas vs Llegadas', c: <AreaChart light data={trafico} series={[{ key: 'salidas', color: '#3b82f6', nombre: 'Salidas' }, { key: 'llegadas', color: '#10b981', nombre: 'Llegadas' }]} /> },
                    { t: 'Ingresos por ruta (Bs)', c: <BarChartH light data={barIngresos} color={P} unidad="Bs " /> },
                    { t: 'Volumen de viajes por destino', c: <BubbleChart light data={bubbleRutas} /> },
                    { t: 'Ocupación vs Ingresos por ruta', c: <ScatterChart light data={scatterOcup} color="#a78bfa" ejes={{ x: 'Ingresos (Bs)', y: 'Ocupación %' }} /> },
                    { t: 'Estado de la flota', c: <DonutChart light data={flota} totalLabel="Buses" /> },
                    { t: 'Estado de los viajes', c: <PieChart light data={estados} /> },
                ].map((s, i) => (
                    <div key={i} className="pdf-block" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem', marginTop: '0.75rem' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.75rem', color: '#0f172a' }}>{i + 1}. {s.t}</div>
                        {s.c}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DashboardAnalitico;
