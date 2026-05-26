/**
 * PagoQRMovil — Página simulada de pago móvil vía QR.
 * El cliente escanea el QR desde su celular y llega aquí.
 * Muestra los datos del viaje y botones Pagar / Cancelar.
 * Escribe el resultado en localStorage → el escritorio lo detecta por polling.
 *
 * gemini: fix — el celular no tiene acceso al localStorage de la PC.
 * Si el token llega por URL, se considera válido (los datos del viaje
 * también vienen en la URL). Se guarda el estado en el localStorage
 * del celular Y se notifica al backend para que el escritorio se entere.
 */
import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { actualizarEstadoQR } from '../../data/mockStorage';
import { API_BASE } from '../../config';
import gsap from 'gsap';
import { getTemaEmpresa } from '../../componentes/TicketCard';
import { getEmpresaLogo } from '../../utils/assets';

const PagoQRMovil = () => {
    const [searchParams] = useSearchParams();
    const rootRef = useRef(null);

    const token = searchParams.get('token') || '';
    const [estado, setEstado] = useState('pendiente'); // pendiente | pagado | cancelado | expirado
    const [procesando, setProcesando] = useState(false);

    const [viajeInfo, setViajeInfo] = useState({
        origen: searchParams.get('origen') || '—',
        destino: searchParams.get('destino') || '—',
        fecha: searchParams.get('fecha') || '',
        monto: searchParams.get('monto') || '0',
        empresa: searchParams.get('empresa') || ''
    });

    const buscarViajeReal = (orig, dest, fec) => {
        if (!orig || !dest) return;
        const datePart = fec ? fec.split('T')[0] : '';
        fetch(`${API_BASE}/viajes?origen=${encodeURIComponent(orig)}&destino=${encodeURIComponent(dest)}` + (datePart ? `&fecha=${datePart}` : ''))
            .then(r => r.ok ? r.json() : [])
            .then(viajes => {
                const viajeCoincidente = viajes.find(v => v.fecha_salida === fec) || viajes[0];
                if (viajeCoincidente && viajeCoincidente.sucursal) {
                    setViajeInfo(prev => ({
                        ...prev,
                        empresa: viajeCoincidente.sucursal.nombre
                    }));
                }
            })
            .catch(() => {});
    };

    useEffect(() => {
        // gemini: si no hay token en la URL, sí es inválido
        if (!token) { setEstado('expirado'); return; }

        fetch(`${API_BASE}/qr/${token}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data) {
                    if (data.estado && data.estado !== 'pendiente') setEstado(data.estado);
                    
                    const newOrig = data.origen || viajeInfo.origen;
                    const newDest = data.destino || viajeInfo.destino;
                    const newFech = data.fecha || viajeInfo.fecha;
                    const newMont = data.monto || viajeInfo.monto;

                    setViajeInfo(prev => ({
                        ...prev,
                        origen: newOrig,
                        destino: newDest,
                        fecha: newFech,
                        monto: newMont
                    }));

                    buscarViajeReal(newOrig, newDest, newFech);
                }
            })
            .catch(() => {
                // Si falla el backend, intentamos buscar con lo que haya en URL
                buscarViajeReal(viajeInfo.origen, viajeInfo.destino, viajeInfo.fecha);
            });
    }, [token]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, []);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-m="card"]', { y: 30, opacity: 0, duration: 0.6, ease: 'power3.out' });
            gsap.from('[data-m="row"]', { y: 15, opacity: 0, stagger: 0.08, duration: 0.4, ease: 'power2.out', delay: 0.2 });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    const handlePagar = () => {
        setProcesando(true);
        // Notificar backend
        fetch(`${API_BASE}/qr/${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                estado: 'pagado', 
                monto: viajeInfo.monto, 
                origen: viajeInfo.origen, 
                destino: viajeInfo.destino 
            }),
        }).catch(() => {});
        // Guardar localmente por si acaso
        actualizarEstadoQR(token, 'pagado');
        setTimeout(() => {
            setEstado('pagado');
            setProcesando(false);
        }, 1200);
    };

    const handleCancelar = () => {
        fetch(`${API_BASE}/qr/${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: 'cancelado' }),
        }).catch(() => {});
        actualizarEstadoQR(token, 'cancelado');
        setEstado('cancelado');
    };

    const formatFecha = (iso) => {
        if (!iso) return '';
        try { return new Date(iso).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' }); }
        catch { return iso; }
    };

    const te = getTemaEmpresa(viajeInfo.empresa);
    const logoUrl = getEmpresaLogo(viajeInfo.empresa);

    const pageBg = te
        ? `linear-gradient(160deg, ${te.bg || '#07111f'} 0%, #030811 100%)`
        : 'linear-gradient(160deg, #0b1628 0%, #07111f 100%)';

    const accentColor = te ? te.c1 : '#3b82f6';
    const accentC2 = te ? te.c2 || '#ffffff' : '#ffffff';

    return (
        <div ref={rootRef} style={{
            height: '100vh', background: pageBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Rajdhani', sans-serif", padding: '1.5rem',
            overflow: 'hidden', boxSizing: 'border-box',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
        }}>
            <div data-m="card" style={{
                background: '#0d1a2e', borderRadius: '20px', padding: '2rem',
                maxWidth: 380, width: '100%',
                border: `1px solid ${estado === 'pagado' ? '#10b981' : estado === 'cancelado' ? '#ef4444' : (te ? te.c1 : '#1e3a8a')}50`,
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}>
                {/* Header */}
                <div data-m="row" style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                    {logoUrl ? (
                        <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                            <img src={logoUrl} alt={viajeInfo.empresa} style={{ height: '100%', objectFit: 'contain' }} />
                        </div>
                    ) : (
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚌</div>
                    )}
                    
                    <div style={{ fontWeight: 800, fontSize: '1.3rem', color: '#f1f5f9', letterSpacing: '0.08em' }}>
                        {viajeInfo.empresa ? `Terminal Hub • ${viajeInfo.empresa}` : 'Terminal Hub'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.25rem', fontWeight: 600 }}>Pago seguro vía QR</div>
                </div>

                {estado === 'expirado' && (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏱️</div>
                        <div style={{ color: '#fca5a5', fontWeight: 700, fontSize: '1.1rem' }}>Enlace expirado</div>
                        <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.5rem' }}>Este código QR ya no es válido. Solicita uno nuevo.</div>
                    </div>
                )}

                {estado === 'pagado' && (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>✅</div>
                        <div style={{ color: '#6ee7b7', fontWeight: 800, fontSize: '1.2rem' }}>¡Pago realizado!</div>
                        <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.5rem' }}>Tu reserva ha sido confirmada. Revisa tu pantalla principal.</div>
                    </div>
                )}

                {estado === 'cancelado' && (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
                        <div style={{ color: '#fca5a5', fontWeight: 700, fontSize: '1.1rem' }}>Pago cancelado</div>
                        <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.5rem' }}>Has cancelado el pago. Los asientos serán liberados.</div>
                    </div>
                )}

                {estado === 'pendiente' && !token && (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: '#fca5a5' }}>
                        Token inválido o expirado.
                    </div>
                )}

                {estado === 'pendiente' && token && (
                    <>
                        {/* Trip info */}
                        <div data-m="row" style={{
                            background: '#07111f', borderRadius: '12px', padding: '1.25rem',
                            marginBottom: '1.5rem', border: `1px solid ${te ? te.c1 : '#1e293b'}30`,
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '1.2rem' }}>{viajeInfo.origen}</span>
                                <span style={{ color: accentColor, fontSize: '1.4rem' }}>→</span>
                                <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '1.2rem' }}>{viajeInfo.destino}</span>
                            </div>
                            {viajeInfo.fecha && (
                                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 600 }}>
                                    📅 {formatFecha(viajeInfo.fecha)}
                                </div>
                            )}
                            <div style={{ borderTop: '1px solid #1e293b', paddingTop: '0.75rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600 }}>Total a pagar</span>
                                <span style={{ fontWeight: 800, fontSize: '1.6rem', color: accentColor }}>Bs {viajeInfo.monto}</span>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div data-m="row" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <button
                                onClick={handlePagar}
                                disabled={procesando}
                                style={{
                                    padding: '1rem', background: procesando ? '#065f46' : accentColor,
                                    color: accentC2, border: 'none', borderRadius: '12px',
                                    fontWeight: 800, fontSize: '1.1rem', cursor: procesando ? 'wait' : 'pointer',
                                    boxShadow: `0 4px 20px ${accentColor}40`,
                                    transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    fontFamily: "'Rajdhani', sans-serif",
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {procesando ? (
                                    <>
                                        <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                                        Procesando...
                                    </>
                                ) : '💳 Confirmar Pago'}
                            </button>

                            <button
                                onClick={handleCancelar}
                                style={{
                                    padding: '0.85rem', background: 'transparent',
                                    color: '#ef4444', border: '1px solid #ef444440',
                                    borderRadius: '12px', fontWeight: 700, fontSize: '1rem',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                    fontFamily: "'Rajdhani', sans-serif",
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                            >
                                Cancelar
                            </button>
                        </div>

                        <div data-m="row" style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.8rem', color: accentColor, fontWeight: 600 }}>
                            🔒 Conexión segura · Terminal Hub
                        </div>
                    </>
                )}
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default PagoQRMovil;
