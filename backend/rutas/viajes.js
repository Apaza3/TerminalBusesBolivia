const { Router } = require('express');
const { supabaseAdmin } = require('../servicios/supabase');
const { requireAuth, requireRol, optionalAuth } = require('../middleware/auth');

const router = Router();

// GET /api/viajes — buscar itinerarios disponibles
// Query params: origen, destino, fecha (YYYY-MM-DD), departamento_origen, departamento_destino
router.get('/', optionalAuth, async (req, res) => {
    const { origen, destino, fecha, departamento_origen, departamento_destino } = req.query;

    let query = supabaseAdmin
        .from('itinerarios')
        .select(`
            id,
            salida_programada,
            llegada_estimada,
            precio_base,
            estado,
            anden,
            bus:buses(id, placa, capacidad, categoria, configuracion_asientos, estado, ubicacion_actual_ciudad),
            ruta:rutas(
                id, nombre, origen, destino, distancia_km, duracion_estimada,
                departamento_origen, departamento_destino
            ),
            conductor:tripulacion!conductor_id(nombre_completo),
            sucursal:sucursales(id, nombre, logo_emoji, ranking, amenidades, departamento_id),
            asientos_ocupados:asientos_viaje(count)
        `)
        .in('estado', ['programado'])
        .gte('salida_programada', new Date().toISOString());

    if (origen) query = query.ilike('ruta.origen', `%${origen}%`);
    if (destino) query = query.ilike('ruta.destino', `%${destino}%`);

    if (fecha) {
        const inicio = `${fecha}T00:00:00.000Z`;
        const fin = `${fecha}T23:59:59.999Z`;
        query = query.gte('salida_programada', inicio).lte('salida_programada', fin);
    }

    const { data, error } = await query.order('salida_programada', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });

    // Filtrar por departamento si se especificó (join no disponible en PostgREST para texto)
    let resultados = data || [];
    if (departamento_origen) resultados = resultados.filter(i => i.ruta?.departamento_origen === departamento_origen);
    if (departamento_destino) resultados = resultados.filter(i => i.ruta?.departamento_destino === departamento_destino);
    if (origen && !departamento_origen) resultados = resultados.filter(i => i.ruta?.origen?.toLowerCase().includes(origen.toLowerCase()));
    if (destino && !departamento_destino) resultados = resultados.filter(i => i.ruta?.destino?.toLowerCase().includes(destino.toLowerCase()));

    // Calcular asientos disponibles
    const resultadosConDisponibilidad = await Promise.all(
        resultados.map(async (itinerario) => {
            const { count } = await supabaseAdmin
                .from('asientos_viaje')
                .select('*', { count: 'exact', head: true })
                .eq('itinerario_id', itinerario.id)
                .eq('estado', 'disponible');

            return { ...itinerario, asientos_disponibles: count || 0 };
        })
    );

    res.json(resultadosConDisponibilidad);
});

// GET /api/viajes/:id — detalle de un itinerario
router.get('/:id', async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('itinerarios')
        .select(`
            *,
            bus:buses(*),
            ruta:rutas(*, paradas_ruta(* ORDER BY orden)),
            conductor:tripulacion!conductor_id(nombre_completo, ci, licencia),
            copiloto:tripulacion!copiloto_id(nombre_completo),
            sucursal:sucursales(*)
        `)
        .eq('id', req.params.id)
        .single();

    if (error) return res.status(404).json({ error: 'Itinerario no encontrado.' });
    res.json(data);
});

// POST /api/viajes — crear itinerario (admin_sucursal, cajero)
router.post('/', requireAuth, requireRol('admin_sucursal', 'cajero'), async (req, res) => {
    const {
        ruta_id, bus_id, conductor_id, copiloto_id,
        salida_programada, llegada_estimada, precio_base
    } = req.body;

    if (!ruta_id || !bus_id || !conductor_id || !salida_programada || !precio_base) {
        return res.status(400).json({ error: 'ruta_id, bus_id, conductor_id, salida_programada, precio_base son requeridos.' });
    }

    // Verificar SOAT y documentación del bus vigentes
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
        return res.status(409).json({ error: `SOAT del bus ${bus.placa} está vencido (venció: ${bus.soat_vence}).` });
    }
    if (bus.inspeccion_vence && bus.inspeccion_vence < hoy) {
        return res.status(409).json({ error: `Inspección técnica del bus ${bus.placa} está vencida (venció: ${bus.inspeccion_vence}).` });
    }

    // Verificar solapamiento de horario para bus
    const { data: solapadosBus } = await supabaseAdmin
        .from('itinerarios')
        .select('id, salida_programada, llegada_estimada')
        .eq('bus_id', bus_id)
        .in('estado', ['programado', 'en_ruta'])
        .overlaps('salida_programada', llegada_estimada);

    if (solapadosBus?.length > 0) {
        return res.status(409).json({ error: 'El bus tiene conflicto de horario con otro itinerario.' });
    }

    // Verificar solapamiento de conductor
    const { data: solapadosConductor } = await supabaseAdmin
        .from('itinerarios')
        .select('id')
        .eq('conductor_id', conductor_id)
        .in('estado', ['programado', 'en_ruta']);

    if (solapadosConductor?.length > 0) {
        return res.status(409).json({ error: 'El conductor tiene conflicto de horario.' });
    }

    const sucursal_id = req.usuario.perfil?.sucursal_id;

    const { data, error } = await supabaseAdmin
        .from('itinerarios')
        .insert({
            ruta_id, bus_id, conductor_id, copiloto_id,
            salida_programada, llegada_estimada, precio_base,
            sucursal_id
        })
        .select(`*, ruta:rutas(nombre, origen, destino), bus:buses(placa)`)
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

// PUT /api/viajes/:id/estado — actualizar estado (conductor, admin, cajero)
router.put('/:id/estado', requireAuth, requireRol('conductor', 'admin_sucursal', 'cajero'), async (req, res) => {
    const { estado, latitud, longitud, anden } = req.body;
    const estadosValidos = ['programado', 'en_ruta', 'finalizado', 'cancelado'];

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

    const { data, error } = await supabaseAdmin
        .from('itinerarios')
        .update(actualizacion)
        .eq('id', req.params.id)
        .select(`*, ruta:rutas(nombre, origen, destino), bus:buses(placa)`)
        .single();

    if (error) return res.status(500).json({ error: error.message });

    // Broadcast WebSocket (se maneja desde servidor.js)
    req.app.locals.broadcast('estado_viaje_actualizado', {
        itinerarioId: req.params.id,
        estado,
        bus: data.bus,
        ruta: data.ruta
    });

    res.json(data);
});

// PUT /api/viajes/:id/ubicacion — el conductor actualiza posición GPS
router.put('/:id/ubicacion', requireAuth, requireRol('conductor'), async (req, res) => {
    const { latitud, longitud } = req.body;
    if (!latitud || !longitud) return res.status(400).json({ error: 'latitud y longitud requeridos.' });

    const { data, error } = await supabaseAdmin
        .from('itinerarios')
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
        itinerarioId: req.params.id,
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
    if (nuevo_horario) actualizacion.salida_programada = nuevo_horario;

    const { data, error } = await supabaseAdmin
        .from('itinerarios')
        .update(actualizacion)
        .eq('id', req.params.id)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });

    req.app.locals.broadcast('cambio_anden', {
        itinerarioId: req.params.id,
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
            numero_boleto,
            pasajero_nombre,
            pasajero_ci,
            precio,
            estado,
            equipaje_maletas,
            equipaje_peso_kg,
            asiento:asientos_viaje!asiento_id(numero),
            reserva:reservas!reserva_id(
                creado_en,
                origen_venta,
                pago:pagos(metodo, estado)
            )
        `)
        .eq('asientos_viaje.itinerario_id', req.params.id)
        .neq('estado', 'cancelado')
        .order('asiento.numero');

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

module.exports = router;
