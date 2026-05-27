import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../servicios/supabase';

/**
 * RecuperarPassword — Supabase password recovery flow.
 * Step 1: User enters email → Supabase sends recovery link
 * Step 2: User arrives via recovery link → shows new password form
 * Step 3: supabase.auth.updateUser({ password }) → done
 */

const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: '#0f172a', border: '1px solid #334155',
    color: '#f1f5f9', padding: '0.75rem 1rem', borderRadius: '10px',
    fontSize: '0.9rem', outline: 'none', marginBottom: '0.75rem',
};

const btnStyle = {
    width: '100%', padding: '0.8rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: 'white', border: 'none', borderRadius: '10px',
    fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem', marginTop: '0.5rem',
};

const RecuperarPassword = () => {
    const navigate = useNavigate();
    const [paso, setPaso] = useState('solicitar'); // solicitar | enviado | nueva | listo
    const [email, setEmail] = useState('');
    const [nuevaPassword, setNuevaPassword] = useState('');
    const [confirmar, setConfirmar] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Detect recovery link hash from Supabase email
    useEffect(() => {
        const hash = window.location.hash;
        if (hash.includes('type=recovery') || hash.includes('access_token')) {
            setPaso('nueva');
        }
    }, []);

    const handleSolicitar = async (e) => {
        e.preventDefault();
        setError('');
        if (!email.trim()) { setError('Ingresa tu correo electrónico.'); return; }
        setLoading(true);
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
            redirectTo: `${window.location.origin}/recuperar-password`,
        });
        setLoading(false);
        if (err) { setError(err.message); return; }
        setPaso('enviado');
    };

    const handleResetear = async (e) => {
        e.preventDefault();
        setError('');
        if (nuevaPassword.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
        if (nuevaPassword !== confirmar) { setError('Las contraseñas no coinciden.'); return; }
        setLoading(true);
        const { error: err } = await supabase.auth.updateUser({ password: nuevaPassword });
        setLoading(false);
        if (err) { setError(err.message); return; }
        setPaso('listo');
        setTimeout(() => navigate('/login-admin'), 2000);
    };

    return (
        <div style={{ background: '#0f172a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{
                background: '#1e293b', borderRadius: '16px', border: '1px solid #334155',
                padding: '2rem', maxWidth: '400px', width: '100%',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '2.5rem' }}>🔑</div>
                    <h1 style={{ margin: '0.5rem 0 0.25rem', fontSize: '1.3rem', color: '#f1f5f9' }}>Recuperar Contraseña</h1>
                    <p style={{ color: '#64748b', fontSize: '0.82rem', margin: 0 }}>Terminal Buses Bolivia</p>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid #7f1d1d',
                        color: '#fca5a5', padding: '0.75rem', borderRadius: '8px',
                        fontSize: '0.85rem', marginBottom: '1rem',
                    }}>{error}</div>
                )}

                {/* Paso 1: Ingresar email */}
                {paso === 'solicitar' && (
                    <form onSubmit={handleSolicitar}>
                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                            Correo electrónico
                        </label>
                        <input
                            type="email" style={inputStyle} value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="tu@correo.com" required autoFocus
                        />
                        <button type="submit" style={{ ...btnStyle, opacity: loading ? 0.7 : 1 }} disabled={loading}>
                            {loading ? 'Enviando...' : '📧 Enviar enlace de recuperación'}
                        </button>
                        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                            <Link to="/login-admin" style={{ color: '#3b82f6', fontSize: '0.82rem', textDecoration: 'none' }}>
                                ← Volver al inicio de sesión
                            </Link>
                        </div>
                    </form>
                )}

                {/* Paso 2: Email enviado */}
                {paso === 'enviado' && (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📬</div>
                        <div style={{ color: '#6ee7b7', fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>
                            ¡Enlace enviado!
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5 }}>
                            Revisa tu correo <strong style={{ color: '#f1f5f9' }}>{email}</strong> y haz clic en el enlace para restablecer tu contraseña.
                        </div>
                        <div style={{ marginTop: '1.5rem' }}>
                            <Link to="/login-admin" style={{ color: '#3b82f6', fontSize: '0.82rem', textDecoration: 'none' }}>
                                ← Volver al inicio de sesión
                            </Link>
                        </div>
                    </div>
                )}

                {/* Paso 3: Nueva contraseña (llega vía link de email) */}
                {paso === 'nueva' && (
                    <form onSubmit={handleResetear}>
                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                            Nueva contraseña
                        </label>
                        <input
                            type="password" style={inputStyle} value={nuevaPassword}
                            onChange={e => setNuevaPassword(e.target.value)}
                            placeholder="Mínimo 8 caracteres" required
                        />
                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                            Confirmar contraseña
                        </label>
                        <input
                            type="password" style={inputStyle} value={confirmar}
                            onChange={e => setConfirmar(e.target.value)}
                            placeholder="Repite la contraseña" required
                        />
                        <button type="submit" style={{ ...btnStyle, opacity: loading ? 0.7 : 1 }} disabled={loading}>
                            {loading ? 'Guardando...' : '✅ Establecer nueva contraseña'}
                        </button>
                    </form>
                )}

                {/* Paso 4: Listo */}
                {paso === 'listo' && (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                        <div style={{ color: '#6ee7b7', fontWeight: 700, fontSize: '1rem' }}>
                            Contraseña actualizada
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '0.5rem' }}>
                            Redirigiendo al inicio de sesión...
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecuperarPassword;
