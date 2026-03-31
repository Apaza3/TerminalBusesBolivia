import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { AuthProvider } from './contextos/AuthContext';
import Inicio from './paginas/Inicio';
import BuscadorViajes from './paginas/BuscadorViajes';
import SucursalDetalle from './paginas/SucursalDetalle';
import LoginAdmin from './paginas/auth/LoginAdmin';
import AdminDashboard from './paginas/admin/AdminDashboard';
import RegistroBus from './paginas/admin/RegistroBus';
import ProtectedRoute from './componentes/ProtectedRoute';

import './estilos/escritorio/buscador.css';
import './estilos/movil/buscador-responsivo.css';

/**
 * App - Root component with react-router-dom navigation.
 * Manages routing between Inicio, BuscadorViajes, and SucursalDetalle.
 * Replaces the previous state-based navigation to support browser Back button.
 */
function App() {
    return (
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
                        {/* El enlace de "Ingresar Admin" puede estar aquí temporalmente para testing.
                            Lo ideal es no exponerlo si es un staff portal, pero lo facilitamos. */}
                        <NavLink
                            to="/login"
                            className={({ isActive }) => `nav-link ${isActive ? 'activo' : ''}`}
                            style={{ marginLeft: 'auto', background: '#3b82f6', color: '#fff' }}
                        >
                            Login Staff
                        </NavLink>
                    </div>
                </nav>

                {/* Route-based page rendering */}
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Inicio />} />
                    <Route path="/buscar" element={<BuscadorViajes />} />
                    <Route path="/sucursal/:id" element={<SucursalDetalle />} />
                    <Route path="/login" element={<LoginAdmin />} />

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
                    {/* Ruta temporal mock para RegistroTripulacion si falta su archivo */}
                    <Route path="/admin/tripulacion/nuevo" element={
                        <ProtectedRoute rolesPermitidos={['admin_sucursal']}>
                            <div style={{color:'white', padding: '2rem'}}>Módulo Registro Tripulación No Disponible / Stashed</div>
                        </ProtectedRoute>
                    } />
                    
                    {/* Redirect root admin to dashboard */}
                    <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                </Routes>
            </div>
        </AuthProvider>
    );
}

export default App;