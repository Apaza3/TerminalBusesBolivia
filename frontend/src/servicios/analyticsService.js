// Analytics service — data from Supabase API
import { API_BASE } from '../config';

// Static seed data for charts (no localStorage)
const TRAFICO_POR_HORA = [
    { hora: '06:00', pasajeros: 45 }, { hora: '07:00', pasajeros: 72 },
    { hora: '08:00', pasajeros: 98 }, { hora: '09:00', pasajeros: 65 },
    { hora: '10:00', pasajeros: 43 }, { hora: '11:00', pasajeros: 38 },
    { hora: '12:00', pasajeros: 56 }, { hora: '13:00', pasajeros: 71 },
    { hora: '14:00', pasajeros: 84 }, { hora: '15:00', pasajeros: 67 },
    { hora: '16:00', pasajeros: 55 }, { hora: '17:00', pasajeros: 89 },
    { hora: '18:00', pasajeros: 112 }, { hora: '19:00', pasajeros: 95 },
    { hora: '20:00', pasajeros: 63 }, { hora: '21:00', pasajeros: 34 },
];

const getToken = () => {
    try {
        const raw = localStorage.getItem('tbb_session') || sessionStorage.getItem('tbb_session');
        return raw ? JSON.parse(raw).token : null;
    } catch { return null; }
};

const apiFetch = async (path) => {
    const token = getToken();
    const res = await fetch(`${API_BASE}${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
};

// ── KPIs globales (R22) ────────────────────────────────────────────────────────

export const obtenerKPIsGlobales = async (filtros = {}) => {
    try { return await apiFetch('/admin/analytics/kpis'); }
    catch { return { ingresosTotales: 0, totalBoletos: 0, totalViajes: 0, filtros }; }
};

// ── Rendimiento por ruta (R23) ─────────────────────────────────────────────────

export const obtenerRendimientoRutas = async (filtros = {}) => { // eslint-disable-line no-unused-vars
    try { return await apiFetch('/admin/analytics/rutas'); }
    catch { return []; }
};

// ── Calificaciones / Ranking (R24) ─────────────────────────────────────────────
// Note: ratings stored in Supabase `comentarios` table via crearComentario() in api.js

export const guardarCalificacion = async (calificacion) => {
    // Legacy shim — use crearComentario from api.js directly for new code
    console.warn('[analytics] guardarCalificacion: use crearComentario from api.js');
    return { ok: false, error: 'Usa crearComentario desde api.js' };
};

export const yaCalificado = () => false;

export const obtenerRankingEmpresas = async () => {
    try { return await apiFetch('/admin/analytics/ranking'); }
    catch { return []; }
};

// ── Manifiesto de pasajeros (RN-01) ───────────────────────────────────────────

export const obtenerManifiestoItinerario = async (itinerarioId) => {
    try { return await apiFetch(`/admin/itinerarios/${itinerarioId}/manifiesto`); }
    catch { return []; }
};

// ── Tráfico por hora ──────────────────────────────────────────────────────────

export const obtenerTraficoPorHora = () => TRAFICO_POR_HORA.map(h => ({ ...h, salidas: Math.round(h.pasajeros / 15) }));

// ── Historial ventas (R22) con timestamps ────────────────────────────────────

export const obtenerVentasHistorico = (dias = 30) => {
    // Static seed for charts — real data via Supabase `ventas` table
    const seed = [];
    for (let i = dias; i >= 0; i--) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - i);
        seed.push({
            fecha: fecha.toISOString().split('T')[0],
            ingresos: Math.round(800 + Math.random() * 1200),
            boletos: Math.round(20 + Math.random() * 40),
        });
    }
    return seed;
};

// ── HU-30: Logger E2E trace (in-memory only — no localStorage) ────────────────

const e2eBuffer = [];

export const e2eLog = (evento, datos = {}) => {
    const entry = { evento, datos, ts: new Date().toISOString() };
    e2eBuffer.push(entry);
    if (e2eBuffer.length > 100) e2eBuffer.shift();
    console.log(`[E2E] ${evento}`, datos);
    return entry;
};

export const obtenerTraceE2E = () => [...e2eBuffer];
