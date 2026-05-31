/**
 * reset_passwords_staff.js — resetea password de todo admin_sucursal + cajero a Tbb2024!
 * Uso: node scripts/reset_passwords_staff.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const PASSWORD = 'Tbb2024!';

async function main() {
    const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supa.from('usuarios')
        .select('id,email,rol').in('rol', ['admin_sucursal', 'cajero']);
    if (error) throw error;
    console.log(`Reseteando ${data.length} cuentas staff...`);
    let ok = 0, err = 0;
    for (const u of data) {
        const { error: e } = await supa.auth.admin.updateUserById(u.id, { password: PASSWORD });
        if (e) { console.warn(`  ✗ ${u.email}: ${e.message}`); err++; }
        else { ok++; if (ok % 20 === 0) process.stdout.write(`\r  ${ok}`); }
    }
    console.log(`\n✅ ${ok} ok, ${err} errores. Password = ${PASSWORD}`);
}
main().catch(e => { console.error('FATAL:', e.message || e); process.exit(1); });
