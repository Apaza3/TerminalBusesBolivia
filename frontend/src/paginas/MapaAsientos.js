import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../servicios/supabase';
import { useAuth } from '../contextos/AuthContext';
import '../estilos/escritorio/mapa-asientos.css'; // Reutilizamos el CSS del Admin preview temporalmente

const MapaAsientos = () => {
    const { viajeId } = useParams();
    const navigate = useNavigate();
    const { sesion, login } = useAuth();
    
    const [cargando, setCargando] = useState(true);
    const [asientosReservados, setAsientosReservados] = useState(['1A', '2B', '5C']); // Mock de ocupados
    const [asientosSeleccionados, setAsientosSeleccionados] = useState([]);
    
    const [mostrarAuthModal, setMostrarAuthModal] = useState(false);
    const [authEmail, setAuthEmail] = useState('');
    const [authPass, setAuthPass] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState('');

    useEffect(() => {
        // Simular carga
        setTimeout(() => setCargando(false), 600);
    }, [viajeId]);

    const toggleAsiento = (id) => {
        if (asientosReservados.includes(id)) return;
        setAsientosSeleccionados(prev => 
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        );
    };

    const handleConfirmar = () => {
        if (asientosSeleccionados.length === 0) {
            alert('Seleccione al menos un asiento.');
            return;
        }

        if (!sesion) {
            setMostrarAuthModal(true);
        } else {
            alert(`Completado: Asientos ${asientosSeleccionados.join(',')} reservados por ${sesion.user.email}`);
            navigate('/');
        }
    };

    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError('');
        
        try {
            // Check if it's the hardcoded admin
            if (authEmail === 'admin@tbb.com' && authPass === 'admin123456') {
                await login(authEmail, authPass);
                setMostrarAuthModal(false);
                alert('Sesión iniciada. Reserva completada.');
                navigate('/');
            } else {
                // If not, use standard supabase registration/login
                const { error } = await supabase.auth.signUp({
                    email: authEmail,
                    password: authPass
                });
                if (error && error.message.includes('already registered')) {
                    const { error: loginError } = await login(authEmail, authPass);
                    if (loginError) throw loginError;
                } else if (error) {
                    throw error;
                }
                setMostrarAuthModal(false);
                alert('Login / Registro exitoso. Reserva completada.');
                navigate('/');
            }
        } catch (err) {
            setAuthError(err.message);
        }
        setAuthLoading(false);
    };

    // Render 10 filas x 4 columnas
    const filas = Array.from({length: 10}, (_, i) => i + 1);
    const columnas = ['A', 'B', 'pasillo', 'C', 'D'];

    return (
        <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: '#f1f5f9', padding: '2rem' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', marginBottom: '1rem' }}>
                    ← Volver
                </button>
                
                <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Selección de Asientos</h1>
                <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>Viaje ID: {viajeId}</p>

                {cargando ? (
                    <p style={{ textAlign: 'center', color: '#60a5fa' }}>Cargando distribución del bus...</p>
                ) : (
                    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {/* Bus Layout */}
                        <div className="bus-cuerpo">
                            <div className="bus-frente">
                                <span className="bus-volante">Volante</span>
                                <span className="bus-puerta-etiqueta">Puerta</span>
                            </div>
                            <div className="bus-piso">
                                {filas.map(fila => (
                                    <div key={fila} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <div style={{ width: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}>{fila}</div>
                                        
                                        {columnas.map(col => {
                                            if (col === 'pasillo') {
                                                return <div key="pasillo" style={{ width: '30px', margin: '0 10px' }} className="bus-pasillo-visual"></div>;
                                            }
                                            const asientoId = `${fila}${col}`;
                                            const reservado = asientosReservados.includes(asientoId);
                                            const seleccionado = asientosSeleccionados.includes(asientoId);
                                            
                                            let clase = 'disponible';
                                            if (reservado) clase = 'ocupado';
                                            if (seleccionado) clase = 'pendiente';

                                            return (
                                                <button 
                                                    key={col}
                                                    className={`asiento-btn ${clase}`}
                                                    style={{ width: '40px', height: '40px', fontSize: '0.8rem', cursor: reservado ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                                                    onClick={() => toggleAsiento(asientoId)}
                                                >
                                                    {asientoId}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ))}
                                <div className="bus-zona-bano">Baño</div>
                            </div>
                        </div>

                        {/* Panel Derecho */}
                        <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155', minWidth: '300px', flex: 1 }}>
                            <h3 style={{ marginTop: 0 }}>Resumen de Compra</h3>
                            <p style={{ color: '#94a3b8' }}>Asientos: {asientosSeleccionados.length > 0 ? asientosSeleccionados.join(', ') : 'Ninguno'}</p>
                            <div style={{ margin: '1.5rem 0', borderTop: '1px solid #334155', paddingTop: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span>Total: </span>
                                    <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#10b981' }}>Bs {asientosSeleccionados.length * 45}</span>
                                </div>
                            </div>
                            <button 
                                onClick={handleConfirmar}
                                disabled={asientosSeleccionados.length === 0}
                                style={{ width: '100%', padding: '1rem', background: asientosSeleccionados.length > 0 ? '#3b82f6' : '#475569', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: asientosSeleccionados.length > 0 ? 'pointer' : 'not-allowed' }}
                            >
                                Pagar y Confirmar
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Auth (Si no esta logueado al confirmar) */}
            {mostrarAuthModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '1rem', backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: '#1e293b', width: '100%', maxWidth: '400px', borderRadius: '12px', padding: '2rem', border: '1px solid #334155', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, color: '#f1f5f9', fontSize: '1.25rem' }}>
                                Accede para terminar tu compra
                            </h2>
                            <button onClick={() => setMostrarAuthModal(false)} style={{ background:'transparent', border:'none', color:'#94a3b8', fontSize:'1.5rem', cursor:'pointer' }}>×</button>
                        </div>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            Si no tienes cuenta, se creará una automáticamente. Prueba 'admin@tbb.com' para entrar como staff.
                        </p>
                        <form onSubmit={handleAuthSubmit}>
                            {authError && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>{authError}</div>}
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Email</label>
                                <input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} required style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', padding: '0.8rem', borderRadius: '8px' }} />
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Contraseña</label>
                                <input type="password" value={authPass} onChange={e=>setAuthPass(e.target.value)} required style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', padding: '0.8rem', borderRadius: '8px' }} />
                            </div>
                            <button type="submit" disabled={authLoading} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 600, cursor: authLoading ? 'wait' : 'pointer' }}>
                                {authLoading ? 'Procesando...' : 'Proceder al Pago'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MapaAsientos;
