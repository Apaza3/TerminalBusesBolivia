import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import Inicio from './paginas/Inicio';
import BuscadorViajes from './paginas/BuscadorViajes';
import SucursalDetalle from './paginas/SucursalDetalle';
import MapaAsientos from './paginas/MapaAsientos';
import RegistroTripulacion from './paginas/admin/RegistroTripulacion';
import RegistroBus from './paginas/admin/RegistroBus';
import './estilos/escritorio/buscador.css';
import './estilos/movil/buscador-responsivo.css';

/**
 * App - Root component with react-router-dom navigation.
 * Manages routing between Inicio, BuscadorViajes, and SucursalDetalle.
 * Replaces the previous state-based navigation to support browser Back button.
 */
function App() {
    return (
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
                </div>
            </nav>

            {/* Route-based page rendering */}
            <Routes>
                <Route path="/" element={<Inicio />} />
                <Route path="/buscar" element={<BuscadorViajes />} />
                <Route path="/sucursal/:id" element={<SucursalDetalle />} />
                <Route path="/reserva/:viajeId" element={<MapaAsientos />} />
                {/* Admin routes (no auth guard in prototype) */}
                <Route path="/admin/tripulacion/nuevo" element={<RegistroTripulacion />} />
                <Route path="/admin/bus/nuevo" element={<RegistroBus />} />
            </Routes>
        </div>
    );
}

export default App;