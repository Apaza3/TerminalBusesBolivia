import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contextos/AuthContext';

/**
 * PerfilIndicador — Navbar avatar/dropdown for auth state.
 * Fix #9: shows session status with circle avatar + dropdown menu.
 * If logged in: avatar with initial + dropdown (name, role, logout).
 * If not logged in: "Iniciar Sesión" + "Registrarse" buttons.
 */
const PerfilIndicador = () => {
    const { sesion, perfil, logout } = useAuth();
    const navigate = useNavigate();
    const [abierto, setAbierto] = useState(false);
    const ref = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setAbierto(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
        setAbierto(false);
        navigate('/');
    };

    const nombreMostrado = perfil?.nombreCompleto || perfil?.nombre_completo || perfil?.email || 'Cliente';
    const inicial = nombreMostrado.charAt(0).toUpperCase();
    const rolLabel = {
        admin_sucursal: '🛡️ Admin',
        cajero: '🏷️ Cajero',
        conductor: '🚌 Conductor',
        cliente: '👤 Cliente',
    }[perfil?.rol] || '👤';

    const colorAvatar = {
        admin_sucursal: '#3b82f6',
        cajero: '#f59e0b',
        conductor: '#10b981',
        cliente: '#8b5cf6',
    }[perfil?.rol] || '#8b5cf6';

    if (!sesion || !perfil) {
        return (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Link
                    to="/login-cliente"
                    className="nav-auth-btn"
                    style={{
                        padding: '0.45rem 0.9rem', borderRadius: '8px',
                        background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
                        border: '1px solid #4f46e5', textDecoration: 'none',
                        fontSize: '0.85rem', fontWeight: 600,
                        whiteSpace: 'nowrap',
                    }}
                >
                    Iniciar Sesión
                </Link>
                <Link
                    to="/registro"
                    className="nav-auth-btn"
                    style={{
                        padding: '0.45rem 0.9rem', borderRadius: '8px',
                        background: '#10b981', color: 'white',
                        border: 'none', textDecoration: 'none',
                        fontSize: '0.85rem', fontWeight: 600,
                        whiteSpace: 'nowrap',
                    }}
                >
                    Registrarse
                </Link>
            </div>
        );
    }

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            {/* Avatar button */}
            <button
                onClick={() => setAbierto(prev => !prev)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    background: 'transparent', border: '1px solid #334155',
                    color: '#f1f5f9', borderRadius: '50px', padding: '0.35rem 0.75rem 0.35rem 0.35rem',
                    cursor: 'pointer', transition: 'border-color 0.2s',
                }}
                title="Mi perfil"
            >
                <div style={{
                    width: '34px', height: '34px', borderRadius: '50%',
                    background: colorAvatar, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '1rem', color: 'white',
                    flexShrink: 0,
                }}>
                    {perfil.fotoPerfil
                        ? <img src={perfil.fotoPerfil} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        : inicial
                    }
                </div>
                <span style={{ fontSize: '0.85rem', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {nombreMostrado.split(' ')[0]}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{abierto ? '▲' : '▼'}</span>
            </button>

            {/* Dropdown */}
            {abierto && (
                <div style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 0.5rem)',
                    background: '#1e293b', border: '1px solid #334155',
                    borderRadius: '12px', minWidth: '220px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)', zIndex: 100,
                    overflow: 'hidden',
                }}>
                    {/* User info section */}
                    <div style={{ padding: '1rem', background: '#0f172a', borderBottom: '1px solid #334155' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                                width: '42px', height: '42px', borderRadius: '50%',
                                background: colorAvatar, display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: '1.2rem', color: 'white', flexShrink: 0,
                            }}>
                                {perfil.fotoPerfil
                                    ? <img src={perfil.fotoPerfil} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                    : inicial
                                }
                            </div>
                            <div>
                                <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.9rem' }}>{nombreMostrado}</div>
                                <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{rolLabel}</div>
                                {perfil.ci && <div style={{ color: '#475569', fontSize: '0.7rem' }}>CI: {perfil.ci}</div>}
                            </div>
                        </div>
                    </div>

                    {/* Menu items */}
                    {perfil?.rol === 'admin_sucursal' && (
                        <button onClick={() => { navigate('/admin/dashboard'); setAbierto(false); }}
                            style={{ ...menuItemStyle }}>
                            🛡️ Panel Admin
                        </button>
                    )}
                    {perfil?.rol === 'cajero' && (
                        <button onClick={() => { navigate('/cajero/panel'); setAbierto(false); }}
                            style={{ ...menuItemStyle }}>
                            🏷️ Panel Cajero
                        </button>
                    )}
                    {perfil?.rol === 'conductor' && (
                        <button onClick={() => { navigate('/conductor/panel'); setAbierto(false); }}
                            style={{ ...menuItemStyle }}>
                            🚌 Panel Conductor
                        </button>
                    )}
                    {perfil?.rol === 'cliente' && (
                        <>
                            <button onClick={() => { navigate('/mis-viajes'); setAbierto(false); }}
                                style={{ ...menuItemStyle }}>
                                🗺️ Mis Viajes
                            </button>
                            <button onClick={() => { navigate('/mis-viajes'); setAbierto(false); }}
                                style={{ ...menuItemStyle }}>
                                🎫 Boletos Recientes
                            </button>
                        </>
                    )}
                    <button onClick={() => { navigate('/perfil/editar'); setAbierto(false); }}
                        style={{ ...menuItemStyle }}>
                        👤 Mi Cuenta / Editar Perfil
                    </button>
                    <div style={{ height: '1px', background: '#334155' }} />
                    <button onClick={handleLogout} style={{ ...menuItemStyle, color: '#ef4444' }}>
                        🚪 Cerrar Sesión
                    </button>
                </div>
            )}
        </div>
    );
};

const menuItemStyle = {
    width: '100%', display: 'block', padding: '0.75rem 1rem',
    background: 'transparent', border: 'none', color: '#cbd5e1',
    cursor: 'pointer', fontSize: '0.88rem', textAlign: 'left',
    transition: 'background 0.15s',
};

export default PerfilIndicador;
