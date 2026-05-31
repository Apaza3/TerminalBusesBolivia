import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../servicios/supabase';

const AuthContext = createContext();

async function fetchPerfil(authUserId) {
    const { data, error } = await supabase
        .from('usuarios')
        .select(`
            id, email, nombre_completo, ci, telefono, rol, activo, verificado,
            sucursal_id,
            sucursales(id, nombre, logo_emoji, color_accent),
            departamento_id,
            departamentos(id, nombre),
            tripulacion(id)
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
        tripulacion_id:  Array.isArray(data.tripulacion) ? data.tripulacion[0]?.id || null : (data.tripulacion?.id || null),
    };
}

export const AuthProvider = ({ children }) => {
    const [sesion,       setSesion]       = useState(null);
    const [perfil,       setPerfil]       = useState(null);
    const [cargandoAuth, setCargandoAuth] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session?.user) {
                const p = await fetchPerfil(session.user.id);
                if (p) { setSesion(session); setPerfil(p); }
            }
            setCargandoAuth(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                setSesion(null);
                setPerfil(null);
            }
        });
        return () => subscription.unsubscribe();
    }, []);

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

    // ── Login Cliente (CI + password) via Supabase ────────────────────────
    const loginComoCliente = async (ci, password, recordar = false) => {
        // Lookup email by CI in public.usuarios (lectura pública permitida)
        const { data: usuario } = await supabase
            .from('usuarios')
            .select('id, email')
            .eq('ci', ci.toUpperCase())
            .eq('rol', 'cliente')
            .maybeSingle();

        if (!usuario) return { exito: false, error: 'CI no registrado en el sistema.' };

        const { data, error } = await supabase.auth.signInWithPassword({
            email: usuario.email,
            password,
        });

        if (error) {
            if (error.message.toLowerCase().includes('not confirmed')) {
                return { exito: false, error: 'Confirma tu correo electrónico antes de ingresar.' };
            }
            return { exito: false, error: 'Contraseña incorrecta.' };
        }

        const p = await fetchPerfil(data.user.id);
        if (!p) return { exito: false, error: 'Perfil no encontrado.' };
        if (!p.activo) return { exito: false, error: 'Esta cuenta está suspendida.' };

        setSesion(data.session);
        setPerfil(p);
        return { exito: true, usuario: p };
    };

    // ── Registro Cliente via Supabase ─────────────────────────────────────
    const registrarCliente = async ({ nombreCompleto, ci, telefono, email, password, fechaNacimiento, fotoPerfil, ciAnverso, ciReverso }) => {
        const correo = email?.trim() || `${ci.toLowerCase()}@cliente.tbb.bo`;

        const { data, error } = await supabase.auth.signUp({ email: correo, password });

        if (error) {
            const msg = error.message.toLowerCase();
            if (msg.includes('already registered') || msg.includes('already exists')) {
                return { exito: false, error: 'Este correo ya está registrado.' };
            }
            return { exito: false, error: error.message };
        }

        const { error: insertError } = await supabase
            .from('usuarios')
            .insert({
                id:               data.user.id,
                email:            correo,
                nombre_completo:  nombreCompleto,
                ci:               ci.toUpperCase(),
                telefono:         telefono || null,
                fecha_nacimiento: fechaNacimiento || null,
                foto_url:         fotoPerfil   || null,
                ci_anverso_url:   ciAnverso    || null,
                ci_reverso_url:   ciReverso    || null,
                rol:              'cliente',
                verificado:       false,
                activo:           true,
            });

        if (insertError) {
            await supabase.auth.signOut();
            if (insertError.message.includes('unique') || insertError.message.includes('duplicate')) {
                return { exito: false, error: 'CI o correo ya registrado.' };
            }
            return { exito: false, error: insertError.message };
        }

        return { exito: true, cliente: { id: data.user.id, email: correo, ci, nombre_completo: nombreCompleto } };
    };

    // ── Logout ────────────────────────────────────────────────────────────
    const logout = async () => {
        await supabase.auth.signOut();
        setSesion(null);
        setPerfil(null);
        return { exito: true };
    };

    // ── Actualizar perfil ─────────────────────────────────────────────────
    const actualizarPerfil = async (datos) => {
        if (!perfil) return { exito: false, error: 'Sin sesión.' };

        const { error } = await supabase
            .from('usuarios')
            .update({
                nombre_completo: datos.nombre_completo,
                telefono:        datos.telefono,
            })
            .eq('id', perfil.id);

        if (error) return { exito: false, error: error.message };

        const actualizado = { ...perfil, ...datos };
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
