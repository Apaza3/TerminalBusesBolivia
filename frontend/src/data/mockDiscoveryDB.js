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
        id: 'demo-s1',
        nombre: 'Trans Copacabana',
        logoEmoji: '🚌',
        colorAccent: '#3b82f6',
        departamento: 'La Paz',
        ciudad: 'La Paz',
        ranking: 4.5,
        scores: { bus: 4.5, tripulacion: 4.3, sucursal: 4.7 },
        amenidades: ['WiFi', 'Bus Cama', 'Baño'],
        totalViajes: 12,
    },
    {
        id: 'demo-s2',
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
        id: 'demo-s3',
        nombre: 'Bolívar',
        logoEmoji: '🦅',
        colorAccent: '#10b981',
        departamento: 'Cochabamba',
        ciudad: 'Cochabamba',
        ranking: 4.8,
        scores: { bus: 4.9, tripulacion: 4.7, sucursal: 4.8 },
        amenidades: ['WiFi', 'Bus Cama', 'Baño', 'TV', 'Aire Acondicionado'],
        totalViajes: 15,
    },
    {
        id: 'demo-s4',
        nombre: 'Todo Turismo',
        logoEmoji: '🌎',
        colorAccent: '#8b5cf6',
        departamento: 'Santa Cruz',
        ciudad: 'Santa Cruz',
        ranking: 4.3,
        scores: { bus: 4.1, tripulacion: 4.5, sucursal: 4.3 },
        amenidades: ['WiFi', 'Baño', 'Aire Acondicionado'],
        totalViajes: 10,
    },
    {
        id: 'demo-s5',
        nombre: 'Panamericana',
        logoEmoji: '🛣️',
        colorAccent: '#ef4444',
        departamento: 'Oruro',
        ciudad: 'Oruro',
        ranking: 3.7,
        scores: { bus: 3.5, tripulacion: 3.9, sucursal: 3.7 },
        amenidades: ['WiFi'],
        totalViajes: 6,
    },
    {
        id: 'demo-s6',
        nombre: 'Litoral Express',
        logoEmoji: '⚡',
        colorAccent: '#06b6d4',
        departamento: 'Cochabamba',
        ciudad: 'Cochabamba',
        ranking: 4.1,
        scores: { bus: 4.0, tripulacion: 4.2, sucursal: 4.1 },
        amenidades: ['WiFi', 'TV', 'Baño'],
        totalViajes: 9,
    },
];

/**
 * Get all sucursales sorted by ranking (highest first).
 * Recalculates ranking from feedback if available.
 */
export const obtenerSucursalesOrdenadas = () => {
    const sucursales = SUCURSALES_MOCK.map(s => {
        const feedbackRanking = calcularRankingPromedio(s.id);
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
 */
export const enviarFeedback = ({ sucursalId, nombreUsuario, mood, labelsSeleccionados, comentario, moodBus, moodTripulacion }) => {
    const feedbacks = leer(STORAGE_KEYS.FEEDBACK);
    const nuevo = {
        id: 'fb-' + Date.now(),
        sucursalId,
        nombreUsuario: nombreUsuario || 'Anónimo',
        avatarGenerico: AVATARES_GENERICOS[Math.floor(Math.random() * AVATARES_GENERICOS.length)],
        mood, // 1-5 general
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
 * Get all feedback for a sucursal.
 */
export const obtenerFeedback = (sucursalId) => {
    const feedbacks = leer(STORAGE_KEYS.FEEDBACK);
    return feedbacks
        .filter(f => f.sucursalId === sucursalId)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
};

// ── Ranking Calculation ──────────────────────────────

/**
 * Calculate the average ranking of a sucursal based on feedback moods.
 * Returns null if no feedback exists (falls back to default ranking).
 */
export const calcularRankingPromedio = (sucursalId) => {
    const feedbacks = obtenerFeedback(sucursalId);
    if (feedbacks.length === 0) return null;

    const suma = feedbacks.reduce((acc, f) => acc + f.mood, 0);
    return Math.round((suma / feedbacks.length) * 10) / 10; // 1 decimal
};

// ── Mood Labels ──────────────────────────────────────

export const obtenerLabelsPorMood = (mood) => {
    if (mood <= 2) {
        return [
            { emoji: '🧹', texto: 'Limpieza' },
            { emoji: '💺', texto: 'Asientos' },
            { emoji: '⏰', texto: 'Retraso' },
            { emoji: '😤', texto: 'Trato' },
            { emoji: '📶', texto: 'WiFi' },
        ];
    }
    if (mood === 3) {
        return [
            { emoji: '😐', texto: 'Aceptable' },
            { emoji: '💺', texto: 'Asientos' },
            { emoji: '🕐', texto: 'Puntualidad' },
            { emoji: '🧹', texto: 'Limpieza' },
        ];
    }
    // mood >= 4
    return [
        { emoji: '🤝', texto: 'Buena atención' },
        { emoji: '✨', texto: 'Bus limpio' },
        { emoji: '🏁', texto: 'Llegada puntual' },
        { emoji: '🛋️', texto: 'Comodidad' },
        { emoji: '🎯', texto: 'Rapidez' },
    ];
};

export default {
    SUCURSALES_MOCK,
    obtenerSucursalesOrdenadas,
    obtenerSucursalPorId,
    obtenerViajesSucursal,
    enviarFeedback,
    obtenerFeedback,
    calcularRankingPromedio,
    obtenerLabelsPorMood,
};
