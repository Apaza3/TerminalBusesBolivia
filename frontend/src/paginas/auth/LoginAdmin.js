import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import '../../estilos/escritorio/admin.css'; // Reutilizamos estilos form admin

const LoginAdmin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { exito, error: loginError } = await login(email, password);
        
        if (exito) {
            navigate('/admin/dashboard', { replace: true });
        } else {
            setError(loginError || 'Credenciales inválidas. Por favor, intente de nuevo.');
            setLoading(false);
        }
    };

    return (
        <div className="pagina-admin" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            <div className="admin-contenido" style={{ maxWidth: '400px', width: '100%', margin: '0 auto', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#f1f5f9' }}>
                        Acceso Staff
                    </h1>
                    <div className="admin-header-sub" style={{ justifyContent: 'center' }}>
                        Terminal de Buses Bolivia
                    </div>
                </div>

                <form onSubmit={handleLogin} noValidate>
                    {error && (
                        <div className="admin-feedback error" style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '8px' }}>
                            {error}
                        </div>
                    )}

                    <div className="campo-grupo">
                        <label className="campo-label">Correo Electrónico</label>
                        <input
                            type="email"
                            className="campo-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@tbb.com"
                            required
                        />
                    </div>

                    <div className="campo-grupo">
                        <label className="campo-label">Contraseña</label>
                        <input
                            type="password"
                            className="campo-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-admin-guardar"
                        style={{ width: '100%', marginTop: '1rem', padding: '0.8rem' }}
                        disabled={loading || !email || !password}
                    >
                        {loading ? 'Verificando...' : 'Iniciar Sesión'}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
                    Solo personal autorizado. <br/>
                    Si olvidó su contraseña, contacte a TI.
                </div>
            </div>
        </div>
    );
};

export default LoginAdmin;
