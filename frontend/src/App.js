import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';

function RelojDigital() {
    const [hora, setHora] = useState(new Date());
    useEffect(() => {
        const id = setInterval(() => setHora(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    const pad = n => String(n).padStart(2, '0');
    const h = pad(hora.getHours());
    const m = pad(hora.getMinutes());
    const s = pad(hora.getSeconds());
    return (
        <div style={{
            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
            fontSize: '1.35rem', fontWeight: 800, letterSpacing: '0.08em',
            color: '#dde5f0', lineHeight: 1,
            display: 'flex', alignItems: 'center', gap: '0.1em',
            userSelect: 'none',
        }}>
            <span>{h}</span>
            <span style={{ color: '#3b82f6', animation: 'blink 1s step-start infinite' }}>:</span>
            <span>{m}</span>
            <span style={{ color: '#3b82f6', animation: 'blink 1s step-start infinite' }}>:</span>
            <span style={{ fontSize: '1rem', color: '#64748b' }}>{s}</span>
            <style>{`@keyframes blink { 50% { opacity: 0.3; } }`}</style>
        </div>
    );
}
import { AuthProvider } from './contextos/AuthContext';
import { DepartamentoProvider } from './contextos/DepartamentoContext';
import { ToastProvider } from './componentes/ToastNotifications';
import Inicio from './paginas/Inicio';
import BuscadorViajes from './paginas/BuscadorViajes';
import SucursalDetalle from './paginas/SucursalDetalle';
import LoginAdmin from './paginas/auth/LoginAdmin';
import LoginCliente from './paginas/auth/LoginCliente';
import RegistroCliente from './paginas/auth/RegistroCliente';
import RecuperarPassword from './paginas/auth/RecuperarPassword';
import AdminDashboard from './paginas/admin/AdminDashboard';
import DashboardAnalitico from './paginas/admin/DashboardAnalitico';
import RegistroBus from './paginas/admin/RegistroBus';
import RegistroTripulacion from './paginas/admin/RegistroTripulacion';
import ProtectedRoute from './componentes/ProtectedRoute';
import MapaAsientos from './paginas/MapaAsientos';
import PanelConductor from './paginas/conductor/PanelConductor';
import RegistrarIncidencia from './paginas/conductor/RegistrarIncidencia';
import ReporteMantenimiento from './paginas/conductor/ReporteMantenimiento';
import RecuperarBoleto from './paginas/RecuperarBoleto';
import PanelCajero from './paginas/cajero/PanelCajero';
import MisViajes from './paginas/cliente/MisViajes';
import EditarPerfil from './paginas/perfil/EditarPerfil';
import PerfilIndicador from './componentes/PerfilIndicador';
import PagoQRMovil from './paginas/pago/PagoQRMovil';
import ValidarAbordaje from './paginas/conductor/ValidarAbordaje';
// [Académico] Sprint 5 - R23/R24/RN-01: páginas analítica
import RendimientoRutas from './paginas/admin/RendimientoRutas';
import RankingEmpresas from './paginas/admin/RankingEmpresas';
import ManifiestoPDF from './paginas/admin/ManifiestoPDF';

import './estilos/escritorio/buscador.css';
import './estilos/movil/buscador-responsivo.css';

/**
 * App - Root component with react-router-dom navigation.
 * Manages routing between Inicio, BuscadorViajes, and SucursalDetalle.
 * Replaces the previous state-based navigation to support browser Back button.
 */
function App() {
    return (
        <ToastProvider>
        <DepartamentoProvider>
        <AuthProvider>
            <div className="App">
                {/* Barra de navegación superior */}
                <nav className="barra-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="nav-logo">
                        <NavLink to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
                            🚌 Terminal<span>Bolivia</span>
                        </NavLink>
                    </div>
                    <RelojDigital />
                    <div className="nav-links">
                        <NavLink
                            to="/"
                            end
                            className={({ isActive }) => `nav-link ${isActive ? 'activo' : ''}`}
                            id="nav-inicio"
                        >
                            Inicio
                        </NavLink>
                        <NavLink
                            to="/buscar"
                            className={({ isActive }) => `nav-link ${isActive ? 'activo' : ''}`}
                            id="nav-buscador"
                        >
                            Buscar Viajes
                        </NavLink>
                        <PerfilIndicador />
                    </div>
                </nav>

                {/* Route-based page rendering */}
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Inicio />} />
                    <Route path="/buscar" element={<BuscadorViajes />} />
                    <Route path="/sucursal/:id" element={<SucursalDetalle />} />
                    <Route path="/login" element={<LoginAdmin />} />
                    <Route path="/login-cliente" element={<LoginCliente />} />
                    <Route path="/registro" element={<RegistroCliente />} />
                    <Route path="/recuperar-password" element={<RecuperarPassword />} />
                    <Route path="/reserva/:viajeId" element={<MapaAsientos />} />
                    <Route path="/mis-viajes" element={<MisViajes />} />
                    <Route path="/perfil/editar" element={<EditarPerfil />} />
                    <Route path="/recuperar-boleto" element={<RecuperarBoleto />} />
                    <Route path="/pago/qr" element={<PagoQRMovil />} />

                    {/* Rutas no subidas en esta rama (como MapaAsientos) se redirigen o fallan
                        dependiendo de si existen en FileSystem o no. */}

                    {/* Admin Protected Routes */}
                    <Route path="/admin/dashboard" element={
                        <ProtectedRoute rolesPermitidos={['admin_sucursal', 'conductor']}>
                            <AdminDashboard />
                        </ProtectedRoute>
                    } />
                    <Route path="/admin/bus/nuevo" element={
                        <ProtectedRoute rolesPermitidos={['admin_sucursal']}>
                            <RegistroBus />
                        </ProtectedRoute>
                    } />
                    {/* Ruta de Registro de Tripulación restaurada */}
                    <Route path="/admin/tripulacion/nuevo" element={
                        <ProtectedRoute rolesPermitidos={['admin_sucursal']}>
                            <RegistroTripulacion />
                        </ProtectedRoute>
                    } />
                    
                    {/* Redirect root admin to dashboard */}
                    <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

                    {/* ─── Analytics Dashboard (Admin) ─── */}
                    <Route path="/admin/analitica" element={
                        <ProtectedRoute rolesPermitidos={['admin_sucursal']}>
                            <DashboardAnalitico />
                        </ProtectedRoute>
                    } />
                    {/* [Académico] Sprint 5 - R23/R24/RN-01 */}
                    <Route path="/admin/rendimiento-rutas" element={
                        <ProtectedRoute rolesPermitidos={['admin_sucursal']}>
                            <RendimientoRutas />
                        </ProtectedRoute>
                    } />
                    <Route path="/admin/ranking-empresas" element={
                        <ProtectedRoute rolesPermitidos={['admin_sucursal']}>
                            <RankingEmpresas />
                        </ProtectedRoute>
                    } />
                    <Route path="/admin/manifiesto" element={
                        <ProtectedRoute rolesPermitidos={['admin_sucursal', 'cajero']}>
                            <ManifiestoPDF />
                        </ProtectedRoute>
                    } />

                    {/* ─── Cajero Protected Route ─── */}
                    <Route path="/cajero/panel" element={
                        <ProtectedRoute rolesPermitidos={['cajero', 'admin_sucursal']}>
                            <PanelCajero />
                        </ProtectedRoute>
                    } />

                    {/* ─── Conductor Protected Routes ─── */}
                    <Route path="/conductor/panel" element={
                        <ProtectedRoute rolesPermitidos={['conductor', 'admin_sucursal']}>
                            <PanelConductor />
                        </ProtectedRoute>
                    } />
                    <Route path="/conductor/incidencia/:viajeId" element={
                        <ProtectedRoute rolesPermitidos={['conductor', 'admin_sucursal']}>
                            <RegistrarIncidencia />
                        </ProtectedRoute>
                    } />
                    <Route path="/conductor/mantenimiento" element={
                        <ProtectedRoute rolesPermitidos={['conductor', 'admin_sucursal']}>
                            <ReporteMantenimiento />
                        </ProtectedRoute>
                    } />
                    <Route path="/conductor/abordaje" element={
                        <ProtectedRoute rolesPermitidos={['conductor', 'admin_sucursal']}>
                            <ValidarAbordaje />
                        </ProtectedRoute>
                    } />
                </Routes>
            </div>
        </AuthProvider>
        </DepartamentoProvider>
        </ToastProvider>
    );
}

export default App;