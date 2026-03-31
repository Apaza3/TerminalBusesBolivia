import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../servicios/supabase';
import '../../estilos/escritorio/admin.css';
import '../../estilos/escritorio/mapa-asientos.css';
import '../../estilos/movil/admin-responsivo.css';

const AMENIDADES_DISPONIBLES = [
    { id: 'WiFi',              icono: '📶' },
    { id: 'USB',               icono: '🔌' },
    { id: 'Aire Acondicionado',icono: '❄️' },
    { id: 'Bus Cama',          icono: '🛏️' },
    { id: 'TV',                icono: '📺' },
    { id: 'Baño',              icono: '🚿' },
    { id: 'Calefacción',       icono: '🔥' },
];

const BusPreviewMini = ({ config }) => {
    const { pisos, columnas, filasPiso1, filasPiso2, tieneBano } = config;
    const colsDer = columnas === 4 ? 2 : 1;
    const colsIzq = 2;
    const totalSeats = colsIzq + colsDer;
    const gridCols   = columnas === 4
        ? '36px 36px 12px 36px 36px 18px'
        : '36px 36px 12px 36px 18px';

    const renderFila = (piso, fila) => {
        const asientos = [];
        for (let c = 1; c <= totalSeats; c++) {
            const letra  = String.fromCharCode(64 + c);
            const numero = `${fila}${letra}`;
            const demo   = ['disponible', 'disponible', 'ocupado', 'pendiente'];
            const estado = demo[(fila + c) % demo.length];
            asientos.push(
                <div
                    key={`p${piso}-f${fila}-c${c}`}
                    className={`asiento-btn ${estado}`}
                    style={{ width: 36, height: 36, marginTop: 6, pointerEvents: 'none', fontSize: '0.5rem', cursor: 'default' }}
                    title={numero}
                >
                    <span className="asiento-numero" style={{ opacity: 1, fontSize: '0.45rem' }}>{numero}</span>
                </div>
            );
            if (c === colsIzq) {
                asientos.push(
                    <div key={`pasillo-${piso}-${fila}`} className="bus-pasillo-visual" style={{ width: 12, height: 42, margin: '6px 0 0' }} />
                );
            }
        }
        asientos.push(
            <div key={`fn-${piso}-${fila}`} className="fila-numero" style={{ fontSize: '0.55rem', color: '#475569' }}>{fila}</div>
        );
        return (
            <div key={`fila-${piso}-${fila}`} style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 4, alignItems: 'center' }}>
                {asientos}
            </div>
        );
    };

    return (
        <div className="bus-preview-contenedor">
            <div className="bus-preview-titulo">Vista previa del bus</div>
            <div className="bus-cuerpo" style={{ transform: 'scale(0.85)', transformOrigin: 'top center' }}>
                <div className="bus-frente" style={{ padding: '4px 8px' }}>
                    <span className="bus-volante" style={{ fontSize: '1rem' }}>🚌</span>
                    <span className="bus-puerta-etiqueta" style={{ fontSize: '0.55rem' }}>🚪 Puerta</span>
                </div>
                <div className="bus-interior">
                    <div className="bus-piso">
                        {pisos === 2 && <div className="bus-piso-label">Piso 1</div>}
                        {Array.from({ length: filasPiso1 }, (_, i) => renderFila(1, i + 1))}
                        {tieneBano && (
                            <div className="bus-zona-bano" style={{ fontSize: '0.65rem' }}>🚿 Baño</div>
                        )}
                    </div>
                    {pisos === 2 && filasPiso2 > 0 && (
                        <>
                            <hr className="bus-separador-piso" />
                            <div className="bus-piso">
                                <div className="bus-piso-label">Piso 2</div>
                                {Array.from({ length: filasPiso2 }, (_, i) => renderFila(2, i + 1))}
                            </div>
                        </>
                    )}
                </div>
                <div className="bus-trasera" />
            </div>
            <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '.4rem' }}>
                {pisos === 2 ? `2 pisos · ` : `1 piso · `}
                {columnas === 4 ? '2+2 cols' : '2+1 cols'} · {
                    (filasPiso1 * totalSeats) + (pisos === 2 ? filasPiso2 * totalSeats : 0)
                } asientos
            </div>
        </div>
    );
};

const RegistroBus = () => {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        sucursal_id:  '',
        placa:        '',
        pisos:        1,
        columnas:     4,
        filas_piso_1: 10,
        filas_piso_2: 8,
        tiene_bano:   false,
        amenidades:   [],
    });

    const [placaEstado, setPlacaEstado]   = useState(null);
    const [errores,     setErrores]       = useState({});
    const [feedback,    setFeedback]      = useState(null);
    const [guardando,   setGuardando]     = useState(false);
    const [sucursales,  setSucursales]    = useState([]);

    React.useEffect(() => {
        const fetchSucursales = async () => {
            try {
                const { data } = await supabase
                    .from('sucursales')
                    .select('id, nombre')
                    .order('nombre');
                if (data) setSucursales(data);
            } catch (err) {
                console.error('RegistroBus - fetchSucursales error:', err);
            }
        };
        fetchSucursales();
    }, []);

    const setField = (campo, valor) => {
        setForm(prev => ({ ...prev, [campo]: valor }));
        setErrores(prev => ({ ...prev, [campo]: null }));
    };

    const toggleAmenidad = (id) => {
        setForm(prev => ({
            ...prev,
            amenidades: prev.amenidades.includes(id)
                ? prev.amenidades.filter(a => a !== id)
                : [...prev.amenidades, id],
        }));
    };

    const verificarPlaca = async () => {
        const placa = form.placa.trim().toUpperCase();
        if (!placa || placa.length < 5) return;

        setPlacaEstado('cargando');
        try {
            const { data, error } = await supabase
                .from('buses')
                .select('id')
                .eq('placa', placa)
                .maybeSingle();

            if (error) throw error;
            setPlacaEstado(data ? 'duplicado' : 'ok');
            if (data) {
                setErrores(prev => ({ ...prev, placa: 'Esta placa ya está registrada.' }));
            }
        } catch (err) {
            console.error('RegistroBus - Error verificando placa:', err);
            setPlacaEstado(null);
        }
    };

    const previewConfig = useCallback(() => ({
        pisos:        form.pisos,
        columnas:     form.columnas,
        filasPiso1:   Math.max(1, Math.min(20, Number(form.filas_piso_1) || 10)),
        filasPiso2:   form.pisos === 2 ? Math.max(1, Math.min(20, Number(form.filas_piso_2) || 8)) : 0,
        tieneBano:    form.tiene_bano,
    }), [form]);

    const validar = () => {
        const errs = {};
        if (!form.placa.trim())   errs.placa       = 'La placa es obligatoria.';
        if (placaEstado === 'duplicado') errs.placa = 'Esta placa ya está registrada.';
        if (!form.filas_piso_1 || form.filas_piso_1 < 1) errs.filas_piso_1 = 'Mínimo 1 fila.';
        if (form.pisos === 2 && (!form.filas_piso_2 || form.filas_piso_2 < 1)) {
            errs.filas_piso_2 = 'Mínimo 1 fila en piso 2.';
        }
        setErrores(errs);
        return Object.keys(errs).length === 0;
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        if (!validar()) return;

        setGuardando(true);
        setFeedback(null);

        const colsDer  = form.columnas === 4 ? 2 : 1;
        const capPiso1 = form.filas_piso_1 * (2 + colsDer);
        const capPiso2 = form.pisos === 2 ? form.filas_piso_2 * (2 + colsDer) : 0;

        try {
            const { error } = await supabase
                .from('buses')
                .insert([{
                    sucursal_id:  form.sucursal_id || null,
                    placa:        form.placa.trim().toUpperCase(),
                    capacidad:    capPiso1 + capPiso2,
                    pisos:        form.pisos,
                    columnas:     form.columnas,
                    filas_piso_1: Number(form.filas_piso_1),
                    filas_piso_2: form.pisos === 2 ? Number(form.filas_piso_2) : 0,
                    tiene_bano:   form.tiene_bano,
                    amenidades:   form.amenidades,
                    estado:       'disponible',
                }]);

            if (error) throw error;

            setFeedback({ tipo: 'exito', msg: `✅ Bus ${form.placa.toUpperCase()} registrado. Capacidad: ${capPiso1 + capPiso2} asientos.` });
            setForm({ sucursal_id: '', placa: '', pisos: 1, columnas: 4, filas_piso_1: 10, filas_piso_2: 8, tiene_bano: false, amenidades: [] });
            setPlacaEstado(null);
        } catch (err) {
            console.error('RegistroBus - Error al guardar:', err);
            setFeedback({ tipo: 'error', msg: `❌ Error al guardar: ${err.message}` });
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="pagina-admin">
            <div className="admin-banner">
                <span className="admin-banner-icono">⚙️</span>
                Panel Administrativo
            </div>

            <div className="admin-header">
                <button className="btn-volver-admin" onClick={() => navigate(-1)} id="btn-volver-bus">← Volver</button>
                <div>
                    <h1>Registrar Bus</h1>
                    <div className="admin-header-sub">Configura el layout y las características del vehículo</div>
                </div>
            </div>

            <form className="admin-contenido" onSubmit={handleGuardar} noValidate>
                {feedback && (
                    <div className={`admin-feedback ${feedback.tipo}`}>{feedback.msg}</div>
                )}

                <div className="admin-seccion">
                    <div className="admin-seccion-titulo">
                        <span className="seccion-icono">🚌</span> Identificación del Bus
                    </div>
                    <div className="admin-seccion-cuerpo">
                        <div className="campos-grid-2">
                            <div className="campo-grupo">
                                <label className="campo-label">Placa <span className="campo-requerido">*</span></label>
                                <input
                                    type="text"
                                    className={`campo-input ${errores.placa ? 'error' : placaEstado === 'ok' ? 'ok' : ''}`}
                                    value={form.placa}
                                    onChange={e => { setField('placa', e.target.value.toUpperCase()); setPlacaEstado(null); }}
                                    onBlur={verificarPlaca}
                                    placeholder="Ej: ABC-1234"
                                    id="input-placa"
                                    maxLength={10}
                                />
                                {placaEstado === 'cargando' && (
                                    <div className="campo-cargando"><div className="spinner-mini" /> Verificando placa...</div>
                                )}
                                {placaEstado === 'ok' && <div className="campo-ok-msg">✓ Placa disponible</div>}
                                {errores.placa && <div className="campo-error-msg">{errores.placa}</div>}
                            </div>

                            <div className="campo-grupo">
                                <label className="campo-label">Sucursal (Empresa)</label>
                                <select
                                    className="campo-select"
                                    value={form.sucursal_id}
                                    onChange={e => setField('sucursal_id', e.target.value)}
                                    id="select-sucursal"
                                >
                                    <option value="">Sin asignar</option>
                                    {sucursales.map(s => (
                                        <option key={s.id} value={s.id}>{s.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="admin-seccion">
                    <div className="admin-seccion-titulo">
                        <span className="seccion-icono">📐</span> Layout del Bus
                    </div>
                    <div className="admin-seccion-cuerpo">
                        <div className="campo-grupo">
                            <label className="campo-label">Número de Pisos <span className="campo-requerido">*</span></label>
                            <div className="toggle-grupo">
                                {[1, 2].map(n => (
                                    <button
                                        key={n}
                                        type="button"
                                        className={`toggle-btn ${form.pisos === n ? 'activo' : ''}`}
                                        onClick={() => setField('pisos', n)}
                                        id={`btn-pisos-${n}`}
                                    >
                                        {n === 1 ? '🚌 1 Piso' : '🚌🚌 2 Pisos'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="campo-grupo">
                            <label className="campo-label">Configuración de Columnas <span className="campo-requerido">*</span></label>
                            <div className="toggle-grupo">
                                <button
                                    type="button"
                                    className={`toggle-btn ${form.columnas === 4 ? 'activo' : ''}`}
                                    onClick={() => setField('columnas', 4)}
                                    id="btn-cols-4"
                                >
                                    🪑🪑 | 🪑🪑 — 4 cols (2+2)
                                </button>
                                <button
                                    type="button"
                                    className={`toggle-btn ${form.columnas === 3 ? 'activo' : ''}`}
                                    onClick={() => setField('columnas', 3)}
                                    id="btn-cols-3"
                                >
                                    🪑🪑 | 🪑 — 3 cols (2+1)
                                </button>
                            </div>
                        </div>

                        <div className={`campos-grid-${form.pisos === 2 ? '2' : '1'}`}>
                            <div className="campo-grupo">
                                <label className="campo-label">
                                    Filas Piso 1 <span className="campo-requerido">*</span>
                                </label>
                                <input
                                    type="number"
                                    className={`campo-input ${errores.filas_piso_1 ? 'error' : ''}`}
                                    value={form.filas_piso_1}
                                    onChange={e => setField('filas_piso_1', Number(e.target.value))}
                                    min={1} max={20}
                                    id="input-filas-1"
                                />
                                <div className="campo-hint">
                                    → {form.filas_piso_1 * (form.columnas === 4 ? 4 : 3)} asientos en piso 1
                                </div>
                                {errores.filas_piso_1 && <div className="campo-error-msg">{errores.filas_piso_1}</div>}
                            </div>

                            {form.pisos === 2 && (
                                <div className="campo-grupo">
                                    <label className="campo-label">
                                        Filas Piso 2 <span className="campo-requerido">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        className={`campo-input ${errores.filas_piso_2 ? 'error' : ''}`}
                                        value={form.filas_piso_2}
                                        onChange={e => setField('filas_piso_2', Number(e.target.value))}
                                        min={1} max={20}
                                        id="input-filas-2"
                                    />
                                    <div className="campo-hint">
                                        → {form.filas_piso_2 * (form.columnas === 4 ? 4 : 3)} asientos en piso 2
                                    </div>
                                    {errores.filas_piso_2 && <div className="campo-error-msg">{errores.filas_piso_2}</div>}
                                </div>
                            )}
                        </div>

                        <div className="campo-grupo">
                            <label className="campo-label">Baño</label>
                            <div className="toggle-grupo">
                                <button
                                    type="button"
                                    className={`toggle-btn ${form.tiene_bano ? 'activo' : ''}`}
                                    onClick={() => setField('tiene_bano', true)}
                                    id="btn-bano-si"
                                >
                                    🚿 Con Baño
                                </button>
                                <button
                                    type="button"
                                    className={`toggle-btn ${!form.tiene_bano ? 'activo' : ''}`}
                                    onClick={() => setField('tiene_bano', false)}
                                    id="btn-bano-no"
                                >
                                    Sin Baño
                                </button>
                            </div>
                        </div>

                    </div>
                </div>

                <BusPreviewMini config={previewConfig()} />

                <div className="admin-seccion">
                    <div className="admin-seccion-titulo">
                        <span className="seccion-icono">✨</span> Amenidades
                    </div>
                    <div className="admin-seccion-cuerpo">
                        <div className="amenidades-grid">
                            {AMENIDADES_DISPONIBLES.map(a => (
                                <button
                                    key={a.id}
                                    type="button"
                                    className={`amenidad-tag ${form.amenidades.includes(a.id) ? 'activo' : ''}`}
                                    onClick={() => toggleAmenidad(a.id)}
                                    id={`amenidad-${a.id.replace(/\s/g, '-')}`}
                                >
                                    {a.icono} {a.id}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="admin-footer" style={{ borderRadius: '0 0 14px 14px' }}>
                    <button type="button" className="btn-admin-cancelar" onClick={() => navigate(-1)} disabled={guardando}>
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="btn-admin-guardar"
                        disabled={guardando || placaEstado === 'duplicado'}
                        id="btn-guardar-bus"
                    >
                        {guardando ? 'Guardando...' : '💾 Guardar Bus'}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default RegistroBus;
