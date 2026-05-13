import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import '../../estilos/escritorio/admin.css';

const ROL_REDIRECT = {
    admin_sucursal: '/admin/dashboard',
    cajero: '/cajero/panel',
    conductor: '/conductor/panel',
};

const LoginAdmin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [recordar, setRecordar] = useState(false);
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { exito, error: loginError, usuario } = await login(email, password, recordar);

        if (exito) {
            // Obtener el perfil actualizado del contexto para saber el rol
            // login ya guarda el perfil en contexto; obtenemos rol del resultado
            const perfil = JSON.parse(
                localStorage.getItem('tbb_session') ||
                sessionStorage.getItem('tbb_session') ||
                '{}'
            );
            const destino = ROL_REDIRECT[perfil.rol] || '/admin/dashboard';
            navigate(destino, { replace: true });
        } else {
            setError(loginError || 'Credenciales inválidas.');
            setLoading(false);
        }
    };

    return (
        <div className="pagina-admin" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            <div className="admin-contenido" style={{ maxWidth: '400px', width: '100%', margin: '0 auto', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔐</div>
                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.3rem', color: '#f1f5f9' }}>
                        Acceso Staff
                    </h1>
                    <div className="admin-header-sub" style={{ justifyContent: 'center', fontSize: '0.8rem' }}>
                        Admin · Cajero · Conductor
                    </div>
                </div>

                <form onSubmit={handleLogin} noValidate>
                    {error && (
                        <div className="admin-feedback error" style={{ marginBottom: '1rem' }}>
                            ❌ {error}
                        </div>
                    )}

                    <div className="campo-grupo">
                        <label className="campo-label">Correo Electrónico</label>
                        <input
                            type="email"
                            className="campo-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="correo@tbb.com"
                            required
                            id="input-email-staff"
                        />
                    </div>

                    <div className="campo-grupo">
                        <label className="campo-label">Contraseña</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={mostrarPassword ? 'text' : 'password'}
                                className="campo-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                style={{ paddingRight: '3rem' }}
                                id="input-password-staff"
                            />
                            <button
                                type="button"
                                onClick={() => setMostrarPassword(!mostrarPassword)}
                                style={{
                                    position: 'absolute', right: '0.75rem', top: '50%',
                                    transform: 'translateY(-50%)', background: 'transparent',
                                    border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.1rem',
                                }}
                            >
                                {mostrarPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    {/* Recordar sesión */}
                    <label style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        color: '#94a3b8', fontSize: '0.85rem', cursor: 'pointer',
                        marginBottom: '1.25rem', padding: '0.4rem 0',
                    }}>
                        <input
                            type="checkbox"
                            checked={recordar}
                            onChange={e => setRecordar(e.target.checked)}
                            style={{ accentColor: '#3b82f6', width: '16px', height: '16px' }}
                            id="check-recordar"
                        />
                        Recordar sesión
                    </label>

                    <button
                        type="submit"
                        className="btn-admin-guardar"
                        style={{ width: '100%', padding: '0.8rem' }}
                        disabled={loading || !email || !password}
                        id="btn-login-staff"
                    >
                        {loading ? 'Verificando...' : 'Iniciar Sesión'}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
                    ¿Eres pasajero?{' '}
                    <Link to="/login-cliente" style={{ color: '#60a5fa', textDecoration: 'none' }}>
                        Acceso Cliente →
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LoginAdmin;
