const { Router } = require('express');
const { supabaseAdmin } = require('../servicios/supabase');
const { optionalAuth } = require('../middleware/auth');

const router = Router();

const BLOQUEO_TTL_MIN = 10;

// GET /api/asientos/:viajeId — mapa completo de asientos
router.get('/:viajeId', async (req, res) => {
    const { viajeId } = req.params;

    // Liberar expirados antes de responder
    await supabaseAdmin.rpc('liberar_asientos_expirados');

    const { data, error } = await supabaseAdmin
        .from('asientos_viaje')
        .select('id, numero_asiento, piso, fila, columna, tipo_asiento, estado, bloqueado_hasta')
        .eq('viaje_id', viajeId)
        .order('numero_asiento');

    if (error) return res.status(500).json({ error: error.message });

    const asientos = data || [];
    res.json({
        viajeId,
        asientos,
        disponibles: asientos.filter(a => a.estado === 'disponible').length,
        bloqueados:  asientos.filter(a => a.estado === 'pendiente').length,
        reservados:  asientos.filter(a => a.estado === 'reservado').length,
        timestamp: Date.now()
    });
});

// POST /api/asientos/bloquear — bloqueo temporal (estado: disponible → pendiente)
router.post('/bloquear', optionalAuth, async (req, res) => {
    const { viajeId, asientos, clienteId } = req.body;
    if (!viajeId || !asientos?.length) {
        return res.status(400).json({ error: 'viajeId y asientos[] son requeridos.' });
    }

    await supabaseAdmin.rpc('liberar_asientos_expirados');

    const bloqueadoHasta = new Date(Date.now() + BLOQUEO_TTL_MIN * 60 * 1000).toISOString();
    const bloqueadoPor = req.usuario?.id || clienteId || null;

    // Actualiza solo filas con estado='disponible' — solo uno gana la carrera
    const { data: bloqueados, error } = await supabaseAdmin
        .from('asientos_viaje')
        .update({
            estado: 'pendiente',
            bloqueado_hasta: bloqueadoHasta,
            bloqueado_por: bloqueadoPor
        })
        .eq('viaje_id', viajeId)
        .in('numero_asiento', asientos)
        .eq('estado', 'disponible')
        .select('numero_asiento, estado');

    if (error) return res.status(500).json({ error: error.message });

    const bloqueadosNros = bloqueados.map(a => a.numero_asiento);
    const fallidos = asientos.filter(n => !bloqueadosNros.includes(n));

    if (fallidos.length > 0) {
        // Revertir los que sí se bloquearon
        if (bloqueadosNros.length > 0) {
            await supabaseAdmin
                .from('asientos_viaje')
                .update({ estado: 'disponible', bloqueado_hasta: null, bloqueado_por: null })
                .eq('viaje_id', viajeId)
                .in('numero_asiento', bloqueadosNros);
        }
        return res.status(409).json({
            error: `Asientos no disponibles: ${fallidos.join(', ')}. Selecciona otros.`,
            fallidos
        });
    }

    req.app.locals.broadcast('asientos_bloqueados', {
        viajeId,
        asientos: bloqueadosNros,
        bloqueadoHasta
    });

    res.json({ exito: true, asientos: bloqueadosNros, bloqueadoHasta });
});

// POST /api/asientos/liberar — liberar bloqueo manual
router.post('/liberar', optionalAuth, async (req, res) => {
    const { viajeId, asientos } = req.body;
    if (!viajeId || !asientos?.length) {
        return res.status(400).json({ error: 'viajeId y asientos[] son requeridos.' });
    }

    const { error } = await supabaseAdmin
        .from('asientos_viaje')
        .update({ estado: 'disponible', bloqueado_hasta: null, bloqueado_por: null })
        .eq('viaje_id', viajeId)
        .in('numero_asiento', asientos)
        .eq('estado', 'pendiente');

    if (error) return res.status(500).json({ error: error.message });

    req.app.locals.broadcast('asientos_liberados', { viajeId, asientos });
    res.json({ exito: true });
});

module.exports = router;
