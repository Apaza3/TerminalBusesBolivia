const { Router } = require('express');
const { supabaseAdmin } = require('../servicios/supabase');

const router = Router();

// POST /api/auth/login — login con email+password (Supabase Auth)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email y password requeridos.' });

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });

    // Obtener perfil extendido
    const { data: perfil } = await supabaseAdmin
        .from('usuarios')
        .select('*, sucursales(nombre, departamento_id, departamentos(color_primario, color_secundario))')
        .eq('id', data.user.id)
        .single();

    if (perfil && !perfil.activo) {
        return res.status(403).json({ error: 'Cuenta suspendida. Contacta al administrador.' });
    }

    res.json({
        exito: true,
        token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expira_en: data.session.expires_at,
        usuario: perfil || { id: data.user.id, email: data.user.email, rol: 'cliente' }
    });
});

// POST /api/auth/login-ci — login cliente con CI + password
router.post('/login-ci', async (req, res) => {
    const { ci, password } = req.body;
    if (!ci || !password) return res.status(400).json({ error: 'CI y password requeridos.' });

    const ciNorm = String(ci).trim();

    const { data: usuario, error: buscarError } = await supabaseAdmin
        .from('usuarios')
        .select('email, activo')
        .eq('ci', ciNorm)
        .maybeSingle();

    if (buscarError) {
        console.error('[login-ci] Error buscando CI:', buscarError);
        return res.status(500).json({ error: 'Error interno al buscar usuario.' });
    }
    if (!usuario) return res.status(404).json({ error: 'CI no registrado.' });
    if (!usuario.activo) return res.status(403).json({ error: 'Cuenta suspendida.' });

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email: usuario.email,
        password
    });
    if (error) return res.status(401).json({ error: 'Contraseña incorrecta.' });

    const { data: perfil } = await supabaseAdmin
        .from('usuarios')
        .select('*')
        .eq('id', data.user.id)
        .single();

    res.json({
        exito: true,
        token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expira_en: data.session.expires_at,
        usuario: perfil
    });
});

// POST /api/auth/registro — registro de nuevo cliente
router.post('/registro', async (req, res) => {
    const { email, password, nombre_completo, ci, telefono } = req.body;
    if (!email || !password || !nombre_completo || !ci) {
        return res.status(400).json({ error: 'email, password, nombre_completo y CI son requeridos.' });
    }

    const ciNorm = String(ci).trim();

    // Verificar CI duplicado
    const { data: existente, error: buscarError } = await supabaseAdmin
        .from('usuarios')
        .select('id')
        .eq('ci', ciNorm)
        .maybeSingle();

    if (buscarError) {
        console.error('[registro] Error verificando CI:', buscarError);
        return res.status(500).json({ error: 'Error interno al verificar CI.' });
    }
    if (existente) return res.status(409).json({ error: 'CI ya registrado.' });

    // Verificar email duplicado en Auth
    const { data: { users: usersConEmail } } = await supabaseAdmin.auth.admin.listUsers();
    const emailExiste = usersConEmail?.some(u => u.email === email.toLowerCase().trim());
    // Eliminar fila huérfana en usuarios si existe con ese email (inconsistencia previa)
    await supabaseAdmin.from('usuarios').delete().eq('email', email.toLowerCase().trim());

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password,
        email_confirm: true
    });
    if (authError) return res.status(400).json({ error: authError.message });

    const { data: perfil, error: perfilError } = await supabaseAdmin
        .from('usuarios')
        .upsert({ id: authData.user.id, email: email.toLowerCase().trim(), nombre_completo, ci: ciNorm, telefono, rol: 'cliente', activo: true })
        .select()
        .single();

    if (perfilError) {
        console.error('[registro] Error al crear perfil:', perfilError);
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return res.status(500).json({ error: `Error al crear perfil: ${perfilError.message}` });
    }

    res.status(201).json({ exito: true, usuario: perfil });
});


// POST /api/auth/refresh — renovar token
router.post('/refresh', async (req, res) => {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ error: 'refresh_token requerido.' });

    const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token });
    if (error) return res.status(401).json({ error: 'Token de refresco inválido.' });

    res.json({
        token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expira_en: data.session.expires_at
    });
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) await supabaseAdmin.auth.admin.signOut(token).catch(() => {});
    res.json({ exito: true });
});

// POST /api/auth/recuperar-password — genera token de recuperación
router.post('/recuperar-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email requerido.' });

    const { data: usuario } = await supabaseAdmin
        .from('usuarios')
        .select('id, activo')
        .eq('email', email.toLowerCase())
        .single();

    // Siempre responder OK aunque no exista (seguridad)
    if (!usuario) return res.json({ exito: true, mensaje: 'Si el correo existe, recibirás instrucciones.' });

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/recuperar-password`
    });

    if (error) return res.status(500).json({ error: 'Error al enviar email.' });
    res.json({ exito: true, mensaje: 'Si el correo existe, recibirás instrucciones.' });
});

// GET /api/auth/verificar-ci/:ci — verifica si un CI ya está registrado
router.get('/verificar-ci/:ci', async (req, res) => {
    const ci = String(req.params.ci).trim();
    const { data, error } = await supabaseAdmin
        .from('usuarios')
        .select('id')
        .eq('ci', ci)
        .maybeSingle();
    if (error) return res.status(500).json({ error: 'Error al verificar CI.' });
    res.json({ existe: data !== null });
});

// GET /api/auth/debug-ci/:ci — TEMPORAL: diagnóstico de estado de CI en DB
router.get('/debug-ci/:ci', async (req, res) => {
    const ci = String(req.params.ci).trim();

    // Buscar con maybeSingle (sin error si no existe)
    const { data: usuario, error: err1 } = await supabaseAdmin
        .from('usuarios')
        .select('id, email, ci, activo, rol, nombre_completo')
        .eq('ci', ci)
        .maybeSingle();

    // Buscar sin limit por si hay duplicados
    const { data: todos, error: err2 } = await supabaseAdmin
        .from('usuarios')
        .select('id, email, ci, activo, rol')
        .eq('ci', ci);

    // Buscar con ilike por si el CI tiene espacios/capitalización distinta
    const { data: ilike } = await supabaseAdmin
        .from('usuarios')
        .select('id, email, ci, activo')
        .ilike('ci', `%${ci}%`);

    res.json({
        ci_buscado: ci,
        resultado_maybeSingle: usuario,
        error_maybeSingle: err1?.message,
        todos_con_ese_ci: todos,
        error_todos: err2?.message,
        similares_ilike: ilike,
    });
});

module.exports = router;
