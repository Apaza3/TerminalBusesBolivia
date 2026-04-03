import React, { useRef, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import { generarLinkWhatsApp, generarMensajeTicket } from '../utilidades/whatsapp';

/**
 * TicketGenerator — Generates a downloadable PDF ticket with QR code.
 * Props:
 *   - reserva: reservation object from mockStorage
 *   - onCerrar: callback to close the ticket view
 */
const TicketGenerator = ({ reserva, onCerrar }) => {
    const qrRef = useRef(null);

    const descargarPDF = useCallback(() => {
        const doc = new jsPDF({ unit: 'mm', format: [100, 200] });
        
        // Background
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 100, 200, 'F');
        
        // Header bar
        doc.setFillColor(59, 130, 246);
        doc.rect(0, 0, 100, 22, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('TERMINAL BUSES BOLIVIA', 50, 10, { align: 'center' });
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text('Pasaje Digital', 50, 17, { align: 'center' });

        // Divider
        doc.setDrawColor(51, 65, 85);
        doc.setLineDashPattern([2, 2], 0);
        doc.line(10, 28, 90, 28);

        // Body text
        doc.setTextColor(241, 245, 249);
        doc.setFontSize(9);
        let y = 36;
        const lineHeight = 7;

        const addField = (label, value) => {
            doc.setFont(undefined, 'bold');
            doc.setTextColor(148, 163, 184);
            doc.text(label, 10, y);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(241, 245, 249);
            doc.text(String(value), 45, y);
            y += lineHeight;
        };

        addField('Pasajero:', reserva.pasajeroNombre);
        addField('CI:', reserva.pasajeroCI);
        addField('Asiento(s):', reserva.asientos.join(', '));
        addField('Bus:', reserva.busPlaca);
        
        y += 3;
        doc.setLineDashPattern([2, 2], 0);
        doc.line(10, y, 90, y);
        y += 6;

        addField('Ruta:', `${reserva.origen} → ${reserva.destino}`);
        addField('Salida:', new Date(reserva.fechaSalida).toLocaleString('es-BO'));
        addField('Precio:', `Bs ${reserva.precio}`);
        
        y += 3;
        doc.setLineDashPattern([2, 2], 0);
        doc.line(10, y, 90, y);
        y += 6;

        // QR Code — render from the canvas
        if (qrRef.current) {
            const qrCanvas = qrRef.current.querySelector('canvas');
            if (qrCanvas) {
                const qrDataUrl = qrCanvas.toDataURL('image/png');
                const qrSize = 35;
                doc.addImage(qrDataUrl, 'PNG', (100 - qrSize) / 2, y, qrSize, qrSize);
                y += qrSize + 5;
            }
        }
        
        // Reservation ID
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(`ID: ${reserva.id}`, 50, y, { align: 'center' });
        y += 5;
        doc.text('Presente este código al abordar', 50, y, { align: 'center' });

        // Footer
        doc.setFillColor(30, 41, 59);
        doc.rect(0, 185, 100, 15, 'F');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('www.terminalbusesbolivia.com', 50, 193, { align: 'center' });

        doc.save(`ticket-${reserva.id}.pdf`);
    }, [reserva]);

    const abrirWhatsApp = () => {
        const mensaje = generarMensajeTicket(reserva);
        const link = generarLinkWhatsApp(reserva.pasajeroTelefono, mensaje);
        window.open(link, '_blank');
    };

    if (!reserva) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 70, padding: '1rem'
        }}>
            <div style={{
                background: '#1e293b', width: '100%', maxWidth: '420px',
                borderRadius: '16px', padding: '2rem',
                border: '1px solid #334155', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
                maxHeight: '90vh', overflowY: 'auto'
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
                    <h2 style={{ margin: 0, color: '#10b981', fontSize: '1.3rem' }}>¡Reserva Confirmada!</h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.5rem' }}>Tu pasaje ha sido generado exitosamente</p>
                </div>

                {/* Ticket Card */}
                <div style={{
                    background: '#0f172a', borderRadius: '12px', padding: '1.5rem',
                    border: '1px solid #334155', marginBottom: '1.5rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div>
                            <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Pasajero</div>
                            <div style={{ color: '#f1f5f9', fontWeight: 600 }}>{reserva.pasajeroNombre}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>CI</div>
                            <div style={{ color: '#f1f5f9', fontWeight: 600 }}>{reserva.pasajeroCI}</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div>
                            <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Asiento(s)</div>
                            <div style={{ color: '#60a5fa', fontWeight: 700, fontSize: '1.1rem' }}>{reserva.asientos.join(', ')}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Bus</div>
                            <div style={{ color: '#f1f5f9', fontWeight: 600 }}>{reserva.busPlaca}</div>
                        </div>
                    </div>

                    <div style={{ borderTop: '1px dashed #334155', paddingTop: '1rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>ORIGEN</div>
                                <div style={{ color: '#f1f5f9', fontWeight: 600 }}>{reserva.origen}</div>
                            </div>
                            <div style={{ color: '#475569', fontSize: '1.5rem', alignSelf: 'center' }}>→</div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>DESTINO</div>
                                <div style={{ color: '#f1f5f9', fontWeight: 600 }}>{reserva.destino}</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div>
                            <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>SALIDA</div>
                            <div style={{ color: '#f1f5f9', fontSize: '0.85rem' }}>{new Date(reserva.fechaSalida).toLocaleString('es-BO')}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>TOTAL</div>
                            <div style={{ color: '#10b981', fontWeight: 700, fontSize: '1.1rem' }}>Bs {reserva.precio}</div>
                        </div>
                    </div>

                    {/* QR Code */}
                    <div ref={qrRef} style={{ textAlign: 'center', padding: '1rem', background: '#fff', borderRadius: '8px' }}>
                        <QRCodeCanvas
                            value={JSON.stringify({ id: reserva.id, ci: reserva.pasajeroCI, asientos: reserva.asientos })}
                            size={140}
                            level="M"
                            includeMargin={true}
                        />
                        <div style={{ color: '#64748b', fontSize: '0.7rem', marginTop: '0.5rem' }}>
                            {reserva.id}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button
                        onClick={descargarPDF}
                        style={{
                            width: '100%', padding: '0.9rem', border: 'none', borderRadius: '10px',
                            background: '#3b82f6', color: 'white', fontWeight: 600,
                            cursor: 'pointer', fontSize: '0.95rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                        }}
                    >
                        📄 Descargar PDF
                    </button>

                    <button
                        onClick={abrirWhatsApp}
                        style={{
                            width: '100%', padding: '0.9rem', border: 'none', borderRadius: '10px',
                            background: '#25D366', color: 'white', fontWeight: 600,
                            cursor: 'pointer', fontSize: '0.95rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                        }}
                    >
                        💬 Enviar por WhatsApp
                    </button>

                    <button
                        onClick={onCerrar}
                        style={{
                            width: '100%', padding: '0.8rem', border: '1px solid #475569', borderRadius: '10px',
                            background: 'transparent', color: '#94a3b8',
                            cursor: 'pointer', fontSize: '0.9rem'
                        }}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TicketGenerator;
