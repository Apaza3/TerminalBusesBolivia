import React, { createContext, useContext, useEffect, useState } from 'react';
import { loginStaff, inicializarStaff, actualizarPerfilStaff } from '../data/mockAuthDB';
import { loginCliente as mockLoginCliente } from '../data/mockClientDB';

// ──────────────────────────────────────────────────────
// AuthContext
// Maneja el estado global de autenticación con localStorage.
// Roles: admin_sucursal, cajero, conductor, cliente
// ──────────────────────────────────────────────────────

const AuthContext = createContext();

const SESSION_KEY = 'tbb_session';
const SESSION_REMEMBER_KEY = 'tbb_session_remember';

export const AuthProvider = ({ children }) => {
    const [sesion, setSesion] = useState(null);
    const [perfil, setPerfil] = useState(null);
    const [cargandoAuth, setCargandoAuth] = useState(true);

    useEffect(() => {
        inicializarStaff();

        // Restaurar sesión desde localStorage
        try {
            const guardada = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
            if (guardada) {
                const parsed = JSON.parse(guardada);
                setSesion({ user: parsed });
                setPerfil(parsed);
            }
        } catch {
            localStorage.removeItem(SESSION_KEY);
            sessionStorage.removeItem(SESSION_KEY);
        }

        setCargandoAuth(false);
    }, []);

    const _guardarSesion = (perfil, recordar) => {
        setSesion({ user: perfil });
        setPerfil(perfil);
        if (recordar) {
            localStorage.setItem(SESSION_KEY, JSON.stringify(perfil));
            localStorage.setItem(SESSION_REMEMBER_KEY, 'true');
        } else {
            // Solo sesión en memoria (se borra al cerrar); pero guardamos para SPA
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(perfil));
            localStorage.removeItem(SESSION_KEY);
        }
    };

    // ── Login Staff / Admin / Cajero / Conductor ──────
    const login = async (email, password, recordar = false) => {
        const resultado = loginStaff(email, password);
        if (resultado.exito) {
            _guardarSesion(resultado.usuario, recordar);
            return { exito: true };
        }
        return { exito: false, error: resultado.error };
    };

    // ── Login Cliente (CI + password) ─────────────────
    const loginComoCliente = (ci, password, recordar = false) => {
        const resultado = mockLoginCliente(ci, password);
        if (resultado.exito) {
            const clientePerfil = { ...resultado.cliente, rol: 'cliente' };
            _guardarSesion(clientePerfil, recordar);
        }
        return resultado;
    };

    // ── Logout ────────────────────────────────────────
    const logout = async () => {
        setSesion(null);
        setPerfil(null);
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_REMEMBER_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        return { exito: true };
    };

    // ── Actualizar perfil ─────────────────────────────
    const actualizarPerfil = (datos) => {
        if (!perfil) return { exito: false, error: 'Sin sesión.' };

        let perfilActualizado;

        if (perfil.rol === 'cliente') {
            // Para clientes actualizamos en localStorage de clientes
            perfilActualizado = { ...perfil, ...datos };
        } else {
            // Para staff usamos mockAuthDB
            const resultado = actualizarPerfilStaff(perfil.id, datos);
            if (!resultado.exito) return resultado;
            perfilActualizado = resultado.usuario;
        }

        setSesion({ user: perfilActualizado });
        setPerfil(perfilActualizado);

        // Actualizar sesión persistida
        if (localStorage.getItem(SESSION_KEY)) {
            localStorage.setItem(SESSION_KEY, JSON.stringify(perfilActualizado));
        }
        if (sessionStorage.getItem(SESSION_KEY)) {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(perfilActualizado));
        }

        return { exito: true, usuario: perfilActualizado };
    };

    return (
        <AuthContext.Provider value={{
            sesion,
            perfil,
            cargandoAuth,
            login,
            loginComoCliente,
            logout,
            actualizarPerfil,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
