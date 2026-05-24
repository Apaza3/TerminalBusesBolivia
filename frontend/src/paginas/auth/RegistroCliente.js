import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { registrarCliente, calcularEdad, esMayorDeEdad, existeCI } from '../../data/mockClientDB';
import { useDepartamento } from '../../contextos/DepartamentoContext';
import NavbarUniversal from '../../componentes/NavbarUniversal';
import { getDeptFondo } from '../../utils/assets';
import gsap from 'gsap';

const PASOS_MOBILE = [
    { id: 1, label: 'Personal', icon: '👤' },
    { id: 2, label: 'Acceso',   icon: '📧' },
    { id: 3, label: 'Foto',     icon: '📷' },
    { id: 4, label: 'Docs',     icon: '🪪' },
];


const EyeOpen = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
    </svg>
);
const EyeClosed = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
);

const RegistroCliente = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get('redirect') || '/';
    const { departamento, tema } = useDepartamento();

    const rootRef = useRef(null);

    // Responsive
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const h = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);

    // Mobile wizard step
    const [pasoMobile, setPasoMobile] = useState(1);
    const [errorMobile, setErrorMobile] = useState(null);

    // Form fields
    const [nombre,           setNombre]           = useState('');
    const [ci,               setCi]               = useState('');
    const [fechaNacimiento,  setFechaNacimiento]  = useState('');
    const [email,            setEmail]            = useState('');
    const [telefono,         setTelefono]         = useState('');
    const [password,         setPassword]         = useState('');
    const [confirmPassword,  setConfirmPassword]  = useState('');
    const [mostrarPass,      setMostrarPass]      = useState(false);
    const [mostrarPassConf,  setMostrarPassConf]  = useState(false);

    // Validation
    const [ciValido,       setCiValido]       = useState(null);
    const [edadValida,     setEdadValida]     = useState(null);
    const [edadCalculada,  setEdadCalculada]  = useState(null);

    // File uploads
    const [fotoPerfilPrev, setFotoPerfilPrev] = useState(null);
    const [fotoPerfil,     setFotoPerfil]     = useState(null);
    const [ciAnvPrev,      setCiAnvPrev]      = useState(null);
    const [ciAnv,          setCiAnv]          = useState(null);
    const [ciRevPrev,      setCiRevPrev]      = useState(null);
    const [ciRev,          setCiRev]          = useState(null);

    // UI
    const [cargando, setCargando] = useState(false);
    const [toast,    setToast]    = useState(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-r="card"]', { y: 20, opacity: 0, duration: 0.55, stagger: 0.1, ease: 'power3.out', delay: 0.1 });
        }, rootRef);
        return () => ctx.revert();
    }, [isMobile]);

    const mostrarToast = useCallback((tipo, texto) => {
        setToast({ tipo, texto });
        setTimeout(() => setToast(null), 5000);
    }, []);

    const handleFileToBase64 = (file, setB64, setPrev) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { mostrarToast('error', 'Archivo demasiado grande (máx. 5MB).'); return; }
        const r = new FileReader();
        r.onload = () => { setB64(r.result); setPrev(r.result); };
        r.readAsDataURL(file);
    };

    const handleCiBlur = () => {
        if (ci.length >= 5) setCiValido(!existeCI(ci));
        else setCiValido(null);
    };

    const handleFecha = (v) => {
        setFechaNacimiento(v);
        if (v) { setEdadCalculada(calcularEdad(v)); setEdadValida(esMayorDeEdad(v)); }
        else { setEdadCalculada(null); setEdadValida(null); }
    };

    const validarPaso = (p) => {
        if (p === 1) {
            if (!nombre.trim()) return 'Ingresa tu nombre completo.';
            if (ci.length < 5) return 'Ingresa un CI válido (mínimo 5 dígitos).';
            if (ciValido === false) return 'Este CI ya está registrado.';
            if (!fechaNacimiento) return 'Ingresa tu fecha de nacimiento.';
            if (edadValida === false) return 'Debes ser mayor de 18 años.';
        }
        if (p === 2) {
            if (!email.trim()) return 'El email es obligatorio.';
            if (!password) return 'Ingresa una contraseña.';
            if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
            if (password !== confirmPassword) return 'Las contraseñas no coinciden.';
        }
        return null;
    };

    const handleContinuar = () => {
        const err = validarPaso(pasoMobile);
        if (err) { setErrorMobile(err); return; }
        setErrorMobile(null);
        setPasoMobile(p => p + 1);
    };

    const submitData = () => {
        const err1 = validarPaso(1);
        const err2 = validarPaso(2);
        if (err1 || err2) { mostrarToast('error', err1 || err2); return; }
        setCargando(true);
        setTimeout(() => {
            const res = registrarCliente({ nombreCompleto: nombre, ci, telefono, email, password, fechaNacimiento, fotoPerfil, ciAnverso: ciAnv, ciReverso: ciRev });
            if (res.exito) {
                mostrarToast('exito', '¡Cuenta creada! Redirigiendo al login...');
                const url = redirectTo !== '/' ? `/login-cliente?redirect=${encodeURIComponent(redirectTo)}` : '/login-cliente';
                setTimeout(() => navigate(url), 2000);
            } else {
                mostrarToast('error', res.error);
            }
            setCargando(false);
        }, 300);
    };

    const handleSubmit = (e) => {
        if (e?.preventDefault) e.preventDefault();
        submitData();
    };

    const hoy = new Date().toISOString().split('T')[0];

    // ── Estilos ──────────────────────────────────────────────────────────
    const card = (extra = {}) => ({
        background: 'rgba(10,18,35,0.74)',
        backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
        border: `1px solid ${tema.color}28`,
        borderRadius: 20,
        boxShadow: '0 8px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)',
        ...extra,
    });

    const inp = (extra = {}) => ({
        width: '100%', boxSizing: 'border-box',
        background: 'rgba(7,17,31,0.65)',
        border: `1px solid ${tema.color}30`,
        color: '#dde5f0', padding: '0.55rem 0.85rem',
        borderRadius: 9, fontSize: '0.88rem', outline: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        ...extra,
    });

    const lbl = { display: 'block', fontSize: '0.68rem', fontWeight: 600, color: `${tema.acento}90`, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem' };

    const focusIn  = (e) => { e.target.style.borderColor = tema.color; e.target.style.boxShadow = `0 0 0 2px ${tema.color}20`; };
    const focusOut = (e) => { e.target.style.borderColor = `${tema.color}30`; e.target.style.boxShadow = 'none'; };

    const seccion = (title, icon) => (
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: tema.acento, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>{icon}</span>{title}
        </div>
    );

    const uploadZone = (prev, onFile, label, h = 80) => (
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: h, borderRadius: 10, cursor: 'pointer', border: `1.5px dashed ${prev ? tema.color : tema.color + '30'}`, background: prev ? `${tema.color}08` : 'rgba(7,17,31,0.4)', overflow: 'hidden', transition: 'all 0.2s' }}>
            {prev
                ? <img src={prev} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <><span style={{ fontSize: '1.4rem', color: `${tema.acento}60` }}>📄</span><span style={{ fontSize: '0.62rem', color: `${tema.acento}50`, marginTop: '0.25rem' }}>Toca para subir</span></>
            }
            <input type="file" accept="image/*" hidden onChange={e => onFile(e.target.files[0])} />
        </label>
    );

    const canSubmit = !cargando && edadValida !== false && ciValido !== false;
    const bg = getDeptFondo(departamento);

    // ════════════════════════════════════════════════════════════════════
    return (
        <>
        <NavbarUniversal />
        <div ref={rootRef} style={{ height: 'calc(100vh - 76px)', overflow: 'hidden', position: 'relative', fontFamily: "'Inter', system-ui, sans-serif", color: '#dde5f0' }}>

            {/* Toast */}
            {toast && (
                <div style={{ position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 999, padding: '0.8rem 1.4rem', borderRadius: 10, background: toast.tipo === 'exito' ? '#064e3b' : '#7f1d1d', color: toast.tipo === 'exito' ? '#6ee7b7' : '#fca5a5', border: `1px solid ${toast.tipo === 'exito' ? '#10b981' : '#ef4444'}`, fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                    {toast.tipo === 'exito' ? '✅' : '❌'} {toast.texto}
                </div>
            )}

            {/* Fondo */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.18) saturate(0.5)', zIndex: 0 }} />
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: `linear-gradient(135deg, ${tema.bg}f5 0%, ${tema.bg}cc 50%, ${tema.bg}99 100%)` }} />
            <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1, width: 600, height: 600, background: `radial-gradient(circle, ${tema.color}14 0%, transparent 65%)`, pointerEvents: 'none' }} />

            {/* ════════ MOBILE WIZARD ════════ */}
            {isMobile ? (
                <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    {/* Progress bar */}
                    <div style={{ background: 'rgba(10,18,35,0.7)', borderBottom: `1px solid ${tema.color}18`, padding: '0.65rem 1.25rem', flexShrink: 0 }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start' }}>
                            <div style={{ position: 'absolute', top: 13, left: `${100 / (PASOS_MOBILE.length * 2)}%`, right: `${100 / (PASOS_MOBILE.length * 2)}%`, height: 2, background: '#1e293b', zIndex: 0 }} />
                            <div style={{ position: 'absolute', top: 13, left: `${100 / (PASOS_MOBILE.length * 2)}%`, height: 2, background: tema.color, transition: 'width 0.4s ease', zIndex: 1, width: `${Math.max(0, (pasoMobile - 1) / (PASOS_MOBILE.length - 1)) * (100 - 100 / PASOS_MOBILE.length)}%` }} />
                            {PASOS_MOBILE.map((p) => {
                                const comp = pasoMobile > p.id;
                                const act  = pasoMobile === p.id;
                                return (
                                    <div key={p.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: comp ? tema.color : act ? `${tema.color}35` : '#1e293b', border: `2px solid ${comp || act ? tema.color : '#334155'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: comp ? '#fff' : act ? tema.acento : '#475569', transition: 'all 0.3s', cursor: comp ? 'pointer' : 'default' }}
                                            onClick={() => { if (comp) setPasoMobile(p.id); }}>
                                            {comp ? '✓' : p.icon}
                                        </div>
                                        <span style={{ fontSize: '0.6rem', color: act ? tema.acento : comp ? '#94a3b8' : '#334155', marginTop: '0.25rem', fontWeight: act ? 700 : 400 }}>{p.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Contenido: card + botones juntos */}
                    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: '1rem 1.25rem 1.25rem', gap: '0.75rem', overflowY: 'auto' }}>

                        {/* Card del paso */}
                        <div data-r="card" style={{ ...card({ padding: '1.1rem 1.25rem' }) }}>
                            {errorMobile && (
                                <div style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid rgba(239,68,68,0.25)', fontSize: '0.78rem', marginBottom: '0.75rem' }}>
                                    {errorMobile}
                                </div>
                            )}

                            {/* PASO 1 — Datos personales */}
                            {pasoMobile === 1 && (
                                <>
                                    {seccion('Datos personales', '👤')}
                                    <div style={{ marginBottom: '0.6rem' }}>
                                        <label style={lbl}>Nombre completo *</label>
                                        <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Juan Carlos Pérez" style={inp()} onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                                        <div>
                                            <label style={lbl}>CI *</label>
                                            <input value={ci} onChange={e => { setCi(e.target.value); setCiValido(null); }} onBlur={handleCiBlur} placeholder="1234567" style={inp({ borderColor: ciValido === false ? '#ef4444' : ciValido === true ? '#10b981' : `${tema.color}30` })} onFocus={focusIn} />
                                            {ciValido === false && <span style={{ fontSize: '0.65rem', color: '#ef4444' }}>CI ya registrado</span>}
                                            {ciValido === true  && <span style={{ fontSize: '0.65rem', color: '#10b981' }}>✓ Disponible</span>}
                                        </div>
                                        <div>
                                            <label style={lbl}>Fecha nacimiento *</label>
                                            <input type="date" value={fechaNacimiento} onChange={e => handleFecha(e.target.value)} max={hoy} style={inp({ borderColor: edadValida === false ? '#ef4444' : edadValida === true ? '#10b981' : `${tema.color}30` })} onFocus={focusIn} onBlur={focusOut} />
                                            {edadCalculada !== null && <span style={{ fontSize: '0.65rem', color: edadValida ? '#10b981' : '#ef4444' }}>{edadValida ? `✓ ${edadCalculada} años` : `✗ ${edadCalculada} años`}</span>}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* PASO 2 — Contacto y acceso */}
                            {pasoMobile === 2 && (
                                <>
                                    {seccion('Contacto y acceso', '📧')}
                                    <div style={{ marginBottom: '0.6rem' }}>
                                        <label style={lbl}>Email * <span style={{ color: `${tema.acento}60`, fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>(para boletos)</span></label>
                                        <input type="text" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" style={inp()} onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                    <div style={{ marginBottom: '0.6rem' }}>
                                        <label style={lbl}>Teléfono <span style={{ color: '#475569', textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
                                        <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="77012345" style={inp()} onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                    <div style={{ marginBottom: '0.6rem' }}>
                                        <label style={lbl}>Contraseña *</label>
                                        <div style={{ position: 'relative' }}>
                                            <input type={mostrarPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mín. 6 caracteres" style={inp({ paddingRight: '2.8rem' })} onFocus={focusIn} onBlur={focusOut} />
                                            <button type="button" onClick={() => setMostrarPass(!mostrarPass)} style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#4d6a87', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.2rem' }}>
                                                {mostrarPass ? <EyeClosed /> : <EyeOpen />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={lbl}>Confirmar contraseña *</label>
                                        <div style={{ position: 'relative' }}>
                                            <input type={mostrarPassConf ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repite tu contraseña" style={inp({ paddingRight: '2.8rem', borderColor: confirmPassword && password !== confirmPassword ? '#ef4444' : confirmPassword && password === confirmPassword ? '#10b981' : `${tema.color}30` })} onFocus={focusIn} onBlur={focusOut} />
                                            <button type="button" onClick={() => setMostrarPassConf(!mostrarPassConf)} style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#4d6a87', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.2rem' }}>
                                                {mostrarPassConf ? <EyeClosed /> : <EyeOpen />}
                                            </button>
                                        </div>
                                        {confirmPassword && password !== confirmPassword && <span style={{ fontSize: '0.65rem', color: '#ef4444' }}>No coinciden</span>}
                                    </div>
                                </>
                            )}

                            {/* PASO 3 — Foto de perfil */}
                            {pasoMobile === 3 && (
                                <>
                                    {seccion('Foto de perfil', '📷')}
                                    <p style={{ fontSize: '0.78rem', color: '#475569', marginBottom: '1rem' }}>Opcional. Puedes agregarla después desde tu perfil.</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ width: 80, height: 80, borderRadius: '50%', border: `2px dashed ${tema.color}40`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(7,17,31,0.5)', flexShrink: 0 }}>
                                            {fotoPerfilPrev
                                                ? <img src={fotoPerfilPrev} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : <span style={{ fontSize: '2rem', color: `${tema.acento}50` }}>👤</span>
                                            }
                                        </div>
                                        <div>
                                            <label style={{ display: 'inline-block', padding: '0.5rem 1rem', borderRadius: 8, background: `${tema.color}15`, border: `1px solid ${tema.color}40`, color: tema.acento, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                                                {fotoPerfilPrev ? 'Cambiar foto' : 'Seleccionar foto'}
                                                <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => handleFileToBase64(e.target.files[0], setFotoPerfil, setFotoPerfilPrev)} />
                                            </label>
                                            <div style={{ color: '#475569', fontSize: '0.68rem', marginTop: '0.35rem' }}>JPG, PNG o WebP · máx 5MB</div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* PASO 4 — Documentos */}
                            {pasoMobile === 4 && (
                                <>
                                    {seccion('Documentos de identidad', '🪪')}
                                    <p style={{ fontSize: '0.78rem', color: '#475569', marginBottom: '0.85rem' }}>
                                        <strong style={{ color: `${tema.acento}80` }}>Obligatorio</strong> para verificar tu identidad.
                                        <span style={{ color: '#334155' }}> (Para pruebas puedes omitirlo.)</span>
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <div>
                                            <label style={{ ...lbl, textAlign: 'center', display: 'block', marginBottom: '0.4rem' }}>CI Anverso</label>
                                            {uploadZone(ciAnvPrev, f => handleFileToBase64(f, setCiAnv, setCiAnvPrev), 'CI Anverso', 100)}
                                        </div>
                                        <div>
                                            <label style={{ ...lbl, textAlign: 'center', display: 'block', marginBottom: '0.4rem' }}>CI Reverso</label>
                                            {uploadZone(ciRevPrev, f => handleFileToBase64(f, setCiRev, setCiRevPrev), 'CI Reverso', 100)}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Botones de navegación — debajo del card, pegados a él */}
                        <div style={{ display: 'flex', gap: '0.6rem', flexShrink: 0 }}>
                            {pasoMobile === 1 ? (
                                <button type="button" onClick={() => navigate('/login-cliente')} style={{ flex: 1, padding: '0.72rem', background: 'transparent', border: `1px solid ${tema.color}30`, color: '#64748b', borderRadius: 10, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                                    ← Iniciar sesión
                                </button>
                            ) : (
                                <button type="button" onClick={() => { setPasoMobile(p => p - 1); setErrorMobile(null); }} style={{ flex: 1, padding: '0.72rem', background: 'transparent', border: `1px solid ${tema.color}40`, color: tema.acento, borderRadius: 10, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                                    ← Atrás
                                </button>
                            )}
                            {pasoMobile < 4 && (
                                <>
                                    {pasoMobile >= 3 && (
                                        <button type="button" onClick={() => { setErrorMobile(null); setPasoMobile(p => p + 1); }} style={{ padding: '0.72rem 1rem', background: 'transparent', border: `1px solid ${tema.color}20`, color: '#475569', borderRadius: 10, fontWeight: 500, fontSize: '0.82rem', cursor: 'pointer' }}>
                                            Omitir
                                        </button>
                                    )}
                                    <button type="button" onClick={handleContinuar} style={{ flex: 2, padding: '0.72rem', background: `linear-gradient(135deg, ${tema.color}, ${tema.colorSecundario})`, border: 'none', color: '#fff', borderRadius: 10, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', boxShadow: `0 0 16px ${tema.color}40` }}>
                                        Continuar →
                                    </button>
                                </>
                            )}
                            {pasoMobile === 4 && (
                                <>
                                    <button type="button" onClick={() => { setErrorMobile(null); setPasoMobile(p => p + 1); }} style={{ padding: '0.72rem 1rem', background: 'transparent', border: `1px solid ${tema.color}20`, color: '#475569', borderRadius: 10, fontWeight: 500, fontSize: '0.82rem', cursor: 'pointer' }}>
                                        Omitir
                                    </button>
                                    <button type="button" onClick={() => { setErrorMobile(null); submitData(); }} disabled={cargando} style={{ flex: 2, padding: '0.72rem', background: canSubmit ? `linear-gradient(135deg, ${tema.color}, ${tema.colorSecundario})` : '#1a2d42', border: 'none', color: canSubmit ? '#fff' : '#4d6a87', borderRadius: 10, fontWeight: 700, fontSize: '0.88rem', cursor: canSubmit ? 'pointer' : 'not-allowed', boxShadow: canSubmit ? `0 0 16px ${tema.color}40` : 'none' }}>
                                        {cargando ? 'Creando...' : 'Crear mi cuenta'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

            ) : (
            /* ════════ DESKTOP 2-COL ════════ */
                <form onSubmit={handleSubmit} noValidate style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    {/* Contenido — dos columnas centradas */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '0 2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', width: '100%', maxWidth: 980 }}>

                    {/* ── Col izquierda — campos ── */}
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                        <div data-r="card" style={{ ...card({ padding: '1.75rem 1.75rem', width: '100%', maxWidth: 420 }) }}>

                            <div style={{ marginBottom: '1.1rem' }}>
                                <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '0.2rem', letterSpacing: '-0.025em' }}>Crear tu cuenta</h1>
                                <p style={{ color: '#4d6a87', fontSize: '0.78rem' }}>Regístrate para reservar tus viajes en línea.</p>
                            </div>

                            <div style={{ marginBottom: '0.6rem' }}>
                                <label style={lbl}>Nombre completo *</label>
                                <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Juan Carlos Pérez Mamani" style={inp()} onFocus={focusIn} onBlur={focusOut} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                                <div>
                                    <label style={lbl}>CI *</label>
                                    <input value={ci} onChange={e => { setCi(e.target.value); setCiValido(null); }} onBlur={handleCiBlur} placeholder="1234567" style={inp({ borderColor: ciValido === false ? '#ef4444' : ciValido === true ? '#10b981' : `${tema.color}30` })} onFocus={focusIn} />
                                    {ciValido === false && <span style={{ fontSize: '0.62rem', color: '#ef4444' }}>CI ya registrado</span>}
                                    {ciValido === true  && <span style={{ fontSize: '0.62rem', color: '#10b981' }}>✓ Disponible</span>}
                                </div>
                                <div>
                                    <label style={lbl}>Fecha nacimiento *</label>
                                    <input type="date" value={fechaNacimiento} onChange={e => handleFecha(e.target.value)} max={hoy} style={inp({ borderColor: edadValida === false ? '#ef4444' : edadValida === true ? '#10b981' : `${tema.color}30` })} onFocus={focusIn} onBlur={focusOut} />
                                    {edadCalculada !== null && <span style={{ fontSize: '0.62rem', color: edadValida ? '#10b981' : '#ef4444' }}>{edadValida ? `✓ ${edadCalculada} años` : `✗ ${edadCalculada} años`}</span>}
                                </div>
                            </div>

                            <div style={{ marginBottom: '0.6rem' }}>
                                <label style={lbl}>Email * <span style={{ color: `${tema.acento}55`, fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>(para boletos y mensajes)</span></label>
                                <input type="text" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" style={inp()} onFocus={focusIn} onBlur={focusOut} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                                <div>
                                    <label style={lbl}>Teléfono <span style={{ color: '#334155', textTransform: 'none', letterSpacing: 0 }}>(opc.)</span></label>
                                    <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="77012345" style={inp()} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                                <div>
                                    <label style={lbl}>Contraseña *</label>
                                    <div style={{ position: 'relative' }}>
                                        <input type={mostrarPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mín. 6 caracteres" style={inp({ paddingRight: '2.8rem' })} onFocus={focusIn} onBlur={focusOut} />
                                        <button type="button" onClick={() => setMostrarPass(!mostrarPass)} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#4d6a87', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.2rem', transition: 'color 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.color = tema.acento}
                                            onMouseLeave={e => e.currentTarget.style.color = '#4d6a87'}>
                                            {mostrarPass ? <EyeClosed /> : <EyeOpen />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '0.85rem' }}>
                                <label style={lbl}>Confirmar contraseña *</label>
                                <div style={{ position: 'relative' }}>
                                    <input type={mostrarPassConf ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repite tu contraseña" style={inp({ paddingRight: '2.8rem', borderColor: confirmPassword && password !== confirmPassword ? '#ef4444' : confirmPassword && password === confirmPassword ? '#10b981' : `${tema.color}30` })} onFocus={focusIn} onBlur={focusOut} />
                                    <button type="button" onClick={() => setMostrarPassConf(!mostrarPassConf)} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#4d6a87', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.2rem', transition: 'color 0.15s' }}
                                        onMouseEnter={e => e.currentTarget.style.color = tema.acento}
                                        onMouseLeave={e => e.currentTarget.style.color = '#4d6a87'}>
                                        {mostrarPassConf ? <EyeClosed /> : <EyeOpen />}
                                    </button>
                                </div>
                                {confirmPassword && password !== confirmPassword && <span style={{ fontSize: '0.62rem', color: '#ef4444' }}>Las contraseñas no coinciden</span>}
                            </div>

                            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#2e4560' }}>
                                ¿Ya tienes cuenta?{' '}
                                <button type="button" onClick={() => navigate('/login-cliente')} style={{ background: 'none', border: 'none', color: tema.acento, cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}>Inicia sesión</button>
                            </div>
                        </div>
                    </div>

                    {/* ── Col derecha — logo + fotos + submit ── */}
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
                        <div data-r="card" style={{ ...card({ padding: '1.6rem 1.6rem', width: '100%', maxWidth: 380 }) }}>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.1rem', paddingBottom: '1rem', borderBottom: `1px solid ${tema.color}18` }}>
                                <div style={{ width: 52, height: 52, borderRadius: 14, border: `2px solid ${tema.color}`, boxShadow: `0 0 20px ${tema.color}45, inset 0 0 10px ${tema.color}10`, background: `radial-gradient(circle at 30% 30%, ${tema.color}20, ${tema.bg})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                                    🚌
                                </div>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#f1f5f9', letterSpacing: '-0.02em' }}>Terminal<span style={{ color: tema.acento }}>Bolivia</span></div>
                                    <div style={{ fontSize: '0.68rem', color: `${tema.acento}80`, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{tema.emoji} {departamento}</div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                {seccion('Foto de perfil', '📷')}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                    <div style={{ width: 62, height: 62, borderRadius: '50%', border: `2px dashed ${tema.color}40`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(7,17,31,0.5)', flexShrink: 0 }}>
                                        {fotoPerfilPrev ? <img src={fotoPerfilPrev} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '1.5rem', color: `${tema.acento}50` }}>👤</span>}
                                    </div>
                                    <div>
                                        <label style={{ display: 'inline-block', padding: '0.4rem 0.85rem', borderRadius: 8, background: `${tema.color}15`, border: `1px solid ${tema.color}35`, color: tema.acento, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                                            {fotoPerfilPrev ? 'Cambiar' : 'Seleccionar foto'}
                                            <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => handleFileToBase64(e.target.files[0], setFotoPerfil, setFotoPerfilPrev)} />
                                        </label>
                                        <div style={{ color: '#334155', fontSize: '0.62rem', marginTop: '0.25rem' }}>Opcional · JPG, PNG, WebP · máx 5MB</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.1rem' }}>
                                {seccion('Documentos de identidad', '🪪')}
                                <p style={{ fontSize: '0.72rem', color: '#475569', marginBottom: '0.65rem' }}>
                                    <strong style={{ color: `${tema.acento}80` }}>Obligatorio</strong> para verificar tu identidad.
                                    <span style={{ color: '#334155' }}> Para pruebas puedes omitirlos.</span>
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                                    <div>
                                        <div style={{ ...lbl, textAlign: 'center', marginBottom: '0.3rem' }}>CI Anverso</div>
                                        {uploadZone(ciAnvPrev, f => handleFileToBase64(f, setCiAnv, setCiAnvPrev), 'CI Anverso', 85)}
                                    </div>
                                    <div>
                                        <div style={{ ...lbl, textAlign: 'center', marginBottom: '0.3rem' }}>CI Reverso</div>
                                        {uploadZone(ciRevPrev, f => handleFileToBase64(f, setCiRev, setCiRevPrev), 'CI Reverso', 85)}
                                    </div>
                                </div>
                            </div>

                            <button type="submit" disabled={!canSubmit} style={{ width: '100%', padding: '0.78rem', background: canSubmit ? `linear-gradient(135deg, ${tema.color}, ${tema.colorSecundario})` : '#1a2d42', border: 'none', color: canSubmit ? '#fff' : '#4d6a87', borderRadius: 11, fontWeight: 700, fontSize: '0.9rem', cursor: canSubmit ? 'pointer' : 'not-allowed', transition: 'all 0.2s', boxShadow: canSubmit ? `0 0 20px ${tema.color}40` : 'none' }}
                                onMouseEnter={e => { if (canSubmit) { e.currentTarget.style.boxShadow = `0 0 32px ${tema.color}70`; e.currentTarget.style.transform = 'translateY(-1px)'; }}}
                                onMouseLeave={e => { e.currentTarget.style.boxShadow = canSubmit ? `0 0 20px ${tema.color}40` : 'none'; e.currentTarget.style.transform = 'none'; }}>
                                {cargando ? 'Creando cuenta...' : 'Crear mi cuenta →'}
                            </button>
                        </div>
                    </div>
                    </div>{/* fin maxWidth wrapper */}
                    </div>{/* fin contenido */}
                </form>
            )}
        </div>
        </>
    );
};

export default RegistroCliente;
