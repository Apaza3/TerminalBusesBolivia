// [Académico] Sprint 4 - Servicio operaciones de transporte (R17, R18, R19, R20, R26, R29, R31)
import { USE_MOCK_DATA, API_BASE } from '../config';
import {
    validarBoleto, marcarAbordado, obtenerBoletosViaje,
    actualizarEstadoViaje,
} from '../data/mockStorage';

const getToken = () => {
    try {
        const raw = localStorage.getItem('tbb_session') || sessionStorage.getItem('tbb_session');
        return raw ? JSON.parse(raw).token : null;
    } catch { return null; }
};

const apiFetch = async (path, opts = {}) => {
    const token = getToken();
    const res = await fetch(`${API_BASE}${path}`, {
        ...opts,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(opts.headers || {}),
        },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
};

// ── Abordaje / QR ──────────────────────────────────────────────────────────────

export const validarQR = async (codigoBoleto, viajeId, wsEmit = null) => {
    if (USE_MOCK_DATA) {
        const boleto = validarBoleto(codigoBoleto);
        if (!boleto) return { valido: false, error: 'Boleto no encontrado.' };
        if (boleto.abordado) return { valido: false, error: 'Pasajero ya abordó.', boleto, yaAbordado: true };
        if (viajeId && boleto.viajeId !== viajeId) return { valido: false, error: 'Boleto no corresponde a este viaje.' };
        const res = marcarAbordado(codigoBoleto);
        if (res.exito) {
            wsEmit?.('abordaje_validado', { boletoId: codigoBoleto, pasajero: res.boleto?.pasajeroNombre });
            return { valido: true, boleto: res.boleto };
        }
        return { valido: false, error: 'Error al registrar abordaje.' };
    }
    const res = await apiFetch('/conductor/validar-qr', {
        method: 'POST',
        body: JSON.stringify({ qr_token: codigoBoleto, viaje_id: viajeId }),
    });
    wsEmit?.('abordaje_validado', res);
    return { valido: true, ...res };
};

export const obtenerManifiesto = async (viajeId) => {
    if (USE_MOCK_DATA) return { boletos: obtenerBoletosViaje(viajeId) };
    return apiFetch(`/conductor/manifiesto/${viajeId}`);
};

// ── Estado de viaje (R20) ──────────────────────────────────────────────────────

export const cambiarEstadoViaje = async (viajeId, nuevoEstado, wsEmit = null) => {
    if (USE_MOCK_DATA) {
        actualizarEstadoViaje(viajeId, nuevoEstado);
        wsEmit?.('estado_viaje_actualizado', { viaje_id: viajeId, estado: nuevoEstado, ts: Date.now() });
        return { ok: true };
    }
    const res = await apiFetch(`/conductor/viajes/${viajeId}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: nuevoEstado }),
    });
    wsEmit?.('estado_viaje_actualizado', { viaje_id: viajeId, estado: nuevoEstado });
    return res;
};

// ── Incidencias (R31) ──────────────────────────────────────────────────────────

export const registrarIncidencia = async (payload, wsEmit = null) => {
    if (USE_MOCK_DATA) {
        const prev = JSON.parse(localStorage.getItem('tbb_incidencias') || '[]');
        const nueva = {
            ...payload,
            id: `inc_${Date.now()}`,
            estado: 'abierta',
            creado_en: new Date().toISOString(),
        };
        prev.push(nueva);
        localStorage.setItem('tbb_incidencias', JSON.stringify(prev));
        wsEmit?.('incidencia_creada', nueva);
        return { ok: true, incidencia: nueva };
    }
    const res = await apiFetch('/conductor/incidencias', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    wsEmit?.('incidencia_creada', res);
    return { ok: true, incidencia: res };
};

export const listarIncidencias = () =>
    JSON.parse(localStorage.getItem('tbb_incidencias') || '[]');

// ── Mantenimiento (R29) ────────────────────────────────────────────────────────

export const registrarMantenimiento = async (payload, wsEmit = null) => {
    if (USE_MOCK_DATA) {
        const prev = JSON.parse(localStorage.getItem('tbb_mantenimiento') || '[]');
        const nuevo = {
            ...payload,
            id: `mnt_${Date.now()}`,
            estado: 'abierto',
            creado_en: new Date().toISOString(),
        };
        prev.push(nuevo);
        localStorage.setItem('tbb_mantenimiento', JSON.stringify(prev));
        if (payload.severidad === 'critica') {
            wsEmit?.('alerta_mantenimiento_critico', nuevo);
        } else {
            wsEmit?.('mantenimiento_creado', nuevo);
        }
        return { ok: true, reporte: nuevo };
    }
    const res = await apiFetch('/conductor/mantenimiento', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    wsEmit?.('mantenimiento_creado', res);
    return { ok: true, reporte: res };
};

export const listarMantenimiento = () =>
    JSON.parse(localStorage.getItem('tbb_mantenimiento') || '[]');

// ── Monitor flota (R17) ────────────────────────────────────────────────────────

export const obtenerEstadoFlota = async () => {
    if (USE_MOCK_DATA) {
        const incidencias = listarIncidencias();
        const mantenimiento = listarMantenimiento();
        const itinerarios = JSON.parse(localStorage.getItem('tbb_itinerarios') || '[]');
        const notificaciones = JSON.parse(localStorage.getItem('tbb_notificaciones_anden') || '[]');
        return { incidencias, mantenimiento, itinerarios, notificaciones };
    }
    return apiFetch('/conductor/estado-flota');
};

// ── Notificaciones andén (R26) ─────────────────────────────────────────────────

export const emitirNotificacionAnden = async (payload, wsEmit = null) => {
    if (USE_MOCK_DATA) {
        const nueva = {
            ...payload,
            id: `anden_${Date.now()}`,
            creado_en: new Date().toISOString(),
        };
        const prev = JSON.parse(localStorage.getItem('tbb_notificaciones_anden') || '[]');
        prev.push(nueva);
        localStorage.setItem('tbb_notificaciones_anden', JSON.stringify(prev));
        wsEmit?.('notificacion_anden', nueva);
        return { ok: true };
    }
    return apiFetch('/conductor/notificaciones/anden', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
};
