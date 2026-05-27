import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contextos/AuthContext';
import { DepartamentoProvider } from './contextos/DepartamentoContext';
import { ToastProvider } from './componentes/ToastNotifications';
import NavbarGlobal from './componentes/NavbarGlobal';
import ProtectedRoute from './componentes/ProtectedRoute';

// Pages — public
import Inicio from './paginas/Inicio';
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
import BoletoPúblico from './paginas/BoletoPúblico';
import PlanearViaje from './paginas/PlanearViaje';

// Pages — admin
import AdminLayout from './paginas/admin/AdminLayout';
import AdminDashboard from './paginas/admin/AdminDashboard';
import DashboardAnalitico from './paginas/admin/DashboardAnalitico';
import RegistroBus from './paginas/admin/RegistroBus';
import RegistroTripulacion from './paginas/admin/RegistroTripulacion';
import RendimientoRutas from './paginas/admin/RendimientoRutas';
import RankingEmpresas from './paginas/admin/RankingEmpresas';
import ManifiestoPDF from './paginas/admin/ManifiestoPDF';
import Incidentes from './paginas/admin/Incidentes';
import PasajerosFinalizados from './paginas/admin/PasajerosFinalizados';
import Empresas from './paginas/Empresas';

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
    const location   = useLocation();
    const isStaff    = ROLES_STAFF.includes(perfil?.rol);
    // Inicio, Empresas y PlanearViaje tienen su propia navbar completa
    const sinNavGlobal = ['/', '/empresas', '/planear-viaje', '/login-cliente', '/registro', '/login', '/recuperar-password', '/pago/qr'].includes(location.pathname)
        || location.pathname.startsWith('/sucursal/')
        || location.pathname.startsWith('/admin/')
        || location.pathname.startsWith('/cajero/')
        || location.pathname.startsWith('/conductor/');

    return (
        <div className="App">
            {/* Navbar premium — solo en rutas de cliente/visitante que no tienen navbar propia */}
            {!isStaff && !sinNavGlobal && <NavbarGlobal />}

            <Routes>
                {/* ── Rutas públicas ───────────────────────────────── */}
                <Route path="/" element={<Inicio />} />
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
                <Route path="/boleto" element={<BoletoPúblico />} />
                <Route path="/empresas" element={<Empresas />} />
                <Route path="/planear-viaje" element={<PlanearViaje />} />

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
                    <Route path="incidentes"          element={<Incidentes />} />
                    <Route path="pasajeros"          element={<PasajerosFinalizados />} />
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
                    <ProtectedRoute rolesPermitidos={['conductor', 'ayudante', 'admin_sucursal']}>
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
                    <ProtectedRoute rolesPermitidos={['conductor', 'ayudante', 'admin_sucursal']}>
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
