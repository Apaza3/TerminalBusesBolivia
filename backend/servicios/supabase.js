const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL) throw new Error('SUPABASE_URL no configurado en .env');
if (!SUPABASE_SERVICE_KEY && !SUPABASE_ANON_KEY) throw new Error('Se requiere SUPABASE_SERVICE_KEY o SUPABASE_ANON_KEY en .env');

// Cliente admin (service role) — bypass RLS, para operaciones de backend
const supabaseAdmin = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
);

// Cliente público — respeta RLS, para operaciones en nombre del usuario
const supabasePublico = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
});

/**
 * Crea cliente Supabase autenticado con el JWT del usuario (respeta RLS por usuario).
 */
const supabaseParaUsuario = (jwtToken) => {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${jwtToken}` } },
        auth: { persistSession: false }
    });
};

module.exports = { supabaseAdmin, supabasePublico, supabaseParaUsuario };
