import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSucursales } from '../servicios/api';
import { getDeptFondo, getEmpresaLogo } from '../utils/assets';
import { useDepartamento, DEPARTAMENTOS } from '../contextos/DepartamentoContext';
import { useAuth } from '../contextos/AuthContext';
import MapaBolivia from '../componentes/MapaBolivia';
import NavbarGlobal from '../componentes/NavbarGlobal';
import gsap from 'gsap';

const RANK_MEDAL = ['🥇', '🥈', '🥉'];

const EMERGENCIAS = [
    { numero: '110', label: 'Policía Nacional', icon: '🚔', color: '#2563eb' },
    { numero: '119', label: 'Bomberos', icon: '🚒', color: '#dc2626' },
    { numero: '118', label: 'Cruz Roja / Ambulancia', icon: '🚑', color: '#16a34a' },
    { numero: '911', label: 'Emergencias Unificado', icon: '📞', color: '#7c3aed' },
    { numero: '165', label: 'Defensoría del Pueblo', icon: '⚖️', color: '#b45309' },
    { numero: '800-10-1618', label: 'Fiscalía', icon: '📋', color: '#0d9488' },
];

const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

const Inicio = () => {
    const { departamento, setDepartamento, tema } = useDepartamento();
    const { perfil } = useAuth();
    const navigate = useNavigate();

    // Paleta derivada 100% del departamento
    const c1 = tema.color;           // color primario   (ej. rojo oscuro La Paz)
    const c2 = tema.colorSecundario; // color secundario (ej. verde oscuro La Paz)
    const bg = tema.bg;              // fondo base (casi negro tintado)
    const ac = tema.acento;          // acento claro

    // Backgrounds derivados
    const bgCard = `linear-gradient(160deg, ${c1}10 0%, ${c2}08 100%)`;
    const bgCardAlt = `linear-gradient(160deg, ${c2}10 0%, ${c1}08 100%)`;
    const bgSection = `radial-gradient(ellipse at 50% 0%, ${c1}12 0%, transparent 65%)`;
    const borderDim = `1px solid ${c1}25`;
    const borderFaint = `1px solid ${c1}14`;

    const [sucursalesAll, setSucursalesAll] = useState([]);
    const [sucursales, setSucursales] = useState([]);
    const rootRef = useRef(null);

    useEffect(() => { getSucursales().then(setSucursalesAll); }, []);

    useEffect(() => {
        const filtradas = sucursalesAll.filter(s => s.departamento === departamento);
        setSucursales(filtradas);
    }, [sucursalesAll, departamento]);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-anim="hero-in"]', { y: 40, opacity: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out', delay: 0.15 });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    const animatedSections = useRef(new Set());
    useEffect(() => {
        const sections = rootRef.current?.querySelectorAll('[data-section]') || [];
        const obs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                if (animatedSections.current.has(entry.target)) return;
                animatedSections.current.add(entry.target);
                const elems = entry.target.querySelectorAll('[data-anim]');
                if (elems.length > 0) {
                    gsap.from(elems, { y: 32, opacity: 0, duration: 0.65, stagger: 0.08, ease: 'power3.out' });
                }
                obs.unobserve(entry.target);
            });
        }, { threshold: 0.12 });
        sections.forEach(s => obs.observe(s));
        return () => obs.disconnect();
    }, [sucursalesAll]);

    const top3 = sucursales.slice(0, 3);
    const STARS = (r) => '★'.repeat(Math.min(5, Math.round((r / 100) * 5)));

    // Estilos base derivados del tema
    const h2Style = {
        fontSize: 'clamp(1.6rem,3.5vw,2.4rem)', fontWeight: 800,
        color: '#f0ece8', lineHeight: 1.12,
        marginBottom: '0.85rem', letterSpacing: '-0.02em',
    };
    const pStyle = {
        color: `${ac}80`, fontSize: 'clamp(0.9rem,1.8vw,1.02rem)',
        lineHeight: 1.7, maxWidth: 540,
    };
    const eyebrow = (override) => ({
        fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.16em',
        textTransform: 'uppercase', color: override || ac,
        marginBottom: '0.5rem',
    });
    const navLinkStyle = {
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: '0.88rem', color: '#e2e8f0', fontWeight: 700,
        padding: '0.35rem 0.75rem', borderRadius: 8, transition: 'all 0.15s',
        textTransform: 'uppercase', letterSpacing: '0.1em',
        fontFamily: "'Inter', 'Rajdhani', system-ui, sans-serif",
    };
    const btnGrad = {
        background: `linear-gradient(135deg, ${tema.primary}, ${tema.secondary})`,
        color: tema.primaryText, border: 'none', borderRadius: 14,
        padding: '0.9rem 2rem', cursor: 'pointer',
        fontSize: '1rem', fontWeight: 700, letterSpacing: '0.01em',
        boxShadow: `0 4px 28px ${c1}50, 0 4px 28px ${c2}35`,
        transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.6rem',
    };

    const permisoBullet = (txt) => (
        <li style={{ color: `${ac}75`, fontSize: '0.86rem', lineHeight: 1.65, marginBottom: '0.45rem', listStyle: 'none', display: 'flex', gap: '0.5rem' }}>
            <span style={{ color: c1, flexShrink: 0, marginTop: '0.15rem' }}>▸</span>
            <span>{txt}</span>
        </li>
    );

    return (
        <div ref={rootRef} style={{ background: bg, minHeight: '100vh', color: '#f0ece8', fontFamily: "'Inter', system-ui, sans-serif", transition: 'background 0.5s' }}>

            {/* ══ NAVBAR ══════════════════════════════════════════════ */}
            <NavbarGlobal onScrollTo={scrollTo} />

            {/* ══ HERO ════════════════════════════════════════════════ */}
            <section id="hero" style={{ position: 'relative', overflow: 'hidden', borderBottom: `1px solid ${c1}25` }}>
                {/* Fondo foto del departamento */}
                <div className="hero-bg" style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `url(${getDeptFondo(departamento)})`,
                    backgroundSize: 'cover', backgroundPosition: 'center 15%',
                    opacity: 0.62,
                    transition: 'opacity 0.6s',
                }} />
                {/* Degradé bicolor — c1 izquierda, c2 derecha */}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(120deg, ${c1}65 0%, ${bg}cc 42%, ${bg}cc 58%, ${c2}55 100%)`,
                }} />
                {/* Vignette superior */}
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${bg}80 0%, transparent 40%, transparent 60%, ${bg}90 100%)` }} />

                <div className="hero-content" style={{ position: 'relative', maxWidth: 900, margin: '0 auto', padding: 'clamp(5rem,10vh,8rem) clamp(1rem,5vw,2.5rem) clamp(10rem,22vh,16rem)' }}>
                    <p data-anim="hero-in" style={eyebrow()}>
                        {DEPARTAMENTOS[departamento]?.emoji} Terminal · {departamento}
                    </p>
                    <h1 data-anim="hero-in" style={{
                        fontSize: 'clamp(2.2rem,5.5vw,4.2rem)', fontWeight: 800,
                        lineHeight: 1.06, letterSpacing: '-0.03em', color: '#f8f4f0',
                        marginBottom: '1.1rem', maxWidth: 660,
                    }}>
                        Elige tu empresa.<br />
                        <span style={{ color: tema.primary }}>
                            Reserva tu asiento.
                        </span>
                    </h1>
                    <p data-anim="hero-in" style={{ ...pStyle, marginBottom: '2.5rem' }}>
                        Compara empresas, consulta disponibilidad en tiempo real
                        y reserva sin colas ni llamadas.
                    </p>

                    <div data-anim="hero-in" className="hero-btns" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button onClick={() => navigate('/planear-viaje')} className="hero-btn-main" style={btnGrad}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 36px ${c1}70, 0 8px 36px ${c2}50`; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 28px ${c1}60, 0 4px 28px ${c2}40`; }}>
                            🗺️ Planea tu viaje
                        </button>
                        <button onClick={() => scrollTo('explorar')} className="hero-btn-sec" style={{
                            background: 'transparent', border: `1.5px solid ${c1}60`,
                            color: ac, padding: '0.88rem 1.75rem', borderRadius: 14,
                            cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600, transition: 'all 0.18s',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.background = `${c1}18`; e.currentTarget.style.borderColor = c1; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `${c1}60`; }}>
                            Ver empresas →
                        </button>
                    </div>
                </div>
            </section>

            {/* ══ EXPLORAR ════════════════════════════════════════════ */}
            <section id="explorar" data-section style={{ borderBottom: `1px solid ${c1}20`, padding: 'clamp(2.5rem,5vh,4rem) clamp(1rem,5vw,2.5rem)', background: bgSection }}>
                <div style={{ maxWidth: 1060, margin: '0 auto' }}>
                    <div data-anim style={{ marginBottom: '2rem' }}>
                        <p style={eyebrow()}>Donde te encuentras</p>
                        <h2 style={{ ...h2Style, marginBottom: 0, fontSize: 'clamp(1.2rem,3.5vw,2.4rem)' }}>Explora desde {departamento}</h2>
                    </div>

                    <div className="explorar-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 380px) 1fr', gap: '2.5rem', alignItems: 'flex-start' }}>

                        {/* Mapa */}
                        <div data-anim className="explorar-mapa-card" style={{ background: bgCard, border: borderDim, borderRadius: 16, padding: '1.25rem', boxShadow: `0 4px 24px ${c1}12, 0 4px 204px ${c2}08` }}>
                            <p style={{ ...eyebrow(), marginBottom: '0.75rem' }}>Selecciona tu departamento</p>
                            <div className="mapa-svg-wrap">
                                <MapaBolivia departamentoActivo={departamento} onSelect={setDepartamento} />
                            </div>
                        </div>

                        {/* Top 3 */}
                        <div className="explorar-top3" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', minWidth: 0, overflow: 'hidden' }}>
                            <p style={{ ...eyebrow(c2), marginBottom: '0.35rem' }}>Mejor calificadas en {departamento}</p>
                            {top3.length === 0 ? (
                                <div style={{ color: `${ac}45`, padding: '2.5rem', background: bgCard, borderRadius: 14, textAlign: 'center', border: borderFaint }}>
                                    Sin empresas registradas en este departamento.
                                </div>
                            ) : (
                                <>
                                    {top3.map((s, i) => {
                                        const medalGlow = i === 0 ? '#d97706' : i === 1 ? '#94a3b8' : '#b45309';
                                        return (
                                            <Link key={s.id} to={`/sucursal/${s.id}`} state={{ departamento }} style={{ textDecoration: 'none', color: 'inherit', display: 'block', minWidth: 0 }}>
                                                <div data-anim className="explorar-empresa-card" style={{
                                                    background: `linear-gradient(135deg, ${s.colorAccent}14, ${bg})`,
                                                    border: `1px solid ${s.colorAccent}45`,
                                                    borderLeft: `3px solid ${s.colorAccent}`,
                                                    borderRadius: 14, padding: '1.1rem 1.25rem',
                                                    display: 'flex', alignItems: 'center', gap: '1rem',
                                                    overflow: 'hidden',
                                                    transition: 'all 0.18s', cursor: 'pointer',
                                                    boxShadow: `0 2px 16px ${s.colorAccent}18`,
                                                }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${s.colorAccent}24, ${c1}08)`; e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = `0 4px 24px ${s.colorAccent}35`; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${s.colorAccent}14, ${bg})`; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 2px 16px ${s.colorAccent}18`; }}>

                                                    <div className="explorar-medalla" style={{
                                                        width: 40, height: 40, borderRadius: 10,
                                                        background: i === 0 ? 'linear-gradient(135deg,#f59e0b,#d97706)' : i === 1 ? 'linear-gradient(135deg,#cbd5e1,#94a3b8)' : 'linear-gradient(135deg,#d97706,#b45309)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: i === 0 ? '1.3rem' : '1.05rem', flexShrink: 0,
                                                        boxShadow: `0 0 16px ${medalGlow}70`,
                                                    }}>
                                                        {RANK_MEDAL[i]}
                                                    </div>

                                                    <div className="explorar-logo" style={{
                                                        borderRadius: 10, flexShrink: 0, overflow: 'hidden',
                                                        background: '#ffffff',
                                                        border: `2px solid ${s.colorAccent}80`,
                                                        boxShadow: `0 0 12px ${s.colorAccent}50`,
                                                        width: 72, height: 72,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    }}>
                                                        {getEmpresaLogo(s.nombre)
                                                            ? <img src={getEmpresaLogo(s.nombre)} alt={s.nombre} className="explorar-logo-img" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }} />
                                                            : <div style={{ fontSize: '2.2rem', lineHeight: 1 }}>{s.logoEmoji || '🚌'}</div>
                                                        }
                                                    </div>

                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 700, color: '#f8f4f0', fontSize: '0.97rem', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nombre}</div>
                                                        <div style={{ color: '#d97706', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                                                            {STARS(s.ranking)} <span style={{ color: `${ac}50` }}>{s.ranking}pts</span>
                                                        </div>
                                                        <div className="explorar-amenidades" style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                                            {(s.amenidades || []).slice(0, 3).map(a => (
                                                                <span key={a} style={{ fontSize: '0.65rem', color: `${ac}70`, background: `${s.colorAccent}10`, border: `1px solid ${s.colorAccent}20`, padding: '0.1rem 0.4rem', borderRadius: 4 }}>{a}</span>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <span style={{ color: s.colorAccent, fontSize: '0.82rem', fontWeight: 700, flexShrink: 0 }}>Ver →</span>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </>
                            )}

                            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                                <button onClick={() => navigate('/empresas')} style={{
                                    background: `linear-gradient(90deg, ${c1}18, ${c2}12)`,
                                    border: `1px solid ${c1}55`,
                                    color: ac, padding: '0.55rem 1.8rem', borderRadius: 999,
                                    cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700,
                                    transition: 'all 0.18s', whiteSpace: 'nowrap',
                                    boxShadow: `0 0 18px ${c1}20, 0 0 18px ${c2}12`,
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(90deg, ${c1}30, ${c2}22)`; e.currentTarget.style.boxShadow = `0 0 28px ${c1}40, 0 0 28px ${c2}28`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(90deg, ${c1}18, ${c2}12)`; e.currentTarget.style.boxShadow = `0 0 18px ${c1}20, 0 0 18px ${c2}12`; e.currentTarget.style.transform = 'none'; }}>
                                    Ver todas las empresas →
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ NOSOTROS ════════════════════════════════════════════ */}
            <section id="nosotros" data-section style={{ padding: 'clamp(3rem,5vh,4.5rem) clamp(1rem,5vw,2.5rem)', borderBottom: `1px solid ${c1}20`, background: `radial-gradient(ellipse at 70% 50%, ${c2}08 0%, transparent 60%)` }}>
                <div style={{ maxWidth: 960, margin: '0 auto' }}>
                    <p data-anim style={eyebrow()}>Quiénes somos</p>
                    <h2 data-anim style={h2Style}>Terminal de Buses Bolivia</h2>
                    <p data-anim style={{ ...pStyle, marginBottom: '2.5rem' }}>
                        Somos la plataforma digital oficial del Terminal de Buses de Bolivia.
                        Integramos tecnología para modernizar el transporte interprovincial,
                        conectando viajeros con empresas de transporte de forma rápida, transparente y segura.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.1rem', marginBottom: '2rem' }}>
                        {[
                            { icon: '🎯', titulo: 'Misión', texto: 'Conectar los departamentos de Bolivia con transporte interprovincial seguro, cómodo y puntual, priorizando la experiencia del viajero.' },
                            { icon: '🔭', titulo: 'Visión', texto: 'Ser la plataforma líder en gestión de terminales de buses en Bolivia, digitalizando el transporte nacional al 2030.' },
                            { icon: '⚡', titulo: 'Valores', texto: 'Puntualidad, seguridad, transparencia y compromiso con el bienestar del pasajero guían cada operación.' },
                        ].map((card, idx) => (
                            <div data-anim key={card.titulo} style={{ background: idx === 1 ? bgCardAlt : bgCard, border: borderFaint, borderRadius: 14, padding: '1.35rem', boxShadow: `0 2px 14px ${idx === 1 ? c2 : c1}10` }}>
                                <div style={{ fontSize: '1.7rem', marginBottom: '0.6rem' }}>{card.icon}</div>
                                <div style={{ fontWeight: 700, color: ac, marginBottom: '0.5rem' }}>{card.titulo}</div>
                                <p style={{ color: `${ac}65`, fontSize: '0.86rem', lineHeight: 1.7, margin: 0 }}>{card.texto}</p>
                            </div>
                        ))}
                    </div>
                    <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem' }}>
                        {[
                            { v: '47+', l: 'Empresas operadoras' },
                            { v: '9', l: 'Departamentos' },
                            { v: '500+', l: 'Rutas disponibles' },
                            { v: '24/7', l: 'Atención en terminal' },
                        ].map((s, idx) => (
                            <div data-anim key={s.l} style={{ textAlign: 'center', background: idx % 2 === 0 ? `${c1}0c` : `${c2}0c`, border: `1px solid ${idx % 2 === 0 ? c1 : c2}18`, borderRadius: 12, padding: '1.1rem 0.5rem' }}>
                                <div style={{ fontSize: '1.7rem', fontWeight: 800, color: idx % 2 === 0 ? c1 : c2, lineHeight: 1, filter: `brightness(1.4)` }}>{s.v}</div>
                                <div style={{ color: `${ac}55`, fontSize: '0.7rem', marginTop: '0.3rem' }}>{s.l}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ PERMISOS ════════════════════════════════════════════ */}
            <section id="permisos" data-section style={{ padding: 'clamp(3rem,5vh,4.5rem) clamp(1rem,5vw,2.5rem)', borderBottom: `1px solid ${c1}20`, background: `radial-gradient(ellipse at 30% 50%, ${c1}08 0%, transparent 60%)` }}>
                <div style={{ maxWidth: 960, margin: '0 auto' }}>
                    <p data-anim style={eyebrow(c1)}>Documentación requerida</p>
                    <h2 data-anim style={h2Style}>Permisos para menores de edad</h2>
                    <p data-anim style={{ ...pStyle, marginBottom: '2rem' }}>
                        Todo menor de edad debe presentar la documentación requerida antes de abordar.
                        Acércate a la ventanilla del terminal con tiempo suficiente.
                    </p>
                    <div className="permisos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.35rem' }}>
                        {[
                            {
                                icon: '👨‍👩‍👦', titulo: 'Viaja con Padre o Madre',
                                items: [
                                    'CI original y fotocopia del padre o madre que viaja.',
                                    'El padre/madre que no viaje debe autorizar por escrito en la fotocopia de su CI.',
                                    'Sin autorización escrita: presentar dos garantes con CI original y fotocopia.',
                                    'CI o certificado de nacimiento original y fotocopia del menor.',
                                ],
                            },
                            {
                                icon: '🧑‍🤝‍🧑', titulo: 'Viaja con un Familiar',
                                items: [
                                    'CI original y fotocopia del familiar acompañante.',
                                    'Ambos padres deben presentarse para firmar el formulario de verificación.',
                                    'El padre/madre ausente debe autorizar por escrito en la fotocopia de su CI.',
                                    'Sin autorización de uno de los padres: dos garantes con CI original y fotocopia.',
                                    'CI o certificado de nacimiento original y fotocopia del menor.',
                                ],
                            },
                        ].map(card => (
                            <div data-anim key={card.titulo} className="permiso-card" style={{ background: bgCard, border: `1px solid ${c1}20`, borderRadius: 14, padding: '1.4rem' }}>
                                <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', marginBottom: '1rem' }}>
                                    <span style={{ fontSize: '1.75rem' }}>{card.icon}</span>
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#f8f4f0', fontSize: '0.95rem' }}>{card.titulo}</div>
                                        <div style={{ color: `${ac}40`, fontSize: '0.7rem' }}>Documentos requeridos</div>
                                    </div>
                                </div>
                                <ul style={{ margin: 0, padding: 0 }}>
                                    {card.items.map((item, i) => (
                                        <React.Fragment key={i}>{permisoBullet(item)}</React.Fragment>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div data-anim style={{ marginTop: '1.35rem', background: `${c1}12`, border: `1px solid ${c1}30`, borderRadius: 10, padding: '0.9rem 1.15rem', display: 'flex', gap: '0.6rem' }}>
                        <span style={{ flexShrink: 0 }}>⚠️</span>
                        <p style={{ margin: 0, color: ac, fontSize: '0.82rem', lineHeight: 1.6 }}>
                            <strong>Importante:</strong> El incumplimiento impedirá el abordaje. Presentar todos los documentos en ventanilla con anticipación.
                        </p>
                    </div>
                </div>
            </section>

            {/* ══ EMERGENCIAS ═════════════════════════════════════════ */}
            <section id="emergencias" data-section style={{ padding: 'clamp(3rem,5vh,4.5rem) clamp(1rem,5vw,2.5rem)', borderBottom: `1px solid ${c1}20` }}>
                <div style={{ maxWidth: 960, margin: '0 auto' }}>
                    <p data-anim style={eyebrow('#ef4444')}>Números de emergencia</p>
                    <h2 data-anim style={h2Style}>¿Necesitas ayuda?</h2>
                    <p data-anim style={{ ...pStyle, marginBottom: '2rem' }}>
                        En caso de emergencia dentro o fuera del terminal, comunícate con los siguientes números disponibles las 24 horas.
                    </p>
                    <div className="emergencias-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '0.8rem' }}>
                        {EMERGENCIAS.map(e => (
                            <a data-anim key={e.numero} href={`tel:${e.numero}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div className="emergencia-card" style={{ background: bgCard, border: `1px solid ${e.color}20`, borderRadius: 12, padding: '1rem 1.1rem', display: 'flex', gap: '0.85rem', alignItems: 'center', transition: 'all 0.18s', cursor: 'pointer' }}
                                    onMouseEnter={ev => { ev.currentTarget.style.background = `${e.color}12`; ev.currentTarget.style.borderColor = `${e.color}50`; ev.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={ev => { ev.currentTarget.style.background = bgCard; ev.currentTarget.style.borderColor = `${e.color}20`; ev.currentTarget.style.transform = 'none'; }}>
                                    <div className="emergencia-icon" style={{ width: 42, height: 42, borderRadius: 10, background: `${e.color}18`, border: `1px solid ${e.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>{e.icon}</div>
                                    <div>
                                        <div className="emergencia-num" style={{ fontWeight: 800, fontSize: '1.05rem', color: e.color, fontFamily: 'monospace' }}>{e.numero}</div>
                                        <div style={{ color: `${ac}55`, fontSize: '0.72rem', marginTop: '0.1rem' }}>{e.label}</div>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ FOOTER ══════════════════════════════════════════════ */}
            <footer style={{ borderTop: `1px solid ${c1}20`, padding: '2.5rem clamp(1rem,5vw,2.5rem)', background: `linear-gradient(180deg, transparent, ${c1}08)` }}>
                <div style={{ maxWidth: 960, margin: '0 auto' }}>
                    <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                        <div>
                            <div style={{
                                width: 90, height: 90, borderRadius: '50%',
                                background: `#ffffff url(/personal/logo_terminal.png) center/85% no-repeat`,
                                border: `3px solid ${tema.primary}`,
                                boxShadow: `0 0 20px ${tema.primary}60`,
                                marginBottom: '0.75rem',
                            }} />
                            <p style={{ color: `${ac}45`, fontSize: '0.76rem', lineHeight: 1.65, margin: 0 }}>Plataforma digital oficial de gestión del terminal de buses interprovinciales.</p>
                        </div>
                        <div>
                            <div style={{ fontWeight: 600, color: `${ac}45`, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.65rem' }}>Viajeros</div>
                            {[{ to: '/planear-viaje', l: 'Planear viaje' }, { to: '/empresas', l: 'Ver empresas' }, { to: '/mis-viajes', l: 'Mis viajes' }, { to: '/recuperar-boleto', l: 'Recuperar boleto' }].map(x => (
                                <Link key={x.to} to={x.to} style={{ display: 'block', color: `${ac}55`, textDecoration: 'none', fontSize: '0.79rem', marginBottom: '0.35rem', transition: 'color 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.color = ac}
                                    onMouseLeave={e => e.currentTarget.style.color = `${ac}55`}>{x.l}</Link>
                            ))}
                        </div>
                        <div>
                            <div style={{ fontWeight: 600, color: `${ac}45`, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.65rem' }}>Información</div>
                            {[{ id: 'nosotros', l: 'Sobre nosotros' }, { id: 'permisos', l: 'Permisos menores' }, { id: 'emergencias', l: 'Emergencias' }].map(x => (
                                <button key={x.id} onClick={() => scrollTo(x.id)} style={{ display: 'block', color: `${ac}55`, background: 'none', border: 'none', fontSize: '0.79rem', marginBottom: '0.35rem', cursor: 'pointer', padding: 0, textAlign: 'left', transition: 'color 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.color = ac}
                                    onMouseLeave={e => e.currentTarget.style.color = `${ac}55`}>{x.l}</button>
                            ))}
                        </div>
                        <div>
                            <div style={{ fontWeight: 600, color: `${ac}45`, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.65rem' }}>Acceso</div>
                            {[{ to: '/login-cliente', l: 'Iniciar sesión' }, { to: '/registro', l: 'Registrarse' }, { to: '/login', l: 'Acceso Staff' }].map(x => (
                                <Link key={x.to} to={x.to} style={{ display: 'block', color: `${ac}55`, textDecoration: 'none', fontSize: '0.79rem', marginBottom: '0.35rem', transition: 'color 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.color = ac}
                                    onMouseLeave={e => e.currentTarget.style.color = `${ac}55`}>{x.l}</Link>
                            ))}
                        </div>
                    </div>
                    <div style={{ borderTop: `1px solid ${c1}15`, paddingTop: '1.1rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span style={{ color: `${ac}30`, fontSize: '0.73rem' }}>© 2026 Terminal de Buses Bolivia · Todos los derechos reservados</span>
                        <span style={{ color: `${ac}25`, fontSize: '0.7rem' }}>v7 · React 19 + Supabase</span>
                    </div>
                </div>
            </footer>

            <style>{`
                @media (max-width: 640px) {
                    .nav-desktop { display: none !important; }
                    .nav-hamburger { display: flex !important; }
                    .nav-logo {
                        width: 2.6rem !important;
                        height: 2.6rem !important;
                        margin-top: 0 !important;
                        border-width: 2px !important;
                    }
                    .nav-auth-btn {
                        font-size: 0.72rem !important;
                        padding: 0.28rem 0.6rem !important;
                    }
                    .explorar-grid {
                        grid-template-columns: 1fr !important;
                        gap: 1rem !important;
                    }
                    .explorar-mapa-card {
                        padding: 0.75rem !important;
                    }
                    .mapa-svg-wrap {
                        width: 220px !important;
                        max-width: 100% !important;
                        margin: 0 auto !important;
                    }
                    .explorar-top3 {
                        gap: 0.45rem !important;
                    }
                    .explorar-empresa-card {
                        padding: 0.55rem 0.65rem !important;
                        gap: 0.5rem !important;
                    }
                    .explorar-amenidades {
                        display: none !important;
                    }
                    .explorar-medalla {
                        width: 28px !important;
                        height: 28px !important;
                        font-size: 0.85rem !important;
                    }
                    .explorar-logo {
                        width: 52px !important;
                        height: 52px !important;
                    }
                    .explorar-logo-img {
                        width: 100% !important;
                        height: 100% !important;
                        object-fit: contain !important;
                    }
                    /* Stats 2x2 */
                    .stats-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                        gap: 0.55rem !important;
                    }
                    /* Permisos */
                    .permiso-card {
                        padding: 0.85rem !important;
                    }
                    .permiso-card span[style] { font-size: 1.2rem !important; }
                    /* Emergencias 3x2 */
                    .emergencias-grid {
                        grid-template-columns: repeat(3, 1fr) !important;
                        gap: 0.45rem !important;
                    }
                    .emergencia-card {
                        padding: 0.55rem 0.6rem !important;
                        gap: 0.45rem !important;
                        flex-direction: column !important;
                        align-items: center !important;
                        text-align: center !important;
                    }
                    .emergencia-icon {
                        width: 32px !important; height: 32px !important;
                        font-size: 0.95rem !important;
                    }
                    .emergencia-num { font-size: 0.82rem !important; }
                    /* Footer 2 cols */
                    .footer-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                        gap: 1.25rem !important;
                    }
                    /* Hero móvil */
                    .hero-bg { background-size: 100% 100% !important; background-position: center center !important; }
                    .hero-content { padding-top: 2rem !important; padding-bottom: 2rem !important; }
                    /* Botones hero */
                    .hero-btns { gap: 0.6rem !important; }
                    .hero-btn-main, .hero-btn-sec {
                        padding: 0.65rem 1.25rem !important;
                        font-size: 0.85rem !important;
                        border-radius: 10px !important;
                    }
                    /* Permisos más delgados — 1 columna en móvil, sin overflow */
                    .permisos-grid {
                        grid-template-columns: 1fr !important;
                        gap: 0.75rem !important;
                    }
                    .permiso-card {
                        padding: 0.6rem 0.75rem !important;
                        min-width: 0 !important;
                        box-sizing: border-box !important;
                    }
                    .permiso-card li {
                        font-size: 0.75rem !important;
                        margin-bottom: 0.25rem !important;
                    }
                }
                @media (min-width: 641px) {
                    .nav-movil-menu { display: none !important; }
                    .mapa-svg-wrap {
                        width: 320px !important;
                        max-width: 100% !important;
                        margin: 0 auto !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default Inicio;
