import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import '../../estilos/escritorio/admin.css';
import '../../estilos/movil/admin-responsivo.css';

/**
 * LoginCliente — Dedicated client login page.
 * Authenticates via CI + Password against mockClientDB.
 * Fix #6: supports ?redirect= param to return user to their original page.
 */
const LoginCliente = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get('redirect') || '/';
    const { loginComoCliente } = useAuth();

    const [ci, setCi] = useState('');
    const [password, setPassword] = useState('');
    const [recordar, setRecordar] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [mostrarPassword, setMostrarPassword] = useState(false);

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
        background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9',
        padding: '0.85rem', borderRadius: '10px', fontSize: '0.95rem',
    };

    return (
        <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{ width: '100%', maxWidth: '420px' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🚌</div>
                    <h1 style={{ fontSize: '1.4rem', marginBottom: '0.3rem' }}>Bienvenido de vuelta</h1>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Ingresa con tu CI para acceder a tu cuenta</p>
                </div>

                {/* Login Card */}
                <div style={{
                    background: '#1e293b', borderRadius: '16px', padding: '2rem',
                    border: '1px solid #334155', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}>
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div style={{
                                background: 'rgba(239,68,68,0.1)', color: '#fca5a5',
                                padding: '0.8rem', borderRadius: '8px',
                                border: '1px solid #7f1d1d', fontSize: '0.85rem',
                                marginBottom: '1.25rem',
                            }}>
                                ❌ {error}
                            </div>
                        )}

                        {/* CI Input */}
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 500 }}>
                                Carnet de Identidad (CI)
                            </label>
                            <input type="text" value={ci} onChange={e => setCi(e.target.value)}
                                placeholder="Ej. 1234567" required style={inputStyle}
                            />
                        </div>

                        {/* Password Input */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 500 }}>
                                Contraseña
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input type={mostrarPassword ? 'text' : 'password'} value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Tu contraseña" required
                                    style={{ ...inputStyle, paddingRight: '3rem' }}
                                />
                                <button type="button" onClick={() => setMostrarPassword(!mostrarPassword)}
                                    style={{
                                        position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
                                        background: 'transparent', border: 'none', color: '#64748b',
                                        cursor: 'pointer', fontSize: '1.1rem', padding: '0.5rem',
                                    }}>
                                    {mostrarPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        {/* Recordar sesión */}
                        <label style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            color: '#94a3b8', fontSize: '0.85rem', cursor: 'pointer',
                            marginBottom: '1.25rem',
                        }}>
                            <input
                                type="checkbox"
                                checked={recordar}
                                onChange={e => setRecordar(e.target.checked)}
                                style={{ accentColor: '#3b82f6', width: '16px', height: '16px' }}
                                id="check-recordar-cliente"
                            />
                            Recordar sesión
                        </label>

                        {/* Submit */}
                        <button type="submit" disabled={loading || !ci || !password}
                            style={{
                                width: '100%', padding: '0.9rem', border: 'none', borderRadius: '10px',
                                background: (loading || !ci || !password) ? '#475569' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                color: 'white', fontWeight: 700, fontSize: '1rem',
                                cursor: (loading || !ci || !password) ? 'not-allowed' : 'pointer',
                                boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
                            }}>
                            {loading ? 'Verificando...' : 'Iniciar Sesión'}
                        </button>
                    </form>
                </div>

                {/* Footer links */}
                <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
                    <span style={{ color: '#64748b' }}>¿No tienes cuenta? </span>
                    <Link to="/registro" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>
                        Regístrate aquí
                    </Link>
                </div>
                <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                    <Link to="/login" style={{ color: '#475569', textDecoration: 'none', fontSize: '0.8rem' }}>
                        Acceso Staff / Admin →
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LoginCliente;
