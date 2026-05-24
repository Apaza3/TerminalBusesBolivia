/**
 * DepartamentoContext.js
 * Global department context — drives color themes and trip filtering.
 * Staff (admin/cajero): auto-detected from profile.sucursal_id.
 * Conductor: auto-changes when trip ends if destination is another dept.
 * Cliente: user-selectable via dropdown in Inicio.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';

// Paleta oficial por departamento — fuente de verdad para toda la UI
export const DEPARTAMENTOS = {
    'La Paz': {
        primary: '#00F0FF', primaryText: '#0B1120',
        secondary: '#FF2A85', secondaryText: '#FFFFFF',
        success: '#4EE4C1', alertBg: '#C10E6C',
        bandera1: '#E63946', bandera2: '#2A9D8F',
        emoji: '🏔️',
        // aliases para compatibilidad con componentes anteriores
        color: '#00F0FF', colorSecundario: '#FF2A85',
        bg: '#0B1120', acento: '#4EE4C1',
    },
    'Oruro': {
        primary: '#FF6B00', primaryText: '#FFFFFF',
        secondary: '#D90429', secondaryText: '#FFFFFF',
        success: '#FFD600', alertBg: '#8D0801',
        bandera1: '#D90429', bandera2: '#FF6B00',
        emoji: '🎭',
        color: '#FF6B00', colorSecundario: '#D90429',
        bg: '#0B1120', acento: '#FFD600',
    },
    'Potosí': {
        primary: '#90E0EF', primaryText: '#0B1120',
        secondary: '#C1121F', secondaryText: '#FFFFFF',
        success: '#E2E8F0', alertBg: '#780000',
        bandera1: '#C1121F', bandera2: '#E2E8F0',
        emoji: '⛏️',
        color: '#90E0EF', colorSecundario: '#C1121F',
        bg: '#0B1120', acento: '#E2E8F0',
    },
    'Cochabamba': {
        primary: '#00F0FF', primaryText: '#0B1120',
        secondary: '#7209B7', secondaryText: '#FFFFFF',
        success: '#48CAE4', alertBg: '#023E8A',
        bandera1: '#48CAE4', bandera2: '#0077B6',
        emoji: '🏞️',
        color: '#00F0FF', colorSecundario: '#7209B7',
        bg: '#0B1120', acento: '#48CAE4',
    },
    'Chuquisaca': {
        primary: '#EF233C', primaryText: '#FFFFFF',
        secondary: '#F8FAFC', secondaryText: '#0B1120',
        success: '#F48C06', alertBg: '#9A031E',
        bandera1: '#F8FAFC', bandera2: '#EF233C',
        emoji: '🏛️',
        color: '#EF233C', colorSecundario: '#F8FAFC',
        bg: '#0B1120', acento: '#F48C06',
    },
    'Tarija': {
        primary: '#70E000', primaryText: '#0B1120',
        secondary: '#9D0208', secondaryText: '#FFFFFF',
        success: '#CCFF33', alertBg: '#6A040F',
        bandera1: '#9D0208', bandera2: '#F8FAFC',
        emoji: '🍇',
        color: '#70E000', colorSecundario: '#9D0208',
        bg: '#0B1120', acento: '#CCFF33',
    },
    'Santa Cruz': {
        primary: '#39FF14', primaryText: '#0B1120',
        secondary: '#FFD166', secondaryText: '#0B1120',
        success: '#06D6A0', alertBg: '#2D6A4F',
        bandera1: '#06D6A0', bandera2: '#F8FAFC',
        emoji: '🌴',
        color: '#39FF14', colorSecundario: '#FFD166',
        bg: '#0B1120', acento: '#06D6A0',
    },
    'Beni': {
        primary: '#FEE440', primaryText: '#0B1120',
        secondary: '#00BBF9', secondaryText: '#0B1120',
        success: '#00F5D4', alertBg: '#004B23',
        bandera1: '#38B000', bandera2: '#FEE440',
        emoji: '🌅',
        color: '#FEE440', colorSecundario: '#00BBF9',
        bg: '#0B1120', acento: '#00F5D4',
    },
    'Pando': {
        primary: '#06D6A0', primaryText: '#0B1120',
        secondary: '#118AB2', secondaryText: '#FFFFFF',
        success: '#FFD166', alertBg: '#073B4C',
        bandera1: '#FFFFFF', bandera2: '#06D6A0',
        emoji: '🌳',
        color: '#06D6A0', colorSecundario: '#118AB2',
        bg: '#0B1120', acento: '#FFD166',
    },
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
        'Sucre': 'Chuquisaca', 'Chuquisaca': 'Chuquisaca',
        'Tarija': 'Tarija',
        'Trinidad': 'Beni', 'Beni': 'Beni',
        'Cobija': 'Pando', 'Pando': 'Pando',
    };
    return mapa[ciudad] || DEPARTAMENTO_DEFAULT;
};
