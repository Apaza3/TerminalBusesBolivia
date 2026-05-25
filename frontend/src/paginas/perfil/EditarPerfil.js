import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import { getEmpresaTema } from '../../data/empresasTemas';
import { getDeptFondo, getEmpresaLogo } from '../../utils/assets';
import NavbarGlobal from '../../componentes/NavbarGlobal';

const ROLES = {
    admin_sucursal: 'Admin',
    cajero:         'Cajero',
    conductor:      'Conductor',
    cliente:        'Cliente',
};

const FF = "'Rajdhani', system-ui, sans-serif";

const EditarPerfil = () => {
    const navigate  = useNavigate();
    const { perfil, sesion, actualizarPerfil } = useAuth();
    const fileRef   = useRef(null);

    const [nombre,    setNombre]    = useState(perfil?.nombre_completo || perfil?.nombreCompleto || '');
    const [telefono,  setTelefono]  = useState(perfil?.telefono || '');
    const [foto,      setFoto]      = useState(perfil?.fotoPerfil || null);
    const [preview,   setPreview]   = useState(perfil?.fotoPerfil || null);
    const [guardando, setGuardando] = useState(false);
    const [mensaje,   setMensaje]   = useState(null);

    if (!sesion) { navigate('/login'); return null; }

    const isStaff    = ['admin_sucursal','cajero','conductor'].includes(perfil?.rol);
    const deptNombre = perfil?.departamento || 'La Paz';
    const sucursal   = perfil?.sucursal_nombre || '';
    const tema       = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];
    const eT         = isStaff ? getEmpresaTema(sucursal) : null;

    const P  = eT?.primary   || tema.primary;
    const S  = eT?.secondary || tema.secondary;
    const PT = eT?.primaryText  || '#ffffff';
    const bgUrl = isStaff ? getEmpresaLogo(sucursal) : getDeptFondo(deptNombre);

    const handleFoto = e => {
        const f = e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = ev => { setFoto(ev.target.result); setPreview(ev.target.result); };
        r.readAsDataURL(f);
    };

    const handleGuardar = e => {
        e.preventDefault();
        setGuardando(true);
        setMensaje(null);
        const res = actualizarPerfil({ nombre_completo: nombre, nombreCompleto: nombre, telefono, fotoPerfil: foto });
        setGuardando(false);
        setMensaje(res.exito
            ? { tipo: 'ok',    texto: 'Perfil actualizado.' }
            : { tipo: 'error', texto: res.error || 'Error al guardar.' }
        );
    };

    const inputStyle = {
        width: '100%', boxSizing: 'border-box',
        background: 'rgba(0,0,0,0.60)',
        border: `1px solid ${P}45`,
        color: '#ffffff',
        padding: '0.55rem 0.75rem',
        borderRadius: '7px', fontSize: '0.82rem',
        outline: 'none', fontFamily: FF,
        textTransform: 'uppercase', letterSpacing: '0.04em',
    };

    const readStyle = {
        ...inputStyle,
        background: 'rgba(0,0,0,0.45)',
        border: `1px solid ${P}22`, opacity: 0.80, cursor: 'default',
    };

    const labelStyle = {
        display: 'block', fontSize: '0.62rem', fontWeight: 700,
        letterSpacing: '0.13em', marginBottom: '0.25rem',
        textTransform: 'uppercase', fontFamily: FF,
        background: `linear-gradient(90deg, ${P}, ${S})`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    };

    const readonlyFields = [
        { label: 'Correo',                                valor: perfil?.email || '—' },
        { label: 'CI',                                    valor: perfil?.ci    || '—' },
        { label: 'Rol',                                   valor: ROLES[perfil?.rol] || '—' },
        { label: isStaff ? 'Empresa' : 'Departamento',   valor: isStaff ? sucursal : deptNombre },
    ];

    return (
        <div style={{
            height: isStaff ? '100dvh' : 'calc(100dvh - 76px)', width: '100%',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: FF, textTransform: 'uppercase', letterSpacing: '0.03em',
        }}>
            {/* Navbar — solo para staff (clientes ya la tienen en App.js) */}
            {isStaff && (
                <div style={{ flexShrink: 0, position: 'relative', zIndex: 40 }}>
                    <NavbarGlobal />
                </div>
            )}

            {/* Área principal — sin scroll */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex' }}>

                {/* Fondo cover siempre */}
                {bgUrl && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 0,
                        backgroundImage: `url(${bgUrl})`,
                        backgroundSize: 'cover', backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                    }} />
                )}
                {/* Blur sobre el fondo */}
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 0,
                    backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
                    pointerEvents: 'none',
                }} />
                {/* Overlay oscuro principal — más opaco */}
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 0,
                    background: `linear-gradient(135deg,
                        rgba(6,10,20,0.97) 0%,
                        ${P}35 35%,
                        ${S}22 65%,
                        rgba(6,10,20,0.97) 100%)`,
                    pointerEvents: 'none',
                }} />
                {/* Acento radial en esquinas */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '40%', height: '40%', zIndex: 0,
                    background: `radial-gradient(ellipse at top left, ${P}40 0%, transparent 70%)`,
                    pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', bottom: 0, right: 0, width: '40%', height: '40%', zIndex: 0,
                    background: `radial-gradient(ellipse at bottom right, ${S}35 0%, transparent 70%)`,
                    pointerEvents: 'none',
                }} />

                {/* Tarjeta centrada */}
                <div style={{
                    position: 'relative', zIndex: 1,
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 'clamp(0.5rem,2vw,1.25rem)',
                }}>
                    <div style={{
                        width: '100%', maxWidth: '480px',
                        background: 'rgba(0,0,0,0.65)',
                        border: `1px solid ${P}40`,
                        borderRadius: '16px',
                        padding: 'clamp(1rem,3vw,1.5rem)',
                        backdropFilter: 'blur(22px)',
                        WebkitBackdropFilter: 'blur(22px)',
                        boxShadow: `0 0 0 1px ${S}20, 0 24px 48px rgba(0,0,0,0.8), 0 0 60px ${P}15`,
                    }}>

                        {/* Título + botón volver */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <div style={{
                                    fontSize: 'clamp(1.1rem,3.5vw,1.35rem)', fontWeight: 800, lineHeight: 1,
                                    background: `linear-gradient(90deg, ${P}, ${S})`,
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                }}>
                                    Editar Perfil
                                </div>
                                <div style={{ fontSize: '0.62rem', color: `${S}cc`, marginTop: '0.2rem', letterSpacing: '0.1em' }}>
                                    {ROLES[perfil?.rol] || 'Usuario'} · {isStaff ? sucursal : deptNombre}
                                </div>
                            </div>
                            <button onClick={() => navigate(-1)} style={{
                                background: `linear-gradient(135deg, #111827, ${P}22)`,
                                border: `1px solid ${P}50`, color: P,
                                borderRadius: '7px', padding: '0.3rem 0.75rem',
                                cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700,
                                fontFamily: FF, textTransform: 'uppercase', letterSpacing: '0.08em',
                            }}>← Volver</button>
                        </div>

                        {/* Foto + nombre de perfil */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem',
                            background: 'rgba(0,0,0,0.50)',
                            borderRadius: '10px', padding: '0.65rem 0.85rem',
                            border: `1px solid ${P}30`,
                        }}>
                            {/* Avatar */}
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                <div style={{
                                    width: 'clamp(52px,12vw,68px)', height: 'clamp(52px,12vw,68px)',
                                    borderRadius: '50%',
                                    background: `linear-gradient(135deg, ${P}, ${S})`,
                                    padding: '2px',
                                    boxShadow: `0 0 20px ${P}50`,
                                }}>
                                    <div style={{
                                        width: '100%', height: '100%', borderRadius: '50%',
                                        background: '#060a14', overflow: 'hidden',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1.6rem',
                                    }}>
                                        {preview
                                            ? <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            : <span style={{ color: P }}>{nombre.charAt(0).toUpperCase() || '?'}</span>
                                        }
                                    </div>
                                </div>
                            </div>
                            {/* Info + botón foto */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 'clamp(0.85rem,2.5vw,1rem)', color: '#fff',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                    {nombre || 'Sin nombre'}
                                </div>
                                <div style={{ fontSize: '0.62rem', color: P, marginBottom: '0.35rem' }}>
                                    {ROLES[perfil?.rol]}
                                </div>
                                <button onClick={() => fileRef.current?.click()} style={{
                                    background: 'rgba(0,0,0,0.55)',
                                    border: `1px solid ${P}55`, color: P,
                                    borderRadius: '5px', padding: '0.22rem 0.6rem',
                                    cursor: 'pointer', fontSize: '0.62rem', fontWeight: 600,
                                    fontFamily: FF, textTransform: 'uppercase',
                                }}>📷 Cambiar foto</button>
                                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFoto} />
                            </div>
                        </div>

                        {/* Mensaje */}
                        {mensaje && (
                            <div style={{
                                background: mensaje.tipo === 'ok'
                                    ? `linear-gradient(90deg, ${P}18, ${S}10)`
                                    : 'linear-gradient(90deg, rgba(220,38,38,0.15), rgba(220,38,38,0.05))',
                                border: `1px solid ${mensaje.tipo === 'ok' ? P : '#dc2626'}50`,
                                color: mensaje.tipo === 'ok' ? P : '#fca5a5',
                                padding: '0.5rem 0.85rem', borderRadius: '7px',
                                fontSize: '0.72rem', marginBottom: '0.75rem', letterSpacing: '0.05em',
                            }}>
                                {mensaje.tipo === 'ok' ? '✓' : '✕'} {mensaje.texto}
                            </div>
                        )}

                        <form onSubmit={handleGuardar}>
                            {/* Nombre + Teléfono en 2 columnas */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.65rem' }}>
                                <div>
                                    <label style={labelStyle}>Nombre</label>
                                    <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                                        placeholder="Tu nombre" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Teléfono</label>
                                    <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
                                        placeholder="7XXXXXXX" style={inputStyle} />
                                </div>
                            </div>

                            {/* Readonly en 2x2 */}
                            <div style={{
                                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem',
                                marginBottom: '0.85rem',
                                padding: '0.65rem', borderRadius: '9px',
                                background: 'rgba(0,0,0,0.45)',
                                border: `1px solid ${P}20`,
                            }}>
                                {readonlyFields.map(item => (
                                    <div key={item.label}>
                                        <label style={{ ...labelStyle, opacity: 0.6 }}>{item.label}</label>
                                        <input readOnly value={item.valor} style={readStyle} />
                                    </div>
                                ))}
                            </div>

                            {/* Botón guardar */}
                            <button type="submit" disabled={guardando} style={{
                                width: '100%', padding: '0.75rem',
                                background: guardando
                                    ? '#1f2937'
                                    : `linear-gradient(135deg, ${P} 0%, ${S} 100%)`,
                                color: guardando ? '#64748b' : PT,
                                border: 'none', borderRadius: '9px',
                                fontWeight: 800, cursor: guardando ? 'not-allowed' : 'pointer',
                                fontSize: '0.88rem', letterSpacing: '0.12em',
                                fontFamily: FF, textTransform: 'uppercase',
                                
                                boxShadow: guardando ? 'none' : `0 4px 20px ${P}45, 0 0 0 1px ${S}30`,
                                transition: 'all 0.2s',
                            }}>
                                {guardando ? 'Guardando...' : '💾 Guardar Cambios'}
                            </button>
                        </form>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditarPerfil;
