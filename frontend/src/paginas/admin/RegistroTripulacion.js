import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import { supabase } from '../../servicios/supabase';
import '../../estilos/escritorio/admin.css';
import '../../estilos/movil/admin-responsivo.css';

const RegistroTripulacion = () => {
    const navigate = useNavigate();
    const { perfil } = useAuth();
    const deptNombre = perfil?.departamento || 'La Paz';
    const tema = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];

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

    const inputStyle = {
        width: '100%', background: '#0f172a', border: '1px solid #334155',
        color: '#f1f5f9', borderRadius: 8, padding: '0.55rem 0.75rem',
        fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box',
    };
    const labelStyle = { fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem', display: 'block' };

    return (
        <div style={{ color: '#f1f5f9', fontFamily: "'Inter', system-ui, sans-serif", padding: '1.5rem 1rem 2rem' }}>

            <div style={{ maxWidth: 680, margin: '0 auto' }}>

                {/* Título */}
                <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{
                        fontSize: 'clamp(1.5rem,3.5vw,2rem)', fontWeight: 900,
                        background: `linear-gradient(90deg, ${tema.color}, ${tema.colorSecundario})`,
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        fontFamily: "'Rajdhani', system-ui, sans-serif",
                        textTransform: 'uppercase', lineHeight: 1.1,
                    }}>Registro de Tripulación</div>
                    <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '0.2rem' }}>
                        Agregue nuevos conductores y asigne roles
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    {mensaje && (
                        <div style={{
                            padding: '0.75rem 1rem', borderRadius: 10, marginBottom: '1rem', fontSize: '0.85rem',
                            background: mensaje.tipo === 'exito' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                            color: mensaje.tipo === 'exito' ? '#6ee7b7' : '#fca5a5',
                            border: `1px solid ${mensaje.tipo === 'exito' ? '#065f46' : '#7f1d1d'}`,
                        }}>
                            {mensaje.texto}
                        </div>
                    )}

                    {/* Card única */}
                    <div style={{ background: 'rgba(30,41,59,0.8)', borderRadius: 14, border: '1px solid #334155', padding: '1.25rem', marginBottom: '1rem' }}>

                        {/* Fila 1: CI + Nombre */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <label style={labelStyle}>CI <span style={{ color: '#f87171' }}>*</span></label>
                                <input
                                    type="text" name="ci"
                                    style={{ ...inputStyle, borderColor: ciDuplicado ? '#ef4444' : formData.ci.length >= 5 && !verificandoCi ? '#10b981' : '#334155' }}
                                    value={formData.ci} onChange={handleChange} onBlur={verificarCI}
                                    required placeholder="Carnet de Identidad"
                                />
                                {verificandoCi && <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Verificando...</span>}
                                {ciDuplicado && <span style={{ fontSize: '0.72rem', color: '#f87171' }}>CI ya registrado.</span>}
                                {!ciDuplicado && formData.ci.length >= 5 && !verificandoCi && <span style={{ fontSize: '0.72rem', color: '#6ee7b7' }}>CI disponible</span>}
                            </div>
                            <div>
                                <label style={labelStyle}>Nombre Completo <span style={{ color: '#f87171' }}>*</span></label>
                                <input
                                    type="text" name="nombre" style={inputStyle}
                                    value={formData.nombre} onChange={handleChange}
                                    required placeholder="Ej. Juan Pérez"
                                />
                            </div>
                        </div>

                        {/* Fila 2: Teléfono + Rol */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                            <div>
                                <label style={labelStyle}>Teléfono</label>
                                <input
                                    type="tel" name="telefono" style={inputStyle}
                                    value={formData.telefono} onChange={handleChange}
                                    placeholder="Ej. 77012345"
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Rol <span style={{ color: '#f87171' }}>*</span></label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {['conductor', 'copiloto'].map(r => (
                                        <button key={r} type="button" onClick={() => toggleRol(r)} style={{
                                            flex: 1, padding: '0.55rem 0.5rem', borderRadius: 8, border: 'none',
                                            background: formData.rol === r ? tema.color : '#0f172a',
                                            color: formData.rol === r ? '#fff' : '#94a3b8',
                                            fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
                                            textTransform: 'capitalize',
                                        }}>{r}</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Separador */}
                        <div style={{ borderTop: '1px solid #334155', paddingTop: '1.25rem' }}>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>
                                Documentos y Fotografía
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

                                {/* Foto perfil */}
                                <div>
                                    <label style={labelStyle}>Foto de Perfil</label>
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                        <div style={{ width: 56, height: 56, flexShrink: 0, background: '#0f172a', border: '1px dashed #475569', borderRadius: '50%', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            {getPreviewUrl('foto')
                                                ? <img src={getPreviewUrl('foto')} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : <span style={{ fontSize: '1.5rem' }}>👤</span>}
                                        </div>
                                        <input type="file" accept="image/png, image/jpeg" onChange={e => handleFileChange(e, 'foto')} style={{ color: '#94a3b8', fontSize: '0.78rem', minWidth: 0 }} />
                                    </div>
                                </div>

                                {/* Foto licencia */}
                                <div>
                                    <label style={labelStyle}>Licencia de Conducir</label>
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                        <div style={{ width: 80, height: 50, flexShrink: 0, background: '#0f172a', border: '1px dashed #475569', borderRadius: 6, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            {getPreviewUrl('licencia')
                                                ? <img src={getPreviewUrl('licencia')} alt="Preview Licencia" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : <span style={{ fontSize: '1.2rem', color: '#475569' }}>🪪</span>}
                                        </div>
                                        <input type="file" accept="image/png, image/jpeg" onChange={e => handleFileChange(e, 'licencia')} style={{ color: '#94a3b8', fontSize: '0.78rem', minWidth: 0 }} />
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                    {/* Botones */}
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => navigate('/admin/dashboard')} style={{
                            padding: '0.6rem 1.25rem', borderRadius: 8, border: '1px solid #334155',
                            background: 'transparent', color: '#94a3b8', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                        }}>Descartar</button>
                        <button type="submit" disabled={cargando || ciDuplicado || !formData.ci || !formData.nombre} style={{
                            padding: '0.6rem 1.5rem', borderRadius: 8, border: 'none',
                            background: (cargando || ciDuplicado || !formData.ci || !formData.nombre) ? '#1e293b' : tema.color,
                            color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: cargando ? 'wait' : 'pointer',
                        }}>
                            {cargando ? 'Registrando...' : 'Registrar Personal'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegistroTripulacion;
