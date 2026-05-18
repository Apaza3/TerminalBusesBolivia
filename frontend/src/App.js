import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contextos/AuthContext';
import { DepartamentoProvider } from './contextos/DepartamentoContext';
import { ToastProvider } from './componentes/ToastNotifications';
import RelojDigital from './componentes/RelojDigital';
import PerfilIndicador from './componentes/PerfilIndicador';
import ProtectedRoute from './componentes/ProtectedRoute';

// Pages — public
import Inicio from './paginas/Inicio';
import BuscadorViajes from './paginas/BuscadorViajes';
import SucursalDetalle from './paginas/SucursalDetalle';
import LoginAdmin from './paginas/auth/LoginAdmin';
import LoginCliente from './paginas/auth/LoginCliente';
import RegistroCliente from './paginas/auth/RegistroCliente';
import RecuperarPassword from './paginas/auth/RecuperarPassword';
import MapaAsientos from './paginas/MapaAsientos';
import MisViajes from './paginas/cliente/MisViajes';
import EditarPerfil from './paginas/perfil/EditarPerfil';
import RecuperarBoleto from './paginas/RecuperarBoleto';
import PagoQRMovil from './paginas/pago/PagoQRMovil';

// Pages — admin
import AdminLayout from './paginas/admin/AdminLayout';
import AdminDashboard from './paginas/admin/AdminDashboard';
import DashboardAnalitico from './paginas/admin/DashboardAnalitico';
import RegistroBus from './paginas/admin/RegistroBus';
import RegistroTripulacion from './paginas/admin/RegistroTripulacion';
import RendimientoRutas from './paginas/admin/RendimientoRutas';
import RankingEmpresas from './paginas/admin/RankingEmpresas';
import ManifiestoPDF from './paginas/admin/ManifiestoPDF';

// Pages — cajero / conductor
import PanelCajero from './paginas/cajero/PanelCajero';
import PanelConductor from './paginas/conductor/PanelConductor';
import RegistrarIncidencia from './paginas/conductor/RegistrarIncidencia';
import ReporteMantenimiento from './paginas/conductor/ReporteMantenimiento';
import ValidarAbordaje from './paginas/conductor/ValidarAbordaje';

import './estilos/escritorio/buscador.css';
import './estilos/movil/buscador-responsivo.css';

const ROLES_STAFF = ['admin_sucursal', 'cajero', 'conductor'];

function AppContent() {
    const { perfil } = useAuth();
    const isStaff = ROLES_STAFF.includes(perfil?.rol);

    return (
        <div className="App">
            {/* Barra de navegación — solo para clientes y visitantes */}
            {!isStaff && (
                <nav className="barra-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="nav-logo">
                        <NavLink to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
                            🚌 Terminal<span>Bolivia</span>
                        </NavLink>
                    </div>
                    <RelojDigital />
                    <div className="nav-links">
                        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'activo' : ''}`} id="nav-inicio">
                            Inicio
                        </NavLink>
                        <NavLink to="/buscar" className={({ isActive }) => `nav-link ${isActive ? 'activo' : ''}`} id="nav-buscador">
                            Buscar Viajes
                        </NavLink>
                        <PerfilIndicador />
                    </div>
                </nav>
            )}

            <Routes>
                {/* ── Rutas públicas ───────────────────────────────── */}
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

                {/* ── Admin — sidebar persistente (AdminLayout + Outlet) ── */}
                <Route path="/admin" element={
                    <ProtectedRoute rolesPermitidos={['admin_sucursal']}>
                        <AdminLayout />
                    </ProtectedRoute>
                }>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard"          element={<AdminDashboard />} />
                    <Route path="analitica"          element={<DashboardAnalitico />} />
                    <Route path="rendimiento-rutas"  element={<RendimientoRutas />} />
                    <Route path="ranking-empresas"   element={<RankingEmpresas />} />
                    <Route path="manifiesto"         element={<ManifiestoPDF />} />
                    <Route path="bus/nuevo"          element={<RegistroBus />} />
                    <Route path="tripulacion/nuevo"  element={<RegistroTripulacion />} />
                </Route>

                {/* ── Cajero ───────────────────────────────────────── */}
                <Route path="/cajero/panel" element={
                    <ProtectedRoute rolesPermitidos={['cajero', 'admin_sucursal']}>
                        <PanelCajero />
                    </ProtectedRoute>
                } />

                {/* ── Conductor ────────────────────────────────────── */}
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
    );
}

function App() {
    return (
        <ToastProvider>
        <DepartamentoProvider>
        <AuthProvider>
            <AppContent />
        </AuthProvider>
        </DepartamentoProvider>
        </ToastProvider>
    );
}

export default App;
