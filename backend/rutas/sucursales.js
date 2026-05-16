const { Router } = require('express');
const { supabaseAdmin } = require('../servicios/supabase');
const { requireAuth, requireRol } = require('../middleware/auth');

const router = Router();

// GET /api/sucursales
router.get('/', requireAuth, requireRol('admin_sucursal', 'cajero'), async (req, res) => {
    const { activa } = req.query;

    let query = supabaseAdmin
        .from('sucursales')
        .select('*, departamento:departamentos(nombre, color_primario)')
        .order('nombre');

    if (activa !== undefined) query = query.eq('activa', activa === 'true');

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

// GET /api/sucursales/:id
router.get('/:id', requireAuth, requireRol('admin_sucursal'), async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('sucursales')
        .select('*, departamento:departamentos(nombre, color_primario)')
        .eq('id', req.params.id)
        .single();

    if (error) return res.status(404).json({ error: 'Sucursal no encontrada.' });
    res.json(data);
});

// POST /api/sucursales
router.post('/', requireAuth, requireRol('admin_sucursal'), async (req, res) => {
    const {
        nombre, logo_emoji, color_accent,
        departamento_id, ciudad, telefono, direccion, descripcion,
    } = req.body;

    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido.' });

    const { data, error } = await supabaseAdmin
        .from('sucursales')
        .insert({
            nombre:        nombre.trim(),
            logo_emoji:    logo_emoji    || '🚌',
            color_accent:  color_accent  || '#3b82f6',
            departamento_id,
            ciudad:        ciudad?.trim()    || null,
            telefono:      telefono?.trim()  || null,
            direccion:     direccion?.trim() || null,
            descripcion:   descripcion?.trim() || null,
            activa:        true,
            ranking:       0,
        })
        .select()
        .single();

    if (error) return res.status(error.code === '23505' ? 409 : 500).json({ error: error.message });
    res.status(201).json(data);
});

// PUT /api/sucursales/:id
router.put('/:id', requireAuth, requireRol('admin_sucursal'), async (req, res) => {
    const campos = [
        'nombre', 'logo_emoji', 'color_accent', 'departamento_id',
        'ciudad', 'telefono', 'direccion', 'descripcion', 'ranking',
    ];
    const actualizacion = {};
    campos.forEach(c => { if (req.body[c] !== undefined) actualizacion[c] = req.body[c]; });

    const { data, error } = await supabaseAdmin
        .from('sucursales')
        .update(actualizacion)
        .eq('id', req.params.id)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// PATCH /api/sucursales/:id/toggle — activa/desactiva
router.patch('/:id/toggle', requireAuth, requireRol('admin_sucursal'), async (req, res) => {
    const { data: actual, error: fetchErr } = await supabaseAdmin
        .from('sucursales')
        .select('activa')
        .eq('id', req.params.id)
        .single();

    if (fetchErr) return res.status(404).json({ error: 'Sucursal no encontrada.' });

    const { data, error } = await supabaseAdmin
        .from('sucursales')
        .update({ activa: !actual.activa })
        .eq('id', req.params.id)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });

    req.app.locals.broadcast('sucursal_toggle', { id: req.params.id, activa: data.activa });
    res.json(data);
});

module.exports = router;
