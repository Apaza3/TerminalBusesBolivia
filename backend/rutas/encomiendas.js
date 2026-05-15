const { Router } = require('express');
const { supabaseAdmin } = require('../servicios/supabase');
const { requireAuth, requireRol } = require('../middleware/auth');

const router = Router();

const generarCodigo = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo = 'TBB-';
    for (let i = 0; i < 6; i++) codigo += chars[Math.floor(Math.random() * chars.length)];
    return codigo;
};

// GET /api/encomiendas/seguimiento/:codigo — consulta pública (sin login)
router.get('/seguimiento/:codigo', async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('encomiendas')
        .select(`
            codigo_seguimiento, estado, descripcion, peso_kg, precio,
            remitente_nombre, ciudad_origen,
            destinatario_nombre, ciudad_destino,
            creado_en, entregada_en,
            viaje:viajes(fecha_salida, estado, origen, destino)
        `)
        .eq('codigo_seguimiento', req.params.codigo.toUpperCase())
        .single();

    if (error || !data) return res.status(404).json({ error: 'Código de seguimiento no encontrado.' });
    res.json(data);
});

// GET /api/encomiendas — listar (cajero, admin)
router.get('/', requireAuth, requireRol('cajero', 'admin_sucursal'), async (req, res) => {
    const { estado, ciudad_origen, ciudad_destino } = req.query;

    let query = supabaseAdmin
        .from('encomiendas')
        .select('*, viaje:viajes(fecha_salida, origen, destino)')
        .order('creado_en', { ascending: false });

    if (estado) query = query.eq('estado', estado);
    if (ciudad_origen) query = query.ilike('ciudad_origen', `%${ciudad_origen}%`);
    if (ciudad_destino) query = query.ilike('ciudad_destino', `%${ciudad_destino}%`);

    const { data, error } = await query.limit(100);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

// POST /api/encomiendas — registrar encomienda
router.post('/', requireAuth, requireRol('cajero', 'admin_sucursal'), async (req, res) => {
    const {
        remitente_nombre, remitente_ci, remitente_telefono, ciudad_origen,
        destinatario_nombre, destinatario_ci, destinatario_telefono, ciudad_destino,
        descripcion, peso_kg, precio, viaje_id
    } = req.body;

    if (!remitente_nombre || !destinatario_nombre || !ciudad_origen || !ciudad_destino) {
        return res.status(400).json({ error: 'Datos de remitente y destinatario son requeridos.' });
    }

    // Generar código único
    let codigo;
    let intentos = 0;
    do {
        codigo = generarCodigo();
        const { data: existente } = await supabaseAdmin
            .from('encomiendas').select('id').eq('codigo_seguimiento', codigo).single();
        if (!existente) break;
        intentos++;
    } while (intentos < 5);

    const { data, error } = await supabaseAdmin
        .from('encomiendas')
        .insert({
            codigo_seguimiento: codigo,
            viaje_id: viaje_id || null,
            remitente_nombre, remitente_ci, remitente_telefono, ciudad_origen,
            destinatario_nombre, destinatario_ci, destinatario_telefono, ciudad_destino,
            descripcion, peso_kg, precio,
            estado: 'recibida'
        })
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

// PUT /api/encomiendas/:id/estado — actualizar estado
router.put('/:id/estado', requireAuth, requireRol('cajero', 'admin_sucursal', 'conductor'), async (req, res) => {
    const { estado } = req.body;
    const estadosValidos = ['recibida', 'en_transito', 'entregada', 'devuelta'];
    if (!estadosValidos.includes(estado)) {
        return res.status(400).json({ error: `Estado inválido. Válidos: ${estadosValidos.join(', ')}` });
    }

    const actualizacion = { estado };
    if (estado === 'entregada') actualizacion.entregada_en = new Date().toISOString();

    const { data, error } = await supabaseAdmin
        .from('encomiendas')
        .update(actualizacion)
        .eq('id', req.params.id)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

module.exports = router;
