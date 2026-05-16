const hoy = () => new Date().toISOString().split('T')[0];

/**
 * Verifica que el SOAT del bus esté vigente en la fecha de salida.
 * @param {string|null} fechaVence - YYYY-MM-DD
 * @param {string}      fechaSalida - YYYY-MM-DD (default: hoy)
 */
export const verificarSOATVigente = (fechaVence, fechaSalida = hoy()) => {
    if (!fechaVence) return { valido: true };
    if (fechaVence < fechaSalida)
        return { valido: false, error: `SOAT vence el ${fechaVence} (antes de la salida ${fechaSalida}).`, severidad: 'error' };
    const diff = (new Date(fechaVence) - new Date(fechaSalida)) / 86400000;
    if (diff <= 30)
        return { valido: true, advertencia: `SOAT vence el ${fechaVence} (en ${Math.round(diff)} días).`, severidad: 'warning' };
    return { valido: true };
};

/**
 * Verifica que la inspección técnica esté vigente en la fecha de salida.
 */
export const verificarInspeccionVigente = (fechaVence, fechaSalida = hoy()) => {
    if (!fechaVence) return { valido: true };
    if (fechaVence < fechaSalida)
        return { valido: false, error: `Inspección técnica vence el ${fechaVence} (antes de la salida ${fechaSalida}).`, severidad: 'error' };
    const diff = (new Date(fechaVence) - new Date(fechaSalida)) / 86400000;
    if (diff <= 30)
        return { valido: true, advertencia: `Inspección técnica vence el ${fechaVence} (en ${Math.round(diff)} días).`, severidad: 'warning' };
    return { valido: true };
};

/**
 * Valida que no exista solapamiento de bus o conductor en los itinerarios dados.
 * @param {Array}  itinerarios     - lista de itinerarios existentes [{id, bus_id, conductor_id, salida_programada, duracion_min}]
 * @param {string} busId
 * @param {string} conductorId
 * @param {string} salida          - ISO datetime
 * @param {number} duracionMin     - duración de la ruta en minutos
 * @param {string} [excluirId]     - id a excluir (para edición)
 */
export const validarSolapamientoItinerario = (itinerarios, busId, conductorId, salida, duracionMin, excluirId = null) => {
    const salidaDt = new Date(salida);
    const finDt    = new Date(salidaDt.getTime() + duracionMin * 60 * 1000);

    for (const it of itinerarios) {
        if (it.id === excluirId) continue;
        if (!['programado', 'en_ruta'].includes(it.estado)) continue;

        const itInicio = new Date(it.salida_programada);
        const itFin    = new Date(itInicio.getTime() + (it.duracion_min || 240) * 60 * 1000);

        const solapa = salidaDt < itFin && finDt > itInicio;
        if (!solapa) continue;

        if (it.bus_id === busId)
            return { valido: false, error: 'El bus ya tiene un itinerario en ese horario.', severidad: 'error' };
        if (conductorId && it.conductor_id === conductorId)
            return { valido: false, error: 'El conductor ya tiene un itinerario en ese horario.', severidad: 'error' };
    }
    return { valido: true };
};

/**
 * Valida placa boliviana: 1234ABC o 123ABC.
 */
export const validarPlaca = (placa) => {
    if (!placa) return { valido: false, error: 'La placa es obligatoria.' };
    const limpia = placa.trim().toUpperCase().replace(/[-\s]/g, '');
    if (!/^\d{3,4}[A-Z]{2,3}$/.test(limpia))
        return { valido: false, error: 'Formato de placa inválido (ej: 1234ABC o 123AB).' };
    return { valido: true };
};

/**
 * Calcula estado SOAT/inspección para mostrar badge en UI.
 * @returns {'vigente'|'por_vencer'|'vencido'|null}
 */
export const calcularEstadoDoc = (fechaVence, fechaRef = hoy()) => {
    if (!fechaVence) return null;
    if (fechaVence < fechaRef) return 'vencido';
    const diff = (new Date(fechaVence) - new Date(fechaRef)) / 86400000;
    if (diff <= 30) return 'por_vencer';
    return 'vigente';
};

/**
 * Combina estado SOAT + inspección para el estado general del bus en disponibilidad.
 * @returns {{estado:'ok'|'alerta'|'bloqueado', mensajes:string[]}}
 */
export const calcularEstadoBusFromSOAT = (bus, fechaRef = hoy()) => {
    const mensajes = [];
    let nivel = 'ok';

    const soat = calcularEstadoDoc(bus.soat_vence, fechaRef);
    const insp = calcularEstadoDoc(bus.inspeccion_vence, fechaRef);

    if (soat === 'vencido') { mensajes.push('SOAT vencido'); nivel = 'bloqueado'; }
    else if (soat === 'por_vencer') { mensajes.push(`SOAT vence ${bus.soat_vence}`); if (nivel !== 'bloqueado') nivel = 'alerta'; }

    if (insp === 'vencido') { mensajes.push('Inspección vencida'); nivel = 'bloqueado'; }
    else if (insp === 'por_vencer') { mensajes.push(`Inspección vence ${bus.inspeccion_vence}`); if (nivel !== 'bloqueado') nivel = 'alerta'; }

    return { estado: nivel, mensajes };
};
