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
        .from('itinerarios')
        .select(`
            *,
            ruta:rutas(*, paradas_ruta(* ORDER BY orden)),
            bus:buses(placa, capacidad, marca, modelo),
            sucursal:sucursales(nombre)
        `)
        .eq('conductor_id', tripulacion.id)
        .in('estado', ['programado', 'en_ruta'])
        .order('salida_programada', { ascending: true })
        .limit(1)
        .single();

    if (error) return res.status(404).json({ error: 'No hay viaje activo.' });
    res.json(data);
});

// POST /api/conductor/incidencias — reportar incidencia
router.post('/incidencias', requireAuth, SOLO_CONDUCTOR, async (req, res) => {
    const { itinerario_id, tipo, descripcion, latitud, longitud, ubicacion_manual } = req.body;

    if (!itinerario_id || !tipo || !descripcion) {
        return res.status(400).json({ error: 'itinerario_id, tipo y descripcion son requeridos.' });
    }

    const tiposValidos = ['accidente', 'desvio', 'pasajero_conflictivo', 'mecanico', 'retraso', 'otro'];
    if (!tiposValidos.includes(tipo)) {
        return res.status(400).json({ error: `Tipo inválido. Válidos: ${tiposValidos.join(', ')}` });
    }

    const { data, error } = await supabaseAdmin
        .from('incidencias')
        .insert({
            itinerario_id, tipo, descripcion,
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
        itinerarioId: itinerario_id,
        tipo,
        descripcion,
        id: data.id
    });

    res.status(201).json(data);
});

// POST /api/conductor/mantenimiento — reportar problema de bus
router.post('/mantenimiento', requireAuth, SOLO_CONDUCTOR, async (req, res) => {
    const { bus_id, itinerario_id, tipo, descripcion, severidad, foto_base64 } = req.body;

    if (!bus_id || !tipo || !descripcion) {
        return res.status(400).json({ error: 'bus_id, tipo y descripcion son requeridos.' });
    }

    const { data, error } = await supabaseAdmin
        .from('reportes_mantenimiento')
        .insert({
            bus_id, itinerario_id,
            reportado_por: req.usuario.id,
            tipo, descripcion,
            severidad: severidad || 'media',
            foto_base64: foto_base64 || null,
            estado: 'abierto'
        })
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });

    // Alerta crítica → broadcast inmediato
    if (severidad === 'critica') {
        req.app.locals.broadcast('alerta_mantenimiento_critico', {
            busId: bus_id,
            itinerarioId: itinerario_id,
            tipo,
            descripcion,
            id: data.id
        });
    }

    res.status(201).json(data);
});

// POST /api/conductor/validar-qr — escanear QR de boleto para abordaje
router.post('/validar-qr', requireAuth, SOLO_CONDUCTOR, async (req, res) => {
    const { qr_codigo, itinerario_id } = req.body;
    if (!qr_codigo || !itinerario_id) {
        return res.status(400).json({ error: 'qr_codigo e itinerario_id son requeridos.' });
    }

    const { data: boleto } = await supabaseAdmin
        .from('boletos')
        .select(`
            id, numero_boleto, pasajero_nombre, pasajero_ci, precio, estado,
            asiento:asientos_viaje(numero, itinerario_id)
        `)
        .eq('qr_codigo', qr_codigo)
        .single();

    if (!boleto) return res.status(404).json({ error: 'Boleto no encontrado.' });
    if (boleto.asiento?.itinerario_id !== itinerario_id) {
        return res.status(409).json({ error: 'El boleto no corresponde a este viaje.' });
    }
    if (boleto.estado === 'abordado') {
        return res.status(409).json({ error: 'Pasajero ya abordó.', boleto });
    }
    if (boleto.estado === 'cancelado') {
        return res.status(409).json({ error: 'Boleto cancelado.', boleto });
    }

    // Marcar como abordado
    await supabaseAdmin
        .from('boletos')
        .update({ estado: 'abordado', abordado_en: new Date().toISOString() })
        .eq('id', boleto.id);

    await supabaseAdmin
        .from('asientos_viaje')
        .update({ estado: 'abordado' })
        .eq('id', boleto.asiento?.id);

    res.json({
        valido: true,
        pasajero: boleto.pasajero_nombre,
        ci: boleto.pasajero_ci,
        asiento: boleto.asiento?.numero,
        numero_boleto: boleto.numero_boleto
    });
});

module.exports = router;
