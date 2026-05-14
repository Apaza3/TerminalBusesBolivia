import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import gsap from 'gsap';

const ROL_REDIRECT = {
    admin_sucursal: '/admin/dashboard',
    cajero:         '/cajero/panel',
    conductor:      '/conductor/panel',
};

const ROLES = [
    { id: 'admin_sucursal', label: 'Administrador', icon: '⚙️', color: '#3b82f6' },
    { id: 'cajero',         label: 'Cajero',         icon: '🏷️', color: '#f59e0b' },
    { id: 'conductor',      label: 'Conductor',      icon: '🚌', color: '#10b981' },
];

const LoginAdmin = () => {
    const [email,           setEmail]           = useState('');
    const [password,        setPassword]        = useState('');
    const [recordar,        setRecordar]        = useState(false);
    const [mostrarPass,     setMostrarPass]     = useState(false);
    const [error,           setError]           = useState(null);
    const [loading,         setLoading]         = useState(false);

    const { login } = useAuth();
    const navigate  = useNavigate();
    const rootRef   = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-p="left"]',  { x: -40, opacity: 0, duration: 0.7, ease: 'power3.out' });
            gsap.from('[data-p="form"]',  { x: 40,  opacity: 0, duration: 0.7, ease: 'power3.out', delay: 0.1 });
            gsap.from('[data-p="field"]', { y: 16, opacity: 0, duration: 0.45, stagger: 0.08, ease: 'power3.out', delay: 0.35 });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const { loginStaff } = await import('../../data/mockAuthDB');
            const resultado = loginStaff(email, password);
            if (!resultado.exito) {
                setError(resultado.error || 'Credenciales inválidas.');
                setLoading(false);
                return;
            }
            await login(email, password, recordar);
            navigate(ROL_REDIRECT[resultado.usuario?.rol] || '/admin/dashboard', { replace: true });
        } catch {
            setError('Error inesperado. Intenta de nuevo.');
            setLoading(false);
        }
    };

    return (
        <div
            ref={rootRef}
            style={{
                display: 'flex', minHeight: '100vh',
                background: '#07111f', color: '#dde5f0',
                fontFamily: "'Inter', system-ui, sans-serif",
            }}
        >
            {/* ── Left panel ─────────────────────────────────────── */}
            <div
                data-p="left"
                style={{
                    flex: '0 0 42%', display: 'flex', flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: 'clamp(2.5rem, 5vw, 4rem)',
                    borderRight: '1px solid #1a2d42',
                    background: '#07111f',
                }}
                className="login-left-panel"
            >
                <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '3rem' }}>
                        🚌 TerminalBolivia
                    </div>
                    <p style={{
                        fontSize: '0.7rem', letterSpacing: '0.16em', textTransform: 'uppercase',
                        color: '#4d6a87', fontWeight: 700, marginBottom: '0.9rem',
                    }}>
                        Acceso Staff
                    </p>
                    <h2 style={{
                        fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 800,
                        lineHeight: 1.1, letterSpacing: '-0.03em',
                        color: '#dde5f0', marginBottom: '1.5rem',
                    }}>
                        Panel de<br />Control
                    </h2>
                    <p style={{ color: '#4d6a87', fontSize: '0.9rem', lineHeight: 1.65, maxWidth: 300 }}>
                        Gestiona operaciones, reservas, flota y tripulación desde un solo lugar.
                    </p>
                </div>

                {/* Role indicators */}
                <div>
                    <p style={{ fontSize: '0.72rem', color: '#2e4560', fontWeight: 600, marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                        ROLES CON ACCESO
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {ROLES.map(r => (
                            <div key={r.id} style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.6rem 0.9rem',
                                background: '#0d1a2b', borderRadius: 8,
                                border: '1px solid #1a2d42',
                            }}>
                                <span style={{ fontSize: '0.95rem' }}>{r.icon}</span>
                                <span style={{ fontSize: '0.82rem', color: '#7a99b8', fontWeight: 500 }}>{r.label}</span>
                                <span style={{
                                    marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%',
                                    background: r.color,
                                }} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Right panel: form ───────────────────────────────── */}
            <div
                data-p="form"
                style={{
                    flex: 1, display: 'flex', alignItems: 'center',
                    justifyContent: 'center',
                    padding: 'clamp(1.5rem, 4vw, 3rem)',
                    background: '#0a1726',
                }}
            >
                <div style={{ width: '100%', maxWidth: 380 }}>
                    <h3 data-p="field" style={{
                        fontSize: '1.4rem', fontWeight: 700,
                        letterSpacing: '-0.02em', color: '#dde5f0',
                        marginBottom: '0.35rem',
                    }}>
                        Iniciar sesión
                    </h3>
                    <p data-p="field" style={{ color: '#4d6a87', fontSize: '0.85rem', marginBottom: '2rem' }}>
                        Ingresa con tu correo corporativo.
                    </p>

                    <form onSubmit={handleLogin} noValidate>
                        {error && (
                            <div data-p="field" style={{
                                background: 'rgba(239,68,68,0.08)', color: '#fca5a5',
                                padding: '0.75rem 1rem', borderRadius: 8,
                                border: '1px solid rgba(239,68,68,0.2)',
                                fontSize: '0.83rem', marginBottom: '1.25rem',
                            }}>
                                {error}
                            </div>
                        )}

                        <div data-p="field" style={{ marginBottom: '1.1rem' }}>
                            <label style={{
                                display: 'block', fontSize: '0.78rem', fontWeight: 600,
                                color: '#4d6a87', letterSpacing: '0.08em', textTransform: 'uppercase',
                                marginBottom: '0.5rem',
                            }}>
                                Correo electrónico
                            </label>
                            <input
                                type="email" value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="correo@tbb.com" required
                                id="input-email-staff"
                                style={{
                                    width: '100%', background: '#0d1a2b',
                                    border: '1px solid #1a2d42', color: '#dde5f0',
                                    padding: '0.8rem 1rem', borderRadius: 9,
                                    fontSize: '0.92rem', outline: 'none',
                                    transition: 'border-color 0.2s',
                                    boxSizing: 'border-box',
                                }}
                                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                onBlur={e => e.target.style.borderColor = '#1a2d42'}
                            />
                        </div>

                        <div data-p="field" style={{ marginBottom: '1rem' }}>
                            <label style={{
                                display: 'block', fontSize: '0.78rem', fontWeight: 600,
                                color: '#4d6a87', letterSpacing: '0.08em', textTransform: 'uppercase',
                                marginBottom: '0.5rem',
                            }}>
                                Contraseña
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={mostrarPass ? 'text' : 'password'} value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••" required
                                    id="input-password-staff"
                                    style={{
                                        width: '100%', background: '#0d1a2b',
                                        border: '1px solid #1a2d42', color: '#dde5f0',
                                        padding: '0.8rem 3rem 0.8rem 1rem', borderRadius: 9,
                                        fontSize: '0.92rem', outline: 'none',
                                        transition: 'border-color 0.2s',
                                        boxSizing: 'border-box',
                                    }}
                                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={e => e.target.style.borderColor = '#1a2d42'}
                                />
                                <button
                                    type="button"
                                    onClick={() => setMostrarPass(!mostrarPass)}
                                    style={{
                                        position: 'absolute', right: '0.75rem', top: '50%',
                                        transform: 'translateY(-50%)', background: 'none',
                                        border: 'none', color: '#4d6a87', cursor: 'pointer',
                                        fontSize: '0.85rem', padding: '0.25rem',
                                    }}
                                >
                                    {mostrarPass ? 'Ocultar' : 'Ver'}
                                </button>
                            </div>
                        </div>

                        <div data-p="field" style={{
                            display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', marginBottom: '1.5rem',
                        }}>
                            <label style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                color: '#4d6a87', fontSize: '0.82rem', cursor: 'pointer',
                            }}>
                                <input
                                    type="checkbox" checked={recordar}
                                    onChange={e => setRecordar(e.target.checked)}
                                    style={{ accentColor: '#3b82f6' }}
                                    id="check-recordar"
                                />
                                Recordar sesión
                            </label>
                            <Link to="/recuperar-password" style={{
                                fontSize: '0.82rem', color: '#3b82f6',
                                textDecoration: 'none', fontWeight: 500,
                            }}>
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>

                        <button
                            data-p="field"
                            type="submit"
                            disabled={loading || !email || !password}
                            id="btn-login-staff"
                            style={{
                                width: '100%', padding: '0.85rem',
                                background: loading || !email || !password ? '#1a2d42' : '#16a34a',
                                border: 'none', color: loading || !email || !password ? '#4d6a87' : '#fff',
                                borderRadius: 9, fontWeight: 700, fontSize: '0.92rem',
                                cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
                                transition: 'background 0.2s, color 0.2s',
                                letterSpacing: '0.01em',
                            }}
                            onMouseEnter={e => { if (!loading && email && password) e.currentTarget.style.background = '#15803d'; }}
                            onMouseLeave={e => { if (!loading && email && password) e.currentTarget.style.background = '#16a34a'; }}
                        >
                            {loading ? 'Verificando...' : 'Iniciar sesión'}
                        </button>
                    </form>

                    <div data-p="field" style={{
                        marginTop: '1.75rem', paddingTop: '1.25rem',
                        borderTop: '1px solid #1a2d42',
                        textAlign: 'center',
                    }}>
                        <span style={{ color: '#2e4560', fontSize: '0.82rem' }}>¿Eres pasajero? </span>
                        <Link to="/login-cliente" style={{
                            fontSize: '0.82rem', color: '#4d6a87',
                            textDecoration: 'none', fontWeight: 600,
                        }}>
                            Acceso cliente →
                        </Link>
                    </div>
                </div>
            </div>

            {/* Hide left panel on small screens via inline style trick */}
            <style>{`
                @media (max-width: 640px) {
                    .login-left-panel { display: none !important; }
                }
            `}</style>
        </div>
    );
};

export default LoginAdmin;
