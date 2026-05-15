const { Router } = require('express');
const { supabaseAdmin } = require('../servicios/supabase');
const { requireAuth, requireRol, optionalAuth } = require('../middleware/auth');

const router = Router();

// GET /api/viajes — buscar viajes disponibles
// Query params: origen, destino, fecha (YYYY-MM-DD), origen_departamento_id, destino_departamento_id
router.get('/', optionalAuth, async (req, res) => {
    const { origen, destino, fecha, origen_departamento_id, destino_departamento_id } = req.query;

    let query = supabaseAdmin
        .from('viajes')
        .select(`
            id,
            origen,
            destino,
            fecha_salida,
            duracion_estimada,
            precio,
            estado,
            anden,
            origen_departamento_id,
            destino_departamento_id,
            bus:buses(id, placa, capacidad, categoria, configuracion_asientos, estado, ubicacion_actual_ciudad),
            conductor:tripulacion!conductor_id(nombre, ci),
            sucursal:sucursales(id, nombre, logo_emoji, logo_url, ranking, amenidades, departamento_id),
            asientos_count:asientos_viaje(count)
        `)
        .in('estado', ['programado', 'autorizado'])
        .gte('fecha_salida', new Date().toISOString())
        .order('fecha_salida', { ascending: true });

    if (origen) query = query.ilike('origen', `%${origen}%`);
    if (destino) query = query.ilike('destino', `%${destino}%`);
    if (origen_departamento_id) query = query.eq('origen_departamento_id', origen_departamento_id);
    if (destino_departamento_id) query = query.eq('destino_departamento_id', destino_departamento_id);

    if (fecha) {
        const inicio = `${fecha}T00:00:00.000Z`;
        const fin = `${fecha}T23:59:59.999Z`;
        query = query.gte('fecha_salida', inicio).lte('fecha_salida', fin);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    // Calcular asientos disponibles por viaje
    const resultados = await Promise.all(
        (data || []).map(async (viaje) => {
            const { count } = await supabaseAdmin
                .from('asientos_viaje')
                .select('*', { count: 'exact', head: true })
                .eq('viaje_id', viaje.id)
                .eq('estado', 'disponible');
            return { ...viaje, asientos_disponibles: count || 0 };
        })
    );

    res.json(resultados);
});

// GET /api/viajes/:id — detalle de un viaje
router.get('/:id', async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('viajes')
        .select(`
            *,
            bus:buses(*),
            conductor:tripulacion!conductor_id(nombre, ci, licencia_url, foto_url),
            copiloto:tripulacion!copiloto_id(nombre),
            ayudante:tripulacion!ayudante_id(nombre),
            sucursal:sucursales(*, departamento:departamentos(nombre, color_primario)),
            origen_departamento:departamentos!origen_departamento_id(nombre, color_primario),
            destino_departamento:departamentos!destino_departamento_id(nombre, color_primario)
        `)
        .eq('id', req.params.id)
        .single();

    if (error) return res.status(404).json({ error: 'Viaje no encontrado.' });
    res.json(data);
});

// POST /api/viajes — programar viaje (admin_sucursal, cajero)
router.post('/', requireAuth, requireRol('admin_sucursal', 'cajero'), async (req, res) => {
    const {
        origen, destino, origen_departamento_id, destino_departamento_id,
        bus_id, conductor_id, copiloto_id, ayudante_id,
        fecha_salida, precio, duracion_estimada, calendario_salida_id
    } = req.body;

    if (!origen || !destino || !bus_id || !conductor_id || !fecha_salida || !precio) {
        return res.status(400).json({ error: 'origen, destino, bus_id, conductor_id, fecha_salida y precio son requeridos.' });
    }

    // Verificar bus disponible
    const { data: bus } = await supabaseAdmin
        .from('buses')
        .select('soat_vence, inspeccion_vence, estado, placa')
        .eq('id', bus_id)
        .single();

    if (!bus) return res.status(404).json({ error: 'Bus no encontrado.' });
    if (bus.estado !== 'disponible') {
        return res.status(409).json({ error: `Bus ${bus.placa} no está disponible (estado: ${bus.estado}).` });
    }

    const hoy = new Date().toISOString().split('T')[0];
    if (bus.soat_vence && bus.soat_vence < hoy) {
        return res.status(409).json({ error: `SOAT del bus ${bus.placa} vencido (venció: ${bus.soat_vence}).` });
    }
    if (bus.inspeccion_vence && bus.inspeccion_vence < hoy) {
        return res.status(409).json({ error: `Inspección técnica del bus ${bus.placa} vencida (venció: ${bus.inspeccion_vence}).` });
    }

    // Verificar solapamiento (mismo día)
    const fechaDia = fecha_salida.split('T')[0];
    const { data: solapadosBus } = await supabaseAdmin
        .from('viajes')
        .select('id')
        .eq('bus_id', bus_id)
        .in('estado', ['programado', 'autorizado', 'en_viaje'])
        .gte('fecha_salida', `${fechaDia}T00:00:00Z`)
        .lte('fecha_salida', `${fechaDia}T23:59:59Z`);

    if (solapadosBus?.length > 0) {
        return res.status(409).json({ error: 'El bus tiene un viaje programado el mismo día.' });
    }

    const { data, error } = await supabaseAdmin
        .from('viajes')
        .insert({
            origen, destino, origen_departamento_id, destino_departamento_id,
            bus_id, conductor_id, copiloto_id: copiloto_id || null,
            ayudante_id: ayudante_id || null,
            fecha_salida, precio, duracion_estimada: duracion_estimada || null,
            calendario_salida_id: calendario_salida_id || null,
            sucursal_id: req.usuario.perfil?.sucursal_id,
            estado: 'programado'
        })
        .select(`*, bus:buses(placa), conductor:tripulacion!conductor_id(nombre)`)
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

// PUT /api/viajes/:id/estado — actualizar estado (conductor, admin, cajero)
router.put('/:id/estado', requireAuth, requireRol('conductor', 'admin_sucursal', 'cajero'), async (req, res) => {
    const { estado, latitud, longitud, anden } = req.body;
    const estadosValidos = ['programado', 'autorizado', 'en_viaje', 'completado', 'cancelado', 'deshabilitado'];

    if (!estadosValidos.includes(estado)) {
        return res.status(400).json({ error: `Estado inválido. Válidos: ${estadosValidos.join(', ')}` });
    }

    const actualizacion = { estado };
    if (latitud && longitud) {
        actualizacion.latitud_actual = latitud;
        actualizacion.longitud_actual = longitud;
        actualizacion.ubicacion_actualizada_en = new Date().toISOString();
    }
    if (anden !== undefined) actualizacion.anden = anden;

    // Registrar en bitácora
    await supabaseAdmin.from('bitacora_viajes').insert({
        viaje_id: req.params.id,
        conductor_id: req.usuario.id,
        estado_reportado: ['partiendo', 'en_ruta', 'atrasado', 'emergencia', 'llegada', 'ruta_cumplida'].includes(estado)
            ? estado
            : estado === 'en_viaje' ? 'en_ruta' : estado === 'completado' ? 'llegada' : 'disponible',
        latitud: latitud || null,
        longitud: longitud || null
    }).catch(() => {});

    const { data, error } = await supabaseAdmin
        .from('viajes')
        .update(actualizacion)
        .eq('id', req.params.id)
        .select(`*, bus:buses(placa), conductor:tripulacion!conductor_id(nombre)`)
        .single();

    if (error) return res.status(500).json({ error: error.message });

    req.app.locals.broadcast('estado_viaje_actualizado', {
        viajeId: req.params.id,
        estado,
        origen: data.origen,
        destino: data.destino,
        bus: data.bus
    });

    res.json(data);
});

// PUT /api/viajes/:id/ubicacion — conductor actualiza posición GPS
router.put('/:id/ubicacion', requireAuth, requireRol('conductor'), async (req, res) => {
    const { latitud, longitud } = req.body;
    if (!latitud || !longitud) return res.status(400).json({ error: 'latitud y longitud requeridos.' });

    const { data, error } = await supabaseAdmin
        .from('viajes')
        .update({
            latitud_actual: latitud,
            longitud_actual: longitud,
            ubicacion_actualizada_en: new Date().toISOString()
        })
        .eq('id', req.params.id)
        .select('id, latitud_actual, longitud_actual, ubicacion_actualizada_en')
        .single();

    if (error) return res.status(500).json({ error: error.message });

    req.app.locals.broadcast('ubicacion_actualizada', {
        viajeId: req.params.id,
        latitud: data.latitud_actual,
        longitud: data.longitud_actual,
        ts: data.ubicacion_actualizada_en
    });

    res.json(data);
});

// PUT /api/viajes/:id/anden — emitir cambio de andén (cajero, admin)
router.put('/:id/anden', requireAuth, requireRol('cajero', 'admin_sucursal'), async (req, res) => {
    const { anden, nuevo_horario } = req.body;
    if (!anden) return res.status(400).json({ error: 'anden requerido.' });

    const actualizacion = { anden };
    if (nuevo_horario) actualizacion.fecha_salida = nuevo_horario;

    const { data, error } = await supabaseAdmin
        .from('viajes')
        .update(actualizacion)
        .eq('id', req.params.id)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });

    req.app.locals.broadcast('cambio_anden', {
        viajeId: req.params.id,
        anden,
        nuevo_horario: nuevo_horario || null
    });

    res.json(data);
});

// GET /api/viajes/:id/manifiesto — lista de pasajeros (conductor, admin, cajero)
router.get('/:id/manifiesto', requireAuth, requireRol('conductor', 'admin_sucursal', 'cajero'), async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('boletos')
        .select(`
            id,
            qr_token,
            asiento,
            nombre_pasajero,
            ci_pasajero,
            email_pasajero,
            precio_individual,
            estado,
            declaraciones,
            escaneado_en,
            creado_en,
            reserva:reservas(creado_en, metodo_pago, estado)
        `)
        .eq('viaje_id', req.params.id)
        .neq('estado', 'cancelado')
        .order('asiento');

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

module.exports = router;
