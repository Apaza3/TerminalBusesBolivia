// [Académico] Sprint 5 - Manifiesto de pasajeros PDF (RN-01)
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import { obtenerManifiestoItinerario } from '../../servicios/analyticsService';
import { VIAJES_CONDUCTOR_MOCK } from '../../data/mockStorage';
import ExportReportes from '../../componentes/ExportReportes';
import gsap from 'gsap';

const COLS_PDF = ['Pasajero', 'CI', 'Asientos', 'Origen', 'Destino', 'Salida', 'Precio (Bs)', 'Abordado'];

const ManifiestoPDF = () => {
    const { perfil } = useAuth();
    const deptNombre = perfil?.departamento || 'La Paz';
    const tema = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];
    const containerRef = useRef(null);

    const [itinerarioId, setItinerarioId] = useState('');
    const [manifiesto, setManifiesto] = useState([]);
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-anim="sec"]', { y: 22, opacity: 0, duration: 0.45, stagger: 0.07, ease: 'power3.out' });
        }, containerRef);
        return () => ctx.revert();
    }, []);

    useEffect(() => {
        if (!itinerarioId) { setManifiesto([]); return; }
        setCargando(true);
        // [Académico] Sprint 5 - RN-01: obtener manifiesto desde analyticsService
        obtenerManifiestoItinerario(itinerarioId).then(data => {
            setManifiesto(data || []);
            setCargando(false);
        });
    }, [itinerarioId]);

    const viaje = VIAJES_CONDUCTOR_MOCK.find(v => v.id === itinerarioId);

    const filasExport = manifiesto.map(p => [
        p.pasajeroNombre, p.pasajeroCI,
        Array.isArray(p.asientos) ? p.asientos.join(', ') : (p.asientos || '—'),
        p.origen, p.destino,
        p.fechaSalida ? new Date(p.fechaSalida).toLocaleString('es-BO') : '—',
        p.precio || 0,
        p.abordado ? 'Sí' : 'No',
    ]);
    const datosExcel = manifiesto.map(p => ({
        Pasajero: p.pasajeroNombre, CI: p.pasajeroCI,
        Asientos: Array.isArray(p.asientos) ? p.asientos.join(', ') : (p.asientos || '—'),
        Origen: p.origen, Destino: p.destino,
        Salida: p.fechaSalida ? new Date(p.fechaSalida).toLocaleString('es-BO') : '—',
        'Precio (Bs)': p.precio || 0, Abordado: p.abordado ? 'Sí' : 'No',
    }));

    const tituloExport = viaje
        ? `Manifiesto — ${viaje.origen} → ${viaje.destino} (${viaje.busPlaca || ''})`
        : 'Manifiesto de Pasajeros';

    return (
        <div ref={containerRef} style={{ color: '#f1f5f9', fontFamily: "'Inter', system-ui, sans-serif" }}>

            <div style={{ maxWidth: 900, margin: '2rem auto', padding: '0 1rem' }}>

                {/* Título */}
                <div data-anim="sec" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                        <div style={{
                            fontSize: 'clamp(1.5rem,3.5vw,2rem)', fontWeight: 900,
                            background: `linear-gradient(90deg, ${tema.color}, ${tema.colorSecundario})`,
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            fontFamily: "'Rajdhani', system-ui, sans-serif",
                            textTransform: 'uppercase', lineHeight: 1.1,
                        }}>Manifiesto de Pasajeros</div>
                        <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '0.2rem' }}>
                            Lista oficial de pasajeros por itinerario
                        </div>
                    </div>
                    {manifiesto.length > 0 && (
                        <ExportReportes
                            titulo={tituloExport}
                            columnas={COLS_PDF} filas={filasExport}
                            datosExcel={datosExcel}
                            nombreArchivo={`manifiesto_${itinerarioId.slice(0, 8)}`}
                        />
                    )}
                </div>

                {/* Selector de itinerario */}
                <div data-anim="sec" style={{ background: '#1e293b', borderRadius: 12, padding: '1.25rem', border: '1px solid #334155', marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>
                        Seleccionar itinerario
                    </div>
                    <select
                        value={itinerarioId}
                        onChange={e => setItinerarioId(e.target.value)}
                        style={{
                            width: '100%', background: '#0f172a', border: `1px solid ${tema.color}30`,
                            color: '#f1f5f9', borderRadius: 8, padding: '0.65rem 0.9rem',
                            fontSize: '0.88rem', outline: 'none',
                        }}
                    >
                        <option value="">-- Selecciona un viaje --</option>
                        {VIAJES_CONDUCTOR_MOCK.map(v => (
                            <option key={v.id} value={v.id}>
                                {v.origen} → {v.destino} · {v.busPlaca} · {new Date(v.fechaSalida).toLocaleDateString('es-BO')}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Manifiesto */}
                {cargando ? (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>Cargando manifiesto...</div>
                ) : itinerarioId && manifiesto.length === 0 ? (
                    <div data-anim="sec" style={{ textAlign: 'center', color: '#64748b', padding: '2.5rem', background: '#1e293b', borderRadius: 12, border: '1px solid #334155' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
                        Sin pasajeros registrados para este itinerario.
                    </div>
                ) : manifiesto.length > 0 ? (
                    <div data-anim="sec" style={{ background: '#1e293b', borderRadius: 14, border: '1px solid #334155', overflow: 'hidden' }}>

                        {/* Resumen */}
                        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ fontWeight: 700, color: '#f1f5f9' }}>
                                {viaje ? `${viaje.origen} → ${viaje.destino}` : 'Manifiesto'}
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                                <span><span style={{ color: '#10b981', fontWeight: 700 }}>{manifiesto.filter(p => p.abordado).length}</span> <span style={{ color: '#64748b' }}>abordados</span></span>
                                <span><span style={{ color: '#f59e0b', fontWeight: 700 }}>{manifiesto.length}</span> <span style={{ color: '#64748b' }}>total</span></span>
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                <thead>
                                    <tr style={{ background: '#0f172a' }}>
                                        {['#', 'Pasajero', 'CI', 'Asientos', 'Precio', 'Abordado'].map(h => (
                                            <th key={h} style={{ padding: '0.6rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {manifiesto.map((p, i) => (
                                        <tr key={i} style={{ borderTop: '1px solid #0f172a', background: p.abordado ? 'rgba(16,185,129,0.04)' : 'transparent' }}>
                                            <td style={{ padding: '0.65rem 1rem', color: '#475569' }}>{i + 1}</td>
                                            <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: '#f1f5f9' }}>{p.pasajeroNombre}</td>
                                            <td style={{ padding: '0.65rem 1rem', color: '#94a3b8', fontFamily: 'monospace' }}>{p.pasajeroCI}</td>
                                            <td style={{ padding: '0.65rem 1rem', color: tema.acento, fontWeight: 700 }}>
                                                {Array.isArray(p.asientos) ? p.asientos.join(', ') : (p.asientos || '—')}
                                            </td>
                                            <td style={{ padding: '0.65rem 1rem', color: '#10b981', fontWeight: 600 }}>Bs {p.precio || 0}</td>
                                            <td style={{ padding: '0.65rem 1rem' }}>
                                                <span style={{
                                                    padding: '0.18rem 0.6rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700,
                                                    background: p.abordado ? 'rgba(16,185,129,0.15)' : '#1e293b',
                                                    color: p.abordado ? '#6ee7b7' : '#64748b',
                                                    border: `1px solid ${p.abordado ? '#065f46' : '#334155'}`,
                                                }}>
                                                    {p.abordado ? '✓ Presente' : 'Pendiente'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', color: '#475569', padding: '2rem', fontSize: '0.88rem' }}>
                        Selecciona un itinerario para ver el manifiesto.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManifiestoPDF;
