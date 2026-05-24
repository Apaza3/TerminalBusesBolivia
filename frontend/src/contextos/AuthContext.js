import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../servicios/supabase';
import { loginCliente as mockLoginCliente, registrarCliente } from '../data/mockClientDB';

const AuthContext = createContext();

const SESSION_KEY = 'tbb_session';

// Fetch the public.usuarios row + sucursal + departamento for a given auth user id
async function fetchPerfil(authUserId) {
    const { data, error } = await supabase
        .from('usuarios')
        .select(`
            id, email, nombre_completo, ci, telefono, rol, activo, verificado,
            sucursal_id,
            sucursales(id, nombre, logo_emoji, color_accent),
            departamento_id,
            departamentos(id, nombre)
        `)
        .eq('id', authUserId)
        .single();
    if (error || !data) return null;

    return {
        id:              data.id,
        email:           data.email,
        nombre_completo: data.nombre_completo,
        ci:              data.ci,
        telefono:        data.telefono,
        rol:             data.rol,
        activo:          data.activo,
        sucursal_id:     data.sucursal_id,
        sucursal_nombre: data.sucursales?.nombre || '',
        sucursal_logo:   data.sucursales?.logo_emoji || '🚌',
        sucursal_color:  data.sucursales?.color_accent || '#2563eb',
        departamento_id: data.departamento_id,
        departamento:    data.departamentos?.nombre || 'La Paz',
    };
}

export const AuthProvider = ({ children }) => {
    const [sesion,       setSesion]       = useState(null);
    const [perfil,       setPerfil]       = useState(null);
    const [cargandoAuth, setCargandoAuth] = useState(true);

    useEffect(() => {
        // Restore Supabase session on mount
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session?.user) {
                const p = await fetchPerfil(session.user.id);
                if (p) {
                    setSesion(session);
                    setPerfil(p);
                } else {
                    // Supabase user exists but no public.usuarios row → might be a client
                    // Try restoring client session from sessionStorage
                    _tryRestoreClientSession();
                }
            } else {
                _tryRestoreClientSession();
            }
            setCargandoAuth(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                setSesion(null);
                setPerfil(null);
                sessionStorage.removeItem(SESSION_KEY);
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    const _tryRestoreClientSession = () => {
        try {
            const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.rol === 'cliente') {
                    setSesion({ user: parsed });
                    setPerfil(parsed);
                }
            }
        } catch { /* ignore */ }
    };

    // ── Login Staff (admin_sucursal / cajero / conductor) via Supabase ──
    const login = async (email, password, recordar = false) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            const msg = error.message.toLowerCase();
            if (msg.includes('invalid') || msg.includes('credentials')) {
                return { exito: false, error: 'Correo o contraseña incorrectos.' };
            }
            return { exito: false, error: error.message };
        }

        const p = await fetchPerfil(data.user.id);
        if (!p) return { exito: false, error: 'Usuario no encontrado en el sistema.' };
        if (!p.activo) return { exito: false, error: 'Esta cuenta está suspendida.' };

        setSesion(data.session);
        setPerfil(p);
        return { exito: true, usuario: p };
    };

    // ── Login Cliente (CI + password) via localStorage mock ──────────────
    const loginComoCliente = (ci, password, recordar = false) => {
        const resultado = mockLoginCliente(ci, password);
        if (resultado.exito) {
            const clientePerfil = { ...resultado.cliente, rol: 'cliente' };
            setSesion({ user: clientePerfil });
            setPerfil(clientePerfil);
            if (recordar) {
                localStorage.setItem(SESSION_KEY, JSON.stringify(clientePerfil));
            } else {
                sessionStorage.setItem(SESSION_KEY, JSON.stringify(clientePerfil));
            }
        }
        return resultado;
    };

    // ── Logout ────────────────────────────────────────────────────────────
    const logout = async () => {
        if (perfil?.rol !== 'cliente') {
            await supabase.auth.signOut();
        }
        setSesion(null);
        setPerfil(null);
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        return { exito: true };
    };

    // ── Actualizar perfil ─────────────────────────────────────────────────
    const actualizarPerfil = async (datos) => {
        if (!perfil) return { exito: false, error: 'Sin sesión.' };

        if (perfil.rol === 'cliente') {
            const actualizado = { ...perfil, ...datos };
            setSesion({ user: actualizado });
            setPerfil(actualizado);
            const key = localStorage.getItem(SESSION_KEY) ? SESSION_KEY : null;
            if (key) localStorage.setItem(key, JSON.stringify(actualizado));
            else sessionStorage.setItem(SESSION_KEY, JSON.stringify(actualizado));
            return { exito: true, usuario: actualizado };
        }

        // Staff: update via Supabase
        const { error } = await supabase
            .from('usuarios')
            .update({
                nombre_completo: datos.nombre_completo,
                telefono:        datos.telefono,
            })
            .eq('id', perfil.id);
        if (error) return { exito: false, error: error.message };

        const actualizado = { ...perfil, ...datos };
        setSesion(prev => ({ ...prev }));
        setPerfil(actualizado);
        return { exito: true, usuario: actualizado };
    };

    return (
        <AuthContext.Provider value={{
            sesion,
            perfil,
            cargandoAuth,
            login,
            loginComoCliente,
            registrarCliente,
            logout,
            actualizarPerfil,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
