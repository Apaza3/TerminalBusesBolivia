import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../servicios/supabase';

// ──────────────────────────────────────────────────────
// AuthContext
// Maneja el estado global de autenticación interactuando
// con Supabase Auth y la tabla 'usuarios' (RBAC).
// ──────────────────────────────────────────────────────

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [sesion, setSesion] = useState(null);
    const [perfil, setPerfil] = useState(null); // Data desde la tabla `usuarios` (email, rol, sucursal_id)
    const [cargandoAuth, setCargandoAuth] = useState(true);

    useEffect(() => {
        let subscription;
        
        const initAuth = async () => {
            try {
                // Supabase gestiona por defecto la sesión en localStorage
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;
                
                await manejarSesion(session);
                
                // Suscribirse a cambios (Login/Logout dinámicos)
                const { data } = supabase.auth.onAuthStateChange(async (_event, sessionObj) => {
                    await manejarSesion(sessionObj);
                });
                
                subscription = data.subscription;
            } catch (err) {
                console.error('Error inicializando AuthContext:', err);
                setCargandoAuth(false);
            }
        };

        initAuth();

        return () => {
            if (subscription) subscription.unsubscribe();
        };
    }, []);

    // Helper para actualizar estado local y cargar del perfil RBAC
    const manejarSesion = async (nuevaSesion) => {
        setSesion(nuevaSesion);
        
        if (nuevaSesion?.user) {
            try {
                // Evitamos un fetch si el perfil ya está cargado y coincide el ID
                const { data, error } = await supabase
                    .from('usuarios')
                    .select('id, email, rol, sucursal_id, nombre_completo')
                    .eq('id', nuevaSesion.user.id)
                    .maybeSingle();
                
                if (error) console.error('Error cargando perfil usuario:', error);
                
                if (data) {
                    setPerfil(data);
                } else {
                    // Fallback: Si no hay registro en tabla usuarios, creamos rol base 'cliente' local
                    // En producción un Trigger de BD debería auto-insertar.
                    setPerfil({ 
                        id: nuevaSesion.user.id, 
                        email: nuevaSesion.user.email, 
                        rol: 'cliente' 
                    });
                }
            } catch (err) {
                console.error('Error en manejarSesion - profile fetch:', err);
                setPerfil(null);
            }
        } else {
            setPerfil(null);
        }
        
        setCargandoAuth(false);
    };

    // ── Login Staff / Admin ──────────────────────────────
    const login = async (email, password) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
            return { exito: true, user: data.user };
        } catch (error) {
            return { exito: false, error: error.message };
        }
    };

    // ── Logout ──────────────────────────────────────────
    const logout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            setSesion(null);
            setPerfil(null);
        } catch (error) {
            console.error('Error durante el logout:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ sesion, perfil, cargandoAuth, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook helper
export const useAuth = () => useContext(AuthContext);
