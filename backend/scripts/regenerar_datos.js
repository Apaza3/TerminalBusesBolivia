/**
 * regenerar_datos.js — Regenera buses, tripulación, calendario_salidas y viajes
 * desde los documentos fuente, con lógica FIFO física (sin teletransporte).
 *
 * Fuentes:
 *   - documentacion/horarios/flotas_y_personal.md   (98 buses + tripulación)
 *   - documentacion/horarios/horarios_buses_v6.md    (rutas/horarios/precios)
 *
 * Conserva: usuarios/auth, departamentos, sucursales.
 * Regenera: buses, tripulacion, calendario_salidas, viajes.
 * Borra: viajes + reservas/boletos/asientos de prueba.
 *
 * Uso:
 *   node scripts/regenerar_datos.js --dry    (solo parsea e imprime conteos)
 *   node scripts/regenerar_datos.js          (ejecuta wipe + seed en producción)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DRY = process.argv.includes('--dry');

const PROJECT_REF = 'eoiindqtjhvyyoahnpcp';
const POOLER_HOST = 'aws-0-us-east-1.pooler.supabase.com';
const DB_PASSWORD = process.env.DB_PASSWORD;

const DOC_DIR = path.join(__dirname, '../../documentacion/horarios');
const FLOTAS = path.join(DOC_DIR, 'flotas_y_personal.md');
const HORARIOS = path.join(DOC_DIR, 'horarios_buses_v6.md');

// ── Mapeo ciudad (doc) → departamento (DB) ───────────────────────────────────
const CIUDAD_A_DEPTO = {
    'La Paz': 'La Paz', 'Cochabamba': 'Cochabamba', 'Santa Cruz': 'Santa Cruz',
    'Oruro': 'Oruro', 'Tarija': 'Tarija', 'Potosí': 'Potosí', 'Potosi': 'Potosí',
    'Sucre': 'Chuquisaca', 'Chuquisaca': 'Chuquisaca',
    'Trinidad': 'Beni', 'Beni': 'Beni', 'Pando': 'Pando', 'Cobija': 'Pando',
};
const depto = (ciudad) => CIUDAD_A_DEPTO[ciudad.trim()] || ciudad.trim();

// ── Ventana de simulación ────────────────────────────────────────────────────
const HOY = new Date();
const START = new Date(Date.UTC(HOY.getUTCFullYear(), HOY.getUTCMonth(), HOY.getUTCDate() - 3, 0, 0, 0));
const END = new Date(START.getTime() + 30 * 24 * 3600 * 1000); // 30 días
const NOW = new Date(); // para estado en vivo

// ════════════════════════════════════════════════════════════════════════════
// PARSEO: flotas_y_personal.md  → buses[]
// ════════════════════════════════════════════════════════════════════════════
function field(txt, key) {
    const m = txt.match(new RegExp(key + '"?\\s*:\\s*"([^"]+)"', 'i'));
    return m ? m[1] : null;
}
function fieldNum(txt, key) {
    const m = txt.match(new RegExp(key + '"?\\s*:\\s*"?(\\d+)"?', 'i'));
    return m ? parseInt(m[1], 10) : null;
}

function parseFlotas() {
    const raw = fs.readFileSync(FLOTAS, 'utf8');
    const re = /BUS-[A-Z]{2,4}-\d{3}/g;
    const idxs = [];
    let m;
    while ((m = re.exec(raw)) !== null) idxs.push({ id: m[0], at: m.index });
    // bloques entre marcadores consecutivos
    const buses = [];
    const vistos = new Set();
    for (let i = 0; i < idxs.length; i++) {
        const start = idxs[i].at;
        const end = i + 1 < idxs.length ? idxs[i + 1].at : raw.length;
        const block = raw.slice(start, end);
        const busId = idxs[i].id;
        if (vistos.has(busId)) continue; // el id aparece 1x como marcador de su bloque
        vistos.add(busId);

        const empresa = field(block, 'empresa');
        const empresa_codigo = field(block, 'empresa_codigo');
        const placa = field(block, 'placa');
        if (!empresa || !placa) continue; // bloque incompleto / referencia

        const marca = field(block, 'marca');
        const modelo = field(block, 'modelo');
        const anio = fieldNum(block, 'anio');
        const pisos = fieldNum(block, 'pisos') || 1;
        const categoria = field(block, 'categoria');
        let amenidades = [];
        const am = block.match(/amenidades"?\s*:\s*(\[[^\]]*\])/i);
        if (am) { try { amenidades = JSON.parse(am[1]); } catch { amenidades = []; } }

        const soatNum = (block.match(/soat[\s\S]*?numero"?\s*:\s*"([^"]+)"/i) || [])[1] || null;
        const soatVen = (block.match(/soat[\s\S]*?vencimiento"?\s*:\s*"([^"]+)"/i) || [])[1] || null;
        const inspNum = (block.match(/inspeccion[\s\S]*?numero"?\s*:\s*"([^"]+)"/i) || [])[1] || null;
        const inspVen = (block.match(/inspeccion[\s\S]*?vencimiento"?\s*:\s*"([^"]+)"/i) || [])[1] || null;

        const base = field(block, 'base');

        const idxC = block.search(/conductor"?\s*:/i);
        const idxA = block.search(/ayudante"?\s*:/i);
        const condChunk = block.slice(idxC, idxA > idxC ? idxA : undefined);
        const ayudChunk = idxA >= 0 ? block.slice(idxA) : '';
        const crew = (chunk) => chunk ? ({
            ci: field(chunk, 'ci'),
            nombre: field(chunk, 'nombre'),
            apellido: field(chunk, 'apellido'),
            correo: field(chunk, 'correo'),
            telefono: field(chunk, 'telefono'),
            fnac: field(chunk, 'fecha_nacimiento'),
        }) : null;

        buses.push({
            busId, empresa, empresa_codigo, placa, marca, modelo, anio, pisos,
            categoria, amenidades, soatNum, soatVen, inspNum, inspVen, base,
            conductor: crew(condChunk), ayudante: crew(ayudChunk),
        });
    }
    return buses;
}

// ════════════════════════════════════════════════════════════════════════════
// PARSEO: horarios_buses_v6.md  → calendarios[]
// ════════════════════════════════════════════════════════════════════════════
function limpiarRuta(s) {
    return s.replace(/`\(invertida\)`/gi, '')
        .replace(/✅/g, '')
        .replace(/[🌅🌤️🌙📍]/g, '')
        .trim();
}
function fmtDur(min) {
    if (min <= 0) min += 1440;
    const h = Math.floor(min / 60), mm = min % 60;
    return mm ? `${h}h ${mm}min` : `${h}h`;
}
function parseHorarios() {
    const lines = fs.readFileSync(HORARIOS, 'utf8').split('\n');
    let empresa = null, origen = null, destino = null;
    const out = [];
    for (const line of lines) {
        if (line.startsWith('## 🏢')) {
            empresa = line.replace('## 🏢', '').trim();
            origen = destino = null;
            continue;
        }
        if (line.startsWith('### 📍')) {
            const ruta = limpiarRuta(line.replace('### 📍', ''));
            const parts = ruta.split('→').map(s => s.trim());
            origen = parts[0]; destino = parts[1];
            continue;
        }
        const mr = line.match(/^\|\s*(\d{1,2}:\d{2})\s*\|\s*(\d{1,2}:\d{2})\s*(\(\+1\s*d[ií]a\))?\s*\|([^|]*)\|([^|]*)\|/);
        if (mr && empresa && origen && destino) {
            const salida = mr[1].padStart(5, '0');
            const [lh, lm] = mr[2].split(':').map(Number);
            const plus1 = !!mr[3];
            const [sh, sm] = salida.split(':').map(Number);
            const durMin = (lh * 60 + lm + (plus1 ? 1440 : 0)) - (sh * 60 + sm);
            const precioCell = mr[5];   // mr[4] = turno; mr[5] = primera columna de precio
            const pm = precioCell.match(/(\d+)/);
            const precio = pm ? parseInt(pm[1], 10) : 0;
            out.push({
                empresa, origenCiudad: origen, destinoCiudad: destino,
                origenDepto: depto(origen), destinoDepto: depto(destino),
                hora: salida, durMin, precio,
            });
        }
    }
    return out;
}

// ════════════════════════════════════════════════════════════════════════════
// Helpers de capacidad / asientos
// ════════════════════════════════════════════════════════════════════════════
function seatConfig(categoria, pisos) {
    const esCama = /cama/i.test(categoria || '');
    const columnas = esCama ? 3 : 4;
    const filas1 = pisos === 2 ? 6 : 11;
    const filas2 = pisos === 2 ? 11 : 0;
    const capacidad = columnas * (filas1 + filas2);
    return { columnas, filas1, filas2, capacidad, conf: esCama ? '2+1' : '2+2' };
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════
async function main() {
    if (!process.env.SUPABASE_SERVICE_KEY) throw new Error('Falta SUPABASE_SERVICE_KEY en .env');

    const buses = parseFlotas();
    const calendarios = parseHorarios();

    console.log(`📄 Parseado: ${buses.length} buses, ${calendarios.length} filas de horario`);
    const porEmpresaBuses = {};
    buses.forEach(b => { porEmpresaBuses[b.empresa] = (porEmpresaBuses[b.empresa] || 0) + 1; });
    console.log('   Buses por empresa:', porEmpresaBuses);

    const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } });

    // ── refs DB ──
    const { data: deptos, error: eDep } = await supa.from('departamentos').select('id,nombre');
    if (eDep) throw eDep;
    const deptoId = {}; const idToDepto = {};
    deptos.forEach(d => { deptoId[d.nombre] = d.id; idToDepto[d.id] = d.nombre; });
    const { data: sucs, error: eSuc } = await supa.from('sucursales').select('id,nombre,departamento_id');
    if (eSuc) throw eSuc;
    const sucId = {}; // `${empresa}|${depto}` → sucursal_id
    sucs.forEach(s => { sucId[`${s.nombre}|${idToDepto[s.departamento_id]}`] = s.id; });

    // ── construir registros bus + tripulación ──
    const ciVistos = new Set();
    const uniqCI = (ci) => {
        let c = ci || 'SIN-CI', n = c, i = 1;
        while (ciVistos.has(n)) { i++; n = `${c}-${i}`; }
        ciVistos.add(n); return n;
    };
    const busRecords = [];
    const tripRecords = [];
    const advertencias = [];
    for (const b of buses) {
        const d = depto(b.base || '');
        const sid = sucId[`${b.empresa}|${d}`];
        if (!sid) { advertencias.push(`Bus ${b.busId}: sin sucursal para ${b.empresa} en ${d} (base=${b.base})`); continue; }
        const sc = seatConfig(b.categoria, b.pisos);
        const busUuid = crypto.randomUUID();
        busRecords.push({
            id: busUuid, sucursal_id: sid, placa: b.placa, marca: b.marca, modelo: b.modelo,
            anio: b.anio, pisos: b.pisos, columnas: sc.columnas, filas1: sc.filas1, filas2: sc.filas2,
            capacidad: sc.capacidad, conf: sc.conf, tiene_bano: b.amenidades.some(a => /ba(ñ|n)o/i.test(a)),
            amenidades: b.amenidades, categoria: (b.categoria || 'Estándar'),
            soatNum: b.soatNum, soatVen: b.soatVen, inspNum: b.inspNum, inspVen: b.inspVen,
            deptoId: deptoId[d], ciudad: b.base, empresa: b.empresa,
        });
        const edad = (fnac) => fnac ? (2026 - parseInt(fnac.slice(0, 4), 10)) : null;
        let condId = null, ayudId = null;
        if (b.conductor && b.conductor.nombre) {
            condId = crypto.randomUUID();
            tripRecords.push({
                id: condId, sucursal_id: sid, nombre: `${b.conductor.nombre} ${b.conductor.apellido}`.trim(),
                ci: uniqCI(b.conductor.ci), edad: edad(b.conductor.fnac), celular: b.conductor.telefono,
                rol: 'conductor', deptoId: deptoId[d],
            });
        }
        if (b.ayudante && b.ayudante.nombre) {
            ayudId = crypto.randomUUID();
            tripRecords.push({
                id: ayudId, sucursal_id: sid, nombre: `${b.ayudante.nombre} ${b.ayudante.apellido}`.trim(),
                ci: uniqCI(b.ayudante.ci), edad: edad(b.ayudante.fnac), celular: b.ayudante.telefono,
                rol: 'ayudante', deptoId: deptoId[d],
            });
        }
        busRecords[busRecords.length - 1].condId = condId;
        busRecords[busRecords.length - 1].ayudId = ayudId;
    }

    // ── construir calendario_salidas ──
    const calRecords = [];
    const calSkips = new Set();
    for (const c of calendarios) {
        const sid = sucId[`${c.empresa}|${c.origenDepto}`];
        const od = deptoId[c.origenDepto], dd = deptoId[c.destinoDepto];
        if (!sid || !od || !dd) { calSkips.add(`${c.empresa}|${c.origenDepto}->${c.destinoDepto}`); continue; }
        calRecords.push({
            id: crypto.randomUUID(), empresa: c.empresa, sucursal_id: sid,
            origenDep: od, destinoDep: dd, origenDepNombre: c.origenDepto, destinoDepNombre: c.destinoDepto,
            hora: c.hora, precio: c.precio, durMin: c.durMin, dur: fmtDur(c.durMin),
        });
    }

    // ── SIMULACIÓN FIFO (por empresa) → viajes ──
    const empresas = [...new Set(busRecords.map(b => b.empresa))];
    const viajes = [];
    for (const emp of empresas) {
        const flota = busRecords.filter(b => b.empresa === emp);
        const slots = calRecords.filter(c => c.empresa === emp);
        if (!flota.length || !slots.length) continue;

        // estado de cada bus: dept actual + disponible_desde
        const estado = {};
        flota.forEach(b => { estado[b.id] = { dept: b.deptoId, deptNombre: b.ciudad ? depto(b.ciudad) : null, disponible: START.getTime(), b }; });

        // generar eventos (día × slot) dentro de ventana
        const eventos = [];
        for (let t = START.getTime(); t < END.getTime(); t += 24 * 3600 * 1000) {
            const day = new Date(t);
            for (const s of slots) {
                const [hh, mm] = s.hora.split(':').map(Number);
                const dep = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hh, mm, 0));
                if (dep.getTime() < START.getTime() || dep.getTime() >= END.getTime()) continue;
                eventos.push({ dep: dep.getTime(), s });
            }
        }
        eventos.sort((a, b) => a.dep - b.dep);

        for (const ev of eventos) {
            const s = ev.s;
            // candidatos: buses de la empresa en el depto de origen, disponibles a la hora de salida
            let elegido = null;
            for (const id in estado) {
                const st = estado[id];
                if (st.dept === s.origenDep && st.disponible <= ev.dep) {
                    if (!elegido || st.disponible < estado[elegido].disponible) elegido = id;
                }
            }
            if (!elegido) continue; // slot sin bus → no se crea viaje
            const st = estado[elegido];
            const arrival = ev.dep + s.durMin * 60 * 1000;
            // estado en vivo
            let est = 'programado';
            if (arrival <= NOW.getTime()) est = 'completado';
            else if (ev.dep <= NOW.getTime() && NOW.getTime() < arrival) est = 'en_viaje';
            viajes.push({
                id: crypto.randomUUID(), cal: s, bus: st.b, dep: new Date(ev.dep), arr: new Date(arrival),
                estado: est, condId: st.b.condId, ayudId: st.b.ayudId,
            });
            // avanzar bus
            st.dept = s.destinoDep; st.deptNombre = s.destinoDepNombre; st.disponible = arrival;
        }
    }

    // posición/estado actual de cada bus en NOW (para buses.departamento_actual / estado)
    const busAhora = {}; // bus.id → { deptId, estado }
    busRecords.forEach(b => { busAhora[b.id] = { deptId: b.deptoId, estado: 'disponible' }; });
    viajes.slice().sort((a, b) => a.dep - b.dep).forEach(v => {
        const cur = busAhora[v.bus.id];
        if (v.arr.getTime() <= NOW.getTime()) { cur.deptId = v.cal.destinoDep; cur.estado = 'disponible'; }
        else if (v.dep.getTime() <= NOW.getTime() && NOW.getTime() < v.arr.getTime()) { cur.estado = 'en_viaje'; }
    });

    // ── REPORTE ──
    console.log(`\n📊 A generar:`);
    console.log(`   buses:            ${busRecords.length}`);
    console.log(`   tripulacion:      ${tripRecords.length}`);
    console.log(`   calendario_salidas:${calRecords.length}`);
    console.log(`   viajes:           ${viajes.length}`);
    const estCount = {}; viajes.forEach(v => estCount[v.estado] = (estCount[v.estado] || 0) + 1);
    console.log(`   viajes por estado:`, estCount);
    if (advertencias.length) console.log(`\n⚠️  Buses sin sucursal (${advertencias.length}):\n   ` + advertencias.join('\n   '));
    if (calSkips.size) console.log(`\n⚠️  Rutas de horario sin sucursal (${calSkips.size}):\n   ` + [...calSkips].join('\n   '));

    if (DRY) {
        console.log('\n🟡 DRY RUN — no se escribió nada.');
        return;
    }

    // ════════════════════════════════════════════════════════════════════════
    // WIPE + SEED (vía supabase-js / service role)
    // ════════════════════════════════════════════════════════════════════════
    const NIL = '00000000-0000-0000-0000-000000000000';
    const chunk = (arr, n) => { const o = []; for (let i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n)); return o; };

    console.log('\n🔻 Wipe...');
    for (const t of ['asientos_viaje', 'boletos', 'reembolsos', 'pagos', 'ventas', 'reservas',
        'bitacora_viajes', 'incidencias', 'reportes_mantenimiento', 'encomiendas',
        'viajes', 'calendario_salidas', 'tripulacion', 'buses']) {
        const { error } = await supa.from(t).delete().neq('id', NIL);
        if (error) throw new Error(`wipe ${t}: ${error.message}`);
        console.log(`   borrado ${t}`);
    }

    console.log('🔺 Seed...');
    // buses
    const busRows = busRecords.map(b => ({
        id: b.id, sucursal_id: b.sucursal_id, placa: b.placa, marca: b.marca, modelo: b.modelo,
        anio: b.anio, pisos: b.pisos, columnas: b.columnas, filas_piso_1: b.filas1, filas_piso_2: b.filas2,
        capacidad: b.capacidad, configuracion_asientos: b.conf, tiene_bano: b.tiene_bano,
        amenidades: b.amenidades, categoria: b.categoria, estado: busAhora[b.id].estado,
        soat_numero: b.soatNum, soat_vence: b.soatVen, inspeccion_numero: b.inspNum, inspeccion_vence: b.inspVen,
        departamento_actual_id: busAhora[b.id].deptId, ubicacion_actual_departamento: busAhora[b.id].deptId,
        ubicacion_actual_ciudad: b.ciudad,
    }));
    for (const c of chunk(busRows, 200)) { const { error } = await supa.from('buses').insert(c); if (error) throw new Error('buses: ' + error.message); }
    console.log(`   buses: ${busRows.length}`);

    // tripulacion
    const tripRows = tripRecords.map(t => ({
        id: t.id, sucursal_id: t.sucursal_id, nombre: t.nombre, ci: t.ci, edad: t.edad,
        celular: t.celular, rol: t.rol, departamento_actual_id: t.deptoId, estado: 'disponible',
    }));
    for (const c of chunk(tripRows, 200)) { const { error } = await supa.from('tripulacion').insert(c); if (error) throw new Error('tripulacion: ' + error.message); }
    console.log(`   tripulacion: ${tripRows.length}`);

    // calendario_salidas
    const calRows = calRecords.map(c => ({
        id: c.id, sucursal_id: c.sucursal_id, origen_departamento_id: c.origenDep,
        destino_departamento_id: c.destinoDep, hora_salida: c.hora, dias_semana: [1, 2, 3, 4, 5, 6, 7],
        precio: c.precio, duracion_estimada: c.dur, activo: true,
    }));
    for (const c of chunk(calRows, 200)) { const { error } = await supa.from('calendario_salidas').insert(c); if (error) throw new Error('calendario: ' + error.message); }
    console.log(`   calendario_salidas: ${calRows.length}`);

    // viajes
    const viajeRows = viajes.map(v => ({
        id: v.id, calendario_salida_id: v.cal.id, sucursal_id: v.cal.sucursal_id, bus_id: v.bus.id,
        origen: v.cal.origenDepNombre, destino: v.cal.destinoDepNombre,
        origen_departamento_id: v.cal.origenDep, destino_departamento_id: v.cal.destinoDep,
        fecha_salida: v.dep.toISOString(), precio: v.cal.precio, duracion_estimada: v.cal.dur,
        conductor_id: v.condId, ayudante_id: v.ayudId, estado: v.estado,
    }));
    let n = 0;
    for (const c of chunk(viajeRows, 500)) { const { error } = await supa.from('viajes').insert(c); if (error) throw new Error('viajes: ' + error.message); n += c.length; process.stdout.write(`\r   viajes: ${n}`); }
    console.log(`\n✅ Seed completo.`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
