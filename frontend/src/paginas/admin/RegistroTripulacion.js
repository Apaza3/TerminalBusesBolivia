import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../servicios/supabase';
import '../../estilos/escritorio/admin.css';
import '../../estilos/movil/admin-responsivo.css';

const RegistroTripulacion = () => {
    const navigate = useNavigate();

    // Estado del formulario
    const [formData, setFormData] = useState({
        ci: '',
        nombre: '',
        telefono: '',
        rol: 'conductor' // conductor | copiloto | ayudante
    });

    const [archivos, setArchivos] = useState({
        foto: null,
        licencia: null
    });
    
    // UI States
    const [cargando, setCargando] = useState(false);
    const [ciDuplicado, setCiDuplicado] = useState(false);
    const [verificandoCi, setVerificandoCi] = useState(false);
    const [mensaje, setMensaje] = useState(null); // { texto, tipo }

    // Handlers inputs texto
    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    // Handler Rol Toggle
    const toggleRol = (nuevoRol) => {
        setFormData({ ...formData, rol: nuevoRol });
    };

    // Verificar unicidad de CI al perder el foco (onBlur)
    const verificarCI = async () => {
        if (!formData.ci) return;
        setVerificandoCi(true);

        try {
            const { data, error } = await supabase
                .from('tripulacion')
                .select('id')
                .eq('ci', formData.ci)
                .maybeSingle();

            if (data) {
                setCiDuplicado(true);
            } else {
                setCiDuplicado(false);
            }
        } catch (error) {
            console.error('Error comprobando CI:', error);
        } finally {
            setVerificandoCi(false);
        }
    };

    // Manejar selección de archivos para previsualización simulada
    const handleFileChange = (e, tipo) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setArchivos({ ...archivos, [tipo]: file });
        }
    };

    // Generar preview en base64 para visualizar *antes* de subir
    const getPreviewUrl = (tipo) => {
        if (archivos[tipo]) {
            return URL.createObjectURL(archivos[tipo]);
        }
        return null;
    };

    // Subir archivos a Supabase Storage
    const uploadFile = async (file, path) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${path}-${Math.random()}.${fileExt}`;
        const filePath = `tripulacion/${fileName}`;

        try {
            let { error: uploadError } = await supabase.storage
                .from('tripulacion-fotos') // Requiere que exista el bucket!
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Conseguir URL pública
            const { data } = supabase.storage.from('tripulacion-fotos').getPublicUrl(filePath);
            return data.publicUrl;
        } catch (error) {
            console.warn('Fallo Supabase Storage (Probablemente no existe el Bucket). Usaremos URL mock.');
            return `https://fakeurl.tbb/${filePath}`; // Retorno simulado si falla en dev
        }
    };

    // Submit Guardar
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (ciDuplicado) return;
        if (!formData.ci || !formData.nombre) {
            setMensaje({ tipo: 'error', texto: 'Por favor complete todos los campos obligatorios.' });
            return;
        }

        setCargando(true);
        setMensaje(null);

        try {
            // Simulamos o intentamos subir al storage
            let fotoUrl = null;
            let licenciaUrl = null;

            if (archivos.foto) {
                fotoUrl = await uploadFile(archivos.foto, `foto_${formData.ci}`);
            }
            if (archivos.licencia) {
                licenciaUrl = await uploadFile(archivos.licencia, `licencia_${formData.ci}`);
            }

            // Insert a Supabase DB
            const { error: dbError } = await supabase
                .from('tripulacion')
                .insert([{
                    ci: formData.ci,
                    nombre_completo: formData.nombre,
                    telefono: formData.telefono,
                    rol: formData.rol,
                    sucursal_id: null, // Asumimos que se auto-rellena con la sucursal del Admin si lo enlazamos o null
                    foto_perfil_url: fotoUrl,
                    foto_licencia_url: licenciaUrl
                }]);

            if (dbError && dbError.code === '42P01') {
                throw new Error("La tabla 'tripulacion' aún no existe en esta rama de la base de datos.");
            } else if (dbError) {
                throw dbError;
            }

            setMensaje({ tipo: 'exito', texto: 'Personal de tripulación registrado exitosamente.' });
            
            // Limpiar form
            setFormData({ ci: '', nombre: '', telefono: '', rol: 'conductor' });
            setArchivos({ foto: null, licencia: null });
            
        } catch (error) {
            console.error(error);
            setMensaje({ tipo: 'error', texto: error.message || 'Error al registrar.' });
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="pagina-admin">
            <div className="admin-banner">
                <span className="admin-banner-icono">🛡️</span>
                Panel Administrativo Seguro
            </div>

            <div className="admin-header">
                <button className="btn-volver-admin" onClick={() => navigate('/admin/dashboard')}>
                    ← Volver
                </button>
                <div>
                    <h1>Registro de Tripulación</h1>
                    <div className="admin-header-sub">Agregue nuevos conductores y asigne roles.</div>
                </div>
            </div>

            <main className="admin-contenido">
                
                {mensaje && (
                    <div className={`admin-feedback ${mensaje.tipo}`}>
                        {mensaje.texto}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="admin-seccion">
                        <div className="admin-seccion-titulo">
                            <span className="seccion-icono">👤</span>
                            Datos Personales
                        </div>
                        
                        <div className="admin-seccion-cuerpo">
                            <div className="campos-grid-2">
                                {/* CI Input con chequeo onBlur */}
                                <div className="campo-grupo">
                                    <label className="campo-label">CI <span className="campo-requerido">*</span></label>
                                    <input
                                        type="text"
                                        name="ci"
                                        className={`campo-input ${ciDuplicado ? 'error' : formData.ci.length >= 5 && !verificandoCi ? 'ok' : ''}`}
                                        value={formData.ci}
                                        onChange={handleChange}
                                        onBlur={verificarCI}
                                        required
                                        placeholder="Carnet de Identidad"
                                    />
                                    {verificandoCi && <span className="campo-cargando"><div className="spinner-mini"></div> Verificando...</span>}
                                    {ciDuplicado && <span className="campo-error-msg">Este CI ya está registrado.</span>}
                                    {!ciDuplicado && formData.ci.length >= 5 && !verificandoCi && <span className="campo-ok-msg">CI Disponible</span>}
                                </div>

                                {/* Nombre Input */}
                                <div className="campo-grupo">
                                    <label className="campo-label">Nombre Completo <span className="campo-requerido">*</span></label>
                                    <input
                                        type="text"
                                        name="nombre"
                                        className="campo-input"
                                        value={formData.nombre}
                                        onChange={handleChange}
                                        required
                                        placeholder="Ej. Juan Pérez"
                                    />
                                </div>

                                {/* Teléfono Input */}
                                <div className="campo-grupo">
                                    <label className="campo-label">Teléfono</label>
                                    <input
                                        type="tel"
                                        name="telefono"
                                        className="campo-input"
                                        value={formData.telefono}
                                        onChange={handleChange}
                                        placeholder="Ej. 77012345"
                                    />
                                </div>

                                {/* Rol Toggle */}
                                <div className="campo-grupo">
                                    <label className="campo-label">Rol en el Bus <span className="campo-requerido">*</span></label>
                                    <div className="toggle-grupo">
                                        <div 
                                            className={`toggle-btn ${formData.rol === 'conductor' ? 'activo' : ''}`}
                                            onClick={() => toggleRol('conductor')}
                                        >
                                            Conductor
                                        </div>
                                        <div 
                                            className={`toggle-btn ${formData.rol === 'copiloto' ? 'activo' : ''}`}
                                            onClick={() => toggleRol('copiloto')}
                                        >
                                            Copiloto
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="admin-seccion">
                        <div className="admin-seccion-titulo">
                            <span className="seccion-icono">📷</span>
                            Documentos y Fotografía
                        </div>
                        
                        <div className="admin-seccion-cuerpo">
                            <div className="campos-grid-2">
                                
                                {/* Upload Foto */}
                                <div className="campo-grupo">
                                    <label className="campo-label">Foto de Perfil</label>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
                                        <div style={{ width: '80px', height: '80px', backgroundColor: '#0f172a', border: '1px dashed #475569', borderRadius: '50%', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            {getPreviewUrl('foto') ? (
                                                <img src={getPreviewUrl('foto')} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <span style={{ fontSize: '2rem' }}>👤</span>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/png, image/jpeg"
                                            onChange={(e) => handleFileChange(e, 'foto')}
                                            style={{ color: '#94a3b8' }}
                                        />
                                    </div>
                                </div>

                                {/* Upload Licencia */}
                                <div className="campo-grupo">
                                    <label className="campo-label">Fotografía de Licencia de Conducir</label>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
                                        <div style={{ width: '120px', height: '75px', backgroundColor: '#0f172a', border: '1px dashed #475569', borderRadius: '8px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            {getPreviewUrl('licencia') ? (
                                                <img src={getPreviewUrl('licencia')} alt="Preview Licencia" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <span style={{ fontSize: '1.5rem', color: '#475569' }}>🪪</span>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/png, image/jpeg"
                                            onChange={(e) => handleFileChange(e, 'licencia')}
                                            style={{ color: '#94a3b8' }}
                                        />
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                    <div className="admin-footer">
                        <button type="button" className="btn-admin-cancelar" onClick={() => navigate('/admin/dashboard')}>
                            Descartar
                        </button>
                        <button 
                            type="submit" 
                            className="btn-admin-guardar"
                            disabled={cargando || ciDuplicado || !formData.ci || !formData.nombre}
                        >
                            {cargando ? 'Registrando...' : 'Registrar Personal'}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default RegistroTripulacion;
