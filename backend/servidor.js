/**
 * servidor.js — Terminal Buses Bolivia Backend
 * Express + WebSocket server para sincronización local sin Supabase.
 * 
 * Endpoints:
 *  GET  /health              — Estado del servidor
 *  GET  /api/viajes          — Listar viajes (datos locales)
 *  GET  /api/viajes/:id      — Detalle de viaje
 *  GET  /api/asientos/:id    — Estado de asientos de un viaje
 *  POST /api/asientos/bloquear — Bloquear asientos temporalmente
 *  POST /api/reservas        — Crear reserva
 *  GET  /api/reservas        — Listar reservas
 *  GET  /api/reservas/:id    — Detalle de reserva
 *  POST /api/auth/login      — Login staff local
 *  GET  /api/estado-viaje/:id — Estado actual de un viaje
 *  PUT  /api/estado-viaje/:id — Actualizar estado de viaje (conductor)
 * 
 * WebSocket:
 *  ws://localhost:4000       — Sincronización de asientos en tiempo real
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');

const app = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

// ── In-Memory Storage (reemplaza BD mientras Supabase esté offline) ──

const db = {
    reservas: new Map(),
    asientosPendientes: new Map(), // key: `${viajeId}_${asiento}` → { expiraEn, clienteId }
    estadosViaje: new Map(),
    usuarios: [
        { id: 'staff-001', email: 'admin@tbb.com', password: 'admin123456', rol: 'admin_sucursal', nombre_completo: 'Admin Principal', activo: true },
        { id: 'staff-002', email: 'cajero@tbb.com', password: 'cajero123456', rol: 'cajero', nombre_completo: 'María Cajero', activo: true },
        { id: 'staff-003', email: 'conductor@tbb.com', password: 'conductor123456', rol: 'conductor', nombre_completo: 'Pedro Chofer', activo: true },
    ],
    viajes: [
        { id: 'v1-1', origen: 'La Paz', destino: 'Cochabamba', salida: '2026-06-01T08:00:00', precio: 45, busPlaca: 'ABC-1234', capacidad: 42, estado: 'programado' },
        { id: 'v1-2', origen: 'La Paz', destino: 'Santa Cruz', salida: '2026-06-01T20:00:00', precio: 85, busPlaca: 'DEF-5678', capacidad: 48, estado: 'programado' },
        { id: 'v2-1', origen: 'La Paz', destino: 'Oruro', salida: '2026-06-02T10:00:00', precio: 25, busPlaca: 'GHI-9012', capacidad: 36, estado: 'programado' },
        { id: 'v3-1', origen: 'Cochabamba', destino: 'Sucre', salida: '2026-06-03T07:00:00', precio: 40, busPlaca: 'ABC-1234', capacidad: 42, estado: 'programado' },
    ],
};

const BLOQUEO_TTL = 10 * 60 * 1000; // 10 min

// ── WebSocket Server ──────────────────────────────────

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const clientes = new Set();

wss.on('connection', (ws) => {
    clientes.add(ws);
    console.log(`[WS] Cliente conectado. Total: ${clientes.size}`);

    ws.on('close', () => {
        clientes.delete(ws);
        console.log(`[WS] Cliente desconectado. Total: ${clientes.size}`);
    });

    ws.on('error', () => clientes.delete(ws));
});

/**
 * Broadcast a message to all connected WS clients.
 */
const broadcast = (tipo, data) => {
    const msg = JSON.stringify({ tipo, data, ts: Date.now() });
    for (const cliente of clientes) {
        if (cliente.readyState === WebSocket.OPEN) {
            cliente.send(msg);
        }
    }
};

// ── Background: limpiar asientos expirados ────────────

setInterval(() => {
    const ahora = Date.now();
    let liberados = [];
    for (const [key, info] of db.asientosPendientes.entries()) {
        if (info.expiraEn < ahora) {
            db.asientosPendientes.delete(key);
            liberados.push(key);
        }
    }
    if (liberados.length > 0) {
        console.log(`[LIMPIEZA] ${liberados.length} asiento(s) liberado(s)`);
        broadcast('asientos_liberados', { asientos: liberados });
    }
}, 30000); // cada 30s

// ── Helpers ───────────────────────────────────────────

const generarId = () => 'res-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

const getAsientosOcupados = (viajeId) => {
    const ocupados = [];
    for (const reserva of db.reservas.values()) {
        if (reserva.viajeId === viajeId && reserva.estado === 'confirmada') {
            ocupados.push(...reserva.asientos);
        }
    }
    return ocupados;
};

const getAsientosBloqueados = (viajeId) => {
    const ahora = Date.now();
    const bloqueados = [];
    for (const [key, info] of db.asientosPendientes.entries()) {
        if (key.startsWith(viajeId + '_') && info.expiraEn > ahora) {
            bloqueados.push(key.replace(viajeId + '_', ''));
        }
    }
    return bloqueados;
};

// ── Rutas ─────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString(), wsClients: clientes.size });
});

// ── Auth ──────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email y password requeridos.' });

    const usuario = db.usuarios.find(u => u.email === email.toLowerCase() && u.activo);
    if (!usuario) return res.status(401).json({ error: 'Correo no registrado o cuenta suspendida.' });
    if (usuario.password !== password) return res.status(401).json({ error: 'Contraseña incorrecta.' });

    const { password: _, ...perfilSeguro } = usuario;
    res.json({ exito: true, usuario: perfilSeguro });
});

// ── Viajes ────────────────────────────────────────────

app.get('/api/viajes', (req, res) => {
    const { origen, destino, fecha } = req.query;
    let viajes = db.viajes.filter(v => v.estado === 'programado');

    if (origen) viajes = viajes.filter(v => v.origen.toLowerCase() === origen.toLowerCase());
    if (destino) viajes = viajes.filter(v => v.destino.toLowerCase() === destino.toLowerCase());
    if (fecha) viajes = viajes.filter(v => v.salida.startsWith(fecha));

    res.json(viajes);
});

app.get('/api/viajes/:id', (req, res) => {
    const viaje = db.viajes.find(v => v.id === req.params.id);
    if (!viaje) return res.status(404).json({ error: 'Viaje no encontrado.' });
    res.json(viaje);
});

// ── Asientos ──────────────────────────────────────────

app.get('/api/asientos/:viajeId', (req, res) => {
    const { viajeId } = req.params;
    res.json({
        viajeId,
        ocupados: getAsientosOcupados(viajeId),
        bloqueados: getAsientosBloqueados(viajeId),
        timestamp: Date.now(),
    });
});

app.post('/api/asientos/bloquear', (req, res) => {
    const { viajeId, asientos, clienteId } = req.body;
    if (!viajeId || !asientos || !asientos.length) {
        return res.status(400).json({ error: 'viajeId y asientos son requeridos.' });
    }

    const ocupados = getAsientosOcupados(viajeId);
    const bloqueados = getAsientosBloqueados(viajeId);
    const conflictos = asientos.filter(a => ocupados.includes(a) || bloqueados.includes(a));

    if (conflictos.length > 0) {
        return res.status(409).json({ error: `Asientos no disponibles: ${conflictos.join(', ')}` });
    }

    const expiraEn = Date.now() + BLOQUEO_TTL;
    asientos.forEach(asiento => {
        db.asientosPendientes.set(`${viajeId}_${asiento}`, { expiraEn, clienteId: clienteId || 'anon' });
    });

    // Notificar a todos los clientes WS
    broadcast('asientos_bloqueados', { viajeId, asientos, expiraEn });

    res.json({ exito: true, expiraEn, asientos });
});

// ── Reservas ──────────────────────────────────────────

app.get('/api/reservas', (req, res) => {
    const lista = Array.from(db.reservas.values());
    const { ci, viajeId } = req.query;
    let filtradas = lista;
    if (ci) filtradas = filtradas.filter(r => r.pasajeroCI === ci);
    if (viajeId) filtradas = filtradas.filter(r => r.viajeId === viajeId);
    res.json(filtradas.sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn)));
});

app.get('/api/reservas/:id', (req, res) => {
    const reserva = db.reservas.get(req.params.id);
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada.' });
    res.json(reserva);
});

app.post('/api/reservas', (req, res) => {
    const { viajeId, pasajeroNombre, pasajeroCI, pasajeroTelefono, asientos, precio, origen, destino, fechaSalida, busPlaca, metodoPago } = req.body;

    if (!viajeId || !pasajeroNombre || !asientos || !asientos.length) {
        return res.status(400).json({ error: 'Campos requeridos faltantes.' });
    }

    // Validar disponibilidad
    const ocupados = getAsientosOcupados(viajeId);
    const conflictos = asientos.filter(a => ocupados.includes(a));
    if (conflictos.length > 0) {
        return res.status(409).json({ error: `Asientos ya reservados: ${conflictos.join(', ')}` });
    }

    const id = generarId();
    const reserva = {
        id, viajeId, pasajeroNombre, pasajeroCI, pasajeroTelefono: pasajeroTelefono || '',
        asientos, precio: precio || asientos.length * 45,
        origen: origen || '—', destino: destino || '—',
        fechaSalida: fechaSalida || new Date().toISOString(),
        busPlaca: busPlaca || 'ABC-1234',
        metodoPago: metodoPago || 'efectivo',
        estado: 'confirmada',
        creadoEn: new Date().toISOString(),
    };

    db.reservas.set(id, reserva);

    // Liberar bloqueo de asientos
    asientos.forEach(a => db.asientosPendientes.delete(`${viajeId}_${a}`));

    // Notificar por WS
    broadcast('reserva_creada', { viajeId, asientos, reservaId: id });

    console.log(`[RESERVA] Nueva: ${id} | ${pasajeroNombre} | ${origen} → ${destino} | Asientos: ${asientos.join(',')}`);
    res.status(201).json(reserva);
});

// ── Estado de Viaje ───────────────────────────────────

app.get('/api/estado-viaje/:id', (req, res) => {
    const estado = db.estadosViaje.get(req.params.id) || 'programado';
    res.json({ viajeId: req.params.id, estado });
});

app.put('/api/estado-viaje/:id', (req, res) => {
    const { estado } = req.body;
    const estadosValidos = ['programado', 'en_ruta', 'finalizado', 'cancelado'];
    if (!estadosValidos.includes(estado)) {
        return res.status(400).json({ error: `Estado inválido. Válidos: ${estadosValidos.join(', ')}` });
    }
    db.estadosViaje.set(req.params.id, estado);
    broadcast('estado_viaje_actualizado', { viajeId: req.params.id, estado });
    res.json({ exito: true, viajeId: req.params.id, estado });
});

// ── Stats Admin ───────────────────────────────────────

app.get('/api/stats', (req, res) => {
    res.json({
        totalReservas: db.reservas.size,
        reservasConfirmadas: Array.from(db.reservas.values()).filter(r => r.estado === 'confirmada').length,
        wsClients: clientes.size,
        viajesActivos: db.viajes.filter(v => v.estado === 'programado').length,
    });
});

// ── 404 ───────────────────────────────────────────────

app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada.', path: req.path });
});

// ── Error handler ─────────────────────────────────────

app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message);
    res.status(500).json({ error: 'Error interno del servidor.' });
});

// ── Arrancar ──────────────────────────────────────────

server.listen(PORT, () => {
    console.log(`\n🚀 Terminal Buses Bolivia — Servidor Express`);
    console.log(`   Puerto: http://localhost:${PORT}`);
    console.log(`   WebSocket: ws://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health\n`);
});

module.exports = { app, server };
