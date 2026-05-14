import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../servicios/supabase';
import gsap from 'gsap';
import '../../estilos/escritorio/admin.css';
import '../../estilos/escritorio/mapa-asientos.css';
import '../../estilos/movil/admin-responsivo.css';

const AMENIDADES_DISPONIBLES = [
    { id: 'WiFi',               icono: '📶' },
    { id: 'USB',                icono: '🔌' },
    { id: 'Aire Acondicionado', icono: '❄️' },
    { id: 'Bus Cama',           icono: '🛏️' },
    { id: 'TV',                 icono: '📺' },
    { id: 'Baño',               icono: '🚿' },
    { id: 'Calefacción',        icono: '🔥' },
];

const CATEGORIAS = [
    { id: 'economico',  label: 'Económico',  icono: '🚌', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)'  },
    { id: 'semicama',   label: 'Semi-Cama',  icono: '🛋️', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)'   },
    { id: 'cama',       label: 'Cama',       icono: '🛏️', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)'  },
    { id: 'vip',        label: 'VIP',        icono: '⭐', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'   },
    { id: 'ejecutivo',  label: 'Ejecutivo',  icono: '💎', color: '#34d399', bg: 'rgba(52,211,153,0.1)'   },
];

const estadoDoc = (fechaStr) => {
    if (!fechaStr) return null;
    const diff = (new Date(fechaStr) - new Date()) / 86400000;
    if (diff < 0) return 'vencido';
    if (diff <= 30) return 'por_vencer';
    return 'vigente';
};

const BadgeDoc = ({ fecha, label }) => {
    const est = estadoDoc(fecha);
    if (!est) return null;
    const cfg = {
        vigente:    { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: '✅', texto: `${label} vigente` },
        por_vencer: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: '⚠️', texto: `${label} vence en <30 días` },
        vencido:    { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  icon: '❌', texto: `${label} VENCIDO` },
    };
    const c = cfg[est];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            fontSize: '0.75rem', fontWeight: 600, color: c.color,
            background: c.bg, padding: '0.2rem 0.65rem', borderRadius: 999,
        }}>
            {c.icon} {c.texto}
        </span>
    );
};

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

const FORM_INICIAL = {
    sucursal_id:       '',
    placa:             '',
    marca:             '',
    modelo:            '',
    anio:              new Date().getFullYear(),
    categoria:         'economico',
    pisos:             1,
    columnas:          4,
    filas_piso_1:      10,
    filas_piso_2:      8,
    tiene_bano:        false,
    amenidades:        [],
    soat_numero:       '',
    soat_vence:        '',
    inspeccion_numero: '',
    inspeccion_vence:  '',
};

const RegistroBus = () => {
    const navigate = useNavigate();
    const containerRef = useRef(null);

    const [form, setForm]           = useState(FORM_INICIAL);
    const [placaEstado, setPlacaEstado] = useState(null);
    const [errores,     setErrores]     = useState({});
    const [feedback,    setFeedback]    = useState(null);
    const [guardando,   setGuardando]   = useState(false);
    const [sucursales,  setSucursales]  = useState([]);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-anim="seccion"]', {
                y: 28, opacity: 0, duration: 0.5,
                stagger: 0.1, ease: 'power3.out', delay: 0.1,
            });
        }, containerRef);
        return () => ctx.revert();
    }, []);

    useEffect(() => {
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
        pisos:      form.pisos,
        columnas:   form.columnas,
        filasPiso1: Math.max(1, Math.min(20, Number(form.filas_piso_1) || 10)),
        filasPiso2: form.pisos === 2 ? Math.max(1, Math.min(20, Number(form.filas_piso_2) || 8)) : 0,
        tieneBano:  form.tiene_bano,
    }), [form]);

    const validar = () => {
        const errs = {};
        if (!form.placa.trim())   errs.placa = 'La placa es obligatoria.';
        if (placaEstado === 'duplicado') errs.placa = 'Esta placa ya está registrada.';
        if (!form.filas_piso_1 || form.filas_piso_1 < 1) errs.filas_piso_1 = 'Mínimo 1 fila.';
        if (form.pisos === 2 && (!form.filas_piso_2 || form.filas_piso_2 < 1)) {
            errs.filas_piso_2 = 'Mínimo 1 fila en piso 2.';
        }
        if (form.soat_vence && estadoDoc(form.soat_vence) === 'vencido') {
            errs.soat_vence = 'SOAT vencido — el bus no podrá asignarse a itinerarios.';
        }
        if (form.inspeccion_vence && estadoDoc(form.inspeccion_vence) === 'vencido') {
            errs.inspeccion_vence = 'Inspección técnica vencida — el bus no podrá asignarse.';
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
                    sucursal_id:            form.sucursal_id || null,
                    placa:                  form.placa.trim().toUpperCase(),
                    marca:                  form.marca.trim() || null,
                    modelo:                 form.modelo.trim() || null,
                    anio:                   form.anio ? Number(form.anio) : null,
                    categoria:              form.categoria,
                    configuracion_asientos: form.columnas === 4 ? '2+2' : '2+1',
                    capacidad:              capPiso1 + capPiso2,
                    pisos:                  form.pisos,
                    columnas:               form.columnas,
                    filas_piso_1:           Number(form.filas_piso_1),
                    filas_piso_2:           form.pisos === 2 ? Number(form.filas_piso_2) : 0,
                    tiene_bano:             form.tiene_bano,
                    amenidades:             form.amenidades,
                    soat_numero:            form.soat_numero.trim() || null,
                    soat_vence:             form.soat_vence || null,
                    inspeccion_numero:      form.inspeccion_numero.trim() || null,
                    inspeccion_vence:       form.inspeccion_vence || null,
                    estado:                 'disponible',
                }]);

            if (error) throw error;

            setFeedback({
                tipo: 'exito',
                msg: `✅ Bus ${form.placa.toUpperCase()} registrado — ${capPiso1 + capPiso2} asientos · Categoría ${form.categoria}.`
            });
            setForm(FORM_INICIAL);
            setPlacaEstado(null);
        } catch (err) {
            console.error('RegistroBus - Error al guardar:', err);
            setFeedback({ tipo: 'error', msg: `❌ Error al guardar: ${err.message}` });
        } finally {
            setGuardando(false);
        }
    };

    const catSel = CATEGORIAS.find(c => c.id === form.categoria);

    return (
        <div className="pagina-admin" ref={containerRef}>
            <div className="admin-banner">
                <span className="admin-banner-icono">⚙️</span>
                Panel Administrativo
            </div>

            <div className="admin-header">
                <button className="btn-volver-admin" onClick={() => navigate(-1)} id="btn-volver-bus">← Volver</button>
                <div>
                    <h1>Registrar Bus</h1>
                    <div className="admin-header-sub">Configura el layout, categoría y documentación del vehículo</div>
                </div>
            </div>

            <form className="admin-contenido" onSubmit={handleGuardar} noValidate>
                {feedback && (
                    <div className={`admin-feedback ${feedback.tipo}`}>{feedback.msg}</div>
                )}

                {/* ── Identificación ─────────────────────────────────── */}
                <div className="admin-seccion" data-anim="seccion">
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

                        <div className="campos-grid-2" style={{ marginTop: '1.25rem' }}>
                            <div className="campo-grupo">
                                <label className="campo-label">Marca</label>
                                <input
                                    type="text"
                                    className="campo-input"
                                    value={form.marca}
                                    onChange={e => setField('marca', e.target.value)}
                                    placeholder="Ej: Mercedes-Benz, Volvo, Scania"
                                />
                            </div>
                            <div className="campo-grupo">
                                <label className="campo-label">Modelo</label>
                                <input
                                    type="text"
                                    className="campo-input"
                                    value={form.modelo}
                                    onChange={e => setField('modelo', e.target.value)}
                                    placeholder="Ej: OH-1621, B12R, Irizar"
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: '1.25rem' }}>
                            <div className="campo-grupo" style={{ maxWidth: 180 }}>
                                <label className="campo-label">Año de fabricación</label>
                                <input
                                    type="number"
                                    className="campo-input"
                                    value={form.anio}
                                    onChange={e => setField('anio', Number(e.target.value))}
                                    min={1990} max={new Date().getFullYear()}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Categoría ──────────────────────────────────────── */}
                <div className="admin-seccion" data-anim="seccion">
                    <div className="admin-seccion-titulo">
                        <span className="seccion-icono">🏷️</span> Categoría del Servicio
                        {catSel && (
                            <span style={{
                                marginLeft: 'auto', fontSize: '0.78rem', fontWeight: 600,
                                color: catSel.color, background: catSel.bg,
                                padding: '0.2rem 0.75rem', borderRadius: 999,
                            }}>
                                {catSel.icono} {catSel.label} seleccionado
                            </span>
                        )}
                    </div>
                    <div className="admin-seccion-cuerpo">
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                            gap: '0.75rem',
                        }}>
                            {CATEGORIAS.map(cat => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    id={`cat-${cat.id}`}
                                    onClick={() => setField('categoria', cat.id)}
                                    style={{
                                        padding: '0.9rem 0.75rem',
                                        background: form.categoria === cat.id ? cat.bg : '#0f172a',
                                        border: `2px solid ${form.categoria === cat.id ? cat.color : '#334155'}`,
                                        borderRadius: 10, color: form.categoria === cat.id ? cat.color : '#64748b',
                                        cursor: 'pointer', textAlign: 'center',
                                        transition: 'all 0.18s ease', fontWeight: 600,
                                    }}
                                    onMouseEnter={e => {
                                        if (form.categoria !== cat.id) {
                                            e.currentTarget.style.borderColor = cat.color;
                                            e.currentTarget.style.color = cat.color;
                                            gsap.to(e.currentTarget, { y: -2, duration: 0.15 });
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (form.categoria !== cat.id) {
                                            e.currentTarget.style.borderColor = '#334155';
                                            e.currentTarget.style.color = '#64748b';
                                            gsap.to(e.currentTarget, { y: 0, duration: 0.15 });
                                        }
                                    }}
                                >
                                    <div style={{ fontSize: '1.4rem', marginBottom: '0.35rem' }}>{cat.icono}</div>
                                    <div style={{ fontSize: '0.82rem' }}>{cat.label}</div>
                                </button>
                            ))}
                        </div>
                        <div className="campo-hint" style={{ marginTop: '0.75rem' }}>
                            Define el tipo de servicio y el rango de precio sugerido para este bus.
                        </div>
                    </div>
                </div>

                {/* ── Layout ─────────────────────────────────────────── */}
                <div className="admin-seccion" data-anim="seccion">
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

                {/* ── Amenidades ─────────────────────────────────────── */}
                <div className="admin-seccion" data-anim="seccion">
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

                {/* ── Documentación Legal ────────────────────────────── */}
                <div className="admin-seccion" data-anim="seccion">
                    <div className="admin-seccion-titulo">
                        <span className="seccion-icono">📋</span> Documentación Legal
                        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>
                            Buses con docs vencidos no pueden asignarse a itinerarios
                        </span>
                    </div>
                    <div className="admin-seccion-cuerpo">
                        {/* SOAT */}
                        <div style={{
                            background: '#0f172a', borderRadius: 10, border: '1px solid #334155',
                            padding: '1.25rem', marginBottom: '1rem'
                        }}>
                            <div style={{
                                fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8',
                                marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}>
                                🛡️ SOAT
                                {form.soat_vence && (
                                    <BadgeDoc fecha={form.soat_vence} label="SOAT" />
                                )}
                            </div>
                            <div className="campos-grid-2">
                                <div className="campo-grupo">
                                    <label className="campo-label">Número de SOAT</label>
                                    <input
                                        type="text"
                                        className="campo-input"
                                        value={form.soat_numero}
                                        onChange={e => setField('soat_numero', e.target.value)}
                                        placeholder="Ej: SOAT-2026-001234"
                                    />
                                </div>
                                <div className="campo-grupo">
                                    <label className="campo-label">Fecha de vencimiento</label>
                                    <input
                                        type="date"
                                        className={`campo-input ${errores.soat_vence ? 'error' : ''}`}
                                        value={form.soat_vence}
                                        onChange={e => setField('soat_vence', e.target.value)}
                                    />
                                    {errores.soat_vence && (
                                        <div className="campo-error-msg">{errores.soat_vence}</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Inspección Técnica */}
                        <div style={{
                            background: '#0f172a', borderRadius: 10, border: '1px solid #334155',
                            padding: '1.25rem'
                        }}>
                            <div style={{
                                fontSize: '0.85rem', fontWeight: 600, color: '#a78bfa',
                                marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}>
                                🔍 Inspección Técnica
                                {form.inspeccion_vence && (
                                    <BadgeDoc fecha={form.inspeccion_vence} label="Inspección" />
                                )}
                            </div>
                            <div className="campos-grid-2">
                                <div className="campo-grupo">
                                    <label className="campo-label">Número de inspección</label>
                                    <input
                                        type="text"
                                        className="campo-input"
                                        value={form.inspeccion_numero}
                                        onChange={e => setField('inspeccion_numero', e.target.value)}
                                        placeholder="Ej: RUAT-INSP-2026-5678"
                                    />
                                </div>
                                <div className="campo-grupo">
                                    <label className="campo-label">Fecha de vencimiento</label>
                                    <input
                                        type="date"
                                        className={`campo-input ${errores.inspeccion_vence ? 'error' : ''}`}
                                        value={form.inspeccion_vence}
                                        onChange={e => setField('inspeccion_vence', e.target.value)}
                                    />
                                    {errores.inspeccion_vence && (
                                        <div className="campo-error-msg">{errores.inspeccion_vence}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Footer ─────────────────────────────────────────── */}
                <div className="admin-footer" data-anim="seccion" style={{ borderRadius: '0 0 14px 14px' }}>
                    <button type="button" className="btn-admin-cancelar" onClick={() => navigate(-1)} disabled={guardando}>
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="btn-admin-guardar"
                        disabled={guardando || placaEstado === 'duplicado'}
                        id="btn-guardar-bus"
                        onMouseEnter={e => { if (!guardando) gsap.to(e.currentTarget, { scale: 1.03, duration: 0.15 }); }}
                        onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, duration: 0.15 })}
                    >
                        {guardando ? 'Guardando...' : '💾 Guardar Bus'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RegistroBus;
