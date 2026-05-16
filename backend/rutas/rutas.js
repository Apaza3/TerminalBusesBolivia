const { Router } = require('express');
const { supabaseAdmin } = require('../servicios/supabase');
const { requireAuth, requireRol } = require('../middleware/auth');

const router = Router();

const conParadas = `
    *,
    paradas:paradas_ruta(id, nombre, orden, distancia_km, tiempo_min)
`;

const ordenarParadas = r => ({
    ...r,
    paradas: (r.paradas || []).sort((a, b) => a.orden - b.orden),
});

// GET /api/rutas
router.get('/', requireAuth, requireRol('admin_sucursal', 'cajero'), async (req, res) => {
    const { activa } = req.query;

    let query = supabaseAdmin.from('rutas').select(conParadas).order('origen');
    if (activa !== undefined) query = query.eq('activa', activa === 'true');

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json((data || []).map(ordenarParadas));
});

// GET /api/rutas/:id
router.get('/:id', requireAuth, requireRol('admin_sucursal', 'cajero'), async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('rutas')
        .select(conParadas)
        .eq('id', req.params.id)
        .single();

    if (error) return res.status(404).json({ error: 'Ruta no encontrada.' });
    res.json(ordenarParadas(data));
});

// POST /api/rutas
router.post('/', requireAuth, requireRol('admin_sucursal'), async (req, res) => {
    const {
        origen, destino,
        departamento_origen, departamento_destino,
        distancia_km, duracion_estimada,
        paradas = [],
    } = req.body;

    if (!origen?.trim() || !destino?.trim())
        return res.status(400).json({ error: 'origen y destino son requeridos.' });
    if (origen.trim().toLowerCase() === destino.trim().toLowerCase())
        return res.status(400).json({ error: 'origen y destino no pueden ser iguales.' });
    if (!distancia_km || Number(distancia_km) <= 0)
        return res.status(400).json({ error: 'distancia_km debe ser mayor a 0.' });

    const { data: ruta, error: rutaErr } = await supabaseAdmin
        .from('rutas')
        .insert({
            origen:               origen.trim(),
            destino:              destino.trim(),
            departamento_origen:  departamento_origen  || null,
            departamento_destino: departamento_destino || null,
            distancia_km:         Number(distancia_km),
            duracion_estimada:    duracion_estimada ? Number(duracion_estimada) : null,
            activa:               true,
        })
        .select()
        .single();

    if (rutaErr) return res.status(rutaErr.code === '23505' ? 409 : 500).json({ error: rutaErr.message });

    if (paradas.length > 0) {
        const paradasData = paradas.map((p, i) => ({
            ruta_id:      ruta.id,
            nombre:       p.nombre?.trim() || `Parada ${i + 1}`,
            orden:        i + 1,
            distancia_km: Number(p.distancia_km) || 0,
            tiempo_min:   Number(p.tiempo_min)   || 0,
        }));
        await supabaseAdmin.from('paradas_ruta').insert(paradasData);
    }

    res.status(201).json(ruta);
});

// PUT /api/rutas/:id
router.put('/:id', requireAuth, requireRol('admin_sucursal'), async (req, res) => {
    const { paradas, ...body } = req.body;
    const campos = [
        'origen', 'destino', 'departamento_origen', 'departamento_destino',
        'distancia_km', 'duracion_estimada', 'activa',
    ];
    const actualizacion = {};
    campos.forEach(c => { if (body[c] !== undefined) actualizacion[c] = body[c]; });

    const { data, error } = await supabaseAdmin
        .from('rutas')
        .update(actualizacion)
        .eq('id', req.params.id)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });

    // Reemplazar paradas si se enviaron
    if (Array.isArray(paradas)) {
        await supabaseAdmin.from('paradas_ruta').delete().eq('ruta_id', req.params.id);
        if (paradas.length > 0) {
            const paradasData = paradas.map((p, i) => ({
                ruta_id:      req.params.id,
                nombre:       p.nombre?.trim() || `Parada ${i + 1}`,
                orden:        i + 1,
                distancia_km: Number(p.distancia_km) || 0,
                tiempo_min:   Number(p.tiempo_min)   || 0,
            }));
            await supabaseAdmin.from('paradas_ruta').insert(paradasData);
        }
    }

    res.json(data);
});

// PATCH /api/rutas/:id/toggle
router.patch('/:id/toggle', requireAuth, requireRol('admin_sucursal'), async (req, res) => {
    const { data: actual, error: fetchErr } = await supabaseAdmin
        .from('rutas').select('activa').eq('id', req.params.id).single();

    if (fetchErr) return res.status(404).json({ error: 'Ruta no encontrada.' });

    const { data, error } = await supabaseAdmin
        .from('rutas')
        .update({ activa: !actual.activa })
        .eq('id', req.params.id)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

module.exports = router;
