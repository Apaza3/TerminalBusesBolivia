/**
 * mockAnalyticsDB.js
 * Analytics data layer for the Terminal Management Dashboard (V4 Branch 4).
 * Aggregates traffic, revenue, and occupancy data from existing mock stores.
 */

// ── Traffic Heatmap Data (departures per hour, 6am-11pm) ─────

export const TRAFICO_POR_HORA = [
    { hora: '06:00', salidas: 3, llegadas: 1, label: '6 AM' },
    { hora: '07:00', salidas: 5, llegadas: 2, label: '7 AM' },
    { hora: '08:00', salidas: 8, llegadas: 3, label: '8 AM' },
    { hora: '09:00', salidas: 6, llegadas: 4, label: '9 AM' },
    { hora: '10:00', salidas: 4, llegadas: 5, label: '10 AM' },
    { hora: '11:00', salidas: 3, llegadas: 3, label: '11 AM' },
    { hora: '12:00', salidas: 2, llegadas: 2, label: '12 PM' },
    { hora: '13:00', salidas: 3, llegadas: 2, label: '1 PM' },
    { hora: '14:00', salidas: 5, llegadas: 3, label: '2 PM' },
    { hora: '15:00', salidas: 4, llegadas: 4, label: '3 PM' },
    { hora: '16:00', salidas: 3, llegadas: 5, label: '4 PM' },
    { hora: '17:00', salidas: 2, llegadas: 4, label: '5 PM' },
    { hora: '18:00', salidas: 6, llegadas: 6, label: '6 PM' },
    { hora: '19:00', salidas: 7, llegadas: 5, label: '7 PM' },
    { hora: '20:00', salidas: 9, llegadas: 3, label: '8 PM' },
    { hora: '21:00', salidas: 6, llegadas: 2, label: '9 PM' },
    { hora: '22:00', salidas: 3, llegadas: 1, label: '10 PM' },
    { hora: '23:00', salidas: 1, llegadas: 0, label: '11 PM' },
];

// ── Revenue by Route ─────────────────────────────────

export const INGRESOS_POR_RUTA = [
    { ruta: 'La Paz → Santa Cruz', ingresos: 12450, boletos: 147, ocupacion: 87 },
    { ruta: 'La Paz → Cochabamba', ingresos: 9800, boletos: 218, ocupacion: 92 },
    { ruta: 'Cochabamba → Sucre', ingresos: 5600, boletos: 160, ocupacion: 75 },
    { ruta: 'La Paz → Oruro', ingresos: 4200, boletos: 168, ocupacion: 82 },
    { ruta: 'La Paz → Potosí', ingresos: 3850, boletos: 70, ocupacion: 65 },
    { ruta: 'Cochabamba → Santa Cruz', ingresos: 7200, boletos: 120, ocupacion: 78 },
    { ruta: 'La Paz → Tarija', ingresos: 5100, boletos: 51, ocupacion: 58 },
    { ruta: 'Santa Cruz → La Paz', ingresos: 8900, boletos: 105, ocupacion: 84 },
];

// ── KPI Summary ──────────────────────────────────────

export const obtenerKPIs = () => {
    const totalIngresos = INGRESOS_POR_RUTA.reduce((acc, r) => acc + r.ingresos, 0);
    const totalBoletos = INGRESOS_POR_RUTA.reduce((acc, r) => acc + r.boletos, 0);
    const rutasActivas = INGRESOS_POR_RUTA.length;
    const ocupacionPromedio = Math.round(INGRESOS_POR_RUTA.reduce((acc, r) => acc + r.ocupacion, 0) / rutasActivas);
    const totalSalidasDiarias = TRAFICO_POR_HORA.reduce((acc, h) => acc + h.salidas, 0);

    return {
        ingresosTotales: totalIngresos,
        totalBoletos,
        rutasActivas,
        ocupacionPromedio,
        busesEnServicio: 12,
        salidasDiarias: totalSalidasDiarias,
    };
};

// ── Occupancy Analysis ───────────────────────────────

export const obtenerAnalisisOcupacion = () => {
    return INGRESOS_POR_RUTA.map(r => ({
        ruta: r.ruta,
        ocupacion: r.ocupacion,
        estado: r.ocupacion >= 85 ? 'alta' : r.ocupacion >= 65 ? 'media' : 'baja',
        recomendacion: r.ocupacion >= 85
            ? 'Considerar turno extra'
            : r.ocupacion < 60
                ? 'Evaluar reducción de frecuencia'
                : 'Frecuencia adecuada',
    }));
};

// ── Bus Maintenance Tracking ─────────────────────────

export const BUSES_MANTENIMIENTO = [
    { id: 'bus-01', placa: 'ABC-1234', km: 145000, ultimoMantenimiento: '2026-02-15', viajesDesde: 82, estado: 'ok' },
    { id: 'bus-02', placa: 'DEF-5678', km: 198000, ultimoMantenimiento: '2026-01-20', viajesDesde: 134, estado: 'alerta' },
    { id: 'bus-03', placa: 'GHI-9012', km: 85000, ultimoMantenimiento: '2026-03-10', viajesDesde: 45, estado: 'ok' },
    { id: 'bus-04', placa: 'JKL-3456', km: 220000, ultimoMantenimiento: '2025-12-05', viajesDesde: 180, estado: 'critico' },
    { id: 'bus-05', placa: 'MNO-7890', km: 167000, ultimoMantenimiento: '2026-02-28', viajesDesde: 95, estado: 'alerta' },
];

// ── Data for AI Context ──────────────────────────────

export const generarContextoIA = () => {
    const kpis = obtenerKPIs();
    const ocupacion = obtenerAnalisisOcupacion();
    const rutasAlta = ocupacion.filter(r => r.estado === 'alta');
    const rutasBaja = ocupacion.filter(r => r.estado === 'baja');
    const busesAlerta = BUSES_MANTENIMIENTO.filter(b => b.estado !== 'ok');

    return {
        resumen: `Terminal con ${kpis.rutasActivas} rutas activas, ${kpis.busesEnServicio} buses, Bs ${kpis.ingresosTotales.toLocaleString()} ingresos mensuales.`,
        rutasAltaDemanda: rutasAlta.map(r => r.ruta),
        rutasBajaDemanda: rutasBaja.map(r => r.ruta),
        busesRequierenAtencion: busesAlerta,
        horasPico: TRAFICO_POR_HORA.filter(h => h.salidas >= 7).map(h => h.label),
        kpis,
    };
};

export default {
    TRAFICO_POR_HORA,
    INGRESOS_POR_RUTA,
    obtenerKPIs,
    obtenerAnalisisOcupacion,
    BUSES_MANTENIMIENTO,
    generarContextoIA,
};
