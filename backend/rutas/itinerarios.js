const { Router } = require('express');
const { supabaseAdmin } = require('../servicios/supabase');
const { requireAuth, requireRol } = require('../middleware/auth');

const router = Router();

const ESTADOS_VALIDOS = ['programado', 'en_ruta', 'finalizado', 'cancelado'];

// ── Helpers ───────────────────────────────────────────────────────────────────

const verificarDocumentosBus = async (busId, fechaSalida) => {
    const { data: bus, error } = await supabaseAdmin
        .from('buses')
        .select('id, placa, soat_vence, inspeccion_vence, estado')
        .eq('id', busId)
        .single();

    if (error || !bus) return { valido: false, error: 'Bus no encontrado.' };
    if (bus.estado === 'mantenimiento') return { valido: false, error: 'Bus en mantenimiento.' };
    if (bus.estado === 'fuera_servicio') return { valido: false, error: 'Bus fuera de servicio.' };

    const fecha = new Date(fechaSalida).toISOString().split('T')[0];

    if (bus.soat_vence && bus.soat_vence < fecha)
        return { valido: false, error: `RN-02: SOAT vence el ${bus.soat_vence}. Renueva antes de programar.` };
    if (bus.inspeccion_vence && bus.inspeccion_vence < fecha)
        return { valido: false, error: `RN-02: Inspección técnica vence el ${bus.inspeccion_vence}. Renueva antes de programar.` };

    return { valido: true, bus };
};

const verificarSolapamiento = async (busId, conductorId, salida, duracionMin, excluirId = null) => {
    const salidaDt  = new Date(salida);
    const finDt     = new Date(salidaDt.getTime() + duracionMin * 60 * 1000);

    let query = supabaseAdmin
        .from('itinerarios')
        .select('id, salida_programada, ruta:rutas(duracion_estimada)')
        .in('estado', ['programado', 'en_ruta']);

    if (excluirId) query = query.neq('id', excluirId);

    // Ventana holgada: itinerarios que empiezan dentro de ±24h del nuevo
    const ventanaInicio = new Date(salidaDt.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const ventanaFin    = new Date(finDt.getTime()    + 24 * 60 * 60 * 1000).toISOString();

    const { data: candidatos } = await query
        .or(`bus_id.eq.${busId},conductor_id.eq.${conductorId}`)
        .gte('salida_programada', ventanaInicio)
        .lte('salida_programada', ventanaFin);

    for (const it of (candidatos || [])) {
        const itInicio = new Date(it.salida_programada);
        const durMin   = it.ruta?.duracion_estimada || 240;
        const itFin    = new Date(itInicio.getTime() + durMin * 60 * 1000);

        if (salidaDt < itFin && finDt > itInicio) {
            return { solapa: true, error: 'Bus o conductor ya asignado en ese horario.' };
        }
    }
    return { solapa: false };
};

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/itinerarios
router.get('/', requireAuth, requireRol('admin_sucursal', 'cajero', 'conductor'), async (req, res) => {
    const { fecha, bus_id, conductor_id, estado } = req.query;

    let query = supabaseAdmin
        .from('itinerarios')
        .select(`
            *,
            ruta:rutas(id, origen, destino, distancia_km, duracion_estimada),
            bus:buses(id, placa, marca, modelo, capacidad, categoria, soat_vence, inspeccion_vence),
            conductor:tripulacion!conductor_id(id, nombre_completo, ci, licencia_tipo),
            copiloto:tripulacion!copiloto_id(id, nombre_completo)
        `)
        .order('salida_programada', { ascending: true });

    if (fecha)        query = query.gte('salida_programada', `${fecha}T00:00:00`).lte('salida_programada', `${fecha}T23:59:59`);
    if (bus_id)       query = query.eq('bus_id', bus_id);
    if (conductor_id) query = query.eq('conductor_id', conductor_id);
    if (estado)       query = query.eq('estado', estado);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

// GET /api/itinerarios/:id
router.get('/:id', requireAuth, requireRol('admin_sucursal', 'cajero', 'conductor'), async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('itinerarios')
        .select(`
            *,
            ruta:rutas(*, paradas:paradas_ruta(nombre, orden, distancia_km, tiempo_min)),
            bus:buses(id, placa, marca, modelo, capacidad, categoria, soat_vence, inspeccion_vence),
            conductor:tripulacion!conductor_id(id, nombre_completo, ci, licencia_tipo),
            copiloto:tripulacion!copiloto_id(id, nombre_completo)
        `)
        .eq('id', req.params.id)
        .single();

    if (error) return res.status(404).json({ error: 'Itinerario no encontrado.' });
    res.json(data);
});

// POST /api/itinerarios
router.post('/', requireAuth, requireRol('admin_sucursal'), async (req, res) => {
    const {
        ruta_id, bus_id, conductor_id, copiloto_id,
        salida_programada, precio_base, anden,
    } = req.body;

    if (!ruta_id || !bus_id || !salida_programada || precio_base === undefined)
        return res.status(400).json({ error: 'ruta_id, bus_id, salida_programada y precio_base son requeridos.' });

    // Validar SOAT/Inspección
    const docCheck = await verificarDocumentosBus(bus_id, salida_programada);
    if (!docCheck.valido) return res.status(422).json({ error: docCheck.error });

    // Obtener duración de la ruta
    const { data: ruta } = await supabaseAdmin
        .from('rutas')
        .select('duracion_estimada')
        .eq('id', ruta_id)
        .single();

    const duracion = ruta?.duracion_estimada || 240;

    // Validar solapamiento
    const solapaCheck = await verificarSolapamiento(bus_id, conductor_id, salida_programada, duracion);
    if (solapaCheck.solapa) return res.status(409).json({ error: solapaCheck.error });

    const { data, error } = await supabaseAdmin
        .from('itinerarios')
        .insert({
            ruta_id, bus_id,
            conductor_id: conductor_id || null,
            copiloto_id:  copiloto_id  || null,
            salida_programada,
            precio_base:  Number(precio_base),
            estado:       'programado',
            anden:        anden?.trim() || null,
        })
        .select()
        .single();

    if (error) {
        if (error.message?.includes('RN-02'))       return res.status(422).json({ error: error.message });
        if (error.message?.includes('SOLAPAMIENTO')) return res.status(409).json({ error: error.message });
        return res.status(500).json({ error: error.message });
    }

    req.app.locals.broadcast('itinerario_creado', { id: data.id, salida: data.salida_programada });
    res.status(201).json(data);
});

// PUT /api/itinerarios/:id
router.put('/:id', requireAuth, requireRol('admin_sucursal'), async (req, res) => {
    const { bus_id, conductor_id, copiloto_id, salida_programada, precio_base, anden } = req.body;

    if (bus_id && salida_programada) {
        const docCheck = await verificarDocumentosBus(bus_id, salida_programada);
        if (!docCheck.valido) return res.status(422).json({ error: docCheck.error });

        const { data: it } = await supabaseAdmin.from('itinerarios').select('ruta:rutas(duracion_estimada)').eq('id', req.params.id).single();
        const duracion = it?.ruta?.duracion_estimada || 240;
        const solapaCheck = await verificarSolapamiento(bus_id, conductor_id, salida_programada, duracion, req.params.id);
        if (solapaCheck.solapa) return res.status(409).json({ error: solapaCheck.error });
    }

    const campos = { bus_id, conductor_id, copiloto_id, salida_programada, precio_base, anden };
    const actualizacion = Object.fromEntries(
        Object.entries(campos).filter(([, v]) => v !== undefined)
    );

    const { data, error } = await supabaseAdmin
        .from('itinerarios')
        .update(actualizacion)
        .eq('id', req.params.id)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// PATCH /api/itinerarios/:id/estado
router.patch('/:id/estado', requireAuth, requireRol('admin_sucursal', 'conductor'), async (req, res) => {
    const { estado } = req.body;

    if (!ESTADOS_VALIDOS.includes(estado))
        return res.status(400).json({ error: `Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(', ')}.` });

    const { data, error } = await supabaseAdmin
        .from('itinerarios')
        .update({ estado })
        .eq('id', req.params.id)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });

    req.app.locals.broadcast('estado_itinerario', { id: req.params.id, estado });
    res.json(data);
});

module.exports = router;
