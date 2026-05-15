const { Router } = require('express');
const { supabaseAdmin } = require('../servicios/supabase');
const { requireAuth, requireRol } = require('../middleware/auth');

const router = Router();

// GET /api/buses — listar buses
router.get('/', requireAuth, requireRol('admin_sucursal', 'cajero'), async (req, res) => {
    const { estado, sucursal_id, departamento } = req.query;

    let query = supabaseAdmin
        .from('buses')
        .select(`
            *,
            sucursal:sucursales(nombre, departamento_id),
            departamento:departamentos!ubicacion_actual_departamento(nombre, color_primario)
        `)
        .order('placa');

    if (estado) query = query.eq('estado', estado);
    if (sucursal_id) query = query.eq('sucursal_id', sucursal_id);
    if (departamento) query = query.eq('ubicacion_actual_departamento', departamento);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    const hoy = new Date().toISOString().split('T')[0];
    const en30Dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const resultado = (data || []).map(bus => ({
        ...bus,
        alertas: {
            soat_vencido:          bus.soat_vence && bus.soat_vence < hoy,
            soat_por_vencer:       bus.soat_vence && bus.soat_vence >= hoy && bus.soat_vence <= en30Dias,
            inspeccion_vencida:    bus.inspeccion_vence && bus.inspeccion_vence < hoy,
            inspeccion_por_vencer: bus.inspeccion_vence && bus.inspeccion_vence >= hoy && bus.inspeccion_vence <= en30Dias,
        }
    }));

    res.json(resultado);
});

// GET /api/buses/disponibles — para programar viaje
router.get('/disponibles', requireAuth, requireRol('admin_sucursal', 'cajero'), async (req, res) => {
    const { departamento } = req.query;

    const hoy = new Date().toISOString().split('T')[0];

    let query = supabaseAdmin
        .from('buses')
        .select('id, placa, marca, modelo, capacidad, categoria, configuracion_asientos, soat_vence, inspeccion_vence, pisos, columnas, filas_piso_1, filas_piso_2')
        .eq('estado', 'disponible');

    if (departamento) query = query.eq('ubicacion_actual_departamento', departamento);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    // Filtrar con documentación vigente
    const disponibles = (data || []).filter(b =>
        (!b.soat_vence || b.soat_vence >= hoy) &&
        (!b.inspeccion_vence || b.inspeccion_vence >= hoy)
    );

    res.json(disponibles);
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
        placa, marca, modelo, anio, capacidad, pisos, columnas, filas_piso_1, filas_piso_2,
        categoria, configuracion_asientos, sucursal_id,
        soat_numero, soat_vence, inspeccion_numero, inspeccion_vence,
        ubicacion_actual_departamento, ubicacion_actual_ciudad,
        amenidades, tiene_bano
    } = req.body;

    if (!placa || !capacidad) return res.status(400).json({ error: 'placa y capacidad son requeridos.' });

    const { data, error } = await supabaseAdmin
        .from('buses')
        .insert({
            placa, marca, modelo, anio,
            capacidad,
            pisos: pisos || 1,
            columnas: columnas || 4,
            filas_piso_1: filas_piso_1 || 10,
            filas_piso_2: filas_piso_2 || 0,
            tiene_bano: tiene_bano || false,
            categoria: categoria || 'economico',
            configuracion_asientos: configuracion_asientos || '2+2',
            sucursal_id: sucursal_id || req.usuario.perfil?.sucursal_id,
            soat_numero, soat_vence,
            inspeccion_numero, inspeccion_vence,
            estado: 'disponible',
            ubicacion_actual_departamento: ubicacion_actual_departamento ||
                req.usuario.perfil?.sucursales?.departamento_id || null,
            ubicacion_actual_ciudad: ubicacion_actual_ciudad || null,
            amenidades: amenidades || []
        })
        .select()
        .single();

    if (error) return res.status(error.code === '23505' ? 409 : 500).json({ error: error.message });
    res.status(201).json(data);
});

// PUT /api/buses/:id — actualizar
router.put('/:id', requireAuth, requireRol('admin_sucursal'), async (req, res) => {
    const campos = [
        'marca', 'modelo', 'anio', 'capacidad', 'pisos', 'columnas',
        'filas_piso_1', 'filas_piso_2', 'tiene_bano', 'categoria',
        'configuracion_asientos', 'soat_numero', 'soat_vence',
        'inspeccion_numero', 'inspeccion_vence', 'estado',
        'ubicacion_actual_departamento', 'ubicacion_actual_ciudad', 'amenidades'
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
