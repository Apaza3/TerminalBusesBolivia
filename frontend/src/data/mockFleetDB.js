import { SUCURSALES_MOCK } from './mockDiscoveryDB';

const KEYS = {
    RUTAS:      'tbb_rutas',
    ITINERARIOS:'tbb_itinerarios',
    SUCURSALES: 'tbb_sucursales_admin',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const leer  = (key, def = []) => { try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; } };
const guardar = (key, data) => { try { localStorage.setItem(key, JSON.stringify(data)); } catch { } };
const uid   = () => 'mock-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const hoy   = () => new Date().toISOString().split('T')[0];

// ── Sucursales ─────────────────────────────────────────────────────────────────

const SUCURSALES_DEFAULT = SUCURSALES_MOCK.map(s => ({
    id:          s.id,
    nombre:      s.nombre,
    logo_emoji:  s.logoEmoji,
    color_accent:s.colorAccent,
    departamento: s.departamento,
    ciudad:      s.ciudad,
    telefono:    null,
    direccion:   null,
    descripcion: null,
    ranking:     s.ranking,
    activa:      true,
}));

const leerSucursales = () => {
    const stored = leer(KEYS.SUCURSALES, null);
    if (!stored) {
        guardar(KEYS.SUCURSALES, SUCURSALES_DEFAULT);
        return SUCURSALES_DEFAULT;
    }
    return stored;
};

export const listarSucursales = (soloActivas = false) => {
    const all = leerSucursales();
    return soloActivas ? all.filter(s => s.activa) : all;
};

export const obtenerSucursal = (id) => leerSucursales().find(s => s.id === id) || null;

export const crearSucursal = (datos) => {
    const all = leerSucursales();
    const nueva = { ...datos, id: uid(), activa: true };
    guardar(KEYS.SUCURSALES, [...all, nueva]);
    return { exito: true, data: nueva };
};

export const actualizarSucursal = (id, datos) => {
    const all = leerSucursales();
    const idx = all.findIndex(s => s.id === id);
    if (idx === -1) return { exito: false, error: 'Sucursal no encontrada.' };
    all[idx] = { ...all[idx], ...datos };
    guardar(KEYS.SUCURSALES, all);
    return { exito: true, data: all[idx] };
};

export const toggleSucursal = (id) => {
    const all = leerSucursales();
    const idx = all.findIndex(s => s.id === id);
    if (idx === -1) return { exito: false, error: 'Sucursal no encontrada.' };
    all[idx].activa = !all[idx].activa;
    guardar(KEYS.SUCURSALES, all);
    return { exito: true, data: all[idx] };
};

// ── Rutas ─────────────────────────────────────────────────────────────────────

const RUTAS_DEFAULT = [
    {
        id: 'ruta-001', origen: 'La Paz', destino: 'Cochabamba',
        departamento_origen: 'La Paz', departamento_destino: 'Cochabamba',
        distancia_km: 380, duracion_estimada: 360, activa: true,
        paradas: [
            { id: 'p-001', nombre: 'Patacamaya', orden: 1, distancia_km: 95,  tiempo_min: 90  },
            { id: 'p-002', nombre: 'Oruro',      orden: 2, distancia_km: 230, tiempo_min: 210 },
            { id: 'p-003', nombre: 'Caracollo',  orden: 3, distancia_km: 270, tiempo_min: 250 },
        ],
    },
    {
        id: 'ruta-002', origen: 'La Paz', destino: 'Santa Cruz',
        departamento_origen: 'La Paz', departamento_destino: 'Santa Cruz',
        distancia_km: 1000, duracion_estimada: 1080, activa: true,
        paradas: [
            { id: 'p-004', nombre: 'Cochabamba', orden: 1, distancia_km: 380, tiempo_min: 360 },
            { id: 'p-005', nombre: 'Montero',    orden: 2, distancia_km: 850, tiempo_min: 900 },
        ],
    },
];

export const listarRutas = (soloActivas = false) => {
    const all = leer(KEYS.RUTAS, null);
    if (!all) { guardar(KEYS.RUTAS, RUTAS_DEFAULT); return soloActivas ? RUTAS_DEFAULT.filter(r => r.activa) : RUTAS_DEFAULT; }
    return soloActivas ? all.filter(r => r.activa) : all;
};

export const obtenerRuta = (id) => listarRutas().find(r => r.id === id) || null;

export const crearRuta = (datos) => {
    const { paradas = [], ...rest } = datos;
    if (!rest.origen || !rest.destino) return { exito: false, error: 'origen y destino son requeridos.' };
    if (rest.origen === rest.destino)  return { exito: false, error: 'origen y destino no pueden ser iguales.' };
    if (!rest.distancia_km || rest.distancia_km <= 0) return { exito: false, error: 'distancia_km debe ser > 0.' };

    const all = listarRutas();
    const nueva = {
        ...rest,
        id: uid(),
        activa: true,
        paradas: paradas.map((p, i) => ({ ...p, id: uid(), orden: i + 1 })),
    };
    guardar(KEYS.RUTAS, [...all, nueva]);
    return { exito: true, data: nueva };
};

export const actualizarRuta = (id, datos) => {
    const all = listarRutas();
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) return { exito: false, error: 'Ruta no encontrada.' };
    const { paradas, ...rest } = datos;
    all[idx] = {
        ...all[idx], ...rest,
        ...(paradas !== undefined ? { paradas: paradas.map((p, i) => ({ ...p, id: p.id || uid(), orden: i + 1 })) } : {}),
    };
    guardar(KEYS.RUTAS, all);
    return { exito: true, data: all[idx] };
};

export const toggleRuta = (id) => {
    const all = listarRutas();
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) return { exito: false, error: 'Ruta no encontrada.' };
    all[idx].activa = !all[idx].activa;
    guardar(KEYS.RUTAS, all);
    return { exito: true, data: all[idx] };
};

// ── Itinerarios ───────────────────────────────────────────────────────────────

export const listarItinerarios = ({ fecha, bus_id, conductor_id, estado } = {}) => {
    let all = leer(KEYS.ITINERARIOS, []);
    if (fecha)        all = all.filter(it => it.salida_programada?.startsWith(fecha));
    if (bus_id)       all = all.filter(it => it.bus_id === bus_id);
    if (conductor_id) all = all.filter(it => it.conductor_id === conductor_id);
    if (estado)       all = all.filter(it => it.estado === estado);
    return all.sort((a, b) => a.salida_programada?.localeCompare(b.salida_programada));
};

export const obtenerItinerario = (id) => leer(KEYS.ITINERARIOS, []).find(it => it.id === id) || null;

export const crearItinerario = (datos) => {
    const { ruta_id, bus_id, salida_programada, precio_base } = datos;
    if (!ruta_id || !bus_id || !salida_programada || precio_base === undefined)
        return { exito: false, error: 'ruta_id, bus_id, salida_programada y precio_base son requeridos.' };

    const all  = leer(KEYS.ITINERARIOS, []);
    const ruta = obtenerRuta(ruta_id);
    const duracion = ruta?.duracion_estimada || 240;

    // Validar solapamiento en mock
    const solapa = validarSolapamientoLocal(all, bus_id, datos.conductor_id, salida_programada, duracion);
    if (!solapa.valido) return { exito: false, error: solapa.error };

    const nuevo = {
        ...datos,
        id:      uid(),
        estado:  'programado',
        ruta,
        duracion_min: duracion,
    };
    guardar(KEYS.ITINERARIOS, [...all, nuevo]);
    return { exito: true, data: nuevo };
};

export const actualizarEstadoItinerario = (id, estado) => {
    const all = leer(KEYS.ITINERARIOS, []);
    const idx = all.findIndex(it => it.id === id);
    if (idx === -1) return { exito: false, error: 'Itinerario no encontrado.' };
    all[idx].estado = estado;
    guardar(KEYS.ITINERARIOS, all);
    return { exito: true, data: all[idx] };
};

// ── Validación solapamiento (cliente) ─────────────────────────────────────────

export const validarSolapamientoLocal = (itinerarios, busId, conductorId, salida, duracionMin, excluirId = null) => {
    const salidaDt = new Date(salida);
    const finDt    = new Date(salidaDt.getTime() + duracionMin * 60 * 1000);

    for (const it of itinerarios) {
        if (it.id === excluirId) continue;
        if (!['programado', 'en_ruta'].includes(it.estado)) continue;

        const itInicio = new Date(it.salida_programada);
        const itFin    = new Date(itInicio.getTime() + (it.duracion_min || 240) * 60 * 1000);

        if (!(salidaDt < itFin && finDt > itInicio)) continue;

        if (it.bus_id === busId)
            return { valido: false, error: 'El bus ya tiene un itinerario en ese horario.' };
        if (conductorId && it.conductor_id === conductorId)
            return { valido: false, error: 'El conductor ya tiene un itinerario en ese horario.' };
    }
    return { valido: true };
};

// ── Disponibilidad de recursos (mock) ─────────────────────────────────────────

export const disponibilidadRecursos = () => {
    const itinerarios = leer(KEYS.ITINERARIOS, []);
    const ahora = new Date().toISOString();

    const busesEnRuta = new Set(
        itinerarios
            .filter(it => it.estado === 'en_ruta' || (it.estado === 'programado' && it.salida_programada <= ahora))
            .map(it => it.bus_id)
    );

    const conductoresOcupados = new Set(
        itinerarios
            .filter(it => ['en_ruta', 'programado'].includes(it.estado) && it.salida_programada >= ahora)
            .map(it => it.conductor_id).filter(Boolean)
    );

    return {
        itinerarios_activos: itinerarios.filter(it => ['programado', 'en_ruta'].includes(it.estado)),
        buses_en_ruta: [...busesEnRuta],
        conductores_ocupados: [...conductoresOcupados],
        generado_en: new Date().toISOString(),
    };
};
