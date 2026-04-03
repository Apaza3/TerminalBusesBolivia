import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../servicios/supabase';
import { loginCliente as mockLoginCliente } from '../data/mockClientDB';

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
                // Validar si existe la sesion fake
                if (localStorage.getItem('tbb_fake_admin') === 'true') {
                    const adminProfileLocal = { id: 'admin-local', email: 'admin@tbb.com', rol: 'admin_sucursal', nombre_completo: 'Admin Supremo' };
                    setSesion({ user: adminProfileLocal });
                    setPerfil(adminProfileLocal);
                    setCargandoAuth(false);
                    return;
                }

                // Validar sesion fake de conductor
                if (localStorage.getItem('tbb_fake_conductor') === 'true') {
                    const conductorProfile = { id: 'conductor-local', email: 'conductor@tbb.com', rol: 'conductor', nombre_completo: 'Pedro Chofer' };
                    setSesion({ user: conductorProfile });
                    setPerfil(conductorProfile);
                    setCargandoAuth(false);
                    return;
                }

                // Validar sesion fake de cliente
                const clienteGuardado = localStorage.getItem('tbb_fake_cliente');
                if (clienteGuardado) {
                    try {
                        const clientePerfil = JSON.parse(clienteGuardado);
                        setSesion({ user: clientePerfil });
                        setPerfil(clientePerfil);
                        setCargandoAuth(false);
                        return;
                    } catch { /* corrupted, continue */ }
                }

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
            // BACKDOOR TEMPORAL PARA PRUEBAS (Hardcoded Admin)
            if (email === 'admin@tbb.com' && password === 'admin123456') {
                const adminProfileLocal = { id: 'admin-local', email: email, rol: 'admin_sucursal', nombre_completo: 'Admin Supremo' };
                const mockSession = { user: adminProfileLocal };
                
                setSesion(mockSession);
                setPerfil(adminProfileLocal);
                
                // Keep fake session alive in memory/storage
                localStorage.setItem('tbb_fake_admin', 'true');
                return { exito: true };
            }

            // BACKDOOR TEMPORAL: Conductor de prueba
            if (email === 'conductor@tbb.com' && password === 'conductor123456') {
                const conductorProfile = { id: 'conductor-local', email: email, rol: 'conductor', nombre_completo: 'Pedro Chofer' };
                const mockSession = { user: conductorProfile };
                
                setSesion(mockSession);
                setPerfil(conductorProfile);
                
                localStorage.setItem('tbb_fake_conductor', 'true');
                return { exito: true };
            }

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
        if (localStorage.getItem('tbb_fake_admin') === 'true') {
            localStorage.removeItem('tbb_fake_admin');
            setSesion(null);
            setPerfil(null);
            return { exito: true };
        }

        if (localStorage.getItem('tbb_fake_conductor') === 'true') {
            localStorage.removeItem('tbb_fake_conductor');
            setSesion(null);
            setPerfil(null);
            return { exito: true };
        }

        if (localStorage.getItem('tbb_fake_cliente')) {
            localStorage.removeItem('tbb_fake_cliente');
            setSesion(null);
            setPerfil(null);
            return { exito: true };
        }

        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            setSesion(null);
            setPerfil(null);
        } catch (error) {
            console.error('Error durante el logout:', error);
        }
    };

    // ── Login Cliente (CI + password via mockClientDB) ──
    const loginComoCliente = (ci, password) => {
        const resultado = mockLoginCliente(ci, password);
        if (resultado.exito) {
            const clientePerfil = { ...resultado.cliente, rol: 'cliente' };
            setSesion({ user: clientePerfil });
            setPerfil(clientePerfil);
            localStorage.setItem('tbb_fake_cliente', JSON.stringify(clientePerfil));
        }
        return resultado;
    };

    return (
        <AuthContext.Provider value={{ sesion, perfil, cargandoAuth, login, loginComoCliente, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook helper
export const useAuth = () => useContext(AuthContext);
