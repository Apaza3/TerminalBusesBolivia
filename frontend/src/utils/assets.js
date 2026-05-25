export const DEPT_FONDO = {
    'La Paz':     '/fondos/La_Paz.webp',
    'Cochabamba': '/fondos/Cochabamba.webp',
    'Santa Cruz': '/fondos/Santa_Cruz.webp',
    'Oruro':      '/fondos/Oruro.webp',
    'Potosí':     '/fondos/Potosi.webp',
    'Chuquisaca': '/fondos/Chuquisaca.webp',
    'Tarija':     '/fondos/Tarija.webp',
    'Beni':       '/fondos/Beni.webp',
    'Pando':      '/fondos/Pando.webp',
};

const CIUDAD_A_FONDO = {
    'La Paz':     '/fondos/La_Paz.webp',
    'Cochabamba': '/fondos/Cochabamba.webp',
    'Santa Cruz': '/fondos/Santa_Cruz.webp',
    'Oruro':      '/fondos/Oruro.webp',
    'Potosí':     '/fondos/Potosi.webp',
    'Sucre':      '/fondos/Chuquisaca.webp',
    'Tarija':     '/fondos/Tarija.webp',
    'Trinidad':   '/fondos/Beni.webp',
    'Cobija':     '/fondos/Pando.webp',
};

export const EMPRESA_LOGO = {
    'Atlas 1':                '/iconos/atlas.svg',
    'Bolívar':                '/iconos/bolivar.svg',
    'Cosmos':                 '/iconos/cosmos.svg',
    'El Dorado':              '/iconos/dorado.svg',
    'Emperador':              '/iconos/emperador.svg',
    'Imperial':               '/iconos/imperal.svg',
    'Naser':                  '/iconos/naser.svg',
    'Trans. Andino S.A.':     '/iconos/andino.svg',
    'Trans. Copacabana S.A.': '/iconos/copacabana.svg',
    'Trans. Illimani':        '/iconos/illimani.svg',
};

export const getDeptFondo = (dept) => DEPT_FONDO[dept] || null;

export const getCiudadFondo = (ciudad) => CIUDAD_A_FONDO[ciudad] || DEPT_FONDO[ciudad] || null;

export const getEmpresaLogo = (nombre) => {
    if (!nombre) return null;
    const entry = Object.entries(EMPRESA_LOGO).find(([k]) =>
        nombre.toLowerCase().includes(k.toLowerCase())
    );
    return entry?.[1] || null;
};
