import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSucursales } from '../servicios/api';
import { useDepartamento, DEPARTAMENTOS } from '../contextos/DepartamentoContext';
import gsap from 'gsap';

const CIUDADES = [
    'Cobija', 'Cochabamba', 'La Paz', 'Oruro',
    'Potosí', 'Santa Cruz', 'Sucre', 'Tarija', 'Trinidad',
];

const RANK_MEDAL = ['🥇', '🥈', '🥉'];

const Inicio = () => {
    const { departamento, setDepartamento, tema } = useDepartamento();
    const [sucursalesAll, setSucursalesAll] = useState([]);
    const [sucursales, setSucursales]       = useState([]);
    const [mostrarSelectorDept, setMostrarSelectorDept] = useState(false);
    const [origen, setOrigen]         = useState('');
    const [destino, setDestino]       = useState('');
    const [fecha, setFecha]           = useState('');
    const navigate   = useNavigate();
    const rootRef    = useRef(null);
    const listRef    = useRef(null);

    const fechaMin = new Date().toISOString().split('T')[0];

    useEffect(() => {
        getSucursales().then(data => setSucursalesAll(data));
    }, []);

    useEffect(() => {
        // Filtrar por departamento si hay match; si no, mostrar todas
        const filtradas = sucursalesAll.filter(s => !s.departamento || s.departamento === departamento);
        setSucursales(filtradas.length > 0 ? filtradas : sucursalesAll);
    }, [sucursalesAll, departamento]);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-h="eyebrow"]',  { y: 18, opacity: 0, duration: 0.6, ease: 'power3.out' });
            gsap.from('[data-h="title"]',    { y: 32, opacity: 0, duration: 0.7, ease: 'power3.out', delay: 0.08 });
            gsap.from('[data-h="sub"]',      { y: 20, opacity: 0, duration: 0.6, ease: 'power3.out', delay: 0.18 });
            gsap.from('[data-h="search"]',   { y: 24, opacity: 0, duration: 0.65, ease: 'power3.out', delay: 0.28 });
            gsap.from('[data-h="row"]', {
                x: -16, opacity: 0, duration: 0.45, stagger: 0.06,
                ease: 'power3.out', delay: 0.5,
            });
        }, rootRef);
        return () => ctx.revert();
    }, [sucursales]);

    const handleSearch = (e) => {
        e.preventDefault();
        const p = new URLSearchParams();
        if (origen)  p.set('origen', origen);
        if (destino) p.set('destino', destino);
        if (fecha)   p.set('fecha', fecha);
        navigate(`/buscar?${p.toString()}`);
    };

    return (
        <div ref={rootRef} style={{
            background: '#07111f', minHeight: '100vh', color: '#dde5f0',
            fontFamily: "'Inter', system-ui, sans-serif",
        }}>
            {/* ── Selector de Departamento (cliente) ── */}
            <div style={{
                background: `${tema.bg}cc`, borderBottom: `1px solid ${tema.color}30`,
                padding: '0.5rem clamp(1rem,5vw,2.5rem)',
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem',
                position: 'sticky', top: 0, zIndex: 30,
                backdropFilter: 'blur(10px)',
                transition: 'background 0.4s',
            }}>
                <span style={{ fontSize: '0.72rem', color: '#475569' }}>Tu departamento:</span>
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setMostrarSelectorDept(!mostrarSelectorDept)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            background: `${tema.color}18`, border: `1px solid ${tema.color}50`,
                            color: tema.acento, padding: '0.35rem 0.85rem', borderRadius: '999px',
                            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                            transition: 'all 0.2s',
                        }}
                    >
                        <span>{DEPARTAMENTOS[departamento]?.emoji}</span>
                        <span>{departamento}</span>
                        <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>▼</span>
                    </button>
                    {mostrarSelectorDept && (
                        <div style={{
                            position: 'absolute', top: '110%', right: 0, zIndex: 100,
                            background: '#0d1a2e', border: `1px solid ${tema.color}40`,
                            borderRadius: '12px', padding: '0.5rem',
                            minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        }}>
                            {Object.entries(DEPARTAMENTOS).map(([nombre, info]) => (
                                <button key={nombre} onClick={() => { setDepartamento(nombre); setMostrarSelectorDept(false); }} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                                    width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px',
                                    border: 'none', background: nombre === departamento ? `${info.color}20` : 'transparent',
                                    color: nombre === departamento ? info.acento : '#64748b',
                                    cursor: 'pointer', fontSize: '0.82rem', textAlign: 'left',
                                    transition: 'all 0.12s',
                                }}
                                    onMouseEnter={e => { if (nombre !== departamento) { e.currentTarget.style.background = `${info.color}12`; e.currentTarget.style.color = '#94a3b8'; } }}
                                    onMouseLeave={e => { if (nombre !== departamento) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; } }}>
                                    <span>{info.emoji}</span>
                                    <span>{nombre}</span>
                                    {nombre === departamento && <span style={{ marginLeft: 'auto', color: info.color }}>✓</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Hero ─────────────────────────────────────────────── */}
            <section style={{
                padding: 'clamp(5rem, 10vh, 8rem) clamp(1rem, 5vw, 2.5rem) clamp(3rem, 6vh, 5rem)',
                borderBottom: '1px solid #1a2d42',
                position: 'relative', overflow: 'hidden',
            }}>
                {/* Background radial glows — purely atmospheric */}
                <div style={{
                    position: 'absolute', top: '-15%', right: '-8%',
                    width: '55vw', height: '55vw', maxWidth: 700,
                    background: 'radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 65%)',
                    pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', bottom: '-20%', left: '5%',
                    width: '40vw', height: '40vw', maxWidth: 500,
                    background: 'radial-gradient(circle, rgba(22,163,74,0.05) 0%, transparent 65%)',
                    pointerEvents: 'none',
                }} />

                <div style={{ maxWidth: 840, margin: '0 auto', position: 'relative' }}>
                    <p data-h="eyebrow" style={{
                        fontSize: '0.75rem', letterSpacing: '0.18em',
                        textTransform: 'uppercase', color: tema.color,
                        fontWeight: 700, marginBottom: '1.1rem',
                    }}>
                        {DEPARTAMENTOS[departamento]?.emoji} Terminal · {departamento}
                    </p>

                    <h1 data-h="title" style={{
                        fontSize: 'clamp(2.2rem, 5.5vw, 4rem)', fontWeight: 800,
                        lineHeight: 1.08, letterSpacing: '-0.03em',
                        color: '#dde5f0', marginBottom: '1.1rem',
                        maxWidth: 640,
                    }}>
                        Elige tu empresa.<br />Reserva tu asiento.
                    </h1>

                    <p data-h="sub" style={{
                        color: '#4d6a87', fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
                        lineHeight: 1.65, marginBottom: '2.25rem', maxWidth: 460,
                    }}>
                        Compara empresas, consulta disponibilidad en tiempo real
                        y reserva sin colas ni llamadas.
                    </p>

                    {/* Search widget */}
                    <form
                        data-h="search"
                        onSubmit={handleSearch}
                        style={{
                            display: 'flex', flexWrap: 'wrap',
                            background: '#0d1a2b', border: '1px solid #1a2d42',
                            borderRadius: 14, overflow: 'hidden',
                            maxWidth: 700, boxShadow: '0 6px 28px rgba(0,0,0,0.35)',
                        }}
                    >
                        {[
                            { label: 'Origen', value: origen, set: setOrigen },
                            { label: 'Destino', value: destino, set: setDestino },
                        ].map((f, i) => (
                            <div key={i} style={{
                                flex: '1 1 160px',
                                borderRight: '1px solid #1a2d42',
                                display: 'flex', flexDirection: 'column',
                            }}>
                                <span style={{
                                    fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                                    color: '#4d6a87', fontWeight: 700, padding: '0.7rem 1rem 0',
                                }}>
                                    {f.label}
                                </span>
                                <select
                                    value={f.value}
                                    onChange={e => f.set(e.target.value)}
                                    style={{
                                        background: 'transparent', border: 'none',
                                        color: f.value ? '#dde5f0' : '#4d6a87',
                                        padding: '0.3rem 1rem 0.7rem',
                                        fontSize: '0.92rem', outline: 'none', cursor: 'pointer',
                                        appearance: 'none',
                                    }}
                                >
                                    <option value="" style={{ background: '#0d1a2b' }}>Selecciona ciudad</option>
                                    {CIUDADES.map(c => (
                                        <option key={c} value={c} style={{ background: '#0d1a2b' }}>{c}</option>
                                    ))}
                                </select>
                            </div>
                        ))}

                        <div style={{
                            flex: '1 1 140px',
                            borderRight: '1px solid #1a2d42',
                            display: 'flex', flexDirection: 'column',
                        }}>
                            <span style={{
                                fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                                color: '#4d6a87', fontWeight: 700, padding: '0.7rem 1rem 0',
                            }}>
                                Fecha
                            </span>
                            <input
                                type="date" value={fecha} min={fechaMin}
                                onChange={e => setFecha(e.target.value)}
                                style={{
                                    background: 'transparent', border: 'none',
                                    color: fecha ? '#dde5f0' : '#4d6a87',
                                    padding: '0.3rem 1rem 0.7rem',
                                    fontSize: '0.92rem', outline: 'none',
                                    colorScheme: 'dark',
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            style={{
                                flex: '0 0 auto', minWidth: 130,
                                background: tema.color, border: 'none',
                                color: '#fff', fontWeight: 700, fontSize: '0.92rem',
                                padding: '0 1.5rem', cursor: 'pointer',
                                letterSpacing: '0.01em', transition: 'background 0.18s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = tema.colorSecundario}
                            onMouseLeave={e => e.currentTarget.style.background = tema.color}
                        >
                            Buscar viajes
                        </button>
                    </form>
                </div>
            </section>

            {/* ── Company roster ───────────────────────────────────── */}
            <section style={{
                maxWidth: 840, margin: '0 auto',
                padding: 'clamp(2rem, 4vh, 3rem) clamp(1rem, 5vw, 2.5rem)',
            }}>
                <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'baseline', marginBottom: '0.5rem',
                    paddingBottom: '0.75rem', borderBottom: '1px solid #1a2d42',
                }}>
                    <h2 style={{
                        fontSize: '0.88rem', fontWeight: 700, letterSpacing: '0.12em',
                        textTransform: 'uppercase', color: '#4d6a87',
                    }}>
                        Empresas operadoras
                    </h2>
                    <span style={{ fontSize: '0.78rem', color: '#2e4560' }}>
                        {sucursales.length} empresas · mejor calificadas primero
                    </span>
                </div>

                <div ref={listRef}>
                    {sucursales.map((s, i) => (
                        <Link
                            key={s.id}
                            to={`/sucursal/${s.id}`}
                            data-h="row"
                            style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                        >
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2.2rem 2.8rem 1fr auto auto',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    padding: '0.9rem 0.5rem',
                                    borderBottom: '1px solid #0f1e2f',
                                    borderRadius: 8,
                                    transition: 'background 0.14s',
                                    cursor: 'pointer',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = '#0d1a2b';
                                    gsap.to(e.currentTarget.querySelector('[data-cta]'), { x: 3, duration: 0.15 });
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'transparent';
                                    gsap.to(e.currentTarget.querySelector('[data-cta]'), { x: 0, duration: 0.15 });
                                }}
                            >
                                {/* Rank */}
                                <span style={{
                                    fontSize: i < 3 ? '1.1rem' : '0.78rem',
                                    fontWeight: 800, textAlign: 'center',
                                    color: '#2e4560',
                                    fontVariantNumeric: 'tabular-nums',
                                }}>
                                    {i < 3 ? RANK_MEDAL[i] : `#${i + 1}`}
                                </span>

                                {/* Logo */}
                                <div style={{
                                    width: 40, height: 40, borderRadius: 9,
                                    background: `${s.colorAccent}14`,
                                    border: `1px solid ${s.colorAccent}28`,
                                    display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontSize: '1.25rem',
                                }}>
                                    {s.logoEmoji}
                                </div>

                                {/* Name + amenidades */}
                                <div>
                                    <div style={{
                                        fontWeight: 700, color: '#dde5f0',
                                        fontSize: '0.95rem', marginBottom: '0.25rem',
                                    }}>
                                        {s.nombre}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                        {(s.amenidades || []).slice(0, 3).map(a => (
                                            <span key={a} style={{
                                                fontSize: '0.68rem', color: '#4d6a87',
                                                background: '#0f1e2f', padding: '0.1rem 0.45rem',
                                                borderRadius: 4,
                                            }}>
                                                {a}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Rating */}
                                <div style={{ textAlign: 'right', minWidth: 56 }}>
                                    <div style={{
                                        fontSize: '1.05rem', fontWeight: 800,
                                        color: '#d97706', fontVariantNumeric: 'tabular-nums',
                                    }}>
                                        {s.ranking}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: '#2e4560', marginTop: 1 }}>
                                        puntos
                                    </div>
                                </div>

                                {/* CTA arrow */}
                                <div data-cta style={{
                                    fontSize: '0.78rem', color: '#16a34a',
                                    fontWeight: 600, whiteSpace: 'nowrap',
                                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                                }}>
                                    Ver →
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* ── Footer strip ─────────────────────────────────────── */}
            <footer style={{
                borderTop: '1px solid #1a2d42',
                padding: '1.5rem clamp(1rem, 5vw, 2.5rem)',
                display: 'flex', gap: '1.5rem', flexWrap: 'wrap',
                justifyContent: 'space-between', alignItems: 'center',
            }}>
                <span style={{ fontSize: '0.8rem', color: '#2e4560' }}>
                    Terminal de Buses Bolivia · 2026
                </span>
                <div style={{ display: 'flex', gap: '1.25rem' }}>
                    <Link to="/buscar" style={{ fontSize: '0.8rem', color: '#4d6a87', textDecoration: 'none' }}>
                        Buscar viajes
                    </Link>
                    <Link to="/login-cliente" style={{ fontSize: '0.8rem', color: '#4d6a87', textDecoration: 'none' }}>
                        Mi cuenta
                    </Link>
                    <Link to="/recuperar-boleto" style={{ fontSize: '0.8rem', color: '#4d6a87', textDecoration: 'none' }}>
                        Recuperar boleto
                    </Link>
                </div>
            </footer>
        </div>
    );
};

export default Inicio;
