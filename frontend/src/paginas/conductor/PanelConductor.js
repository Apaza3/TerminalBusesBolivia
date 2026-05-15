import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS, ciudadADepartamento } from '../../contextos/DepartamentoContext';
import {
    VIAJES_CONDUCTOR_MOCK, obtenerEstadoViaje,
    actualizarEstadoViaje, cancelarViaje, obtenerReservas,
} from '../../data/mockStorage';
import { actualizarPerfilStaff } from '../../data/mockAuthDB';
import gsap from 'gsap';

const PanelConductor = () => {
    const navigate = useNavigate();
    const { perfil, logout, actualizarPerfil } = useAuth();
    const rootRef = useRef(null);

    const deptNombre = perfil?.departamento || 'La Paz';
    const tema = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];

    const [viajes, setViajes] = useState([]);
    const [viajeActivo, setViajeActivo] = useState(null);
    const [busquedaPasajero, setBusquedaPasajero] = useState('');
    const [confirmandoCancelar, setConfirmandoCancelar] = useState(null);

    const cargarViajes = useCallback(() => {
        const viajesConEstado = VIAJES_CONDUCTOR_MOCK.map(v => {
            const reservasReales = obtenerReservas(v.id);
            const pasajerosReales = reservasReales.flatMap(r =>
                r.asientos.map(asiento => ({
                    nombre: r.pasajeroNombre, ci: r.pasajeroCI,
                    asiento, telefono: r.pasajeroTelefono || '',
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
        const intervalo = setInterval(cargarViajes, 15000);
        return () => clearInterval(intervalo);
    }, [cargarViajes]);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-anim="header"]', { y: -28, opacity: 0, duration: 0.5, ease: 'power3.out' });
            gsap.from('[data-anim="card"]', { y: 20, opacity: 0, duration: 0.45, stagger: 0.1, ease: 'power2.out', delay: 0.15 });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    const cambiarEstado = async (viajeId, nuevoEstado, viaje) => {
        actualizarEstadoViaje(viajeId, nuevoEstado);
        setViajes(prev => prev.map(v => v.id === viajeId ? { ...v, estado: nuevoEstado } : v));

        // Auto-cambiar departamento del conductor cuando finaliza el viaje
        if (nuevoEstado === 'finalizado' && viaje?.destino) {
            const nuevoDept = ciudadADepartamento(viaje.destino);
            if (nuevoDept !== deptNombre && perfil?.id) {
                actualizarPerfilStaff(perfil.id, { departamento: nuevoDept });
                if (actualizarPerfil) actualizarPerfil({ departamento: nuevoDept });
            }
        }
    };

    const handleCancelar = (viajeId) => {
        cancelarViaje(viajeId);
        setViajes(prev => prev.map(v => v.id === viajeId ? { ...v, estado: 'cancelado' } : v));
        setConfirmandoCancelar(null);
    };

    const exportarManifiesto = (viaje) => {
        const pasajerosFiltrados = viaje.pasajeros.filter(p =>
            !busquedaPasajero ||
            p.nombre.toLowerCase().includes(busquedaPasajero.toLowerCase()) ||
            p.ci.includes(busquedaPasajero)
        );
        const lineas = [
            '═══════════════════════════════════════',
            '   MANIFIESTO DE PASAJEROS',
            '   Terminal de Buses Bolivia',
            '═══════════════════════════════════════',
            `Ruta:   ${viaje.origen} → ${viaje.destino}`,
            `Bus:    ${viaje.busPlaca}`,
            `Salida: ${new Date(viaje.salida).toLocaleString('es-BO')}`,
            `Total:  ${pasajerosFiltrados.length} pasajeros`,
            '───────────────────────────────────────',
            ...pasajerosFiltrados.map(p => `${String(p.asiento).padEnd(6)}| ${String(p.nombre).padEnd(22)}| ${p.ci}`),
            '═══════════════════════════════════════',
        ];
        const blob = new Blob([lineas.join('\n')], { type: 'text/plain;charset=utf-8' });
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
        const html = `<html><head><title>Manifiesto</title>
        <style>body{font-family:monospace;font-size:12px;margin:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #000;padding:4px 8px}th{background:#eee}</style>
        </head><body>
        <h2 style="text-align:center">MANIFIESTO — ${viaje.origen} → ${viaje.destino}</h2>
        <p><strong>Bus:</strong> ${viaje.busPlaca} · <strong>Salida:</strong> ${new Date(viaje.salida).toLocaleString('es-BO')}</p>
        <table><thead><tr><th>Asiento</th><th>Nombre</th><th>CI</th><th>Teléfono</th></tr></thead>
        <tbody>${pasajerosFiltrados.map(p => `<tr><td>${p.asiento}</td><td>${p.nombre}</td><td>${p.ci}</td><td>${p.telefono || '—'}</td></tr>`).join('')}</tbody>
        </table></body></html>`;
        const w = window.open('', '_blank', 'width=700,height=600');
        w.document.write(html);
        w.document.close();
        w.print();
    };

    const handleLogout = async () => { await logout(); navigate('/'); };

    const badgeEstado = (estado) => {
        const m = {
            programado:  { bg: '#1e3a8a22', color: '#93c5fd', label: '📅 Programado' },
            en_ruta:     { bg: '#065f4622', color: '#6ee7b7', label: '🚌 En Ruta' },
            finalizado:  { bg: '#37415122', color: '#9ca3af', label: '✅ Finalizado' },
            cancelado:   { bg: '#7f1d1d22', color: '#fca5a5', label: '❌ Cancelado' },
        };
        const c = m[estado] || m.programado;
        return <span style={{ background: c.bg, color: c.color, padding: '0.3rem 0.8rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600 }}>{c.label}</span>;
    };

    return (
        <div ref={rootRef} style={{ background: '#07111f', minHeight: '100vh', color: '#dde5f0', fontFamily: "'Inter', system-ui, sans-serif" }}>

            {/* Header */}
            <header data-anim="header" style={{
                background: `linear-gradient(135deg, ${tema.bg} 0%, ${tema.colorSecundario}70 100%)`,
                borderBottom: `2px solid ${tema.color}50`,
                padding: '0.9rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                position: 'sticky', top: 0, zIndex: 20,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: 42, height: 42, borderRadius: '10px', background: `${tema.color}20`, border: `2px solid ${tema.color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>🚌</div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f1f5f9' }}>Panel del Conductor</div>
                        <div style={{ fontSize: '0.72rem', color: tema.acento }}>
                            {perfil?.nombre_completo || 'Conductor'} · <span style={{ color: tema.color }}>{deptNombre}</span>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ fontSize: '0.7rem', color: '#475569', textAlign: 'right' }}>
                        <div style={{ color: '#64748b' }}>🔄 Sync cada 15s</div>
                    </div>
                    <button onClick={handleLogout} style={{
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                        color: '#94a3b8', padding: '0.4rem 0.9rem', borderRadius: '8px',
                        cursor: 'pointer', fontSize: '0.8rem',
                    }}>Salir</button>
                </div>
            </header>

            <main style={{ maxWidth: 940, margin: '2rem auto', padding: '0 1rem' }}>
                <h2 style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: '1.5rem', marginTop: 0 }}>
                    Mis Viajes Asignados
                </h2>

                {viajes.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#475569', padding: '4rem', background: '#0d1a2e', borderRadius: '14px', border: '1px solid #1e293b' }}>
                        No tienes viajes asignados por el momento.
                    </div>
                )}

                {viajes.map(viaje => (
                    <div key={viaje.id} data-anim="card" style={{
                        background: '#0d1a2e', borderRadius: '14px',
                        border: `1px solid ${viaje.estado === 'en_ruta' ? tema.color + '60' : viaje.estado === 'cancelado' ? '#7f1d1d60' : '#1e293b'}`,
                        marginBottom: '1.5rem', overflow: 'hidden',
                        boxShadow: viaje.estado === 'en_ruta' ? `0 0 20px ${tema.color}15` : 'none',
                        transition: 'all 0.3s',
                    }}>
                        {/* Trip Header */}
                        <div style={{
                            padding: '1.25rem 1.5rem', background: '#07111f',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem',
                        }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f1f5f9' }}>
                                    {viaje.origen} → {viaje.destino}
                                </div>
                                <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                                    🚍 {viaje.busPlaca} · {new Date(viaje.salida).toLocaleString('es-BO')}
                                    {ciudadADepartamento(viaje.destino) !== deptNombre && (
                                        <span style={{ color: tema.acento, marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                                            → {ciudadADepartamento(viaje.destino)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {badgeEstado(viaje.estado)}
                        </div>

                        {/* Passenger List */}
                        {viaje.estado !== 'cancelado' && (
                            <div style={{ padding: '1rem 1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <div style={{ color: '#64748b', fontSize: '0.83rem', fontWeight: 600 }}>
                                        👥 {viaje.pasajeros.length} pasajeros
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <button onClick={() => setViajeActivo(viajeActivo === viaje.id ? null : viaje.id)} style={{
                                            background: `${tema.color}15`, border: `1px solid ${tema.color}30`,
                                            color: tema.acento, padding: '0.35rem 0.75rem', borderRadius: '6px',
                                            cursor: 'pointer', fontSize: '0.76rem',
                                        }}>
                                            {viajeActivo === viaje.id ? '▲ Ocultar' : '▼ Ver lista'}
                                        </button>
                                        <button onClick={() => imprimirManifiesto(viaje)} style={{
                                            background: 'rgba(16,185,129,0.1)', border: '1px solid #065f46',
                                            color: '#6ee7b7', padding: '0.35rem 0.75rem', borderRadius: '6px',
                                            cursor: 'pointer', fontSize: '0.76rem',
                                        }}>🖨️ Imprimir</button>
                                        <button onClick={() => exportarManifiesto(viaje)} style={{
                                            background: 'rgba(139,92,246,0.1)', border: '1px solid #4c1d95',
                                            color: '#c4b5fd', padding: '0.35rem 0.75rem', borderRadius: '6px',
                                            cursor: 'pointer', fontSize: '0.76rem',
                                        }}>⬇️ .TXT</button>
                                    </div>
                                </div>

                                {viajeActivo === viaje.id && (
                                    <>
                                        <input
                                            type="text" placeholder="Buscar por nombre o CI..."
                                            value={busquedaPasajero} onChange={e => setBusquedaPasajero(e.target.value)}
                                            style={{
                                                width: '100%', boxSizing: 'border-box',
                                                background: '#07111f', border: `1px solid ${tema.color}30`,
                                                color: '#f1f5f9', padding: '0.5rem 0.75rem',
                                                borderRadius: '8px', fontSize: '0.83rem', marginBottom: '0.75rem', outline: 'none',
                                            }}
                                        />
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: `1px solid ${tema.color}20` }}>
                                                        {['Asiento', 'Nombre', 'CI', 'Teléfono'].map(h => (
                                                            <th key={h} style={{ textAlign: 'left', padding: '0.5rem', color: '#475569', fontWeight: 500 }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {viaje.pasajeros.filter(p =>
                                                        !busquedaPasajero ||
                                                        p.nombre.toLowerCase().includes(busquedaPasajero.toLowerCase()) ||
                                                        p.ci.includes(busquedaPasajero)
                                                    ).map((p, i) => (
                                                        <tr key={i} style={{ borderBottom: '1px solid #07111f' }}>
                                                            <td style={{ padding: '0.55rem 0.5rem', color: tema.acento, fontWeight: 700 }}>{p.asiento}</td>
                                                            <td style={{ padding: '0.55rem 0.5rem', color: '#f1f5f9' }}>{p.nombre}</td>
                                                            <td style={{ padding: '0.55rem 0.5rem', color: '#94a3b8' }}>{p.ci}</td>
                                                            <td style={{ padding: '0.55rem 0.5rem', color: '#64748b' }}>{p.telefono || '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Trip Controls */}
                        <div style={{
                            padding: '1rem 1.5rem', background: '#07111f', borderTop: '1px solid #1e293b',
                            display: 'flex', gap: '0.75rem', flexWrap: 'wrap',
                        }}>
                            {viaje.estado === 'programado' && (
                                <>
                                    <button onClick={() => cambiarEstado(viaje.id, 'en_ruta', viaje)} style={{
                                        flex: 1, padding: '0.75rem', background: '#059669', color: '#fff',
                                        border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
                                        minWidth: 140, fontSize: '0.88rem',
                                    }}>🚀 Iniciar Viaje</button>

                                    {/* Confirmar cancelación */}
                                    {confirmandoCancelar === viaje.id ? (
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1 }}>
                                            <span style={{ color: '#fca5a5', fontSize: '0.8rem' }}>¿Confirmar cancelación?</span>
                                            <button onClick={() => handleCancelar(viaje.id)} style={{
                                                background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px',
                                                padding: '0.5rem 0.85rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
                                            }}>Sí, cancelar</button>
                                            <button onClick={() => setConfirmandoCancelar(null)} style={{
                                                background: '#1e293b', color: '#94a3b8', border: '1px solid #334155',
                                                borderRadius: '6px', padding: '0.5rem 0.85rem', cursor: 'pointer', fontSize: '0.8rem',
                                            }}>No</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setConfirmandoCancelar(viaje.id)} style={{
                                            padding: '0.75rem 1rem', background: 'rgba(220,38,38,0.08)',
                                            border: '1px solid #7f1d1d', color: '#fca5a5', borderRadius: '8px',
                                            fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem',
                                        }}>❌ Cancelar Viaje</button>
                                    )}
                                </>
                            )}

                            {viaje.estado === 'en_ruta' && (
                                <button onClick={() => cambiarEstado(viaje.id, 'finalizado', viaje)} style={{
                                    flex: 1, padding: '0.75rem', background: '#dc2626', color: '#fff',
                                    border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
                                    minWidth: 140, fontSize: '0.88rem',
                                }}>🏁 Finalizar Viaje</button>
                            )}

                            {viaje.estado === 'finalizado' && (
                                <div style={{ flex: 1, textAlign: 'center', color: '#475569', padding: '0.75rem', fontSize: '0.88rem' }}>
                                    Viaje completado ✅
                                    {ciudadADepartamento(viaje.destino) !== deptNombre && (
                                        <span style={{ color: tema.acento, marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                                            · Ahora en {ciudadADepartamento(viaje.destino)}
                                        </span>
                                    )}
                                </div>
                            )}

                            {viaje.estado === 'cancelado' && (
                                <div style={{ flex: 1, textAlign: 'center', color: '#fca5a5', padding: '0.75rem', fontSize: '0.88rem' }}>
                                    Viaje cancelado ❌
                                </div>
                            )}

                            {viaje.estado !== 'finalizado' && viaje.estado !== 'cancelado' && (
                                <>
                                    <button onClick={() => navigate('/conductor/mantenimiento')} style={{
                                        padding: '0.75rem 1rem', background: 'rgba(99,102,241,0.08)',
                                        border: '1px solid #312e81', color: '#a5b4fc', borderRadius: '8px',
                                        fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem',
                                    }}>🔧 Mantenimiento</button>
                                    <button onClick={() => navigate(`/conductor/incidencia/${viaje.id}`)} style={{
                                        padding: '0.75rem 1rem', background: 'rgba(220,38,38,0.08)',
                                        border: '1px solid #7f1d1d', color: '#fca5a5', borderRadius: '8px',
                                        fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem',
                                    }}>🚨 Incidencia</button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </main>
        </div>
    );
};

export default PanelConductor;
