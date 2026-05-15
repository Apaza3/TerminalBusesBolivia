import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import { useAuth } from '../contextos/AuthContext';
import { useDepartamento } from '../contextos/DepartamentoContext';
import { useToast } from '../componentes/ToastNotifications';
import { obtenerCliente } from '../data/mockClientDB';
import {
    crearReserva,
    obtenerReservas,
    obtenerAsientosPendientes,
    marcarAsientosPendientes,
    liberarAsientosBloqueados,
    liberarAsientosExpirados,
    crearBoletos,
    crearTokenQR,
    obtenerEstadoQR,
    actualizarEstadoQR,
    crearReservaConEstado,
} from '../data/mockStorage';
import '../estilos/escritorio/mapa-asientos.css';

// ─── Seat layout constants ────────────────────────────
const COLS = ['A', 'B', 'pasillo', 'C', 'D'];
const FILAS_PISO1 = Array.from({ length: 8 }, (_, i) => i + 1);   // 1-8  → 32 seats
const FILAS_PISO2 = Array.from({ length: 12 }, (_, i) => i + 1);  // 1-12 → 48 seats

const buildSeatId = (piso, fila, col) => `${piso}-${fila}${col}`;

// ─── Pulse keyframes injected once ───────────────────
const PULSE_STYLE = `
@keyframes tbb-pulse-border {
  0%,100% { border-color: #7c3aed; box-shadow: 0 0 0 0 rgba(124,58,237,0.5); }
  50%      { border-color: #f59e0b; box-shadow: 0 0 0 4px rgba(245,158,11,0.25); }
}
@keyframes tbb-card-flip {
  0%   { transform: rotateY(0deg); }
  100% { transform: rotateY(180deg); }
}
.tbb-bloqueado-anim {
  animation: tbb-pulse-border 0.8s infinite;
  border: 2px solid #7c3aed !important;
  background: rgba(124,58,237,0.2) !important;
  cursor: not-allowed !important;
}
.tbb-seleccionado {
  border: 2px solid #3b82f6 !important;
  background: rgba(59,130,246,0.3) !important;
}
.tbb-ocupado {
  background: rgba(127,29,29,0.7) !important;
  border: 1px solid #991b1b !important;
  cursor: not-allowed !important;
  color: #7f1d1d !important;
}
.tbb-disponible {
  background: rgba(51,65,85,0.6) !important;
  border: 1px solid #475569 !important;
  cursor: pointer !important;
}
.tbb-disponible:hover {
  border-color: #60a5fa !important;
  background: rgba(59,130,246,0.15) !important;
}
`;

// ─── helpers ─────────────────────────────────────────
const pad2 = (n) => String(n).padStart(2, '0');

const formatCountdown = (ms) => {
    if (ms <= 0) return '00:00';
    const total = Math.floor(ms / 1000);
    return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
};

const formatFecha = (iso) => {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('es-BO', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch { return iso; }
};

// ─── Bus SVG silhouette ───────────────────────────────
const BusSilhouette = ({ pisos, onSelectPiso }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <svg width="260" height={pisos >= 2 ? 160 : 100} viewBox={`0 0 260 ${pisos >= 2 ? 160 : 100}`} style={{ filter: 'drop-shadow(0 4px 16px rgba(59,130,246,0.3))' }}>
            {/* Main body */}
            <rect x="10" y={pisos >= 2 ? 20 : 10} width="240" height={pisos >= 2 ? 130 : 80} rx="18" fill="#0d1a2e" stroke="#3b82f6" strokeWidth="2" />
            {/* Wheels */}
            <circle cx="55" cy={pisos >= 2 ? 155 : 95} r="14" fill="#1e293b" stroke="#475569" strokeWidth="2" />
            <circle cx="55" cy={pisos >= 2 ? 155 : 95} r="6" fill="#334155" />
            <circle cx="195" cy={pisos >= 2 ? 155 : 95} r="14" fill="#1e293b" stroke="#475569" strokeWidth="2" />
            <circle cx="195" cy={pisos >= 2 ? 155 : 95} r="6" fill="#334155" />
            {/* Front windshield */}
            <rect x="215" y={pisos >= 2 ? 30 : 18} width="28" height={pisos >= 2 ? 50 : 35} rx="6" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1.5" />
            {/* Windows row 1 */}
            {[40, 75, 110, 145, 175].map((x, i) => (
                <rect key={i} x={x} y={pisos >= 2 ? 30 : 18} width="26" height={pisos >= 2 ? 28 : 22} rx="4" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1" />
            ))}
            {/* Windows row 2 (double decker) */}
            {pisos >= 2 && [40, 75, 110, 145, 175].map((x, i) => (
                <rect key={i} x={x} y="68" width="26" height="28" rx="4" fill="#1a2d4a" stroke="#60a5fa" strokeWidth="1" />
            ))}
            {/* Door */}
            <rect x="16" y={pisos >= 2 ? 100 : 40} width="18" height={pisos >= 2 ? 48 : 38} rx="4" fill="#1e293b" stroke="#3b82f6" strokeWidth="1.5" />
            {/* Deck divider (double decker) */}
            {pisos >= 2 && <line x1="10" y1="66" x2="250" y2="66" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="6,4" />}
            {/* Labels */}
            {pisos >= 2 && (
                <>
                    <text x="130" y="52" textAnchor="middle" fill="#93c5fd" fontSize="11" fontWeight="bold">PISO 2</text>
                    <text x="130" y="115" textAnchor="middle" fill="#93c5fd" fontSize="11" fontWeight="bold">PISO 1</text>
                </>
            )}
            {pisos < 2 && (
                <text x="130" y="62" textAnchor="middle" fill="#93c5fd" fontSize="12" fontWeight="bold">BUS</text>
            )}
        </svg>

        {pisos >= 2 ? (
            <div style={{ display: 'flex', gap: '1rem' }}>
                {[2, 1].map(p => (
                    <button key={p} onClick={() => onSelectPiso(p)} style={{
                        padding: '0.75rem 2rem', borderRadius: '12px', border: '2px solid #3b82f6',
                        background: 'rgba(59,130,246,0.15)', color: '#93c5fd', fontWeight: 700,
                        fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s',
                    }}>
                        {p === 2 ? 'Piso 2 (Superior)' : 'Piso 1 (Inferior)'}
                    </button>
                ))}
            </div>
        ) : (
            <button onClick={() => onSelectPiso(1)} style={{
                padding: '0.75rem 2.5rem', borderRadius: '12px', border: '2px solid #3b82f6',
                background: 'rgba(59,130,246,0.2)', color: '#93c5fd', fontWeight: 700,
                fontSize: '1rem', cursor: 'pointer',
            }}>
                Ver Asientos
            </button>
        )}
    </div>
);

// ─── Seat map ─────────────────────────────────────────
const MapGrid = ({ piso, reservados, bloqueados, seleccionados, onToggle }) => {
    const filas = piso === 2 ? FILAS_PISO2 : FILAS_PISO1;

    return (
        <div style={{ display: 'inline-block', background: '#0d1a2e', borderRadius: '16px', padding: '1.25rem', border: '1px solid #1e3a5f' }}>
            {/* Column headers */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem', paddingLeft: '2rem' }}>
                {COLS.map(c => (
                    <div key={c} style={{ width: c === 'pasillo' ? '20px' : '40px', textAlign: 'center', color: '#64748b', fontSize: '0.7rem', fontWeight: 700 }}>
                        {c !== 'pasillo' ? c : ''}
                    </div>
                ))}
            </div>

            {filas.map(fila => (
                <div key={fila} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.35rem', alignItems: 'center' }}>
                    {/* Row number */}
                    <div style={{ width: '1.6rem', color: '#475569', fontSize: '0.7rem', textAlign: 'right', marginRight: '0.2rem' }}>{fila}</div>
                    {COLS.map(col => {
                        if (col === 'pasillo') return <div key="pasillo" style={{ width: '20px' }} />;
                        const id = buildSeatId(piso, fila, col);
                        const ocupado = reservados.includes(id);
                        const bloqueado = bloqueados.includes(id);
                        const selec = seleccionados.includes(id);
                        let cls = 'tbb-disponible';
                        if (ocupado) cls = 'tbb-ocupado';
                        else if (bloqueado) cls = 'tbb-bloqueado-anim';
                        else if (selec) cls = 'tbb-seleccionado';
                        return (
                            <button
                                key={col}
                                className={cls}
                                onClick={() => onToggle(id)}
                                disabled={ocupado || bloqueado}
                                title={bloqueado ? 'Bloqueado por otro usuario' : ocupado ? 'Ocupado' : id}
                                style={{
                                    width: '40px', height: '36px', borderRadius: '7px',
                                    fontSize: '0.62rem', fontWeight: 600, color: '#e2e8f0',
                                    transition: 'all 0.15s', border: '1px solid transparent',
                                }}
                            >
                                {fila}{col}
                            </button>
                        );
                    })}
                </div>
            ))}

            {/* Driver row */}
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #1e3a5f', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>🚪 Puerta</span>
                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>Conductor 🔘</span>
            </div>
        </div>
    );
};

// ─── Tarjeta animada (tarjeta crédito) ───────────────
const TarjetaForm = ({ onConfirm, onCancelar, monto }) => {
    const [numero, setNumero] = useState('');
    const [nombre, setNombre] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [flipped, setFlipped] = useState(false);

    const fmt = (v, max, sep) => {
        const d = v.replace(/\D/g, '').slice(0, max);
        return sep ? d.replace(new RegExp(`(.{${sep}})(?=.)`, 'g'), '$1 ') : d;
    };
    const fmtExpiry = (v) => {
        const d = v.replace(/\D/g, '').slice(0, 4);
        return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
    };

    const cardStyle = {
        width: '320px', height: '190px', borderRadius: '16px', padding: '1.5rem',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #0d1a2e 100%)',
        border: '1px solid #3b82f6', color: '#f1f5f9', position: 'relative',
        boxShadow: '0 8px 32px rgba(59,130,246,0.3)', margin: '0 auto 1.5rem',
        userSelect: 'none',
    };

    return (
        <div style={{ maxWidth: '420px', margin: '0 auto' }}>
            {/* Visual card */}
            <div style={cardStyle}>
                <div style={{ fontSize: '0.7rem', color: '#60a5fa', marginBottom: '1.5rem', letterSpacing: '2px' }}>TARJETA DE CRÉDITO / DÉBITO</div>
                <div style={{ fontFamily: 'monospace', fontSize: '1.2rem', letterSpacing: '4px', marginBottom: '1rem', color: '#e2e8f0' }}>
                    {(numero || '•••• •••• •••• ••••').padEnd(19, ' ').replace(/(.{4})/g, '$1 ').trim()}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontSize: '0.6rem', color: '#64748b' }}>TITULAR</div>
                        <div style={{ fontSize: '0.85rem' }}>{nombre || 'NOMBRE APELLIDO'}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.6rem', color: '#64748b' }}>VENCE</div>
                        <div style={{ fontSize: '0.85rem' }}>{expiry || 'MM/AA'}</div>
                    </div>
                    <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
                        <div style={{ width: '40px', height: '26px', borderRadius: '4px', background: '#f59e0b' }} />
                    </div>
                </div>
                {flipped && (
                    <div style={{ position: 'absolute', bottom: '1.2rem', right: '1.5rem', background: '#0f172a', padding: '0.3rem 0.7rem', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {cvv || '•••'}
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                    <label style={lbl}>Número de tarjeta</label>
                    <input value={numero} onChange={e => setNumero(fmt(e.target.value, 16, 4))}
                        placeholder="0000 0000 0000 0000" maxLength={19}
                        style={inp} />
                </div>
                <div>
                    <label style={lbl}>Nombre en la tarjeta</label>
                    <input value={nombre} onChange={e => setNombre(e.target.value.toUpperCase())}
                        placeholder="NOMBRE APELLIDO" style={inp} />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ flex: 1 }}>
                        <label style={lbl}>Vencimiento</label>
                        <input value={expiry} onChange={e => setExpiry(fmtExpiry(e.target.value))}
                            placeholder="MM/AA" maxLength={5} style={inp} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={lbl}>CVV</label>
                        <input value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            onFocus={() => setFlipped(true)} onBlur={() => setFlipped(false)}
                            placeholder="•••" maxLength={4} style={inp} type="password" />
                    </div>
                </div>
                <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid #1e3a5f', borderRadius: '10px', padding: '0.75rem', textAlign: 'center', color: '#93c5fd', fontSize: '0.9rem' }}>
                    Total a cobrar: <strong style={{ color: '#60a5fa', fontSize: '1.1rem' }}>Bs {monto}</strong>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={onCancelar} style={btnSecundario}>← Cancelar</button>
                    <button onClick={() => {
                        if (!numero || !nombre || !expiry || !cvv) return;
                        onConfirm('tarjeta');
                    }} style={{ ...btnPrimario, flex: 2 }}>
                        Pagar con Tarjeta
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Common button/input styles ───────────────────────
const lbl = { display: 'block', color: '#94a3b8', fontSize: '0.78rem', marginBottom: '0.3rem' };
const inp = {
    width: '100%', boxSizing: 'border-box', background: '#071827',
    border: '1px solid #1e3a5f', color: '#f1f5f9', padding: '0.7rem 0.85rem',
    borderRadius: '9px', fontSize: '0.9rem', outline: 'none',
};
const btnPrimario = {
    flex: 1, padding: '0.85rem', background: '#2563eb', color: 'white',
    border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem',
};
const btnSecundario = {
    flex: 1, padding: '0.85rem', background: 'transparent',
    border: '1px solid #334155', color: '#94a3b8', borderRadius: '10px', cursor: 'pointer',
};

// ─── Ticket card ─────────────────────────────────────
const TicketCard = ({ boleto }) => {
    const hasBadge = boleto.esInfante || boleto.lleva1000 || boleto.llevaAnimales || boleto.llevaProductos;
    return (
        <div style={{
            background: '#0d1a2e', border: '2px dashed #1e3a5f', borderRadius: '16px',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
            {/* Header stripe */}
            <div style={{ background: 'linear-gradient(90deg, #1e3a5f 0%, #0f2744 100%)', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#60a5fa', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '1px' }}>TBB BOLETO</span>
                {hasBadge && (
                    <span style={{ background: '#f59e0b', color: '#000', fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                        {boleto.esInfante ? 'INFANTE' : boleto.lleva1000 ? 'DECLARADO' : boleto.llevaAnimales ? 'ANIMAL' : 'PRODUCTO'}
                    </span>
                )}
            </div>

            {/* Perforation */}
            <div style={{ height: '1px', background: 'repeating-linear-gradient(90deg, transparent, transparent 6px, #1e3a5f 6px, #1e3a5f 12px)' }} />

            <div style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                {/* Info */}
                <div style={{ flex: 1 }}>
                    <div style={{ color: '#93c5fd', fontSize: '0.75rem', marginBottom: '0.2rem' }}>RUTA</div>
                    <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '1rem', marginBottom: '0.6rem' }}>
                        {boleto.origen} → {boleto.destino}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.78rem' }}>
                        <div>
                            <div style={{ color: '#64748b' }}>PASAJERO</div>
                            <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{boleto.pasajeroNombre}</div>
                        </div>
                        <div>
                            <div style={{ color: '#64748b' }}>CI</div>
                            <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{boleto.pasajeroCI}</div>
                        </div>
                        <div>
                            <div style={{ color: '#64748b' }}>ASIENTO</div>
                            <div style={{ color: '#60a5fa', fontWeight: 800, fontSize: '1rem' }}>{boleto.asiento}</div>
                        </div>
                        <div>
                            <div style={{ color: '#64748b' }}>PRECIO</div>
                            <div style={{ color: '#10b981', fontWeight: 700 }}>Bs {boleto.precio}</div>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ color: '#64748b' }}>SALIDA</div>
                            <div style={{ color: '#e2e8f0' }}>{formatFecha(boleto.fechaSalida)}</div>
                        </div>
                    </div>
                </div>

                {/* QR */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                    <div style={{ background: 'white', padding: '6px', borderRadius: '8px' }}>
                        <QRCodeSVG value={boleto.id} size={80} />
                    </div>
                    <div style={{ color: '#475569', fontSize: '0.55rem', textAlign: 'center', maxWidth: '90px', wordBreak: 'break-all' }}>{boleto.id}</div>
                </div>
            </div>

            {/* Perforation bottom */}
            <div style={{ height: '1px', background: 'repeating-linear-gradient(90deg, transparent, transparent 6px, #1e3a5f 6px, #1e3a5f 12px)', margin: '0 0 0.5rem' }} />
            <div style={{ padding: '0.4rem 1rem', color: '#475569', fontSize: '0.65rem', textAlign: 'center' }}>
                BUS {boleto.busPlaca} · Válido solo para la fecha indicada
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════
const MapaAsientos = () => {
    const { viajeId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { sesion, perfil } = useAuth();
    const { tema } = useDepartamento();
    const toast = useToast();

    // Viaje data from router state
    const viaje = location.state?.viaje || null;
    const pisos = viaje?.pisos || 2; // Default 2 for testing
    const precioPorAsiento = viaje?.precio || 45;
    const origenViaje = viaje?.origen || 'La Paz';
    const destinoViaje = viaje?.destino || 'Cochabamba';
    const fechaSalidaViaje = viaje?.salida || viaje?.fechaSalida || new Date().toISOString();

    // ── Steps: silueta → mapa → formulario → pago → ticket
    const [paso, setPaso] = useState('silueta');
    const [pisoSeleccionado, setPisoSeleccionado] = useState(1);

    // ── Seat state
    const [cargando, setCargando] = useState(true);
    const [asientosReservados, setAsientosReservados] = useState([]);
    const [asientosBloqueados, setAsientosBloqueados] = useState([]);
    const [asientosSeleccionados, setAsientosSeleccionados] = useState([]);

    // ── Form state
    const [datosPasajeros, setDatosPasajeros] = useState({});
    const [requiereDocumentos, setRequiereDocumentos] = useState(false);
    const [pdfGenerado, setPdfGenerado] = useState(false);

    // ── Payment state
    const [metodoPago, setMetodoPago] = useState(null);
    const [qrToken, setQrToken] = useState(null);
    const [pollingQr, setPollingQr] = useState(false);
    const [efectivoExpira, setEfectivoExpira] = useState(null);
    const [tiempoRestante, setTiempoRestante] = useState(null);
    const [procesandoPago, setProcesandoPago] = useState(false);

    // ── Ticket state
    const [reservaGenerada, setReservaGenerada] = useState(null);
    const [boletos, setBoletos] = useState([]);

    // Refs for intervals
    const pollingRef = useRef(null);
    const countdownRef = useRef(null);
    const seatPollRef = useRef(null);

    // ── Inject pulse CSS once ─────────────────────────
    useEffect(() => {
        if (!document.getElementById('tbb-pulse-css')) {
            const el = document.createElement('style');
            el.id = 'tbb-pulse-css';
            el.textContent = PULSE_STYLE;
            document.head.appendChild(el);
        }
    }, []);

    // ── Load seat state & poll every 3s ──────────────
    const cargarAsientos = useCallback(() => {
        liberarAsientosExpirados();
        const reservas = obtenerReservas(viajeId);
        const ocupados = reservas
            .filter(r => r.estado === 'confirmada' || r.estado === 'pendiente_efectivo' || r.estado === 'pendiente_documentos')
            .flatMap(r => r.asientos);
        setAsientosReservados(ocupados);

        const pendientes = obtenerAsientosPendientes(viajeId);
        const ahora = Date.now();
        const bloqueados = pendientes
            .filter(p => p.expiraEn > ahora)
            .map(p => p.asiento)
            .filter(a => !asientosSeleccionados.includes(a));
        setAsientosBloqueados(bloqueados);
    }, [viajeId, asientosSeleccionados]);

    useEffect(() => {
        setTimeout(() => setCargando(false), 400);
        cargarAsientos();
        seatPollRef.current = setInterval(cargarAsientos, 3000);
        return () => {
            clearInterval(seatPollRef.current);
            clearInterval(pollingRef.current);
            clearInterval(countdownRef.current);
        };
    }, [viajeId]); // eslint-disable-line

    // ── Restore pending seats from sessionStorage after login redirect ──
    useEffect(() => {
        if (!sesion) return;
        const raw = sessionStorage.getItem('tbb_pending_seats');
        if (!raw) return;
        try {
            const pending = JSON.parse(raw);
            if (pending && pending.viajeId === viajeId) {
                setAsientosSeleccionados(pending.asientosSeleccionados || []);
                setPisoSeleccionado(pending.piso || 1);
                sessionStorage.removeItem('tbb_pending_seats');
                setPaso('formulario');
                // Init form with perfil
                const seats = pending.asientosSeleccionados || [];
                const initial = {};
                seats.forEach((seat, i) => {
                    initial[seat] = i === 0 && perfil ? {
                        nombre: perfil.nombreCompleto || perfil.nombre_completo || '',
                        ci: perfil.ci || '',
                        telefono: perfil.telefono || '',
                        esInfante: false, lleva1000: false, llevaAnimales: false, llevaProductos: false,
                    } : { nombre: '', ci: '', telefono: '', esInfante: false, lleva1000: false, llevaAnimales: false, llevaProductos: false };
                });
                setDatosPasajeros(initial);
                marcarAsientosPendientes(viajeId, seats);
            }
        } catch { sessionStorage.removeItem('tbb_pending_seats'); }
    }, [sesion]); // eslint-disable-line

    // ── QR polling ────────────────────────────────────
    useEffect(() => {
        if (!pollingQr || !qrToken) return;
        pollingRef.current = setInterval(() => {
            const estado = obtenerEstadoQR(qrToken);
            if (estado?.estado === 'pagado') {
                clearInterval(pollingRef.current);
                setPollingQr(false);
                finalizarReserva('qr');
            }
        }, 2000);
        return () => clearInterval(pollingRef.current);
    }, [pollingQr, qrToken]); // eslint-disable-line

    // ── Efectivo countdown ────────────────────────────
    useEffect(() => {
        if (!efectivoExpira) return;
        const tick = () => {
            const diff = efectivoExpira - Date.now();
            setTiempoRestante(diff > 0 ? diff : 0);
            if (diff <= 0) clearInterval(countdownRef.current);
        };
        tick();
        countdownRef.current = setInterval(tick, 1000);
        return () => clearInterval(countdownRef.current);
    }, [efectivoExpira]);

    // ── Step transitions ──────────────────────────────

    const handleSelectPiso = (p) => {
        setPisoSeleccionado(p);
        setPaso('mapa');
    };

    const toggleAsiento = (id) => {
        if (asientosReservados.includes(id)) return;
        if (asientosBloqueados.includes(id)) {
            toast.mostrar('Este asiento está temporalmente bloqueado por otro usuario.', 'alerta');
            return;
        }
        setAsientosSeleccionados(prev =>
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        );
    };

    const handleContinuarMapa = () => {
        if (asientosSeleccionados.length === 0) {
            toast.mostrar('Seleccione al menos un asiento.', 'alerta');
            return;
        }
        if (!sesion || perfil?.rol !== 'cliente') {
            // Save state and redirect
            sessionStorage.setItem('tbb_pending_seats', JSON.stringify({
                viajeId,
                asientosSeleccionados,
                piso: pisoSeleccionado,
            }));
            toast.mostrar('Debe iniciar sesión como cliente para continuar.', 'info');
            setTimeout(() => navigate(`/login-cliente?redirect=/reserva/${viajeId}`), 1200);
            return;
        }
        marcarAsientosPendientes(viajeId, asientosSeleccionados);

        const initial = {};
        asientosSeleccionados.forEach((seat, i) => {
            initial[seat] = i === 0 && perfil ? {
                nombre: perfil.nombreCompleto || perfil.nombre_completo || '',
                ci: perfil.ci || '',
                telefono: perfil.telefono || '',
                esInfante: false, lleva1000: false, llevaAnimales: false, llevaProductos: false,
            } : { nombre: '', ci: '', telefono: '', esInfante: false, lleva1000: false, llevaAnimales: false, llevaProductos: false };
        });
        setDatosPasajeros(initial);
        setPaso('formulario');
    };

    const handleCIChange = (seat, ci) => {
        setDatosPasajeros(prev => ({ ...prev, [seat]: { ...prev[seat], ci } }));
        if (ci.length >= 5) {
            const cliente = obtenerCliente(ci);
            if (cliente) {
                setDatosPasajeros(prev => ({
                    ...prev,
                    [seat]: {
                        ...prev[seat], ci,
                        nombre: cliente.nombreCompleto || prev[seat].nombre,
                        telefono: cliente.telefono || prev[seat].telefono,
                    },
                }));
                toast.mostrar(`Datos de ${cliente.nombreCompleto} cargados.`, 'info');
            }
        }
    };

    const handlePasajeroChange = (seat, field, value) => {
        setDatosPasajeros(prev => ({ ...prev, [seat]: { ...prev[seat], [field]: value } }));
    };

    const hayDeclaraciones = () => {
        return Object.values(datosPasajeros).some(d => d.lleva1000 || d.llevaAnimales || d.llevaProductos);
    };

    const hayInfante = () => Object.values(datosPasajeros).some(d => d.esInfante);

    const generarPDFDeclaracion = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Declaración Jurada de Equipaje y Bienes', 20, 20);
        doc.setFontSize(11);
        doc.text(`Viaje: ${origenViaje} → ${destinoViaje}`, 20, 35);
        doc.text(`Fecha de salida: ${formatFecha(fechaSalidaViaje)}`, 20, 43);
        doc.line(20, 48, 190, 48);

        let y = 58;
        Object.entries(datosPasajeros).forEach(([seat, datos]) => {
            if (datos.lleva1000 || datos.llevaAnimales || datos.llevaProductos) {
                doc.setFontSize(12);
                doc.text(`Pasajero: ${datos.nombre} — CI: ${datos.ci} — Asiento: ${seat}`, 20, y);
                y += 8;
                doc.setFontSize(10);
                if (datos.lleva1000) { doc.text('  ☐ Declara llevar más de $1,000 en efectivo', 20, y); y += 7; }
                if (datos.llevaAnimales) { doc.text('  ☐ Declara llevar animales', 20, y); y += 7; }
                if (datos.llevaProductos) { doc.text('  ☐ Declara llevar productos por más de $1,000', 20, y); y += 7; }
                y += 4;
            }
        });

        doc.setFontSize(10);
        doc.text('El pasajero declara voluntariamente los bienes listados y acepta las condiciones', 20, y + 10);
        doc.text('de transporte establecidas por la empresa.', 20, y + 18);
        doc.text('Firma: ________________________   Fecha: ________________________', 20, y + 35);
        doc.save('declaracion-tbb.pdf');
        setPdfGenerado(true);
        toast.mostrar('PDF de declaración descargado.', 'exito');
    };

    const handleConfirmarFormulario = (e) => {
        e.preventDefault();
        for (const [seat, datos] of Object.entries(datosPasajeros)) {
            if (!datos.nombre || !datos.ci) {
                toast.mostrar(`Complete nombre y CI para el asiento ${seat}.`, 'alerta');
                return;
            }
        }
        const compradorSeat = asientosSeleccionados[0];
        if (!datosPasajeros[compradorSeat]?.telefono) {
            toast.mostrar('El comprador debe ingresar su teléfono.', 'alerta');
            return;
        }
        if (hayDeclaraciones() && !pdfGenerado) {
            toast.mostrar('Debe descargar el PDF de declaración antes de continuar.', 'alerta');
            return;
        }
        setRequiereDocumentos(hayDeclaraciones() || hayInfante());
        setPaso('pago');
    };

    const buildReservaData = (metodo) => {
        const compradorSeat = asientosSeleccionados[0];
        const comprador = datosPasajeros[compradorSeat];
        return {
            viajeId,
            pasajeroNombre: comprador.nombre,
            pasajeroCI: comprador.ci,
            pasajeroTelefono: comprador.telefono,
            asientos: asientosSeleccionados,
            busPlaca: viaje?.busPlaca || 'ABC-1234',
            origen: origenViaje,
            destino: destinoViaje,
            precio: asientosSeleccionados.length * precioPorAsiento,
            fechaSalida: fechaSalidaViaje,
            pasajeros: datosPasajeros,
            metodoPago: metodo,
        };
    };

    const finalizarReserva = (metodo) => {
        setProcesandoPago(true);
        const datos = buildReservaData(metodo);
        const resultado = crearReserva(datos);
        if (resultado.error) {
            toast.mostrar(resultado.mensaje, 'error');
            setProcesandoPago(false);
            setPaso('mapa');
            return;
        }
        const bs = crearBoletos(resultado, datosPasajeros);
        setReservaGenerada(resultado);
        setBoletos(bs);
        setProcesandoPago(false);
        toast.mostrar('¡Reserva confirmada exitosamente!', 'exito');
        setPaso('ticket');
    };

    const handleEfectivo = () => {
        const datos = buildReservaData('efectivo');
        const resultado = crearReservaConEstado(datos, 'pendiente_efectivo');
        if (resultado.error) {
            toast.mostrar(resultado.mensaje, 'error');
            return;
        }
        setReservaGenerada(resultado);
        setEfectivoExpira(Date.now() + 3 * 60 * 1000); // 3 min timer
        setMetodoPago('efectivo');
    };

    const handleQR = () => {
        const datos = buildReservaData('qr');
        const token = crearTokenQR(datos);
        setQrToken(token);
        setMetodoPago('qr');
        setPollingQr(true);
    };

    const simularPagoQR = () => {
        if (!qrToken) return;
        actualizarEstadoQR(qrToken, 'pagado');
        toast.mostrar('Pago QR simulado confirmado.', 'exito');
    };

    const handleDownloadPDF = () => {
        if (!boletos.length) return;
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text('Terminal Buses Bolivia — Boletos', 20, 20);
        doc.setFontSize(12);
        doc.text(`Reserva: ${reservaGenerada?.id}`, 20, 32);
        doc.text(`Ruta: ${origenViaje} → ${destinoViaje}`, 20, 40);
        doc.text(`Salida: ${formatFecha(fechaSalidaViaje)}`, 20, 48);
        doc.line(20, 54, 190, 54);

        let y = 64;
        boletos.forEach((boleto, i) => {
            doc.setFontSize(13);
            doc.text(`Boleto ${i + 1}: Asiento ${boleto.asiento}`, 20, y);
            y += 8;
            doc.setFontSize(10);
            doc.text(`Pasajero: ${boleto.pasajeroNombre}  CI: ${boleto.pasajeroCI}`, 20, y);
            y += 7;
            doc.text(`Precio: Bs ${boleto.precio}  ID: ${boleto.id}`, 20, y);
            y += 7;
            if (boleto.esInfante) { doc.text('* INFANTE — requiere validación presencial', 20, y); y += 7; }
            if (boleto.lleva1000 || boleto.llevaAnimales || boleto.llevaProductos) {
                doc.text('* DECLARACIÓN presentada — requiere validación presencial', 20, y); y += 7;
            }
            y += 5;
            if (y > 260) { doc.addPage(); y = 20; }
        });
        doc.save(`boletos-${reservaGenerada?.id}.pdf`);
    };

    // ── Progress bar ─────────────────────────────────
    const PASOS_LABELS = ['Piso', 'Asientos', 'Datos', 'Pago', 'Boletos'];
    const PASOS_KEYS = ['silueta', 'mapa', 'formulario', 'pago', 'ticket'];
    const pasoIdx = PASOS_KEYS.indexOf(paso);

    const totalMonto = asientosSeleccionados.length * precioPorAsiento;

    // ── Render ────────────────────────────────────────
    return (
        <div style={{ background: '#07111f', minHeight: '100vh', color: '#f1f5f9', padding: '1.25rem' }}>

            <div style={{ maxWidth: '900px', margin: '0 auto' }}>

                {/* Back button */}
                <button onClick={() => navigate(-1)} style={{
                    background: 'transparent', border: '1px solid #1e3a5f', color: '#64748b',
                    padding: '0.45rem 0.9rem', borderRadius: '8px', cursor: 'pointer', marginBottom: '1.25rem',
                    fontSize: '0.85rem',
                }}>
                    ← Volver
                </button>

                {/* Route header */}
                <div style={{ background: '#0d1a2e', borderRadius: '14px', padding: '1rem 1.25rem', marginBottom: '1.25rem', border: '1px solid #1e3a5f', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                        <div style={{ color: '#93c5fd', fontWeight: 800, fontSize: '1.1rem' }}>
                            {origenViaje} <span style={{ color: tema.acento }}>→</span> {destinoViaje}
                        </div>
                        <div style={{ color: '#475569', fontSize: '0.8rem' }}>{formatFecha(fechaSalidaViaje)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#10b981', fontWeight: 700, fontSize: '1rem' }}>Bs {precioPorAsiento} / asiento</div>
                        <div style={{ color: '#475569', fontSize: '0.75rem' }}>ID: {viajeId}</div>
                    </div>
                </div>

                {/* Progress bar */}
                <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1.5rem' }}>
                    {PASOS_LABELS.map((label, i) => {
                        const activo = i <= pasoIdx;
                        const actual = i === pasoIdx;
                        return (
                            <React.Fragment key={label}>
                                <div style={{
                                    flex: 1, padding: '0.5rem 0.25rem', textAlign: 'center',
                                    borderRadius: '8px',
                                    background: actual ? tema.color : activo ? 'rgba(59,130,246,0.2)' : '#0d1a2e',
                                    color: actual ? 'white' : activo ? tema.acento : '#475569',
                                    fontSize: '0.72rem', fontWeight: actual ? 700 : 500,
                                    border: `1px solid ${actual ? tema.color : activo ? '#1e3a5f' : '#0d1a2e'}`,
                                    transition: 'all 0.3s',
                                }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{i + 1}</div>
                                    {label}
                                </div>
                                {i < PASOS_LABELS.length - 1 && (
                                    <div style={{ width: '8px', display: 'flex', alignItems: 'center' }}>
                                        <div style={{ width: '100%', height: '2px', background: i < pasoIdx ? tema.color : '#1e3a5f' }} />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {cargando ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#60a5fa' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
                        Cargando distribución del bus...
                    </div>
                ) : (
                    <>
                        {/* ══ PASO 1: SILUETA ══ */}
                        {paso === 'silueta' && (
                            <div style={{ textAlign: 'center' }}>
                                <h2 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>Selecciona el piso</h2>
                                <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '0.9rem' }}>
                                    {pisos >= 2 ? 'Este bus tiene 2 pisos. Elige desde dónde quieres viajar.' : 'Bus de 1 piso — ver mapa de asientos.'}
                                </p>
                                <BusSilhouette pisos={pisos} onSelectPiso={handleSelectPiso} />
                            </div>
                        )}

                        {/* ══ PASO 2: MAPA DE ASIENTOS ══ */}
                        {paso === 'mapa' && (
                            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'center' }}>
                                {/* Map area */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                        <h3 style={{ margin: 0, color: '#93c5fd' }}>Piso {pisoSeleccionado}</h3>
                                        {pisos >= 2 && (
                                            <button onClick={() => setPaso('silueta')} style={{
                                                background: 'transparent', border: '1px solid #334155', color: '#64748b',
                                                padding: '0.3rem 0.75rem', borderRadius: '7px', cursor: 'pointer', fontSize: '0.75rem',
                                            }}>
                                                Cambiar piso
                                            </button>
                                        )}
                                    </div>
                                    <MapGrid
                                        piso={pisoSeleccionado}
                                        reservados={asientosReservados}
                                        bloqueados={asientosBloqueados}
                                        seleccionados={asientosSeleccionados}
                                        onToggle={toggleAsiento}
                                    />
                                    {/* Legend */}
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                        {[
                                            { cls: 'tbb-disponible', label: 'Libre' },
                                            { cls: 'tbb-seleccionado', label: 'Tu selección' },
                                            { cls: 'tbb-bloqueado-anim', label: 'Bloqueado' },
                                            { cls: 'tbb-ocupado', label: 'Ocupado' },
                                        ].map(({ cls, label }) => (
                                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                                                <div className={cls} style={{ width: '18px', height: '16px', borderRadius: '4px', flexShrink: 0 }} />
                                                {label}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Summary panel */}
                                <div style={{ background: '#0d1a2e', borderRadius: '14px', padding: '1.25rem', border: '1px solid #1e3a5f', minWidth: '240px', flex: '0 0 240px' }}>
                                    <h3 style={{ margin: '0 0 1rem', color: '#f1f5f9' }}>Resumen</h3>

                                    <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '0.4rem' }}>Asientos seleccionados:</div>
                                    {asientosSeleccionados.length === 0 ? (
                                        <div style={{ color: '#475569', fontSize: '0.85rem', marginBottom: '1rem', fontStyle: 'italic' }}>Ninguno</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '1rem' }}>
                                            {asientosSeleccionados.map(s => (
                                                <span key={s} style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid #3b82f6', color: '#93c5fd', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                                                    {s}
                                                    <button onClick={() => toggleAsiento(s)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginLeft: '0.3rem', padding: 0, fontSize: '0.75rem' }}>×</button>
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div style={{ borderTop: '1px solid #1e3a5f', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Total:</span>
                                        <span style={{ color: '#10b981', fontWeight: 800, fontSize: '1.2rem' }}>Bs {totalMonto}</span>
                                    </div>

                                    <button onClick={handleContinuarMapa}
                                        disabled={asientosSeleccionados.length === 0}
                                        style={{
                                            width: '100%', padding: '0.85rem', border: 'none', borderRadius: '10px',
                                            background: asientosSeleccionados.length > 0 ? tema.color : '#1e293b',
                                            color: asientosSeleccionados.length > 0 ? 'white' : '#475569',
                                            fontWeight: 700, cursor: asientosSeleccionados.length > 0 ? 'pointer' : 'not-allowed',
                                            fontSize: '0.95rem', transition: 'all 0.2s',
                                        }}>
                                        Continuar →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ══ PASO 3: FORMULARIO MULTI-PASAJERO ══ */}
                        {paso === 'formulario' && (
                            <div style={{ maxWidth: '640px', margin: '0 auto' }}>
                                <h2 style={{ marginBottom: '0.25rem', color: '#f1f5f9' }}>Datos de Pasajeros</h2>
                                <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                                    {asientosSeleccionados.length} boleto{asientosSeleccionados.length > 1 ? 's' : ''} — Complete los datos de cada viajero
                                </p>

                                <form onSubmit={handleConfirmarFormulario} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {asientosSeleccionados.map((seat, idx) => {
                                        const datos = datosPasajeros[seat] || {};
                                        const esComprador = idx === 0;
                                        const isInfante = datos.esInfante;
                                        const tieneDeclaracion = datos.lleva1000 || datos.llevaAnimales || datos.llevaProductos;
                                        return (
                                            <div key={seat} style={{
                                                background: isInfante ? 'rgba(245,158,11,0.06)' : '#0d1a2e',
                                                borderRadius: '14px', padding: '1.25rem',
                                                border: `1px solid ${isInfante ? '#78350f' : esComprador ? '#1e3a8a' : '#1e3a5f'}`,
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                        <span style={{
                                                            background: isInfante ? '#f59e0b' : tema.color,
                                                            color: 'white', fontSize: '0.7rem', fontWeight: 700,
                                                            padding: '0.25rem 0.6rem', borderRadius: '6px',
                                                        }}>
                                                            {isInfante ? 'INFANTE' : `ASIENTO ${seat}`}
                                                        </span>
                                                        {esComprador && <span style={{ color: '#10b981', fontSize: '0.7rem', fontWeight: 600 }}>COMPRADOR</span>}
                                                    </div>
                                                    {tieneDeclaracion && <span style={{ color: '#f59e0b', fontSize: '0.7rem' }}>⚠ Declaración requerida</span>}
                                                </div>

                                                {/* CI */}
                                                <div style={{ marginBottom: '0.7rem' }}>
                                                    <label style={lbl}>CI <span style={{ color: '#ef4444' }}>*</span></label>
                                                    <input type="text" value={datos.ci || ''} onChange={e => handleCIChange(seat, e.target.value)}
                                                        placeholder="Ingrese CI para búsqueda automática" style={inp} />
                                                </div>

                                                {/* Name */}
                                                <div style={{ marginBottom: '0.7rem' }}>
                                                    <label style={lbl}>Nombre Completo <span style={{ color: '#ef4444' }}>*</span></label>
                                                    <input type="text" value={datos.nombre || ''} onChange={e => handlePasajeroChange(seat, 'nombre', e.target.value)}
                                                        placeholder="Nombre del pasajero" style={inp} />
                                                </div>

                                                {/* Phone (buyer only) */}
                                                {esComprador && (
                                                    <div style={{ marginBottom: '0.7rem' }}>
                                                        <label style={lbl}>Teléfono / WhatsApp <span style={{ color: '#ef4444' }}>*</span></label>
                                                        <input type="tel" value={datos.telefono || ''} onChange={e => handlePasajeroChange(seat, 'telefono', e.target.value)}
                                                            placeholder="Ej. 67146215" style={inp} />
                                                        <span style={{ fontSize: '0.7rem', color: '#f59e0b' }}>Los boletos se enviarán a este número</span>
                                                    </div>
                                                )}

                                                {/* Infant toggle */}
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.82rem', cursor: 'pointer', marginBottom: '0.5rem' }}>
                                                    <input type="checkbox" checked={isInfante}
                                                        onChange={e => handlePasajeroChange(seat, 'esInfante', e.target.checked)}
                                                        style={{ accentColor: '#f59e0b', width: '16px', height: '16px' }} />
                                                    Este pasajero es un infante (menor de edad)
                                                </label>

                                                {isInfante && (
                                                    <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid #78350f', borderRadius: '10px', padding: '0.75rem', marginBottom: '0.75rem' }}>
                                                        <p style={{ color: '#fbbf24', fontSize: '0.78rem', margin: 0, fontWeight: 600 }}>Validación presencial requerida</p>
                                                        <p style={{ color: '#fcd34d', fontSize: '0.72rem', margin: '0.3rem 0 0' }}>
                                                            El menor debe presentar certificado de nacimiento o CI en sucursal antes del viaje. Sin validación presencial los boletos serán cancelados automáticamente.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Declarations (buyer only) */}
                                                {esComprador && (
                                                    <div style={{ borderTop: '1px solid #1e3a5f', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                                                        <p style={{ color: '#475569', fontSize: '0.72rem', marginBottom: '0.5rem', margin: '0 0 0.5rem' }}>Declaraciones (marque si aplica):</p>
                                                        {[
                                                            { key: 'lleva1000', label: 'Lleva más de $1,000 en efectivo' },
                                                            { key: 'llevaAnimales', label: 'Lleva animales' },
                                                            { key: 'llevaProductos', label: 'Lleva productos por más de $1,000' },
                                                        ].map(d => (
                                                            <label key={d.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer', marginBottom: '0.35rem' }}>
                                                                <input type="checkbox" checked={datos[d.key] || false}
                                                                    onChange={e => handlePasajeroChange(seat, d.key, e.target.checked)}
                                                                    style={{ accentColor: '#ef4444', width: '15px', height: '15px' }} />
                                                                {d.label}
                                                            </label>
                                                        ))}

                                                        {tieneDeclaracion && (
                                                            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid #7f1d1d', borderRadius: '9px', padding: '0.65rem', marginTop: '0.5rem', color: '#fca5a5', fontSize: '0.75rem' }}>
                                                                ⚠ Debe declarar sus pertenencias en sucursal antes del viaje. Descargue y firme el PDF de declaración.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* PDF download button if declarations */}
                                    {hayDeclaraciones() && (
                                        <button type="button" onClick={generarPDFDeclaracion} style={{
                                            padding: '0.75rem', background: pdfGenerado ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                            border: `1px solid ${pdfGenerado ? '#065f46' : '#78350f'}`,
                                            color: pdfGenerado ? '#6ee7b7' : '#fcd34d',
                                            borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                                        }}>
                                            {pdfGenerado ? '✓ PDF de Declaración Descargado' : 'Descargar PDF de Declaración (Requerido)'}
                                        </button>
                                    )}

                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <button type="button" onClick={() => setPaso('mapa')} style={btnSecundario}>← Volver</button>
                                        <button type="submit" style={{ ...btnPrimario, flex: 2, background: '#10b981' }}>
                                            Confirmar datos →
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* ══ PASO 4: PAGO ══ */}
                        {paso === 'pago' && (
                            <div style={{ maxWidth: '520px', margin: '0 auto' }}>
                                <h2 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>Método de Pago</h2>
                                <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                                    Total: <strong style={{ color: '#10b981', fontSize: '1.1rem' }}>Bs {totalMonto}</strong>
                                    &nbsp;— {asientosSeleccionados.length} boleto{asientosSeleccionados.length > 1 ? 's' : ''}
                                </p>

                                {requiereDocumentos && (
                                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #7f1d1d', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', color: '#fca5a5', fontSize: '0.82rem' }}>
                                        <strong>Reserva pendiente de documentación</strong><br />
                                        Su reserva requiere validación presencial en sucursal. Acérquese con el PDF firmado y documentos originales antes de la hora de salida.
                                    </div>
                                )}

                                {/* Payment method selector */}
                                {!metodoPago && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                        {[
                                            { key: 'efectivo', icon: '💵', label: 'Efectivo en Sucursal', desc: 'Reserva por 3 minutos. Paga presencialmente.' },
                                            { key: 'qr', icon: '📱', label: 'Pago QR', desc: 'Escanea el QR con tu app bancaria.' },
                                            { key: 'tarjeta', icon: '💳', label: 'Tarjeta', desc: 'Crédito o débito de forma segura.' },
                                        ].map(m => (
                                            <button key={m.key} onClick={() => {
                                                if (m.key === 'efectivo') handleEfectivo();
                                                else if (m.key === 'qr') handleQR();
                                                else setMetodoPago('tarjeta');
                                            }} style={{
                                                padding: '1rem', background: '#0d1a2e', border: '1px solid #1e3a5f',
                                                borderRadius: '12px', color: '#f1f5f9', cursor: 'pointer',
                                                display: 'flex', alignItems: 'flex-start', gap: '0.75rem', textAlign: 'left',
                                                transition: 'border-color 0.2s',
                                            }}
                                                onMouseEnter={e => e.currentTarget.style.borderColor = tema.color}
                                                onMouseLeave={e => e.currentTarget.style.borderColor = '#1e3a5f'}
                                            >
                                                <span style={{ fontSize: '1.5rem' }}>{m.icon}</span>
                                                <div>
                                                    <div style={{ fontWeight: 700 }}>{m.label}</div>
                                                    <div style={{ color: '#64748b', fontSize: '0.78rem' }}>{m.desc}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Efectivo flow */}
                                {metodoPago === 'efectivo' && (
                                    <div style={{ background: '#0d1a2e', borderRadius: '14px', padding: '1.5rem', border: '1px solid #1e3a5f', textAlign: 'center' }}>
                                        <div style={{ color: '#ef4444', fontSize: '3rem', fontFamily: 'monospace', fontWeight: 800, letterSpacing: '4px', marginBottom: '0.5rem' }}>
                                            {tiempoRestante !== null ? formatCountdown(tiempoRestante) : '03:00'}
                                        </div>
                                        <div style={{ color: '#fca5a5', fontSize: '0.82rem', marginBottom: '1rem' }}>
                                            Tiempo para pagar en sucursal
                                        </div>
                                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #7f1d1d', borderRadius: '10px', padding: '0.75rem', color: '#fca5a5', fontSize: '0.78rem', marginBottom: '1rem' }}>
                                            ⚠ Si no paga dentro del tiempo límite, su reserva será <strong>cancelada automáticamente</strong> y los asientos quedarán disponibles para otros pasajeros.
                                        </div>
                                        <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                                            Reserva ID: <strong style={{ color: '#93c5fd' }}>{reservaGenerada?.id}</strong>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <button onClick={() => { setMetodoPago(null); setReservaGenerada(null); setEfectivoExpira(null); }} style={btnSecundario}>Cancelar</button>
                                            <button onClick={() => navigate('/')} style={{ ...btnPrimario, flex: 2 }}>Entendido — Ir a pagar</button>
                                        </div>
                                    </div>
                                )}

                                {/* QR flow */}
                                {metodoPago === 'qr' && qrToken && (
                                    <div style={{ background: '#0d1a2e', borderRadius: '14px', padding: '1.5rem', border: '1px solid #1e3a5f', textAlign: 'center' }}>
                                        <div style={{ color: '#93c5fd', fontWeight: 700, marginBottom: '1rem' }}>Escanea con tu app bancaria</div>
                                        <div style={{ background: 'white', display: 'inline-block', padding: '12px', borderRadius: '12px', marginBottom: '1rem' }}>
                                            <QRCodeSVG
                                                value={`${window.location.origin}/pago/qr?token=${qrToken}&monto=${totalMonto}&origen=${encodeURIComponent(origenViaje)}&destino=${encodeURIComponent(destinoViaje)}`}
                                                size={180}
                                            />
                                        </div>
                                        <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '0.5rem' }}>
                                            Token: <code style={{ color: '#93c5fd' }}>{qrToken}</code>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#f59e0b', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block', animation: 'tbb-pulse-border 0.8s infinite' }} />
                                            Esperando confirmación de pago...
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <button onClick={() => { setMetodoPago(null); setQrToken(null); setPollingQr(false); }} style={btnSecundario}>← Cancelar</button>
                                            <button onClick={simularPagoQR} style={{ ...btnPrimario, flex: 2, background: '#059669' }}>
                                                Simular Pago Exitoso
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Tarjeta flow */}
                                {metodoPago === 'tarjeta' && !procesandoPago && (
                                    <TarjetaForm
                                        monto={totalMonto}
                                        onConfirm={finalizarReserva}
                                        onCancelar={() => setMetodoPago(null)}
                                    />
                                )}

                                {procesandoPago && (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: '#60a5fa' }}>
                                        Procesando pago...
                                    </div>
                                )}

                                {!metodoPago && (
                                    <button onClick={() => setPaso('formulario')} style={{ ...btnSecundario, width: '100%', marginTop: '0.5rem' }}>
                                        ← Volver a datos
                                    </button>
                                )}
                            </div>
                        )}

                        {/* ══ PASO 5: TICKETS ══ */}
                        {paso === 'ticket' && boletos.length > 0 && (
                            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <div>
                                        <h2 style={{ margin: 0, color: '#10b981' }}>¡Reserva Confirmada!</h2>
                                        <div style={{ color: '#64748b', fontSize: '0.82rem' }}>ID: {reservaGenerada?.id}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={handleDownloadPDF} style={{ ...btnPrimario, flex: 'none', padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}>
                                            Descargar PDF
                                        </button>
                                        <button onClick={() => navigate('/')} style={{ ...btnSecundario, flex: 'none', padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}>
                                            Ir al Inicio
                                        </button>
                                    </div>
                                </div>

                                {/* Declaration warning if applicable */}
                                {requiereDocumentos && (
                                    <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid #78350f', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', color: '#fcd34d', fontSize: '0.82rem' }}>
                                        <strong>Acción requerida:</strong> Uno o más pasajeros requieren validación presencial. Preséntese en sucursal con el PDF de declaración firmado y documentos originales antes de la hora de salida.
                                    </div>
                                )}

                                {/* Boletos grid */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                                    gap: '1rem',
                                }}>
                                    {boletos.map(boleto => (
                                        <TicketCard key={boleto.id} boleto={boleto} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default MapaAsientos;
