/**
 * mockStorage.js
 * Local data store for V3 Transactional features.
 * Uses localStorage as persistence layer. Ready to "plug-and-play" into Supabase later.
 * 
 * Data structures:
 *  - reservas: Array of reservation objects
 *  - estadoViajes: Map of trip statuses (programado, en_ruta, finalizado)
 *  - asientosPendientes: Array of seats with pending timestamps for timer cleanup
 */

const STORAGE_KEYS = {
    RESERVAS: 'tbb_reservas',
    ESTADO_VIAJES: 'tbb_estado_viajes',
    ASIENTOS_PENDIENTES: 'tbb_asientos_pendientes',
    VENTAS: 'tbb_ventas',
};

// ── Helpers ──────────────────────────────────────────

const leer = (key) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const guardar = (key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
};

const generarId = () => 'res-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);

// ── Reservas ──────────────────────────────────────────

/**
 * Validates that none of the requested seats are already reserved for this trip.
 */
export const validarDisponibilidad = (viajeId, asientos) => {
    const reservas = leer(STORAGE_KEYS.RESERVAS) || [];
    const asientosOcupados = reservas
        .filter(r => r.viajeId === viajeId && r.estado === 'confirmada')
        .flatMap(r => r.asientos);
    
    const conflictos = asientos.filter(a => asientosOcupados.includes(a));
    return { disponible: conflictos.length === 0, conflictos };
};

export const crearReserva = ({ viajeId, pasajeroNombre, pasajeroCI, pasajeroTelefono, asientos, busPlaca, origen, destino, precio, fechaSalida, pasajeros, metodoPago }) => {
    // Double-booking validation
    const { disponible, conflictos } = validarDisponibilidad(viajeId, asientos);
    if (!disponible) {
        return { error: true, mensaje: `Asientos ya reservados: ${conflictos.join(', ')}` };
    }

    const reservas = leer(STORAGE_KEYS.RESERVAS) || [];

    const nueva = {
        id: generarId(),
        viajeId,
        pasajeroNombre,
        pasajeroCI,
        pasajeroTelefono: pasajeroTelefono || '',
        asientos,
        pasajeros: pasajeros || {},
        busPlaca: busPlaca || 'ABC-1234',
        origen: origen || 'La Paz',
        destino: destino || 'Cochabamba',
        precio: precio || asientos.length * 45,
        fechaSalida: fechaSalida || new Date().toISOString(),
        metodoPago: metodoPago || 'efectivo',
        estado: 'confirmada',
        creadoEn: new Date().toISOString(),
    };

    reservas.push(nueva);
    guardar(STORAGE_KEYS.RESERVAS, reservas);

    // Liberar bloqueo temporal de esos asientos
    liberarAsientosBloqueados(viajeId, asientos);

    // Register sale for analytics
    registrarVenta(nueva);

    return nueva;
};

/**
 * Registers a sale record for analytics aggregation (Branch 4 bridge).
 */
export const registrarVenta = (reserva) => {
    const ventas = leer(STORAGE_KEYS.VENTAS) || [];
    ventas.push({
        id: 'venta-' + Date.now(),
        reservaId: reserva.id,
        ruta: `${reserva.origen} → ${reserva.destino}`,
        monto: reserva.precio,
        boletos: reserva.asientos.length,
        fecha: new Date().toISOString(),
    });
    guardar(STORAGE_KEYS.VENTAS, ventas);
};

/**
 * Get all sales (for analytics dashboard).
 */
export const obtenerVentas = () => {
    return leer(STORAGE_KEYS.VENTAS) || [];
};

export const obtenerReservas = (viajeId = null) => {
    const reservas = leer(STORAGE_KEYS.RESERVAS) || [];
    if (viajeId) return reservas.filter(r => r.viajeId === viajeId);
    return reservas;
};

export const obtenerReservaPorId = (id) => {
    const reservas = leer(STORAGE_KEYS.RESERVAS) || [];
    return reservas.find(r => r.id === id) || null;
};

// ── Estado de Viajes (Conductor) ──────────────────────

export const obtenerEstadoViaje = (viajeId) => {
    const estados = leer(STORAGE_KEYS.ESTADO_VIAJES) || {};
    return estados[viajeId] || 'programado';
};

export const actualizarEstadoViaje = (viajeId, nuevoEstado) => {
    const estados = leer(STORAGE_KEYS.ESTADO_VIAJES) || {};
    estados[viajeId] = nuevoEstado; // programado | en_ruta | finalizado | cancelado
    guardar(STORAGE_KEYS.ESTADO_VIAJES, estados);
    return nuevoEstado;
};

export const cancelarViaje = (viajeId) => {
    actualizarEstadoViaje(viajeId, 'cancelado');
    // Liberar todos los asientos pendientes del viaje
    const pendientes = leer(STORAGE_KEYS.ASIENTOS_PENDIENTES) || [];
    const filtrados = pendientes.filter(p => p.viajeId !== viajeId);
    guardar(STORAGE_KEYS.ASIENTOS_PENDIENTES, filtrados);
    return { exito: true };
};

// ── Asientos Pendientes (Timer) ──────────────────────

export const marcarAsientosPendientes = (viajeId, asientos) => {
    const pendientes = leer(STORAGE_KEYS.ASIENTOS_PENDIENTES) || [];
    const ahora = Date.now();

    asientos.forEach(asiento => {
        const idx = pendientes.findIndex(p => p.viajeId === viajeId && p.asiento === asiento);
        if (idx !== -1) pendientes.splice(idx, 1);

        pendientes.push({
            viajeId,
            asiento,
            marcadoEn: ahora,
            expiraEn: ahora + (10 * 60 * 1000), // 10 minutos (RN)
        });
    });

    guardar(STORAGE_KEYS.ASIENTOS_PENDIENTES, pendientes);
    return pendientes;
};

export const liberarAsientosBloqueados = (viajeId, asientos) => {
    const pendientes = leer(STORAGE_KEYS.ASIENTOS_PENDIENTES) || [];
    const filtrados = pendientes.filter(
        p => !(p.viajeId === viajeId && asientos.includes(p.asiento))
    );
    guardar(STORAGE_KEYS.ASIENTOS_PENDIENTES, filtrados);
};

export const obtenerAsientosPendientes = (viajeId = null) => {
    const pendientes = leer(STORAGE_KEYS.ASIENTOS_PENDIENTES) || [];
    if (viajeId) return pendientes.filter(p => p.viajeId === viajeId);
    return pendientes;
};

export const liberarAsientosExpirados = () => {
    const pendientes = leer(STORAGE_KEYS.ASIENTOS_PENDIENTES) || [];
    const ahora = Date.now();
    const vigentes = pendientes.filter(p => p.expiraEn > ahora);
    const expirados = pendientes.filter(p => p.expiraEn <= ahora);
    
    guardar(STORAGE_KEYS.ASIENTOS_PENDIENTES, vigentes);
    return { liberados: expirados, vigentes };
};

// ── Mock de Viajes para Conductor ────────────────────

export const VIAJES_CONDUCTOR_MOCK = [
    {
        id: 'viaje-cond-001',
        busPlaca: 'ABC-1234',
        origen: 'La Paz',
        destino: 'Cochabamba',
        salida: '2026-04-02T08:00:00',
        pasajeros: [
            { nombre: 'Juan Pérez', ci: '1234567', asiento: '1A', telefono: '77012345' },
            { nombre: 'María López', ci: '7654321', asiento: '1B', telefono: '76543210' },
            { nombre: 'Carlos Mamani', ci: '9876543', asiento: '2A', telefono: '71234567' },
            { nombre: 'Ana Quispe', ci: '3456789', asiento: '3C', telefono: '69876543' },
        ],
    },
    {
        id: 'viaje-cond-002',
        busPlaca: 'XYZ-5678',
        origen: 'La Paz',
        destino: 'Santa Cruz',
        salida: '2026-04-02T20:00:00',
        pasajeros: [
            { nombre: 'Roberto Flores', ci: '1112223', asiento: '1A', telefono: '70112233' },
            { nombre: 'Elena Condori', ci: '4445556', asiento: '2B', telefono: '72445566' },
        ],
    },
];

export default {
    crearReserva,
    validarDisponibilidad,
    registrarVenta,
    obtenerVentas,
    obtenerReservas,
    obtenerReservaPorId,
    obtenerEstadoViaje,
    actualizarEstadoViaje,
    cancelarViaje,
    marcarAsientosPendientes,
    liberarAsientosBloqueados,
    obtenerAsientosPendientes,
    liberarAsientosExpirados,
    VIAJES_CONDUCTOR_MOCK,
};
