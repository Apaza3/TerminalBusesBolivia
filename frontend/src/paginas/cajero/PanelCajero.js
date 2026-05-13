import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import { obtenerReservas, obtenerVentas } from '../../data/mockStorage';
import '../../estilos/escritorio/admin.css';
import '../../estilos/movil/admin-responsivo.css';

/**
 * PanelCajero — Cashier panel for managing reservations, processing cash/QR payments.
 * Role: cajero
 */
const PanelCajero = () => {
    const navigate = useNavigate();
    const { perfil, logout } = useAuth();
    const [reservas, setReservas] = useState([]);
    const [ventas, setVentas] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [tab, setTab] = useState('reservas'); // reservas | ventas

    useEffect(() => {
        setReservas(obtenerReservas());
        setVentas(obtenerVentas());
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const reservasFiltradas = reservas.filter(r =>
        !busqueda ||
        r.pasajeroNombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.pasajeroCI?.includes(busqueda) ||
        r.id?.includes(busqueda)
    );

    const totalVentas = ventas.reduce((acc, v) => acc + (v.monto || 0), 0);
    const totalBoletos = ventas.reduce((acc, v) => acc + (v.boletos || 0), 0);

    return (
        <div className="pagina-admin">
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>🏷️ Panel de Cajero</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                        {perfil?.nombre_completo || perfil?.email}
                    </div>
                </div>
                <button onClick={handleLogout} style={{
                    background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
                    padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 500
                }}>
                    Cerrar Sesión
                </button>
            </div>

            <main style={{ maxWidth: '1000px', margin: '1.5rem auto', padding: '0 1rem' }}>

                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    {[
                        { label: 'Reservas totales', valor: reservas.length, color: '#3b82f6', icon: '🎫' },
                        { label: 'Ventas del día', valor: ventas.length, color: '#10b981', icon: '💰' },
                        { label: 'Ingresos totales', valor: `Bs ${totalVentas.toFixed(2)}`, color: '#f59e0b', icon: '📊' },
                        { label: 'Boletos vendidos', valor: totalBoletos, color: '#8b5cf6', icon: '🏷️' },
                    ].map(kpi => (
                        <div key={kpi.label} style={{
                            background: '#1e293b', borderRadius: '10px', padding: '1rem',
                            border: `1px solid ${kpi.color}30`,
                        }}>
                            <div style={{ fontSize: '1.5rem' }}>{kpi.icon}</div>
                            <div style={{ color: kpi.color, fontSize: '1.4rem', fontWeight: 700 }}>{kpi.valor}</div>
                            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{kpi.label}</div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    {[
                        { id: 'reservas', label: '🎫 Reservas' },
                        { id: 'ventas', label: '💰 Ventas' },
                    ].map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none',
                            background: tab === t.id ? '#3b82f6' : '#1e293b',
                            color: tab === t.id ? 'white' : '#94a3b8',
                            cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                        }}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Búsqueda */}
                <input
                    type="text"
                    placeholder="Buscar por nombre, CI o ID de reserva..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    style={{
                        width: '100%', boxSizing: 'border-box',
                        background: '#1e293b', border: '1px solid #334155',
                        color: '#f1f5f9', padding: '0.65rem 1rem',
                        borderRadius: '10px', fontSize: '0.9rem',
                        marginBottom: '1rem',
                    }}
                />

                {/* Tab: Reservas */}
                {tab === 'reservas' && (
                    <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
                        {reservasFiltradas.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                                {busqueda ? 'Sin resultados para la búsqueda.' : 'No hay reservas registradas.'}
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155' }}>
                                            {['ID', 'Pasajero', 'CI', 'Ruta', 'Asientos', 'Monto', 'Estado', 'Fecha'].map(h => (
                                                <th key={h} style={{ padding: '0.75rem 0.5rem', textAlign: 'left', color: '#94a3b8', fontWeight: 500 }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reservasFiltradas.map(r => (
                                            <tr key={r.id} style={{ borderBottom: '1px solid #1e293b' }}>
                                                <td style={{ padding: '0.6rem 0.5rem', color: '#475569', fontSize: '0.7rem' }}>{r.id.slice(0, 12)}...</td>
                                                <td style={{ padding: '0.6rem 0.5rem', color: '#f1f5f9', fontWeight: 500 }}>{r.pasajeroNombre}</td>
                                                <td style={{ padding: '0.6rem 0.5rem', color: '#94a3b8' }}>{r.pasajeroCI}</td>
                                                <td style={{ padding: '0.6rem 0.5rem', color: '#94a3b8' }}>{r.origen} → {r.destino}</td>
                                                <td style={{ padding: '0.6rem 0.5rem', color: '#60a5fa' }}>{r.asientos?.join(', ')}</td>
                                                <td style={{ padding: '0.6rem 0.5rem', color: '#10b981', fontWeight: 600 }}>Bs {r.precio}</td>
                                                <td style={{ padding: '0.6rem 0.5rem' }}>
                                                    <span style={{
                                                        background: r.estado === 'confirmada' ? '#065f46' : '#7f1d1d',
                                                        color: r.estado === 'confirmada' ? '#6ee7b7' : '#fca5a5',
                                                        padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem'
                                                    }}>
                                                        {r.estado}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '0.6rem 0.5rem', color: '#64748b', fontSize: '0.75rem' }}>
                                                    {new Date(r.creadoEn).toLocaleDateString('es-BO')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Ventas */}
                {tab === 'ventas' && (
                    <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
                        {ventas.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>No hay ventas registradas.</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155' }}>
                                            {['Venta ID', 'Ruta', 'Boletos', 'Monto', 'Fecha'].map(h => (
                                                <th key={h} style={{ padding: '0.75rem 0.5rem', textAlign: 'left', color: '#94a3b8', fontWeight: 500 }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ventas.map(v => (
                                            <tr key={v.id} style={{ borderBottom: '1px solid #1e293b' }}>
                                                <td style={{ padding: '0.6rem 0.5rem', color: '#475569', fontSize: '0.7rem' }}>{v.id}</td>
                                                <td style={{ padding: '0.6rem 0.5rem', color: '#f1f5f9' }}>{v.ruta}</td>
                                                <td style={{ padding: '0.6rem 0.5rem', color: '#60a5fa', fontWeight: 600 }}>{v.boletos}</td>
                                                <td style={{ padding: '0.6rem 0.5rem', color: '#10b981', fontWeight: 600 }}>Bs {v.monto}</td>
                                                <td style={{ padding: '0.6rem 0.5rem', color: '#64748b', fontSize: '0.75rem' }}>
                                                    {new Date(v.fecha).toLocaleString('es-BO')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default PanelCajero;
