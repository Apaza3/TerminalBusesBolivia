/**
 * DepartamentoContext.js
 * Global department context — drives color themes and trip filtering.
 * Staff (admin/cajero): auto-detected from profile.sucursal_id.
 * Conductor: auto-changes when trip ends if destination is another dept.
 * Cliente: user-selectable via dropdown in Inicio.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';

export const DEPARTAMENTOS = {
    'La Paz':     { color: '#2563eb', colorSecundario: '#1e40af', bg: '#0f1d3d', acento: '#60a5fa', emoji: '🏔️' },
    'Cochabamba': { color: '#059669', colorSecundario: '#065f46', bg: '#0a1e17', acento: '#6ee7b7', emoji: '🌿' },
    'Santa Cruz': { color: '#d97706', colorSecundario: '#92400e', bg: '#1c1207', acento: '#fcd34d', emoji: '🌴' },
    'Oruro':      { color: '#7c3aed', colorSecundario: '#4c1d95', bg: '#130d22', acento: '#c4b5fd', emoji: '⛏️' },
    'Potosí':     { color: '#64748b', colorSecundario: '#334155', bg: '#0d1117', acento: '#cbd5e1', emoji: '🏺' },
    'Sucre':      { color: '#b45309', colorSecundario: '#78350f', bg: '#1c1007', acento: '#fde68a', emoji: '🏛️' },
    'Tarija':     { color: '#be123c', colorSecundario: '#881337', bg: '#1c0710', acento: '#fda4af', emoji: '🍇' },
    'Trinidad':   { color: '#0d9488', colorSecundario: '#115e59', bg: '#071a19', acento: '#99f6e4', emoji: '🌊' },
    'Cobija':     { color: '#65a30d', colorSecundario: '#3f6212', bg: '#0d1a04', acento: '#bef264', emoji: '🌳' },
};

export const DEPARTAMENTO_DEFAULT = 'La Paz';
const STORAGE_KEY = 'tbb_departamento_cliente';

const DepartamentoContext = createContext(null);

export const DepartamentoProvider = ({ children }) => {
    const [departamento, setDepartamentoRaw] = useState(() => {
        return localStorage.getItem(STORAGE_KEY) || DEPARTAMENTO_DEFAULT;
    });

    const setDepartamento = (nombre) => {
        if (DEPARTAMENTOS[nombre]) {
            setDepartamentoRaw(nombre);
            localStorage.setItem(STORAGE_KEY, nombre);
        }
    };

    const tema = DEPARTAMENTOS[departamento] || DEPARTAMENTOS[DEPARTAMENTO_DEFAULT];

    useEffect(() => {
        document.documentElement.style.setProperty('--dept-color', tema.color);
        document.documentElement.style.setProperty('--dept-bg', tema.bg);
        document.documentElement.style.setProperty('--dept-acento', tema.acento);
    }, [tema]);

    return (
        <DepartamentoContext.Provider value={{ departamento, setDepartamento, tema, DEPARTAMENTOS }}>
            {children}
        </DepartamentoContext.Provider>
    );
};

export const useDepartamento = () => {
    const ctx = useContext(DepartamentoContext);
    if (!ctx) throw new Error('useDepartamento must be inside DepartamentoProvider');
    return ctx;
};

/** Map city name → department */
export const ciudadADepartamento = (ciudad) => {
    const mapa = {
        'La Paz': 'La Paz', 'El Alto': 'La Paz',
        'Cochabamba': 'Cochabamba', 'Quillacollo': 'Cochabamba',
        'Santa Cruz': 'Santa Cruz', 'Montero': 'Santa Cruz',
        'Oruro': 'Oruro',
        'Potosí': 'Potosí', 'Uyuni': 'Potosí',
        'Sucre': 'Sucre',
        'Tarija': 'Tarija',
        'Trinidad': 'Trinidad',
        'Cobija': 'Cobija',
    };
    return mapa[ciudad] || DEPARTAMENTO_DEFAULT;
};
