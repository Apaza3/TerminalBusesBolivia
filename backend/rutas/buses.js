const { Router } = require('express');
const { supabaseAdmin } = require('../servicios/supabase');
const { requireAuth, requireRol } = require('../middleware/auth');

const router = Router();

// GET /api/buses — listar buses (filtro por departamento, estado)
router.get('/', requireAuth, requireRol('admin_sucursal', 'cajero'), async (req, res) => {
    const { departamento, estado, sucursal_id } = req.query;

    let query = supabaseAdmin
        .from('buses')
        .select(`
            *,
            sucursal:sucursales(nombre, departamento_id),
            departamento:departamentos!ubicacion_actual_departamento(nombre, color_primario)
        `)
        .order('placa');

    if (departamento) query = query.eq('ubicacion_actual_departamento', departamento);
    if (estado) query = query.eq('estado', estado);
    if (sucursal_id) query = query.eq('sucursal_id', sucursal_id);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    // Alertas de documentación
    const hoy = new Date().toISOString().split('T')[0];
    const en30Dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const resultado = (data || []).map(bus => ({
        ...bus,
        alertas: {
            soat_vencido: bus.soat_vence && bus.soat_vence < hoy,
            soat_por_vencer: bus.soat_vence && bus.soat_vence >= hoy && bus.soat_vence <= en30Dias,
            inspeccion_vencida: bus.inspeccion_vence && bus.inspeccion_vence < hoy,
            inspeccion_por_vencer: bus.inspeccion_vence && bus.inspeccion_vence >= hoy && bus.inspeccion_vence <= en30Dias,
        }
    }));

    res.json(resultado);
});

// GET /api/buses/disponibles — buses disponibles en un departamento (para programar itinerario)
router.get('/disponibles', requireAuth, requireRol('admin_sucursal', 'cajero'), async (req, res) => {
    const { departamento } = req.query;
    if (!departamento) return res.status(400).json({ error: 'departamento es requerido.' });

    const hoy = new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
        .from('buses')
        .select('id, placa, marca, modelo, capacidad, categoria, configuracion_asientos, soat_vence, inspeccion_vence')
        .eq('estado', 'disponible')
        .eq('ubicacion_actual_departamento', departamento)
        .gte('soat_vence', hoy)
        .gte('inspeccion_vence', hoy);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

// GET /api/buses/:id
router.get('/:id', requireAuth, requireRol('admin_sucursal', 'cajero'), async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('buses')
        .select(`*, sucursal:sucursales(nombre, departamento_id)`)
        .eq('id', req.params.id)
        .single();

    if (error) return res.status(404).json({ error: 'Bus no encontrado.' });
    res.json(data);
});

// POST /api/buses — registrar bus
router.post('/', requireAuth, requireRol('admin_sucursal'), async (req, res) => {
    const {
        placa, marca, modelo, anio, capacidad, categoria,
        configuracion_asientos, sucursal_id,
        soat_numero, soat_vence, inspeccion_numero, inspeccion_vence,
        ubicacion_actual_departamento, ubicacion_actual_ciudad
    } = req.body;

    if (!placa || !capacidad) return res.status(400).json({ error: 'placa y capacidad son requeridos.' });

    const dep = ubicacion_actual_departamento || req.usuario.perfil?.sucursales?.departamento_id;

    const { data, error } = await supabaseAdmin
        .from('buses')
        .insert({
            placa, marca, modelo, anio, capacidad,
            categoria: categoria || 'economico',
            configuracion_asientos: configuracion_asientos || '2+2',
            sucursal_id: sucursal_id || req.usuario.perfil?.sucursal_id,
            soat_numero, soat_vence, inspeccion_numero, inspeccion_vence,
            estado: 'disponible',
            ubicacion_actual_departamento: dep,
            ubicacion_actual_ciudad: ubicacion_actual_ciudad || null
        })
        .select()
        .single();

    if (error) return res.status(error.code === '23505' ? 409 : 500).json({ error: error.message });
    res.status(201).json(data);
});

// PUT /api/buses/:id — actualizar datos del bus
router.put('/:id', requireAuth, requireRol('admin_sucursal'), async (req, res) => {
    const campos = [
        'marca', 'modelo', 'anio', 'capacidad', 'categoria', 'configuracion_asientos',
        'soat_numero', 'soat_vence', 'inspeccion_numero', 'inspeccion_vence',
        'estado', 'ubicacion_actual_departamento', 'ubicacion_actual_ciudad'
    ];
    const actualizacion = {};
    campos.forEach(c => { if (req.body[c] !== undefined) actualizacion[c] = req.body[c]; });

    const { data, error } = await supabaseAdmin
        .from('buses')
        .update(actualizacion)
        .eq('id', req.params.id)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

module.exports = router;
