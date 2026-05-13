import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../servicios/supabase';
import { useAuth } from '../../contextos/AuthContext';
import '../../estilos/escritorio/admin.css';
import '../../estilos/movil/admin-responsivo.css';

const AdminDashboard = () => {
    const { perfil, logout } = useAuth();
    const navigate = useNavigate();

    const [stats, setStats] = useState({ buses: 0, tripulacion: 0 });
    const [busesRecientes, setBusesRecientes] = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const fetchDatos = async () => {
            setCargando(true);
            try {
                // Total buses
                const { count: countBuses } = await supabase
                    .from('buses')
                    .select('*', { count: 'exact', head: true });

                // Total tripulación
                const { count: countTripulacion } = await supabase
                    .from('tripulacion')
                    .select('*', { count: 'exact', head: true });

                // Últimos 5 buses con nombre sucursal
                const { data: listaBuses } = await supabase
                    .from('buses')
                    .select(`
                        id, placa, capacidad, pisos, estado,
                        sucursales ( nombre )
                    `)
                    .order('placa', { ascending: false })
                    .limit(5);

                setStats({
                    buses: countBuses || 0,
                    tripulacion: countTripulacion || 0
                });

                if (listaBuses) setBusesRecientes(listaBuses);

            } catch (err) {
                console.error("Dashboard Fetch Error:", err);
            } finally {
                setCargando(false);
            }
        };

        fetchDatos();
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <div className="pagina-admin" style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
            {/* ── HEADER SUPERIOR DEDICADO ── */}
            <header className="admin-header" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <div style={{ flex: 1 }}>
                    <h1 style={{ margin: 0 }}>Terminal Dashboard</h1>
                    <div className="admin-header-sub">Gestión Centralizada</div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.85rem', color: '#f1f5f9', fontWeight: 600 }}>{perfil?.nombre_completo || perfil?.email}</span>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {perfil?.rol?.replace('_', ' ')}
                        </span>
                    </div>
                    <button onClick={handleLogout} className="btn-volver-admin" style={{ padding: '0.4rem 0.8rem', background: '#334155' }}>
                        Salir 🚪
                    </button>
                </div>
            </header>

            <div style={{ display: 'flex', flex: 1, backgroundColor: '#0f172a' }}>
                {/* ── SIDEBAR DESKTOP / NAVBAR MÓVIL ── */}
                <aside className="admin-sidebar" style={{ 
                    width: '240px', 
                    background: '#162032', 
                    borderRight: '1px solid #1e293b', 
                    padding: '1.5rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.5rem' 
                }}>
                    <div className="admin-seccion-titulo" style={{ marginBottom: '1rem', color: '#475569' }}>Acciones Rápidas</div>
                    
                    <Link to="/admin/bus/nuevo" style={{ textDecoration: 'none' }}>
                        <div className="toggle-btn" style={{ justifyContent: 'flex-start', border: '1px solid #334155' }}>
                            🚌 Registrar Bus
                        </div>
                    </Link>
                    
                    <Link to="/admin/tripulacion/nuevo" style={{ textDecoration: 'none' }}>
                        <div className="toggle-btn" style={{ justifyContent: 'flex-start', border: '1px solid #334155' }}>
                            🧍 Registrar Tripulación
                        </div>
                    </Link>
                </aside>

                {/* ── AREA PRINCIPAL ── */}
                <main style={{ flex: 1, padding: '2rem' }}>
                    {cargando ? (
                        <div style={{ color: '#64748b' }}>Cargando resumen...</div>
                    ) : (
                        <>
                            {/* KPI Metrics */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                                <div className="admin-seccion" style={{ margin: 0, padding: '1.5rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '2.5rem', color: '#3b82f6', fontWeight: 700, lineHeight: 1 }}>{stats.buses}</div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.5rem' }}>Buses Registrados</div>
                                </div>
                                <div className="admin-seccion" style={{ margin: 0, padding: '1.5rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '2.5rem', color: '#22c55e', fontWeight: 700, lineHeight: 1 }}>{stats.tripulacion}</div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.5rem' }}>Tripulantes Activos</div>
                                </div>
                            </div>

                            {/* Data Table Preview */}
                            <div className="admin-seccion">
                                <div className="admin-seccion-titulo">
                                    <span className="seccion-icono">📊</span> Flota Reciente
                                </div>
                                <div className="admin-seccion-cuerpo" style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', color: '#f1f5f9' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid #1e293b', textAlign: 'left', color: '#64748b' }}>
                                                <th style={{ padding: '0.8rem 0.5rem' }}>ID Placa</th>
                                                <th style={{ padding: '0.8rem 0.5rem' }}>Empresa</th>
                                                <th style={{ padding: '0.8rem 0.5rem' }}>Config</th>
                                                <th style={{ padding: '0.8rem 0.5rem' }}>Capacidad</th>
                                                <th style={{ padding: '0.8rem 0.5rem' }}>Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {busesRecientes.length === 0 ? (
                                                <tr><td colSpan="5" style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>No hay buses registrados.</td></tr>
                                            ) : (
                                                busesRecientes.map(bus => (
                                                    <tr key={bus.id} style={{ borderBottom: '1px solid #1e293b' }}>
                                                        <td style={{ padding: '0.8rem 0.5rem', fontWeight: 600 }}>{bus.placa}</td>
                                                        <td style={{ padding: '0.8rem 0.5rem' }}>{bus.sucursales?.nombre || 'Independiente'}</td>
                                                        <td style={{ padding: '0.8rem 0.5rem' }}>{bus.pisos} Piso{bus.pisos>1?'s':''}</td>
                                                        <td style={{ padding: '0.8rem 0.5rem' }}>{bus.capacidad} Asientos</td>
                                                        <td style={{ padding: '0.8rem 0.5rem' }}>
                                                            <span style={{ 
                                                                background: bus.estado === 'disponible' ? '#064e3b' : '#7f1d1d',
                                                                color: bus.estado === 'disponible' ? '#34d399' : '#fca5a5',
                                                                padding: '0.2rem 0.5rem',
                                                                borderRadius: '4px',
                                                                fontSize: '0.75rem',
                                                                textTransform: 'uppercase'
                                                            }}>
                                                                {bus.estado}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </main>
            </div>
            
            {/* CSS Patch Inline for Mobile Sidebar hiding behavior if needed */}
            <style>{`
                @media (max-width: 768px) {
                    .admin-sidebar {
                        width: 100% !important;
                        border-right: none !important;
                        border-bottom: 1px solid #1e293b;
                        padding: 1rem !important;
                        flex-direction: row !important;
                        flex-wrap: wrap;
                    }
                    .admin-sidebar > a { flex: 1; min-width: 140px; }
                }
            `}</style>
        </div>
    );
};

export default AdminDashboard;
