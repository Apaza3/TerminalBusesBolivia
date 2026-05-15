import React, { useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * RecuperarPassword — Local password recovery simulation.
 * R3: Password recovery with expiration (30 min).
 * Generates a local recovery token stored in localStorage.
 * Since there's no email server, shows token on screen (for dev).
 */

const STORAGE_KEY = 'tbb_recovery_tokens';

const leerTokens = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
};

const guardarTokens = (tokens) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
};

const generarToken = () => Math.random().toString(36).substr(2, 16).toUpperCase();

export const crearTokenRecuperacion = (email) => {
    const tokens = leerTokens().filter(t => t.email !== email); // Un token por email
    const token = generarToken();
    const expira = Date.now() + 30 * 60 * 1000; // 30 minutos
    tokens.push({ email: email.toLowerCase(), token, expira, usado: false });
    guardarTokens(tokens);
    return token;
};

export const validarTokenRecuperacion = (email, token) => {
    const tokens = leerTokens();
    const found = tokens.find(t =>
        t.email === email.toLowerCase() &&
        t.token === token.toUpperCase() &&
        !t.usado &&
        t.expira > Date.now()
    );
    return found ? { valido: true } : { valido: false, error: found ? 'Token expirado.' : 'Token inválido o expirado.' };
};

export const usarTokenParaResetear = (email, token, nuevaPassword) => {
    const tokens = leerTokens();
    const idx = tokens.findIndex(t =>
        t.email === email.toLowerCase() &&
        t.token === token.toUpperCase() &&
        !t.usado &&
        t.expira > Date.now()
    );
    if (idx === -1) return { exito: false, error: 'Token inválido o expirado.' };

    // Marcar como usado
    tokens[idx].usado = true;
    guardarTokens(tokens);

    // Actualizar password en mockAuthDB
    const STAFF_KEY = 'tbb_staff_users';
    try {
        const staff = JSON.parse(localStorage.getItem(STAFF_KEY)) || [];
        const su = staff.findIndex(u => u.email === email.toLowerCase());
        if (su !== -1) {
            staff[su].password = nuevaPassword;
            localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
            return { exito: true };
        }
    } catch { }

    // También intentar en mockClientDB
    const CLIENT_KEY = 'tbb_clientes';
    try {
        const clientes = JSON.parse(localStorage.getItem(CLIENT_KEY)) || [];
        const cu = clientes.findIndex(c => c.email === email.toLowerCase());
        if (cu !== -1) {
            clientes[cu].password = nuevaPassword;
            localStorage.setItem(CLIENT_KEY, JSON.stringify(clientes));
            return { exito: true };
        }
    } catch { }

    return { exito: false, error: 'Usuario no encontrado.' };
};

// ── Component ─────────────────────────────────────────

const RecuperarPassword = () => {
    const [paso, setPaso] = useState('solicitar'); // solicitar | token | nueva | listo
    const [email, setEmail] = useState('');
    const [tokenGenerado, setTokenGenerado] = useState('');
    const [tokenIngresado, setTokenIngresado] = useState('');
    const [nuevaPassword, setNuevaPassword] = useState('');
    const [confirmar, setConfirmar] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSolicitar = (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Verificar que el email existe (staff o cliente)
        const staff = JSON.parse(localStorage.getItem('tbb_staff_users') || '[]');
        const clientes = JSON.parse(localStorage.getItem('tbb_clientes') || '[]');
        const existe = staff.some(u => u.email === email.toLowerCase()) ||
            clientes.some(c => c.email === email.toLowerCase());

        setTimeout(() => {
            setLoading(false);
            if (!existe) {
                setError('No existe una cuenta con ese correo.');
                return;
            }
            const token = crearTokenRecuperacion(email);
            setTokenGenerado(token);
            setPaso('token');
        }, 800);
    };

    const handleVerificarToken = (e) => {
        e.preventDefault();
        setError('');
        const resultado = validarTokenRecuperacion(email, tokenIngresado);
        if (resultado.valido) {
            setPaso('nueva');
        } else {
            setError('Código inválido o expirado. Intenta de nuevo.');
        }
    };

    const handleResetear = (e) => {
        e.preventDefault();
        setError('');
        if (nuevaPassword.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (nuevaPassword !== confirmar) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        const resultado = usarTokenParaResetear(email, tokenIngresado, nuevaPassword);
        if (resultado.exito) {
            setPaso('listo');
        } else {
            setError(resultado.error);
        }
    };

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
                    }}>
                        ❌ {error}
                    </div>
                )}

                {/* Paso 1: Solicitar */}
                {paso === 'solicitar' && (
                    <form onSubmit={handleSolicitar}>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' }}>
                            Ingresa tu correo y te enviaremos un código de recuperación (válido por 30 minutos).
                        </p>
                        <input
                            type="email" value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="tu@correo.com"
                            style={inputStyle} required
                        />
                        <button type="submit" style={btnStyle} disabled={loading}>
                            {loading ? 'Verificando...' : 'Enviar Código →'}
                        </button>
                    </form>
                )}

                {/* Paso 2: Token */}
                {paso === 'token' && (
                    <form onSubmit={handleVerificarToken}>
                        <div style={{
                            background: 'rgba(16,185,129,0.08)', border: '1px solid #065f46',
                            borderRadius: '10px', padding: '1rem', marginBottom: '1rem',
                        }}>
                            <p style={{ color: '#6ee7b7', fontSize: '0.82rem', margin: '0 0 0.5rem' }}>
                                ✅ Código generado (en producción se enviaría al correo):
                            </p>
                            <div style={{
                                fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 700,
                                color: '#10b981', letterSpacing: '0.1em', textAlign: 'center',
                            }}>
                                {tokenGenerado}
                            </div>
                            <div style={{ color: '#475569', fontSize: '0.7rem', textAlign: 'center', marginTop: '0.3rem' }}>
                                Expira en 30 minutos
                            </div>
                        </div>
                        <input
                            type="text" value={tokenIngresado}
                            onChange={e => setTokenIngresado(e.target.value.toUpperCase())}
                            placeholder="Ingresa el código"
                            style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.1em', textAlign: 'center' }}
                            required maxLength={16}
                        />
                        <button type="submit" style={btnStyle}>
                            Verificar Código →
                        </button>
                    </form>
                )}

                {/* Paso 3: Nueva password */}
                {paso === 'nueva' && (
                    <form onSubmit={handleResetear}>
                        <p style={{ color: '#6ee7b7', fontSize: '0.85rem', marginBottom: '1rem' }}>
                            ✅ Código verificado. Ingresa tu nueva contraseña.
                        </p>
                        <input
                            type="password" value={nuevaPassword}
                            onChange={e => setNuevaPassword(e.target.value)}
                            placeholder="Nueva contraseña (mín. 8 caracteres)"
                            style={inputStyle} required minLength={8}
                        />
                        <input
                            type="password" value={confirmar}
                            onChange={e => setConfirmar(e.target.value)}
                            placeholder="Confirmar contraseña"
                            style={inputStyle} required
                        />
                        <button type="submit" style={btnStyle}>
                            Cambiar Contraseña
                        </button>
                    </form>
                )}

                {/* Paso 4: Listo */}
                {paso === 'listo' && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎉</div>
                        <p style={{ color: '#6ee7b7', fontWeight: 600, marginBottom: '0.5rem' }}>
                            ¡Contraseña cambiada exitosamente!
                        </p>
                        <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                            Ya puedes iniciar sesión con tu nueva contraseña.
                        </p>
                        <Link to="/login" style={{
                            display: 'block', padding: '0.75rem', background: '#3b82f6',
                            color: 'white', borderRadius: '10px', textDecoration: 'none',
                            fontWeight: 600, fontSize: '0.9rem',
                        }}>
                            Ir al Login Staff
                        </Link>
                        <Link to="/login-cliente" style={{
                            display: 'block', marginTop: '0.5rem', padding: '0.75rem',
                            background: 'transparent', color: '#60a5fa',
                            border: '1px solid #334155', borderRadius: '10px',
                            textDecoration: 'none', fontSize: '0.85rem',
                        }}>
                            Ir al Login Cliente
                        </Link>
                    </div>
                )}

                {paso !== 'listo' && (
                    <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.82rem', color: '#475569' }}>
                        <Link to="/login" style={{ color: '#60a5fa', textDecoration: 'none' }}>
                            ← Volver al Login
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecuperarPassword;
