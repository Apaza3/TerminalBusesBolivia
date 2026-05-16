require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');

const app = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ────────────────────────────────────────────────────────────────

const origenesPermitidos = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',');

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || origenesPermitidos.includes(origin)) return callback(null, true);
        callback(new Error('CORS: origen no permitido'));
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));  // 10mb para fotos base64

// ── WebSocket ─────────────────────────────────────────────────────────────────

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const wsClientes = new Set();

wss.on('connection', (ws) => {
    wsClientes.add(ws);
    ws.canales = new Set();
    console.log(`[WS] Conectado. Total: ${wsClientes.size}`);

    // [Académico] Sprint 4 - Procesar mensajes del cliente (subscribe + events)
    ws.on('message', (raw) => {
        try {
            const msg = JSON.parse(raw.toString());
            if (msg.tipo === 'subscribe' && msg.canal) {
                ws.canales.add(msg.canal);
                return;
            }
            // Relay eventos del conductor al resto de clientes (R20, R26)
            const tiposRelay = ['update_trip_status', 'estado_viaje_actualizado', 'notificacion_anden', 'incidencia_creada', 'mantenimiento_creado'];
            if (tiposRelay.includes(msg.tipo)) {
                const payload = JSON.stringify({ tipo: msg.tipo, payload: msg.payload, ts: Date.now() });
                for (const cliente of wsClientes) {
                    if (cliente !== ws && cliente.readyState === WebSocket.OPEN) {
                        cliente.send(payload);
                    }
                }
            }
        } catch {}
    });

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
app.use('/api/rutas',      require('./rutas/rutas'));
app.use('/api/itinerarios',require('./rutas/itinerarios'));
app.use('/api/sucursales', require('./rutas/sucursales'));

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
