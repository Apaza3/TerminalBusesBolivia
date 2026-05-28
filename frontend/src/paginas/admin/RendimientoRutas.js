// [Académico] Sprint 5 - Rendimiento por ruta R23
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import { obtenerRendimientoRutas } from '../../servicios/analyticsService';
import ExportReportes from '../../componentes/ExportReportes';
import gsap from 'gsap';

const COLS_PDF = ['Ruta', 'Ingresos (Bs)', 'Boletos', 'Ocupación %', 'Puntualidad %', 'Estado', 'Incidencias'];

const badgeColor = (estado) => {
    if (estado === 'alta')  return { bg: 'rgba(239,68,68,0.1)',  color: '#f87171', label: 'Alta' };
    if (estado === 'media') return { bg: 'rgba(245,158,11,0.1)', color: '#fbbf24', label: 'Media' };
    return { bg: 'rgba(16,185,129,0.1)', color: '#6ee7b7', label: 'Baja' };
};

const RendimientoRutas = () => {
    const { perfil } = useAuth();
    const deptNombre = perfil?.departamento || 'La Paz';
    const tema = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];
    const containerRef = useRef(null);

    const [rutas, setRutas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [orden, setOrden] = useState('ingresos'); // ingresos | ocupacion | puntualidad | boletos

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-anim="seccion"]', { y: 24, opacity: 0, duration: 0.45, stagger: 0.08, ease: 'power3.out' });
        }, containerRef);
        return () => ctx.revert();
    }, []);

    useEffect(() => {
        setCargando(true);
        // [Académico] Sprint 5 - R23: cargar rendimiento de rutas desde analyticsService
        obtenerRendimientoRutas({ sucursalId: perfil?.sucursal_id }).then(data => {
            setRutas(data);
            setCargando(false);
        });
    }, []);

    const rutasOrdenadas = useMemo(() => {
        return [...rutas].sort((a, b) => b[orden] - a[orden]);
    }, [rutas, orden]);

    const maxIngresos = useMemo(() => Math.max(...rutas.map(r => r.ingresos), 1), [rutas]);

    const filasExport = rutasOrdenadas.map(r => [
        r.ruta, r.ingresos, r.boletos, r.ocupacion, r.puntualidad, r.estado, r.incidencias,
    ]);
    const datosExcel = rutasOrdenadas.map(r => ({
        Ruta: r.ruta, 'Ingresos (Bs)': r.ingresos, Boletos: r.boletos,
        'Ocupación %': r.ocupacion, 'Puntualidad %': r.puntualidad,
        Estado: r.estado, Incidencias: r.incidencias,
        Recomendacion: r.recomendacion,
    }));

    return (
        <div ref={containerRef} style={{ color: '#f1f5f9', fontFamily: "'Inter', system-ui, sans-serif" }}>

            <div style={{ maxWidth: 1000, margin: '2rem auto', padding: '0 1rem' }}>

                {/* Título */}
                <div data-anim="seccion" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                        <div style={{
                            fontSize: 'clamp(1.5rem,3.5vw,2rem)', fontWeight: 900,
                            background: `linear-gradient(90deg, ${tema.color}, ${tema.colorSecundario})`,
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            fontFamily: "'Rajdhani', system-ui, sans-serif",
                            textTransform: 'uppercase', lineHeight: 1.1,
                        }}>Rendimiento por Ruta</div>
                        <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '0.2rem' }}>
                            Análisis de rendimiento operativo por ruta
                        </div>
                    </div>
                    <ExportReportes
                        titulo="Rendimiento por Ruta — Terminal Buses Bolivia"
                        columnas={COLS_PDF} filas={filasExport}
                        datosExcel={datosExcel} nombreArchivo="rendimiento_rutas"
                    />
                </div>

                {/* Orden selector */}
                <div data-anim="seccion" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    {[
                        { key: 'ingresos', label: '💰 Ingresos' },
                        { key: 'ocupacion', label: '📊 Ocupación' },
                        { key: 'puntualidad', label: '⏱️ Puntualidad' },
                        { key: 'boletos', label: '🎫 Boletos' },
                    ].map(o => (
                        <button key={o.key} onClick={() => setOrden(o.key)} style={{
                            padding: '0.4rem 0.9rem', borderRadius: 7, border: 'none',
                            background: orden === o.key ? tema.color : '#1e293b',
                            color: orden === o.key ? '#fff' : '#94a3b8',
                            fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer',
                        }}>{o.label}</button>
                    ))}
                </div>

                {/* Tabla */}
                <div data-anim="seccion" style={{ background: '#1e293b', borderRadius: 14, border: '1px solid #334155', overflow: 'hidden' }}>
                    {cargando ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando datos...</div>
                    ) : (
                        <>
                            {/* KPI resumen */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0', borderBottom: '1px solid #334155' }}>
                                {[
                                    { label: 'Total Rutas',  value: rutas.length, color: '#3b82f6' },
                                    { label: 'Ingresos Total', value: `Bs ${rutas.reduce((s, r) => s + r.ingresos, 0).toLocaleString()}`, color: '#10b981' },
                                    { label: 'Boletos Total', value: rutas.reduce((s, r) => s + r.boletos, 0), color: '#f59e0b' },
                                    { label: 'Puntualidad Prom.', value: `${Math.round(rutas.reduce((s, r) => s + r.puntualidad, 0) / (rutas.length || 1))}%`, color: '#a78bfa' },
                                ].map((k, i) => (
                                    <div key={i} style={{ padding: '1rem', borderRight: '1px solid #334155' }}>
                                        <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</div>
                                        <div style={{ fontSize: '1.15rem', fontWeight: 700, color: k.color, marginTop: '0.2rem' }}>{k.value}</div>
                                    </div>
                                ))}
                            </div>

                            {rutasOrdenadas.map((r, idx) => {
                                const badge = badgeColor(r.estado);
                                const barW = (r.ingresos / maxIngresos) * 100;
                                return (
                                    <div key={idx} style={{
                                        padding: '1rem 1.25rem', borderBottom: '1px solid #0f172a',
                                        background: idx % 2 === 0 ? 'transparent' : 'rgba(15,23,42,0.3)',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{r.ruta}</div>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <span style={{ padding: '0.18rem 0.6rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700, background: badge.bg, color: badge.color }}>
                                                    {badge.label}
                                                </span>
                                                {r.incidencias > 0 && (
                                                    <span style={{ padding: '0.18rem 0.6rem', borderRadius: 999, fontSize: '0.7rem', background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                                                        ⚠️ {r.incidencias} incid.
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Barra ingreso */}
                                        <div style={{ height: 5, background: '#0f172a', borderRadius: 999, marginBottom: '0.6rem', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${barW}%`, background: tema.color, borderRadius: 999, transition: 'width 0.4s ease' }} />
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem' }}>
                                            {[
                                                { label: 'Ingresos', value: `Bs ${r.ingresos.toLocaleString()}`, color: '#10b981' },
                                                { label: 'Boletos', value: r.boletos, color: '#3b82f6' },
                                                { label: 'Ocupación', value: `${r.ocupacion}%`, color: '#f59e0b' },
                                                { label: 'Puntualidad', value: `${r.puntualidad}%`, color: '#a78bfa' },
                                            ].map(m => (
                                                <div key={m.label}>
                                                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>{m.label}</div>
                                                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: m.color }}>{m.value}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {r.recomendacion && r.recomendacion !== '—' && (
                                            <div style={{ marginTop: '0.4rem', fontSize: '0.73rem', color: '#64748b', fontStyle: 'italic' }}>
                                                💡 {r.recomendacion}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RendimientoRutas;
