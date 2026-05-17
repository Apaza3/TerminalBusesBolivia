import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDepartamento } from '../contextos/DepartamentoContext';
import { supabase } from '../servicios/supabase';
import AndenLogo, { DigitalClock, LandscapeHero } from '../componentes/AndenComponents';
import { obtenerSucursalesOrdenadas } from '../data/mockDiscoveryDB';
import gsap from 'gsap';

// Department name → andén BO dept code
const DEPT_CODE = {
    'La Paz':     'lpb', 'Cochabamba': 'cbb', 'Santa Cruz': 'scz',
    'Oruro':      'oru', 'Potosí':     'pot', 'Sucre':      'sre',
    'Chuquisaca': 'sre', 'Tarija':     'tja', 'Trinidad':   'ben',
    'Beni':       'ben', 'Cobija':     'pan', 'Pando':      'pan',
};

// Department display info for selector tiles
const DEPT_TILES = [
    { code: 'lpb', name: 'La Paz',     emoji: '🏔️', city: 'La Paz' },
    { code: 'cbb', name: 'Cochabamba', emoji: '🌿', city: 'Cochabamba' },
    { code: 'scz', name: 'Santa Cruz', emoji: '🌴', city: 'Santa Cruz' },
    { code: 'oru', name: 'Oruro',      emoji: '⛏️', city: 'Oruro' },
    { code: 'pot', name: 'Potosí',     emoji: '🏺', city: 'Potosí' },
    { code: 'sre', name: 'Sucre',      emoji: '🏛️', city: 'Sucre' },
    { code: 'tja', name: 'Tarija',     emoji: '🍇', city: 'Tarija' },
    { code: 'ben', name: 'Beni',       emoji: '🌊', city: 'Trinidad' },
    { code: 'pan', name: 'Pando',      emoji: '🌳', city: 'Cobija' },
];

const CIUDADES = [
    'Cobija', 'Cochabamba', 'La Paz', 'Oruro',
    'Potosí', 'Santa Cruz', 'Sucre', 'Tarija', 'Trinidad',
];

const RANK_MEDAL = ['🥇', '🥈', '🥉'];

// Fallback sucursales from mock if Supabase fails
const SUCURSALES_FALLBACK = obtenerSucursalesOrdenadas();

export default function Inicio() {
    const { departamento, setDepartamento } = useDepartamento();
    const deptCode = DEPT_CODE[departamento] || 'lpb';

    const [sucursales, setSucursales]   = useState([]);
    const [loadingSuc, setLoadingSuc]   = useState(true);
    const [origen,  setOrigen]          = useState('');
    const [destino, setDestino]         = useState('');
    const [fecha,   setFecha]           = useState('');
    const [mode, setMode]               = useState('dark');

    const heroRef = useRef(null);
    const gridRef = useRef(null);
    const navigate = useNavigate();

    const fechaMin = new Date().toISOString().split('T')[0];

    // Fetch sucursales from Supabase, fallback to mock
    useEffect(() => {
        const fetchSucursales = async () => {
            setLoadingSuc(true);
            try {
                const { data, error } = await supabase
                    .from('sucursales')
                    .select('id, nombre, ciudad, logo_emoji, color_accent, ranking, amenidades, departamentos(nombre)')
                    .eq('activo', true)
                    .order('ranking', { ascending: false });

                if (!error && data && data.length > 0) {
                    setSucursales(data.map(s => ({
                        ...s,
                        departamento: s.departamentos?.nombre || '',
                        logoEmoji: s.logo_emoji,
                        colorAccent: s.color_accent,
                    })));
                } else {
                    setSucursales(SUCURSALES_FALLBACK);
                }
            } catch {
                setSucursales(SUCURSALES_FALLBACK);
            }
            setLoadingSuc(false);
        };
        fetchSucursales();
    }, []);

    // GSAP on sucursales load
    useEffect(() => {
        if (!loadingSuc && gridRef.current) {
            gsap.from(gridRef.current.querySelectorAll('.suc-card'), {
                y: 24, opacity: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out',
            });
        }
    }, [loadingSuc]);

    // Hero animation
    useEffect(() => {
        if (!heroRef.current) return;
        const ctx = gsap.context(() => {
            gsap.from('[data-h="eyebrow"]', { y: 14, opacity: 0, duration: 0.55, ease: 'power3.out', delay: 0.1 });
            gsap.from('[data-h="title"]',   { y: 28, opacity: 0, duration: 0.65, ease: 'power3.out', delay: 0.2 });
            gsap.from('[data-h="card"]',    { y: 20, opacity: 0, duration: 0.6,  ease: 'power3.out', delay: 0.35 });
        }, heroRef);
        return () => ctx.revert();
    }, [deptCode]);

    const handleSearch = (e) => {
        e.preventDefault();
        const p = new URLSearchParams();
        if (origen)  p.set('origen', origen);
        if (destino) p.set('destino', destino);
        if (fecha)   p.set('fecha', fecha);
        navigate(`/buscar?${p.toString()}`);
    };

    const sucFiltered = departamento
        ? sucursales.filter(s => !s.departamento || s.departamento === departamento || s.departamento === 'Chuquisaca' && departamento === 'Sucre')
        : sucursales;
    const sucDisplay = sucFiltered.length > 0 ? sucFiltered : sucursales;

    return (
        <div
            className="an"
            data-dept={deptCode}
            data-mode={mode}
            style={{ background: 'var(--canvas)', minHeight: '100vh', color: 'var(--ink)' }}
        >
            {/* ── Top Bar ───────────────────────────────────────── */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 50,
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '0 clamp(1rem,4vw,2.5rem)',
                height: 56,
                background: 'color-mix(in oklch, var(--canvas) 82%, transparent)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid var(--line)',
            }}>
                <AndenLogo size={24} />

                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <DigitalClock compact />
                </div>

                <nav style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Link to="/buscar" className="btn btn--ghost btn--sm">Buscar</Link>
                    <Link to="/login" className="btn btn--ghost btn--sm">Staff</Link>
                    <Link to="/login-cliente" className="btn btn--primary btn--sm">Mi cuenta</Link>
                    <button
                        onClick={() => setMode(m => m === 'dark' ? 'light' : 'dark')}
                        className="btn btn--ghost btn--sm"
                        title="Cambiar modo"
                        style={{ padding: '0 10px', fontSize: 14 }}
                    >
                        {mode === 'dark' ? '☀️' : '🌙'}
                    </button>
                </nav>
            </header>

            {/* ── Hero / Landscape ─────────────────────────────── */}
            <div ref={heroRef}>
                <LandscapeHero dept={deptCode} height={420}>
                    <div style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        height: '100%', padding: '0 1rem', gap: 24,
                    }}>
                        {/* eyebrow */}
                        <div data-h="eyebrow" className="micro" style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.14em' }}>
                            Red nacional de transporte terrestre
                        </div>

                        {/* title */}
                        <h1
                            data-h="title"
                            className="display"
                            style={{
                                fontSize: 'clamp(1.9rem,5vw,3.2rem)',
                                fontWeight: 600,
                                color: '#fff',
                                textAlign: 'center',
                                maxWidth: 600,
                                textShadow: '0 2px 20px rgba(0,0,0,0.5)',
                                textWrap: 'balance',
                            }}
                        >
                            Cruza Bolivia desde {departamento}.
                        </h1>

                        {/* Search card */}
                        <form
                            data-h="card"
                            onSubmit={handleSearch}
                            style={{
                                background: 'color-mix(in oklch, var(--paper) 90%, transparent)',
                                backdropFilter: 'blur(16px)',
                                border: '1px solid var(--line-2)',
                                borderRadius: 'var(--r-4)',
                                padding: '20px 20px',
                                display: 'flex', alignItems: 'flex-end',
                                gap: 10, flexWrap: 'wrap',
                                width: '100%', maxWidth: 680,
                                boxShadow: 'var(--shadow-2)',
                            }}
                        >
                            <div style={{ flex: '1 1 140px', minWidth: 120 }}>
                                <label className="micro" style={{ display: 'block', marginBottom: 6 }}>Origen</label>
                                <div className="field" style={{ height: 40 }}>
                                    <select value={origen} onChange={e => setOrigen(e.target.value)} required style={{ flex: 1 }}>
                                        <option value="">Ciudad origen</option>
                                        {CIUDADES.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ flex: '1 1 140px', minWidth: 120 }}>
                                <label className="micro" style={{ display: 'block', marginBottom: 6 }}>Destino</label>
                                <div className="field" style={{ height: 40 }}>
                                    <select value={destino} onChange={e => setDestino(e.target.value)} required style={{ flex: 1 }}>
                                        <option value="">Ciudad destino</option>
                                        {CIUDADES.filter(c => c !== origen).map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ flex: '1 1 130px', minWidth: 120 }}>
                                <label className="micro" style={{ display: 'block', marginBottom: 6 }}>Fecha</label>
                                <div className="field" style={{ height: 40 }}>
                                    <input
                                        type="date" value={fecha} min={fechaMin}
                                        onChange={e => setFecha(e.target.value)} required
                                        style={{ flex: 1, color: fecha ? 'var(--ink)' : 'var(--ink-3)' }}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="btn btn--primary"
                                style={{ height: 40, flexShrink: 0, paddingLeft: 20, paddingRight: 20 }}
                            >
                                Buscar viajes
                            </button>
                        </form>
                    </div>
                </LandscapeHero>
            </div>

            {/* ── Department selector ──────────────────────────── */}
            <section style={{ padding: 'clamp(1.5rem,4vw,2.5rem) clamp(1rem,4vw,2.5rem) 0' }}>
                <div className="row" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                    <span className="micro">Departamento</span>
                    <div className="live-dot" />
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
                    gap: 8,
                }}>
                    {DEPT_TILES.map(d => {
                        const active = deptCode === d.code;
                        return (
                            <button
                                key={d.code}
                                onClick={() => setDepartamento(d.name === 'Beni' ? 'Trinidad' : d.name === 'Pando' ? 'Cobija' : d.name)}
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                                    padding: '12px 8px', borderRadius: 'var(--r-3)',
                                    border: active ? '1.5px solid var(--accent)' : '1px solid var(--line)',
                                    background: active ? 'var(--accent-tint)' : 'var(--paper)',
                                    color: active ? 'var(--accent-deep)' : 'var(--ink-2)',
                                    cursor: 'pointer', transition: 'all .15s',
                                    fontFamily: 'var(--ui)', fontSize: 11.5, fontWeight: active ? 600 : 400,
                                    letterSpacing: '-0.01em',
                                }}
                            >
                                <span style={{ fontSize: 20 }}>{d.emoji}</span>
                                <span style={{ textAlign: 'center', lineHeight: 1.2 }}>{d.name}</span>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* ── Sucursales ───────────────────────────────────── */}
            <section style={{ padding: 'clamp(2rem,5vw,3rem) clamp(1rem,4vw,2.5rem)', paddingBottom: 60 }}>
                <div className="row" style={{ marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                        <h2 className="display" style={{ fontSize: 'clamp(1.1rem,3vw,1.5rem)' }}>
                            Empresas de transporte
                        </h2>
                        <p style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 4 }}>
                            {sucDisplay.length} empresas · ordenadas por calificación
                        </p>
                    </div>
                    <div className="stretch" />
                    <Link to="/buscar" className="btn btn--ghost btn--sm">Ver todos los viajes →</Link>
                </div>

                {loadingSuc ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
                        {[...Array(6)].map((_, i) => (
                            <div key={i} style={{
                                height: 120, borderRadius: 'var(--r-3)',
                                background: 'var(--paper)', border: '1px solid var(--line)',
                                animation: 'anPulse 1.6s ease-in-out infinite',
                                opacity: 0.5,
                            }} />
                        ))}
                    </div>
                ) : (
                    <div
                        ref={gridRef}
                        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}
                    >
                        {sucDisplay.map((suc, idx) => (
                            <SucursalCard key={suc.id} suc={suc} rank={idx + 1} />
                        ))}
                    </div>
                )}
            </section>

            {/* ── Footer ──────────────────────────────────────── */}
            <footer style={{
                borderTop: '1px solid var(--line)',
                padding: '24px clamp(1rem,4vw,2.5rem)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 12,
            }}>
                <AndenLogo size={18} />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
                    RED NACIONAL · BOLIVIA · GMT-4
                </span>
                <div className="row" style={{ gap: 16 }}>
                    <Link to="/login" style={{ fontSize: 12.5, color: 'var(--ink-3)', textDecoration: 'none' }}>Panel staff</Link>
                    <Link to="/recuperar-boleto" style={{ fontSize: 12.5, color: 'var(--ink-3)', textDecoration: 'none' }}>Recuperar boleto</Link>
                </div>
            </footer>

            <style>{`
                @keyframes anPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
                @media(max-width:640px) { form[data-h="card"] { gap:8px; padding:16px; } }
            `}</style>
        </div>
    );
}

function SucursalCard({ suc, rank }) {
    const stars = Math.round(Number(suc.ranking) * 2) / 2;
    const fullStars = Math.floor(stars);
    const halfStar = stars % 1 !== 0;

    return (
        <Link
            to={`/sucursal/${suc.id}`}
            className="suc-card"
            style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
        >
            <div
                className="card"
                style={{
                    padding: '18px 18px 16px',
                    cursor: 'pointer', transition: 'all .15s',
                    height: '100%',
                    borderLeft: `3px solid ${suc.colorAccent || suc.color_accent || 'var(--accent)'}`,
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-2)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '';
                }}
            >
                {/* header row */}
                <div className="row" style={{ marginBottom: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>
                        {suc.logo_emoji || suc.logoEmoji || '🚌'}
                    </span>
                    <div className="stretch">
                        <div style={{ fontWeight: 600, fontSize: 14.5, lineHeight: 1.25, color: 'var(--ink)' }}>
                            {suc.nombre}
                        </div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)', marginTop: 2 }}>
                            {suc.ciudad}{suc.departamento ? ` · ${suc.departamento}` : ''}
                        </div>
                    </div>
                    {rank <= 3 && (
                        <span style={{ fontSize: 16, flexShrink: 0 }}>{RANK_MEDAL[rank - 1]}</span>
                    )}
                </div>

                {/* rating */}
                <div className="row" style={{ marginBottom: 10, gap: 6 }}>
                    <div style={{ display: 'flex', gap: 2 }}>
                        {Array.from({ length: 5 }, (_, i) => (
                            <span key={i} style={{
                                fontSize: 12,
                                color: i < fullStars ? '#f59e0b'
                                    : i === fullStars && halfStar ? '#f59e0b'
                                    : 'var(--line-2)',
                            }}>
                                {i < fullStars ? '★' : i === fullStars && halfStar ? '½' : '☆'}
                            </span>
                        ))}
                    </div>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-2)', fontWeight: 600 }}>
                        {Number(suc.ranking).toFixed(1)}
                    </span>
                </div>

                {/* amenidades */}
                {suc.amenidades && suc.amenidades.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {suc.amenidades.slice(0, 4).map(a => (
                            <span key={a} className="badge" style={{ fontSize: 9.5 }}>{a}</span>
                        ))}
                        {suc.amenidades.length > 4 && (
                            <span className="badge" style={{ fontSize: 9.5 }}>+{suc.amenidades.length - 4}</span>
                        )}
                    </div>
                )}
            </div>
        </Link>
    );
}
