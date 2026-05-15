import React, { useState, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { registrarCliente, calcularEdad, esMayorDeEdad, existeCI } from '../../data/mockClientDB';
import '../../estilos/escritorio/admin.css';
import '../../estilos/movil/admin-responsivo.css';

/**
 * RegistroCliente — Client registration form with 18+ age validation,
 * CI document upload (front/back), and profile photo.
 * Fix #6: passes ?redirect= to login after successful registration.
 */
const RegistroCliente = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get('redirect') || '/';


    // Form fields
    const [nombre, setNombre] = useState('');
    const [ci, setCi] = useState('');
    const [telefono, setTelefono] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fechaNacimiento, setFechaNacimiento] = useState('');

    // File uploads (base64)
    const [fotoPerfil, setFotoPerfil] = useState(null);
    const [fotoPerfilPreview, setFotoPerfilPreview] = useState(null);
    const [ciAnverso, setCiAnverso] = useState(null);
    const [ciAnversoPreview, setCiAnversoPreview] = useState(null);
    const [ciReverso, setCiReverso] = useState(null);
    const [ciReversoPreview, setCiReversoPreview] = useState(null);

    // Validation states
    const [ciValido, setCiValido] = useState(null); // null = unchecked, true, false
    const [edadValida, setEdadValida] = useState(null);
    const [edadCalculada, setEdadCalculada] = useState(null);

    // UI states
    const [cargando, setCargando] = useState(false);
    const [toast, setToast] = useState(null); // { tipo: 'exito' | 'error', texto }
    const [mostrarPassword, setMostrarPassword] = useState(false);

    // Show toast for a few seconds
    const mostrarToast = useCallback((tipo, texto) => {
        setToast({ tipo, texto });
        setTimeout(() => setToast(null), 5000);
    }, []);

    // Handle file to base64
    const handleFileToBase64 = (file, setBase64, setPreview) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            mostrarToast('error', 'El archivo es demasiado grande (máx. 5MB).');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setBase64(reader.result);
            setPreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    // Validate CI uniqueness on blur
    const handleCiBlur = () => {
        if (ci.length >= 5) {
            setCiValido(!existeCI(ci));
        } else {
            setCiValido(null);
        }
    };

    // Validate age on date change
    const handleFechaNacimientoChange = (value) => {
        setFechaNacimiento(value);
        if (value) {
            const edad = calcularEdad(value);
            setEdadCalculada(edad);
            setEdadValida(esMayorDeEdad(value));
        } else {
            setEdadCalculada(null);
            setEdadValida(null);
        }
    };

    // Submit
    const handleSubmit = (e) => {
        e.preventDefault();

        // Frontend validations
        if (!nombre || !ci || !password || !fechaNacimiento) {
            mostrarToast('error', 'Complete todos los campos obligatorios.');
            return;
        }
        if (password !== confirmPassword) {
            mostrarToast('error', 'Las contraseñas no coinciden.');
            return;
        }
        if (password.length < 6) {
            mostrarToast('error', 'La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (edadValida === false) {
            mostrarToast('error', 'Debe ser mayor de 18 años para registrarse.');
            return;
        }
        if (ciValido === false) {
            mostrarToast('error', 'Este CI ya está registrado.');
            return;
        }

        setCargando(true);

        // Simulate async (300ms)
        setTimeout(() => {
            const resultado = registrarCliente({
                nombreCompleto: nombre,
                ci,
                telefono,
                email,
                password,
                fechaNacimiento,
                fotoPerfil: fotoPerfil,
                ciAnverso: ciAnverso,
                ciReverso: ciReverso,
            });

            if (resultado.exito) {
                mostrarToast('exito', '¡Registro exitoso! Redirigiendo al login...');
                const loginUrl = redirectTo !== '/' ? `/login-cliente?redirect=${encodeURIComponent(redirectTo)}` : '/login-cliente';
                setTimeout(() => navigate(loginUrl), 2000);
            } else {
                mostrarToast('error', resultado.error);
            }
            setCargando(false);
        }, 300);
    };

    // Max date for birth (today)
    const hoy = new Date().toISOString().split('T')[0];

    // Shared input styles
    const inputStyle = {
        width: '100%', boxSizing: 'border-box',
        background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9',
        padding: '0.85rem', borderRadius: '10px', fontSize: '0.95rem',
        transition: 'border-color 0.2s',
    };

    const labelStyle = {
        display: 'block', color: '#94a3b8', fontSize: '0.85rem',
        marginBottom: '0.4rem', fontWeight: 500,
    };

    return (
        <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: '#f1f5f9' }}>
            {/* Toast Notification */}
            {toast && (
                <div style={{
                    position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)',
                    zIndex: 100, padding: '0.9rem 1.5rem', borderRadius: '10px',
                    background: toast.tipo === 'exito' ? '#065f46' : '#7f1d1d',
                    color: toast.tipo === 'exito' ? '#6ee7b7' : '#fca5a5',
                    border: `1px solid ${toast.tipo === 'exito' ? '#10b981' : '#ef4444'}`,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                    fontSize: '0.9rem', fontWeight: 500, maxWidth: '90%',
                    animation: 'fadeIn 0.3s ease',
                }}>
                    {toast.tipo === 'exito' ? '✅' : '❌'} {toast.texto}
                </div>
            )}

            <div style={{ maxWidth: '560px', margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
                
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem', paddingTop: '1rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🪪</div>
                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.3rem', color: '#f1f5f9' }}>Crear tu Cuenta</h1>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                        Regístrate para reservar tus viajes en línea
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* ═══════ SECTION: Personal Data ═══════ */}
                    <div style={{
                        background: '#1e293b', borderRadius: '14px', padding: '1.5rem',
                        border: '1px solid #334155', marginBottom: '1.25rem',
                    }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#60a5fa', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>👤</span> Datos Personales
                        </div>

                        {/* Nombre */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={labelStyle}>Nombre Completo <span style={{ color: '#ef4444' }}>*</span></label>
                            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                                placeholder="Ej. Juan Carlos Pérez Mamani" required style={inputStyle} />
                        </div>

                        {/* CI + validation */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={labelStyle}>Carnet de Identidad (CI) <span style={{ color: '#ef4444' }}>*</span></label>
                            <input type="text" value={ci}
                                onChange={e => { setCi(e.target.value); setCiValido(null); }}
                                onBlur={handleCiBlur}
                                placeholder="Ej. 1234567" required
                                style={{
                                    ...inputStyle,
                                    borderColor: ciValido === true ? '#10b981' : ciValido === false ? '#ef4444' : '#334155',
                                }}
                            />
                            {ciValido === false && (
                                <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem', display: 'block' }}>
                                    ❌ Este CI ya está registrado.
                                </span>
                            )}
                            {ciValido === true && (
                                <span style={{ color: '#10b981', fontSize: '0.8rem', marginTop: '0.3rem', display: 'block' }}>
                                    ✅ CI disponible
                                </span>
                            )}
                        </div>

                        {/* Fecha de Nacimiento + Age Validation */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={labelStyle}>Fecha de Nacimiento <span style={{ color: '#ef4444' }}>*</span></label>
                            <input type="date" value={fechaNacimiento}
                                onChange={e => handleFechaNacimientoChange(e.target.value)}
                                max={hoy} required
                                style={{
                                    ...inputStyle,
                                    borderColor: edadValida === true ? '#10b981' : edadValida === false ? '#ef4444' : '#334155',
                                }}
                            />
                            {edadCalculada !== null && edadValida === true && (
                                <span style={{ color: '#10b981', fontSize: '0.8rem', marginTop: '0.3rem', display: 'block' }}>
                                    ✅ Edad: {edadCalculada} años
                                </span>
                            )}
                            {edadValida === false && (
                                <div style={{
                                    marginTop: '0.5rem', padding: '0.75rem', borderRadius: '8px',
                                    background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #7f1d1d',
                                }}>
                                    <span style={{ color: '#fca5a5', fontSize: '0.85rem', fontWeight: 500 }}>
                                        🚫 Lo sentimos, debes ser mayor de 18 años para registrarte en la plataforma.
                                        {edadCalculada !== null && ` Edad actual: ${edadCalculada} años.`}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Teléfono */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={labelStyle}>Teléfono</label>
                            <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
                                placeholder="Ej. 77012345" style={inputStyle} />
                        </div>

                        {/* Email */}
                        <div>
                            <label style={labelStyle}>Email <span style={{ color: '#64748b', fontWeight: 400 }}>(opcional)</span></label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                placeholder="correo@ejemplo.com" style={inputStyle} />
                        </div>
                    </div>

                    {/* ═══════ SECTION: Security ═══════ */}
                    <div style={{
                        background: '#1e293b', borderRadius: '14px', padding: '1.5rem',
                        border: '1px solid #334155', marginBottom: '1.25rem',
                    }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#60a5fa', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>🔒</span> Seguridad
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={labelStyle}>Contraseña <span style={{ color: '#ef4444' }}>*</span></label>
                            <div style={{ position: 'relative' }}>
                                <input type={mostrarPassword ? 'text' : 'password'} value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Mínimo 6 caracteres" required minLength={6}
                                    style={{ ...inputStyle, paddingRight: '3rem' }}
                                />
                                <button type="button" onClick={() => setMostrarPassword(!mostrarPassword)}
                                    style={{
                                        position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
                                        background: 'transparent', border: 'none', color: '#64748b',
                                        cursor: 'pointer', fontSize: '1.1rem', padding: '0.5rem',
                                    }}>
                                    {mostrarPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>Confirmar Contraseña <span style={{ color: '#ef4444' }}>*</span></label>
                            <input type="password" value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Repite tu contraseña" required
                                style={{
                                    ...inputStyle,
                                    borderColor: confirmPassword && password !== confirmPassword ? '#ef4444'
                                        : confirmPassword && password === confirmPassword ? '#10b981' : '#334155',
                                }}
                            />
                            {confirmPassword && password !== confirmPassword && (
                                <span style={{ color: '#ef4444', fontSize: '0.8rem', display: 'block', marginTop: '0.3rem' }}>
                                    Las contraseñas no coinciden.
                                </span>
                            )}
                        </div>
                    </div>

                    {/* ═══════ SECTION: Profile Photo ═══════ */}
                    <div style={{
                        background: '#1e293b', borderRadius: '14px', padding: '1.5rem',
                        border: '1px solid #334155', marginBottom: '1.25rem',
                    }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#60a5fa', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>📷</span> Foto de Perfil
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                            <div style={{
                                width: '90px', height: '90px', borderRadius: '50%',
                                background: '#0f172a', border: '2px dashed #475569',
                                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                {fotoPerfilPreview ? (
                                    <img src={fotoPerfilPreview} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span style={{ fontSize: '2.2rem', color: '#475569' }}>👤</span>
                                )}
                            </div>
                            <div>
                                <label style={{
                                    display: 'inline-block', padding: '0.6rem 1.2rem', borderRadius: '8px',
                                    background: 'rgba(59,130,246,0.15)', border: '1px solid #334155',
                                    color: '#60a5fa', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
                                }}>
                                    Seleccionar foto
                                    <input type="file" accept="image/png,image/jpeg,image/webp" hidden
                                        onChange={e => handleFileToBase64(e.target.files[0], setFotoPerfil, setFotoPerfilPreview)}
                                    />
                                </label>
                                <div style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.4rem' }}>JPG, PNG o WebP. Máx 5MB.</div>
                            </div>
                        </div>
                    </div>

                    {/* ═══════ SECTION: CI Documents ═══════ */}
                    <div style={{
                        background: '#1e293b', borderRadius: '14px', padding: '1.5rem',
                        border: '1px solid #334155', marginBottom: '1.5rem',
                    }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#60a5fa', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>🪪</span> Documentos de Identidad
                        </div>
                        <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                            Sube fotografías claras del anverso y reverso de tu CI. Esto garantiza la seguridad de tu cuenta.
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            {/* CI Anverso */}
                            <div>
                                <label style={{ ...labelStyle, textAlign: 'center' }}>CI Anverso</label>
                                <label style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    width: '100%', height: '120px', borderRadius: '10px', cursor: 'pointer',
                                    background: '#0f172a', border: `2px dashed ${ciAnversoPreview ? '#10b981' : '#475569'}`,
                                    overflow: 'hidden', transition: 'border-color 0.2s',
                                }}>
                                    {ciAnversoPreview ? (
                                        <img src={ciAnversoPreview} alt="CI Anverso" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <>
                                            <span style={{ fontSize: '1.8rem', color: '#475569' }}>📄</span>
                                            <span style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.3rem' }}>Toca para subir</span>
                                        </>
                                    )}
                                    <input type="file" accept="image/*" hidden
                                        onChange={e => handleFileToBase64(e.target.files[0], setCiAnverso, setCiAnversoPreview)}
                                    />
                                </label>
                            </div>

                            {/* CI Reverso */}
                            <div>
                                <label style={{ ...labelStyle, textAlign: 'center' }}>CI Reverso</label>
                                <label style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    width: '100%', height: '120px', borderRadius: '10px', cursor: 'pointer',
                                    background: '#0f172a', border: `2px dashed ${ciReversoPreview ? '#10b981' : '#475569'}`,
                                    overflow: 'hidden', transition: 'border-color 0.2s',
                                }}>
                                    {ciReversoPreview ? (
                                        <img src={ciReversoPreview} alt="CI Reverso" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <>
                                            <span style={{ fontSize: '1.8rem', color: '#475569' }}>📄</span>
                                            <span style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.3rem' }}>Toca para subir</span>
                                        </>
                                    )}
                                    <input type="file" accept="image/*" hidden
                                        onChange={e => handleFileToBase64(e.target.files[0], setCiReverso, setCiReversoPreview)}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* ═══════ SUBMIT ═══════ */}
                    <button type="submit" disabled={cargando || edadValida === false || ciValido === false}
                        style={{
                            width: '100%', padding: '1rem', border: 'none', borderRadius: '12px',
                            background: (cargando || edadValida === false || ciValido === false) ? '#475569' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: 'white', fontWeight: 700, fontSize: '1rem',
                            cursor: (cargando || edadValida === false || ciValido === false) ? 'not-allowed' : 'pointer',
                            boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
                            transition: 'all 0.2s',
                        }}>
                        {cargando ? 'Registrando...' : 'Crear Mi Cuenta'}
                    </button>

                    {/* Link to login */}
                    <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                        ¿Ya tienes cuenta?{' '}
                        <Link to="/login-cliente" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>
                            Inicia Sesión
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegistroCliente;
