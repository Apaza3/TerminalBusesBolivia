import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import gsap from 'gsap';
import { getTemaEmpresa, getLogoEmpresa } from '../componentes/TicketCard';
import { obtenerBoletoPorId } from '../data/mockStorage';

const TIPO_INFO = {
    infante:   { label: 'NIÑO',     color: '#f59e0b' },
    animales:  { label: 'ANIMALES', color: '#38bdf8' },
    dinero:    { label: 'DINERO',   color: '#22c55e' },
    productos: { label: 'COMIDA',   color: '#a855f7' },
    normal:    { label: 'NORMAL',   color: '#94a3b8' },
};

const tipoDeB = (b) =>
    b?.esInfante ? 'infante' : b?.llevaAnimales ? 'animales' : b?.lleva1000 ? 'dinero' : b?.llevaProductos ? 'productos' : 'normal';

const fmt = (iso) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString('es-BO', { dateStyle: 'long', timeStyle: 'short' }); }
    catch { return iso; }
};

const BoletoPúblico = () => {
    const [params] = useSearchParams();
    const rootRef = useRef(null);

    const id      = params.get('id')      || '';
    const nombre  = params.get('nombre')  || '';
    const asiento = params.get('asiento') || '';
    const origen  = params.get('origen')  || '';
    const destino = params.get('destino') || '';
    const fecha   = params.get('fecha')   || '';
    const empresa = params.get('empresa') || '';
    const placa   = params.get('placa')   || '';
    const precio  = params.get('precio')  || '';
    const ci      = params.get('ci')      || '';
    const tipo    = params.get('tipo')    || 'normal';

    // boleto del localStorage (si está en el mismo dispositivo)
    const [boleto, setBoleto] = useState(null);
    const [boletos, setBoletos] = useState([]);

    useEffect(() => {
        if (!id) return;
        const b = obtenerBoletoPorId(id);
        if (b) {
            setBoleto(b);
            // Si hay reservaId obtener todos los boletos de la reserva
            if (b.reservaId) {
                const { obtenerBoletos } = require('../data/mockStorage');
                setBoletos(obtenerBoletos(b.reservaId));
            } else {
                setBoletos([b]);
            }
        } else {
            // Reconstruir desde URL params
            setBoleto({ id, pasajeroNombre: nombre, pasajeroCI: ci, asiento, origen, destino, fechaSalida: fecha, empresa, busPlaca: placa, precio, esInfante: tipo === 'infante', lleva1000: tipo === 'dinero', llevaAnimales: tipo === 'animales', llevaProductos: tipo === 'productos' });
            setBoletos([{ id, pasajeroNombre: nombre, pasajeroCI: ci, asiento, origen, destino, fechaSalida: fecha, empresa, busPlaca: placa, precio, esInfante: tipo === 'infante', lleva1000: tipo === 'dinero', llevaAnimales: tipo === 'animales', llevaProductos: tipo === 'productos' }]);
        }
    }, [id]); // eslint-disable-line

    const empresaNombre = boleto?.empresa || empresa || 'Terminal Hub';
    const te   = getTemaEmpresa(empresaNombre);
    const c1   = te?.c1 || '#1e3a8a';
    const c2   = te?.c2 || '#93c5fd';
    const bg   = te?.bg || '#07111f';
    const logoUrl = getLogoEmpresa(empresaNombre);

    useEffect(() => {
        if (!boleto) return;
        const ctx = gsap.context(() => {
            gsap.set('[data-bp="cemp"]', { x: -44, y: 18, scale: 0, opacity: 0 });
            gsap.set('[data-bp="csys"]', { x: 44,  scale: 0, opacity: 0 });
            const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
            tl.from('[data-bp="page"]', { y: 30, opacity: 0, duration: 0.5 })
              .to('[data-bp="cemp"]', { scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(2.2)' }, '-=0.1')
              .to('[data-bp="csys"]', { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2)' }, '+=0.2')
              .to('[data-bp="cemp"]', { x: 0, y: 0, duration: 0.55, ease: 'power3.inOut' }, '+=0.2')
              .to('[data-bp="csys"]', { x: 0,    duration: 0.55, ease: 'power3.inOut' }, '<')
              .from('[data-bp="row"]', { y: 18, opacity: 0, stagger: 0.08, duration: 0.35 }, '-=0.1');
        }, rootRef);
        return () => ctx.revert();
    }, [boleto]);

    const qrData = (b) => JSON.stringify({ id: b.id, asiento: b.asiento, nombre: b.pasajeroNombre, ci: b.pasajeroCI, origen: b.origen || origen, destino: b.destino || destino, salida: b.fechaSalida || fecha, placa: b.busPlaca || placa });

    if (!id) return (
        <div style={{ minHeight: '100vh', background: '#07111f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontFamily: 'Rajdhani, sans-serif' }}>
            QR inválido.
        </div>
    );

    return (
        <div ref={rootRef} style={{ minHeight: '100vh', background: bg, fontFamily: "'Rajdhani', sans-serif", padding: '1.5rem', boxSizing: 'border-box' }}>

            {/* Fondo radial */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
                background: `radial-gradient(ellipse 70% 50% at 0% 20%, ${c1}25 0%, transparent 60%),
                             radial-gradient(ellipse 60% 45% at 100% 80%, ${c2}18 0%, transparent 60%)` }} />

            <div data-bp="page" style={{ position: 'relative', zIndex: 1, maxWidth: 420, margin: '0 auto' }}>

                {/* Dos círculos */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '1rem' }}>
                    {/* Terminal Hub */}
                    <div data-bp="csys" style={{ width: 100, height: 100, borderRadius: '50%', flexShrink: 0, position: 'relative', zIndex: 1,
                        background: `linear-gradient(135deg, ${c1}, ${c2}, ${c1})`,
                        padding: 3, boxSizing: 'border-box',
                        boxShadow: `0 0 22px ${c1}50, 0 4px 16px rgba(0,0,0,0.4)` }}>
                        <div style={{ width: 94, height: 94, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <img src="/personal/logo_terminal.svg" alt="Terminal Hub" style={{ width: '82%', height: '82%', objectFit: 'contain' }} />
                        </div>
                    </div>
                    {/* Empresa */}
                    <div data-bp="cemp" style={{ width: 100, height: 100, borderRadius: '50%', flexShrink: 0, position: 'relative', zIndex: 2,
                        marginLeft: -24, marginBottom: 16,
                        background: `linear-gradient(135deg, ${c1}, ${c2}, ${c1})`,
                        padding: 3, boxSizing: 'border-box',
                        boxShadow: `0 0 22px ${c1}50, 0 0 8px ${c2}25, 0 4px 16px rgba(0,0,0,0.4)` }}>
                        <div style={{ width: 94, height: 94, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {logoUrl
                                ? <img src={logoUrl} alt={empresaNombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <span style={{ fontSize: '1.8rem' }}>🚌</span>}
                        </div>
                    </div>
                </div>

                {/* Empresa + subtítulo */}
                <div data-bp="row" style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                    <div style={{ fontWeight: 900, fontSize: '1.2rem', color: c2, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        {empresaNombre}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: `${c2}70`, letterSpacing: '0.18em', fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>
                        BOLETO DIGITAL · TERMINAL HUB
                    </div>
                </div>

                {/* Info viaje */}
                <div data-bp="row" style={{ background: `linear-gradient(135deg, ${c1}12, ${c2}08)`, borderRadius: 14, padding: '1rem 1.2rem', border: `1px solid ${c1}30`, marginBottom: '1.25rem' }}>
                    {/* Ruta */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.58rem', color: `${c2}70`, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>ORIGEN</div>
                            <div style={{ fontWeight: 900, fontSize: '1.1rem', color: c2, textTransform: 'uppercase' }}>{boleto?.origen || origen || '—'}</div>
                        </div>
                        <div style={{ color: `${c2}60`, fontSize: '1.2rem' }}>→</div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.58rem', color: `${c2}70`, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>DESTINO</div>
                            <div style={{ fontWeight: 900, fontSize: '1.1rem', color: c2, textTransform: 'uppercase' }}>{boleto?.destino || destino || '—'}</div>
                        </div>
                    </div>
                    {/* Detalles */}
                    {[
                        ['FECHA / HORA', fmt(boleto?.fechaSalida || fecha)],
                        ['BUS (PLACA)',  boleto?.busPlaca || placa || '—'],
                        ['EMPRESA',      empresaNombre],
                    ].map(([lbl, val]) => (
                        <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderTop: `1px solid ${c1}20` }}>
                            <span style={{ fontSize: '0.65rem', color: `${c2}65`, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{lbl}</span>
                            <span style={{ fontSize: '0.82rem', color: c2, fontWeight: 700 }}>{val}</span>
                        </div>
                    ))}
                </div>

                {/* Boletos */}
                {boletos.map((b, i) => {
                    const t = tipoDeB(b);
                    const ti = TIPO_INFO[t];
                    return (
                        <div data-bp="row" key={b.id || i} style={{ background: 'rgba(10,18,35,0.75)', backdropFilter: 'blur(12px)', borderRadius: 14, padding: '1rem', border: `1px solid ${ti.color}40`, marginBottom: '0.9rem' }}>
                            {/* Badge tipo */}
                            <div style={{ display: 'inline-block', background: ti.color, color: '#fff', fontWeight: 800, fontSize: '0.6rem', letterSpacing: '0.14em', padding: '2px 10px', borderRadius: 20, marginBottom: '0.7rem', textTransform: 'uppercase' }}>
                                {ti.label}
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                {/* QR */}
                                <div style={{ background: '#ffffff', padding: 6, borderRadius: 8, flexShrink: 0, border: `2px solid ${ti.color}` }}>
                                    <QRCodeSVG value={qrData(b)} size={90} level="M" />
                                </div>
                                {/* Info pasajero */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 900, fontSize: '0.95rem', color: c2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        {b.pasajeroNombre || nombre || '—'}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: `${c2}70`, marginTop: 2 }}>CI: {b.pasajeroCI || ci || '—'}</div>
                                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <div style={{ background: `${c1}30`, border: `1px solid ${c1}60`, borderRadius: 8, padding: '3px 10px' }}>
                                            <span style={{ fontSize: '0.6rem', color: `${c2}80`, letterSpacing: '0.1em' }}>ASIENTO </span>
                                            <span style={{ fontWeight: 900, fontSize: '1rem', color: c2 }}>{b.asiento || asiento}</span>
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: `${c2}60` }}>
                                            Bs <strong style={{ color: c2 }}>{b.precio || precio || '—'}</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                <div style={{ textAlign: 'center', marginTop: '0.5rem', paddingBottom: '2rem' }}>
                    <div style={{ fontSize: '0.62rem', color: `${c2}40`, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        Terminal Hub · Plataforma de Transporte Bolivia
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BoletoPúblico;
