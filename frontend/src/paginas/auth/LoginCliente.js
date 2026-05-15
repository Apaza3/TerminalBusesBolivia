import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import gsap from 'gsap';

const LoginCliente = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get('redirect') || '/';
    const { loginComoCliente } = useAuth();

    const [ci,           setCi]           = useState('');
    const [password,     setPassword]     = useState('');
    const [recordar,     setRecordar]     = useState(false);
    const [mostrarPass,  setMostrarPass]  = useState(false);
    const [error,        setError]        = useState(null);
    const [loading,      setLoading]      = useState(false);

    const rootRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-q="card"]', { y: 28, opacity: 0, duration: 0.6, ease: 'power3.out' });
            gsap.from('[data-q="field"]', {
                y: 14, opacity: 0, duration: 0.45, stagger: 0.07,
                ease: 'power3.out', delay: 0.25,
            });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        const resultado = loginComoCliente(ci, password, recordar);
        if (resultado.exito) {
            navigate(redirectTo, { replace: true });
        } else {
            setError(resultado.error);
            setLoading(false);
        }
    };

    const inputStyle = {
        width: '100%', boxSizing: 'border-box',
        background: '#07111f', border: '1px solid #1a2d42',
        color: '#dde5f0', padding: '0.8rem 1rem',
        borderRadius: 9, fontSize: '0.92rem', outline: 'none',
        transition: 'border-color 0.2s',
    };

    return (
        <div
            ref={rootRef}
            style={{
                background: '#07111f', minHeight: '100vh',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1.5rem', fontFamily: "'Inter', system-ui, sans-serif",
                color: '#dde5f0',
                position: 'relative', overflow: 'hidden',
            }}
        >
            {/* Background glow */}
            <div style={{
                position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
                width: '60vw', height: '60vw', maxWidth: 700,
                background: 'radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 65%)',
                pointerEvents: 'none',
            }} />

            <div data-q="card" style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 14,
                        background: '#0d1a2b', border: '1px solid #1a2d42',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.5rem', margin: '0 auto 1rem',
                    }}>
                        🚌
                    </div>
                    <h1 style={{
                        fontSize: '1.5rem', fontWeight: 800,
                        letterSpacing: '-0.025em', color: '#dde5f0', marginBottom: '0.4rem',
                    }}>
                        Bienvenido de vuelta
                    </h1>
                    <p style={{ color: '#4d6a87', fontSize: '0.88rem' }}>
                        Ingresa con tu Carnet de Identidad para continuar.
                    </p>
                </div>

                {/* Card */}
                <div style={{
                    background: '#0a1726', border: '1px solid #1a2d42',
                    borderRadius: 16, padding: '2rem',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
                }}>
                    <form onSubmit={handleSubmit} noValidate>
                        {error && (
                            <div data-q="field" style={{
                                background: 'rgba(239,68,68,0.08)', color: '#fca5a5',
                                padding: '0.7rem 0.9rem', borderRadius: 8,
                                border: '1px solid rgba(239,68,68,0.2)',
                                fontSize: '0.82rem', marginBottom: '1.25rem',
                            }}>
                                {error}
                            </div>
                        )}

                        <div data-q="field" style={{ marginBottom: '1.1rem' }}>
                            <label style={{
                                display: 'block', fontSize: '0.75rem', fontWeight: 600,
                                color: '#4d6a87', letterSpacing: '0.09em',
                                textTransform: 'uppercase', marginBottom: '0.45rem',
                            }}>
                                Carnet de Identidad (CI)
                            </label>
                            <input
                                type="text" value={ci}
                                onChange={e => setCi(e.target.value)}
                                placeholder="Ej. 1234567" required
                                style={inputStyle}
                                onFocus={e => e.target.style.borderColor = '#2563eb'}
                                onBlur={e => e.target.style.borderColor = '#1a2d42'}
                            />
                        </div>

                        <div data-q="field" style={{ marginBottom: '1rem' }}>
                            <label style={{
                                display: 'block', fontSize: '0.75rem', fontWeight: 600,
                                color: '#4d6a87', letterSpacing: '0.09em',
                                textTransform: 'uppercase', marginBottom: '0.45rem',
                            }}>
                                Contraseña
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={mostrarPass ? 'text' : 'password'} value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Tu contraseña" required
                                    style={{ ...inputStyle, paddingRight: '3.5rem' }}
                                    onFocus={e => e.target.style.borderColor = '#2563eb'}
                                    onBlur={e => e.target.style.borderColor = '#1a2d42'}
                                />
                                <button
                                    type="button"
                                    onClick={() => setMostrarPass(!mostrarPass)}
                                    style={{
                                        position: 'absolute', right: '0.75rem', top: '50%',
                                        transform: 'translateY(-50%)', background: 'none',
                                        border: 'none', color: '#4d6a87', cursor: 'pointer',
                                        fontSize: '0.78rem', padding: '0.25rem',
                                    }}
                                >
                                    {mostrarPass ? 'Ocultar' : 'Ver'}
                                </button>
                            </div>
                        </div>

                        <div data-q="field" style={{
                            display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', marginBottom: '1.5rem',
                        }}>
                            <label style={{
                                display: 'flex', alignItems: 'center', gap: '0.45rem',
                                color: '#4d6a87', fontSize: '0.82rem', cursor: 'pointer',
                            }}>
                                <input
                                    type="checkbox" checked={recordar}
                                    onChange={e => setRecordar(e.target.checked)}
                                    style={{ accentColor: '#2563eb' }}
                                    id="check-recordar-cliente"
                                />
                                Recordar sesión
                            </label>
                            <Link to="/recuperar-boleto" style={{
                                fontSize: '0.78rem', color: '#4d6a87', textDecoration: 'none',
                            }}>
                                Recuperar boleto →
                            </Link>
                        </div>

                        <button
                            data-q="field"
                            type="submit"
                            disabled={loading || !ci || !password}
                            style={{
                                width: '100%', padding: '0.85rem',
                                background: loading || !ci || !password ? '#1a2d42' : '#2563eb',
                                border: 'none',
                                color: loading || !ci || !password ? '#4d6a87' : '#fff',
                                borderRadius: 9, fontWeight: 700, fontSize: '0.92rem',
                                cursor: loading || !ci || !password ? 'not-allowed' : 'pointer',
                                transition: 'background 0.2s',
                                letterSpacing: '0.01em',
                            }}
                            onMouseEnter={e => { if (!loading && ci && password) e.currentTarget.style.background = '#1d4ed8'; }}
                            onMouseLeave={e => { if (!loading && ci && password) e.currentTarget.style.background = '#2563eb'; }}
                        >
                            {loading ? 'Verificando...' : 'Iniciar sesión'}
                        </button>
                    </form>
                </div>

                {/* Footer links */}
                <div data-q="field" style={{
                    marginTop: '1.5rem', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '0.6rem',
                }}>
                    <span style={{ color: '#2e4560', fontSize: '0.82rem' }}>
                        ¿No tienes cuenta?{' '}
                        <Link to="/registro" style={{
                            color: '#4d6a87', textDecoration: 'none', fontWeight: 600,
                        }}>
                            Regístrate aquí
                        </Link>
                    </span>
                    <Link to="/login" style={{
                        fontSize: '0.78rem', color: '#2e4560', textDecoration: 'none',
                    }}>
                        Acceso staff / administración →
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LoginCliente;
