/**
 * migrar.js — Ejecuta la migración v3 directamente en Supabase PostgreSQL
 * Uso: node sql/migrar.js
 * Requiere: DB_PASSWORD en .env (Supabase → Project Settings → Database)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'eoiindqtjhvyyoahnpcp';
const POOLER_HOST = 'aws-0-us-east-1.pooler.supabase.com';

const DB_PASSWORD = process.env.DB_PASSWORD;
if (!DB_PASSWORD) {
    console.error('❌ Falta DB_PASSWORD en .env');
    console.error('   Obtener en: Supabase → Project Settings → Database → Database password');
    process.exit(1);
}

const client = new Client({
    host: POOLER_HOST,
    port: 6543,
    database: 'postgres',
    user: `postgres.${PROJECT_REF}`,
    password: DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
});

async function migrar() {
    console.log('🔌 Conectando a Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Conectado\n');

    const sql = fs.readFileSync(path.join(__dirname, 'migracion_v3.sql'), 'utf8');

    // Dividir en sentencias individuales para mejor reporte de errores
    const sentencias = sql
        .split(/;\s*\n/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    let exitosas = 0;
    let fallidas = 0;

    for (const sentencia of sentencias) {
        try {
            await client.query(sentencia);
            exitosas++;
            process.stdout.write('.');
        } catch (err) {
            fallidas++;
            if (!err.message.includes('already exists') && !err.message.includes('ya existe')) {
                console.error(`\n⚠️  ${err.message.substring(0, 100)}`);
            } else {
                process.stdout.write('s');  // 's' = skipped (ya existe)
            }
        }
    }

    console.log(`\n\n✅ Migración completada: ${exitosas} exitosas, ${fallidas} con advertencias`);

    // Verificar tablas
    const { rows } = await client.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name;
    `);
    console.log('\n📋 Tablas en BD:', rows.map(r => r.table_name).join(', '));

    await client.end();
}

migrar().catch(err => {
    console.error('❌ Error fatal:', err.message);
    client.end().catch(() => {});
    process.exit(1);
});
