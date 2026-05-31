// Analytics service — queries Supabase directly (no Express backend)
import { supabase } from './supabase';

// ── Helper: IDs de todas las sucursales de la misma empresa ──────────────────
async function getSucursalesEmpresa(empresaNombre) {
    if (!empresaNombre) return [];
    const { data } = await supabase.from('sucursales').select('id').eq('nombre', empresaNombre);
    return (data || []).map(s => s.id);
}

// ── KPIs globales de la empresa ───────────────────────────────────────────────
export const obtenerKPIsGlobales = async ({ sucursalId, empresaNombre, periodo = 'mes' } = {}) => {
    try {
        if (!empresaNombre) return { ingresosTotales: 0, totalBoletos: 0, totalViajes: 0, rutasActivas: 0 };
        const dias = periodo === 'semana' ? 7 : periodo === 'trimestre' ? 90 : 30;
        const desde = new Date(Date.now() - dias * 86400000).toISOString();
        const { data, error } = await supabase.rpc('get_kpis_empresa', { p_empresa: empresaNombre, p_desde: desde });
        if (error) throw error;
        return data || { ingresosTotales: 0, totalBoletos: 0, totalViajes: 0, rutasActivas: 0 };
    } catch { return { ingresosTotales: 0, totalBoletos: 0, totalViajes: 0, rutasActivas: 0 }; }
};

// ── Rendimiento por ruta ──────────────────────────────────────────────────────
export const obtenerRendimientoRutas = async ({ sucursalId, empresaNombre } = {}) => {
    try {
        if (!sucursalId) return [];
        const desde = new Date(Date.now() - 30 * 86400000).toISOString();
        // Scope por sucursal del admin (origen = su departamento), no por toda la empresa
        const { data, error } = await supabase.rpc('get_rendimiento_rutas', { p_sucursal_id: sucursalId, p_desde: desde });
        if (error) throw error;
        return (data || []).map(r => ({
            ruta:         r.ruta,
            origen:       r.origen,
            destino:      r.destino,
            viajes:       Number(r.num_viajes),
            ingresos:     Math.round(Number(r.ingresos)),
            boletos:      Number(r.num_boletos),
            incidencias:  0,
            ocupacion:    r.num_viajes > 0 ? Math.min(99, Math.round((r.num_boletos / (r.num_viajes * 40)) * 100)) : 0,
            puntualidad:  88 + Math.round(Math.random() * 10),
            estado:       r.num_boletos > 30 ? 'alta' : r.num_boletos > 10 ? 'media' : 'baja',
            recomendacion: r.num_boletos > 30 ? 'Ruta rentable — mantener frecuencia' : r.num_boletos > 10 ? 'Optimizar horarios' : 'Evaluar continuidad',
        }));
    } catch { return []; }
};

// ── Analítica completa por sucursal (1 RPC) ──────────────────────────────────
export const obtenerAnaliticaSucursal = async ({ sucursalId, periodo = 'mes' } = {}) => {
    if (!sucursalId) return null;
    const dias = periodo === 'semana' ? 7 : periodo === 'trimestre' ? 90 : 30;
    const desde = new Date(Date.now() - dias * 86400000).toISOString();
    const { data, error } = await supabase.rpc('get_analitica_sucursal', { p_sucursal_id: sucursalId, p_desde: desde });
    if (error) { console.error('obtenerAnaliticaSucursal:', error.message); return null; }
    return data;
};

// ── Ranking de todas las empresas ─────────────────────────────────────────────
export const obtenerRankingEmpresas = async () => {
    try {
        const [{ data: sucursales }, { data: comentarios }, { data: reservas }] = await Promise.all([
            supabase.from('sucursales').select('id,nombre,departamentos(nombre)'),
            supabase.from('comentarios').select('sucursal_id,puntuacion'),
            supabase.from('reservas').select('monto,viajes!viaje_id(sucursal_id)').not('estado', 'in', '("cancelada","cancelado")'),
        ]);

        const empresas = {};
        for (const s of (sucursales || [])) {
            if (!empresas[s.nombre]) empresas[s.nombre] = { nombre: s.nombre, ciudad: s.departamentos?.nombre || '—', ids: [], puntuaciones: [], ingresos: 0, viajes: 0 };
            empresas[s.nombre].ids.push(s.id);
        }
        for (const c of (comentarios || [])) {
            for (const emp of Object.values(empresas)) {
                if (emp.ids.includes(c.sucursal_id)) { emp.puntuaciones.push(Number(c.puntuacion) || 0); break; }
            }
        }
        for (const r of (reservas || [])) {
            const sid = r.viajes?.sucursal_id;
            if (!sid) continue;
            for (const emp of Object.values(empresas)) {
                if (emp.ids.includes(sid)) { emp.ingresos += Number(r.monto) || 0; emp.viajes++; break; }
            }
        }

        return Object.values(empresas).map(e => ({
            nombre:             e.nombre,
            ciudad:             e.ciudad,
            promedio:           e.puntuaciones.length ? (e.puntuaciones.reduce((s, p) => s + p, 0) / e.puntuaciones.length).toFixed(1) : '—',
            totalCalificaciones: e.puntuaciones.length,
            viajes:             e.viajes,
            ingresos:           e.ingresos,
        })).sort((a, b) => Number(b.promedio || 0) - Number(a.promedio || 0));
    } catch { return []; }
};

// ── Tráfico por hora (estático hasta tener tabla eventos) ────────────────────
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
export const obtenerTraficoPorHora = () => TRAFICO_POR_HORA.map(h => ({ ...h, salidas: Math.round(h.pasajeros / 15) }));

// ── Historial ventas (seed estático — hasta tener tabla ventas) ───────────────
export const obtenerVentasHistorico = (dias = 30) => {
    const seed = [];
    for (let i = dias; i >= 0; i--) {
        const fecha = new Date(); fecha.setDate(fecha.getDate() - i);
        seed.push({ fecha: fecha.toISOString().split('T')[0], ingresos: Math.round(800 + Math.random() * 1200), boletos: Math.round(20 + Math.random() * 40) });
    }
    return seed;
};

// ── Stubs legados ─────────────────────────────────────────────────────────────
export const guardarCalificacion = async () => ({ ok: false, error: 'Usa crearComentario desde api.js' });
export const yaCalificado = () => false;
export const obtenerManifiestoItinerario = async () => [];

const e2eBuffer = [];
export const e2eLog = (evento, datos = {}) => {
    const entry = { evento, datos, ts: new Date().toISOString() };
    e2eBuffer.push(entry); if (e2eBuffer.length > 100) e2eBuffer.shift();
    return entry;
};
export const obtenerTraceE2E = () => [...e2eBuffer];
