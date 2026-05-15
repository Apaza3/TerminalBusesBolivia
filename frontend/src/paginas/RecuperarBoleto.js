import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000';

const ESTADO_COLOR = {
    confirmada:  { label: 'Confirmada',  color: '#16a34a', bg: 'rgba(22,163,74,0.1)'  },
    pendiente:   { label: 'Pendiente',   color: '#d97706', bg: 'rgba(217,119,6,0.1)'  },
    cancelada:   { label: 'Cancelada',   color: '#dc2626', bg: 'rgba(220,38,38,0.1)'  },
    completada:  { label: 'Completada',  color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
};

const RecuperarBoleto = () => {
    const [ci,       setCi]       = useState('');
    const [fecha,    setFecha]    = useState('');
    const [buscando, setBuscando] = useState(false);
    const [buscado,  setBuscado]  = useState(false);
    const [boletos,  setBoletos]  = useState([]);
    const rootRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-r="header"]', { y: -20, opacity: 0, duration: 0.55, ease: 'power3.out' });
            gsap.from('[data-r="form"]',   { y: 24, opacity: 0, duration: 0.6, ease: 'power3.out', delay: 0.15 });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    useEffect(() => {
        if (boletos.length > 0) {
            const ctx = gsap.context(() => {
                gsap.from('[data-r="boleto-card"]', {
                    y: 20, opacity: 0, duration: 0.4,
                    stagger: 0.08, ease: 'power3.out',
                });
            }, rootRef);
            return () => ctx.revert();
        }
    }, [boletos]);

    const buscarDesdeLocalStorage = (ciQuery, fechaQuery) => {
        const reservas = JSON.parse(localStorage.getItem('tbb_reservas') || '[]');
        const boletos  = JSON.parse(localStorage.getItem('tbb_boletos')  || '[]');

        const reservasFiltradas = reservas.filter(r => {
            const matchCI   = r.pasajeroCI && r.pasajeroCI.toString().includes(ciQuery);
            const matchFecha = !fechaQuery || (r.asientos && r.viajeId);
            return matchCI && matchFecha;
        });

        const boletosFiltrados = boletos.filter(b => {
            const matchCI    = b.ci_pasajero && b.ci_pasajero.toString().includes(ciQuery);
            const matchFecha = !fechaQuery || (b.fecha_viaje && b.fecha_viaje.startsWith(fechaQuery));
            return matchCI && matchFecha;
        });

        const fromReservas = reservasFiltradas.map(r => ({
            id:              r.id || `res_${Date.now()}`,
            tipo:            'reserva',
            pasajero:        r.pasajeroNombre || 'Pasajero',
            ci:              r.pasajeroCI,
            origen:          r.origen  || '—',
            destino:         r.destino || '—',
            fecha_viaje:     r.fechaViaje || r.createdAt || '—',
            asientos:        (r.asientos || []).join(', '),
            estado:          r.estado || 'confirmada',
            precio_total:    r.montoTotal || 0,
            qr_token:        r.qrCode || null,
        }));

        const fromBoletos = boletosFiltrados.map(b => ({
            id:              b.id,
            tipo:            'boleto',
            pasajero:        b.nombre_pasajero || 'Pasajero',
            ci:              b.ci_pasajero,
            origen:          b.origen  || '—',
            destino:         b.destino || '—',
            fecha_viaje:     b.fecha_viaje || '—',
            asientos:        b.asiento || '—',
            estado:          b.estado || 'confirmada',
            precio_total:    b.precio_individual || 0,
            qr_token:        b.qr_token || null,
        }));

        return [...fromReservas, ...fromBoletos];
    };

    const handleBuscar = async (e) => {
        e.preventDefault();
        if (!ci.trim()) return;
        setBuscando(true);
        setBuscado(false);

        try {
            const resp = await fetch(
                `${API_BASE}/api/reservas/por-ci?ci=${encodeURIComponent(ci.trim())}${fecha ? `&fecha=${fecha}` : ''}`,
                { headers: { 'Content-Type': 'application/json' } }
            );
            if (!resp.ok) throw new Error('Sin conexión');
            const data = await resp.json();
            setBoletos(data || []);
        } catch {
            // Fallback: leer desde localStorage
            const local = buscarDesdeLocalStorage(ci.trim(), fecha);
            setBoletos(local);
        } finally {
            setBuscando(false);
            setBuscado(true);
        }
    };

    const descargarQR = (boleto) => {
        if (!boleto.qr_token) return;
        const contenido = [
            '============================',
            '   TERMINAL BUSES BOLIVIA',
            '============================',
            `Pasajero: ${boleto.pasajero}`,
            `CI:       ${boleto.ci}`,
            `Ruta:     ${boleto.origen} → ${boleto.destino}`,
            `Asientos: ${boleto.asientos}`,
            `Fecha:    ${boleto.fecha_viaje}`,
            `Estado:   ${boleto.estado.toUpperCase()}`,
            `QR Token: ${boleto.qr_token}`,
            `Total:    Bs ${parseFloat(boleto.precio_total || 0).toFixed(2)}`,
            '============================',
        ].join('\n');
        const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `boleto_${boleto.id?.slice(0, 8) || 'tbb'}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div
            ref={rootRef}
            style={{
                background: '#07111f', minHeight: '100vh', color: '#dde5f0',
                fontFamily: "'Inter', system-ui, sans-serif",
                padding: 'clamp(1.5rem, 4vw, 2.5rem) clamp(1rem, 5vw, 2rem)',
            }}
        >
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
                {/* Header */}
                <div data-r="header" style={{ marginBottom: '2.5rem' }}>
                    <Link to="/" style={{
                        fontSize: '0.78rem', color: '#4d6a87', textDecoration: 'none',
                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        marginBottom: '1.25rem',
                    }}>
                        ← Inicio
                    </Link>
                    <h1 style={{
                        fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800,
                        letterSpacing: '-0.025em', color: '#dde5f0', marginBottom: '0.4rem',
                    }}>
                        Recuperar boleto
                    </h1>
                    <p style={{ color: '#4d6a87', fontSize: '0.88rem' }}>
                        Busca tus tickets por CI y fecha de viaje. No necesitas iniciar sesión.
                    </p>
                </div>

                {/* Search form */}
                <div
                    data-r="form"
                    style={{
                        background: '#0a1726', border: '1px solid #1a2d42',
                        borderRadius: 14, padding: '1.75rem',
                        marginBottom: '2rem',
                    }}
                >
                    <form onSubmit={handleBuscar} noValidate>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '1rem', marginBottom: '1.25rem',
                        }}>
                            <div>
                                <label style={{
                                    display: 'block', fontSize: '0.73rem', fontWeight: 600,
                                    color: '#4d6a87', letterSpacing: '0.1em',
                                    textTransform: 'uppercase', marginBottom: '0.5rem',
                                }}>
                                    Carnet de Identidad <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <input
                                    type="text" value={ci}
                                    onChange={e => setCi(e.target.value)}
                                    placeholder="Ej. 1234567"
                                    required
                                    style={{
                                        width: '100%', boxSizing: 'border-box',
                                        background: '#07111f', border: '1px solid #1a2d42',
                                        color: '#dde5f0', padding: '0.75rem 0.9rem',
                                        borderRadius: 8, fontSize: '0.9rem', outline: 'none',
                                        transition: 'border-color 0.2s',
                                    }}
                                    onFocus={e => e.target.style.borderColor = '#2563eb'}
                                    onBlur={e => e.target.style.borderColor = '#1a2d42'}
                                />
                            </div>
                            <div>
                                <label style={{
                                    display: 'block', fontSize: '0.73rem', fontWeight: 600,
                                    color: '#4d6a87', letterSpacing: '0.1em',
                                    textTransform: 'uppercase', marginBottom: '0.5rem',
                                }}>
                                    Fecha de viaje (opcional)
                                </label>
                                <input
                                    type="date" value={fecha}
                                    onChange={e => setFecha(e.target.value)}
                                    style={{
                                        width: '100%', boxSizing: 'border-box',
                                        background: '#07111f', border: '1px solid #1a2d42',
                                        color: fecha ? '#dde5f0' : '#4d6a87',
                                        padding: '0.75rem 0.9rem',
                                        borderRadius: 8, fontSize: '0.9rem', outline: 'none',
                                        transition: 'border-color 0.2s', colorScheme: 'dark',
                                    }}
                                    onFocus={e => e.target.style.borderColor = '#2563eb'}
                                    onBlur={e => e.target.style.borderColor = '#1a2d42'}
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={buscando || !ci.trim()}
                            style={{
                                padding: '0.8rem 2rem',
                                background: buscando || !ci.trim() ? '#1a2d42' : '#2563eb',
                                border: 'none',
                                color: buscando || !ci.trim() ? '#4d6a87' : '#fff',
                                borderRadius: 9, fontWeight: 700, fontSize: '0.9rem',
                                cursor: buscando || !ci.trim() ? 'not-allowed' : 'pointer',
                                transition: 'background 0.2s',
                                letterSpacing: '0.01em',
                            }}
                            onMouseEnter={e => { if (!buscando && ci.trim()) e.currentTarget.style.background = '#1d4ed8'; }}
                            onMouseLeave={e => { if (!buscando && ci.trim()) e.currentTarget.style.background = '#2563eb'; }}
                        >
                            {buscando ? 'Buscando...' : 'Buscar boletos'}
                        </button>
                    </form>
                </div>

                {/* Results */}
                {buscado && (
                    <div>
                        <p style={{
                            fontSize: '0.78rem', color: '#4d6a87', marginBottom: '1rem',
                            letterSpacing: '0.05em',
                        }}>
                            {boletos.length === 0
                                ? 'No se encontraron boletos para ese CI.'
                                : `${boletos.length} boleto${boletos.length !== 1 ? 's' : ''} encontrado${boletos.length !== 1 ? 's' : ''}`
                            }
                        </p>

                        {boletos.length === 0 && (
                            <div style={{
                                padding: '2.5rem', textAlign: 'center',
                                background: '#0a1726', border: '1px solid #1a2d42',
                                borderRadius: 12,
                            }}>
                                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🎫</div>
                                <p style={{ color: '#4d6a87', fontSize: '0.9rem' }}>
                                    No hay boletos activos para el CI <strong style={{ color: '#dde5f0' }}>{ci}</strong>.
                                    Verifica el número o intenta con otra fecha.
                                </p>
                            </div>
                        )}

                        {boletos.map((b) => {
                            const est = ESTADO_COLOR[b.estado] || ESTADO_COLOR.confirmada;
                            return (
                                <div
                                    key={b.id}
                                    data-r="boleto-card"
                                    style={{
                                        background: '#0a1726', border: '1px solid #1a2d42',
                                        borderRadius: 12, padding: '1.25rem 1.5rem',
                                        marginBottom: '0.75rem',
                                        display: 'grid',
                                        gridTemplateColumns: '1fr auto',
                                        gap: '1rem', alignItems: 'start',
                                    }}
                                >
                                    <div>
                                        <div style={{
                                            display: 'flex', alignItems: 'center',
                                            gap: '0.6rem', marginBottom: '0.5rem',
                                        }}>
                                            <span style={{
                                                fontSize: '0.98rem', fontWeight: 700, color: '#dde5f0',
                                            }}>
                                                {b.origen} → {b.destino}
                                            </span>
                                            <span style={{
                                                fontSize: '0.7rem', fontWeight: 700,
                                                color: est.color, background: est.bg,
                                                padding: '0.15rem 0.55rem', borderRadius: 999,
                                            }}>
                                                {est.label}
                                            </span>
                                        </div>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                            gap: '0.35rem',
                                        }}>
                                            {[
                                                { label: 'Pasajero', val: b.pasajero },
                                                { label: 'CI',       val: b.ci },
                                                { label: 'Asientos', val: b.asientos },
                                                { label: 'Fecha',    val: b.fecha_viaje ? new Date(b.fecha_viaje).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
                                                { label: 'Total',    val: `Bs ${parseFloat(b.precio_total || 0).toFixed(2)}` },
                                            ].map(({ label, val }) => (
                                                <div key={label}>
                                                    <span style={{ fontSize: '0.68rem', color: '#2e4560', display: 'block' }}>{label}</span>
                                                    <span style={{ fontSize: '0.82rem', color: '#9ab0c9', fontWeight: 500 }}>{val}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => descargarQR(b)}
                                        disabled={!b.qr_token}
                                        style={{
                                            padding: '0.5rem 0.9rem',
                                            background: b.qr_token ? 'rgba(37,99,235,0.12)' : 'transparent',
                                            border: `1px solid ${b.qr_token ? '#1d4ed8' : '#1a2d42'}`,
                                            color: b.qr_token ? '#60a5fa' : '#2e4560',
                                            borderRadius: 8, fontSize: '0.78rem',
                                            fontWeight: 600, cursor: b.qr_token ? 'pointer' : 'not-allowed',
                                            whiteSpace: 'nowrap', transition: 'all 0.2s',
                                        }}
                                    >
                                        {b.qr_token ? '⬇️ Boleto' : 'Sin QR'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecuperarBoleto;
