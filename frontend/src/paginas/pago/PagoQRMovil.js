import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { updateReservaEstado, getReservaById } from '../../servicios/api';
import gsap from 'gsap';
import { getTemaEmpresa } from '../../componentes/TicketCard';
import { getEmpresaLogo } from '../../utils/assets';
import { Bus, ArrowRight } from 'lucide-react';

const PagoQRMovil = () => {
    const [searchParams] = useSearchParams();
    const rootRef = useRef(null);

    const token = searchParams.get('token') || '';
    const [estado, setEstado] = useState('pendiente');
    const [procesando, setProcesando] = useState(false);

    const [viajeInfo, setViajeInfo] = useState({
        origen: searchParams.get('origen') || '—',
        destino: searchParams.get('destino') || '—',
        fecha: searchParams.get('fecha') || '',
        monto: searchParams.get('monto') || '0',
        empresa: searchParams.get('empresa') || '',
    });

    useEffect(() => {
        if (!token) { setEstado('expirado'); return; }
        getReservaById(token).then(data => {
            if (!data) { setEstado('expirado'); return; }
            if (data.estado && data.estado !== 'pendiente') setEstado(data.estado);
            // enrich viaje info from reserva if URL params incomplete
            setViajeInfo(prev => ({
                origen: data.origen || prev.origen,
                destino: data.destino || prev.destino,
                fecha: data.fecha_salida || prev.fecha,
                monto: data.precio_total || prev.monto,
                empresa: data.sucursal?.nombre || data.empresa || prev.empresa,
            }));
        }).catch(() => {});
    }, [token]); // eslint-disable-line

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; document.documentElement.style.overflow = ''; };
    }, []);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Pre-posicionar ambos círculos al centro antes de animar
            gsap.set('[data-m="circle-emp"]', { x: -44, y: 18, scale: 0, opacity: 0 });
            gsap.set('[data-m="circle-sys"]', { x: 44,  y: 0,  scale: 0, opacity: 0 });

            const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
            tl
            // Card entra
            .from('[data-m="card"]', { y: 90, scale: 0.82, opacity: 0, duration: 0.75, ease: 'back.out(1.6)' })
            // Barra se dibuja
            .from('[data-m="bar"]', { scaleX: 0, transformOrigin: 'left center', duration: 0.45, ease: 'power2.inOut' }, '-=0.25')
            // ACT 1 — círculo empresa aparece al centro: "estás reservando con esta empresa"
            .to('[data-m="circle-emp"]', { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(2.4)' })
            // ACT 2 — círculo sistema aparece al centro: "gracias a Terminal Hub"
            .to('[data-m="circle-sys"]', { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)' }, '+=0.3')
            // ACT 3 — ambos se deslizan a sus posiciones finales: unión
            .to('[data-m="circle-emp"]', { x: 0, y: 0, duration: 0.65, ease: 'power3.inOut' }, '+=0.25')
            .to('[data-m="circle-sys"]', { x: 0,       duration: 0.65, ease: 'power3.inOut' }, '<')
            // Nombre empresa
            .from('[data-m="empresa-name"]', { y: 12, opacity: 0, duration: 0.35 }, '-=0.1')
            // Filas de info en cascada
            .from('[data-m="row"]', { y: 24, opacity: 0, stagger: 0.09, duration: 0.4 }, '-=0.1');
        }, rootRef);
        return () => ctx.revert();
    }, []);

    const handlePagar = async () => {
        setProcesando(true);
        await updateReservaEstado(token, 'pagado');
        setEstado('pagado');
        setProcesando(false);
    };

    const handleCancelar = async () => {
        await updateReservaEstado(token, 'cancelado');
        setEstado('cancelado');
    };

    const formatFecha = (iso) => {
        if (!iso) return '';
        try { return new Date(iso).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' }); }
        catch { return iso; }
    };

    const te = getTemaEmpresa(viajeInfo.empresa);
    const logoUrl = getEmpresaLogo(viajeInfo.empresa);
    const c1 = te?.c1 || '#1e3a8a';   // color oscuro / principal
    const c2 = te?.c2 || '#ffffff';   // color claro / texto
    const bgBase = te?.bg || '#07111f';
    const btnText = c2;

    /* ── colores de estado ── */
    const estadoColor = estado === 'pagado' ? '#10b981' : estado === 'cancelado' ? '#ef4444' : c1;

    /* ── figuras flotantes ── */
    const SHAPES = [
        { l: '2%', t: '8%', w: 260, h: 90, rx: '18px', rot: -22, op: 0.10, dur: 19, dl: 0 },
        { l: '58%', t: '15%', w: 220, h: 75, rx: '14px', rot: 16, op: 0.09, dur: 23, dl: 1.8 },
        { l: '62%', t: '55%', w: 280, h: 95, rx: '20px', rot: -10, op: 0.08, dur: 21, dl: 3.2 },
        { l: '-6%', t: '65%', w: 240, h: 80, rx: '16px', rot: 26, op: 0.09, dur: 26, dl: 0.7 },
        { l: '25%', t: '84%', w: 210, h: 72, rx: '16px', rot: -14, op: 0.08, dur: 24, dl: 2.1 },
        { l: '15%', t: '2%', w: 150, h: 150, rx: '22px', rot: 30, op: 0.08, dur: 20, dl: 1 },
        { l: '70%', t: '30%', w: 130, h: 130, rx: '20px', rot: -35, op: 0.07, dur: 27, dl: 3.8 },
        { l: '40%', t: '70%', w: 160, h: 160, rx: '26px', rot: 18, op: 0.07, dur: 22, dl: 0.9 },
        { l: '80%', t: '65%', w: 170, h: 190, rx: '0% 55% 55% 55%', rot: 14, op: 0.08, dur: 25, dl: 1.4 },
        { l: '-4%', t: '32%', w: 150, h: 170, rx: '55% 0% 55% 55%', rot: -28, op: 0.09, dur: 21, dl: 4.1 },
        { l: '35%', t: '40%', w: 140, h: 155, rx: '55% 55% 0% 55%', rot: 42, op: 0.07, dur: 28, dl: 0.6 },
    ];
    const ANIMS = ['qr-flt-a', 'qr-flt-b', 'qr-flt-c', 'qr-flt-d'];
    const COLS = [c1, c2, c1, c2];

    return (
        <div ref={rootRef} style={{
            height: '100vh', position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Rajdhani', sans-serif",
            padding: '1.25rem', overflow: 'hidden', boxSizing: 'border-box',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            background: bgBase,
        }}>

            {/* ── Fondo radial empresa ── */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
                background: `
                    radial-gradient(ellipse 75% 65% at 0% 25%,   ${c1}28 0%, transparent 65%),
                    radial-gradient(ellipse 75% 65% at 100% 75%, ${c2}20 0%, transparent 65%),
                    radial-gradient(ellipse 55% 40% at 50% 0%,   ${c1}18 0%, transparent 55%),
                    radial-gradient(ellipse 50% 50% at 0% 100%,  ${c1}15 0%, transparent 50%),
                    radial-gradient(ellipse 50% 50% at 100% 0%,  ${c2}14 0%, transparent 50%)
                `,
            }} />

            {/* ── Figuras flotantes ── */}
            <style>{`
                @keyframes qr-flt-a { 0%,100%{transform:translateY(0px) rotate(var(--rot))} 50%{transform:translateY(-10px) rotate(calc(var(--rot)+1.5deg))} }
                @keyframes qr-flt-b { 0%,100%{transform:translateY(0px) translateX(0px) rotate(var(--rot))} 50%{transform:translateY(-7px) translateX(6px) rotate(calc(var(--rot)-2deg))} }
                @keyframes qr-flt-c { 0%,100%{transform:translateY(0px) translateX(0px) rotate(var(--rot))} 50%{transform:translateY(-13px) translateX(-5px) rotate(calc(var(--rot)+2.5deg))} }
                @keyframes qr-flt-d { 0%,100%{transform:translateY(0px) rotate(var(--rot))} 40%{transform:translateY(-9px) rotate(calc(var(--rot)-1deg))} }
                @keyframes qr-spin  { to { transform: rotate(360deg); } }
                @keyframes qr-pulse { 0%,100%{box-shadow:0 0 0 0 ${c1}55} 50%{box-shadow:0 0 0 10px ${c1}00} }
            `}</style>
            <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                {SHAPES.map((s, i) => (
                    <div key={i} style={{
                        position: 'absolute', left: s.l, top: s.t,
                        width: s.w, height: s.h, borderRadius: s.rx,
                        background: COLS[i % 4],
                        opacity: s.op,
                        '--rot': `${s.rot}deg`,
                        animation: `${ANIMS[i % 4]} ${s.dur}s ${-(s.dl + s.dur * 0.4)}s ease-in-out infinite`,
                    }} />
                ))}
            </div>

            {/* ── Card ── */}
            <div data-m="card" style={{
                position: 'relative', zIndex: 1, marginTop: -70,
                background: 'rgba(10, 18, 35, 0.82)',
                backdropFilter: 'blur(18px)',
                borderRadius: '22px',
                maxWidth: 390, width: '100%',
                border: `1px solid ${estadoColor}45`,
                boxShadow: `0 24px 70px rgba(0,0,0,0.65), 0 0 50px ${c1}18, inset 0 1px 0 ${c1}15`,
                overflow: 'hidden',
            }}>

                {/* Barra superior empresa */}
                <div data-m="bar" style={{
                    height: 5,
                    background: `linear-gradient(90deg, ${c1}, ${c2}, ${c1})`,
                    backgroundSize: '200% 100%',
                    animation: 'qr-shimmer 3s ease infinite',
                }} />

                <div style={{ padding: '1.75rem' }}>

                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        {/* Dos círculos solapados: Terminal Hub | Empresa */}
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '0.7rem' }}>

                            {/* Círculo logo sistema — ligeramente más abajo */}
                            <div data-m="circle-sys" style={{ width: 115, height: 115, borderRadius: '50%', flexShrink: 0, position: 'relative', zIndex: 1, background: `linear-gradient(135deg, ${c1}, ${c2}, ${c1})`, backgroundSize: '200% 200%', animation: 'qr-shimmer 3s ease infinite', padding: 3, boxSizing: 'border-box', boxShadow: `0 0 28px ${c1}50, 0 6px 20px rgba(0,0,0,0.4)` }}>
                                <div style={{ width: 109, height: 109, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    <img src="/personal/logo_terminal.svg" alt="Terminal Hub" style={{ width: '82%', height: '82%', objectFit: 'contain' }} />
                                </div>
                            </div>

                            {/* Círculo logo empresa — encima y más arriba */}
                            <div data-m="circle-emp" style={{
                                width: 115, height: 115, borderRadius: '50%', flexShrink: 0,
                                position: 'relative', zIndex: 2,
                                marginLeft: -28, marginBottom: 18,
                                background: `linear-gradient(135deg, ${c1}, ${c2}, ${c1})`,
                                backgroundSize: '200% 200%',
                                animation: 'qr-shimmer 3s ease infinite',
                                padding: 3,
                                boxShadow: `0 0 28px ${c1}50, 0 0 10px ${c2}25, 0 6px 20px rgba(0,0,0,0.4)`,
                            }}>
                                <div style={{
                                    width: '100%', height: '100%', borderRadius: '50%',
                                    background: '#ffffff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    overflow: 'hidden',
                                }}>
                                    {logoUrl
                                        ? <img src={logoUrl} alt={viajeInfo.empresa} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <Bus size={36} color={c1} strokeWidth={1.8} />
                                    }
                                </div>
                            </div>
                        </div>

                        <div data-m="empresa-name" style={{ fontWeight: 900, fontSize: '1.15rem', letterSpacing: '0.1em', color: c2 }}>
                            {viajeInfo.empresa ? viajeInfo.empresa.toUpperCase() : 'TERMINAL HUB'}
                        </div>
                        <div data-m="empresa-name" style={{ fontSize: '0.7rem', color: `${c2}60`, marginTop: '0.2rem', fontWeight: 700, letterSpacing: '0.18em' }}>
                            PAGO SEGURO VÍA QR
                        </div>
                    </div>

                    {/* ── Estado: expirado ── */}
                    {estado === 'expirado' && (
                        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏱️</div>
                            <div style={{ color: '#fca5a5', fontWeight: 700, fontSize: '1.1rem' }}>Enlace expirado</div>
                            <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '0.5rem', textTransform: 'none' }}>Este código QR ya no es válido. Solicita uno nuevo.</div>
                        </div>
                    )}

                    {/* ── Estado: pagado ── */}
                    {estado === 'pagado' && (
                        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                            <div style={{
                                width: 72, height: 72, borderRadius: '50%', margin: '0 auto 1rem',
                                background: 'rgba(16,185,129,0.15)', border: '2px solid #10b98155',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '2.2rem',
                                animation: 'qr-pulse 2s ease infinite',
                            }}>✅</div>
                            <div style={{ color: '#6ee7b7', fontWeight: 900, fontSize: '1.2rem' }}>¡PAGO REALIZADO!</div>
                            <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '0.5rem', textTransform: 'none' }}>Tu reserva ha sido confirmada.</div>
                        </div>
                    )}

                    {/* ── Estado: cancelado ── */}
                    {estado === 'cancelado' && (
                        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                            <div style={{
                                width: 72, height: 72, borderRadius: '50%', margin: '0 auto 1rem',
                                background: 'rgba(239,68,68,0.12)', border: '2px solid #ef444440',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '2.2rem',
                            }}>❌</div>
                            <div style={{ color: '#fca5a5', fontWeight: 700, fontSize: '1.1rem' }}>PAGO CANCELADO</div>
                            <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '0.5rem', textTransform: 'none' }}>Los asientos serán liberados.</div>
                        </div>
                    )}

                    {estado === 'pendiente' && !token && (
                        <div style={{ textAlign: 'center', padding: '2rem 0', color: '#fca5a5', fontSize: '0.9rem' }}>
                            Token inválido o expirado.
                        </div>
                    )}

                    {/* ── Pendiente: info + botones ── */}
                    {estado === 'pendiente' && token && (
                        <>
                            {/* Info viaje */}
                            <div data-m="row" style={{
                                background: `linear-gradient(135deg, ${c1}0e, ${c2}06)`,
                                borderRadius: '14px',
                                padding: '1.2rem',
                                marginBottom: '1.25rem',
                                border: `1px solid ${c1}28`,
                                boxShadow: `inset 0 1px 0 ${c1}15`,
                            }}>
                                {/* Ruta */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem', gap: '0.5rem' }}>
                                    <div style={{ textAlign: 'center', flex: 1 }}>
                                        <div style={{ fontSize: '0.58rem', color: `${c2}70`, fontWeight: 700, letterSpacing: '0.15em', marginBottom: '0.25rem' }}>ORIGEN</div>
                                        <div style={{ fontWeight: 900, color: c2, fontSize: '1.1rem', letterSpacing: '0.04em' }}>{viajeInfo.origen}</div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                        <ArrowRight size={10} color={`${c2}55`} strokeWidth={2.5} />
                                        <Bus size={18} color={c2} strokeWidth={1.6} style={{ opacity: 0.85 }} />
                                        <ArrowRight size={10} color={`${c2}55`} strokeWidth={2.5} />
                                    </div>

                                    <div style={{ textAlign: 'center', flex: 1 }}>
                                        <div style={{ fontSize: '0.58rem', color: `${c2}70`, fontWeight: 700, letterSpacing: '0.15em', marginBottom: '0.25rem' }}>DESTINO</div>
                                        <div style={{ fontWeight: 900, color: c2, fontSize: '1.1rem', letterSpacing: '0.04em' }}>{viajeInfo.destino}</div>
                                    </div>
                                </div>

                                {viajeInfo.fecha && (
                                    <div style={{
                                        fontSize: '0.73rem', color: `${c2}55`, fontWeight: 600,
                                        textAlign: 'center', marginBottom: '0.75rem',
                                        textTransform: 'none', letterSpacing: '0.03em',
                                    }}>
                                        📅 {formatFecha(viajeInfo.fecha)}
                                    </div>
                                )}

                                <div style={{
                                    borderTop: `1px solid ${c2}15`,
                                    paddingTop: '0.85rem',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                }}>
                                    <span style={{ color: `${c2}60`, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em' }}>TOTAL A PAGAR</span>
                                    <span style={{
                                        fontWeight: 900, fontSize: '1.8rem', color: c2,
                                        textShadow: `0 0 16px ${c2}60, 0 0 8px ${c1}40`,
                                        letterSpacing: '0.04em',
                                    }}>Bs {viajeInfo.monto}</span>
                                </div>
                            </div>

                            {/* Botones */}
                            <div data-m="row" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                <button
                                    onClick={handlePagar}
                                    disabled={procesando}
                                    style={{
                                        padding: '0.95rem',
                                        background: procesando
                                            ? `${c1}55`
                                            : `linear-gradient(135deg, ${c1} 0%, ${c2} 50%, ${c1} 100%)`,
                                        backgroundSize: '200% 100%',
                                        color: procesando ? 'rgba(255,255,255,0.6)' : btnText,
                                        border: 'none', borderRadius: '12px',
                                        fontWeight: 900, fontSize: '1.05rem',
                                        cursor: procesando ? 'wait' : 'pointer',
                                        boxShadow: procesando ? 'none' : `0 6px 24px ${c1}50, 0 2px 8px rgba(0,0,0,0.3)`,
                                        transition: 'all 0.25s',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                        fontFamily: "'Rajdhani', sans-serif",
                                        letterSpacing: '0.1em', textTransform: 'uppercase',
                                    }}
                                    onMouseEnter={e => { if (!procesando) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
                                >
                                    {procesando ? (
                                        <>
                                            <span style={{ width: 17, height: 17, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', display: 'inline-block', animation: 'qr-spin 0.7s linear infinite' }} />
                                            Procesando...
                                        </>
                                    ) : '💳 Confirmar Pago'}
                                </button>

                                <button
                                    onClick={handleCancelar}
                                    style={{
                                        padding: '0.8rem', background: 'transparent',
                                        color: '#ef4444', border: '1px solid #ef444430',
                                        borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem',
                                        cursor: 'pointer', transition: 'all 0.2s',
                                        fontFamily: "'Rajdhani', sans-serif",
                                        letterSpacing: '0.08em', textTransform: 'uppercase',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = '#ef444460'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#ef444430'; }}
                                >
                                    Cancelar
                                </button>
                            </div>

                            <div data-m="row" style={{ marginTop: '1.1rem', textAlign: 'center', fontSize: '0.7rem', color: `${c2}50`, fontWeight: 700, letterSpacing: '0.12em' }}>
                                🔒 CONEXIÓN SEGURA · TERMINAL HUB
                            </div>
                        </>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes qr-shimmer {
                    0%   { background-position: 0% 50%; }
                    50%  { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
            `}</style>
        </div>
    );
};

export default PagoQRMovil;
