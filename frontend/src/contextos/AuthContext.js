import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../servicios/supabase';
import { loginCliente as mockLoginCliente } from '../data/mockClientDB';

const AuthContext = createContext();
const SESSION_KEY = 'tbb_session';
const SESSION_REMEMBER_KEY = 'tbb_session_remember';

export const AuthProvider = ({ children }) => {
    const [sesion, setSesion] = useState(null);
    const [perfil, setPerfil] = useState(null);
    const [cargandoAuth, setCargandoAuth] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            try {
                const guardada = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
                if (guardada) {
                    const parsed = JSON.parse(guardada);
                    setSesion({ user: parsed });
                    setPerfil(parsed);
                } else {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session) {
                        const { data: p } = await supabase
                            .from('usuarios')
                            .select('id, email, nombre_completo, rol, sucursal_id, departamento_id, ci, telefono, foto_url, activo')
                            .eq('id', session.user.id)
                            .single();
                        if (p && p.activo) {
                            setSesion({ user: p });
                            setPerfil(p);
                        }
                    }
                }
            } catch {
                localStorage.removeItem(SESSION_KEY);
                sessionStorage.removeItem(SESSION_KEY);
            }
            setCargandoAuth(false);
        };
        initAuth();
    }, []);

    const _guardarSesion = (p, recordar) => {
        setSesion({ user: p });
        setPerfil(p);
        if (recordar) {
            localStorage.setItem(SESSION_KEY, JSON.stringify(p));
            localStorage.setItem(SESSION_REMEMBER_KEY, 'true');
        } else {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(p));
            localStorage.removeItem(SESSION_KEY);
        }
    };

    // ── Staff login via Supabase ──────────────────────────
    const login = async (email, password, recordar = false) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { exito: false, error: 'Credenciales inválidas.' };

        const { data: p, error: pErr } = await supabase
            .from('usuarios')
            .select('id, email, nombre_completo, rol, sucursal_id, departamento_id, ci, telefono, foto_url, activo')
            .eq('id', data.user.id)
            .single();

        if (pErr || !p) return { exito: false, error: 'Perfil no encontrado. Contacta al administrador.' };
        if (!p.activo) return { exito: false, error: 'Cuenta desactivada. Contacta al administrador.' };
        if (!['admin_sucursal', 'cajero', 'conductor'].includes(p.rol)) {
            await supabase.auth.signOut();
            return { exito: false, error: 'Sin acceso al panel de control.' };
        }

        _guardarSesion(p, recordar);
        return { exito: true, rol: p.rol };
    };

    // ── Cliente login (mock) ─────────────────────────────
    const loginComoCliente = (ci, password, recordar = false) => {
        const resultado = mockLoginCliente(ci, password);
        if (resultado.exito) {
            const clientePerfil = { ...resultado.cliente, rol: 'cliente' };
            _guardarSesion(clientePerfil, recordar);
        }
        return resultado;
    };

    // ── Logout ───────────────────────────────────────────
    const logout = async () => {
        await supabase.auth.signOut();
        setSesion(null);
        setPerfil(null);
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_REMEMBER_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        return { exito: true };
    };

    // ── Actualizar perfil ────────────────────────────────
    const actualizarPerfil = (datos) => {
        if (!perfil) return { exito: false, error: 'Sin sesión.' };
        const perfilActualizado = { ...perfil, ...datos };
        setSesion({ user: perfilActualizado });
        setPerfil(perfilActualizado);
        if (localStorage.getItem(SESSION_KEY)) localStorage.setItem(SESSION_KEY, JSON.stringify(perfilActualizado));
        if (sessionStorage.getItem(SESSION_KEY)) sessionStorage.setItem(SESSION_KEY, JSON.stringify(perfilActualizado));
        return { exito: true, usuario: perfilActualizado };
    };

    return (
        <AuthContext.Provider value={{ sesion, perfil, cargandoAuth, login, loginComoCliente, logout, actualizarPerfil }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
