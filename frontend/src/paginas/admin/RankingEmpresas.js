// [Académico] Sprint 5 - Ranking de empresas por departamento (R24) — bar chart horizontal
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import { getSucursales } from '../../servicios/api';
import { getEmpresaLogo } from '../../utils/assets';

const MAX_PTS = 5; // escala de ranking 0–5
const MEDAL = ['🥇', '🥈', '🥉'];
const MEDAL_COLOR = ['#FFD700', '#C0C0C0', '#CD7F32'];

const RankingEmpresas = () => {
    const { perfil } = useAuth();
    const deptNombre = perfil?.departamento || 'La Paz';
    const tema = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];

    const [sucursalesAll, setSucursalesAll] = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        getSucursales().then(data => { setSucursalesAll(data); setCargando(false); });
    }, []);

    const empresas = sucursalesAll
        .filter(s => s.departamento === deptNombre)
        .sort((a, b) => (Number(b.ranking) || 0) - (Number(a.ranking) || 0));

    const ticks = [0, 1, 2, 3, 4, 5];

    return (
        <div style={{ color: '#f1f5f9', fontFamily: "'Inter', system-ui, sans-serif" }}>
            <div style={{ maxWidth: 860, margin: '2rem auto', padding: '0 1rem' }}>
                {/* Título */}
                <div style={{ marginBottom: '1.75rem' }}>
                    <div style={{
                        fontSize: 'clamp(1.5rem,3.5vw,2rem)', fontWeight: 900,
                        background: `linear-gradient(90deg, ${tema.color}, ${tema.colorSecundario})`,
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        fontFamily: "'Rajdhani', system-ui, sans-serif", textTransform: 'uppercase', lineHeight: 1.1,
                    }}>Ranking de Empresas</div>
                    <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '0.2rem' }}>
                        Calificación por empresa en {deptNombre} · escala 0–5
                    </div>
                </div>

                {cargando ? (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem' }}>Cargando ranking...</div>
                ) : empresas.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem' }}>
                        Sin empresas registradas en {deptNombre}.
                    </div>
                ) : (
                    <div style={{
                        background: '#0d1a2e', border: `1px solid ${tema.color}1f`, borderRadius: 16,
                        padding: '1.5rem 1.5rem 1rem', boxShadow: `0 0 24px ${tema.color}08`,
                    }}>
                        {/* Gráfico */}
                        <div style={{ position: 'relative' }}>
                            {/* Líneas de cuadrícula verticales */}
                            <div style={{ position: 'absolute', inset: 0, left: 44, marginLeft: '0.6rem', pointerEvents: 'none' }}>
                                {ticks.map(t => (
                                    <div key={t} style={{
                                        position: 'absolute', top: 0, bottom: 0, left: `${(t / MAX_PTS) * 100}%`,
                                        borderLeft: `1px dashed ${t === 0 ? 'transparent' : '#1e293b'}`,
                                    }} />
                                ))}
                            </div>

                            {/* Filas (barras) */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', position: 'relative' }}>
                                {empresas.map((s, i) => {
                                    const pts = Number(s.ranking) || 0;
                                    const pct = Math.max(2, (pts / MAX_PTS) * 100);
                                    const logo = getEmpresaLogo(s.nombre);
                                    const medalColor = i < 3 ? MEDAL_COLOR[i] : null;
                                    const barColor = medalColor || tema.color;
                                    return (
                                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                            {/* Logo (eje Y) */}
                                            <div style={{
                                                width: 32, height: 32, borderRadius: '50%', background: '#fff',
                                                border: `2px solid ${barColor}66`, overflow: 'hidden', flexShrink: 0,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                {logo
                                                    ? <img src={logo} alt={s.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    : <span style={{ fontSize: '1rem' }}>{s.logoEmoji}</span>}
                                            </div>

                                            {/* Pista + barra */}
                                            <div style={{ flex: 1, position: 'relative', height: 30, background: '#0a1322', borderRadius: 6 }}>
                                                <div style={{
                                                    position: 'absolute', top: 0, left: 0, bottom: 0,
                                                    width: `${pct}%`, borderRadius: '6px 6px 6px 6px',
                                                    background: `linear-gradient(90deg, ${barColor}cc, ${barColor})`,
                                                    boxShadow: `0 0 12px ${barColor}55`,
                                                    display: 'flex', alignItems: 'center',
                                                    transition: 'width 0.6s ease',
                                                }}>
                                                    <span style={{
                                                        position: 'absolute', left: 10, fontSize: '0.74rem', fontWeight: 700,
                                                        color: '#06121f', whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(255,255,255,0.2)',
                                                    }}>
                                                        {i < 3 && <span style={{ marginRight: 4 }}>{MEDAL[i]}</span>}
                                                        {s.nombre}
                                                    </span>
                                                </div>
                                                {/* Valor pts al final de la barra */}
                                                <span style={{
                                                    position: 'absolute', left: `calc(${pct}% + 8px)`, top: '50%',
                                                    transform: 'translateY(-50%)', fontSize: '0.78rem', fontWeight: 800,
                                                    color: barColor, whiteSpace: 'nowrap',
                                                }}>
                                                    {pts.toFixed(1)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Eje X (valores) */}
                            <div style={{ position: 'relative', height: 18, marginTop: '0.5rem', marginLeft: `calc(32px + 0.6rem)` }}>
                                {ticks.map(t => (
                                    <span key={t} style={{
                                        position: 'absolute', left: `${(t / MAX_PTS) * 100}%`, transform: 'translateX(-50%)',
                                        fontSize: '0.66rem', color: '#475569', fontVariantNumeric: 'tabular-nums',
                                    }}>{t}</span>
                                ))}
                            </div>
                        </div>

                        <div style={{ fontSize: '0.68rem', color: '#475569', textAlign: 'right', marginTop: '0.5rem' }}>
                            {empresas.length} empresa{empresas.length !== 1 ? 's' : ''} en {deptNombre}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RankingEmpresas;
