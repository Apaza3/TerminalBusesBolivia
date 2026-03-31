import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../servicios/supabase';
import '../../estilos/escritorio/admin.css';
import '../../estilos/movil/admin-responsivo.css';

// ──────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────
const ROLES = [
    { value: 'conductor', label: 'Conductor',  icon: '🚌' },
    { value: 'copiloto',  label: 'Copiloto',   icon: '🪑' },
    { value: 'ayudante',  label: 'Ayudante',   icon: '🤝' },
];

const STORAGE_BUCKET = 'tripulacion-fotos';

// ──────────────────────────────────────────────────────
// RegistroTripulacion — Admin form to register crew members
// Route: /admin/tripulacion/nuevo
// Features:
//   - CI uniqueness check (lazy on blur)
//   - Profile photo upload to Supabase Storage
//   - License photo upload to Supabase Storage
//   - Saves to tabla 'tripulacion'
// ──────────────────────────────────────────────────────
const RegistroTripulacion = () => {
    const navigate = useNavigate();

    // ── Form state ──────────────────────────────────────
    const [form, setForm] = useState({
        ci:          '',
        nombre:      '',
        telefono:    '',
        rol:         '',
        sucursal_id: '',
    });
    const [fotoFile,     setFotoFile]     = useState(null);
    const [licenciaFile, setLicenciaFile] = useState(null);
    const [fotoPreview,  setFotoPreview]  = useState(null);
    const [licPreview,   setLicPreview]   = useState(null);

    // ── Validation & UI state ────────────────────────────
    const [ciEstado,   setCiEstado]   = useState(null); // null | 'cargando' | 'ok' | 'duplicado' | 'error'
    const [errores,    setErrores]    = useState({});
    const [feedback,   setFeedback]   = useState(null); // { tipo: 'exito'|'error', msg }
    const [guardando,  setGuardando]  = useState(false);

    const fotoInputRef    = useRef(null);
    const licenciaInputRef = useRef(null);

    // ── Helpers ──────────────────────────────────────────
    const setField = (campo, valor) => {
        setForm(prev => ({ ...prev, [campo]: valor }));
        setErrores(prev => ({ ...prev, [campo]: null }));
    };

    const previewImagen = (file, setter) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => setter(e.target.result);
        reader.readAsDataURL(file);
    };

    // ── CI Uniqueness Check (on blur) ─────────────────────
    const verificarCI = async () => {
        const ci = form.ci.trim();
        if (!ci || ci.length < 5) return;

        setCiEstado('cargando');
        try {
            const { data, error } = await supabase
                .from('tripulacion')
                .select('id')
                .eq('ci', ci)
                .maybeSingle();

            if (error) throw error;
            setCiEstado(data ? 'duplicado' : 'ok');
            if (data) {
                setErrores(prev => ({ ...prev, ci: 'Este CI ya está registrado.' }));
            }
        } catch (err) {
            console.error('RegistroTripulacion - Error verificando CI:', err);
            setCiEstado('error');
        }
    };

    // ── File Upload to Supabase Storage ──────────────────
    const subirArchivo = async (file, carpeta) => {
        if (!file) return null;
        const ext  = file.name.split('.').pop();
        const path = `${carpeta}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        const { error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(path, file, { upsert: false });

        if (error) throw error;

        const { data } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(path);

        return data.publicUrl;
    };

    // ── Validation ────────────────────────────────────────
    const validar = () => {
        const nuevosErrores = {};
        if (!form.ci.trim())     nuevosErrores.ci     = 'El CI es obligatorio.';
        if (!form.nombre.trim()) nuevosErrores.nombre  = 'El nombre es obligatorio.';
        if (!form.rol)           nuevosErrores.rol     = 'Seleccioná un rol.';
        if (ciEstado === 'duplicado') nuevosErrores.ci = 'Este CI ya está registrado.';
        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    };

    // ── Submit ────────────────────────────────────────────
    const handleGuardar = async (e) => {
        e.preventDefault();
        if (!validar()) return;

        setGuardando(true);
        setFeedback(null);

        try {
            // Upload photos concurrently
            const [foto_url, licencia_url] = await Promise.all([
                subirArchivo(fotoFile,     'fotos'),
                subirArchivo(licenciaFile, 'licencias'),
            ]);

            const { error } = await supabase
                .from('tripulacion')
                .insert([{
                    ci:          form.ci.trim(),
                    nombre:      form.nombre.trim(),
                    telefono:    form.telefono.trim() || null,
                    rol:         form.rol,
                    sucursal_id: form.sucursal_id || null,
                    foto_url,
                    licencia_url,
                }]);

            if (error) throw error;

            setFeedback({ tipo: 'exito', msg: `✅ ${form.nombre} registrado/a correctamente.` });
            // Reset form after success
            setForm({ ci: '', nombre: '', telefono: '', rol: '', sucursal_id: '' });
            setFotoFile(null); setLicenciaFile(null);
            setFotoPreview(null); setLicPreview(null);
            setCiEstado(null);
        } catch (err) {
            console.error('RegistroTripulacion - Error al guardar:', err);
            setFeedback({ tipo: 'error', msg: `❌ Error al guardar: ${err.message}` });
        } finally {
            setGuardando(false);
        }
    };

    // ── Render ────────────────────────────────────────────
    return (
        <div className="pagina-admin">
            {/* Admin Banner */}
            <div className="admin-banner">
                <span className="admin-banner-icono">⚙️</span>
                Panel Administrativo
            </div>

            {/* Header */}
            <div className="admin-header">
                <button
                    className="btn-volver-admin"
                    onClick={() => navigate(-1)}
                    id="btn-volver-admin"
                >
                    ← Volver
                </button>
                <div>
                    <h1>Registrar Tripulante</h1>
                    <div className="admin-header-sub">Conductor · Copiloto · Ayudante</div>
                </div>
            </div>

            <form className="admin-contenido" onSubmit={handleGuardar} noValidate>

                {/* Feedback global */}
                {feedback && (
                    <div className={`admin-feedback ${feedback.tipo}`}>
                        {feedback.msg}
                    </div>
                )}

                {/* ── Datos personales ── */}
                <div className="admin-seccion">
                    <div className="admin-seccion-titulo">
                        <span className="seccion-icono">👤</span> Datos Personales
                    </div>
                    <div className="admin-seccion-cuerpo">

                        {/* CI */}
                        <div className="campo-grupo">
                            <label className="campo-label">
                                CI (Cédula de Identidad) <span className="campo-requerido">*</span>
                            </label>
                            <input
                                type="text"
                                className={`campo-input ${errores.ci ? 'error' : ciEstado === 'ok' ? 'ok' : ''}`}
                                value={form.ci}
                                onChange={e => { setField('ci', e.target.value); setCiEstado(null); }}
                                onBlur={verificarCI}
                                placeholder="Ej: 12345678"
                                id="input-ci"
                                maxLength={15}
                            />
                            {ciEstado === 'cargando' && (
                                <div className="campo-cargando">
                                    <div className="spinner-mini" /> Verificando CI...
                                </div>
                            )}
                            {ciEstado === 'ok' && <div className="campo-ok-msg">✓ CI disponible</div>}
                            {errores.ci && <div className="campo-error-msg">{errores.ci}</div>}
                        </div>

                        {/* Nombre */}
                        <div className="campo-grupo">
                            <label className="campo-label">
                                Nombre Completo <span className="campo-requerido">*</span>
                            </label>
                            <input
                                type="text"
                                className={`campo-input ${errores.nombre ? 'error' : ''}`}
                                value={form.nombre}
                                onChange={e => setField('nombre', e.target.value)}
                                placeholder="Nombre y apellidos"
                                id="input-nombre"
                            />
                            {errores.nombre && <div className="campo-error-msg">{errores.nombre}</div>}
                        </div>

                        {/* Teléfono */}
                        <div className="campo-grupo">
                            <label className="campo-label">Teléfono</label>
                            <input
                                type="tel"
                                className="campo-input"
                                value={form.telefono}
                                onChange={e => setField('telefono', e.target.value)}
                                placeholder="Ej: 70012345"
                                id="input-telefono"
                            />
                        </div>

                        {/* Rol */}
                        <div className="campo-grupo">
                            <label className="campo-label">
                                Rol <span className="campo-requerido">*</span>
                            </label>
                            <div className="toggle-grupo" role="group" aria-label="Seleccionar rol">
                                {ROLES.map(r => (
                                    <button
                                        key={r.value}
                                        type="button"
                                        className={`toggle-btn ${form.rol === r.value ? 'activo' : ''}`}
                                        onClick={() => setField('rol', r.value)}
                                        id={`btn-rol-${r.value}`}
                                    >
                                        {r.icon} {r.label}
                                    </button>
                                ))}
                            </div>
                            {errores.rol && <div className="campo-error-msg">{errores.rol}</div>}
                        </div>

                    </div>
                </div>

                {/* ── Documentos / Fotos ── */}
                <div className="admin-seccion">
                    <div className="admin-seccion-titulo">
                        <span className="seccion-icono">📷</span> Fotografías
                    </div>
                    <div className="admin-seccion-cuerpo">
                        <div className="campos-grid-2">

                            {/* Foto de perfil */}
                            <div className="campo-grupo">
                                <label className="campo-label">Foto de Perfil</label>
                                <div className={`campo-upload ${fotoFile ? 'activo' : ''}`}>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        ref={fotoInputRef}
                                        onChange={e => {
                                            const f = e.target.files[0];
                                            if (f) { setFotoFile(f); previewImagen(f, setFotoPreview); }
                                        }}
                                        id="input-foto"
                                    />
                                    {fotoPreview
                                        ? <img src={fotoPreview} alt="Preview" className="upload-preview" />
                                        : (<>
                                            <span className="upload-icono">🖼️</span>
                                            <span className="upload-texto">Toca para subir foto<br />(JPG, PNG, WebP)</span>
                                          </>)
                                    }
                                </div>
                            </div>

                            {/* Foto de licencia */}
                            <div className="campo-grupo">
                                <label className="campo-label">Foto de Licencia</label>
                                <div className={`campo-upload ${licenciaFile ? 'activo' : ''}`}>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        ref={licenciaInputRef}
                                        onChange={e => {
                                            const f = e.target.files[0];
                                            if (f) { setLicenciaFile(f); previewImagen(f, setLicPreview); }
                                        }}
                                        id="input-licencia"
                                    />
                                    {licPreview
                                        ? <img src={licPreview} alt="Licencia" className="upload-preview" />
                                        : (<>
                                            <span className="upload-icono">🪪</span>
                                            <span className="upload-texto">Foto de licencia<br />(JPG, PNG, WebP)</span>
                                          </>)
                                    }
                                </div>
                                <div className="campo-hint">
                                    Requiere bucket <code>tripulacion-fotos</code> en Supabase Storage.
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* ── Footer / Submit ── */}
                <div className="admin-footer" style={{ borderRadius: '0 0 14px 14px' }}>
                    <button
                        type="button"
                        className="btn-admin-cancelar"
                        onClick={() => navigate(-1)}
                        disabled={guardando}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="btn-admin-guardar"
                        disabled={guardando || ciEstado === 'duplicado'}
                        id="btn-guardar-tripulante"
                    >
                        {guardando ? 'Guardando...' : '💾 Guardar Tripulante'}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default RegistroTripulacion;
