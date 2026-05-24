// Paleta de colores por empresa — usada en paneles de staff (conductor, cajero)
// Separada de los temas de departamento (DepartamentoContext.js)
export const EMPRESAS_TEMAS = {
    'Andino': {
        primary: '#4CD964', primaryText: '#0B1120',
        secondary: '#FFD700', secondaryText: '#0B1120',
        accent: '#121212',
        seatAvailable: '#4CD964', seatSelected: '#FFD700',
    },
    'Atlas': {
        primary: '#D32F2F', primaryText: '#FFFFFF',
        secondary: '#FFFFFF', secondaryText: '#212121',
        accent: '#212121',
        seatAvailable: '#FFFFFF', seatSelected: '#D32F2F',
    },
    'Bolívar': {
        primary: '#0033A0', primaryText: '#FFFFFF',
        secondary: '#FFD700', secondaryText: '#0B1120',
        accent: '#4FC3F7',
        seatAvailable: '#4FC3F7', seatSelected: '#FFD700',
    },
    'Copacabana': {
        primary: '#E31E24', primaryText: '#FFFFFF',
        secondary: '#F8F9FA', secondaryText: '#343A40',
        accent: '#343A40',
        seatAvailable: '#F8F9FA', seatSelected: '#E31E24',
    },
    'Cosmos': {
        primary: '#FF6B00', primaryText: '#FFFFFF',
        secondary: '#FFD700', secondaryText: '#0B1120',
        accent: '#C0C0C0',
        seatAvailable: '#C0C0C0', seatSelected: '#FF6B00',
    },
    'El Dorado': {
        primary: '#D4AF37', primaryText: '#0B1120',
        secondary: '#AA8822', secondaryText: '#FFFFFF',
        accent: '#FFFFFF',
        seatAvailable: '#D4AF37', seatSelected: '#AA8822',
    },
    'Emperador': {
        primary: '#2E5CB8', primaryText: '#FFFFFF',
        secondary: '#D4AF37', secondaryText: '#0B1120',
        accent: '#C1121F',
        seatAvailable: '#2E5CB8', seatSelected: '#D4AF37',
    },
    'Illimani': {
        primary: '#4CAF50', primaryText: '#0B1120',
        secondary: '#F5F5DC', secondaryText: '#2E7D32',
        accent: '#2E7D32',
        seatAvailable: '#F5F5DC', seatSelected: '#4CAF50',
    },
    'Imperial': {
        primary: '#D4AF37', primaryText: '#0B1120',
        secondary: '#FF8C00', secondaryText: '#0B1120',
        accent: '#080808',
        seatAvailable: '#333333', seatSelected: '#D4AF37',
    },
    'Naser': {
        primary: '#0056B3', primaryText: '#FFFFFF',
        secondary: '#FF6B00', secondaryText: '#FFFFFF',
        accent: '#FFFFFF',
        seatAvailable: '#FFFFFF', seatSelected: '#FF6B00',
    },
};

/** Devuelve el tema de empresa por nombre parcial (ej. "Trans. Copacabana S.A." → Copacabana) */
export const getEmpresaTema = (nombre) => {
    if (!nombre) return null;
    const n = nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const clave = Object.keys(EMPRESAS_TEMAS).find(k =>
        n.includes(k.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''))
    );
    return clave ? EMPRESAS_TEMAS[clave] : null;
};
