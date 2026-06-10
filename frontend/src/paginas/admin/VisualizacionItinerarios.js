// [Académico] R16 — Visualización de Itinerarios
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import { getItinerariosSucursal } from '../../servicios/api';
import ExportReportes from '../../componentes/ExportReportes';
import gsap from 'gsap';

const ESTADO_CFG = {
    programado:    { bg: '#1e3a8a22', color: '#93c5fd', label: 'Programado',    icon: '📅' },
    autorizado:    { bg: '#14532d22', color: '#86efac', label: 'Autorizado',    icon: '✅' },
    en_viaje:      { bg: '#78350f22', color: '#fde68a', label: 'En Ruta',       icon: '🚀' },
    completado:    { bg: '#37415122', color: '#9ca3af', label: 'Completado',    icon: '🏁' },
    cancelado:     { bg: '#7f1d1d22', color: '#fca5a5', label: 'Cancelado',     icon: '❌' },
    deshabilitado: { bg: '#37415122', color: '#64748b', label: 'Deshabilitado', icon: '⛔' },
};

const CAT_CFG = {
    economico: { color: '#94a3b8', label: 'Económico' },
    semicama:  { color: '#38bdf8', label: 'Semi-Cama' },
    cama:      { color: '#a78bfa', label: 'Cama'      },
    vip:       { color: '#fbbf24', label: 'VIP'       },
    ejecutivo: { color: '#34d399', label: 'Ejecutivo' },
};

const FILTROS_ESTADO = [
    { val: 'todos',      label: 'Todos'       },
    { val: 'programado', label: 'Programados' },
    { val: 'autorizado', label: 'Autorizados' },
    { val: 'en_viaje',   label: 'En Ruta'     },
    { val: 'completado', label: 'Completados' },
    { val: 'cancelado',  label: 'Cancelados'  },
];

const VISTAS = [
    { id: 'tabla',    icon: '📋', label: 'Tabla'    },
    { id: 'timeline', icon: '📅', label: 'Timeline' },
];

const hoy = () => new Date().toISOString().split('T')[0];
const hace7 = () => new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
const en30 = () => new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

const VisualizacionItinerarios = () => {
    const { perfil } = useAuth();
    const deptNombre = perfil?.departamento || 'La Paz';
    const tema = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];
    const containerRef = useRef(null);

    const [itinerarios, setItinerarios] = useState([]);
    const [cargando, setCargando]       = useState(true);
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [busqueda, setBusqueda]       = useState('');
    const [fechaDesde, setFechaDesde]   = useState(hace7());
    const [fechaHasta, setFechaHasta]   = useState(en30());
    const [vista, setVista]             = useState('tabla');

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-anim="seccion"]', {
                y: 24, opacity: 0, duration: 0.45,
                stagger: 0.08, ease: 'power3.out',
            });
        }, containerRef);
        return () => ctx.revert();
    }, []);

    const cargarDatos = useCallback(async () => {
        setCargando(true);
        const data = await getItinerariosSucursal(perfil?.sucursal_id, {
            fechaDesde, fechaHasta,
        });
        setItinerarios(data);
        setCargando(false);
    }, [perfil?.sucursal_id, fechaDesde, fechaHasta]);

    useEffect(() => { cargarDatos(); }, [cargarDatos]);

    // ── Filtrado ──────────────────────────────────────────
    const filtrados = useMemo(() => {
        const q = busqueda.toLowerCase().trim();
        return itinerarios.filter(v => {
            const matchEstado = filtroEstado === 'todos' || v.estado === filtroEstado;
            const matchBusq = !q
                || v.origen?.toLowerCase().includes(q)
                || v.destino?.toLowerCase().includes(q)
                || v.busPlaca?.toLowerCase().includes(q)
                || v.conductorNombre?.toLowerCase().includes(q)
                || v.anden?.toLowerCase().includes(q);
            return matchEstado && matchBusq;
        });
    }, [itinerarios, filtroEstado, busqueda]);

    // ── KPIs ──────────────────────────────────────────────
    const kpis = useMemo(() => ({
        total:       itinerarios.length,
        programados: itinerarios.filter(v => v.estado === 'programado').length,
        enRuta:      itinerarios.filter(v => v.estado === 'en_viaje').length,
        completados: itinerarios.filter(v => v.estado === 'completado').length,
        cancelados:  itinerarios.filter(v => v.estado === 'cancelado').length,
    }), [itinerarios]);

    // ── Timeline: agrupar por día ─────────────────────────
    const porDia = useMemo(() => {
        const grupos = {};
        filtrados.forEach(v => {
            const dia = v.fecha_salida?.split('T')[0] || 'sin-fecha';
            if (!grupos[dia]) grupos[dia] = [];
            grupos[dia].push(v);
        });
        return Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b));
    }, [filtrados]);

    // ── Export data ───────────────────────────────────────
    const COLS_PDF = ['Ruta', 'Fecha', 'Hora', 'Bus', 'Conductor', 'Precio', 'Estado', 'Andén'];
    const filasExport = filtrados.map(v => {
        const d = new Date(v.fecha_salida);
        return [
            `${v.origen} → ${v.destino}`,
            d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }),
            d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
            v.busPlaca,
            v.conductorNombre,
            `Bs ${v.precio}`,
            ESTADO_CFG[v.estado]?.label || v.estado,
            v.anden || '—',
        ];
    });
    const datosExcel = filtrados.map(v => ({
        Ruta: `${v.origen} → ${v.destino}`,
        Fecha: v.fecha_salida,
        Bus: v.busPlaca,
        Marca: v.busMarca,
        Capacidad: v.busCapacidad,
        Categoría: v.busCategoria,
        Conductor: v.conductorNombre,
        'Precio (Bs)': v.precio,
        Duración: v.duracion_estimada || '—',
        Estado: ESTADO_CFG[v.estado]?.label || v.estado,
        Andén: v.anden || '—',
    }));

    const badge = (estado) => {
        const c = ESTADO_CFG[estado] || ESTADO_CFG.programado;
        return (
            <span style={{
                background: c.bg, color: c.color,
                padding: '0.15rem 0.55rem', borderRadius: '999px',
                fontSize: '0.72rem', fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            }}>
                {c.icon} {c.label}
            </span>
        );
    };

    const catBadge = (cat) => {
        const c = CAT_CFG[cat] || CAT_CFG.economico;
        return (
            <span style={{
                color: c.color, fontSize: '0.7rem', fontWeight: 600,
                background: `${c.color}15`, padding: '0.1rem 0.45rem',
                borderRadius: '4px',
            }}>
                {c.label}
            </span>
        );
    };

    return (
        <div ref={containerRef} style={{ color: '#f1f5f9', fontFamily: "'Inter', system-ui, sans-serif" }}>
            <div style={{ maxWidth: 1100, margin: '2rem auto', padding: '0 1rem' }}>

                {/* ── Header ────────────────────────────────────── */}
                <div data-anim="seccion" style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem',
                }}>
                    <div>
                        <div style={{
                            fontSize: 'clamp(1.5rem,3.5vw,2rem)', fontWeight: 900,
                            background: `linear-gradient(90deg, ${tema.color}, ${tema.colorSecundario})`,
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            fontFamily: "'Rajdhani', system-ui, sans-serif",
                            textTransform: 'uppercase', lineHeight: 1.1,
                        }}>Itinerarios</div>
                        <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '0.2rem' }}>
                            Visualización completa de viajes programados — {perfil?.sucursal_nombre || 'Administración'}
                        </div>
                    </div>
                    <ExportReportes
                        titulo={`Itinerarios — ${perfil?.sucursal_nombre || 'Terminal Buses Bolivia'}`}
                        columnas={COLS_PDF} filas={filasExport}
                        datosExcel={datosExcel} nombreArchivo="itinerarios"
                    />
                </div>

                {/* ── KPIs ──────────────────────────────────────── */}
                <div data-anim="seccion" style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: '0.75rem', marginBottom: '1.5rem',
                }}>
                    {[
                        { label: 'Total Viajes',  valor: kpis.total,       color: tema.color, icon: '🗓️' },
                        { label: 'Programados',   valor: kpis.programados, color: '#3b82f6',  icon: '📅' },
                        { label: 'En Ruta',       valor: kpis.enRuta,      color: '#f59e0b',  icon: '🚀' },
                        { label: 'Completados',   valor: kpis.completados, color: '#10b981',  icon: '🏁' },
                        { label: 'Cancelados',    valor: kpis.cancelados,  color: '#ef4444',  icon: '❌' },
                    ].map(kpi => (
                        <div key={kpi.label} style={{
                            background: '#1e293b', borderRadius: '12px', padding: '1rem',
                            border: `1px solid ${kpi.color}25`, textAlign: 'center',
                            boxShadow: `0 0 20px ${kpi.color}08`,
                        }}>
                            <div style={{ fontSize: '1.3rem' }}>{kpi.icon}</div>
                            <div style={{ fontSize: '1.5rem', color: kpi.color, fontWeight: 800, lineHeight: 1.1, marginTop: '0.15rem' }}>{kpi.valor}</div>
                            <div style={{ color: '#64748b', fontSize: '0.68rem', marginTop: '0.1rem' }}>{kpi.label}</div>
                        </div>
                    ))}
                </div>

                {/* ── Filtros ───────────────────────────────────── */}
                <div data-anim="seccion" style={{
                    display: 'flex', gap: '0.5rem', marginBottom: '1rem',
                    flexWrap: 'wrap', alignItems: 'center',
                }}>
                    {/* Estado */}
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {FILTROS_ESTADO.map(f => (
                            <button key={f.val} onClick={() => setFiltroEstado(f.val)} style={{
                                padding: '0.35rem 0.75rem', borderRadius: '6px',
                                border: 'none', cursor: 'pointer',
                                background: filtroEstado === f.val ? tema.color : '#1e293b',
                                color: filtroEstado === f.val ? '#fff' : '#64748b',
                                fontSize: '0.78rem', fontWeight: filtroEstado === f.val ? 700 : 400,
                                outline: filtroEstado === f.val ? 'none' : '1px solid #334155',
                                transition: 'all 0.15s',
                            }}>{f.label}</button>
                        ))}
                    </div>

                    {/* Vista */}
                    <div style={{ display: 'flex', gap: '0.25rem', marginLeft: 'auto' }}>
                        {VISTAS.map(v => (
                            <button key={v.id} onClick={() => setVista(v.id)} style={{
                                padding: '0.35rem 0.65rem', borderRadius: '6px',
                                border: `1px solid ${vista === v.id ? tema.color + '50' : '#334155'}`,
                                cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                                background: vista === v.id ? `${tema.color}18` : '#1e293b',
                                color: vista === v.id ? tema.color : '#64748b',
                                transition: 'all 0.15s',
                            }}>{v.icon} {v.label}</button>
                        ))}
                    </div>
                </div>

                {/* Rango de fechas + búsqueda */}
                <div data-anim="seccion" style={{
                    display: 'flex', gap: '0.5rem', marginBottom: '1.25rem',
                    flexWrap: 'wrap', alignItems: 'center',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontSize: '0.73rem', color: '#64748b' }}>Desde</span>
                        <input type="date" value={fechaDesde}
                            onChange={e => setFechaDesde(e.target.value)}
                            style={{
                                background: '#1e293b', border: '1px solid #334155',
                                color: '#f1f5f9', padding: '0.35rem 0.6rem',
                                borderRadius: '6px', fontSize: '0.8rem', outline: 'none',
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontSize: '0.73rem', color: '#64748b' }}>Hasta</span>
                        <input type="date" value={fechaHasta}
                            onChange={e => setFechaHasta(e.target.value)}
                            style={{
                                background: '#1e293b', border: '1px solid #334155',
                                color: '#f1f5f9', padding: '0.35rem 0.6rem',
                                borderRadius: '6px', fontSize: '0.8rem', outline: 'none',
                            }}
                        />
                    </div>
                    <input type="text" placeholder="Buscar ruta, placa, conductor, andén…"
                        value={busqueda} onChange={e => setBusqueda(e.target.value)}
                        style={{
                            flex: 1, minWidth: 200, background: '#1e293b',
                            border: `1px solid ${tema.color}30`, color: '#f1f5f9',
                            padding: '0.38rem 0.75rem', borderRadius: '6px',
                            fontSize: '0.82rem', outline: 'none',
                        }}
                    />
                    <div style={{ fontSize: '0.72rem', color: '#475569' }}>
                        {filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}
                    </div>
                </div>

                {/* ── Contenido ─────────────────────────────────── */}
                {cargando ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: '#475569' }}>
                        Cargando itinerarios de {perfil?.sucursal_nombre}...
                    </div>
                ) : filtrados.length === 0 ? (
                    <div data-anim="seccion" style={{
                        background: '#1e293b', borderRadius: '14px', padding: '3rem',
                        textAlign: 'center', color: '#475569', border: '1px solid #334155',
                    }}>
                        Sin itinerarios en el rango seleccionado.
                    </div>
                ) : vista === 'tabla' ? (
                    /* ═══ VISTA: TABLA ═══ */
                    <div data-anim="seccion" style={{
                        background: '#1e293b', borderRadius: '14px',
                        border: '1px solid #334155', overflow: 'hidden',
                    }}>
                        <div style={{
                            padding: '0.85rem 1.5rem', borderBottom: '1px solid #33415530',
                            fontWeight: 700, color: '#f1f5f9',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <span>📋 Itinerarios — {perfil?.sucursal_nombre}</span>
                            <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 400 }}>
                                {filtrados.length} viajes
                            </span>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                                <thead>
                                    <tr style={{ background: '#0f172a', borderBottom: `1px solid ${tema.color}12` }}>
                                        {['Ruta', 'Fecha', 'Hora', 'Bus', 'Categoría', 'Conductor', 'Precio', 'Andén', 'Estado'].map(h => (
                                            <th key={h} style={{
                                                padding: '0.75rem 0.9rem', textAlign: 'left',
                                                color: '#475569', fontWeight: 500, whiteSpace: 'nowrap',
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtrados.map((v, idx) => {
                                        const d = new Date(v.fecha_salida);
                                        const esHoy = d.toISOString().split('T')[0] === hoy();
                                        return (
                                            <tr key={v.id} style={{
                                                borderBottom: '1px solid #0f172a20',
                                                background: esHoy ? `${tema.color}08` : 'transparent',
                                            }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#0f172a40'}
                                                onMouseLeave={e => e.currentTarget.style.background = esHoy ? `${tema.color}08` : 'transparent'}
                                            >
                                                <td style={{ padding: '0.65rem 0.9rem', fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap' }}>
                                                    {v.origen} → {v.destino}
                                                </td>
                                                <td style={{ padding: '0.65rem 0.9rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                                    {esHoy && <span style={{
                                                        background: `${tema.color}25`, color: tema.color,
                                                        padding: '0.1rem 0.4rem', borderRadius: '4px',
                                                        fontSize: '0.65rem', fontWeight: 700, marginRight: '0.35rem',
                                                    }}>HOY</span>}
                                                    {d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })}
                                                </td>
                                                <td style={{
                                                    padding: '0.65rem 0.9rem', color: tema.acento || tema.color,
                                                    fontFamily: 'monospace', whiteSpace: 'nowrap', fontWeight: 600,
                                                }}>
                                                    {d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td style={{ padding: '0.65rem 0.9rem' }}>
                                                    <div style={{ color: '#f1f5f9', fontFamily: 'monospace', fontWeight: 600, fontSize: '0.82rem' }}>
                                                        {v.busPlaca}
                                                    </div>
                                                    <div style={{ color: '#475569', fontSize: '0.68rem' }}>
                                                        {v.busMarca} · {v.busCapacidad} asientos
                                                    </div>
                                                </td>
                                                <td style={{ padding: '0.65rem 0.9rem' }}>
                                                    {catBadge(v.busCategoria)}
                                                </td>
                                                <td style={{ padding: '0.65rem 0.9rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                                                    {v.conductorNombre}
                                                </td>
                                                <td style={{ padding: '0.65rem 0.9rem', color: '#10b981', fontWeight: 600 }}>
                                                    Bs {v.precio}
                                                </td>
                                                <td style={{ padding: '0.65rem 0.9rem' }}>
                                                    {v.anden ? (
                                                        <span style={{
                                                            background: '#3b82f620', color: '#60a5fa',
                                                            padding: '0.12rem 0.5rem', borderRadius: '4px',
                                                            fontSize: '0.75rem', fontWeight: 700,
                                                        }}>🚏 {v.anden}</span>
                                                    ) : (
                                                        <span style={{ color: '#475569', fontSize: '0.75rem' }}>—</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '0.65rem 0.9rem' }}>
                                                    {badge(v.estado)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* ═══ VISTA: TIMELINE ═══ */
                    <div data-anim="seccion" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {porDia.map(([dia, viajes]) => {
                            const dObj = new Date(dia + 'T12:00:00');
                            const esHoy = dia === hoy();
                            return (
                                <div key={dia}>
                                    {/* Header del día */}
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                                        marginBottom: '0.75rem',
                                    }}>
                                        <div style={{
                                            width: 44, height: 44, borderRadius: '12px',
                                            background: esHoy ? `${tema.color}25` : '#1e293b',
                                            border: `2px solid ${esHoy ? tema.color : '#334155'}`,
                                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                                            justifyContent: 'center', flexShrink: 0,
                                        }}>
                                            <span style={{ fontSize: '0.6rem', color: esHoy ? tema.color : '#64748b', textTransform: 'uppercase', fontWeight: 700, lineHeight: 1 }}>
                                                {dObj.toLocaleDateString('es-BO', { month: 'short' })}
                                            </span>
                                            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: esHoy ? tema.color : '#f1f5f9', lineHeight: 1 }}>
                                                {dObj.getDate()}
                                            </span>
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: esHoy ? tema.color : '#f1f5f9' }}>
                                                {esHoy ? '✨ Hoy' : dObj.toLocaleDateString('es-BO', { weekday: 'long' })}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: '#475569' }}>
                                                {dObj.toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })} · {viajes.length} viaje{viajes.length !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                        {esHoy && (
                                            <span style={{
                                                marginLeft: 'auto', background: `${tema.color}20`,
                                                color: tema.color, padding: '0.2rem 0.6rem',
                                                borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700,
                                            }}>HOY</span>
                                        )}
                                    </div>

                                    {/* Cards del día */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                                        gap: '0.6rem',
                                        paddingLeft: '1.4rem',
                                        borderLeft: `2px solid ${esHoy ? tema.color : '#334155'}`,
                                    }}>
                                        {viajes.map(v => {
                                            const d = new Date(v.fecha_salida);
                                            return (
                                                <div key={v.id} style={{
                                                    background: '#0f172a',
                                                    borderRadius: '10px',
                                                    border: `1px solid ${tema.color}15`,
                                                    padding: '0.85rem 1rem',
                                                    transition: 'border-color 0.15s',
                                                }}
                                                    onMouseEnter={e => e.currentTarget.style.borderColor = `${tema.color}40`}
                                                    onMouseLeave={e => e.currentTarget.style.borderColor = `${tema.color}15`}
                                                >
                                                    {/* Línea 1: hora + ruta + estado */}
                                                    <div style={{
                                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                        marginBottom: '0.5rem',
                                                    }}>
                                                        <span style={{
                                                            fontFamily: 'monospace', fontWeight: 800,
                                                            fontSize: '0.95rem', color: tema.acento || tema.color,
                                                        }}>
                                                            {d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f1f5f9' }}>
                                                            {v.origen} → {v.destino}
                                                        </span>
                                                        <span style={{ marginLeft: 'auto' }}>{badge(v.estado)}</span>
                                                    </div>

                                                    {/* Línea 2: detalles */}
                                                    <div style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                                                        gap: '0.4rem',
                                                    }}>
                                                        {[
                                                            { label: 'Bus',       value: v.busPlaca,        color: '#f1f5f9', mono: true },
                                                            { label: 'Conductor', value: v.conductorNombre, color: '#94a3b8' },
                                                            { label: 'Precio',    value: `Bs ${v.precio}`,  color: '#10b981' },
                                                            { label: 'Duración',  value: v.duracion_estimada || '—', color: '#64748b' },
                                                            { label: 'Andén',     value: v.anden || '—',   color: '#60a5fa' },
                                                        ].map(m => (
                                                            <div key={m.label}>
                                                                <div style={{ fontSize: '0.6rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                                    {m.label}
                                                                </div>
                                                                <div style={{
                                                                    fontSize: '0.8rem', fontWeight: 600, color: m.color,
                                                                    fontFamily: m.mono ? 'monospace' : 'inherit',
                                                                }}>
                                                                    {m.value}
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <div>
                                                            <div style={{ fontSize: '0.6rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Categoría</div>
                                                            {catBadge(v.busCategoria)}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

            </div>
        </div>
    );
};

export default VisualizacionItinerarios;
