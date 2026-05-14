const { Router } = require('express');
const { supabaseAdmin } = require('../servicios/supabase');
const { optionalAuth } = require('../middleware/auth');

const router = Router();

const BLOQUEO_TTL_MIN = 10;

// GET /api/asientos/:itinerarioId — mapa completo de asientos
router.get('/:itinerarioId', async (req, res) => {
    const { itinerarioId } = req.params;

    // Liberar expirados antes de responder
    await supabaseAdmin.rpc('liberar_asientos_expirados');

    const { data, error } = await supabaseAdmin
        .from('asientos_viaje')
        .select('id, numero, piso, tipo, estado, bloqueado_hasta')
        .eq('itinerario_id', itinerarioId)
        .order('numero');

    if (error) return res.status(500).json({ error: error.message });

    const mapa = {
        itinerarioId,
        asientos: data || [],
        disponibles: (data || []).filter(a => a.estado === 'disponible').length,
        bloqueados:  (data || []).filter(a => a.estado === 'bloqueado').length,
        reservados:  (data || []).filter(a => a.estado === 'reservado').length,
        timestamp: Date.now()
    };

    res.json(mapa);
});

// POST /api/asientos/bloquear — bloqueo temporal concurrente
// La clave: UPDATE con WHERE estado='disponible' → solo uno gana la carrera
router.post('/bloquear', optionalAuth, async (req, res) => {
    const { itinerarioId, asientos, clienteId } = req.body;
    if (!itinerarioId || !asientos?.length) {
        return res.status(400).json({ error: 'itinerarioId y asientos[] son requeridos.' });
    }

    await supabaseAdmin.rpc('liberar_asientos_expirados');

    const bloqueadoHasta = new Date(Date.now() + BLOQUEO_TTL_MIN * 60 * 1000).toISOString();
    const bloqueadoPor = req.usuario?.id || clienteId || null;

    // Bloqueo transaccional: solo actualiza filas con estado='disponible'
    const { data: bloqueados, error } = await supabaseAdmin
        .from('asientos_viaje')
        .update({
            estado: 'bloqueado',
            bloqueado_hasta: bloqueadoHasta,
            bloqueado_por: bloqueadoPor
        })
        .eq('itinerario_id', itinerarioId)
        .in('numero', asientos)
        .eq('estado', 'disponible')  // ← condición de concurrencia
        .select('numero, estado');

    if (error) return res.status(500).json({ error: error.message });

    const bloqueadosNros = bloqueados.map(a => a.numero);
    const fallidos = asientos.filter(n => !bloqueadosNros.includes(n));

    if (fallidos.length > 0) {
        // Revertir los que sí se bloquearon para mantener atomicidad
        if (bloqueadosNros.length > 0) {
            await supabaseAdmin
                .from('asientos_viaje')
                .update({ estado: 'disponible', bloqueado_hasta: null, bloqueado_por: null })
                .eq('itinerario_id', itinerarioId)
                .in('numero', bloqueadosNros);
        }
        return res.status(409).json({
            error: `Asientos no disponibles: ${fallidos.join(', ')}. Selecciona otros.`,
            fallidos
        });
    }

    req.app.locals.broadcast('asientos_bloqueados', {
        itinerarioId,
        asientos: bloqueadosNros,
        bloqueadoHasta
    });

    res.json({ exito: true, asientos: bloqueadosNros, bloqueadoHasta });
});

// POST /api/asientos/liberar — liberar bloqueo manual
router.post('/liberar', optionalAuth, async (req, res) => {
    const { itinerarioId, asientos } = req.body;
    if (!itinerarioId || !asientos?.length) {
        return res.status(400).json({ error: 'itinerarioId y asientos[] son requeridos.' });
    }

    const { error } = await supabaseAdmin
        .from('asientos_viaje')
        .update({ estado: 'disponible', bloqueado_hasta: null, bloqueado_por: null })
        .eq('itinerario_id', itinerarioId)
        .in('numero', asientos)
        .eq('estado', 'bloqueado');

    if (error) return res.status(500).json({ error: error.message });

    req.app.locals.broadcast('asientos_liberados', { itinerarioId, asientos });
    res.json({ exito: true });
});

module.exports = router;
