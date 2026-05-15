import React, { useState, useEffect, useMemo } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

/**
 * PasarelaPago — Payment gateway modal with QR and Card options.
 * Props:
 *   - monto: total amount in Bs
 *   - onPagoConfirmado: callback when payment is confirmed
 *   - onCancelar: callback to cancel
 */
const PasarelaPago = ({ monto, onPagoConfirmado, onCancelar }) => {
    const [metodo, setMetodo] = useState(null); // 'qr' | 'tarjeta'
    const [procesando, setProcesando] = useState(false);
    const [tiempoRestante, setTiempoRestante] = useState(15 * 60);
    const [webhookStatus, setWebhookStatus] = useState('pendiente'); // pendiente | verificando | confirmado
    const [contadorWebhook, setContadorWebhook] = useState(null);

    // Fix #2: Static payment ID — generated once, QR never changes
    const pagoId = useMemo(() => 'pago-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6), []);

    // Countdown timer
    useEffect(() => {
        const timer = setInterval(() => {
            setTiempoRestante(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onCancelar();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [onCancelar]);

    // Simulated webhook polling for QR payments
    useEffect(() => {
        if (metodo !== 'qr' || webhookStatus !== 'pendiente') return;

        // Simular que el banco confirmó el pago después de 18-30 segundos
        const delay = 18000 + Math.random() * 12000;
        const wh = setTimeout(() => {
            setWebhookStatus('verificando');
            setTimeout(() => {
                setWebhookStatus('confirmado');
                onPagoConfirmado('qr');
            }, 2000);
        }, delay);

        setContadorWebhook(wh);
        return () => clearTimeout(wh);
    }, [metodo]); // eslint-disable-line

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    // Card form state
    const [cardNum, setCardNum] = useState('');
    const [cardExp, setCardExp] = useState('');
    const [cardCVV, setCardCVV] = useState('');
    const [cardNombre, setCardNombre] = useState('');

    // Fix #3: Professional card field formatters
    const handleCardNumChange = (val) => {
        const digits = val.replace(/\D/g, '').slice(0, 16);
        const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
        setCardNum(formatted);
    };
    const handleCardExpChange = (val) => {
        const digits = val.replace(/\D/g, '').slice(0, 4);
        if (digits.length >= 3) {
            setCardExp(digits.slice(0, 2) + '/' + digits.slice(2));
        } else {
            setCardExp(digits);
        }
    };
    const handleCardCVVChange = (val) => {
        setCardCVV(val.replace(/\D/g, '').slice(0, 4));
    };
    const handleCardNombreChange = (val) => {
        setCardNombre(val.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ ]/g, '').toUpperCase());
    };

    const handlePagar = () => {
        if (metodo === 'tarjeta') {
            if (!cardNum || !cardExp || !cardCVV || !cardNombre) return;
        }
        setProcesando(true);
        // Simulate payment processing (1.5s)
        setTimeout(() => {
            setProcesando(false);
            onPagoConfirmado(metodo);
        }, 1500);
    };

    const inputStyle = {
        width: '100%', boxSizing: 'border-box', background: '#0f172a',
        border: '1px solid #334155', color: '#f1f5f9', padding: '0.75rem',
        borderRadius: '8px', fontSize: '0.9rem',
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 80, padding: '1rem',
        }}>
            <div style={{
                background: '#1e293b', width: '100%', maxWidth: '440px',
                borderRadius: '16px', padding: '2rem',
                border: '1px solid #334155', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
                maxHeight: '90vh', overflowY: 'auto',
            }}>
                {/* Timer */}
                <div style={{
                    textAlign: 'center', marginBottom: '1.25rem',
                    color: tiempoRestante < 120 ? '#ef4444' : '#f59e0b',
                    fontSize: '0.8rem', fontWeight: 600,
                }}>
                    ⏱️ Tiempo para completar pago: {formatTime(tiempoRestante)}
                </div>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, color: '#f1f5f9', fontSize: '1.2rem' }}>💳 Método de Pago</h2>
                    <div style={{
                        marginTop: '0.75rem', background: '#0f172a', borderRadius: '10px',
                        padding: '0.75rem', border: '1px solid #334155',
                    }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Total a pagar</span>
                        <div style={{ color: '#10b981', fontSize: '1.6rem', fontWeight: 700 }}>Bs {monto}</div>
                    </div>
                </div>

                {/* Method Selection */}
                {!metodo && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <button onClick={() => setMetodo('qr')} style={{
                            padding: '1.2rem', background: '#0f172a', border: '1px solid #334155',
                            borderRadius: '12px', color: '#f1f5f9', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '1rem',
                        }}>
                            <span style={{ fontSize: '2rem' }}>📱</span>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 600 }}>Pago por QR</div>
                                <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Escanea con tu app bancaria</div>
                            </div>
                        </button>
                        <button onClick={() => setMetodo('tarjeta')} style={{
                            padding: '1.2rem', background: '#0f172a', border: '1px solid #334155',
                            borderRadius: '12px', color: '#f1f5f9', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '1rem',
                        }}>
                            <span style={{ fontSize: '2rem' }}>💳</span>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 600 }}>Tarjeta de Débito/Crédito</div>
                                <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Visa, Mastercard</div>
                            </div>
                        </button>
                    </div>
                )}

                {/* QR Payment */}
                {metodo === 'qr' && !procesando && (
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' }}>
                            Escanea este código QR con tu app bancaria
                        </p>
                        <div style={{
                            background: '#fff', borderRadius: '12px', padding: '1.5rem',
                            display: 'inline-block', marginBottom: '1rem',
                        }}>
                            <QRCodeCanvas
                                value={JSON.stringify({
                                    tipo: 'pago_tbb', monto, moneda: 'BOB',
                                    ref: pagoId,
                                    entidad: 'Terminal Buses Bolivia',
                                    instruccion: 'Escanea y confirma el pago en tu celular',
                                })}
                                size={180} level="M" includeMargin={true}
                            />
                        </div>

                        {/* Webhook status */}
                        {webhookStatus === 'pendiente' && (
                            <div style={{ background: '#0f172a', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.2s infinite' }} />
                                    Esperando confirmación del banco...
                                </div>
                                <div style={{ color: '#475569', fontSize: '0.7rem', marginTop: '0.3rem' }}>Ref: {pagoId}</div>
                            </div>
                        )}
                        {webhookStatus === 'verificando' && (
                            <div style={{ background: 'rgba(59,130,246,0.1)', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#93c5fd', border: '1px solid #1e40af' }}>
                                🔄 Verificando pago con el banco...
                            </div>
                        )}

                        <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                            Escanea con tu app bancaria. La pantalla se actualizará automáticamente.
                        </p>
                        <button onClick={handlePagar} style={{
                            width: '100%', padding: '0.9rem', background: '#10b981',
                            color: 'white', border: 'none', borderRadius: '10px',
                            fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem', marginTop: '0.25rem',
                        }}>
                            ✅ Ya pagué — Confirmar manualmente
                        </button>
                    </div>
                )}

                {/* Card Payment */}
                {metodo === 'tarjeta' && !procesando && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                                Nombre en la tarjeta
                            </label>
                            <input
                                type="text" value={cardNombre}
                                onChange={e => handleCardNombreChange(e.target.value)}
                                placeholder="JUAN CARLOS PEREZ"
                                autoComplete="cc-name" style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                                Número de tarjeta
                            </label>
                            <input
                                type="text" value={cardNum}
                                onChange={e => handleCardNumChange(e.target.value)}
                                placeholder="1234 5678 9012 3456"
                                inputMode="numeric" maxLength={19} style={inputStyle}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                                    Vencimiento
                                </label>
                                <input
                                    type="text" value={cardExp}
                                    onChange={e => handleCardExpChange(e.target.value)}
                                    placeholder="MM/AA" maxLength={5}
                                    inputMode="numeric" style={inputStyle}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                                    CVV
                                </label>
                                <input
                                    type="password" value={cardCVV}
                                    onChange={e => handleCardCVVChange(e.target.value)}
                                    placeholder="•••" maxLength={4}
                                    inputMode="numeric" style={inputStyle}
                                />
                            </div>
                        </div>
                        <button onClick={handlePagar}
                            disabled={!cardNum || !cardExp || !cardCVV || !cardNombre}
                            style={{
                                width: '100%', padding: '0.9rem', marginTop: '0.5rem',
                                background: (cardNum && cardExp && cardCVV && cardNombre) ? '#10b981' : '#475569',
                                color: 'white', border: 'none', borderRadius: '10px',
                                fontWeight: 600, cursor: (cardNum && cardExp && cardCVV && cardNombre) ? 'pointer' : 'not-allowed',
                                fontSize: '0.95rem',
                            }}>
                            💳 Pagar Bs {monto}
                        </button>
                    </div>
                )}

                {/* Processing */}
                {procesando && (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem', animation: 'pulse 1.5s infinite' }}>💳</div>
                        <p style={{ color: '#f1f5f9', fontWeight: 600 }}>Procesando pago...</p>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No cierre esta ventana</p>
                    </div>
                )}

                {/* Cancel */}
                {!procesando && (
                    <button onClick={metodo ? () => setMetodo(null) : onCancelar}
                        style={{
                            width: '100%', padding: '0.7rem', marginTop: '1rem',
                            background: 'transparent', border: '1px solid #475569',
                            color: '#94a3b8', borderRadius: '10px', cursor: 'pointer',
                            fontSize: '0.85rem',
                        }}>
                        {metodo ? '← Cambiar método' : 'Cancelar'}
                    </button>
                )}
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.15); opacity: 0.7; }
                }
            `}</style>
        </div>
    );
};

export default PasarelaPago;
