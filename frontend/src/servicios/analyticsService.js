// [Académico] Sprint 5 - Servicio analítica: consultas agregadas mock/Supabase (R22, R23, R24)
import { USE_MOCK_DATA, API_BASE } from '../config';
import {
    obtenerKPIs, INGRESOS_POR_RUTA, TRAFICO_POR_HORA,
    obtenerAnalisisOcupacion, BUSES_MANTENIMIENTO,
} from '../data/mockAnalyticsDB';
import { obtenerReservas, obtenerVentas } from '../data/mockStorage';

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
    if (USE_MOCK_DATA) {
        const base = obtenerKPIs();
        const reservas = obtenerReservas() || [];
        const ventas = obtenerVentas ? obtenerVentas() : [];
        const ingresosMock = ventas.reduce((s, v) => s + (v.total || 0), 0);

        // [Académico] Sprint 5 - Combinar datos mock con datos reales de localStorage
        return {
            ...base,
            ingresosTotales: ingresosMock > 0 ? base.ingresosTotales + ingresosMock : base.ingresosTotales,
            totalBoletos: base.totalBoletos + reservas.length,
            reservasReales: reservas.length,
            filtros,
        };
    }
    return apiFetch('/admin/analytics/kpis');
};

// ── Rendimiento por ruta (R23) ─────────────────────────────────────────────────

export const obtenerRendimientoRutas = async (filtros = {}) => {
    if (USE_MOCK_DATA) {
        const ocupacion = obtenerAnalisisOcupacion();
        const ciudad = filtros.departamento || null;
        const rutasFiltradas = ciudad
            ? INGRESOS_POR_RUTA.filter(r => r.ruta.startsWith(ciudad + ' →'))
            : INGRESOS_POR_RUTA;
        return rutasFiltradas.map(r => {
            const ocup = ocupacion.find(o => o.ruta === r.ruta);
            const incidencias = JSON.parse(localStorage.getItem('tbb_incidencias') || '[]')
                .filter(i => i.descripcion?.toLowerCase().includes(r.ruta.split(' → ')[0].toLowerCase())).length;
            return {
                ruta: r.ruta,
                ingresos: r.ingresos,
                boletos: r.boletos,
                ocupacion: r.ocupacion,
                estado: ocup?.estado || 'media',
                recomendacion: ocup?.recomendacion || '—',
                incidencias,
                puntualidad: Math.max(70, 98 - incidencias * 5), // académico: simulado
            };
        }).sort((a, b) => b.ingresos - a.ingresos);
    }
    return apiFetch('/admin/analytics/rutas');
};

// ── Calificaciones / Ranking (R24) ─────────────────────────────────────────────

const CALIFICACIONES_KEY = 'tbb_calificaciones_viaje';

export const guardarCalificacion = (calificacion) => {
    const prev = JSON.parse(localStorage.getItem(CALIFICACIONES_KEY) || '[]');
    const duplicado = prev.find(c => c.boletoId === calificacion.boletoId);
    if (duplicado) return { ok: false, error: 'Ya calificaste este viaje.' };
    const nueva = { ...calificacion, id: `cal_${Date.now()}`, creadoEn: new Date().toISOString() };
    prev.push(nueva);
    localStorage.setItem(CALIFICACIONES_KEY, JSON.stringify(prev));
    return { ok: true, calificacion: nueva };
};

export const yaCalificado = (boletoId) => {
    const prev = JSON.parse(localStorage.getItem(CALIFICACIONES_KEY) || '[]');
    return prev.some(c => c.boletoId === boletoId);
};

export const obtenerRankingEmpresas = async () => {
    if (USE_MOCK_DATA) {
        const calificaciones = JSON.parse(localStorage.getItem(CALIFICACIONES_KEY) || '[]');
        const seedRanking = JSON.parse(localStorage.getItem('tbb_ranking_seed') || 'null') || generarRankingSeed();

        // Fusionar seed académico con calificaciones reales
        return seedRanking.map(empresa => {
            const calsEmpresa = calificaciones.filter(c => c.sucursalId === empresa.id);
            const totalPuntos = calsEmpresa.reduce((s, c) => s + c.puntuacion, 0);
            const promedio = calsEmpresa.length > 0
                ? (empresa.promedioBase * empresa.cantidadBase + totalPuntos) / (empresa.cantidadBase + calsEmpresa.length)
                : empresa.promedioBase;
            return {
                ...empresa,
                promedio: Math.round(promedio * 10) / 10,
                totalCalificaciones: empresa.cantidadBase + calsEmpresa.length,
            };
        }).sort((a, b) => b.promedio - a.promedio);
    }
    return apiFetch('/admin/analytics/ranking');
};

const generarRankingSeed = () => {
    const seed = [
        { id: 'demo-s1', nombre: 'Trans Bolivia La Paz',    promedioBase: 4.3, cantidadBase: 142, viajes: 1245, ciudad: 'La Paz'       },
        { id: 'demo-s2', nombre: 'Trans Cochabamba Express', promedioBase: 4.1, cantidadBase: 98,  viajes: 876,  ciudad: 'Cochabamba'   },
        { id: 'demo-s3', nombre: 'Trans Santa Cruz VIP',    promedioBase: 4.6, cantidadBase: 201, viajes: 1890, ciudad: 'Santa Cruz'    },
        { id: 'demo-s4', nombre: 'Trans Oruro Norte',       promedioBase: 3.8, cantidadBase: 67,  viajes: 534,  ciudad: 'Oruro'        },
        { id: 'demo-s5', nombre: 'Trans Potosí Andino',     promedioBase: 4.0, cantidadBase: 55,  viajes: 402,  ciudad: 'Potosí'       },
        { id: 'demo-s6', nombre: 'Trans Sucre Real',        promedioBase: 4.4, cantidadBase: 88,  viajes: 712,  ciudad: 'Sucre'        },
    ];
    localStorage.setItem('tbb_ranking_seed', JSON.stringify(seed));
    return seed;
};

// ── Manifiesto de pasajeros (RN-01) ───────────────────────────────────────────

export const obtenerManifiestoItinerario = async (itinerarioId) => {
    if (USE_MOCK_DATA) {
        const reservas = obtenerReservas(itinerarioId) || [];
        return reservas.map(r => ({
            pasajeroNombre: r.pasajeroNombre,
            pasajeroCI: r.pasajeroCI,
            asientos: r.asientos,
            origen: r.origen,
            destino: r.destino,
            fechaSalida: r.fechaSalida,
            precio: r.precioTotal,
            abordado: r.abordado || false,
        }));
    }
    return apiFetch(`/admin/itinerarios/${itinerarioId}/manifiesto`);
};

// ── Tráfico por hora ──────────────────────────────────────────────────────────

export const obtenerTraficoPorHora = () => TRAFICO_POR_HORA;

// ── Historial ventas (R22) con timestamps ────────────────────────────────────

const VENTAS_HISTORICO_KEY = 'tbb_ventas_historico';

export const obtenerVentasHistorico = (dias = 30) => {
    const stored = JSON.parse(localStorage.getItem(VENTAS_HISTORICO_KEY) || 'null');
    if (stored) return stored;
    // [Académico] Sprint 5 - Seed histórico 30 días
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
    localStorage.setItem(VENTAS_HISTORICO_KEY, JSON.stringify(seed));
    return seed;
};

// ── HU-30: Logger E2E trace ───────────────────────────────────────────────────

const E2E_LOG_KEY = 'tbb_e2e_trace';

export const e2eLog = (evento, datos = {}) => {
    const prev = JSON.parse(localStorage.getItem(E2E_LOG_KEY) || '[]');
    const entry = { evento, datos, ts: new Date().toISOString() };
    prev.push(entry);
    localStorage.setItem(E2E_LOG_KEY, JSON.stringify(prev.slice(-100)));
    // [Académico] Sprint 5 - HU-30: trace Registro→Compra→Viaje→Calificación→Reporte
    console.log(`[E2E] ${evento}`, datos);
    return entry;
};

export const obtenerTraceE2E = () =>
    JSON.parse(localStorage.getItem(E2E_LOG_KEY) || '[]');
