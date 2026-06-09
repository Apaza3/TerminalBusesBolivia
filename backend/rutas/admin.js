const { Router } = require('express');
const { supabaseAdmin } = require('../servicios/supabase');
const { requireAuth, requireRol } = require('../middleware/auth');

const router = Router();
const SOLO_ADMIN = requireRol('admin_sucursal');

router.get('/usuarios', requireAuth, SOLO_ADMIN, async (req, res) => {
    const { rol, activo } = req.query;
    let query = supabaseAdmin
        .from('usuarios')
        .select('id, email, nombre_completo, ci, telefono, rol, activo, verificado, sucursal_id, creado_en, sucursales(nombre)')
        .neq('rol', 'cliente')
        .order('creado_en', { ascending: false });

    if (rol) query = query.eq('rol', rol);
    if (activo !== undefined) query = query.eq('activo', activo === 'true');

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

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
        .insert({ id: authData.user.id, email, nombre_completo, ci, telefono, rol, sucursal_id, activo: true })
        .select()
        .single();

    if (error) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data);
});

router.put('/usuarios/:id/suspender', requireAuth, SOLO_ADMIN, async (req, res) => {
    const { activo } = req.body;

    const { data, error } = await supabaseAdmin
        .from('usuarios')
        .update({ activo })
        .eq('id', req.params.id)
        .select('id, email, nombre_completo, rol, activo')
        .single();

    if (error) return res.status(500).json({ error: error.message });

    if (!activo) {
        await supabaseAdmin.auth.admin.signOut(req.params.id, 'global').catch(() => {});
    }

    res.json(data);
});

router.get('/sucursales', requireAuth, SOLO_ADMIN, async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('sucursales')
        .select('*, departamento:departamentos(nombre, color_primario)')
        .order('ranking', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

router.post('/sucursales', requireAuth, SOLO_ADMIN, async (req, res) => {
    const { nombre, departamento_id, ciudad, direccion, telefono, email,
            logo_emoji, logo_url, amenidades } = req.body;
    if (!nombre || !departamento_id) {
        return res.status(400).json({ error: 'nombre y departamento_id son requeridos.' });
    }

    const { data, error } = await supabaseAdmin
        .from('sucursales')
        .insert({ nombre, departamento_id, ciudad, direccion, telefono, email,
                  logo_emoji, logo_url, amenidades: amenidades || [], activo: true })
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

router.put('/sucursales/:id', requireAuth, SOLO_ADMIN, async (req, res) => {
    const campos = ['nombre', 'ciudad', 'direccion', 'telefono', 'email',
                    'logo_emoji', 'logo_url', 'amenidades', 'activo', 'ranking'];
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

router.get('/rutas', requireAuth, SOLO_ADMIN, async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('calendario_salidas')
        .select(`
            *,
            origen_departamento:departamentos!origen_departamento_id(nombre, color_primario),
            destino_departamento:departamentos!destino_departamento_id(nombre, color_primario),
            sucursal:sucursales(nombre)
        `)
        .eq('activo', true)
        .order('hora_salida');

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

router.post('/rutas', requireAuth, SOLO_ADMIN, async (req, res) => {
    const { origen_departamento_id, destino_departamento_id, hora_salida,
            dias_semana, precio, duracion_estimada, sucursal_id } = req.body;

    if (!origen_departamento_id || !destino_departamento_id || !hora_salida || !precio) {
        return res.status(400).json({
            error: 'origen_departamento_id, destino_departamento_id, hora_salida y precio son requeridos.'
        });
    }

    const { data, error } = await supabaseAdmin
        .from('calendario_salidas')
        .insert({
            origen_departamento_id, destino_departamento_id,
            hora_salida, precio, duracion_estimada,
            dias_semana: dias_semana || [1,2,3,4,5,6,7],
            sucursal_id: sucursal_id || req.usuario.perfil?.sucursal_id,
            activo: true
        })
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

router.get('/stats', requireAuth, SOLO_ADMIN, async (req, res) => {
    const hoy = new Date().toISOString().split('T')[0];

    const [reservasRes, viajesRes, busesRes, incidenciasRes] = await Promise.all([
        supabaseAdmin.from('reservas').select('id, monto, estado, creado_en'),
        supabaseAdmin.from('viajes').select('id, estado')
            .gte('fecha_salida', `${hoy}T00:00:00Z`)
            .lte('fecha_salida', `${hoy}T23:59:59Z`),
        supabaseAdmin.from('buses').select('id, estado'),
        supabaseAdmin.from('incidencias').select('id, severidad').eq('estado', 'abierta')
    ]);

    const reservasData = reservasRes.data || [];
    const ingresos = reservasData
        .filter(r => r.estado === 'pagado' || r.estado === 'autorizado')
        .reduce((sum, r) => sum + Number(r.monto), 0);

    res.json({
        total_reservas: reservasData.length,
        reservas_hoy: reservasData.filter(r => r.creado_en?.startsWith(hoy)).length,
        ingresos_total: ingresos,
        viajes_hoy: (viajesRes.data || []).length,
        viajes_en_ruta: (viajesRes.data || []).filter(i => i.estado === 'en_viaje').length,
        buses_disponibles: (busesRes.data || []).filter(b => b.estado === 'disponible').length,
        buses_en_ruta: (busesRes.data || []).filter(b => b.estado === 'en_viaje').length,
        incidencias_abiertas: (incidenciasRes.data || []).length,
    });
});

router.get('/disponibilidad', requireAuth, SOLO_ADMIN, async (req, res) => {
    const { fecha_inicio, fecha_fin } = req.query;
    if (!fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: 'fecha_inicio y fecha_fin son requeridos (YYYY-MM-DD).' });
    }

    const { data, error } = await supabaseAdmin
        .from('viajes')
        .select(`
            id, fecha_salida, duracion_estimada, estado, origen, destino,
            bus:buses(placa, capacidad),
            conductor:tripulacion!conductor_id(nombre, ci)
        `)
        .gte('fecha_salida', `${fecha_inicio}T00:00:00Z`)
        .lte('fecha_salida', `${fecha_fin}T23:59:59Z`)
        .in('estado', ['programado', 'autorizado', 'en_viaje'])
        .order('fecha_salida');

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

router.get('/departamentos', requireAuth, async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('departamentos')
        .select('*')
        .eq('activo', true)
        .order('nombre');

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

module.exports = router;
