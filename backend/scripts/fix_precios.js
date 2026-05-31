/**
 * fix_precios.js — corrige precios de calendario_salidas y viajes.
 * El seed leyó la columna de turno en vez del precio. Re-parsea horarios y actualiza.
 * Uso: node scripts/fix_precios.js [--dry]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry');
const HORARIOS = path.join(__dirname, '../../documentacion/horarios/horarios_buses_v6.md');

const CIUDAD_A_DEPTO = {
    'La Paz': 'La Paz', 'Cochabamba': 'Cochabamba', 'Santa Cruz': 'Santa Cruz',
    'Oruro': 'Oruro', 'Tarija': 'Tarija', 'Potosí': 'Potosí', 'Potosi': 'Potosí',
    'Sucre': 'Chuquisaca', 'Chuquisaca': 'Chuquisaca',
    'Trinidad': 'Beni', 'Beni': 'Beni', 'Pando': 'Pando', 'Cobija': 'Pando',
};
const depto = (c) => CIUDAD_A_DEPTO[(c || '').trim()] || (c || '').trim();
const limpiarRuta = (s) => s.replace(/`\(invertida\)`/gi, '').replace(/✅/g, '').replace(/[🌅🌤️🌙📍]/g, '').trim();

// priceMap: `${empresa}|${origenDepto}|${destinoDepto}` -> precio (primer número del rango)
function parsePrecios() {
    const lines = fs.readFileSync(HORARIOS, 'utf8').split('\n');
    let empresa = null, origen = null, destino = null;
    const map = {};
    for (const line of lines) {
        if (line.startsWith('## 🏢')) { empresa = line.replace('## 🏢', '').trim(); origen = destino = null; continue; }
        if (line.startsWith('### 📍')) {
            const parts = limpiarRuta(line.replace('### 📍', '')).split('→').map(s => s.trim());
            origen = parts[0]; destino = parts[1]; continue;
        }
        // | salida | llegada (+1día)? | turno | precio1 | precio2 | precio3 |
        const mr = line.match(/^\|\s*\d{1,2}:\d{2}\s*\|\s*\d{1,2}:\d{2}\s*(?:\(\+1\s*d[ií]a\))?\s*\|[^|]*\|([^|]*)\|/);
        if (mr && empresa && origen && destino) {
            const pm = mr[1].match(/(\d+)/);
            if (pm) {
                const key = `${empresa}|${depto(origen)}|${depto(destino)}`;
                if (!map[key]) map[key] = parseInt(pm[1], 10); // primer horario define el precio de la ruta
            }
        }
    }
    return map;
}

async function main() {
    const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
    const priceMap = parsePrecios();
    console.log(`📄 ${Object.keys(priceMap).length} precios de ruta parseados`);

    const { data: deps } = await supa.from('departamentos').select('id,nombre');
    const idToDepto = {}; deps.forEach(d => idToDepto[d.id] = d.nombre);
    const { data: sucs } = await supa.from('sucursales').select('id,nombre');
    const sucNombre = {}; sucs.forEach(s => sucNombre[s.id] = s.nombre);

    const { data: cals } = await supa.from('calendario_salidas').select('id,sucursal_id,origen_departamento_id,destino_departamento_id');
    let upd = 0, sinMatch = 0;
    const updates = [];
    for (const c of cals) {
        const key = `${sucNombre[c.sucursal_id]}|${idToDepto[c.origen_departamento_id]}|${idToDepto[c.destino_departamento_id]}`;
        const precio = priceMap[key];
        if (precio == null) { sinMatch++; continue; }
        updates.push({ id: c.id, precio });
        upd++;
    }
    console.log(`🔢 calendario a actualizar: ${upd} · sin match: ${sinMatch}`);

    if (DRY) {
        const ej = updates.slice(0, 5).map(u => `${u.id.slice(0, 8)}=Bs${u.precio}`).join(', ');
        console.log(`   ejemplos: ${ej}`);
        console.log('🟡 DRY — no escribe.'); return;
    }

    for (const u of updates) {
        await supa.from('calendario_salidas').update({ precio: u.precio }).eq('id', u.id);
    }
    console.log(`✅ calendario_salidas actualizados: ${upd}`);
    console.log('   (viajes se actualizan vía SQL join aparte)');
}

main().catch(e => { console.error('FATAL:', e.message || e); process.exit(1); });
