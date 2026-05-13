import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import { obtenerReservas } from '../../data/mockStorage';

/**
 * MisViajes — Passenger travel history page.
 * R27: Historial de viajes del usuario.
 * Shows past and upcoming trips with ticket download option.
 */
const MisViajes = () => {
    const navigate = useNavigate();
    const { perfil, sesion } = useAuth();
    const [reservas, setReservas] = useState([]);
    const [filtro, setFiltro] = useState('todos'); // todos | proximos | pasados
    const [busqueda, setBusqueda] = useState('');

    useEffect(() => {
        if (!sesion || perfil?.rol !== 'cliente') {
            navigate('/login-cliente?redirect=/mis-viajes');
            return;
        }
        // Obtener todas las reservas del cliente actual
        const todas = obtenerReservas();
        const mias = todas.filter(r =>
            r.pasajeroCI === perfil?.ci ||
            r.pasajeroNombre?.toLowerCase() === (perfil?.nombreCompleto || '').toLowerCase()
        );
        setReservas(mias.sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn)));
    }, [sesion, perfil, navigate]);

    const ahora = new Date();

    const reservasFiltradas = reservas
        .filter(r => {
            if (filtro === 'proximos') return new Date(r.fechaSalida) >= ahora;
            if (filtro === 'pasados') return new Date(r.fechaSalida) < ahora;
            return true;
        })
        .filter(r => {
            if (!busqueda) return true;
            const q = busqueda.toLowerCase();
            return r.origen?.toLowerCase().includes(q) ||
                r.destino?.toLowerCase().includes(q) ||
                r.id?.includes(q);
        });

    const estadoViaje = (fechaSalida) => {
        const salida = new Date(fechaSalida);
        if (salida > ahora) return { label: '📅 Próximo', bg: '#1e3a8a', color: '#93c5fd' };
        return { label: '✅ Completado', bg: '#374151', color: '#9ca3af' };
    };

    return (
        <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: '#f1f5f9', padding: '1.5rem 1rem 3rem' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <button onClick={() => navigate(-1)} style={{
                        background: 'transparent', border: '1px solid #334155', color: '#94a3b8',
                        borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: 'pointer',
                    }}>← Volver</button>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Mis Viajes</h1>
                        <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                            Historial de {perfil?.nombreCompleto || perfil?.ci}
                        </div>
                    </div>
                </div>

                {/* Búsqueda */}
                <input
                    type="text"
                    placeholder="Buscar por ciudad o ID de reserva..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    style={{
                        width: '100%', boxSizing: 'border-box',
                        background: '#1e293b', border: '1px solid #334155',
                        color: '#f1f5f9', padding: '0.65rem 1rem',
                        borderRadius: '10px', fontSize: '0.9rem', marginBottom: '1rem',
                    }}
                />

                {/* Filtros */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    {[
                        { id: 'todos', label: `Todos (${reservas.length})` },
                        { id: 'proximos', label: `Próximos (${reservas.filter(r => new Date(r.fechaSalida) >= ahora).length})` },
                        { id: 'pasados', label: `Pasados (${reservas.filter(r => new Date(r.fechaSalida) < ahora).length})` },
                    ].map(f => (
                        <button key={f.id} onClick={() => setFiltro(f.id)} style={{
                            padding: '0.45rem 1rem', borderRadius: '20px', border: 'none',
                            background: filtro === f.id ? '#3b82f6' : '#1e293b',
                            color: filtro === f.id ? 'white' : '#94a3b8',
                            cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500,
                        }}>
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Lista de viajes */}
                {reservasFiltradas.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem 0' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🗺️</div>
                        <div>{busqueda ? 'Sin resultados para esa búsqueda.' : 'No tienes viajes en este filtro.'}</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {reservasFiltradas.map(reserva => {
                            const est = estadoViaje(reserva.fechaSalida);
                            return (
                                <div key={reserva.id} style={{
                                    background: '#1e293b', borderRadius: '12px',
                                    border: '1px solid #334155', overflow: 'hidden',
                                }}>
                                    <div style={{
                                        padding: '1rem 1.25rem', background: '#0f172a',
                                        display: 'flex', justifyContent: 'space-between',
                                        alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem'
                                    }}>
                                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                                            {reserva.origen} → {reserva.destino}
                                        </div>
                                        <span style={{
                                            background: est.bg, color: est.color,
                                            padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.78rem'
                                        }}>
                                            {est.label}
                                        </span>
                                    </div>
                                    <div style={{ padding: '1rem 1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        {[
                                            { label: 'Salida', valor: reserva.fechaSalida ? new Date(reserva.fechaSalida).toLocaleString('es-BO') : '—' },
                                            { label: 'Asientos', valor: reserva.asientos?.join(', ') || '—' },
                                            { label: 'Bus', valor: reserva.busPlaca || '—' },
                                            { label: 'Monto', valor: `Bs ${reserva.precio || 0}` },
                                            { label: 'Método', valor: reserva.metodoPago || 'efectivo' },
                                            { label: 'ID Reserva', valor: reserva.id?.slice(0, 12) + '...' },
                                        ].map(item => (
                                            <div key={item.label}>
                                                <div style={{ color: '#64748b', fontSize: '0.72rem', marginBottom: '0.1rem' }}>{item.label}</div>
                                                <div style={{ color: '#e2e8f0', fontSize: '0.88rem', fontWeight: 500 }}>{item.valor}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{
                                        padding: '0.75rem 1.25rem', borderTop: '1px solid #334155',
                                        display: 'flex', gap: '0.5rem',
                                    }}>
                                        <button
                                            onClick={() => navigate(`/reserva/${reserva.viajeId}`)}
                                            style={{
                                                background: 'rgba(59,130,246,0.1)', border: '1px solid #1e3a8a',
                                                color: '#60a5fa', borderRadius: '6px', padding: '0.4rem 0.8rem',
                                                cursor: 'pointer', fontSize: '0.8rem',
                                            }}>
                                            🎫 Ver Detalles
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MisViajes;
