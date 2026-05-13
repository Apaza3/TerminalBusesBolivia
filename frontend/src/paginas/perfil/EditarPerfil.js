import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';

/**
 * EditarPerfil — R5: Editar nombre, foto, contacto.
 * Works for all roles: admin, cajero, conductor, cliente.
 * Saves to localStorage via AuthContext.actualizarPerfil().
 */
const EditarPerfil = () => {
    const navigate = useNavigate();
    const { perfil, sesion, actualizarPerfil } = useAuth();
    const fileRef = useRef(null);

    const [nombre, setNombre] = useState(perfil?.nombre_completo || perfil?.nombreCompleto || '');
    const [telefono, setTelefono] = useState(perfil?.telefono || '');
    const [foto, setFoto] = useState(perfil?.fotoPerfil || null);
    const [fotoPreview, setFotoPreview] = useState(perfil?.fotoPerfil || null);
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState(null);

    if (!sesion) {
        navigate('/login');
        return null;
    }

    const handleFoto = (e) => {
        const archivo = e.target.files[0];
        if (!archivo) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setFoto(ev.target.result);
            setFotoPreview(ev.target.result);
        };
        reader.readAsDataURL(archivo);
    };

    const handleGuardar = (e) => {
        e.preventDefault();
        setGuardando(true);
        setMensaje(null);

        const datos = {
            nombre_completo: nombre,
            nombreCompleto: nombre,
            telefono,
            fotoPerfil: foto,
        };

        const resultado = actualizarPerfil(datos);
        setGuardando(false);

        if (resultado.exito) {
            setMensaje({ tipo: 'ok', texto: 'Perfil actualizado correctamente.' });
        } else {
            setMensaje({ tipo: 'error', texto: resultado.error || 'Error al guardar.' });
        }
    };

    const rolLabel = {
        admin_sucursal: '🛡️ Admin',
        cajero: '🏷️ Cajero',
        conductor: '🚌 Conductor',
        cliente: '👤 Cliente',
    }[perfil?.rol] || '👤';

    return (
        <div style={{ background: '#0f172a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{
                background: '#1e293b', borderRadius: '16px', border: '1px solid #334155',
                padding: '2rem', maxWidth: '440px', width: '100%',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.3rem', color: '#f1f5f9' }}>Editar Perfil</h1>
                        <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{rolLabel}</div>
                    </div>
                    <button onClick={() => navigate(-1)} style={{
                        background: 'transparent', border: '1px solid #334155',
                        color: '#94a3b8', borderRadius: '8px', padding: '0.4rem 0.75rem',
                        cursor: 'pointer', fontSize: '0.85rem',
                    }}>← Volver</button>
                </div>

                {/* Foto */}
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                        width: '90px', height: '90px', borderRadius: '50%',
                        background: '#334155', margin: '0 auto 0.75rem',
                        overflow: 'hidden', border: '3px solid #3b82f6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2rem', color: '#94a3b8',
                    }}>
                        {fotoPreview
                            ? <img src={fotoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : (nombre.charAt(0).toUpperCase() || '👤')
                        }
                    </div>
                    <button onClick={() => fileRef.current?.click()} style={{
                        background: 'rgba(59,130,246,0.1)', border: '1px solid #334155',
                        color: '#60a5fa', borderRadius: '8px', padding: '0.4rem 0.9rem',
                        cursor: 'pointer', fontSize: '0.82rem',
                    }}>
                        📷 Cambiar foto
                    </button>
                    <input ref={fileRef} type="file" accept="image/*"
                        style={{ display: 'none' }} onChange={handleFoto} />
                </div>

                {mensaje && (
                    <div style={{
                        background: mensaje.tipo === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        border: `1px solid ${mensaje.tipo === 'ok' ? '#065f46' : '#7f1d1d'}`,
                        color: mensaje.tipo === 'ok' ? '#6ee7b7' : '#fca5a5',
                        padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem',
                    }}>
                        {mensaje.tipo === 'ok' ? '✅' : '❌'} {mensaje.texto}
                    </div>
                )}

                <form onSubmit={handleGuardar}>
                    <div style={{ marginBottom: '0.75rem' }}>
                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                            Nombre Completo
                        </label>
                        <input
                            type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                            placeholder="Tu nombre completo"
                            style={{
                                width: '100%', boxSizing: 'border-box',
                                background: '#0f172a', border: '1px solid #334155',
                                color: '#f1f5f9', padding: '0.7rem 1rem', borderRadius: '10px',
                                fontSize: '0.9rem',
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '0.75rem' }}>
                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                            Teléfono / Celular
                        </label>
                        <input
                            type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
                            placeholder="7XXXXXXX"
                            style={{
                                width: '100%', boxSizing: 'border-box',
                                background: '#0f172a', border: '1px solid #334155',
                                color: '#f1f5f9', padding: '0.7rem 1rem', borderRadius: '10px',
                                fontSize: '0.9rem',
                            }}
                        />
                    </div>

                    {/* Info de solo lectura */}
                    {[
                        { label: 'Correo', valor: perfil?.email || '—' },
                        { label: 'CI', valor: perfil?.ci || '—' },
                        { label: 'Rol', valor: rolLabel },
                    ].map(item => (
                        <div key={item.label} style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                            <span style={{ color: '#475569', fontSize: '0.8rem', minWidth: '60px' }}>{item.label}:</span>
                            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{item.valor}</span>
                        </div>
                    ))}

                    <button type="submit" style={{
                        width: '100%', padding: '0.8rem', marginTop: '1.25rem',
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        color: 'white', border: 'none', borderRadius: '10px',
                        fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem',
                    }} disabled={guardando}>
                        {guardando ? 'Guardando...' : '💾 Guardar Cambios'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default EditarPerfil;
