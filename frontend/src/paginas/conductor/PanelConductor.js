import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import { VIAJES_CONDUCTOR_MOCK, obtenerEstadoViaje, actualizarEstadoViaje, obtenerReservas } from '../../data/mockStorage';
import '../../estilos/escritorio/admin.css';
import '../../estilos/movil/admin-responsivo.css';

/**
 * PanelConductor — Driver dashboard showing assigned trips and passenger lists.
 * Provides controls to start/finish trips.
 */
const PanelConductor = () => {
    const navigate = useNavigate();
    const { perfil, logout } = useAuth();
    const [viajes, setViajes] = useState([]);
    const [viajeActivo, setViajeActivo] = useState(null);

    useEffect(() => {
        // Load mock driver trips with their current status and any real reservations
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

            <main style={{ maxWidth: '800px', margin: '1.5rem auto', padding: '0 1rem' }}>
                <h2 style={{ marginBottom: '1.5rem', color: '#f1f5f9' }}>Mis Viajes Asignados</h2>

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
                            <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: 600 }}>
                                👥 Pasajeros ({viaje.pasajeros.length})
                            </div>

                            {viajeActivo === viaje.id ? (
                                <>
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
                                                {viaje.pasajeros.map((p, i) => (
                                                    <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                                                        <td style={{ padding: '0.6rem 0.5rem', color: '#60a5fa', fontWeight: 700 }}>{p.asiento}</td>
                                                        <td style={{ padding: '0.6rem 0.5rem', color: '#f1f5f9' }}>{p.nombre}</td>
                                                        <td style={{ padding: '0.6rem 0.5rem', color: '#cbd5e1' }}>{p.ci}</td>
                                                        <td style={{ padding: '0.6rem 0.5rem', color: '#cbd5e1' }}>{p.telefono || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <button onClick={() => setViajeActivo(null)} style={{
                                        marginTop: '0.75rem', background: 'transparent', border: 'none',
                                        color: '#64748b', cursor: 'pointer', fontSize: '0.8rem'
                                    }}>
                                        ▲ Ocultar lista
                                    </button>
                                </>
                            ) : (
                                <button onClick={() => setViajeActivo(viaje.id)} style={{
                                    background: 'rgba(59,130,246,0.1)', border: '1px solid #334155',
                                    color: '#60a5fa', padding: '0.5rem 1rem', borderRadius: '8px',
                                    cursor: 'pointer', fontSize: '0.85rem', width: '100%'
                                }}>
                                    ▼ Ver lista de pasajeros
                                </button>
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
