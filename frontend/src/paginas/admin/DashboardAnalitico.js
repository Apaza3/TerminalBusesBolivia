import React, { useState, useMemo, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Bus, MapPin, AlertTriangle, Activity } from 'lucide-react';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import { getEmpresaTema } from '../../data/empresasTemas';
import { obtenerKPIsGlobales, obtenerVentasHistorico, obtenerTraficoPorHora } from '../../servicios/analyticsService';

// Static seed data — replaced by real Supabase data when analytics endpoints are ready
const TRAFICO_POR_HORA = obtenerTraficoPorHora();
const INGRESOS_POR_RUTA = [];
const BUSES_MANTENIMIENTO = [];
const obtenerKPIs = () => ({ ingresosTotales: 0, totalBoletos: 0, totalViajes: 0, rutasActivas: 0, ocupacionPromedio: 0, totalSalidasDiarias: 0 });
const obtenerAnalisisOcupacion = () => [];
import ExportReportes from '../../componentes/ExportReportes';

const FF = "'Rajdhani', system-ui, sans-serif";

const DashboardAnalitico = () => {
    const { perfil } = useAuth();

    const deptNombre = perfil?.departamento || 'La Paz';
    const sucursal   = perfil?.sucursal_nombre || '';
    const tema       = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];
    const P = tema.primary  || tema.color;
    const S = tema.secondary || tema.colorSecundario;

    const [kpis,            setKpis]            = useState(() => obtenerKPIs());
    const [periodo,         setPeriodo]         = useState('mes');
    const [ventasHistorico, setVentasHistorico] = useState([]);
    const ocupacion = useMemo(() => obtenerAnalisisOcupacion(), []);
    const [tabActiva, setTabActiva] = useState('trafico');

    useEffect(() => {
        obtenerKPIsGlobales({ sucursalId: perfil?.sucursal_id, empresaNombre: perfil?.sucursal_nombre, periodo }).then(data => setKpis(data));
        setVentasHistorico(obtenerVentasHistorico(periodo === 'semana' ? 7 : periodo === 'trimestre' ? 90 : 30));
    }, [periodo]);

    const maxSalidas  = Math.max(...TRAFICO_POR_HORA.map(h => h.salidas));
    const maxIngresos = Math.max(...INGRESOS_POR_RUTA.map(r => r.ingresos));

    const heatColor = (value, max) => {
        const intensity = value / max;
        if (intensity >= 0.8) return '#ef4444';
        if (intensity >= 0.6) return '#f59e0b';
        if (intensity >= 0.3) return '#3b82f6';
        return '#1e293b';
    };

    const ocupacionColor = (estado) => {
        if (estado === 'alta')  return '#ef4444';
        if (estado === 'media') return '#f59e0b';
        return '#10b981';
    };

    const mantenimientoColor = (estado) => {
        if (estado === 'critico') return '#ef4444';
        if (estado === 'alerta')  return '#f59e0b';
        return '#10b981';
    };

    return (
        <div style={{ color: '#f1f5f9', padding: '1.5rem 1rem 3rem' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                        <div style={{
                            fontSize: 'clamp(1.6rem,4vw,2.2rem)', fontWeight: 900, lineHeight: 1,
                            letterSpacing: '-0.02em', textTransform: 'uppercase',
                            background: `linear-gradient(90deg, ${P}, ${S})`,
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            fontFamily: FF,
                        }}>
                            Panel Analítico
                        </div>
                        <div style={{ fontSize: '0.72rem', color: `${S}90`, marginTop: '0.3rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: FF }}>
                            {sucursal || 'Terminal Buses Bolivia'} · Inteligencia operativa
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                            {[{ k: 'semana', l: '7d' }, { k: 'mes', l: '30d' }, { k: 'trimestre', l: '90d' }].map(p => (
                                <button key={p.k} onClick={() => setPeriodo(p.k)} style={{
                                    padding: '0.3rem 0.7rem', borderRadius: 6, border: 'none', fontSize: '0.73rem', fontWeight: 600,
                                    background: periodo === p.k ? '#3b82f6' : '#1e293b',
                                    color: periodo === p.k ? '#fff' : '#94a3b8', cursor: 'pointer',
                                }}>{p.l}</button>
                            ))}
                        </div>
                        <ExportReportes
                            titulo={`Panel Analítico — Terminal Buses Bolivia (${periodo})`}
                            columnas={['Ruta', 'Ingresos (Bs)', 'Boletos', 'Ocupación %']}
                            filas={INGRESOS_POR_RUTA.map(r => [r.ruta, r.ingresos, r.boletos, r.ocupacion])}
                            datosExcel={INGRESOS_POR_RUTA.map(r => ({ Ruta: r.ruta, 'Ingresos (Bs)': r.ingresos, Boletos: r.boletos, 'Ocupación %': r.ocupacion }))}
                            nombreArchivo="dashboard_analitico"
                            formatos={['pdf', 'excel', 'csv']}
                        />
                    </div>
                </div>

                {/* KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {[
                        { label: 'Ingresos Mes',     value: `Bs ${kpis.ingresosTotales.toLocaleString()}`, icon: <TrendingUp size={18} />, color: '#10b981' },
                        { label: 'Boletos Vendidos',  value: kpis.totalBoletos,                             icon: <Users size={18} />,      color: '#3b82f6' },
                        { label: 'Rutas Activas',    value: kpis.rutasActivas,                             icon: <MapPin size={18} />,     color: '#8b5cf6' },
                        { label: 'Buses en Servicio', value: kpis.busesEnServicio,                          icon: <Bus size={18} />,        color: '#f59e0b' },
                        { label: 'Ocupación Prom.',  value: `${kpis.ocupacionPromedio}%`,                  icon: <BarChart3 size={18} />,  color: '#ef4444' },
                        { label: 'Salidas/Día',      value: kpis.salidasDiarias,                           icon: <Activity size={18} />,   color: '#06b6d4' },
                    ].map((kpi, i) => (
                        <div key={i} style={{ background: '#1e293b', borderRadius: '12px', padding: '1rem', border: '1px solid #334155' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                                <span style={{ color: kpi.color }}>{kpi.icon}</span>
                                <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 500 }}>{kpi.label}</span>
                            </div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f1f5f9' }}>{kpi.value}</div>
                        </div>
                    ))}
                </div>

                {/* Tab Navigation */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', flexWrap: 'nowrap' }}>
                    {[
                        { key: 'trafico',       label: '🗓️ Tráfico' },
                        { key: 'ingresos',      label: '💰 Ingresos' },
                        { key: 'ocupacion',     label: '📊 Ocupación' },
                        { key: 'mantenimiento', label: '🔧 Mantenimiento' },
                        { key: 'ventas',        label: '📈 Ventas Hist.' },
                    ].map(tab => (
                        <button key={tab.key} onClick={() => setTabActiva(tab.key)} style={{
                            padding: '0.55rem 1rem', borderRadius: '8px', border: 'none',
                            background: tabActiva === tab.key ? '#3b82f6' : '#1e293b',
                            color: tabActiva === tab.key ? 'white' : '#94a3b8',
                            cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap',
                        }}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ═══ TAB: TRÁFICO ═══ */}
                {tabActiva === 'trafico' && (
                    <div style={{ background: '#1e293b', borderRadius: '14px', padding: '1.25rem', border: '1px solid #334155', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: '#f1f5f9' }}>
                            Mapa de Calor — Actividad del Terminal
                        </h3>
                        <div style={{ overflowX: 'auto' }}>
                            <svg viewBox="0 0 720 200" style={{ width: '100%', minWidth: '500px' }}>
                                <text x="50" y="25" fill="#64748b" fontSize="10" textAnchor="middle">Salidas</text>
                                <text x="50" y="50" fill="#64748b" fontSize="10" textAnchor="middle">Llegadas</text>
                                {TRAFICO_POR_HORA.map((h, i) => {
                                    const x = 90 + i * 34;
                                    return (
                                        <g key={h.hora}>
                                            <rect x={x} y={14} width="30" height="18" rx="3" fill={heatColor(h.salidas, maxSalidas)} opacity={0.85} />
                                            <text x={x + 15} y={27} fill="white" fontSize="8" textAnchor="middle" fontWeight="600">{h.salidas}</text>
                                            <rect x={x} y={38} width="30" height="18" rx="3" fill={heatColor(h.llegadas, maxSalidas)} opacity={0.85} />
                                            <text x={x + 15} y={51} fill="white" fontSize="8" textAnchor="middle" fontWeight="600">{h.llegadas}</text>
                                            <text x={x + 15} y={72} fill="#64748b" fontSize="7" textAnchor="middle" transform={`rotate(-45 ${x + 15} 72)`}>{h.label}</text>
                                        </g>
                                    );
                                })}
                                {TRAFICO_POR_HORA.map((h, i) => {
                                    const x = 90 + i * 34;
                                    const barH = (h.salidas / maxSalidas) * 80;
                                    return (
                                        <g key={`bar-${h.hora}`}>
                                            <rect x={x + 2}  y={190 - barH} width="12" height={barH} rx="2" fill="#3b82f6" opacity={0.7} />
                                            <rect x={x + 16} y={190 - (h.llegadas / maxSalidas) * 80} width="12" height={(h.llegadas / maxSalidas) * 80} rx="2" fill="#10b981" opacity={0.7} />
                                        </g>
                                    );
                                })}
                                <rect x={90} y={88} width="10" height="10" rx="2" fill="#3b82f6" />
                                <text x={104} y={97} fill="#94a3b8" fontSize="8">Salidas</text>
                                <rect x={150} y={88} width="10" height="10" rx="2" fill="#10b981" />
                                <text x={164} y={97} fill="#94a3b8" fontSize="8">Llegadas</text>
                            </svg>
                        </div>
                        <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                            🔴 Pico alto &nbsp; 🟡 Moderado &nbsp; 🔵 Normal &nbsp; ⚫ Bajo
                        </p>
                    </div>
                )}

                {/* ═══ TAB: INGRESOS ═══ */}
                {tabActiva === 'ingresos' && (
                    <div style={{ background: '#1e293b', borderRadius: '14px', padding: '1.25rem', border: '1px solid #334155', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#f1f5f9' }}>Ingresos por Ruta (Bs)</h3>
                        {INGRESOS_POR_RUTA.sort((a, b) => b.ingresos - a.ingresos).map((r, i) => (
                            <div key={i} style={{ marginBottom: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 500 }}>{r.ruta}</span>
                                    <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700 }}>Bs {r.ingresos.toLocaleString()}</span>
                                </div>
                                <div style={{ background: '#0f172a', borderRadius: '6px', height: '22px', overflow: 'hidden', position: 'relative' }}>
                                    <div style={{
                                        width: `${(r.ingresos / maxIngresos) * 100}%`, height: '100%', borderRadius: '6px',
                                        background: `linear-gradient(90deg, #3b82f6, ${r.ingresos / maxIngresos > 0.7 ? '#10b981' : '#60a5fa'})`,
                                        transition: 'width 0.6s ease',
                                    }} />
                                    <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.65rem', color: '#94a3b8' }}>
                                        {r.boletos} boletos
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ═══ TAB: OCUPACIÓN ═══ */}
                {tabActiva === 'ocupacion' && (
                    <div style={{ background: '#1e293b', borderRadius: '14px', padding: '1.25rem', border: '1px solid #334155', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#f1f5f9' }}>Análisis de Ocupación por Ruta</h3>
                        <div style={{ display: 'grid', gap: '0.6rem' }}>
                            {ocupacion.map((r, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    background: '#0f172a', padding: '0.85rem', borderRadius: '10px',
                                    border: `1px solid ${ocupacionColor(r.estado)}20`,
                                }}>
                                    <div style={{ position: 'relative', width: '46px', height: '46px', flexShrink: 0 }}>
                                        <svg viewBox="0 0 36 36" style={{ width: '100%', transform: 'rotate(-90deg)' }}>
                                            <circle cx="18" cy="18" r="15" fill="none" stroke="#1e293b" strokeWidth="3" />
                                            <circle cx="18" cy="18" r="15" fill="none" stroke={ocupacionColor(r.estado)} strokeWidth="3" strokeDasharray={`${r.ocupacion * 0.94} 100`} strokeLinecap="round" />
                                        </svg>
                                        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: ocupacionColor(r.estado) }}>
                                            {r.ocupacion}%
                                        </span>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9' }}>{r.ruta}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>{r.recomendacion}</div>
                                    </div>
                                    <span style={{
                                        padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 600,
                                        background: `${ocupacionColor(r.estado)}15`, color: ocupacionColor(r.estado),
                                        border: `1px solid ${ocupacionColor(r.estado)}30`,
                                    }}>
                                        {r.estado === 'alta' ? '🔥 Alta' : r.estado === 'media' ? '📊 Media' : '📉 Baja'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ═══ TAB: MANTENIMIENTO ═══ */}
                {tabActiva === 'mantenimiento' && (
                    <div style={{ background: '#1e293b', borderRadius: '14px', padding: '1.25rem', border: '1px solid #334155', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <AlertTriangle size={18} color="#f59e0b" /> Mantenimiento Predictivo
                        </h3>
                        <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '1rem' }}>
                            Alertas basadas en km recorridos y viajes desde último servicio
                        </p>
                        <div style={{ display: 'grid', gap: '0.6rem' }}>
                            {BUSES_MANTENIMIENTO.sort((a, b) => ({ critico: 0, alerta: 1, ok: 2 }[a.estado] - { critico: 0, alerta: 1, ok: 2 }[b.estado])).map(bus => (
                                <div key={bus.id} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    background: '#0f172a', padding: '0.85rem', borderRadius: '10px',
                                    borderLeft: `3px solid ${mantenimientoColor(bus.estado)}`,
                                }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${mantenimientoColor(bus.estado)}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>🚌</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f1f5f9' }}>{bus.placa}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{bus.km.toLocaleString()} km · {bus.viajesDesde} viajes desde servicio</div>
                                        <div style={{ fontSize: '0.7rem', color: '#475569' }}>Último: {bus.ultimoMantenimiento}</div>
                                    </div>
                                    <span style={{
                                        padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700,
                                        background: `${mantenimientoColor(bus.estado)}15`, color: mantenimientoColor(bus.estado),
                                        border: `1px solid ${mantenimientoColor(bus.estado)}30`, textTransform: 'uppercase',
                                    }}>
                                        {bus.estado === 'critico' ? '⚠️ Crítico' : bus.estado === 'alerta' ? '🟡 Alerta' : '✅ OK'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ═══ TAB: VENTAS HISTÓRICO ═══ */}
                {tabActiva === 'ventas' && (
                    <div style={{ background: '#1e293b', borderRadius: '14px', padding: '1.25rem', border: '1px solid #334155', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', color: '#f1f5f9' }}>
                                📈 Ventas Históricas — {periodo === 'semana' ? 'Últimos 7 días' : periodo === 'trimestre' ? 'Últimos 90 días' : 'Últimos 30 días'}
                            </h3>
                            <ExportReportes
                                titulo="Ventas Históricas"
                                columnas={['Fecha', 'Ingresos (Bs)', 'Boletos']}
                                filas={ventasHistorico.map(v => [v.fecha, v.ingresos, v.boletos])}
                                datosExcel={ventasHistorico}
                                nombreArchivo="ventas_historico"
                                formatos={['excel', 'csv']}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                            {[
                                { label: 'Ingresos Total',   value: `Bs ${ventasHistorico.reduce((s, v) => s + v.ingresos, 0).toLocaleString()}`, color: '#10b981' },
                                { label: 'Boletos Vendidos', value: ventasHistorico.reduce((s, v) => s + v.boletos, 0),                             color: '#3b82f6' },
                                { label: 'Promedio/día',     value: `Bs ${Math.round(ventasHistorico.reduce((s, v) => s + v.ingresos, 0) / (ventasHistorico.length || 1)).toLocaleString()}`, color: '#f59e0b' },
                            ].map((k, i) => (
                                <div key={i} style={{ background: '#0f172a', borderRadius: 10, padding: '0.75rem 1rem', border: '1px solid #334155' }}>
                                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: k.color, marginTop: '0.2rem' }}>{k.value}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: 80, minWidth: Math.max(300, ventasHistorico.length * 12) }}>
                                {ventasHistorico.map((v, i) => {
                                    const maxIng = Math.max(...ventasHistorico.map(x => x.ingresos), 1);
                                    const h = Math.max(4, (v.ingresos / maxIng) * 80);
                                    return (
                                        <div key={i} title={`${v.fecha}: Bs ${v.ingresos}`} style={{
                                            flex: 1, height: h, minWidth: 8,
                                            background: 'linear-gradient(180deg, #3b82f6, #1d4ed8)',
                                            borderRadius: '2px 2px 0 0', cursor: 'default', transition: 'opacity 0.2s',
                                        }} />
                                    );
                                })}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.65rem', color: '#475569' }}>
                                <span>{ventasHistorico[0]?.fecha}</span>
                                <span>{ventasHistorico[ventasHistorico.length - 1]?.fecha}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardAnalitico;
