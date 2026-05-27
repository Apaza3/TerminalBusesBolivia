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
// Body: { qr_codigo: string, viaje_id: uuid }
router.post('/validar-qr', requireAuth, SOLO_CONDUCTOR, async (req, res) => {
    const { qr_codigo, viaje_id } = req.body;
    if (!qr_codigo || !viaje_id) {
        return res.status(400).json({ error: 'qr_codigo y viaje_id son requeridos.' });
    }

    // qr_codigo = UUID del boleto (generado por trigger generar_numero_boleto)
    const { data: boleto, error: bErr } = await supabaseAdmin
        .from('boletos')
        .select('id, qr_codigo, pasajero_nombre, pasajero_ci, precio, estado, asiento, viaje_id')
        .eq('qr_codigo', qr_codigo)
        .single();

    if (bErr || !boleto) return res.status(404).json({ error: 'Boleto no encontrado.' });
    if (boleto.viaje_id !== viaje_id) {
        return res.status(409).json({ error: 'El boleto no corresponde a este viaje.', boleto });
    }
    if (boleto.estado === 'abordado') {
        return res.status(409).json({ error: 'Pasajero ya abordó.', boleto });
    }
    if (boleto.estado === 'cancelado') {
        return res.status(409).json({ error: 'Boleto cancelado.', boleto });
    }
    // 'emitido' es el único estado válido para abordar

    // Marcar como abordado
    const { error: updErr } = await supabaseAdmin
        .from('boletos')
        .update({
            estado:     'abordado',
            abordado_en: new Date().toISOString(),
        })
        .eq('id', boleto.id);

    if (updErr) return res.status(500).json({ error: updErr.message });

    // Marcar asiento como ocupado en asientos_viaje
    await supabaseAdmin
        .from('asientos_viaje')
        .update({ estado: 'ocupado' })
        .eq('viaje_id', viaje_id)
        .eq('numero_asiento', boleto.asiento);

    req.app.locals.broadcast('pasajero_abordado', {
        viajeId: viaje_id,
        asiento: boleto.asiento,
        pasajero: boleto.pasajero_nombre,
    });

    res.json({
        valido: true,
        pasajero: boleto.pasajero_nombre,
        ci:       boleto.pasajero_ci,
        asiento:  boleto.asiento,
        qr_codigo: boleto.qr_codigo,
    });
});

module.exports = router;
