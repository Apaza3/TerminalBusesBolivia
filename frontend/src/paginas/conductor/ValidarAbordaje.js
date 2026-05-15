/**
 * ValidarAbordaje — Escáner QR de abordaje para el conductor.
 * El conductor ingresa el ID del boleto (escaneado o manual).
 * El sistema valida y marca al pasajero como "presente" en el manifiesto.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import { validarBoleto, marcarAbordado, obtenerBoletosViaje, VIAJES_CONDUCTOR_MOCK, obtenerEstadoViaje } from '../../data/mockStorage';
import gsap from 'gsap';

const ValidarAbordaje = () => {
    const navigate = useNavigate();
    const { perfil, logout } = useAuth();
    const rootRef = useRef(null);
    const inputRef = useRef(null);

    const deptNombre = perfil?.departamento || 'La Paz';
    const tema = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];

    const [inputQR, setInputQR] = useState('');
    const [resultado, setResultado] = useState(null); // { tipo: 'ok'|'error'|'yaAbordado', boleto }
    const [viajeSeleccionado, setViajeSeleccionado] = useState('');
    const [manifiesto, setManifiesto] = useState([]);

    const cargarManifiesto = useCallback(() => {
        if (!viajeSeleccionado) return;
        const boletos = obtenerBoletosViaje(viajeSeleccionado);
        setManifiesto(boletos);
    }, [viajeSeleccionado]);

    useEffect(() => {
        cargarManifiesto();
        const iv = setInterval(cargarManifiesto, 5000);
        return () => clearInterval(iv);
    }, [cargarManifiesto]);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-v="header"]', { y: -25, opacity: 0, duration: 0.5, ease: 'power3.out' });
            gsap.from('[data-v="scanner"]', { y: 20, opacity: 0, duration: 0.5, ease: 'power3.out', delay: 0.1 });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    const handleValidar = (e) => {
        e?.preventDefault();
        const id = inputQR.trim().toUpperCase();
        if (!id) return;

        const boleto = validarBoleto(id);
        if (!boleto) {
            setResultado({ tipo: 'error', mensaje: 'Boleto no encontrado. Código inválido.' });
            gsap.from('[data-v="result"]', { scale: 0.95, opacity: 0, duration: 0.3, ease: 'back.out(1.7)' });
            return;
        }

        if (boleto.abordado) {
            setResultado({ tipo: 'yaAbordado', boleto });
            gsap.from('[data-v="result"]', { scale: 0.95, opacity: 0, duration: 0.3, ease: 'back.out(1.7)' });
            return;
        }

        const res = marcarAbordado(id);
        if (res.exito) {
            setResultado({ tipo: 'ok', boleto: res.boleto });
            cargarManifiesto();
            gsap.from('[data-v="result"]', { scale: 0.9, opacity: 0, duration: 0.4, ease: 'back.out(2)' });
            // Auto-clear input
            setInputQR('');
            inputRef.current?.focus();
        }
    };

    const handleLogout = async () => { await logout(); navigate('/'); };

    const viajes = VIAJES_CONDUCTOR_MOCK.map(v => ({
        ...v,
        estado: obtenerEstadoViaje(v.id),
    }));

    const presentesCount = manifiesto.filter(b => b.abordado).length;
    const totalCount = manifiesto.length;

    return (
        <div ref={rootRef} style={{ background: '#07111f', minHeight: '100vh', color: '#dde5f0', fontFamily: "'Inter', system-ui, sans-serif" }}>

            {/* Header */}
            <header data-v="header" style={{
                background: `linear-gradient(135deg, ${tema.bg} 0%, ${tema.colorSecundario}60 100%)`,
                borderBottom: `2px solid ${tema.color}50`,
                padding: '0.9rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                position: 'sticky', top: 0, zIndex: 20,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => navigate('/conductor/panel')} style={{
                        background: `${tema.color}15`, border: `1px solid ${tema.color}40`,
                        color: tema.acento, padding: '0.4rem 0.8rem', borderRadius: '8px',
                        cursor: 'pointer', fontSize: '0.82rem',
                    }}>← Panel</button>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f1f5f9' }}>Validar Abordaje</div>
                        <div style={{ fontSize: '0.72rem', color: tema.acento }}>{deptNombre} · {perfil?.nombre_completo}</div>
                    </div>
                </div>
                <button onClick={handleLogout} style={{
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#94a3b8', padding: '0.4rem 0.9rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem',
                }}>Salir</button>
            </header>

            <div style={{ maxWidth: 800, margin: '2rem auto', padding: '0 1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                {/* Left: Scanner */}
                <div data-v="scanner">
                    {/* Viaje selector */}
                    <div style={{ background: '#0d1a2e', borderRadius: '12px', padding: '1.25rem', border: `1px solid ${tema.color}20`, marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Viaje activo</div>
                        <select value={viajeSeleccionado} onChange={e => setViajeSeleccionado(e.target.value)} style={{
                            width: '100%', background: '#07111f', border: `1px solid ${tema.color}30`,
                            color: '#f1f5f9', borderRadius: '8px', padding: '0.6rem 0.9rem', fontSize: '0.85rem', outline: 'none',
                        }}>
                            <option value="" style={{ background: '#07111f' }}>Seleccionar viaje...</option>
                            {viajes.filter(v => v.estado === 'en_ruta' || v.estado === 'programado').map(v => (
                                <option key={v.id} value={v.id} style={{ background: '#07111f' }}>
                                    {v.origen} → {v.destino} · {v.busPlaca}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Scanner input */}
                    <div style={{ background: '#0d1a2e', borderRadius: '14px', padding: '1.5rem', border: `1px solid ${tema.color}20` }}>
                        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📷</div>
                            <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem' }}>Escanear Boleto</div>
                            <div style={{ color: '#475569', fontSize: '0.78rem', marginTop: '0.25rem' }}>Escanea el QR o ingresa el ID del boleto</div>
                        </div>

                        <form onSubmit={handleValidar} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="ID del boleto (ej: TBB-ABC123-XY456)"
                                value={inputQR}
                                onChange={e => setInputQR(e.target.value.toUpperCase())}
                                autoFocus
                                style={{
                                    background: '#07111f', border: `2px solid ${tema.color}40`,
                                    color: '#f1f5f9', borderRadius: '10px', padding: '0.85rem 1rem',
                                    fontSize: '0.88rem', outline: 'none', letterSpacing: '0.05em',
                                    fontFamily: 'monospace', transition: 'border-color 0.2s',
                                }}
                                onFocus={e => e.target.style.borderColor = tema.color}
                                onBlur={e => e.target.style.borderColor = `${tema.color}40`}
                            />
                            <button type="submit" disabled={!inputQR.trim()} style={{
                                padding: '0.85rem', background: inputQR.trim() ? tema.color : '#1e293b',
                                color: inputQR.trim() ? '#fff' : '#475569', border: 'none',
                                borderRadius: '10px', fontWeight: 700, cursor: inputQR.trim() ? 'pointer' : 'not-allowed',
                                fontSize: '0.9rem', transition: 'all 0.2s',
                                boxShadow: inputQR.trim() ? `0 4px 16px ${tema.color}50` : 'none',
                            }}>
                                ✓ Validar Boleto
                            </button>
                        </form>

                        {/* Result */}
                        {resultado && (
                            <div data-v="result" style={{
                                marginTop: '1.25rem', borderRadius: '10px', padding: '1rem',
                                background: resultado.tipo === 'ok' ? 'rgba(16,185,129,0.1)' : resultado.tipo === 'yaAbordado' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                                border: `1px solid ${resultado.tipo === 'ok' ? '#065f46' : resultado.tipo === 'yaAbordado' ? '#78350f' : '#7f1d1d'}`,
                            }}>
                                <div style={{
                                    fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem',
                                    color: resultado.tipo === 'ok' ? '#6ee7b7' : resultado.tipo === 'yaAbordado' ? '#fde68a' : '#fca5a5',
                                }}>
                                    {resultado.tipo === 'ok' && '✅ Abordaje válido'}
                                    {resultado.tipo === 'yaAbordado' && '⚠️ Ya abordó'}
                                    {resultado.tipo === 'error' && '❌ ' + resultado.mensaje}
                                </div>
                                {resultado.boleto && (
                                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.7 }}>
                                        <div><strong style={{ color: '#f1f5f9' }}>{resultado.boleto.pasajeroNombre}</strong></div>
                                        <div>CI: {resultado.boleto.pasajeroCI}</div>
                                        <div>Asiento: <strong style={{ color: tema.acento }}>{resultado.boleto.asiento}</strong></div>
                                        <div>{resultado.boleto.origen} → {resultado.boleto.destino}</div>
                                        {resultado.tipo === 'yaAbordado' && resultado.boleto.horaAbordaje && (
                                            <div style={{ color: '#fde68a', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                                Abordó: {new Date(resultado.boleto.horaAbordaje).toLocaleTimeString('es-BO')}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Manifiesto */}
                <div>
                    <div style={{ background: '#0d1a2e', borderRadius: '14px', border: `1px solid ${tema.color}20`, overflow: 'hidden', height: 'fit-content' }}>
                        <div style={{ padding: '1rem 1.25rem', borderBottom: `1px solid ${tema.color}15`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.92rem' }}>Manifiesto</div>
                            {viajeSeleccionado && (
                                <div style={{ fontSize: '0.78rem' }}>
                                    <span style={{ color: '#10b981', fontWeight: 700 }}>{presentesCount}</span>
                                    <span style={{ color: '#475569' }}>/{totalCount} presentes</span>
                                </div>
                            )}
                        </div>

                        {!viajeSeleccionado ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#475569', fontSize: '0.85rem' }}>
                                Selecciona un viaje para ver el manifiesto
                            </div>
                        ) : manifiesto.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#475569', fontSize: '0.85rem' }}>
                                Sin boletos registrados para este viaje
                            </div>
                        ) : (
                            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                                {/* Progress bar */}
                                <div style={{ padding: '0.75rem 1.25rem 0', background: '#07111f' }}>
                                    <div style={{ height: 6, background: '#1e293b', borderRadius: '999px', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%', width: `${totalCount > 0 ? (presentesCount / totalCount) * 100 : 0}%`,
                                            background: tema.color, borderRadius: '999px',
                                            transition: 'width 0.5s ease',
                                        }} />
                                    </div>
                                </div>

                                {manifiesto.map(b => (
                                    <div key={b.id} style={{
                                        padding: '0.75rem 1.25rem',
                                        background: b.abordado ? 'rgba(16,185,129,0.06)' : 'transparent',
                                        borderBottom: '1px solid #07111f',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        transition: 'background 0.3s',
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.85rem' }}>{b.pasajeroNombre}</div>
                                            <div style={{ color: '#64748b', fontSize: '0.72rem' }}>
                                                CI: {b.pasajeroCI} · Asiento: <span style={{ color: tema.acento }}>{b.asiento}</span>
                                            </div>
                                        </div>
                                        <span style={{
                                            padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700,
                                            background: b.abordado ? '#065f4625' : '#1e293b',
                                            color: b.abordado ? '#6ee7b7' : '#475569',
                                            border: `1px solid ${b.abordado ? '#065f46' : '#334155'}`,
                                        }}>
                                            {b.abordado ? '✓ Presente' : 'Pendiente'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ValidarAbordaje;
