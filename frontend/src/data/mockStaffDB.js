/**
 * mockStaffDB.js
 * Local mock data for bus crew (drivers, assistants) and bus details.
 * Links trips → crew + bus for the "Who is taking me?" feature.
 */

// ── Crew Members ─────────────────────────────────────

export const TRIPULACION_MOCK = {
    'cond-01': {
        id: 'cond-01',
        nombre: 'Carlos Mamani',
        rol: 'conductor',
        rolLabel: 'Conductor Principal',
        foto: null, // Will use initial avatar
        rating: 4.7,
        totalViajes: 342,
        experiencia: '8 años',
    },
    'cond-02': {
        id: 'cond-02',
        nombre: 'Roberto Quispe',
        rol: 'conductor',
        rolLabel: 'Conductor Principal',
        foto: null,
        rating: 4.3,
        totalViajes: 215,
        experiencia: '5 años',
    },
    'cond-03': {
        id: 'cond-03',
        nombre: 'Miguel Flores',
        rol: 'conductor',
        rolLabel: 'Conductor Principal',
        foto: null,
        rating: 4.9,
        totalViajes: 520,
        experiencia: '12 años',
    },
    'ayud-01': {
        id: 'ayud-01',
        nombre: 'Juan Condori',
        rol: 'ayudante',
        rolLabel: 'Ayudante de Viaje',
        foto: null,
        rating: 4.5,
        totalViajes: 180,
        experiencia: '3 años',
    },
    'ayud-02': {
        id: 'ayud-02',
        nombre: 'Pedro Choque',
        rol: 'ayudante',
        rolLabel: 'Ayudante de Viaje',
        foto: null,
        rating: 4.1,
        totalViajes: 95,
        experiencia: '2 años',
    },
    'ayud-03': {
        id: 'ayud-03',
        nombre: 'Luis Apaza',
        rol: 'ayudante',
        rolLabel: 'Ayudante de Viaje',
        foto: null,
        rating: 4.6,
        totalViajes: 210,
        experiencia: '4 años',
    },
};

// ── Bus Details ──────────────────────────────────────

export const BUSES_MOCK = {
    'bus-01': {
        id: 'bus-01',
        placa: 'ABC-1234',
        tipo: 'Bus Cama',
        tipoIcono: '🛏️',
        marca: 'Mercedes-Benz',
        modelo: 'O500RSD',
        capacidad: 42,
        pisos: 2,
        rating: 4.6,
        amenidades: ['WiFi', 'Bus Cama', 'Baño', 'TV'],
    },
    'bus-02': {
        id: 'bus-02',
        placa: 'DEF-5678',
        tipo: 'Semi-Cama',
        tipoIcono: '💺',
        marca: 'Scania',
        modelo: 'K360',
        capacidad: 48,
        pisos: 2,
        rating: 4.2,
        amenidades: ['WiFi', 'TV'],
    },
    'bus-03': {
        id: 'bus-03',
        placa: 'GHI-9012',
        tipo: 'Bus Cama VIP',
        tipoIcono: '👑',
        marca: 'Volvo',
        modelo: 'B420R',
        capacidad: 36,
        pisos: 2,
        rating: 4.9,
        amenidades: ['WiFi', 'Bus Cama', 'Baño', 'TV', 'Aire Acondicionado'],
    },
};

// ── Trip → Crew + Bus Mapping ────────────────────────

const ASIGNACIONES_VIAJE = {
    // Trans Copacabana trips
    'v1-1': { conductor: 'cond-01', ayudante: 'ayud-01', bus: 'bus-01' },
    'v1-2': { conductor: 'cond-02', ayudante: 'ayud-02', bus: 'bus-02' },
    'v1-3': { conductor: 'cond-01', ayudante: 'ayud-03', bus: 'bus-01' },
    'v1-4': { conductor: 'cond-02', ayudante: 'ayud-01', bus: 'bus-02' },
    'v1-5': { conductor: 'cond-01', ayudante: 'ayud-01', bus: 'bus-01' },
    'v1-6': { conductor: 'cond-03', ayudante: 'ayud-02', bus: 'bus-03' },
    'v1-7': { conductor: 'cond-01', ayudante: 'ayud-03', bus: 'bus-01' },
    // El Dorado trips
    'v2-1': { conductor: 'cond-02', ayudante: 'ayud-02', bus: 'bus-02' },
    'v2-2': { conductor: 'cond-03', ayudante: 'ayud-01', bus: 'bus-03' },
    'v2-3': { conductor: 'cond-02', ayudante: 'ayud-02', bus: 'bus-02' },
    'v2-4': { conductor: 'cond-03', ayudante: 'ayud-03', bus: 'bus-03' },
    'v2-5': { conductor: 'cond-02', ayudante: 'ayud-01', bus: 'bus-02' },
    // Bolívar trips
    'v3-1': { conductor: 'cond-03', ayudante: 'ayud-03', bus: 'bus-03' },
    'v3-2': { conductor: 'cond-01', ayudante: 'ayud-01', bus: 'bus-01' },
    'v3-3': { conductor: 'cond-03', ayudante: 'ayud-03', bus: 'bus-03' },
    'v3-4': { conductor: 'cond-01', ayudante: 'ayud-02', bus: 'bus-01' },
    'v3-5': { conductor: 'cond-03', ayudante: 'ayud-01', bus: 'bus-03' },
    'v3-6': { conductor: 'cond-02', ayudante: 'ayud-03', bus: 'bus-02' },
    'v3-7': { conductor: 'cond-03', ayudante: 'ayud-03', bus: 'bus-03' },
    'v3-8': { conductor: 'cond-01', ayudante: 'ayud-01', bus: 'bus-01' },
};

/**
 * Get crew and bus info for a given trip.
 * Returns { conductor, ayudante, bus } with full detail objects,
 * or a default assignment if the trip isn't explicitly mapped.
 */
export const obtenerTripulacionViaje = (viajeId) => {
    const asignacion = ASIGNACIONES_VIAJE[viajeId];

    if (asignacion) {
        return {
            conductor: TRIPULACION_MOCK[asignacion.conductor],
            ayudante: TRIPULACION_MOCK[asignacion.ayudante],
            bus: BUSES_MOCK[asignacion.bus],
        };
    }

    // Default fallback for unmapped trips
    return {
        conductor: TRIPULACION_MOCK['cond-01'],
        ayudante: TRIPULACION_MOCK['ayud-01'],
        bus: BUSES_MOCK['bus-01'],
    };
};

/**
 * Get a crew member by ID.
 */
export const obtenerTripulante = (id) => TRIPULACION_MOCK[id] || null;

/**
 * Get a bus by ID.
 */
export const obtenerBus = (id) => BUSES_MOCK[id] || null;

export default {
    TRIPULACION_MOCK,
    BUSES_MOCK,
    obtenerTripulacionViaje,
    obtenerTripulante,
    obtenerBus,
};
