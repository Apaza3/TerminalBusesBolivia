import { USE_MOCK_DATA, API_BASE } from '../config';
import * as mock from '../data/mockFleetDB';
import { BUSES_MOCK } from '../data/mockStaffDB';
import { obtenerTodosStaff } from '../data/mockAuthDB';

const getToken = () => {
    try {
        const s = JSON.parse(localStorage.getItem('tbb_session') || sessionStorage.getItem('tbb_session') || '{}');
        return s.token || null;
    } catch { return null; }
};

const apiFetch = async (path, opts = {}) => {
    const token = getToken();
    const res = await fetch(`${API_BASE}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...opts.headers,
        },
        ...opts,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return json;
};

// ── Sucursales ─────────────────────────────────────────────────────────────────

export const listarSucursales = async (soloActivas = false) => {
    if (USE_MOCK_DATA) return mock.listarSucursales(soloActivas);
    return apiFetch(`/sucursales${soloActivas ? '?activa=true' : ''}`);
};

export const crearSucursal = async (datos) => {
    if (USE_MOCK_DATA) return mock.crearSucursal(datos);
    const data = await apiFetch('/sucursales', { method: 'POST', body: JSON.stringify(datos) });
    return { exito: true, data };
};

export const actualizarSucursal = async (id, datos) => {
    if (USE_MOCK_DATA) return mock.actualizarSucursal(id, datos);
    const data = await apiFetch(`/sucursales/${id}`, { method: 'PUT', body: JSON.stringify(datos) });
    return { exito: true, data };
};

export const toggleSucursal = async (id) => {
    if (USE_MOCK_DATA) return mock.toggleSucursal(id);
    const data = await apiFetch(`/sucursales/${id}/toggle`, { method: 'PATCH' });
    return { exito: true, data };
};

// ── Rutas ─────────────────────────────────────────────────────────────────────

export const listarRutas = async (soloActivas = false) => {
    if (USE_MOCK_DATA) return mock.listarRutas(soloActivas);
    return apiFetch(`/rutas${soloActivas ? '?activa=true' : ''}`);
};

export const crearRuta = async (datos) => {
    if (USE_MOCK_DATA) return mock.crearRuta(datos);
    const data = await apiFetch('/rutas', { method: 'POST', body: JSON.stringify(datos) });
    return { exito: true, data };
};

export const actualizarRuta = async (id, datos) => {
    if (USE_MOCK_DATA) return mock.actualizarRuta(id, datos);
    const data = await apiFetch(`/rutas/${id}`, { method: 'PUT', body: JSON.stringify(datos) });
    return { exito: true, data };
};

export const toggleRuta = async (id) => {
    if (USE_MOCK_DATA) return mock.toggleRuta(id);
    const data = await apiFetch(`/rutas/${id}/toggle`, { method: 'PATCH' });
    return { exito: true, data };
};

// ── Itinerarios ───────────────────────────────────────────────────────────────

export const listarItinerarios = async (filtros = {}) => {
    if (USE_MOCK_DATA) return mock.listarItinerarios(filtros);
    const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filtros).filter(([, v]) => v))
    ).toString();
    return apiFetch(`/itinerarios${params ? '?' + params : ''}`);
};

export const crearItinerario = async (datos) => {
    if (USE_MOCK_DATA) return mock.crearItinerario(datos);
    const data = await apiFetch('/itinerarios', { method: 'POST', body: JSON.stringify(datos) });
    return { exito: true, data };
};

export const cambiarEstadoItinerario = async (id, estado) => {
    if (USE_MOCK_DATA) return mock.actualizarEstadoItinerario(id, estado);
    const data = await apiFetch(`/itinerarios/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado }) });
    return { exito: true, data };
};

// ── Disponibilidad de recursos ────────────────────────────────────────────────

export const disponibilidadRecursos = async () => {
    if (USE_MOCK_DATA) return mock.disponibilidadRecursos();
    return apiFetch('/buses?include_itinerarios=true');
};

// ── Buses para selección (con SOAT mock) ─────────────────────────────────────

const SOAT_VIGENTE_DEFAULT = '2027-12-31'; // mock: todos los buses tienen SOAT vigente por defecto

export const listarBusesDisponibles = async () => {
    if (USE_MOCK_DATA) {
        return Object.values(BUSES_MOCK).map(b => ({
            ...b,
            estado:           'disponible',
            soat_vence:       SOAT_VIGENTE_DEFAULT,
            inspeccion_vence: SOAT_VIGENTE_DEFAULT,
        }));
    }
    return apiFetch('/buses/disponibles');
};

// ── Conductores para selección ────────────────────────────────────────────────

export const listarConductores = async () => {
    if (USE_MOCK_DATA) {
        const todos = obtenerTodosStaff();
        return todos.filter(u => u.rol === 'conductor' && u.activo !== false);
    }
    return apiFetch('/admin/tripulacion?rol=conductor');
};
