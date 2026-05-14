const { Router } = require('express');
const { supabaseAdmin } = require('../servicios/supabase');
const { requireAuth, requireRol } = require('../middleware/auth');

const router = Router();

// POST /api/pagos/webhook — webhook simulado de pago QR
// En producción: endpoint que recibe confirmación de pasarela (QR boliviano: SimpleQR, etc.)
router.post('/webhook', async (req, res) => {
    const { reserva_id, referencia, monto } = req.body;

    // Validar firma del webhook (simulado — en prod verificar HMAC)
    const webhookSecret = req.headers['x-webhook-secret'];
    if (webhookSecret !== process.env.WEBHOOK_SECRET && process.env.NODE_ENV === 'production') {
        return res.status(401).json({ error: 'Webhook no autorizado.' });
    }

    const { data: pago } = await supabaseAdmin
        .from('pagos')
        .select('id, estado, reserva_id')
        .eq('reserva_id', reserva_id)
        .single();

    if (!pago) return res.status(404).json({ error: 'Pago no encontrado.' });
    if (pago.estado === 'confirmado') return res.json({ mensaje: 'Pago ya confirmado.' });

    // Confirmar pago
    await supabaseAdmin
        .from('pagos')
        .update({ estado: 'confirmado', referencia, confirmado_en: new Date().toISOString() })
        .eq('id', pago.id);

    // Confirmar reserva
    await supabaseAdmin
        .from('reservas')
        .update({ estado: 'confirmada' })
        .eq('id', reserva_id);

    req.app.locals.broadcast('pago_confirmado', { reserva_id, referencia });

    res.json({ exito: true, reserva_id });
});

// POST /api/pagos/:reservaId/confirmar-manual — cajero confirma pago manualmente
router.post('/:reservaId/confirmar-manual', requireAuth, requireRol('cajero', 'admin_sucursal'), async (req, res) => {
    const { metodo, referencia } = req.body;

    const { data: reserva } = await supabaseAdmin
        .from('reservas')
        .select('id, estado, monto_total')
        .eq('id', req.params.reservaId)
        .single();

    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada.' });
    if (reserva.estado === 'confirmada') return res.json({ mensaje: 'Reserva ya confirmada.' });

    await supabaseAdmin.from('pagos')
        .update({
            estado: 'confirmado',
            metodo: metodo || 'efectivo',
            referencia: referencia || null,
            confirmado_por: req.usuario.id,
            confirmado_en: new Date().toISOString()
        })
        .eq('reserva_id', req.params.reservaId);

    const { data } = await supabaseAdmin
        .from('reservas')
        .update({ estado: 'confirmada' })
        .eq('id', req.params.reservaId)
        .select()
        .single();

    req.app.locals.broadcast('pago_confirmado', {
        reserva_id: req.params.reservaId,
        confirmado_por: req.usuario.perfil?.nombre_completo
    });

    res.json(data);
});

// POST /api/pagos/verificar-qr — simula verificación de pago QR (polling del frontend)
router.post('/verificar-qr', async (req, res) => {
    const { reserva_id } = req.body;
    if (!reserva_id) return res.status(400).json({ error: 'reserva_id requerido.' });

    const { data: pago } = await supabaseAdmin
        .from('pagos')
        .select('estado, confirmado_en, referencia')
        .eq('reserva_id', reserva_id)
        .single();

    if (!pago) return res.status(404).json({ error: 'Pago no encontrado.' });

    res.json({
        estado: pago.estado,
        confirmado: pago.estado === 'confirmado',
        confirmado_en: pago.confirmado_en
    });
});

module.exports = router;
