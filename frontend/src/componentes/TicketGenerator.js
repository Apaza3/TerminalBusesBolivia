import React, { useRef, useCallback, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import { generarLinkWhatsApp } from '../utilidades/whatsapp';

const TicketGenerator = ({ reserva, onCerrar }) => {
    const qrRefs = useRef({});
    const [ticketActivo, setTicketActivo] = useState(0);
    const [compartiendo, setCompartiendo] = useState(false);

    if (!reserva) return null;

    const tickets = reserva.asientos.map((asiento, i) => {
        const pasajeroData = reserva.pasajeros?.[asiento] || {};
        return {
            asiento,
            nombre: pasajeroData.nombre || reserva.pasajeroNombre,
            ci: pasajeroData.ci || reserva.pasajeroCI,
            esInfante: pasajeroData.esInfante || false,
            qrId: `${reserva.id}-${asiento}`,
        };
    });

    const ticket = tickets[ticketActivo];
    const total = tickets.length;

    const descargarPDFTicket = useCallback((idx) => {
        const t = tickets[idx];
        const doc = new jsPDF({ unit: 'mm', format: [100, 200] });

        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 100, 200, 'F');

        doc.setFillColor(t.esInfante ? 245 : 59, t.esInfante ? 158 : 130, t.esInfante ? 11 : 246);
        doc.rect(0, 0, 100, 22, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('TERMINAL BUSES BOLIVIA', 50, 9, { align: 'center' });
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text(t.esInfante ? '🧒 Pasaje Infante' : '🎫 Pasaje Digital', 50, 17, { align: 'center' });

        doc.setDrawColor(51, 65, 85);
        doc.setLineDashPattern([2, 2], 0);
        doc.line(10, 26, 90, 26);

        doc.setTextColor(241, 245, 249);
        doc.setFontSize(9);
        let y = 34;
        const kv = (label, value) => {
            doc.setFont(undefined, 'bold'); doc.setTextColor(148, 163, 184);
            doc.text(label, 10, y);
            doc.setFont(undefined, 'normal'); doc.setTextColor(241, 245, 249);
            doc.text(String(value), 48, y); y += 7;
        };
        kv('Pasajero:', t.nombre);
        kv('CI:', t.ci);
        kv('Asiento:', t.asiento);
        kv('Bus:', reserva.busPlaca);
        y += 2; doc.setLineDashPattern([2, 2], 0); doc.line(10, y, 90, y); y += 6;
        kv('Ruta:', `${reserva.origen} → ${reserva.destino}`);
        kv('Salida:', new Date(reserva.fechaSalida).toLocaleString('es-BO'));
        kv('Precio:', `Bs ${Math.round(reserva.precio / reserva.asientos.length)}`);
        y += 2; doc.setLineDashPattern([2, 2], 0); doc.line(10, y, 90, y); y += 6;

        const qrCanvas = qrRefs.current[t.asiento]?.querySelector('canvas');
        if (qrCanvas) {
            const qrData = qrCanvas.toDataURL('image/png');
            const qrSize = 32;
            doc.addImage(qrData, 'PNG', (100 - qrSize) / 2, y, qrSize, qrSize);
            y += qrSize + 4;
        }

        doc.setFontSize(7); doc.setTextColor(100, 116, 139);
        doc.text(`ID: ${t.qrId}`, 50, y, { align: 'center' }); y += 4;
        doc.text('Presente este código al abordar', 50, y, { align: 'center' });

        if (t.esInfante) {
            y += 8;
            doc.setFillColor(92, 50, 0);
            doc.rect(5, y, 90, 18, 'F');
            doc.setTextColor(252, 211, 77);
            doc.setFontSize(7);
            doc.text('⚠️ INFANTE: Presentar documentación en sucursal.', 50, y + 6, { align: 'center' });
            doc.text('Sin validación presencial, este boleto se cancelará.', 50, y + 12, { align: 'center' });
        }

        doc.setFillColor(30, 41, 59);
        doc.rect(0, 185, 100, 15, 'F');
        doc.setFontSize(7); doc.setTextColor(148, 163, 184);
        doc.text('www.terminalbusesbolivia.com', 50, 193, { align: 'center' });
        doc.save(`boleto-${t.asiento}-${reserva.id}.pdf`);
    }, [reserva, tickets]);

    const descargarTodosPDF = useCallback(() => {
        tickets.forEach((_, idx) => descargarPDFTicket(idx));
    }, [tickets, descargarPDFTicket]);

    const compartirWhatsApp = useCallback(async () => {
        setCompartiendo(true);
        try {
            const telefono = reserva.pasajeroTelefono || '';
            const mensaje = tickets.map(t =>
                `🎫 *Boleto ${t.asiento}*\n👤 ${t.nombre}\n🪪 CI: ${t.ci}\n${t.esInfante ? '🧒 INFANTE\n' : ''}📍 ${reserva.origen} → ${reserva.destino}\n📅 ${new Date(reserva.fechaSalida).toLocaleString('es-BO')}\n🔑 ${t.qrId}`
            ).join('\n\n━━━━━━━━━━━━━\n\n');
            const textoCompleto = `🚌 *TERMINAL BUSES BOLIVIA*\n\n${mensaje}\n\n¡Buen viaje! 🇧🇴`;

            if (navigator.canShare && navigator.share) {
                const archivos = [];
                for (const t of tickets) {
                    const canvas = qrRefs.current[t.asiento]?.querySelector('canvas');
                    if (canvas) {
                        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
                        if (blob) {
                            archivos.push(new File([blob], `boleto-${t.asiento}.png`, { type: 'image/png' }));
                        }
                    }
                }
                if (archivos.length > 0 && navigator.canShare({ files: archivos })) {
                    await navigator.share({ title: 'Boletos Terminal Buses Bolivia', text: textoCompleto, files: archivos });
                    setCompartiendo(false);
                    return;
                }
            }
            const link = generarLinkWhatsApp(telefono, textoCompleto);
            window.open(link, '_blank');
        } catch (err) {
            console.error('Share error:', err);
        }
        setCompartiendo(false);
    }, [reserva, tickets]);

    const btnBase = {
        width: '100%', padding: '0.9rem', border: 'none', borderRadius: '10px',
        fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 70, padding: '1rem'
        }}>
            <div style={{
                background: '#1e293b', width: '100%', maxWidth: '440px',
                borderRadius: '16px', padding: '1.75rem',
                border: '1px solid #334155', maxHeight: '92vh', overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
            }}>
                <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>✅</div>
                    <h2 style={{ margin: 0, color: '#10b981', fontSize: '1.2rem' }}>¡Reserva Confirmada!</h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.3rem' }}>
                        {total} boleto{total > 1 ? 's' : ''} generado{total > 1 ? 's' : ''} exitosamente
                    </p>
                </div>

                {total > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <button
                            onClick={() => setTicketActivo(prev => Math.max(0, prev - 1))}
                            disabled={ticketActivo === 0}
                            style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '8px', padding: '0.4rem 0.8rem', cursor: ticketActivo === 0 ? 'not-allowed' : 'pointer', opacity: ticketActivo === 0 ? 0.4 : 1 }}
                        >← Ant</button>
                        <span style={{ color: '#60a5fa', fontWeight: 600, fontSize: '0.9rem' }}>
                            Boleto {ticketActivo + 1} de {total} · Asiento {ticket.asiento}
                        </span>
                        <button
                            onClick={() => setTicketActivo(prev => Math.min(total - 1, prev + 1))}
                            disabled={ticketActivo === total - 1}
                            style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '8px', padding: '0.4rem 0.8rem', cursor: ticketActivo === total - 1 ? 'not-allowed' : 'pointer', opacity: ticketActivo === total - 1 ? 0.4 : 1 }}
                        >Sig →</button>
                    </div>
                )}

                <div style={{
                    background: '#0f172a', borderRadius: '12px',
                    padding: '1.25rem', border: `1px solid ${ticket.esInfante ? '#f59e0b40' : '#334155'}`,
                    marginBottom: '1.25rem',
                }}>
                    {ticket.esInfante && (
                        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid #f59e0b60', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '0.75rem', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 600 }}>
                            🧒 INFANTE — Presentar documentación en sucursal
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div>
                            <div style={{ color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase' }}>Pasajero</div>
                            <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.95rem' }}>{ticket.nombre}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase' }}>Asiento</div>
                            <div style={{ color: '#60a5fa', fontWeight: 700, fontSize: '1.2rem' }}>{ticket.asiento}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div>
                            <div style={{ color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase' }}>CI</div>
                            <div style={{ color: '#f1f5f9', fontSize: '0.9rem' }}>{ticket.ci}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase' }}>Bus</div>
                            <div style={{ color: '#f1f5f9', fontSize: '0.9rem' }}>{reserva.busPlaca}</div>
                        </div>
                    </div>
                    <div style={{ borderTop: '1px dashed #334155', paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>ORIGEN</div>
                                <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.9rem' }}>{reserva.origen}</div>
                            </div>
                            <div style={{ color: '#475569', alignSelf: 'center' }}>→</div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>DESTINO</div>
                                <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.9rem' }}>{reserva.destino}</div>
                            </div>
                        </div>
                        <div style={{ marginTop: '0.6rem', color: '#cbd5e1', fontSize: '0.8rem' }}>
                            📅 {new Date(reserva.fechaSalida).toLocaleString('es-BO')}
                        </div>
                    </div>
                    <div
                        ref={el => { if (el) qrRefs.current[ticket.asiento] = el; }}
                        style={{ textAlign: 'center', background: '#fff', borderRadius: '8px', padding: '0.75rem' }}
                    >
                        <QRCodeCanvas
                            value={JSON.stringify({ id: ticket.qrId, asiento: ticket.asiento, ci: ticket.ci })}
                            size={120} level="M" includeMargin={false}
                        />
                        <div style={{ color: '#64748b', fontSize: '0.65rem', marginTop: '0.4rem' }}>{ticket.qrId}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <button onClick={() => descargarPDFTicket(ticketActivo)} style={{ ...btnBase, background: '#3b82f6', color: 'white' }}>
                        📄 Descargar PDF (asiento {ticket.asiento})
                    </button>
                    {total > 1 && (
                        <button onClick={descargarTodosPDF} style={{ ...btnBase, background: '#1d4ed8', color: 'white' }}>
                            📦 Descargar todos los PDFs ({total})
                        </button>
                    )}
                    <button onClick={compartirWhatsApp} disabled={compartiendo} style={{ ...btnBase, background: '#25D366', color: 'white', opacity: compartiendo ? 0.7 : 1 }}>
                        {compartiendo ? '⏳ Compartiendo...' : `💬 Enviar ${total > 1 ? `${total} boletos` : 'boleto'} por WhatsApp`}
                    </button>
                    <button onClick={onCerrar} style={{ ...btnBase, background: 'transparent', border: '1px solid #475569', color: '#94a3b8' }}>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TicketGenerator;
