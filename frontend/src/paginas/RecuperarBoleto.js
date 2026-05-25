import React, { useState, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';
import TicketCard, { getTemaEmpresa, getLogoEmpresa } from '../componentes/TicketCard';
import { useDepartamento } from '../contextos/DepartamentoContext';
import { getDeptFondo } from '../utils/assets';
import gsap from 'gsap';

const FF = "'Rajdhani', system-ui, sans-serif";

const ESTADO_COLOR = {
    confirmada:           { label: 'Confirmada',  color: '#16a34a', bg: 'rgba(22,163,74,0.15)'  },
    pendiente_efectivo:   { label: 'Pendiente',   color: '#d97706', bg: 'rgba(217,119,6,0.15)'  },
    pendiente_documentos: { label: 'Pendiente',   color: '#d97706', bg: 'rgba(217,119,6,0.15)'  },
    cancelada:            { label: 'Cancelada',   color: '#dc2626', bg: 'rgba(220,38,38,0.15)'  },
    completada:           { label: 'Completada',  color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
};

const PUEDE_PDF = new Set(['confirmada', 'pendiente_efectivo', 'pendiente_documentos']);

const RecuperarBoleto = () => {
    const { departamento, tema } = useDepartamento();
    const [ci,        setCi]        = useState('');
    const [email,     setEmail]     = useState('');
    const [buscando,  setBuscando]  = useState(false);
    const [buscado,   setBuscado]   = useState(false);
    const [boletos,   setBoletos]   = useState([]);
    const [qrAbierto, setQrAbierto] = useState(null);
    const [pdfEn,     setPdfEn]     = useState(null);

    const rootRef    = useRef(null);
    const ticketRefs = useRef({});

    const P  = tema.primary  || tema.color;
    const S  = tema.secondary || tema.colorSecundario;
    const bg = getDeptFondo(departamento);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-r="card"]',  { y: 28, opacity: 0, duration: 0.65, ease: 'power3.out', delay: 0.1 });
            gsap.from('[data-r="field"]', { y: 12, opacity: 0, duration: 0.4, stagger: 0.07, ease: 'power3.out', delay: 0.25 });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    useEffect(() => {
        if (boletos.length > 0) {
            const ctx = gsap.context(() => {
                gsap.from('[data-r="boleto-card"]', { y: 16, opacity: 0, duration: 0.35, stagger: 0.07, ease: 'power3.out' });
            }, rootRef);
            return () => ctx.revert();
        }
    }, [boletos]);

    const buscar = (ciQuery, emailQuery) => {
        const reservas  = JSON.parse(localStorage.getItem('tbb_reservas') || '[]');
        const boletosLS = JSON.parse(localStorage.getItem('tbb_boletos')  || '[]');

        const normCI    = ciQuery.trim();
        const normEmail = emailQuery.trim().toLowerCase();

        const fromReservas = reservas
            .filter(r => {
                const matchCI    = r.pasajeroCI && r.pasajeroCI.toString() === normCI;
                const matchEmail = !normEmail || (r.pasajeroEmail && r.pasajeroEmail.toLowerCase().includes(normEmail));
                return matchCI && matchEmail;
            })
            .map(r => ({
                id:           r.id,
                pasajeroNombre: r.pasajeroNombre || '—',
                pasajeroCI:   r.pasajeroCI,
                email:        r.pasajeroEmail || '—',
                origen:       r.origen    || '—',
                destino:      r.destino   || '—',
                fechaSalida:  r.fechaSalida || r.creadoEn || null,
                asientos:     Array.isArray(r.asientos) ? r.asientos : (r.asientos ? [r.asientos] : ['—']),
                estado:       r.estado    || 'confirmada',
                precio_total: r.precio    || 0,
                metodoPago:   r.metodoPago || '—',
                empresaNombre: r.empresaNombre || r.empresa || '',
                busPlaca:     r.busPlaca   || '—',
            }));

        const fromBoletos = boletosLS
            .filter(b => {
                const matchCI    = b.ci_pasajero && b.ci_pasajero.toString() === normCI;
                const matchEmail = !normEmail || (b.pasajeroEmail && b.pasajeroEmail.toLowerCase().includes(normEmail));
                return matchCI && matchEmail;
            })
            .map(b => ({
                id:           b.id,
                pasajeroNombre: b.nombre_pasajero || '—',
                pasajeroCI:   b.ci_pasajero,
                email:        b.pasajeroEmail || '—',
                origen:       b.origen   || '—',
                destino:      b.destino  || '—',
                fechaSalida:  b.fecha_viaje || null,
                asientos:     b.asiento ? [b.asiento] : ['—'],
                estado:       b.estado   || 'confirmada',
                precio_total: b.precio_individual || 0,
                metodoPago:   b.metodo_pago || '—',
                empresaNombre: b.empresaNombre || b.empresa || '',
                busPlaca:     b.busPlaca  || '—',
            }));

        return [...fromReservas, ...fromBoletos];
    };

    const handleBuscar = (e) => {
        e.preventDefault();
        if (!ci.trim()) return;
        setBuscando(true);
        setBuscado(false);
        setQrAbierto(null);
        ticketRefs.current = {};
        setTimeout(() => {
            setBoletos(buscar(ci, email));
            setBuscando(false);
            setBuscado(true);
        }, 400);
    };

    const handleDescargarPDF = async (b) => {
        if (!PUEDE_PDF.has(b.estado)) return;
        setPdfEn(b.id);
        try {
            const h2c = (await import('html2canvas')).default;
            const els = b.asientos.map((_, i) => ticketRefs.current[`${b.id}-${i}`]).filter(Boolean);
            if (!els.length) { setPdfEn(null); return; }
            const pdf    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageW  = 210, margin = 8;
            const tickW  = (pageW - margin * 3) / 2;
            const tickH  = tickW * (360 / 600);
            const rowsPP = Math.floor((297 - margin * 2) / (tickH + margin));
            for (let i = 0; i < els.length; i++) {
                const col       = i % 2;
                const globalRow = Math.floor(i / 2);
                const localRow  = globalRow % rowsPP;
                if (i > 0 && col === 0 && localRow === 0) pdf.addPage();
                const canvas = await h2c(els[i], { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#f4f6f8', logging: false });
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin + col * (tickW + margin), margin + localRow * (tickH + margin), tickW, tickH);
            }
            pdf.save(`boleto-tbb-${b.id.slice(-8)}.pdf`);
        } catch (err) { console.error('PDF error:', err); }
        setPdfEn(null);
    };

    const labelStyle = {
        display: 'block', fontSize: '0.62rem', fontWeight: 700,
        letterSpacing: '0.13em', marginBottom: '0.25rem',
        textTransform: 'uppercase', fontFamily: FF,
        background: `linear-gradient(90deg, ${P}, ${S})`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    };

    const inputStyle = {
        width: '100%', boxSizing: 'border-box',
        background: 'rgba(0,0,0,0.60)',
        border: `1px solid ${P}45`,
        color: '#ffffff', padding: '0.55rem 0.75rem',
        borderRadius: '7px', fontSize: '0.82rem',
        outline: 'none', fontFamily: FF,
        textTransform: 'uppercase', letterSpacing: '0.04em',
        transition: 'border-color 0.2s, box-shadow 0.2s',
    };

    const focusIn  = e => { e.target.style.borderColor = P;         e.target.style.boxShadow = `0 0 0 3px ${P}20`; };
    const focusOut = e => { e.target.style.borderColor = `${P}45`; e.target.style.boxShadow = 'none'; };
    const canSubmit = !buscando && ci.trim();

    return (
        <div ref={rootRef} style={{
            height: 'calc(100dvh - 76px)', width: '100%',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden', position: 'relative',
            fontFamily: FF, textTransform: 'uppercase', letterSpacing: '0.03em',
        }}>
            {/* ── Fondos ── */}
            {bg && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 0,
                    backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center',
                    filter: 'brightness(0.25) saturate(0.5)',
                }} />
            )}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: `linear-gradient(135deg, rgba(6,10,20,0.97) 0%, ${P}35 35%, ${S}22 65%, rgba(6,10,20,0.97) 100%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, width: '40%', height: '40%', zIndex: 0, background: `radial-gradient(ellipse at top left, ${P}40 0%, transparent 70%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '40%', height: '40%', zIndex: 0, background: `radial-gradient(ellipse at bottom right, ${S}35 0%, transparent 70%)`, pointerEvents: 'none' }} />

            {/* ── Tickets ocultos para PDF ── */}
            <div style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none', zIndex: -1 }}>
                {boletos.filter(b => PUEDE_PDF.has(b.estado)).map(b => {
                    const te       = getTemaEmpresa(b.empresaNombre);
                    const logoSrc  = getLogoEmpresa(b.empresaNombre);
                    return b.asientos.map((asiento, idx) => (
                        <div key={`${b.id}-${idx}`} ref={el => { if (el) ticketRefs.current[`${b.id}-${idx}`] = el; }}>
                            <TicketCard
                                boleto={{
                                    id:             b.id,
                                    pasajeroNombre: b.pasajeroNombre,
                                    pasajeroCI:     b.pasajeroCI,
                                    asiento:        asiento,
                                    origen:         b.origen,
                                    destino:        b.destino,
                                    fechaSalida:    b.fechaSalida,
                                    busPlaca:       b.busPlaca,
                                }}
                                te={te}
                                logoSrc={logoSrc}
                                empresaNombre={b.empresaNombre || 'Terminal Buses Bolivia'}
                                isMobile={false}
                            />
                        </div>
                    ));
                })}
            </div>

            {/* ── Tarjeta central ── */}
            <div style={{
                position: 'relative', zIndex: 1,
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 'clamp(0.5rem,2vw,1.25rem)',
                paddingBottom: 'calc(clamp(0.5rem,2vw,1.25rem) + 60px)',
                overflow: 'hidden',
            }}>
                <div data-r="card" style={{
                    width: '100%', maxWidth: '480px',
                    background: 'rgba(0,0,0,0.65)',
                    border: `1px solid ${P}40`,
                    borderRadius: '16px',
                    padding: 'clamp(1rem,3vw,1.5rem)',
                    backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
                    boxShadow: `0 0 0 1px ${S}20, 0 24px 48px rgba(0,0,0,0.8), 0 0 60px ${P}15`,
                    display: 'flex', flexDirection: 'column',
                    maxHeight: 'calc(100dvh - 76px - 5rem)',
                }}>

                    {/* Título */}
                    <div data-r="field" style={{ marginBottom: '1rem', flexShrink: 0 }}>
                        <div style={{
                            fontSize: 'clamp(1.1rem,3.5vw,1.35rem)', fontWeight: 800, lineHeight: 1,
                            background: `linear-gradient(90deg, ${P}, ${S})`,
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>
                            Recuperar Boleto
                        </div>
                        <div style={{ fontSize: '0.62rem', color: `${S}cc`, marginTop: '0.2rem', letterSpacing: '0.1em' }}>
                            {tema.emoji} {departamento} · Ingresa CI y correo para buscar
                        </div>
                    </div>

                    {/* Formulario */}
                    <form onSubmit={handleBuscar} noValidate style={{ flexShrink: 0 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.65rem' }}>
                            <div data-r="field">
                                <label style={labelStyle}>CI *</label>
                                <input
                                    type="text" value={ci}
                                    onChange={e => setCi(e.target.value)}
                                    placeholder="1234567" required
                                    style={inputStyle}
                                    onFocus={focusIn} onBlur={focusOut}
                                />
                            </div>
                            <div data-r="field">
                                <label style={labelStyle}>Correo</label>
                                <input
                                    type="email" value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="tu@correo.com"
                                    style={{ ...inputStyle, textTransform: 'none' }}
                                    onFocus={focusIn} onBlur={focusOut}
                                />
                            </div>
                        </div>
                        <div data-r="field" style={{ marginBottom: buscado ? '0.85rem' : 0 }}>
                            <button type="submit" disabled={!canSubmit} style={{
                                width: '100%', padding: '0.7rem',
                                background: canSubmit ? `linear-gradient(135deg, ${P} 0%, ${S} 100%)` : '#1f2937',
                                color: canSubmit ? '#fff' : '#64748b',
                                border: 'none', borderRadius: '9px',
                                fontWeight: 800, cursor: canSubmit ? 'pointer' : 'not-allowed',
                                fontSize: '0.88rem', letterSpacing: '0.12em',
                                fontFamily: FF, textTransform: 'uppercase',
                                boxShadow: canSubmit ? `0 4px 20px ${P}45, 0 0 0 1px ${S}30` : 'none',
                                transition: 'all 0.2s',
                            }}>
                                {buscando ? 'Buscando...' : '🔍 Buscar boletos'}
                            </button>
                        </div>
                    </form>

                    {/* Resultados */}
                    {buscado && (
                        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <div style={{ fontSize: '0.62rem', color: `${S}aa`, letterSpacing: '0.1em', marginBottom: '0.5rem', flexShrink: 0 }}>
                                {boletos.length === 0
                                    ? 'Sin resultados — verifica el CI y correo'
                                    : `${boletos.length} boleto${boletos.length !== 1 ? 's' : ''} encontrado${boletos.length !== 1 ? 's' : ''}`
                                }
                            </div>

                            {boletos.length === 0 ? (
                                <div style={{
                                    flex: 1, display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    background: 'rgba(0,0,0,0.40)', borderRadius: '10px',
                                    border: `1px solid ${P}20`, padding: '1.5rem', textAlign: 'center',
                                }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎫</div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b', letterSpacing: '0.05em' }}>
                                        No hay boletos para CI <span style={{ color: P }}>{ci}</span>
                                        {email && <><br />correo <span style={{ color: S }}>{email}</span></>}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
                                    {boletos.map(b => {
                                        const est     = ESTADO_COLOR[b.estado] || ESTADO_COLOR.confirmada;
                                        const abierto = qrAbierto === b.id;
                                        const puedePDF = PUEDE_PDF.has(b.estado);
                                        const qrValue = `TBB|${b.id}|${b.pasajeroCI}|${b.origen}→${b.destino}|${b.asientos.join(',')}`;
                                        const fechaStr = b.fechaSalida
                                            ? new Date(b.fechaSalida).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })
                                            : '—';
                                        return (
                                            <div key={b.id} data-r="boleto-card" style={{
                                                background: 'rgba(0,0,0,0.50)',
                                                border: `1px solid ${P}30`,
                                                borderRadius: '10px', padding: '0.75rem 0.9rem',
                                                marginBottom: '0.5rem',
                                            }}>
                                                {/* Ruta + estado */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem', gap: '0.5rem' }}>
                                                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>
                                                        {b.origen} → {b.destino}
                                                    </span>
                                                    <span style={{
                                                        fontSize: '0.6rem', fontWeight: 700, flexShrink: 0,
                                                        color: est.color, background: est.bg,
                                                        padding: '0.12rem 0.5rem', borderRadius: '999px',
                                                        border: `1px solid ${est.color}40`,
                                                    }}>
                                                        {est.label}
                                                    </span>
                                                </div>

                                                {/* Datos */}
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 0.5rem', marginBottom: '0.6rem' }}>
                                                    {[
                                                        { label: 'Pasajero', val: b.pasajeroNombre },
                                                        { label: 'Asientos', val: b.asientos.join(', ') },
                                                        { label: 'Fecha',    val: fechaStr },
                                                        { label: 'Total',    val: `Bs ${parseFloat(b.precio_total || 0).toFixed(2)}` },
                                                    ].map(({ label, val }) => (
                                                        <div key={label}>
                                                            <div style={{ fontSize: '0.58rem', color: `${S}80`, letterSpacing: '0.08em' }}>{label}</div>
                                                            <div style={{ fontSize: '0.75rem', color: '#c0cfe0', fontWeight: 500 }}>{val}</div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* QR expandido */}
                                                {abierto && (
                                                    <div style={{
                                                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                                                        padding: '0.75rem', marginBottom: '0.6rem',
                                                        background: 'rgba(255,255,255,0.04)',
                                                        border: `1px solid ${P}25`, borderRadius: '8px',
                                                    }}>
                                                        <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', marginBottom: '0.4rem' }}>
                                                            <QRCodeSVG value={qrValue} size={130} />
                                                        </div>
                                                        <div style={{ fontSize: '0.56rem', color: `${S}70`, letterSpacing: '0.06em', textAlign: 'center' }}>
                                                            {b.id}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Botones */}
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        onClick={() => setQrAbierto(abierto ? null : b.id)}
                                                        style={{
                                                            flex: 1, padding: '0.38rem 0',
                                                            background: abierto ? `${P}30` : `${P}15`,
                                                            border: `1px solid ${P}55`, color: P,
                                                            borderRadius: '7px', fontSize: '0.68rem', fontWeight: 700,
                                                            cursor: 'pointer', fontFamily: FF,
                                                            textTransform: 'uppercase', letterSpacing: '0.06em',
                                                            transition: 'all 0.2s',
                                                        }}
                                                    >
                                                        {abierto ? '▲ Cerrar QR' : '▼ Ver QR'}
                                                    </button>

                                                    {puedePDF && (
                                                        <button
                                                            onClick={() => handleDescargarPDF(b)}
                                                            disabled={pdfEn === b.id}
                                                            style={{
                                                                flex: 1, padding: '0.38rem 0',
                                                                background: pdfEn === b.id ? 'rgba(0,0,0,0.30)' : `${S}20`,
                                                                border: `1px solid ${S}55`,
                                                                color: pdfEn === b.id ? '#64748b' : S,
                                                                borderRadius: '7px', fontSize: '0.68rem', fontWeight: 700,
                                                                cursor: pdfEn === b.id ? 'not-allowed' : 'pointer',
                                                                fontFamily: FF, textTransform: 'uppercase',
                                                                letterSpacing: '0.06em', transition: 'all 0.2s',
                                                            }}
                                                        >
                                                            {pdfEn === b.id ? 'Generando...' : '⬇ PDF'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecuperarBoleto;
