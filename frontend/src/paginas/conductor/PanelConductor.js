import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import { VIAJES_CONDUCTOR_MOCK, obtenerEstadoViaje, actualizarEstadoViaje, obtenerReservas } from '../../data/mockStorage';
import '../../estilos/escritorio/admin.css';
import '../../estilos/movil/admin-responsivo.css';

/**
 * PanelConductor — Driver dashboard with assigned trips, passenger lists, and manifest export.
 * R19: Manifiesto digital con CI, R20: Estados en tiempo real con polling
 */
const PanelConductor = () => {
    const navigate = useNavigate();
    const { perfil, logout } = useAuth();
    const [viajes, setViajes] = useState([]);
    const [viajeActivo, setViajeActivo] = useState(null);
    const [busquedaPasajero, setBusquedaPasajero] = useState('');

    const cargarViajes = useCallback(() => {
        const viajesConEstado = VIAJES_CONDUCTOR_MOCK.map(v => {
            const reservasReales = obtenerReservas(v.id);
            const pasajerosReales = reservasReales.flatMap(r =>
                r.asientos.map(asiento => ({
                    nombre: r.pasajeroNombre,
                    ci: r.pasajeroCI,
                    asiento,
                    telefono: r.pasajeroTelefono || '',
                }))
            );
            return {
                ...v,
                estado: obtenerEstadoViaje(v.id),
                pasajeros: [...v.pasajeros, ...pasajerosReales],
            };
        });
        setViajes(viajesConEstado);
    }, []);

    useEffect(() => {
        cargarViajes();
        // R20: Polling cada 15s para sincronizar estados
        const intervalo = setInterval(cargarViajes, 15000);
        return () => clearInterval(intervalo);
    }, [cargarViajes]);

    const cambiarEstado = (viajeId, nuevoEstado) => {
        actualizarEstadoViaje(viajeId, nuevoEstado);
        setViajes(prev => prev.map(v =>
            v.id === viajeId ? { ...v, estado: nuevoEstado } : v
        ));
    };

    const badgeEstado = (estado) => {
        const colores = {
            programado: { bg: '#1e3a8a', color: '#93c5fd', label: '📅 Programado' },
            en_ruta: { bg: '#065f46', color: '#6ee7b7', label: '🚌 En Ruta' },
            finalizado: { bg: '#374151', color: '#9ca3af', label: '✅ Finalizado' },
        };
        const c = colores[estado] || colores.programado;
        return (
            <span style={{
                background: c.bg, color: c.color, padding: '0.3rem 0.8rem',
                borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600
            }}>
                {c.label}
            </span>
        );
    };

    // R19: Export manifiesto como texto imprimible
    const exportarManifiesto = (viaje) => {
        const pasajerosFiltrados = viaje.pasajeros.filter(p =>
            !busquedaPasajero ||
            p.nombre.toLowerCase().includes(busquedaPasajero.toLowerCase()) ||
            p.ci.includes(busquedaPasajero)
        );

        const lineas = [
            '═══════════════════════════════════════════',
            '     MANIFIESTO DE PASAJEROS',
            '     Terminal de Buses Bolivia',
            '═══════════════════════════════════════════',
            `Ruta:    ${viaje.origen} → ${viaje.destino}`,
            `Bus:     ${viaje.busPlaca}`,
            `Salida:  ${new Date(viaje.salida).toLocaleString('es-BO')}`,
            `Estado:  ${viaje.estado.toUpperCase()}`,
            `Total pasajeros: ${pasajerosFiltrados.length}`,
            '───────────────────────────────────────────',
            'Asiento  | Nombre                | CI',
            '─────────|───────────────────────|──────────',
            ...pasajerosFiltrados.map(p =>
                `${String(p.asiento).padEnd(9)}| ${String(p.nombre).padEnd(22)}| ${p.ci}`
            ),
            '═══════════════════════════════════════════',
            `Impreso: ${new Date().toLocaleString('es-BO')}`,
        ];

        const contenido = lineas.join('\n');
        const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `manifiesto_${viaje.id}_${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const imprimirManifiesto = (viaje) => {
        const pasajerosFiltrados = viaje.pasajeros.filter(p =>
            !busquedaPasajero ||
            p.nombre.toLowerCase().includes(busquedaPasajero.toLowerCase()) ||
            p.ci.includes(busquedaPasajero)
        );

        const html = `
            <html><head><title>Manifiesto - ${viaje.origen} → ${viaje.destino}</title>
            <style>
                body { font-family: monospace; font-size: 12px; margin: 20px; }
                h2 { text-align: center; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #000; padding: 4px 8px; text-align: left; }
                th { background: #eee; }
                .meta { margin-bottom: 10px; }
            </style></head><body>
            <h2>MANIFIESTO DE PASAJEROS</h2>
            <h3 style="text-align:center">Terminal de Buses Bolivia</h3>
            <div class="meta">
                <strong>Ruta:</strong> ${viaje.origen} → ${viaje.destino}<br>
                <strong>Bus:</strong> ${viaje.busPlaca}<br>
                <strong>Salida:</strong> ${new Date(viaje.salida).toLocaleString('es-BO')}<br>
                <strong>Estado:</strong> ${viaje.estado.toUpperCase()}<br>
                <strong>Total pasajeros:</strong> ${pasajerosFiltrados.length}
            </div>
            <table>
                <thead><tr><th>Asiento</th><th>Nombre</th><th>CI</th><th>Teléfono</th></tr></thead>
                <tbody>
                ${pasajerosFiltrados.map(p => `
                    <tr><td>${p.asiento}</td><td>${p.nombre}</td><td>${p.ci}</td><td>${p.telefono || '—'}</td></tr>
                `).join('')}
                </tbody>
            </table>
            <p style="margin-top:15px; font-size:10px">Impreso: ${new Date().toLocaleString('es-BO')}</p>
            </body></html>
        `;

        const ventana = window.open('', '_blank', 'width=700,height=600');
        ventana.document.write(html);
        ventana.document.close();
        ventana.print();
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <div className="pagina-admin">
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
                padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>🚌 Panel del Conductor</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                        Hola, {perfil?.nombre_completo || perfil?.email || 'Conductor'}
                    </div>
                </div>
                <button onClick={handleLogout} style={{
                    background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
                    padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 500
                }}>
                    Cerrar Sesión
                </button>
            </div>

            <main style={{ maxWidth: '900px', margin: '1.5rem auto', padding: '0 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ color: '#f1f5f9', margin: 0 }}>Mis Viajes Asignados</h2>
                    <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                        🔄 Sincronizado automáticamente cada 15s
                    </div>
                </div>

                {viajes.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>
                        No tienes viajes asignados por el momento.
                    </div>
                )}

                {viajes.map(viaje => (
                    <div key={viaje.id} style={{
                        background: '#1e293b', borderRadius: '12px', border: '1px solid #334155',
                        marginBottom: '1.5rem', overflow: 'hidden',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                    }}>
                        {/* Trip Header */}
                        <div style={{
                            padding: '1.25rem 1.5rem', background: '#0f172a',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            flexWrap: 'wrap', gap: '0.5rem'
                        }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f1f5f9' }}>
                                    {viaje.origen} → {viaje.destino}
                                </div>
                                <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                    🚍 {viaje.busPlaca} · {new Date(viaje.salida).toLocaleString('es-BO')}
                                </div>
                            </div>
                            {badgeEstado(viaje.estado)}
                        </div>

                        {/* Passenger List */}
                        <div style={{ padding: '1rem 1.5rem' }}>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                marginBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap'
                            }}>
                                <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>
                                    👥 Pasajeros ({viaje.pasajeros.length})
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => setViajeActivo(viajeActivo === viaje.id ? null : viaje.id)}
                                        style={{
                                            background: 'rgba(59,130,246,0.1)', border: '1px solid #334155',
                                            color: '#60a5fa', padding: '0.35rem 0.75rem', borderRadius: '6px',
                                            cursor: 'pointer', fontSize: '0.78rem',
                                        }}>
                                        {viajeActivo === viaje.id ? '▲ Ocultar' : '▼ Ver lista'}
                                    </button>
                                    <button
                                        onClick={() => imprimirManifiesto(viaje)}
                                        title="Imprimir manifiesto"
                                        style={{
                                            background: 'rgba(16,185,129,0.1)', border: '1px solid #065f46',
                                            color: '#6ee7b7', padding: '0.35rem 0.75rem', borderRadius: '6px',
                                            cursor: 'pointer', fontSize: '0.78rem',
                                        }}>
                                        🖨️ Imprimir
                                    </button>
                                    <button
                                        onClick={() => exportarManifiesto(viaje)}
                                        title="Descargar manifiesto .txt"
                                        style={{
                                            background: 'rgba(139,92,246,0.1)', border: '1px solid #4c1d95',
                                            color: '#c4b5fd', padding: '0.35rem 0.75rem', borderRadius: '6px',
                                            cursor: 'pointer', fontSize: '0.78rem',
                                        }}>
                                        ⬇️ .TXT
                                    </button>
                                </div>
                            </div>

                            {viajeActivo === viaje.id && (
                                <>
                                    {/* Búsqueda en manifiesto */}
                                    <input
                                        type="text"
                                        placeholder="Buscar por nombre o CI..."
                                        value={busquedaPasajero}
                                        onChange={e => setBusquedaPasajero(e.target.value)}
                                        style={{
                                            width: '100%', boxSizing: 'border-box',
                                            background: '#0f172a', border: '1px solid #334155',
                                            color: '#f1f5f9', padding: '0.5rem 0.75rem',
                                            borderRadius: '8px', fontSize: '0.85rem',
                                            marginBottom: '0.75rem',
                                        }}
                                    />
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid #334155' }}>
                                                    <th style={{ textAlign: 'left', padding: '0.5rem', color: '#94a3b8', fontWeight: 500 }}>Asiento</th>
                                                    <th style={{ textAlign: 'left', padding: '0.5rem', color: '#94a3b8', fontWeight: 500 }}>Nombre</th>
                                                    <th style={{ textAlign: 'left', padding: '0.5rem', color: '#94a3b8', fontWeight: 500 }}>CI</th>
                                                    <th style={{ textAlign: 'left', padding: '0.5rem', color: '#94a3b8', fontWeight: 500 }}>Tel.</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {viaje.pasajeros
                                                    .filter(p =>
                                                        !busquedaPasajero ||
                                                        p.nombre.toLowerCase().includes(busquedaPasajero.toLowerCase()) ||
                                                        p.ci.includes(busquedaPasajero)
                                                    )
                                                    .map((p, i) => (
                                                        <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                                                            <td style={{ padding: '0.6rem 0.5rem', color: '#60a5fa', fontWeight: 700 }}>{p.asiento}</td>
                                                            <td style={{ padding: '0.6rem 0.5rem', color: '#f1f5f9' }}>{p.nombre}</td>
                                                            <td style={{ padding: '0.6rem 0.5rem', color: '#cbd5e1' }}>{p.ci}</td>
                                                            <td style={{ padding: '0.6rem 0.5rem', color: '#cbd5e1' }}>{p.telefono || '—'}</td>
                                                        </tr>
                                                    ))
                                                }
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Trip Controls */}
                        <div style={{
                            padding: '1rem 1.5rem', background: '#0f172a', borderTop: '1px solid #334155',
                            display: 'flex', gap: '0.75rem', flexWrap: 'wrap'
                        }}>
                            {viaje.estado === 'programado' && (
                                <button onClick={() => cambiarEstado(viaje.id, 'en_ruta')} style={{
                                    flex: 1, padding: '0.75rem', background: '#059669', color: 'white',
                                    border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
                                    minWidth: '140px', fontSize: '0.9rem'
                                }}>
                                    🚀 Iniciar Viaje
                                </button>
                            )}
                            {viaje.estado === 'en_ruta' && (
                                <button onClick={() => cambiarEstado(viaje.id, 'finalizado')} style={{
                                    flex: 1, padding: '0.75rem', background: '#dc2626', color: 'white',
                                    border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
                                    minWidth: '140px', fontSize: '0.9rem'
                                }}>
                                    🏁 Finalizar Viaje
                                </button>
                            )}
                            {viaje.estado === 'finalizado' && (
                                <div style={{ flex: 1, textAlign: 'center', color: '#94a3b8', padding: '0.75rem', fontSize: '0.9rem' }}>
                                    Viaje completado ✅
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </main>
        </div>
    );
};

export default PanelConductor;
