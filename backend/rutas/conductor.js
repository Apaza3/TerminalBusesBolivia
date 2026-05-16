const { Router } = require('express');
const { supabaseAdmin } = require('../servicios/supabase');
const { requireAuth, requireRol } = require('../middleware/auth');

const router = Router();
const SOLO_CONDUCTOR = requireRol('conductor');

// GET /api/conductor/viaje-activo — viaje actual del conductor
router.get('/viaje-activo', requireAuth, SOLO_CONDUCTOR, async (req, res) => {
    const { data: tripulacion } = await supabaseAdmin
        .from('tripulacion')
        .select('id')
        .eq('usuario_id', req.usuario.id)
        .single();

    if (!tripulacion) return res.status(404).json({ error: 'Perfil de conductor no encontrado.' });

    const { data, error } = await supabaseAdmin
        .from('viajes')
        .select(`
            *,
            bus:buses(placa, capacidad, marca, modelo),
            sucursal:sucursales(nombre),
            origen_departamento:departamentos!origen_departamento_id(nombre),
            destino_departamento:departamentos!destino_departamento_id(nombre)
        `)
        .eq('conductor_id', tripulacion.id)
        .in('estado', ['programado', 'autorizado', 'en_viaje'])
        .order('fecha_salida', { ascending: true })
        .limit(1)
        .single();

    if (error) return res.status(404).json({ error: 'No hay viaje activo.' });
    res.json(data);
});

// POST /api/conductor/incidencias — reportar incidencia
router.post('/incidencias', requireAuth, SOLO_CONDUCTOR, async (req, res) => {
    const { viaje_id, tipo, descripcion, latitud, longitud, ubicacion_manual } = req.body;

    if (!viaje_id || !tipo || !descripcion) {
        return res.status(400).json({ error: 'viaje_id, tipo y descripcion son requeridos.' });
    }

    const tiposValidos = ['accidente', 'desvio', 'pasajero_conflictivo', 'mecanico', 'retraso', 'otro'];
    if (!tiposValidos.includes(tipo)) {
        return res.status(400).json({ error: `Tipo inválido. Válidos: ${tiposValidos.join(', ')}` });
    }

    const { data, error } = await supabaseAdmin
        .from('incidencias')
        .insert({
            viaje_id, tipo, descripcion,
            reportado_por: req.usuario.id,
            latitud: latitud || null,
            longitud: longitud || null,
            ubicacion_manual: ubicacion_manual || null,
            estado: 'abierta'
        })
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });

    req.app.locals.broadcast('nueva_incidencia', {
        viajeId: viaje_id,
        tipo,
        descripcion,
        id: data.id
    });

    res.status(201).json(data);
});

// POST /api/conductor/mantenimiento — reportar problema de bus
router.post('/mantenimiento', requireAuth, SOLO_CONDUCTOR, async (req, res) => {
    const { bus_id, viaje_id, tipo, descripcion, severidad, foto_base64 } = req.body;

    if (!bus_id || !tipo || !descripcion) {
        return res.status(400).json({ error: 'bus_id, tipo y descripcion son requeridos.' });
    }

    const { data, error } = await supabaseAdmin
        .from('reportes_mantenimiento')
        .insert({
            bus_id,
            viaje_id: viaje_id || null,
            reportado_por: req.usuario.id,
            tipo, descripcion,
            severidad: severidad || 'media',
            foto_base64: foto_base64 || null,
            estado: 'abierto'
        })
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });

    if (severidad === 'critica') {
        req.app.locals.broadcast('alerta_mantenimiento_critico', {
            busId: bus_id,
            viajeId: viaje_id,
            tipo,
            descripcion,
            id: data.id
        });
    }

    res.status(201).json(data);
});

// POST /api/conductor/validar-qr — escanear QR de boleto para abordaje
router.post('/validar-qr', requireAuth, SOLO_CONDUCTOR, async (req, res) => {
    const { qr_token, viaje_id } = req.body;
    if (!qr_token || !viaje_id) {
        return res.status(400).json({ error: 'qr_token y viaje_id son requeridos.' });
    }

    const { data: boleto } = await supabaseAdmin
        .from('boletos')
        .select('id, qr_token, nombre_pasajero, ci_pasajero, precio_individual, estado, asiento, viaje_id')
        .eq('qr_token', qr_token)
        .single();

    if (!boleto) return res.status(404).json({ error: 'Boleto no encontrado.' });
    if (boleto.viaje_id !== viaje_id) {
        return res.status(409).json({ error: 'El boleto no corresponde a este viaje.' });
    }
    if (boleto.estado === 'validado') {
        return res.status(409).json({ error: 'Pasajero ya abordó.', boleto });
    }
    if (boleto.estado === 'cancelado') {
        return res.status(409).json({ error: 'Boleto cancelado.', boleto });
    }
    if (boleto.estado === 'pendiente') {
        return res.status(409).json({ error: 'Boleto pendiente de pago.', boleto });
    }

    // Marcar como validado (abordado)
    await supabaseAdmin
        .from('boletos')
        .update({
            estado: 'validado',
            escaneado_en: new Date().toISOString(),
            escaneado_por: req.usuario.id
        })
        .eq('id', boleto.id);

    // Marcar asiento como ocupado
    await supabaseAdmin
        .from('asientos_viaje')
        .update({ estado: 'ocupado', presente: true })
        .eq('viaje_id', viaje_id)
        .eq('numero_asiento', boleto.asiento);

    res.json({
        valido: true,
        pasajero: boleto.nombre_pasajero,
        ci: boleto.ci_pasajero,
        asiento: boleto.asiento,
        qr_token: boleto.qr_token
    });
});

// [Académico] Sprint 4 - PATCH /api/conductor/viajes/:id/estado (R20)
router.patch('/viajes/:id/estado', requireAuth, SOLO_CONDUCTOR, async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    const estadosValidos = ['programado', 'en_ruta', 'finalizado', 'cancelado'];
    if (!estado || !estadosValidos.includes(estado)) {
        return res.status(400).json({ error: `Estado inválido. Válidos: ${estadosValidos.join(', ')}` });
    }

    const { data, error } = await supabaseAdmin
        .from('viajes')
        .update({ estado, actualizado_en: new Date().toISOString() })
        .eq('id', id)
        .select('id, estado')
        .single();

    if (error) return res.status(500).json({ error: error.message });

    req.app.locals.broadcast('estado_viaje_actualizado', { viaje_id: id, estado });
    res.json({ ok: true, viaje: data });
});

// [Académico] Sprint 4 - GET /api/conductor/manifiesto/:viajeId (R19)
router.get('/manifiesto/:viajeId', requireAuth, SOLO_CONDUCTOR, async (req, res) => {
    const { viajeId } = req.params;
    const { data, error } = await supabaseAdmin
        .from('boletos')
        .select('id, qr_token, nombre_pasajero, ci_pasajero, asiento, estado, escaneado_en')
        .eq('viaje_id', viajeId)
        .order('asiento', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    const boletos = (data || []).map(b => ({
        id: b.qr_token || b.id,
        pasajeroNombre: b.nombre_pasajero,
        pasajeroCI: b.ci_pasajero,
        asiento: b.asiento,
        abordado: b.estado === 'validado',
        horaAbordaje: b.escaneado_en,
    }));
    res.json({ boletos });
});

// [Académico] Sprint 4 - POST /api/conductor/notificaciones/anden (R26)
router.post('/notificaciones/anden', requireAuth, requireRol('admin_sucursal', 'cajero', 'conductor'), async (req, res) => {
    const { viajeId, tipo, mensaje } = req.body;
    if (!mensaje) return res.status(400).json({ error: 'mensaje es requerido.' });

    req.app.locals.broadcast('notificacion_anden', {
        viajeId: viajeId || null,
        tipo: tipo || 'otro',
        mensaje,
        emitido_por: req.usuario.id,
        ts: Date.now(),
    });

    res.json({ ok: true });
});

// [Académico] Sprint 4 - GET /api/conductor/estado-flota (R17)
router.get('/estado-flota', requireAuth, requireRol('admin_sucursal'), async (req, res) => {
    const [incidencias, mantenimiento, itinerarios] = await Promise.all([
        supabaseAdmin.from('incidencias').select('*').order('creado_en', { ascending: false }).limit(50),
        supabaseAdmin.from('reportes_mantenimiento').select('*').order('creado_en', { ascending: false }).limit(50),
        supabaseAdmin.from('itinerarios').select('*').order('salida_programada', { ascending: false }).limit(50),
    ]);

    res.json({
        incidencias: incidencias.data || [],
        mantenimiento: mantenimiento.data || [],
        itinerarios: itinerarios.data || [],
        notificaciones: [],
    });
});

module.exports = router;
