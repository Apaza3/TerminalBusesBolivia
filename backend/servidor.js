require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');

const app = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ────────────────────────────────────────────────────────────────

// gemini: CORS abierto para red local. El celular en la misma WiFi tiene IP 192.168.x.x
// que no está en la lista CORS_ORIGINS del .env, por eso se amplió la regla.
const origenesPermitidos = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
    origin: (origin, callback) => {
        // Permitir sin origin (curl, Postman) y cualquier red local 192.168.x.x / 10.x.x.x
        if (!origin) return callback(null, true);
        const permitido = origenesPermitidos.includes(origin)
            || /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin);
        if (permitido) return callback(null, true);
        callback(new Error('CORS: origen no permitido'));
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));  // 10mb para fotos base64

// ── WebSocket ─────────────────────────────────────────────────────────────────

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const wsClientes = new Set();

wss.on('connection', (ws, req) => {
    wsClientes.add(ws);
    console.log(`[WS] Conectado. Total: ${wsClientes.size}`);

    ws.on('close', () => {
        wsClientes.delete(ws);
        console.log(`[WS] Desconectado. Total: ${wsClientes.size}`);
    });
    ws.on('error', () => wsClientes.delete(ws));
});

// broadcast disponible globalmente via app.locals
app.locals.broadcast = (tipo, data) => {
    const msg = JSON.stringify({ tipo, data, ts: Date.now() });
    for (const cliente of wsClientes) {
        if (cliente.readyState === WebSocket.OPEN) cliente.send(msg);
    }
};

// ── Rutas ─────────────────────────────────────────────────────────────────────

app.use('/api/auth',       require('./rutas/auth'));
app.use('/api/viajes',     require('./rutas/viajes'));
app.use('/api/asientos',   require('./rutas/asientos'));
app.use('/api/reservas',   require('./rutas/reservas'));
app.use('/api/pagos',      require('./rutas/pagos'));
app.use('/api/buses',      require('./rutas/buses'));
app.use('/api/encomiendas', require('./rutas/encomiendas'));
app.use('/api/admin',      require('./rutas/admin'));
app.use('/api/conductor',  require('./rutas/conductor'));

// gemini: store en memoria para tokens QR de pago móvil.
// Permite que el celular (POST) y la PC (GET + polling) compartan el estado
// sin depender del localStorage del navegador.
const qrTokens = new Map();

// gemini: ruta FIJA primero, antes de la dinámica /:token
// Si se invierte el orden, Express interpretaría "registrar" como un token.
app.post('/api/qr/registrar', (req, res) => {
    const { token, monto, origen, destino, fecha } = req.body;
    if (!token) return res.status(400).json({ error: 'token requerido' });
    qrTokens.set(token, { estado: 'pendiente', monto, origen, destino, fecha, creadoEn: new Date().toISOString() });
    res.json({ ok: true, token });
});

app.get('/api/qr/:token', (req, res) => {
    const data = qrTokens.get(req.params.token);
    if (!data) return res.status(404).json({ estado: 'no_encontrado' });
    res.json(data);
});

app.post('/api/qr/:token', (req, res) => {
    const { estado, monto, origen, destino } = req.body;
    const entry = { estado, monto, origen, destino, actualizadoEn: new Date().toISOString() };
    qrTokens.set(req.params.token, entry);
    // Notificar a todos los clientes WS conectados (ej. escritorio esperando el pago)
    app.locals.broadcast('qr_pago', { token: req.params.token, ...entry });
    res.json({ ok: true, ...entry });
});

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '3.0.0',
        timestamp: new Date().toISOString(),
        ws_clientes: wsClientes.size,
        supabase: !!process.env.SUPABASE_URL
    });
});

// ── 404 / Error ───────────────────────────────────────────────────────────────

app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada.', ruta: req.path });
});

app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message);
    res.status(500).json({ error: 'Error interno del servidor.' });
});

// ── Iniciar ───────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
    console.log('\n🚌 Terminal Buses Bolivia — Backend v3.0');
    console.log(`   API:       http://localhost:${PORT}`);
    console.log(`   WebSocket: ws://localhost:${PORT}`);
    console.log(`   Health:    http://localhost:${PORT}/health`);
    console.log(`   Supabase:  ${process.env.SUPABASE_URL ? '✅ configurado' : '❌ falta SUPABASE_URL'}\n`);
});

module.exports = { app, server };
