import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contextos/AuthContext';

// ──────────────────────────────────────────────────────
// ProtectedRoute — Envuelve rutas que requieren Auth
// Verifica sesión y opcionalmente el rol del usuario.
// ──────────────────────────────────────────────────────

const ProtectedRoute = ({ children, rolesPermitidos }) => {
    const { sesion, perfil, cargandoAuth } = useAuth();
    const location = useLocation();

    // 1. Mostrar estado de carga mientras Supabase verifica sesión local
    if (cargandoAuth) {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div className="spinner-mini" style={{ width: '30px', height: '30px', borderTopColor: '#3b82f6' }} />
                    Verificando credenciales...
                </div>
            </div>
        );
    }

    // 2. Redirigir a Login si no hay sesión
    if (!sesion) {
        // Guarda la ruta original para redirigir post-login (si se implementa)
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 3. Verificación de Rol (RBAC)
    if (rolesPermitidos && rolesPermitidos.length > 0) {
        // Aseguramos que el perfil esté cargado y su rol coincida
        if (!perfil) return <Navigate to="/" replace />;
        
        if (!rolesPermitidos.includes(perfil.rol)) {
            // Usuario autenticado pero sin permisos para esta ruta
            return (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444', fontFamily: 'sans-serif' }}>
                    <h2>Acceso Denegado</h2>
                    <p>No tienes los permisos requeridos ({rolesPermitidos.join(', ')}) para ver esta página.</p>
                </div>
            );
        }
    }

    // Usuario válido y autorizado -> Renderizar el componente hijo
    return children;
};

export default ProtectedRoute;
