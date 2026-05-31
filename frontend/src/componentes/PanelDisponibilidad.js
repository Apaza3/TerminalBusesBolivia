import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getBusesSucursal, getTripulacionSucursal, updateEstadoBus, updateEstadoTripulacion } from '../servicios/api';

const BUS_ESTADOS = {
    disponible:    { color: '#10b981', bg: '#14532d22', label: 'Disponible',    dot: '#10b981' },
    en_viaje:      { color: '#f59e0b', bg: '#78350f22', label: 'En Viaje',      dot: '#f59e0b' },
    mantenimiento: { color: '#ef4444', bg: '#7f1d1d22', label: 'Mantenimiento', dot: '#ef4444' },
    inactivo:      { color: '#64748b', bg: '#37415122', label: 'Inactivo',      dot: '#64748b' },
};

const TRIP_ESTADOS = {
    disponible: { color: '#10b981', bg: '#14532d22', label: 'Disponible' },
    en_viaje:   { color: '#f59e0b', bg: '#78350f22', label: 'En Viaje'   },
    descanso:   { color: '#8b5cf6', bg: '#4c1d9522', label: 'Descanso'   },
    inactivo:   { color: '#64748b', bg: '#37415122', label: 'Inactivo'   },
};

const ROL_TRIP = {
    conductor: '🚗 Conductor',
    copiloto:  '🧭 Copiloto',
};

const POLL_MS = 30_000;

export default function PanelDisponibilidad({ sucursalId, color = '#3b82f6', soloLectura = false }) {
    const [buses,       setBuses]       = useState([]);
    const [tripulacion, setTripulacion] = useState([]);
    const [cargando,    setCargando]    = useState(true);
    const [seccion,     setSeccion]     = useState('buses'); // 'buses' | 'conductores'
    const pollRef = useRef(null);

    const cargar = useCallback(async () => {
        if (!sucursalId) return;
        const [b, t] = await Promise.all([
            getBusesSucursal(sucursalId),
            getTripulacionSucursal(sucursalId),
        ]);
        setBuses(b);
        setTripulacion(t);
        setCargando(false);
    }, [sucursalId]);

    useEffect(() => {
        cargar();
        pollRef.current = setInterval(cargar, POLL_MS);
        return () => clearInterval(pollRef.current);
    }, [cargar]);

    const cambiarEstadoBus = async (id, estado) => {
        setBuses(prev => prev.map(b => b.id === id ? { ...b, estado } : b));
        await updateEstadoBus(id, estado);
    };

    const cambiarEstadoTrip = async (id, estado) => {
        setTripulacion(prev => prev.map(t => t.id === id ? { ...t, estado } : t));
        await updateEstadoTripulacion(id, estado);
    };

    // ── Resumen
    const bDisp  = buses.filter(b => b.estado === 'disponible').length;
    const bViaje = buses.filter(b => b.estado === 'en_viaje').length;
    const bMant  = buses.filter(b => b.estado === 'mantenimiento').length;
    const tDisp  = tripulacion.filter(t => t.estado === 'disponible').length;
    const tViaje = tripulacion.filter(t => t.estado === 'en_viaje').length;
    const tDesc  = tripulacion.filter(t => t.estado === 'descanso').length;

    if (cargando) return (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#475569', fontSize: '0.85rem' }}>
            Cargando disponibilidad…
        </div>
    );

    const tabBtn = (id, label, count) => (
        <button key={id} onClick={() => setSeccion(id)} style={{
            padding: '0.45rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.83rem', fontWeight: seccion === id ? 700 : 400,
            border: `1px solid ${seccion === id ? color + '55' : '#1e293b'}`,
            background: seccion === id ? `${color}18` : '#0d1a2e',
            color: seccion === id ? color : '#64748b', transition: 'all 0.15s',
        }}>
            {label} <span style={{ marginLeft: '0.3rem', background: seccion === id ? `${color}30` : '#1e293b', borderRadius: '999px', padding: '0.05rem 0.45rem', fontSize: '0.72rem' }}>{count}</span>
        </button>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* ── KPI summary row ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: '0.75rem' }}>
                {[
                    { label: 'Buses libres',  valor: bDisp,  color: '#10b981', icon: '🟢' },
                    { label: 'Buses en ruta', valor: bViaje, color: '#f59e0b', icon: '🟡' },
                    { label: 'Mantenimiento', valor: bMant,  color: '#ef4444', icon: '🔴' },
                    { label: 'En descanso',   valor: tDesc,  color: '#8b5cf6', icon: '😴' },
                ].map(k => (
                    <div key={k.label} style={{
                        background: '#07111f', borderRadius: '10px', padding: '0.85rem',
                        border: `1px solid ${k.color}22`, textAlign: 'center',
                    }}>
                        <div style={{ fontSize: '1.1rem' }}>{k.icon}</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: k.color, lineHeight: 1.1 }}>{k.valor}</div>
                        <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '0.15rem' }}>{k.label}</div>
                    </div>
                ))}
            </div>

            {/* ── Section tabs ── */}
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                {tabBtn('buses',      '🚌 Buses',      buses.length)}
                {tabBtn('conductores','👨‍✈️ Tripulación', tripulacion.length)}
                <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: '#334155' }}>
                    🔄 actualiza cada 30s
                </span>
            </div>

            {/* ── Buses grid ── */}
            {seccion === 'buses' && (
                buses.length === 0
                    ? <div style={{ padding: '2rem', textAlign: 'center', color: '#475569' }}>Sin buses registrados.</div>
                    : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '0.85rem' }}>
                        {buses.map(bus => {
                            const est = BUS_ESTADOS[bus.estado] || BUS_ESTADOS.inactivo;
                            return (
                                <div key={bus.id} style={{
                                    background: '#0a1628', borderRadius: '12px',
                                    border: `1px solid ${est.color}35`,
                                    padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem',
                                    boxShadow: `0 0 14px ${est.color}10`,
                                }}>
                                    {/* Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontWeight: 800, color: color, fontFamily: 'monospace', fontSize: '1rem', letterSpacing: '0.05em' }}>{bus.placa}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>{[bus.marca, bus.modelo].filter(Boolean).join(' ') || 'Sin modelo'}</div>
                                        </div>
                                        <span style={{
                                            background: est.bg, color: est.color,
                                            padding: '0.18rem 0.55rem', borderRadius: '999px',
                                            fontSize: '0.68rem', fontWeight: 700,
                                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                                        }}>
                                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: est.dot, display: 'inline-block' }} />
                                            {est.label}
                                        </span>
                                    </div>

                                    {/* Specs */}
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {[
                                            `${bus.pisos || 1}P`,
                                            `${bus.capacidad} asientos`,
                                            bus.categoria || '',
                                            bus.anio || '',
                                        ].filter(Boolean).map(tag => (
                                            <span key={tag} style={{ background: '#07111f', color: '#475569', borderRadius: '4px', padding: '0.1rem 0.4rem', fontSize: '0.68rem' }}>{tag}</span>
                                        ))}
                                        {bus.tiene_bano && <span style={{ background: '#07111f', color: '#475569', borderRadius: '4px', padding: '0.1rem 0.4rem', fontSize: '0.68rem' }}>🚿 Baño</span>}
                                    </div>

                                    {/* Estado selector (solo admin) */}
                                    {!soloLectura && (
                                        <select value={bus.estado || 'disponible'} onChange={e => cambiarEstadoBus(bus.id, e.target.value)}
                                            style={{ background: '#07111f', border: `1px solid ${color}30`, borderRadius: '6px', color: '#94a3b8', fontSize: '0.75rem', padding: '0.3rem 0.5rem', cursor: 'pointer' }}>
                                            <option value="disponible">✅ Disponible</option>
                                            <option value="en_viaje">🚌 En Viaje</option>
                                            <option value="mantenimiento">🔧 Mantenimiento</option>
                                            <option value="inactivo">⛔ Inactivo</option>
                                        </select>
                                    )}
                                </div>
                            );
                        })}
                    </div>
            )}

            {/* ── Tripulación grid ── */}
            {seccion === 'conductores' && (
                tripulacion.length === 0
                    ? <div style={{ padding: '2rem', textAlign: 'center', color: '#475569' }}>Sin tripulación registrada.</div>
                    : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '0.85rem' }}>
                        {tripulacion.map(t => {
                            const est = TRIP_ESTADOS[t.estado] || TRIP_ESTADOS.inactivo;
                            return (
                                <div key={t.id} style={{
                                    background: '#0a1628', borderRadius: '12px',
                                    border: `1px solid ${est.color}35`,
                                    padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem',
                                    boxShadow: `0 0 14px ${est.color}10`,
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.9rem' }}>{t.nombre}</div>
                                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.1rem' }}>{ROL_TRIP[t.rol] || t.rol}</div>
                                        </div>
                                        <span style={{
                                            background: est.bg, color: est.color,
                                            padding: '0.18rem 0.55rem', borderRadius: '999px',
                                            fontSize: '0.68rem', fontWeight: 700,
                                        }}>
                                            {est.label}
                                        </span>
                                    </div>

                                    {t.ci && <div style={{ fontSize: '0.72rem', color: '#475569' }}>CI: {t.ci}</div>}

                                    {t.rutas_conocidas?.length > 0 && (
                                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                            {t.rutas_conocidas.slice(0, 4).map(r => (
                                                <span key={r} style={{ background: `${color}18`, color, borderRadius: '4px', padding: '0.1rem 0.4rem', fontSize: '0.65rem', fontWeight: 600 }}>{r}</span>
                                            ))}
                                        </div>
                                    )}

                                    {!soloLectura && (
                                        <select value={t.estado || 'disponible'} onChange={e => cambiarEstadoTrip(t.id, e.target.value)}
                                            style={{ background: '#07111f', border: `1px solid ${color}30`, borderRadius: '6px', color: '#94a3b8', fontSize: '0.75rem', padding: '0.3rem 0.5rem', cursor: 'pointer' }}>
                                            <option value="disponible">✅ Disponible</option>
                                            <option value="en_viaje">🚌 En Viaje</option>
                                            <option value="descanso">😴 Descanso</option>
                                            <option value="inactivo">⛔ Inactivo</option>
                                        </select>
                                    )}
                                </div>
                            );
                        })}
                    </div>
            )}
        </div>
    );
}
