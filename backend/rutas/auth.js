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

    const { data: usuario } = await supabaseAdmin
        .from('usuarios')
        .select('email, activo')
        .eq('ci', ci)
        .single();

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

    // Verificar CI duplicado
    const { data: existente } = await supabaseAdmin.from('usuarios').select('id').eq('ci', ci).single();
    if (existente) return res.status(409).json({ error: 'CI ya registrado.' });

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });
    if (authError) return res.status(400).json({ error: authError.message });

    const { data: perfil, error: perfilError } = await supabaseAdmin
        .from('usuarios')
        .insert({ id: authData.user.id, email, nombre_completo, ci, telefono, rol: 'cliente' })
        .select()
        .single();

    if (perfilError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return res.status(500).json({ error: 'Error al crear perfil.' });
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

module.exports = router;
