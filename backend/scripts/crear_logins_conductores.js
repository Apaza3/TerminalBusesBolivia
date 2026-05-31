/**
 * crear_logins_conductores.js  (modo ENLAZAR)
 * Los 96 auth+usuarios conductor (@terminalhub.bo) ya existen (seed previo + trigger handle_new_user),
 * pero con sucursal/depto/telefono/ci NULL y sin vínculo a tripulacion.
 *
 * Este script:
 *  - Enlaza cada usuario conductor con su fila de tripulacion (match por correo→telefono→celular).
 *  - Completa usuarios: sucursal_id, departamento_id, telefono, ci, verificado, activo.
 *  - Setea tripulacion.usuario_id.
 *  - Resetea password a Tbb2024!.
 *
 * Uso: node scripts/crear_logins_conductores.js [--dry]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry');
const PASSWORD = 'Tbb2024!';
const FLOTAS = path.join(__dirname, '../../documentacion/horarios/flotas_y_personal.md');
const field = (txt, key) => { const m = txt.match(new RegExp(key + '"?\\s*:\\s*"([^"]+)"', 'i')); return m ? m[1] : null; };

function correoTelefonoDoc() {
    const raw = fs.readFileSync(FLOTAS, 'utf8');
    const re = /BUS-[A-Z]{2,4}-\d{3}/g; const idxs = []; let m;
    while ((m = re.exec(raw)) !== null) idxs.push(m.index);
    const byCorreo = {};
    for (let i = 0; i < idxs.length; i++) {
        const block = raw.slice(idxs[i], i + 1 < idxs.length ? idxs[i + 1] : raw.length);
        const idxC = block.search(/conductor"?\s*:/i), idxA = block.search(/ayudante"?\s*:/i);
        if (idxC < 0) continue;
        const cond = block.slice(idxC, idxA > idxC ? idxA : undefined);
        const correo = field(cond, 'correo'), tel = field(cond, 'telefono');
        if (correo && tel) byCorreo[correo.trim().toLowerCase()] = tel.trim();
    }
    return byCorreo;
}

async function main() {
    if (!process.env.SUPABASE_SERVICE_KEY) throw new Error('Falta SUPABASE_SERVICE_KEY');
    const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } });

    const byCorreo = correoTelefonoDoc();
    const { data: usrs, error: eU } = await supa.from('usuarios').select('id,email,ci').eq('rol', 'conductor');
    if (eU) throw eU;
    const { data: trips, error: eT } = await supa.from('tripulacion')
        .select('id,celular,sucursal_id,departamento_actual_id,ci,usuario_id').eq('rol', 'conductor');
    if (eT) throw eT;
    const tripByTel = {}; trips.forEach(t => { if (t.celular) tripByTel[t.celular.trim()] = t; });

    console.log(`👥 usuarios conductor: ${usrs.length} · tripulacion conductor: ${trips.length} · correos doc: ${Object.keys(byCorreo).length}`);

    let plan = 0, sinMatch = 0;
    const acciones = [];
    for (const u of usrs) {
        const tel = byCorreo[(u.email || '').toLowerCase()];
        const trip = tel ? tripByTel[tel] : null;
        if (!trip) { sinMatch++; continue; }
        acciones.push({ u, trip });
        plan++;
    }
    console.log(`🔗 a enlazar: ${plan} · sin match: ${sinMatch}`);

    if (DRY) { console.log('🟡 DRY — no se escribió nada.'); return; }

    let ok = 0, err = 0;
    for (const { u, trip } of acciones) {
        // completar usuarios (ci puede chocar con UNIQUE → intentar, si falla omitir ci)
        const base = { sucursal_id: trip.sucursal_id, departamento_id: trip.departamento_actual_id, telefono: trip.celular, verificado: true, activo: true };
        let { error: e1 } = await supa.from('usuarios').update({ ...base, ci: trip.ci }).eq('id', u.id);
        if (e1 && /unique|duplicate/i.test(e1.message)) { ({ error: e1 } = await supa.from('usuarios').update(base).eq('id', u.id)); }
        if (e1) { console.warn(`   ✗ usuarios ${u.email}: ${e1.message}`); err++; continue; }
        const { error: e2 } = await supa.from('tripulacion').update({ usuario_id: u.id }).eq('id', trip.id);
        if (e2) { console.warn(`   ✗ link trip ${u.email}: ${e2.message}`); err++; continue; }
        const { error: e3 } = await supa.auth.admin.updateUserById(u.id, { password: PASSWORD });
        if (e3) console.warn(`   ⚠ password ${u.email}: ${e3.message}`);
        ok++;
        if (ok % 20 === 0) process.stdout.write(`\r   enlazados: ${ok}`);
    }
    console.log(`\n✅ enlazados: ${ok}, errores: ${err}`);
}

main().catch(e => { console.error('FATAL:', e.message || e); process.exit(1); });
