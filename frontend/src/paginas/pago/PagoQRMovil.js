/**
 * PagoQRMovil — Página simulada de pago móvil vía QR.
 * El cliente escanea el QR desde su celular y llega aquí.
 * Muestra los datos del viaje y botones Pagar / Cancelar.
 * Escribe el resultado en localStorage → el escritorio lo detecta por polling.
 */
import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { actualizarEstadoQR, obtenerEstadoQR } from '../../data/mockStorage';
import gsap from 'gsap';

const PagoQRMovil = () => {
    const [searchParams] = useSearchParams();
    const rootRef = useRef(null);

    const token  = searchParams.get('token')  || '';
    const monto  = searchParams.get('monto')  || '0';
    const origen = searchParams.get('origen') || '—';
    const destino= searchParams.get('destino')|| '—';
    const fecha  = searchParams.get('fecha')  || '';

    const [estado, setEstado] = useState('pendiente'); // pendiente | pagado | cancelado | expirado
    const [procesando, setProcesando] = useState(false);

    useEffect(() => {
        if (!token) return;
        const qr = obtenerEstadoQR(token);
        if (!qr) { setEstado('expirado'); return; }
        if (qr.estado !== 'pendiente') setEstado(qr.estado);
    }, [token]);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-m="card"]', { y: 30, opacity: 0, duration: 0.6, ease: 'power3.out' });
            gsap.from('[data-m="row"]', { y: 15, opacity: 0, stagger: 0.08, duration: 0.4, ease: 'power2.out', delay: 0.2 });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    const handlePagar = () => {
        setProcesando(true);
        setTimeout(() => {
            actualizarEstadoQR(token, 'pagado');
            setEstado('pagado');
            setProcesando(false);
        }, 1200);
    };

    const handleCancelar = () => {
        actualizarEstadoQR(token, 'cancelado');
        setEstado('cancelado');
    };

    const formatFecha = (iso) => {
        if (!iso) return '';
        try { return new Date(iso).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' }); }
        catch { return iso; }
    };

    return (
        <div ref={rootRef} style={{
            minHeight: '100vh', background: 'linear-gradient(160deg, #0b1628 0%, #07111f 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Inter', system-ui, sans-serif", padding: '1.5rem',
        }}>
            <div data-m="card" style={{
                background: '#0d1a2e', borderRadius: '20px', padding: '2rem',
                maxWidth: 380, width: '100%',
                border: `1px solid ${estado === 'pagado' ? '#10b981' : estado === 'cancelado' ? '#ef4444' : '#1e3a8a'}50`,
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}>
                {/* Header */}
                <div data-m="row" style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚌</div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f1f5f9' }}>Terminal Buses Bolivia</div>
                    <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.25rem' }}>Pago seguro vía QR</div>
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
                            marginBottom: '1.5rem', border: '1px solid #1e293b',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '1.05rem' }}>{origen}</span>
                                <span style={{ color: '#3b82f6', fontSize: '1.2rem' }}>→</span>
                                <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '1.05rem' }}>{destino}</span>
                            </div>
                            {fecha && (
                                <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.5rem' }}>
                                    📅 {formatFecha(fecha)}
                                </div>
                            )}
                            <div style={{ borderTop: '1px solid #1e293b', paddingTop: '0.75rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Total a pagar</span>
                                <span style={{ fontWeight: 800, fontSize: '1.5rem', color: '#10b981' }}>Bs {monto}</span>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div data-m="row" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <button
                                onClick={handlePagar}
                                disabled={procesando}
                                style={{
                                    padding: '1rem', background: procesando ? '#065f46' : '#10b981',
                                    color: '#fff', border: 'none', borderRadius: '12px',
                                    fontWeight: 800, fontSize: '1rem', cursor: procesando ? 'wait' : 'pointer',
                                    boxShadow: '0 4px 20px rgba(16,185,129,0.4)',
                                    transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
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
                                    borderRadius: '12px', fontWeight: 600, fontSize: '0.9rem',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                            >
                                Cancelar
                            </button>
                        </div>

                        <div data-m="row" style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.7rem', color: '#334155' }}>
                            🔒 Conexión segura · Terminal Buses Bolivia
                        </div>
                    </>
                )}
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default PagoQRMovil;
