// [Académico] Sprint 5 - Ranking de empresas por departamento del admin (R24)
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import { getSucursales } from '../../servicios/api';
import { getEmpresaLogo } from '../../utils/assets';

const MEDALS = ['👑', '🥈', '🥉'];

const RankingEmpresas = () => {
    const { perfil } = useAuth();
    const deptNombre = perfil?.departamento || 'La Paz';
    const tema = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];

    const [sucursalesAll, setSucursalesAll] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);

    useEffect(() => {
        getSucursales().then(data => { setSucursalesAll(data); setCargando(false); });
    }, []);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // Empresas del departamento del admin, mejor calificadas primero
    const sucursales = sucursalesAll
        .filter(s => s.departamento === deptNombre)
        .sort((a, b) => (Number(b.ranking) || 0) - (Number(a.ranking) || 0));

    const STARS = (ranking) => {
        const n = Math.min(5, Math.max(0, Math.round(Number(ranking) || 0)));
        return '★'.repeat(n) + '☆'.repeat(5 - n);
    };

    const PodiumCard = ({ s, rank, compact = false }) => {
        const logo = getEmpresaLogo(s.nombre);
        const isGold = rank === 0, isSilver = rank === 1;
        return (
            <div style={{
                padding: 2,
                borderRadius: isGold ? 22 : 20,
                background: isGold
                    ? 'linear-gradient(135deg, #FFD700, #FFA500, #FFE566, #B8860B, #FFD700)'
                    : isSilver
                        ? 'linear-gradient(135deg, #F0F0F0, #A8A8A8, #E8E8E8, #C0C0C0, #F0F0F0)'
                        : 'linear-gradient(135deg, #E8A870, #8B4513, #CD7F32, #A0522D, #E8A870)',
                backgroundSize: isGold ? '300% 300%' : undefined,
                animation: isGold ? 'tbb-gold-shimmer 3s ease infinite' : 'none',
                maxWidth: isGold ? (isMobile ? '92%' : 250) : compact ? '100%' : 250,
                margin: isGold ? '0 auto' : isSilver ? (compact ? '0 auto' : '0 -0.75rem 0 auto') : (compact ? '0 auto' : '0 auto 0 -0.75rem'),
            }}>
                <div style={{
                    position: 'relative', background: 'rgba(0,0,0,0.55)', borderRadius: isGold ? 20 : 18,
                    padding: compact ? '1rem 0.65rem' : isGold ? (isMobile ? '1.4rem 1rem 1rem' : '2rem 1.1rem 1.4rem') : isSilver ? '1.6rem 1.1rem 1.1rem' : '1.2rem 1.1rem 0.8rem',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: compact ? '0.4rem' : '0.7rem', textAlign: 'center',
                    boxShadow: isGold
                        ? '0 12px 56px rgba(255,215,0,0.35)'
                        : isSilver ? '0 6px 28px rgba(192,192,192,0.2)' : '0 6px 24px rgba(205,127,50,0.18)',
                    animation: isSilver ? 'tbb-silver-destello 2.5s ease infinite' : 'none',
                }}>
                    {/* Medalla */}
                    <div style={{
                        position: 'absolute', top: compact ? -11 : -15, left: '50%', transform: 'translateX(-50%)',
                        fontSize: compact ? '1.3rem' : isGold ? '2rem' : '1.55rem',
                        filter: `drop-shadow(0 0 ${isGold ? 14 : isSilver ? 12 : 10}px ${isGold ? '#FFD700' : isSilver ? '#C0C0C0' : '#CD7F32'})`,
                        lineHeight: 1,
                    }}>{MEDALS[rank]}</div>

                    {/* Logo */}
                    <div style={{
                        width: compact ? 52 : isGold ? (isMobile ? 80 : 120) : 100,
                        height: compact ? 52 : isGold ? (isMobile ? 80 : 120) : 100,
                        borderRadius: isGold ? 22 : 10, background: '#fff',
                        border: `2px solid ${isGold ? '#FFD70040' : isSilver ? 'rgba(192,192,192,0.4)' : 'rgba(205,127,50,0.4)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
                    }}>
                        {logo
                            ? <img src={logo} alt={s.nombre} style={{ width: '100%', height: '100%', objectFit: 'fill' }} />
                            : <span style={{ fontSize: compact ? '1.5rem' : isGold ? '3rem' : '2rem' }}>{s.logoEmoji}</span>}
                    </div>

                    {/* Nombre */}
                    <div style={{
                        fontWeight: 900, fontSize: compact ? '0.7rem' : isGold ? '0.92rem' : '0.88rem',
                        lineHeight: 1.2, letterSpacing: '-0.01em',
                        background: isGold
                            ? 'linear-gradient(135deg, #FFE566 0%, #FFD700 40%, #FFA500 70%, #FFE566 100%)'
                            : isSilver
                                ? 'linear-gradient(135deg, #F0F0F0 0%, #C0C0C0 40%, #A8A8A8 70%, #F0F0F0 100%)'
                                : 'linear-gradient(135deg, #E8A870 0%, #CD7F32 40%, #8B4513 70%, #E8A870 100%)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    }}>{s.nombre}</div>

                    {/* Estrellas + pts */}
                    {!compact && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                            <span style={{
                                color: isGold ? '#FFD700' : isSilver ? '#C0C0C0' : '#CD7F32',
                                fontSize: isGold ? '0.92rem' : '0.88rem', letterSpacing: 1,
                            }}>{STARS(s.ranking)}</span>
                            <span style={{
                                fontSize: '0.65rem', fontWeight: 700,
                                background: isGold ? 'rgba(255,215,0,0.12)' : isSilver ? 'rgba(192,192,192,0.12)' : 'rgba(205,127,50,0.1)',
                                border: `1px solid ${isGold ? 'rgba(255,215,0,0.4)' : isSilver ? 'rgba(192,192,192,0.4)' : 'rgba(205,127,50,0.35)'}`,
                                color: isGold ? '#FFD700' : isSilver ? '#C0C0C0' : '#CD7F32',
                                padding: '0.1rem 0.5rem', borderRadius: 20,
                            }}>{s.ranking} pts</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div style={{ color: '#f1f5f9', fontFamily: "'Inter', system-ui, sans-serif" }}>
            <style>{`
                @keyframes tbb-gold-shimmer {
                    0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; }
                }
                @keyframes tbb-silver-destello {
                    0%, 100% { box-shadow: 0 4px 18px rgba(192,192,192,0.12), 0 0 0 1px rgba(200,200,200,0.1); }
                    40% { box-shadow: 0 6px 28px rgba(220,220,240,0.28), 0 0 10px rgba(255,255,255,0.18), 0 0 0 1px rgba(210,210,210,0.3); }
                    70% { box-shadow: 0 4px 18px rgba(192,192,192,0.12), 0 0 0 1px rgba(200,200,200,0.1); }
                }
            `}</style>

            <div style={{ maxWidth: 900, margin: '2rem auto', padding: '0 1rem' }}>
                {/* Título */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{
                        fontSize: 'clamp(1.5rem,3.5vw,2rem)', fontWeight: 900,
                        background: `linear-gradient(90deg, ${tema.color}, ${tema.colorSecundario})`,
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        fontFamily: "'Rajdhani', system-ui, sans-serif", textTransform: 'uppercase', lineHeight: 1.1,
                    }}>Ranking de Empresas</div>
                    <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '0.2rem' }}>
                        Posicionamiento en {deptNombre} · mejor calificadas primero
                    </div>
                </div>

                {cargando ? (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem' }}>Cargando ranking...</div>
                ) : sucursales.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem' }}>
                        Sin empresas registradas en {deptNombre}.
                    </div>
                ) : (
                    <>
                        {/* PODIO TOP 3 */}
                        {!isMobile ? (
                            <div style={{ display: 'grid', gridTemplateColumns: sucursales.length === 1 ? '1fr' : sucursales.length === 2 ? '1fr 1fr' : '1fr 1fr 1fr', alignItems: 'end', gap: '0.5rem', marginBottom: '2rem' }}>
                                {[1, 0, 2].map(rank => sucursales[rank] && (
                                    <PodiumCard key={rank} s={sucursales[rank]} rank={rank} />
                                ))}
                            </div>
                        ) : (
                            <div style={{ marginBottom: '2rem' }}>
                                <PodiumCard s={sucursales[0]} rank={0} />
                                {sucursales.length >= 2 && (
                                    <div style={{ display: 'grid', gridTemplateColumns: sucursales[2] ? '1fr 1fr' : '1fr', gap: '0.75rem', marginTop: '1.25rem' }}>
                                        {[1, 2].filter(r => sucursales[r]).map(rank => (
                                            <PodiumCard key={rank} s={sucursales[rank]} rank={rank} compact />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* OTRAS EMPRESAS */}
                        {sucursales.length > 3 && (
                            <>
                                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#475569', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>── También compiten ──</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#94a3b8' }}>Otras empresas</div>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: isMobile ? '0.5rem' : '1rem' }}>
                                    {sucursales.slice(3).map(s => {
                                        const logo = getEmpresaLogo(s.nombre);
                                        const ec = s.colorAccent || tema.color || '#64748b';
                                        return (
                                            <div key={s.id} style={{
                                                width: isMobile ? 'calc(50% - 0.25rem)' : 'calc(25% - 0.75rem)', maxWidth: isMobile ? '50%' : 200,
                                                padding: 2, borderRadius: isMobile ? 12 : 16,
                                                background: `linear-gradient(135deg, ${ec}bb, ${ec}44, ${ec}bb)`,
                                            }}>
                                                <div style={{
                                                    background: 'rgba(0,0,0,0.55)', borderRadius: isMobile ? 10 : 14,
                                                    padding: isMobile ? '0.75rem 0.6rem' : '1rem 0.85rem',
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', textAlign: 'center',
                                                }}>
                                                    <div style={{ width: isMobile ? 46 : 60, height: isMobile ? 46 : 60, borderRadius: 10, background: '#fff', border: `1.5px solid ${ec}35`, overflow: 'hidden', flexShrink: 0 }}>
                                                        {logo
                                                            ? <img src={logo} alt={s.nombre} style={{ width: '100%', height: '100%', objectFit: 'fill' }} />
                                                            : <span style={{ fontSize: isMobile ? '1.4rem' : '1.8rem' }}>{s.logoEmoji}</span>}
                                                    </div>
                                                    <div style={{ fontSize: isMobile ? '0.62rem' : '0.78rem', fontWeight: 700, color: ec, lineHeight: 1.2 }}>{s.nombre}</div>
                                                    <div style={{ color: ec, fontSize: isMobile ? '0.6rem' : '0.7rem', letterSpacing: 1 }}>{STARS(s.ranking)}</div>
                                                    <div style={{ fontSize: '0.62rem', color: '#64748b' }}>{s.ranking} pts</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default RankingEmpresas;
