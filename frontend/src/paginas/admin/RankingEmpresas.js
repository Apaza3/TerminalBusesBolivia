// [Académico] Sprint 5 - Ranking de empresas/sucursales (R24)
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import { obtenerRankingEmpresas } from '../../servicios/analyticsService';
import ExportReportes from '../../componentes/ExportReportes';
import gsap from 'gsap';

const COLS_PDF = ['#', 'Empresa', 'Ciudad', 'Promedio', 'Calificaciones', 'Viajes'];
const MEDALLES = ['🥇', '🥈', '🥉'];

const estrellasSVG = (promedio) => {
    const llenas = Math.floor(promedio);
    const media = promedio - llenas >= 0.5;
    return (
        <span style={{ fontSize: '0.85rem' }}>
            {Array.from({ length: 5 }, (_, i) => {
                if (i < llenas) return <span key={i} style={{ color: '#f59e0b' }}>★</span>;
                if (i === llenas && media) return <span key={i} style={{ color: '#f59e0b', opacity: 0.6 }}>★</span>;
                return <span key={i} style={{ color: '#334155' }}>★</span>;
            })}
        </span>
    );
};

const RankingEmpresas = () => {
    const navigate = useNavigate();
    const { perfil } = useAuth();
    const deptNombre = perfil?.departamento || 'La Paz';
    const tema = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];
    const containerRef = useRef(null);

    const [ranking, setRanking] = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-anim="card"]', { y: 30, opacity: 0, duration: 0.45, stagger: 0.06, ease: 'power3.out', delay: 0.15 });
        }, containerRef);
        return () => ctx.revert();
    }, []);

    useEffect(() => {
        // [Académico] Sprint 5 - R24: cargar ranking de empresas desde analyticsService
        obtenerRankingEmpresas().then(data => {
            setRanking(data);
            setCargando(false);
        });
    }, []);

    const filasExport = ranking.map((e, i) => [i + 1, e.nombre, e.ciudad, e.promedio, e.totalCalificaciones, e.viajes]);
    const datosExcel = ranking.map((e, i) => ({
        Posicion: i + 1, Empresa: e.nombre, Ciudad: e.ciudad,
        Promedio: e.promedio, Calificaciones: e.totalCalificaciones, Viajes: e.viajes,
    }));

    return (
        <div ref={containerRef} style={{ background: '#0f172a', minHeight: '100vh', color: '#f1f5f9', fontFamily: "'Inter', system-ui, sans-serif" }}>

            {/* Header */}
            <div style={{
                background: `linear-gradient(135deg, ${tema.bg} 0%, ${tema.colorSecundario}55 100%)`,
                borderBottom: `2px solid ${tema.color}40`,
                padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <div>
                    <button onClick={() => navigate(-1)} style={{
                        background: `${tema.color}15`, border: `1px solid ${tema.color}40`,
                        color: tema.acento, padding: '0.35rem 0.75rem', borderRadius: 7,
                        cursor: 'pointer', fontSize: '0.78rem', marginBottom: '0.35rem',
                    }}>← Volver</button>
                    <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>🏆 Ranking de Empresas</div>
                    <div style={{ fontSize: '0.75rem', color: tema.acento, opacity: 0.75 }}>
                        R24 — Calificaciones y posicionamiento por sucursal
                    </div>
                </div>
                <ExportReportes
                    titulo="Ranking de Empresas — Terminal Buses Bolivia"
                    columnas={COLS_PDF} filas={filasExport}
                    datosExcel={datosExcel} nombreArchivo="ranking_empresas"
                />
            </div>

            <div style={{ maxWidth: 800, margin: '2rem auto', padding: '0 1rem' }}>

                {cargando ? (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem' }}>Cargando ranking...</div>
                ) : (
                    <>
                        {/* Podio top 3 */}
                        {ranking.length >= 3 && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                {[ranking[1], ranking[0], ranking[2]].map((e, i) => {
                                    const pos = i === 1 ? 0 : i === 0 ? 1 : 2;
                                    const heights = ['80px', '110px', '65px'];
                                    return (
                                        <div key={e.id} data-anim="card" style={{
                                            background: '#1e293b', borderRadius: 14,
                                            border: `2px solid ${pos === 0 ? '#f59e0b' : pos === 1 ? '#94a3b8' : '#b45309'}30`,
                                            padding: '1.25rem 1rem', textAlign: 'center',
                                            alignSelf: 'flex-end', minHeight: heights[i],
                                        }}>
                                            <div style={{ fontSize: '1.8rem', marginBottom: '0.3rem' }}>{MEDALLES[pos]}</div>
                                            <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.25rem', color: '#f1f5f9' }}>
                                                {e.nombre}
                                            </div>
                                            <div style={{ color: '#64748b', fontSize: '0.72rem', marginBottom: '0.4rem' }}>{e.ciudad}</div>
                                            {estrellasSVG(e.promedio)}
                                            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f59e0b', marginTop: '0.2rem' }}>
                                                {e.promedio}
                                            </div>
                                            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{e.totalCalificaciones} cal.</div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Lista completa */}
                        <div style={{ background: '#1e293b', borderRadius: 14, border: '1px solid #334155', overflow: 'hidden' }}>
                            {ranking.map((e, idx) => (
                                <div key={e.id} data-anim="card" style={{
                                    padding: '0.9rem 1.25rem',
                                    borderBottom: idx < ranking.length - 1 ? '1px solid #0f172a' : 'none',
                                    display: 'flex', alignItems: 'center', gap: '1rem',
                                    background: idx === 0 ? 'rgba(245,158,11,0.05)' : 'transparent',
                                }}>
                                    <div style={{ width: 32, textAlign: 'center', fontWeight: 800, fontSize: '1rem', color: idx < 3 ? '#f59e0b' : '#475569' }}>
                                        {idx < 3 ? MEDALLES[idx] : `#${idx + 1}`}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f1f5f9' }}>{e.nombre}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{e.ciudad} · {e.viajes} viajes</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        {estrellasSVG(e.promedio)}
                                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#f59e0b' }}>{e.promedio}</div>
                                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{e.totalCalificaciones} calificaciones</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {ranking.length === 0 && (
                            <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                                Sin datos de ranking disponibles.
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default RankingEmpresas;
