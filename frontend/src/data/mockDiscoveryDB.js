/**
 * mockDiscoveryDB.js
 * Local data store for the Discovery & Feedback features (V4 Branch 2).
 * Manages: Sucursales with ratings, User feedback/reviews, Ranking calculation.
 */

const STORAGE_KEYS = {
    FEEDBACK: 'tbb_feedback',
};

// ── Helpers ──────────────────────────────────────────

const leer = (key) => {
    try {
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch { return []; }
};

const guardar = (key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
};

// ── Sucursales Data (enriched for grid) ──────────────

export const SUCURSALES_MOCK = [
    {
        id: 'f75cfa1d-ae69-43d3-9798-7b0054cdd7b5',
        nombre: 'Trans. Andino S.A.',
        logoEmoji: '🏔️',
        colorAccent: '#3b82f6',
        departamento: 'La Paz',
        ciudad: 'La Paz',
        ranking: 4.2,
        scores: { bus: 4.1, tripulacion: 4.3, sucursal: 4.2 },
        amenidades: ['WiFi', 'Bus Cama', 'Baño'],
        totalViajes: 10,
    },
    {
        id: '2d8ffbeb-b5f7-4521-8405-78c6755fd2c5',
        nombre: 'Atlas 1',
        logoEmoji: '🌐',
        colorAccent: '#8b5cf6',
        departamento: 'La Paz',
        ciudad: 'La Paz',
        ranking: 4.4,
        scores: { bus: 4.3, tripulacion: 4.5, sucursal: 4.4 },
        amenidades: ['WiFi', 'TV', 'Baño', 'Bus Cama'],
        totalViajes: 12,
    },
    {
        id: 'ca902ac2-fd47-43b0-89d7-2f9d4f772be1',
        nombre: 'Bolívar',
        logoEmoji: '🦅',
        colorAccent: '#10b981',
        departamento: 'La Paz',
        ciudad: 'La Paz',
        ranking: 4.8,
        scores: { bus: 4.9, tripulacion: 4.7, sucursal: 4.8 },
        amenidades: ['WiFi', 'Bus Cama', 'Baño', 'TV', 'Aire Acondicionado'],
        totalViajes: 15,
    },
    {
        id: 'aafdfebf-8e80-4418-b7f3-5d509d658a0b',
        nombre: 'Trans. Copacabana S.A.',
        logoEmoji: '⛵',
        colorAccent: '#06b6d4',
        departamento: 'La Paz',
        ciudad: 'La Paz',
        ranking: 4.5,
        scores: { bus: 4.5, tripulacion: 4.3, sucursal: 4.7 },
        amenidades: ['WiFi', 'Bus Cama', 'Baño'],
        totalViajes: 12,
    },
    {
        id: 'd560af60-19ec-4504-8d95-b820ce387671',
        nombre: 'Cosmos',
        logoEmoji: '🌌',
        colorAccent: '#7c3aed',
        departamento: 'La Paz',
        ciudad: 'La Paz',
        ranking: 4.1,
        scores: { bus: 4.0, tripulacion: 4.2, sucursal: 4.1 },
        amenidades: ['WiFi', 'TV'],
        totalViajes: 9,
    },
    {
        id: '6798bdae-7a8f-4852-b52f-c866d708a791',
        nombre: 'El Dorado',
        logoEmoji: '✨',
        colorAccent: '#f59e0b',
        departamento: 'La Paz',
        ciudad: 'La Paz',
        ranking: 4.0,
        scores: { bus: 3.8, tripulacion: 4.2, sucursal: 4.0 },
        amenidades: ['WiFi', 'TV'],
        totalViajes: 8,
    },
    {
        id: '672f0e03-6ddf-4d1e-ad91-7e4ee6521eef',
        nombre: 'Emperador',
        logoEmoji: '👑',
        colorAccent: '#dc2626',
        departamento: 'La Paz',
        ciudad: 'La Paz',
        ranking: 4.3,
        scores: { bus: 4.2, tripulacion: 4.4, sucursal: 4.3 },
        amenidades: ['WiFi', 'Bus Cama', 'Baño', 'TV'],
        totalViajes: 11,
    },
    {
        id: 'cb881e15-b032-4812-adc9-02c635307039',
        nombre: 'Imperial',
        logoEmoji: '🏛️',
        colorAccent: '#0ea5e9',
        departamento: 'La Paz',
        ciudad: 'La Paz',
        ranking: 4.6,
        scores: { bus: 4.7, tripulacion: 4.5, sucursal: 4.6 },
        amenidades: ['WiFi', 'Bus Cama', 'Baño', 'TV', 'Aire Acondicionado'],
        totalViajes: 14,
    },
    {
        id: '2f4d3710-0705-481a-90b7-dac96c572a3d',
        nombre: 'Naser',
        logoEmoji: '🚀',
        colorAccent: '#f97316',
        departamento: 'La Paz',
        ciudad: 'La Paz',
        ranking: 4.2,
        scores: { bus: 4.1, tripulacion: 4.3, sucursal: 4.2 },
        amenidades: ['WiFi', 'TV', 'Baño'],
        totalViajes: 10,
    },
    {
        id: '88df8d27-c642-4366-bbf9-5e6b7c2c039f',
        nombre: 'Trans. Illimani',
        logoEmoji: '🏔️',
        colorAccent: '#64748b',
        departamento: 'La Paz',
        ciudad: 'La Paz',
        ranking: 4.0,
        scores: { bus: 3.9, tripulacion: 4.1, sucursal: 4.0 },
        amenidades: ['WiFi', 'Baño'],
        totalViajes: 8,
    },
];

/**
 * Get all sucursales sorted by ranking (highest first).
 * Recalculates ranking from feedback if available.
 */
export const obtenerSucursalesOrdenadas = () => {
    const sucursales = SUCURSALES_MOCK.map(s => {
        // pass departamento so ranking is dept-scoped; falls back to base ranking
        const feedbackRanking = calcularRankingPromedio(s.id, s.departamento);
        return {
            ...s,
            ranking: feedbackRanking !== null ? feedbackRanking : s.ranking,
        };
    });
    return sucursales.sort((a, b) => b.ranking - a.ranking);
};

/**
 * Get a single sucursal by ID.
 */
export const obtenerSucursalPorId = (id) => {
    return SUCURSALES_MOCK.find(s => s.id === id) || null;
};

// ── Viajes Mock (expanded for pagination demo) ───────

export const VIAJES_SUCURSAL_MOCK = {
    'demo-s1': [
        { id: 'v1-1', origen: 'La Paz', destino: 'Cochabamba', salida: '2026-04-03T06:00:00', precio: 45, duracion_estimada: '7h 30min' },
        { id: 'v1-2', origen: 'La Paz', destino: 'Santa Cruz', salida: '2026-04-03T20:00:00', precio: 85, duracion_estimada: '12h' },
        { id: 'v1-3', origen: 'Cochabamba', destino: 'Sucre', salida: '2026-04-03T09:00:00', precio: 35, duracion_estimada: '5h' },
        { id: 'v1-4', origen: 'La Paz', destino: 'Oruro', salida: '2026-04-03T14:00:00', precio: 25, duracion_estimada: '3h 30min' },
        { id: 'v1-5', origen: 'La Paz', destino: 'Cochabamba', salida: '2026-04-04T06:00:00', precio: 50, duracion_estimada: '7h' },
        { id: 'v1-6', origen: 'La Paz', destino: 'Potosí', salida: '2026-04-04T19:00:00', precio: 55, duracion_estimada: '9h' },
        { id: 'v1-7', origen: 'Cochabamba', destino: 'Santa Cruz', salida: '2026-04-05T08:00:00', precio: 60, duracion_estimada: '6h' },
    ],
    'demo-s2': [
        { id: 'v2-1', origen: 'La Paz', destino: 'Cochabamba', salida: '2026-04-03T07:00:00', precio: 40, duracion_estimada: '8h' },
        { id: 'v2-2', origen: 'La Paz', destino: 'Santa Cruz', salida: '2026-04-03T21:00:00', precio: 80, duracion_estimada: '13h' },
        { id: 'v2-3', origen: 'Oruro', destino: 'La Paz', salida: '2026-04-04T10:00:00', precio: 20, duracion_estimada: '3h' },
        { id: 'v2-4', origen: 'La Paz', destino: 'Sucre', salida: '2026-04-04T18:00:00', precio: 65, duracion_estimada: '10h' },
        { id: 'v2-5', origen: 'Cochabamba', destino: 'La Paz', salida: '2026-04-05T06:30:00', precio: 42, duracion_estimada: '7h 30min' },
    ],
    'demo-s3': [
        { id: 'v3-1', origen: 'La Paz', destino: 'Cochabamba', salida: '2026-04-03T06:30:00', precio: 55, duracion_estimada: '7h' },
        { id: 'v3-2', origen: 'La Paz', destino: 'Santa Cruz', salida: '2026-04-03T19:00:00', precio: 95, duracion_estimada: '11h' },
        { id: 'v3-3', origen: 'Cochabamba', destino: 'Sucre', salida: '2026-04-03T10:00:00', precio: 40, duracion_estimada: '5h' },
        { id: 'v3-4', origen: 'La Paz', destino: 'Oruro', salida: '2026-04-03T15:00:00', precio: 30, duracion_estimada: '3h' },
        { id: 'v3-5', origen: 'La Paz', destino: 'Cochabamba', salida: '2026-04-04T06:00:00', precio: 55, duracion_estimada: '7h' },
        { id: 'v3-6', origen: 'Santa Cruz', destino: 'La Paz', salida: '2026-04-04T20:00:00', precio: 90, duracion_estimada: '11h 30min' },
        { id: 'v3-7', origen: 'La Paz', destino: 'Tarija', salida: '2026-04-05T18:00:00', precio: 100, duracion_estimada: '14h' },
        { id: 'v3-8', origen: 'Cochabamba', destino: 'Santa Cruz', salida: '2026-04-05T09:00:00', precio: 65, duracion_estimada: '6h' },
    ],
};

// Generate fallback for other sucursals
const generarViajesGenerico = (sucursalId) => [
    { id: `${sucursalId}-v1`, origen: 'La Paz', destino: 'Cochabamba', salida: '2026-04-03T08:00:00', precio: 42, duracion_estimada: '7h 30min' },
    { id: `${sucursalId}-v2`, origen: 'La Paz', destino: 'Santa Cruz', salida: '2026-04-03T20:00:00', precio: 78, duracion_estimada: '12h' },
    { id: `${sucursalId}-v3`, origen: 'Cochabamba', destino: 'Sucre', salida: '2026-04-04T09:00:00', precio: 32, duracion_estimada: '5h' },
    { id: `${sucursalId}-v4`, origen: 'La Paz', destino: 'Oruro', salida: '2026-04-04T14:00:00', precio: 22, duracion_estimada: '3h 30min' },
];

export const obtenerViajesSucursal = (sucursalId) => {
    return VIAJES_SUCURSAL_MOCK[sucursalId] || generarViajesGenerico(sucursalId);
};

// ── Feedback System ──────────────────────────────────

const AVATARES_GENERICOS = ['🧑', '👩', '👨', '🧔', '👩‍🦱', '👨‍🦳', '🧑‍🦰', '👩‍🦰'];

/**
 * Submit a feedback/review for a sucursal.
 * departamento is required for isolation: reviews are scoped to dept+company.
 */
export const enviarFeedback = ({ sucursalId, departamento, nombreUsuario, usuarioClave, mood, labelsSeleccionados, comentario, moodBus, moodTripulacion }) => {
    const feedbacks = leer(STORAGE_KEYS.FEEDBACK);
    const nuevo = {
        id: 'fb-' + Date.now(),
        sucursalId,
        departamento: departamento || '',
        usuarioClave: usuarioClave || '',
        nombreUsuario: nombreUsuario || 'Viajero',
        avatarGenerico: AVATARES_GENERICOS[Math.floor(Math.random() * AVATARES_GENERICOS.length)],
        mood,
        moodBus: moodBus || mood,
        moodTripulacion: moodTripulacion || mood,
        labelsSeleccionados: labelsSeleccionados || [],
        comentario: comentario || '',
        fecha: new Date().toISOString(),
    };
    feedbacks.push(nuevo);
    guardar(STORAGE_KEYS.FEEDBACK, feedbacks);
    return nuevo;
};

/**
 * Get all feedback for a sucursal, scoped to a specific departamento.
 * Reviews from other departments for the same company are NOT returned.
 */
export const obtenerFeedback = (sucursalId, departamento) => {
    const feedbacks = leer(STORAGE_KEYS.FEEDBACK);
    return feedbacks
        .filter(f => f.sucursalId === sucursalId && (!departamento || f.departamento === departamento))
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
};

/** Check if a user already reviewed this sucursal in this departamento. */
export const yaOpino = (sucursalId, departamento, usuarioClave) => {
    if (!usuarioClave) return false;
    const feedbacks = leer(STORAGE_KEYS.FEEDBACK);
    return feedbacks.some(f => f.sucursalId === sucursalId && f.departamento === departamento && f.usuarioClave === usuarioClave);
};

// ── Ranking Calculation ──────────────────────────────

/**
 * Calculate average ranking from feedback.
 * Uses weighted average of mood + moodBus + moodTripulacion.
 * Returns null if no feedback (falls back to default ranking).
 */
export const calcularRankingPromedio = (sucursalId, departamento) => {
    const feedbacks = obtenerFeedback(sucursalId, departamento);
    if (feedbacks.length === 0) return null;
    const suma = feedbacks.reduce((acc, f) => {
        const prom = ((f.mood || 3) + (f.moodBus || f.mood || 3) + (f.moodTripulacion || f.mood || 3)) / 3;
        return acc + prom;
    }, 0);
    return Math.round((suma / feedbacks.length) * 10) / 10;
};

// ── Mood Labels ──────────────────────────────────────

export const obtenerLabelsPorMood = (mood) => {
    if (mood === 1) return [
        { emoji: '🧹', texto: 'Suciedad' },
        { emoji: '💺', texto: 'Asientos rotos' },
        { emoji: '⏰', texto: 'Gran retraso' },
        { emoji: '😤', texto: 'Mal trato' },
        { emoji: '📵', texto: 'Conductor grosero' },
        { emoji: '📶', texto: 'Sin WiFi' },
        { emoji: '🌡️', texto: 'Sin climatización' },
        { emoji: '🛣️', texto: 'Manejo peligroso' },
        { emoji: '🚌', texto: 'Bus en mal estado' },
        { emoji: '💸', texto: 'Precio abusivo' },
        { emoji: '🔒', texto: 'Me sentí inseguro/a' },
        { emoji: '🗑️', texto: 'Baño asqueroso' },
        { emoji: '🎵', texto: 'Volumen excesivo' },
        { emoji: '🚫', texto: 'No cumplió lo prometido' },
    ];
    if (mood === 2) return [
        { emoji: '🧹', texto: 'Poca limpieza' },
        { emoji: '💺', texto: 'Incomodidad' },
        { emoji: '⏰', texto: 'Retraso' },
        { emoji: '😒', texto: 'Atención pobre' },
        { emoji: '📶', texto: 'WiFi fallando' },
        { emoji: '❄️', texto: 'Temperatura inadecuada' },
        { emoji: '🛣️', texto: 'Manejo brusco' },
        { emoji: '🔇', texto: 'Mucho ruido' },
        { emoji: '💸', texto: 'Precio elevado' },
        { emoji: '🚌', texto: 'Bus viejo' },
        { emoji: '🕐', texto: 'Salida tardía' },
        { emoji: '🚫', texto: 'Promesas incumplidas' },
    ];
    if (mood === 3) return [
        { emoji: '😐', texto: 'Servicio aceptable' },
        { emoji: '💺', texto: 'Asientos regulares' },
        { emoji: '🕐', texto: 'Leve retraso' },
        { emoji: '🧹', texto: 'Limpieza básica' },
        { emoji: '📶', texto: 'WiFi intermitente' },
        { emoji: '🌡️', texto: 'Temperatura tolerable' },
        { emoji: '🤷', texto: 'Atención normal' },
        { emoji: '🎵', texto: 'Sin entretenimiento' },
        { emoji: '💸', texto: 'Precio justo' },
        { emoji: '🛣️', texto: 'Ruta larga' },
        { emoji: '🔌', texto: 'Sin cargadores' },
        { emoji: '🏁', texto: 'Llegó a destino' },
    ];
    if (mood === 4) return [
        { emoji: '🤝', texto: 'Buena atención' },
        { emoji: '✨', texto: 'Bus limpio' },
        { emoji: '🏁', texto: 'Puntual' },
        { emoji: '🛋️', texto: 'Cómodo' },
        { emoji: '📶', texto: 'WiFi funcional' },
        { emoji: '❄️', texto: 'Buena temperatura' },
        { emoji: '🛣️', texto: 'Manejo seguro' },
        { emoji: '😊', texto: 'Conductor amable' },
        { emoji: '💸', texto: 'Buen precio' },
        { emoji: '🔌', texto: 'Cargadores disponibles' },
        { emoji: '🎵', texto: 'Buen entretenimiento' },
        { emoji: '🚌', texto: 'Bus moderno' },
    ];
    // mood === 5
    return [
        { emoji: '🤩', texto: 'Servicio excepcional' },
        { emoji: '✨', texto: 'Bus impecable' },
        { emoji: '⚡', texto: 'Súper puntual' },
        { emoji: '🛋️', texto: 'Máxima comodidad' },
        { emoji: '📶', texto: 'WiFi excelente' },
        { emoji: '❄️', texto: 'Temperatura perfecta' },
        { emoji: '🛣️', texto: 'Conducción profesional' },
        { emoji: '😄', texto: 'Personal muy amable' },
        { emoji: '💰', texto: 'Excelente precio' },
        { emoji: '🌟', texto: '100% recomendado' },
        { emoji: '🎭', texto: 'Entretenimiento excelente' },
        { emoji: '🍫', texto: 'Refrigerio incluido' },
        { emoji: '🔌', texto: 'Cargadores y enchufes' },
        { emoji: '🏆', texto: 'Mejor empresa' },
    ];
};

export default {
    SUCURSALES_MOCK,
    obtenerSucursalesOrdenadas,
    obtenerSucursalPorId,
    obtenerViajesSucursal,
    enviarFeedback,
    obtenerFeedback,
    yaOpino,
    calcularRankingPromedio,
    obtenerLabelsPorMood,
};
