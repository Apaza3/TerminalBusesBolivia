const { supabaseAdmin } = require('../servicios/supabase');

/**
 * Middleware: valida JWT de Supabase y adjunta usuario a req.usuario
 */
const requireAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de autenticación requerido.' });
    }

    const token = authHeader.split(' ')[1];
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
        return res.status(401).json({ error: 'Token inválido o expirado.' });
    }

    // Obtener perfil extendido del usuario
    const { data: perfil } = await supabaseAdmin
        .from('usuarios')
        .select('*, sucursales(nombre, departamento_id)')
        .eq('id', data.user.id)
        .single();

    req.usuario = { ...data.user, perfil };
    next();
};

/**
 * Middleware: requiere rol específico (o array de roles)
 */
const requireRol = (...roles) => {
    return (req, res, next) => {
        if (!req.usuario?.perfil) {
            return res.status(401).json({ error: 'No autenticado.' });
        }
        if (!roles.includes(req.usuario.perfil.rol)) {
            return res.status(403).json({
                error: `Acceso denegado. Rol requerido: ${roles.join(' o ')}.`,
                rol_actual: req.usuario.perfil.rol
            });
        }
        next();
    };
};

/**
 * Middleware: auth opcional (adjunta usuario si hay token, no falla si no hay)
 */
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return next();

    try {
        const token = authHeader.split(' ')[1];
        const { data } = await supabaseAdmin.auth.getUser(token);
        if (data?.user) {
            const { data: perfil } = await supabaseAdmin
                .from('usuarios')
                .select('*')
                .eq('id', data.user.id)
                .single();
            req.usuario = { ...data.user, perfil };
        }
    } catch (_) { /* ignorar errores */ }
    next();
};

module.exports = { requireAuth, requireRol, optionalAuth };
