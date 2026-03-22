import React, { useState } from 'react';
import Inicio from './paginas/Inicio';
import BuscadorViajes from './paginas/BuscadorViajes';
import './estilos/escritorio/buscador.css';
import './estilos/movil/buscador-responsivo.css';

/**
 * App - Componente raíz con navegación interna por estado.
 * Gestiona la vista activa (inicio o buscador) sin react-router.
 */
function App() {
    // Estado de navegación: 'inicio' o 'buscador'
    const [paginaActual, setPaginaActual] = useState('inicio');

    return (
        <div className="App">
            {/* Barra de navegación superior */}
            <nav className="barra-nav">
                <div className="nav-logo">
                    🚌 Terminal<span>Bolivia</span>
                </div>
                <div className="nav-links">
                    <button
                        className={`nav-link ${paginaActual === 'inicio' ? 'activo' : ''}`}
                        onClick={() => setPaginaActual('inicio')}
                        id="nav-inicio"
                    >
                        Inicio
                    </button>
                    <button
                        className={`nav-link ${paginaActual === 'buscador' ? 'activo' : ''}`}
                        onClick={() => setPaginaActual('buscador')}
                        id="nav-buscador"
                    >
                        Buscar Viajes
                    </button>
                </div>
            </nav>

            {/* Renderizado condicional de la página activa */}
            {paginaActual === 'inicio' && (
                <Inicio onBuscarViajes={() => setPaginaActual('buscador')} />
            )}
            {paginaActual === 'buscador' && (
                <BuscadorViajes onVolver={() => setPaginaActual('inicio')} />
            )}
        </div>
    );
}

export default App;