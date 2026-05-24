import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import { useDepartamento } from '../../contextos/DepartamentoContext';
import { getDeptFondo } from '../../utils/assets';
import NavbarUniversal from '../../componentes/NavbarUniversal';
import FragmentoDept from '../../componentes/FragmentoDept';
import gsap from 'gsap';

const ROL_REDIRECT = {
    admin_sucursal: '/admin/dashboard',
    cajero:         '/cajero/panel',
    conductor:      '/conductor/panel',
};

const ROLES = [
    { id: 'admin_sucursal', label: 'Administrador', icon: '⚙️' },
    { id: 'cajero',         label: 'Cajero',         icon: '🏷️' },
    { id: 'conductor',      label: 'Conductor',      icon: '🚌' },
];

const LoginAdmin = () => {
    const [email,       setEmail]       = useState('');
    const [password,    setPassword]    = useState('');
    const [recordar,    setRecordar]    = useState(false);
    const [mostrarPass, setMostrarPass] = useState(false);
    const [error,       setError]       = useState(null);
    const [loading,     setLoading]     = useState(false);

    const { login }                     = useAuth();
    const { tema, departamento }        = useDepartamento();
    const navigate                      = useNavigate();
    const rootRef                       = useRef(null);

    const c1 = tema.bandera1;
    const c2 = tema.bandera2;
    const bg = tema.bg;

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-p="left"]',  { x: -40, opacity: 0, duration: 0.7, ease: 'power3.out' });
            gsap.from('[data-p="form"]',  { x: 40,  opacity: 0, duration: 0.7, ease: 'power3.out', delay: 0.1 });
            gsap.from('[data-p="field"]', { y: 16, opacity: 0, duration: 0.45, stagger: 0.08, ease: 'power3.out', delay: 0.35 });
            gsap.from('[data-p="shape"]', { scale: 0, opacity: 0, duration: 0.6, stagger: 0.1, ease: 'back.out(1.4)', delay: 0.2 });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const resultado = await login(email, password, recordar);
            if (!resultado.exito) {
                setError(resultado.error || 'Credenciales inválidas.');
                setLoading(false);
                return;
            }
            navigate(ROL_REDIRECT[resultado.usuario?.rol] || '/admin/dashboard', { replace: true });
        } catch {
            setError('Error inesperado. Intenta de nuevo.');
            setLoading(false);
        }
    };

    const inputStyle = {
        width: '100%',
        background: 'rgba(8, 12, 24, 0.88)',
        border: `1.5px solid ${c1}60`,
        color: '#f0ece8',
        padding: '0.85rem 1rem',
        borderRadius: 10,
        fontSize: '0.92rem',
        outline: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxSizing: 'border-box',
    };

    const canSubmit = !loading && email && password;

    return (
        <>
        <NavbarUniversal />
        <div ref={rootRef} style={{
            display: 'flex', height: 'calc(100vh - 76px)', overflow: 'hidden',
            background: bg, color: '#f0ece8',
            fontFamily: "'Inter', system-ui, sans-serif",
        }}>
            {/* ── Left panel ─────────────────────────────────────── */}
            <div data-p="left" style={{
                flex: '0 0 42%', display: 'flex', flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 'clamp(2.5rem, 5vw, 4rem)',
                borderRight: `1px solid ${c1}30`,
                background: `linear-gradient(160deg, ${c1}40 0%, ${bg} 45%, ${c2}30 100%)`,
                position: 'relative', overflow: 'hidden',
            }} className="login-left-panel">
                {/* Fondo logo sistema */}
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `url(/personal/logo_terminal.svg)`,
                    backgroundSize: '60%', backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    opacity: 0.06,
                }} />

                {/* Figuras decorativas izquierda */}
                <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: 24, background: `${c1}25`, transform: 'rotate(15deg)' }} />
                <div style={{ position: 'absolute', bottom: 80, left: -30, width: 120, height: 120, borderRadius: 16, background: `${c2}20`, transform: 'rotate(-10deg)' }} />
                <div style={{ position: 'absolute', bottom: 200, right: 20, width: 60, height: 60, borderRadius: 10, background: `${tema.primary}30`, transform: 'rotate(30deg)' }} />

                <div style={{ position: 'relative' }}>
                    <div style={{ marginBottom: '3rem' }} />
                    <p style={{
                        fontSize: '0.7rem', letterSpacing: '0.16em', textTransform: 'uppercase',
                        color: tema.primary, fontWeight: 700, marginBottom: '0.9rem',
                    }}>
                        Acceso Staff
                    </p>
                    <h2 style={{
                        fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 800,
                        lineHeight: 1.1, letterSpacing: '-0.03em',
                        marginBottom: '1.5rem',
                    }}>
                        Panel de<br />
                        <span style={{ color: tema.primary }}>Control</span>
                    </h2>
                    <p style={{ color: `${tema.success}90`, fontSize: '0.9rem', lineHeight: 1.65, maxWidth: 300 }}>
                        Gestiona operaciones, reservas, flota y tripulación desde un solo lugar.
                    </p>
                    <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                        <FragmentoDept deptNombre={departamento} color={tema.color} size={120} />
                    </div>
                </div>

                <div style={{ position: 'relative' }}>
                    <p style={{ fontSize: '0.72rem', color: `${tema.success}70`, fontWeight: 600, marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                        ROLES CON ACCESO
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {ROLES.map((r, i) => (
                            <div key={r.id} style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.6rem 0.9rem',
                                background: i % 2 === 0 ? `${c1}22` : `${c2}18`,
                                borderRadius: 8,
                                border: `1px solid ${i % 2 === 0 ? c1 : c2}35`,
                            }}>
                                <span style={{ fontSize: '0.95rem' }}>{r.icon}</span>
                                <span style={{ fontSize: '0.82rem', color: `${tema.success}cc`, fontWeight: 500 }}>{r.label}</span>
                                <span style={{
                                    marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%',
                                    background: i % 2 === 0 ? c1 : c2,
                                    boxShadow: `0 0 6px ${i % 2 === 0 ? c1 : c2}`,
                                }} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Right panel: form ───────────────────────────────── */}
            <div data-p="form" style={{
                flex: 1, display: 'flex', alignItems: 'center',
                justifyContent: 'center',
                padding: 'clamp(1.5rem, 4vw, 3rem)',
                background: `linear-gradient(135deg, ${bg} 0%, ${c2}18 100%)`,
                position: 'relative', overflow: 'hidden',
            }}>
                {/* Figuras decorativas sólidas sin transparencia */}
                <div data-p="shape" style={{ position: 'absolute', zIndex: 0, top: -20, right: -20, width: 110, height: 110, borderRadius: 0, background: tema.primary, transform: 'rotate(18deg)' }} />
                <div data-p="shape" style={{ position: 'absolute', zIndex: 0, top: 60, right: 60, width: 55, height: 55, borderRadius: 0, background: tema.secondary, transform: 'rotate(10deg)' }} />
                <div data-p="shape" style={{ position: 'absolute', zIndex: 0, top: 180, right: 10, width: 30, height: 90, borderRadius: 0, background: c1, transform: 'rotate(-5deg)' }} />
                <div data-p="shape" style={{ position: 'absolute', zIndex: 0, bottom: -20, left: -20, width: 130, height: 80, borderRadius: 0, background: c2, transform: 'rotate(-12deg)' }} />
                <div data-p="shape" style={{ position: 'absolute', zIndex: 0, bottom: 80, left: 30, width: 60, height: 60, borderRadius: 0, background: tema.success, transform: 'rotate(20deg)' }} />
                <div data-p="shape" style={{ position: 'absolute', zIndex: 0, bottom: 200, right: 30, width: 45, height: 45, borderRadius: 0, background: tema.secondary, transform: 'rotate(-25deg)' }} />
                <div data-p="shape" style={{ position: 'absolute', zIndex: 0, top: '45%', left: -15, width: 40, height: 100, borderRadius: 0, background: tema.primary, transform: 'rotate(8deg)' }} />

                <div style={{ width: '100%', maxWidth: 380, position: 'relative', zIndex: 1 }}>
                    <div data-p="field" style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                        <div style={{
                            width: '9rem', height: '9rem', borderRadius: '50%',
                            background: `#ffffff url(/personal/logo_terminal.png) center/80% no-repeat`,
                            boxShadow: `0 6px 32px ${c1}50`,
                            display: 'inline-block',
                        }}></div>
                    </div>
                    <h3 data-p="field" style={{
                        fontSize: '1.5rem', fontWeight: 800,
                        letterSpacing: '-0.02em', color: '#f8f4f0',
                        marginBottom: '0.35rem',
                    }}>
                        Iniciar sesión
                    </h3>
                    <p data-p="field" style={{ color: `${tema.success}80`, fontSize: '0.85rem', marginBottom: '2rem' }}>
                        Ingresa con tu correo corporativo.
                    </p>

                    <form onSubmit={handleLogin} noValidate>
                        {error && (
                            <div data-p="field" style={{
                                background: `${tema.alertBg}25`, color: `#fca5a5`,
                                padding: '0.75rem 1rem', borderRadius: 8,
                                border: `1px solid ${tema.alertBg}60`,
                                fontSize: '0.83rem', marginBottom: '1.25rem',
                            }}>
                                {error}
                            </div>
                        )}

                        <div data-p="field" style={{ marginBottom: '1.1rem' }}>
                            <label style={{
                                display: 'block', fontSize: '0.78rem', fontWeight: 700,
                                color: `${tema.success}80`, letterSpacing: '0.08em', textTransform: 'uppercase',
                                marginBottom: '0.5rem',
                            }}>
                                Correo electrónico
                            </label>
                            <input
                                type="email" value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="correo@tbb.com" required
                                id="input-email-staff"
                                style={inputStyle}
                                onFocus={e => { e.target.style.borderColor = tema.primary; e.target.style.boxShadow = `0 0 0 3px ${tema.primary}25`; }}
                                onBlur={e => { e.target.style.borderColor = `${c1}40`; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>

                        <div data-p="field" style={{ marginBottom: '1rem' }}>
                            <label style={{
                                display: 'block', fontSize: '0.78rem', fontWeight: 700,
                                color: `${tema.success}80`, letterSpacing: '0.08em', textTransform: 'uppercase',
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
                                    style={{ ...inputStyle, paddingRight: '3rem' }}
                                    onFocus={e => { e.target.style.borderColor = tema.primary; e.target.style.boxShadow = `0 0 0 3px ${tema.primary}25`; }}
                                    onBlur={e => { e.target.style.borderColor = `${c1}40`; e.target.style.boxShadow = 'none'; }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setMostrarPass(!mostrarPass)}
                                    style={{
                                        position: 'absolute', right: '0.75rem', top: '50%',
                                        transform: 'translateY(-50%)', background: 'none',
                                        border: 'none', color: `${tema.success}70`, cursor: 'pointer',
                                        fontSize: '0.82rem', padding: '0.25rem', fontWeight: 600,
                                    }}>
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
                                color: `${tema.success}70`, fontSize: '0.82rem', cursor: 'pointer',
                            }}>
                                <input
                                    type="checkbox" checked={recordar}
                                    onChange={e => setRecordar(e.target.checked)}
                                    style={{ accentColor: tema.primary }}
                                    id="check-recordar"
                                />
                                Recordar sesión
                            </label>
                            <Link to="/recuperar-password" style={{
                                fontSize: '0.82rem', color: tema.primary,
                                textDecoration: 'none', fontWeight: 600,
                            }}>
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>

                        <button
                            data-p="field"
                            type="submit"
                            disabled={!canSubmit}
                            id="btn-login-staff"
                            style={{
                                width: '100%', padding: '0.9rem',
                                background: canSubmit
                                    ? `linear-gradient(135deg, ${tema.primary}, ${tema.secondary})`
                                    : '#334155',
                                border: `1.5px solid ${canSubmit ? tema.primary : '#475569'}`,
                                color: canSubmit ? tema.primaryText : '#94a3b8',
                                borderRadius: 10, fontWeight: 800, fontSize: '0.95rem',
                                cursor: canSubmit ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s', letterSpacing: '0.02em',
                                boxShadow: canSubmit ? `0 4px 24px ${tema.primary}45, 0 4px 24px ${tema.secondary}30` : 'none',
                                opacity: 1,
                                WebkitAppearance: 'none',
                                appearance: 'none',
                            }}
                            onMouseEnter={e => { if (canSubmit) e.currentTarget.style.boxShadow = `0 6px 32px ${tema.primary}65, 0 6px 32px ${tema.secondary}45`; }}
                            onMouseLeave={e => { if (canSubmit) e.currentTarget.style.boxShadow = `0 4px 24px ${tema.primary}45, 0 4px 24px ${tema.secondary}30`; }}
                        >
                            {loading ? 'Verificando...' : 'Iniciar sesión →'}
                        </button>
                    </form>

                    <div data-p="field" style={{
                        marginTop: '1.75rem', paddingTop: '1.25rem',
                        borderTop: `1px solid ${c1}25`,
                        textAlign: 'center',
                    }}>
                        <span style={{ color: `${tema.success}50`, fontSize: '0.82rem' }}>¿Eres pasajero? </span>
                        <Link to="/login-cliente" style={{
                            fontSize: '0.82rem', color: tema.primary,
                            textDecoration: 'none', fontWeight: 700,
                        }}>
                            Acceso cliente →
                        </Link>
                    </div>
                </div>
            </div>

            <style>{`
                @media (max-width: 640px) {
                    .login-left-panel { display: none !important; }
                }
            `}</style>
        </div>
        </>
    );
};

export default LoginAdmin;
