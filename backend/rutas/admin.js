const { Router } = require('express');
const { supabaseAdmin } = require('../servicios/supabase');
const { requireAuth, requireRol } = require('../middleware/auth');

const router = Router();
const SOLO_ADMIN = requireRol('admin_sucursal');

// ── Usuarios Staff ────────────────────────────────────────────────────────────

// GET /api/admin/usuarios — listar staff
router.get('/usuarios', requireAuth, SOLO_ADMIN, async (req, res) => {
    const { rol, activo } = req.query;
    let query = supabaseAdmin
        .from('usuarios')
        .select('id, email, nombre_completo, ci, telefono, rol, activo, sucursal_id, creado_en, sucursales(nombre)')
        .neq('rol', 'cliente')
        .order('creado_en', { ascending: false });

    if (rol) query = query.eq('rol', rol);
    if (activo !== undefined) query = query.eq('activo', activo === 'true');

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

// POST /api/admin/usuarios — crear usuario staff
router.post('/usuarios', requireAuth, SOLO_ADMIN, async (req, res) => {
    const { email, password, nombre_completo, ci, telefono, rol, sucursal_id } = req.body;
    if (!email || !password || !nombre_completo || !rol) {
        return res.status(400).json({ error: 'email, password, nombre_completo y rol son requeridos.' });
    }

    const rolesValidos = ['admin_sucursal', 'cajero', 'conductor'];
    if (!rolesValidos.includes(rol)) {
        return res.status(400).json({ error: `Rol inválido. Válidos: ${rolesValidos.join(', ')}` });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true
    });
    if (authError) return res.status(400).json({ error: authError.message });

    const { data, error } = await supabaseAdmin
        .from('usuarios')
        .insert({ id: authData.user.id, email, nombre_completo, ci, telefono, rol, sucursal_id })
        .select()
        .single();

    if (error) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data);
});

// PUT /api/admin/usuarios/:id/suspender — toggle activo
router.put('/usuarios/:id/suspender', requireAuth, SOLO_ADMIN, async (req, res) => {
    const { activo } = req.body;

    const { data, error } = await supabaseAdmin
        .from('usuarios')
        .update({ activo })
        .eq('id', req.params.id)
        .select('id, email, nombre_completo, rol, activo')
        .single();

    if (error) return res.status(500).json({ error: error.message });

    // Si se suspende, revocar sesiones activas
    if (!activo) {
        await supabaseAdmin.auth.admin.signOut(req.params.id, 'global').catch(() => {});
    }

    res.json(data);
});

// ── Sucursales (R21) ─────────────────────────────────────────────────────────

// GET /api/admin/sucursales
router.get('/sucursales', requireAuth, SOLO_ADMIN, async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('sucursales')
        .select('*, departamento:departamentos(nombre, color_primario)')
        .order('ranking', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

// POST /api/admin/sucursales
router.post('/sucursales', requireAuth, SOLO_ADMIN, async (req, res) => {
    const { nombre, departamento_id, ciudad, direccion, telefono, logo_emoji, amenidades } = req.body;
    if (!nombre || !departamento_id) return res.status(400).json({ error: 'nombre y departamento_id son requeridos.' });

    const { data, error } = await supabaseAdmin
        .from('sucursales')
        .insert({ nombre, departamento_id, ciudad, direccion, telefono, logo_emoji, amenidades, activa: true })
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

// PUT /api/admin/sucursales/:id
router.put('/sucursales/:id', requireAuth, SOLO_ADMIN, async (req, res) => {
    const campos = ['nombre', 'ciudad', 'direccion', 'telefono', 'logo_emoji', 'amenidades', 'activa', 'ranking'];
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

// ── Rutas (R15) ──────────────────────────────────────────────────────────────

// GET /api/admin/rutas
router.get('/rutas', requireAuth, SOLO_ADMIN, async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('rutas')
        .select('*, paradas_ruta(* ORDER BY orden)')
        .order('nombre');

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

// POST /api/admin/rutas
router.post('/rutas', requireAuth, SOLO_ADMIN, async (req, res) => {
    const { nombre, departamento_origen, origen, departamento_destino, destino,
            distancia_km, duracion_estimada, paradas } = req.body;

    if (!nombre || !origen || !destino || !departamento_origen || !departamento_destino) {
        return res.status(400).json({ error: 'nombre, origen, destino y departamentos son requeridos.' });
    }

    const { data: ruta, error } = await supabaseAdmin
        .from('rutas')
        .insert({ nombre, departamento_origen, origen, departamento_destino, destino, distancia_km, duracion_estimada })
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });

    // Insertar paradas intermedias si se enviaron
    if (paradas?.length > 0) {
        const paradasInsert = paradas.map((p, idx) => ({
            ruta_id: ruta.id,
            orden: idx + 1,
            ciudad: p.ciudad,
            departamento_id: p.departamento_id,
            distancia_desde_origen_km: p.distancia_desde_origen_km || 0,
            tiempo_desde_origen_min: p.tiempo_desde_origen_min || 0,
            precio_desde_origen: p.precio_desde_origen || 0,
            es_parada_intermedia: true
        }));

        await supabaseAdmin.from('paradas_ruta').insert(paradasInsert);
    }

    const { data: rutaCompleta } = await supabaseAdmin
        .from('rutas')
        .select('*, paradas_ruta(*)')
        .eq('id', ruta.id)
        .single();

    res.status(201).json(rutaCompleta);
});

// ── Stats / Dashboard ─────────────────────────────────────────────────────────

// GET /api/admin/stats — KPIs generales
router.get('/stats', requireAuth, SOLO_ADMIN, async (req, res) => {
    const hoy = new Date().toISOString().split('T')[0];

    const [reservas, itinerarios, buses, incidencias] = await Promise.all([
        supabaseAdmin.from('reservas').select('id, monto_total, estado, creado_en'),
        supabaseAdmin.from('itinerarios').select('id, estado').gte('salida_programada', `${hoy}T00:00:00Z`),
        supabaseAdmin.from('buses').select('id, estado'),
        supabaseAdmin.from('incidencias').select('id, severidad').eq('estado', 'abierta')
    ]);

    const reservasData = reservas.data || [];
    const ingresos = reservasData
        .filter(r => r.estado === 'confirmada')
        .reduce((sum, r) => sum + Number(r.monto_total), 0);

    res.json({
        total_reservas: reservasData.length,
        reservas_hoy: reservasData.filter(r => r.creado_en?.startsWith(hoy)).length,
        ingresos_total: ingresos,
        viajes_hoy: (itinerarios.data || []).length,
        viajes_en_ruta: (itinerarios.data || []).filter(i => i.estado === 'en_ruta').length,
        buses_disponibles: (buses.data || []).filter(b => b.estado === 'disponible').length,
        buses_en_ruta: (buses.data || []).filter(b => b.estado === 'en_ruta').length,
        incidencias_abiertas: (incidencias.data || []).length,
    });
});

// ── Disponibilidad de recursos (R28) ─────────────────────────────────────────

// GET /api/admin/disponibilidad — vista de recursos por fecha
router.get('/disponibilidad', requireAuth, SOLO_ADMIN, async (req, res) => {
    const { fecha_inicio, fecha_fin } = req.query;
    if (!fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: 'fecha_inicio y fecha_fin son requeridos (YYYY-MM-DD).' });
    }

    const { data, error } = await supabaseAdmin
        .from('itinerarios')
        .select(`
            id, salida_programada, llegada_estimada, estado,
            bus:buses(placa, capacidad),
            conductor:tripulacion!conductor_id(nombre_completo, ci),
            ruta:rutas(nombre, origen, destino)
        `)
        .gte('salida_programada', `${fecha_inicio}T00:00:00Z`)
        .lte('salida_programada', `${fecha_fin}T23:59:59Z`)
        .in('estado', ['programado', 'en_ruta'])
        .order('salida_programada');

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

module.exports = router;
