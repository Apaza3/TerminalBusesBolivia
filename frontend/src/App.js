import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
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
import GestionSucursales from './paginas/admin/GestionSucursales';
import GestionRutas from './paginas/admin/GestionRutas';
import ProgramacionItinerarios from './paginas/admin/ProgramacionItinerarios';
import DisponibilidadRecursos from './paginas/admin/DisponibilidadRecursos';
import MonitoreoFlota from './paginas/admin/MonitoreoFlota';
import ProtectedRoute from './componentes/ProtectedRoute';
import MapaAsientos from './paginas/MapaAsientos';
import PanelConductorWS from './paginas/conductor/PanelConductorWS';
import RegistrarIncidencia from './paginas/conductor/RegistrarIncidencia';
import ReporteMantenimiento from './paginas/conductor/ReporteMantenimiento';
import RecuperarBoleto from './paginas/RecuperarBoleto';
import PanelCajero from './paginas/cajero/PanelCajero';
import MisViajes from './paginas/cliente/MisViajes';
import EditarPerfil from './paginas/perfil/EditarPerfil';
import PerfilIndicador from './componentes/PerfilIndicador';
import PagoQRMovil from './paginas/pago/PagoQRMovil';
import ValidarAbordaje from './paginas/conductor/ValidarAbordaje';

import './estilos/escritorio/buscador.css';
import './estilos/movil/buscador-responsivo.css';

function App() {
    return (
        <ToastProvider>
        <DepartamentoProvider>
        <AuthProvider>
            <div className="App">
                {/* Barra de navegación superior */}
                <nav className="barra-nav">
                    <div className="nav-logo">
                        <NavLink to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
                            🚌 Terminal<span>Bolivia</span>
                        </NavLink>
                    </div>
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
                    <Route path="/admin/tripulacion/nuevo" element={
                        <ProtectedRoute rolesPermitidos={['admin_sucursal']}>
                            <RegistroTripulacion />
                        </ProtectedRoute>
                    } />

                    {/* ─── Fleet Planning (Sprint 2) ─── */}
                    <Route path="/admin/sucursales" element={
                        <ProtectedRoute rolesPermitidos={['admin_sucursal']}>
                            <GestionSucursales />
                        </ProtectedRoute>
                    } />
                    <Route path="/admin/rutas" element={
                        <ProtectedRoute rolesPermitidos={['admin_sucursal']}>
                            <GestionRutas />
                        </ProtectedRoute>
                    } />
                    <Route path="/admin/itinerarios" element={
                        <ProtectedRoute rolesPermitidos={['admin_sucursal']}>
                            <ProgramacionItinerarios />
                        </ProtectedRoute>
                    } />
                    <Route path="/admin/recursos" element={
                        <ProtectedRoute rolesPermitidos={['admin_sucursal']}>
                            <DisponibilidadRecursos />
                        </ProtectedRoute>
                    } />

                    {/* ─── Monitor Flota (Sprint 4 - R17) ─── */}
                    <Route path="/admin/monitor" element={
                        <ProtectedRoute rolesPermitidos={['admin_sucursal']}>
                            <MonitoreoFlota />
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

                    {/* ─── Cajero Protected Route ─── */}
                    <Route path="/cajero/panel" element={
                        <ProtectedRoute rolesPermitidos={['cajero', 'admin_sucursal']}>
                            <PanelCajero />
                        </ProtectedRoute>
                    } />

                    {/* ─── Conductor Protected Routes ─── */}
                    {/* [Académico] Sprint 4 - PanelConductorWS wrapper añade WS + notificaciones (R20, R26) */}
                    <Route path="/conductor/panel" element={
                        <ProtectedRoute rolesPermitidos={['conductor', 'admin_sucursal']}>
                            <PanelConductorWS />
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
