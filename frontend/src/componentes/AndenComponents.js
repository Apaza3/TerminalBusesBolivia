import React, { useState, useEffect } from 'react';

/* ── andén BO logo ──────────────────────────────────────────── */
export function AndenLogo({ size = 28, mono = false }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, userSelect: 'none' }}>
            <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
                <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="1.4" opacity="0.35" />
                {/* mountain dial */}
                <path d="M6 22 L11 13 L15 18 L19 9 L26 22Z" fill="currentColor" opacity="0.9" />
                {/* snow caps */}
                <path d="M19 9 L22 14 L16 14Z" fill="var(--canvas,#0a0b0e)" opacity="0.7" />
                {/* tick marks */}
                <line x1="16" y1="3" x2="16" y2="5.5" stroke="currentColor" strokeWidth="1.4" opacity="0.5" />
                <line x1="27.5" y1="11" x2="25.5" y2="12.1" stroke="currentColor" strokeWidth="1.4" opacity="0.35" />
                <line x1="4.5" y1="11" x2="6.5" y2="12.1" stroke="currentColor" strokeWidth="1.4" opacity="0.35" />
            </svg>
            <span style={{
                fontFamily: mono ? 'var(--mono,"JetBrains Mono",monospace)' : 'var(--display,"Bricolage Grotesque",sans-serif)',
                fontWeight: 600, fontSize: size * 0.64,
                letterSpacing: '-0.02em',
                lineHeight: 1,
            }}>
                andén <span style={{ opacity: 0.55 }}>BO</span>
            </span>
        </div>
    );
}

/* ── digital clock ──────────────────────────────────────────── */
export function DigitalClock({ compact = false, tone = 'default' }) {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const id = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const pad = (n) => String(n).padStart(2, '0');
    const h = pad(time.getHours());
    const m = pad(time.getMinutes());
    const s = pad(time.getSeconds());
    const blink = time.getSeconds() % 2 === 0;

    const dateStr = time.toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'short' });

    const col = tone === 'accent' ? 'var(--accent)' : 'var(--ink)';
    const dim = 'var(--ink-3)';

    if (compact) {
        return (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: col, letterSpacing: '0.04em', tabularNums: true }}>
                {h}<span style={{ opacity: blink ? 1 : 0.25 }}>:</span>{m}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <div style={{
                fontFamily: 'var(--mono)', fontWeight: 600,
                fontSize: 22, letterSpacing: '0.03em',
                color: col,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
            }}>
                {h}
                <span style={{ opacity: blink ? 1 : 0.25, transition: 'opacity 0.1s' }}>:</span>
                {m}
                <span style={{ fontSize: 14, opacity: 0.45, marginLeft: 2 }}>:{s}</span>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: dim, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                {dateStr} · GMT-4
            </div>
        </div>
    );
}

/* ── landscape hero ─────────────────────────────────────────── */
const LANDSCAPES = {
    lpb: {
        sky: ['#0d0a28', '#1e1060', '#3a1e8a'],
        mt: 'M0,100 L8,55 L16,72 L28,22 L38,52 L48,38 L58,65 L72,28 L84,60 L100,100Z',
        snow: 'M28,22 L35,40 L22,40Z',
        label: 'Illimani · La Paz',
    },
    cbb: {
        sky: ['#051a0e', '#0d3a1e', '#1e6a3c'],
        mt: 'M0,100 L15,78 L30,68 L50,75 L70,65 L85,72 L100,100Z',
        snow: null,
        label: 'Valle · Cochabamba',
    },
    scz: {
        sky: ['#051205', '#0d2a08', '#1a5010'],
        mt: 'M0,100 L100,100Z M20,100 L22,70 L24,100Z M50,100 L52,65 L54,100Z M75,100 L77,72 L79,100Z',
        snow: null,
        label: 'Tierras Bajas · Santa Cruz',
    },
    oru: {
        sky: ['#180530', '#30096a', '#5a12a8'],
        mt: 'M0,100 L10,90 L25,92 L50,38 L75,90 L90,92 L100,100Z',
        snow: 'M50,38 L58,58 L42,58Z',
        label: 'Altiplano · Oruro',
    },
    pot: {
        sky: ['#050d1a', '#0d1e3a', '#1a3068'],
        mt: 'M0,100 L20,85 L42,82 L55,18 L68,82 L80,85 L100,100Z',
        snow: 'M55,18 L63,40 L47,40Z',
        label: 'Cerro Rico · Potosí',
    },
    sre: {
        sky: ['#1a1005', '#3a240a', '#6a4a18'],
        mt: 'M0,100 L15,80 L35,72 L55,76 L70,80 L88,75 L100,100Z',
        snow: null,
        label: 'Ciudad Blanca · Sucre',
    },
    tja: {
        sky: ['#1a0505', '#3a0a12', '#7a1a28'],
        mt: 'M0,100 L20,82 L40,75 L60,80 L80,78 L100,100Z',
        snow: null,
        label: 'Viñedos · Tarija',
    },
    ben: {
        sky: ['#051a1a', '#0a3840', '#126868'],
        mt: 'M0,100 L10,95 L30,98 L50,93 L70,96 L90,94 L100,100Z',
        snow: null,
        label: 'Pampas · Beni',
    },
    pan: {
        sky: ['#051a05', '#0a380a', '#1a6818'],
        mt: 'M0,100 L8,88 L20,92 L35,85 L50,90 L65,84 L80,88 L100,100Z',
        snow: null,
        label: 'Selva · Pando',
    },
};

export function LandscapeHero({ dept = 'lpb', height = 480, children }) {
    const l = LANDSCAPES[dept] || LANDSCAPES.lpb;
    const [c1, c2, c3] = l.sky;

    return (
        <div style={{
            position: 'relative', width: '100%', height,
            overflow: 'hidden',
            background: `linear-gradient(180deg, ${c1} 0%, ${c2} 45%, ${c3} 100%)`,
        }}>
            {/* stars */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '60%', opacity: 0.6 }} viewBox="0 0 200 80" preserveAspectRatio="xMidYMid slice">
                {Array.from({ length: 40 }, (_, i) => (
                    <circle key={i} cx={((i * 47) % 198) + 1} cy={((i * 31) % 75) + 2}
                        r={i % 5 === 0 ? 0.9 : 0.45} fill="white" opacity={0.4 + (i % 3) * 0.2} />
                ))}
            </svg>

            {/* glow */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at 65% 35%, color-mix(in oklch, var(--accent) 40%, transparent) 0%, transparent 60%)',
                pointerEvents: 'none',
            }} />

            {/* mountains */}
            <svg
                style={{ position: 'absolute', bottom: 0, left: 0, width: '100%' }}
                viewBox="0 0 100 100" preserveAspectRatio="xMidYMax slice"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* far range (lighter) */}
                <path
                    d={l.mt}
                    fill="color-mix(in oklch, var(--accent) 25%, #0a0b0e)"
                    opacity="0.6"
                />
                {/* near range */}
                <path
                    d={l.mt}
                    fill="color-mix(in oklch, var(--accent) 15%, #050608)"
                    transform="translate(0,12) scale(1,0.88)"
                />
                {/* snow cap */}
                {l.snow && <path d={l.snow} fill="rgba(255,255,255,0.8)" />}
            </svg>

            {/* ground */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 48,
                background: 'linear-gradient(180deg, transparent 0%, var(--canvas) 100%)',
            }} />

            {/* dept label */}
            <div style={{
                position: 'absolute', top: 20, right: 24,
                fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.4)',
            }}>
                {l.label}
            </div>

            {/* content */}
            <div style={{ position: 'relative', zIndex: 2, height: '100%' }}>
                {children}
            </div>
        </div>
    );
}

export default AndenLogo;
