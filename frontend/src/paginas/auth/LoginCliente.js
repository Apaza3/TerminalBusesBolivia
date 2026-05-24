import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import { useDepartamento } from '../../contextos/DepartamentoContext';
import NavbarUniversal from '../../componentes/NavbarUniversal';
import { getDeptFondo } from '../../utils/assets';
import gsap from 'gsap';

const EyeOpen = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);
const EyeClosed = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);


const LoginCliente = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get('redirect') || '/';
    const { loginComoCliente } = useAuth();
    const { departamento, tema } = useDepartamento();

    const [ci, setCi] = useState('');
    const [password, setPassword] = useState('');
    const [recordar, setRecordar] = useState(false);
    const [mostrarPass, setMostrarPass] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    const rootRef = useRef(null);
    const cardRef = useRef(null);
    const logoRef = useRef(null);


    useEffect(() => {
        const h = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);


    useEffect(() => {
        const ctx = gsap.context(() => {
            if (logoRef.current) gsap.from(logoRef.current, { scale: 0.85, opacity: 0, duration: 0.7, ease: 'back.out(1.4)', delay: 0.1 });
            if (cardRef.current) gsap.from(cardRef.current, { y: isMobile ? 30 : 0, x: isMobile ? 0 : -24, opacity: 0, duration: 0.65, ease: 'power3.out', delay: 0.15 });
            gsap.from('[data-q="field"]', { y: 12, opacity: 0, duration: 0.4, stagger: 0.07, ease: 'power3.out', delay: 0.35 });
        }, rootRef);
        return () => ctx.revert();
    }, [isMobile]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        const res = loginComoCliente(ci, password, recordar);
        if (res.exito) navigate(redirectTo, { replace: true });
        else { setError(res.error); setLoading(false); }
    };

    const canSubmit = !loading && ci.trim() && password;

    const inp = (extra = {}) => ({
        width: '100%', boxSizing: 'border-box',
        background: 'rgba(7,17,31,0.6)',
        border: `1px solid ${tema.color}30`,
        color: '#dde5f0', padding: '0.75rem 1rem',
        borderRadius: 10, fontSize: '0.92rem', outline: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s', ...extra,
    });

    const focusIn = (e) => { e.target.style.borderColor = tema.color; e.target.style.boxShadow = `0 0 0 3px ${tema.color}20`; };
    const focusOut = (e) => { e.target.style.borderColor = `${tema.color}30`; e.target.style.boxShadow = 'none'; };

    const lbl = { display: 'block', fontSize: '0.72rem', fontWeight: 600, color: `${tema.acento}90`, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' };

    const bg = getDeptFondo(departamento);

    return (
        <>
            <NavbarUniversal />
            <div ref={rootRef} style={{ height: 'calc(100vh - 76px)', overflow: 'hidden', position: 'relative', fontFamily: "'Inter', system-ui, sans-serif", color: '#dde5f0' }}>

                {/* Fondo */}
                <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.35) saturate(0.7)', zIndex: 0 }} />
                <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: `linear-gradient(135deg, ${tema.bg}dd 0%, ${tema.bg}aa 50%, ${tema.bg}80 100%)` }} />
                <div style={{ position: 'absolute', top: '30%', left: isMobile ? '50%' : '25%', transform: 'translate(-50%,-50%)', zIndex: 1, width: 500, height: 500, background: `radial-gradient(circle, ${tema.color}18 0%, transparent 65%)`, pointerEvents: 'none' }} />

                {/* ════ MOBILE ════ */}
                {isMobile ? (
                    <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                        {/* Contenido centrado */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem', overflow: 'hidden' }}>
                            <div ref={cardRef} style={{ width: '100%', maxWidth: 400, background: 'rgba(10,18,35,0.78)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: `1px solid ${tema.color}28`, borderRadius: 22, padding: '1.75rem 1.5rem', boxShadow: '0 8px 48px rgba(0,0,0,0.55)' }}>
                                <div data-q="field" style={{ marginBottom: '1.25rem' }}>
                                    <div style={{ width: 72, height: 72, borderRadius: '50%', border: `2px solid ${tema.color}`, boxShadow: `0 0 24px ${tema.color}40`, background: '#ffffff url(/personal/logo_terminal.png) center/85% no-repeat', marginBottom: '0.85rem' }}></div>
                                    <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '0.2rem', letterSpacing: '-0.025em' }}>Bienvenido de vuelta</h1>
                                    <p style={{ color: '#4d6a87', fontSize: '0.82rem' }}>{tema.emoji} {departamento} · Ingresa con tu CI</p>
                                </div>
                                <form onSubmit={handleSubmit} noValidate>
                                    {error && <div data-q="field" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', padding: '0.65rem 0.9rem', borderRadius: 9, border: '1px solid rgba(239,68,68,0.25)', fontSize: '0.8rem', marginBottom: '1rem' }}>{error}</div>}
                                    <div data-q="field" style={{ marginBottom: '0.9rem' }}>
                                        <label style={lbl}>Carnet de Identidad (CI)</label>
                                        <input type="text" value={ci} onChange={e => setCi(e.target.value)} placeholder="Ej. 1234567" required style={inp()} onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                    <div data-q="field" style={{ marginBottom: '0.75rem' }}>
                                        <label style={lbl}>Contraseña</label>
                                        <div style={{ position: 'relative' }}>
                                            <input type={mostrarPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Tu contraseña" required style={inp({ paddingRight: '3rem' })} onFocus={focusIn} onBlur={focusOut} />
                                            <button type="button" onClick={() => setMostrarPass(!mostrarPass)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#4d6a87', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem', transition: 'color 0.15s' }}
                                                onMouseEnter={e => e.currentTarget.style.color = tema.acento}
                                                onMouseLeave={e => e.currentTarget.style.color = '#4d6a87'}>
                                                {mostrarPass ? <EyeClosed /> : <EyeOpen />}
                                            </button>
                                        </div>
                                    </div>
                                    <div data-q="field" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#4d6a87', fontSize: '0.8rem', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={recordar} onChange={e => setRecordar(e.target.checked)} style={{ accentColor: tema.color }} />
                                            Recordar sesión
                                        </label>
                                        <button type="button" onClick={() => navigate('/recuperar-boleto')} style={{ background: 'none', border: 'none', fontSize: '0.76rem', color: '#4d6a87', cursor: 'pointer', transition: 'color 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.color = tema.acento}
                                            onMouseLeave={e => e.currentTarget.style.color = '#4d6a87'}>
                                            Recuperar boleto →
                                        </button>
                                    </div>
                                    {/* Botones grandes */}
                                    <div data-q="field" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                        <button type="submit" disabled={!canSubmit} style={{ width: '100%', padding: '0.85rem', background: canSubmit ? `linear-gradient(135deg, ${tema.color}, ${tema.colorSecundario})` : '#1a2d42', border: 'none', color: canSubmit ? '#fff' : '#4d6a87', borderRadius: 11, fontWeight: 700, fontSize: '0.95rem', cursor: canSubmit ? 'pointer' : 'not-allowed', boxShadow: canSubmit ? `0 0 20px ${tema.color}40` : 'none', transition: 'all 0.2s' }}>
                                            {loading ? 'Verificando...' : '🔑 Iniciar sesión'}
                                        </button>
                                        <button type="button" onClick={() => navigate('/registro')} style={{ width: '100%', padding: '0.82rem', background: 'transparent', border: `1.5px solid ${tema.color}55`, color: tema.acento, borderRadius: 11, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = `${tema.color}15`; e.currentTarget.style.borderColor = tema.color; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `${tema.color}55`; }}>
                                            📝 Registrarse
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                ) : (
                    /* ════ DESKTOP ════ */
                    <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                        {/* Contenido — dos columnas centradas */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '0 2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', width: '100%', maxWidth: 980, transform: 'translateX(-120px)' }}>

                                {/* LOGO — col izquierda */}
                                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                                    <div ref={logoRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                                            <div style={{ width: 220, height: 220, borderRadius: '50%', border: `3px solid ${tema.color}`, boxShadow: `0 0 60px ${tema.color}50`, background: `#ffffff url(/personal/logo_terminal.png) center/85% no-repeat`, transition: 'all 0.5s ease' }}></div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.78rem', color: `${tema.acento}90`, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                                                    {tema.emoji} {departamento}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 260 }}>
                                                {['Reservas seguras', 'Tiempo real', 'Todos los destinos'].map(f => (
                                                    <span key={f} style={{ fontSize: '0.65rem', color: `${tema.acento}80`, background: `${tema.color}12`, border: `1px solid ${tema.color}25`, padding: '0.2rem 0.55rem', borderRadius: 20 }}>{f}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>{/* fin logo inner */}
                                </div>{/* fin col izquierda */}

                                {/* FORM — col derecha */}
                                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
                                    <div ref={cardRef} style={{ width: '100%', maxWidth: 440, background: 'rgba(10,18,35,0.74)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: `1px solid ${tema.color}28`, borderRadius: 22, padding: '2.25rem 2rem', boxShadow: '0 8px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)' }}>
                                        <div data-q="field" style={{ marginBottom: '1.5rem' }}>
                                            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '0.3rem', letterSpacing: '-0.025em' }}>Bienvenido de vuelta</h1>
                                            <p style={{ color: '#4d6a87', fontSize: '0.82rem', lineHeight: 1.5 }}>Ingresa con tu Carnet de Identidad para continuar.</p>
                                        </div>
                                        <form onSubmit={handleSubmit} noValidate>
                                            {error && <div data-q="field" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', padding: '0.65rem 0.9rem', borderRadius: 9, border: '1px solid rgba(239,68,68,0.25)', fontSize: '0.8rem', marginBottom: '1rem' }}>{error}</div>}
                                            <div data-q="field" style={{ marginBottom: '0.9rem' }}>
                                                <label style={lbl}>Carnet de Identidad (CI)</label>
                                                <input type="text" value={ci} onChange={e => setCi(e.target.value)} placeholder="Ej. 1234567" required style={inp()} onFocus={focusIn} onBlur={focusOut} />
                                            </div>
                                            <div data-q="field" style={{ marginBottom: '0.9rem' }}>
                                                <label style={lbl}>Contraseña</label>
                                                <div style={{ position: 'relative' }}>
                                                    <input type={mostrarPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Tu contraseña" required style={inp({ paddingRight: '3rem' })} onFocus={focusIn} onBlur={focusOut} />
                                                    <button type="button" onClick={() => setMostrarPass(!mostrarPass)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#4d6a87', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem', transition: 'color 0.15s' }}
                                                        onMouseEnter={e => e.currentTarget.style.color = tema.acento}
                                                        onMouseLeave={e => e.currentTarget.style.color = '#4d6a87'}>
                                                        {mostrarPass ? <EyeClosed /> : <EyeOpen />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div data-q="field" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#4d6a87', fontSize: '0.8rem', cursor: 'pointer' }}>
                                                    <input type="checkbox" checked={recordar} onChange={e => setRecordar(e.target.checked)} style={{ accentColor: tema.color }} />
                                                    Recordar sesión
                                                </label>
                                                <button type="button" onClick={() => navigate('/recuperar-boleto')} style={{ background: 'none', border: 'none', fontSize: '0.76rem', color: '#4d6a87', cursor: 'pointer', transition: 'color 0.15s' }}
                                                    onMouseEnter={e => e.currentTarget.style.color = tema.acento}
                                                    onMouseLeave={e => e.currentTarget.style.color = '#4d6a87'}>
                                                    Recuperar boleto →
                                                </button>
                                            </div>
                                            {/* Dos botones grandes */}
                                            <div data-q="field" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                                <button type="submit" disabled={!canSubmit} style={{ width: '100%', padding: '0.88rem', background: canSubmit ? `linear-gradient(135deg, ${tema.color}, ${tema.colorSecundario})` : '#1a2d42', border: 'none', color: canSubmit ? '#fff' : '#4d6a87', borderRadius: 11, fontWeight: 700, fontSize: '0.95rem', cursor: canSubmit ? 'pointer' : 'not-allowed', boxShadow: canSubmit ? `0 0 20px ${tema.color}40` : 'none', transition: 'all 0.2s', letterSpacing: '0.01em' }}
                                                    onMouseEnter={e => { if (canSubmit) { e.currentTarget.style.boxShadow = `0 0 32px ${tema.color}70`; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                                                    onMouseLeave={e => { e.currentTarget.style.boxShadow = canSubmit ? `0 0 20px ${tema.color}40` : 'none'; e.currentTarget.style.transform = 'none'; }}>
                                                    {loading ? 'Verificando...' : '🔑 Iniciar sesión'}
                                                </button>
                                                <button type="button" onClick={() => navigate('/registro')} style={{ width: '100%', padding: '0.85rem', background: 'transparent', border: `1.5px solid ${tema.color}55`, color: tema.acento, borderRadius: 11, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.01em' }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = `${tema.color}15`; e.currentTarget.style.borderColor = tema.color; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `${tema.color}55`; e.currentTarget.style.transform = 'none'; }}>
                                                    📝 Registrarse
                                                </button>
                                            </div>
                                            <div data-q="field" style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.73rem', color: '#2e4560' }}>
                                                <button type="button" onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: '#2e4560', cursor: 'pointer', fontSize: '0.73rem', transition: 'color 0.15s' }}
                                                    onMouseEnter={e => e.currentTarget.style.color = '#475569'}
                                                    onMouseLeave={e => e.currentTarget.style.color = '#2e4560'}>
                                                    Acceso staff / administración →
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>{/* fin maxWidth wrapper */}
                        </div>{/* fin contenido */}
                    </div>
                )}
            </div>
        </>
    );
};

export default LoginCliente;
