import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import { obtenerTodosStaff, cambiarEstadoCuenta, registrarStaff } from '../../data/mockAuthDB';
import { obtenerReservas, obtenerVentas } from '../../data/mockStorage';
import { BUSES_MOCK } from '../../data/mockStaffDB';
import '../../estilos/escritorio/admin.css';
import '../../estilos/movil/admin-responsivo.css';

const AdminDashboard = () => {
    const { perfil, logout } = useAuth();
    const navigate = useNavigate();

    const [stats, setStats] = useState({ buses: 0, tripulacion: 0, reservas: 0, ventas: 0 });
    const [busesRecientes, setBusesRecientes] = useState([]);
    const [tabActivo, setTabActivo] = useState('flota'); // flota | usuarios
    const [usuarios, setUsuarios] = useState([]);
    const [mostrarFormUsuario, setMostrarFormUsuario] = useState(false);
    const [formUsuario, setFormUsuario] = useState({ email: '', password: '', rol: 'cajero', nombre_completo: '', ci: '', telefono: '' });
    const [mensajeUsuario, setMensajeUsuario] = useState(null);

    useEffect(() => {
        // Cargar datos locales
        const buses = Object.values(BUSES_MOCK);
        const reservas = obtenerReservas();
        const ventas = obtenerVentas();
        const staff = obtenerTodosStaff();

        setStats({
            buses: buses.length,
            tripulacion: staff.filter(u => u.rol === 'conductor').length,
            reservas: reservas.length,
            ventas: ventas.length,
        });

        setBusesRecientes(buses.slice(0, 5).map(b => ({
            id: b.id, placa: b.placa, capacidad: b.capacidad,
            pisos: b.pisos, estado: 'disponible', tipo: b.tipo,
        })));

        setUsuarios(staff);
    }, []);

    const recargarUsuarios = () => {
        setUsuarios(obtenerTodosStaff());
    };

    const handleToggleCuenta = (userId, activo) => {
        const resultado = cambiarEstadoCuenta(userId, !activo);
        if (resultado.exito) recargarUsuarios();
        else alert(resultado.error);
    };

    const handleCrearUsuario = (e) => {
        e.preventDefault();
        setMensajeUsuario(null);
        const resultado = registrarStaff({ ...formUsuario, sucursal_id: 'demo-s1' });
        if (resultado.exito) {
            setMensajeUsuario({ tipo: 'ok', texto: 'Usuario creado exitosamente.' });
            setMostrarFormUsuario(false);
            setFormUsuario({ email: '', password: '', rol: 'cajero', nombre_completo: '', ci: '', telefono: '' });
            recargarUsuarios();
        } else {
            setMensajeUsuario({ tipo: 'error', texto: resultado.error });
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const ROL_COLORS = {
        admin_sucursal: { bg: '#1e3a8a', color: '#93c5fd', label: 'Admin' },
        cajero: { bg: '#78350f', color: '#fde68a', label: 'Cajero' },
        conductor: { bg: '#064e3b', color: '#6ee7b7', label: 'Conductor' },
        cliente: { bg: '#4c1d95', color: '#c4b5fd', label: 'Cliente' },
    };

    return (
        <div className="pagina-admin" style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
            {/* Header */}
            <header className="admin-header" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <div style={{ flex: 1 }}>
                    <h1 style={{ margin: 0 }}>Terminal Dashboard</h1>
                    <div className="admin-header-sub">Gestión Centralizada</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.85rem', color: '#f1f5f9', fontWeight: 600 }}>
                            {perfil?.nombre_completo || perfil?.email}
                        </span>
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
                {/* Sidebar */}
                <aside className="admin-sidebar" style={{
                    width: '240px', background: '#162032', borderRight: '1px solid #1e293b',
                    padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem'
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

                    <Link to="/admin/analitica" style={{ textDecoration: 'none' }}>
                        <div className="toggle-btn" style={{ justifyContent: 'flex-start', border: '1px solid #334155' }}>
                            📊 Dashboard Analítico
                        </div>
                    </Link>

                    <div style={{ height: '1px', background: '#1e293b', margin: '0.5rem 0' }} />

                    <div className="admin-seccion-titulo" style={{ color: '#475569', fontSize: '0.75rem' }}>Vistas</div>
                    {[
                        { id: 'flota', label: '🚌 Flota' },
                        { id: 'usuarios', label: '👥 Usuarios Staff' },
                    ].map(t => (
                        <button key={t.id} onClick={() => setTabActivo(t.id)} style={{
                            background: tabActivo === t.id ? 'rgba(59,130,246,0.2)' : 'transparent',
                            border: tabActivo === t.id ? '1px solid #3b82f6' : '1px solid transparent',
                            color: tabActivo === t.id ? '#60a5fa' : '#94a3b8',
                            borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: 'pointer',
                            textAlign: 'left', fontSize: '0.85rem',
                        }}>
                            {t.label}
                        </button>
                    ))}
                </aside>

                {/* Main */}
                <main style={{ flex: 1, padding: '2rem' }}>
                    {/* KPIs */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                        {[
                            { label: 'Buses', valor: stats.buses, color: '#3b82f6', icon: '🚌' },
                            { label: 'Conductores', valor: stats.tripulacion, color: '#10b981', icon: '🧑‍✈️' },
                            { label: 'Reservas', valor: stats.reservas, color: '#f59e0b', icon: '🎫' },
                            { label: 'Ventas', valor: stats.ventas, color: '#8b5cf6', icon: '💰' },
                        ].map(kpi => (
                            <div key={kpi.label} className="admin-seccion" style={{ margin: 0, padding: '1.25rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.6rem' }}>{kpi.icon}</div>
                                <div style={{ fontSize: '2rem', color: kpi.color, fontWeight: 700, lineHeight: 1.2 }}>{kpi.valor}</div>
                                <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.25rem' }}>{kpi.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Tab: Flota */}
                    {tabActivo === 'flota' && (
                        <div className="admin-seccion">
                            <div className="admin-seccion-titulo">
                                <span className="seccion-icono">📊</span> Flota Registrada
                            </div>
                            <div className="admin-seccion-cuerpo" style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', color: '#f1f5f9' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #1e293b', textAlign: 'left', color: '#64748b' }}>
                                            <th style={{ padding: '0.8rem 0.5rem' }}>Placa</th>
                                            <th style={{ padding: '0.8rem 0.5rem' }}>Tipo</th>
                                            <th style={{ padding: '0.8rem 0.5rem' }}>Pisos</th>
                                            <th style={{ padding: '0.8rem 0.5rem' }}>Capacidad</th>
                                            <th style={{ padding: '0.8rem 0.5rem' }}>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {busesRecientes.map(bus => (
                                            <tr key={bus.id} style={{ borderBottom: '1px solid #1e293b' }}>
                                                <td style={{ padding: '0.8rem 0.5rem', fontWeight: 600 }}>{bus.placa}</td>
                                                <td style={{ padding: '0.8rem 0.5rem', color: '#94a3b8' }}>{bus.tipo}</td>
                                                <td style={{ padding: '0.8rem 0.5rem' }}>{bus.pisos}</td>
                                                <td style={{ padding: '0.8rem 0.5rem' }}>{bus.capacidad}</td>
                                                <td style={{ padding: '0.8rem 0.5rem' }}>
                                                    <span style={{
                                                        background: '#064e3b', color: '#34d399',
                                                        padding: '0.2rem 0.5rem', borderRadius: '4px',
                                                        fontSize: '0.75rem', textTransform: 'uppercase'
                                                    }}>
                                                        {bus.estado}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Tab: Usuarios Staff — R6 Control de cuentas */}
                    {tabActivo === 'usuarios' && (
                        <div className="admin-seccion">
                            <div className="admin-seccion-titulo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span><span className="seccion-icono">👥</span> Usuarios Staff</span>
                                <button onClick={() => setMostrarFormUsuario(!mostrarFormUsuario)} style={{
                                    background: '#3b82f6', color: 'white', border: 'none',
                                    borderRadius: '8px', padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.85rem',
                                }}>
                                    {mostrarFormUsuario ? '✕ Cancelar' : '+ Nuevo Usuario'}
                                </button>
                            </div>

                            {mensajeUsuario && (
                                <div style={{
                                    padding: '0.75rem 1rem', margin: '0.5rem 0',
                                    background: mensajeUsuario.tipo === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                    color: mensajeUsuario.tipo === 'ok' ? '#6ee7b7' : '#fca5a5',
                                    borderRadius: '8px', border: `1px solid ${mensajeUsuario.tipo === 'ok' ? '#065f46' : '#7f1d1d'}`,
                                }}>
                                    {mensajeUsuario.texto}
                                </div>
                            )}

                            {/* Formulario nuevo usuario */}
                            {mostrarFormUsuario && (
                                <form onSubmit={handleCrearUsuario} style={{
                                    background: '#0f172a', borderRadius: '10px', padding: '1.25rem',
                                    margin: '1rem 0', border: '1px solid #334155',
                                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
                                }}>
                                    {[
                                        { key: 'nombre_completo', label: 'Nombre Completo', type: 'text' },
                                        { key: 'email', label: 'Correo', type: 'email' },
                                        { key: 'password', label: 'Contraseña', type: 'password' },
                                        { key: 'ci', label: 'CI', type: 'text' },
                                        { key: 'telefono', label: 'Teléfono', type: 'text' },
                                    ].map(field => (
                                        <div key={field.key} className="campo-grupo" style={{ margin: 0 }}>
                                            <label className="campo-label">{field.label}</label>
                                            <input
                                                type={field.type}
                                                className="campo-input"
                                                value={formUsuario[field.key]}
                                                onChange={e => setFormUsuario(prev => ({ ...prev, [field.key]: e.target.value }))}
                                                required={['nombre_completo', 'email', 'password'].includes(field.key)}
                                            />
                                        </div>
                                    ))}
                                    <div className="campo-grupo" style={{ margin: 0 }}>
                                        <label className="campo-label">Rol</label>
                                        <select className="campo-input" value={formUsuario.rol}
                                            onChange={e => setFormUsuario(prev => ({ ...prev, rol: e.target.value }))}>
                                            <option value="cajero">Cajero</option>
                                            <option value="conductor">Conductor</option>
                                            <option value="admin_sucursal">Admin</option>
                                        </select>
                                    </div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <button type="submit" className="btn-admin-guardar" style={{ width: '100%' }}>
                                            Crear Usuario
                                        </button>
                                    </div>
                                </form>
                            )}

                            <div className="admin-seccion-cuerpo" style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', color: '#f1f5f9' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #1e293b', color: '#64748b' }}>
                                            {['Nombre', 'Correo', 'Rol', 'CI', 'Estado', 'Acción'].map(h => (
                                                <th key={h} style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usuarios.map(u => {
                                            const rc = ROL_COLORS[u.rol] || ROL_COLORS.cliente;
                                            return (
                                                <tr key={u.id} style={{ borderBottom: '1px solid #1e293b' }}>
                                                    <td style={{ padding: '0.7rem 0.5rem', fontWeight: 500 }}>{u.nombre_completo}</td>
                                                    <td style={{ padding: '0.7rem 0.5rem', color: '#94a3b8' }}>{u.email}</td>
                                                    <td style={{ padding: '0.7rem 0.5rem' }}>
                                                        <span style={{ background: rc.bg, color: rc.color, padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                                                            {rc.label}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '0.7rem 0.5rem', color: '#64748b' }}>{u.ci || '—'}</td>
                                                    <td style={{ padding: '0.7rem 0.5rem' }}>
                                                        <span style={{
                                                            background: u.activo ? '#064e3b' : '#7f1d1d',
                                                            color: u.activo ? '#34d399' : '#fca5a5',
                                                            padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem'
                                                        }}>
                                                            {u.activo ? 'Activo' : 'Suspendido'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '0.7rem 0.5rem' }}>
                                                        {u.id !== 'staff-001' && (
                                                            <button
                                                                onClick={() => handleToggleCuenta(u.id, u.activo)}
                                                                style={{
                                                                    background: u.activo ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                                                    border: u.activo ? '1px solid #7f1d1d' : '1px solid #065f46',
                                                                    color: u.activo ? '#fca5a5' : '#6ee7b7',
                                                                    borderRadius: '6px', padding: '0.25rem 0.6rem',
                                                                    cursor: 'pointer', fontSize: '0.75rem',
                                                                }}>
                                                                {u.activo ? 'Suspender' : 'Activar'}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            <style>{`
                @media (max-width: 768px) {
                    .admin-sidebar { width: 100% !important; border-right: none !important; border-bottom: 1px solid #1e293b; padding: 1rem !important; flex-direction: row !important; flex-wrap: wrap; }
                    .admin-sidebar > a, .admin-sidebar > button { flex: 1; min-width: 140px; }
                }
            `}</style>
        </div>
    );
};

export default AdminDashboard;
