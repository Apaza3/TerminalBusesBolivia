import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import { supabase } from '../../servicios/supabase';

const AMENIDADES_DISPONIBLES = [
    { id: 'WiFi', icono: '📶' }, { id: 'USB', icono: '🔌' },
    { id: 'Aire Acondicionado', icono: '❄️' }, { id: 'TV', icono: '📺' },
    { id: 'Baño', icono: '🚿' }, { id: 'Calefacción', icono: '🔥' },
];

const CATEGORIAS = [
    { id: 'economico', label: 'Económico', icono: '🚌', color: '#94a3b8' },
    { id: 'semicama', label: 'Semi-Cama', icono: '🛋️', color: '#38bdf8' },
    { id: 'cama', label: 'Cama', icono: '🛏️', color: '#a78bfa' },
    { id: 'vip', label: 'VIP', icono: '⭐', color: '#fbbf24' },
    { id: 'ejecutivo', label: 'Ejecutivo', icono: '💎', color: '#34d399' },
];

const estadoDoc = (fechaStr) => {
    if (!fechaStr) return null;
    const diff = (new Date(fechaStr) - new Date()) / 86400000;
    if (diff < 0) return 'vencido';
    if (diff <= 30) return 'por_vencer';
    return 'vigente';
};

// columnas según categoría (cama/vip/ejecutivo = 2+1)
const colsDeCategoria = (cat) => (['cama', 'vip', 'ejecutivo'].includes(cat) ? 3 : 4);

// deriva filas por piso a partir de capacidad + columnas + pisos
const derivarAsientos = (capacidad, columnas, pisos) => {
    const totalFilas = Math.max(1, Math.round((Number(capacidad) || columnas) / columnas));
    if (pisos === 2) {
        const filas1 = Math.max(1, Math.ceil(totalFilas * 0.35));
        const filas2 = Math.max(1, totalFilas - filas1);
        return { filas1, filas2, capReal: columnas * (filas1 + filas2) };
    }
    return { filas1: totalFilas, filas2: 0, capReal: columnas * totalFilas };
};

const FORM_INICIAL = {
    sucursal_id: '', placa: '', marca: '', modelo: '',
    anio: new Date().getFullYear(), categoria: 'economico', pisos: 1, capacidad: 44,
    amenidades: [], soat_numero: '', soat_vence: '', inspeccion_numero: '', inspeccion_vence: '',
};

const RegistroBus = () => {
    const navigate = useNavigate();
    const { perfil } = useAuth();
    const deptNombre = perfil?.departamento || 'La Paz';
    const tema = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];

    const [form, setForm] = useState(FORM_INICIAL);
    const [placaEstado, setPlacaEstado] = useState(null);
    const [errores, setErrores] = useState({});
    const [feedback, setFeedback] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [sucursales, setSucursales] = useState([]);

    // default sucursal = la del admin
    useEffect(() => {
        (async () => {
            const { data } = await supabase.from('sucursales').select('id,nombre,departamentos(nombre)').order('nombre');
            setSucursales(data || []);
        })();
    }, []);
    useEffect(() => {
        if (perfil?.sucursal_id) setForm(prev => ({ ...prev, sucursal_id: perfil.sucursal_id }));
    }, [perfil?.sucursal_id]);

    const setField = (campo, valor) => {
        setForm(prev => ({ ...prev, [campo]: valor }));
        setErrores(prev => ({ ...prev, [campo]: null }));
    };
    const toggleAmenidad = (id) => setForm(prev => ({
        ...prev,
        amenidades: prev.amenidades.includes(id) ? prev.amenidades.filter(a => a !== id) : [...prev.amenidades, id],
    }));

    const verificarPlaca = async () => {
        const placa = form.placa.trim().toUpperCase();
        if (!placa || placa.length < 5) return;
        setPlacaEstado('cargando');
        try {
            const { data, error } = await supabase.from('buses').select('id').eq('placa', placa).maybeSingle();
            if (error) throw error;
            setPlacaEstado(data ? 'duplicado' : 'ok');
            if (data) setErrores(prev => ({ ...prev, placa: 'Esta placa ya está registrada.' }));
        } catch (err) { console.error(err); setPlacaEstado(null); }
    };

    const validar = () => {
        const errs = {};
        if (!form.placa.trim()) errs.placa = 'La placa es obligatoria.';
        if (placaEstado === 'duplicado') errs.placa = 'Esta placa ya está registrada.';
        if (!form.sucursal_id) errs.sucursal_id = 'Selecciona una sucursal.';
        if (!form.capacidad || form.capacidad < 4) errs.capacidad = 'Capacidad mínima 4.';
        if (form.soat_vence && estadoDoc(form.soat_vence) === 'vencido') errs.soat_vence = 'SOAT vencido.';
        if (form.inspeccion_vence && estadoDoc(form.inspeccion_vence) === 'vencido') errs.inspeccion_vence = 'Inspección vencida.';
        setErrores(errs);
        return Object.keys(errs).length === 0;
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        if (!validar()) return;
        setGuardando(true);
        setFeedback(null);
        const columnas = colsDeCategoria(form.categoria);
        const { filas1, filas2, capReal } = derivarAsientos(form.capacidad, columnas, form.pisos);
        try {
            const { error } = await supabase.from('buses').insert([{
                sucursal_id: form.sucursal_id || null,
                placa: form.placa.trim().toUpperCase(),
                marca: form.marca.trim() || null,
                modelo: form.modelo.trim() || null,
                anio: form.anio ? Number(form.anio) : null,
                categoria: form.categoria,
                configuracion_asientos: columnas === 4 ? '2+2' : '2+1',
                capacidad: capReal,
                pisos: form.pisos,
                columnas,
                filas_piso_1: filas1,
                filas_piso_2: filas2,
                tiene_bano: form.amenidades.includes('Baño'),
                amenidades: form.amenidades,
                soat_numero: form.soat_numero.trim() || null,
                soat_vence: form.soat_vence || null,
                inspeccion_numero: form.inspeccion_numero.trim() || null,
                inspeccion_vence: form.inspeccion_vence || null,
                estado: 'disponible',
                departamento_actual_id: perfil?.departamento_id || null,
            }]);
            if (error) throw error;
            setFeedback({ tipo: 'exito', msg: `✅ Bus ${form.placa.toUpperCase()} registrado — ${capReal} asientos (${form.pisos} piso${form.pisos === 2 ? 's' : ''}).` });
            setForm({ ...FORM_INICIAL, sucursal_id: perfil?.sucursal_id || '' });
            setPlacaEstado(null);
        } catch (err) {
            console.error(err);
            setFeedback({ tipo: 'error', msg: `❌ Error: ${err.message}` });
        } finally { setGuardando(false); }
    };

    // ── estilos ──
    const card = { background: '#0d1a2e', border: `1px solid ${tema.color}1f`, borderRadius: 16, padding: '1.5rem', marginBottom: '1.25rem' };
    const label = { display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.4rem' };
    const input = (err) => ({ width: '100%', background: '#07111f', border: `1px solid ${err ? '#ef4444' : tema.color + '30'}`, color: '#f1f5f9', borderRadius: 9, padding: '0.6rem 0.85rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' });
    const errMsg = { color: '#fca5a5', fontSize: '0.72rem', marginTop: '0.25rem' };
    const sectionTitle = { fontSize: '0.8rem', fontWeight: 800, color: tema.acento, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' };
    const grid2 = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' };

    return (
        <div style={{ color: '#f1f5f9', fontFamily: "'Inter', system-ui, sans-serif" }}>
            <form onSubmit={handleGuardar} style={{ maxWidth: 760, margin: '2rem auto', padding: '0 1rem' }}>
                {/* Título */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{
                        fontSize: 'clamp(1.5rem,3.5vw,2rem)', fontWeight: 900,
                        background: `linear-gradient(90deg, ${tema.color}, ${tema.colorSecundario})`,
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        fontFamily: "'Rajdhani', system-ui, sans-serif", textTransform: 'uppercase', lineHeight: 1.1,
                    }}>Registrar Bus</div>
                    <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '0.2rem' }}>
                        Alta de unidad para {perfil?.sucursal_nombre || deptNombre}
                    </div>
                </div>

                {feedback && (
                    <div style={{
                        padding: '0.85rem 1.1rem', borderRadius: 10, marginBottom: '1.25rem', fontSize: '0.85rem', fontWeight: 600,
                        background: feedback.tipo === 'exito' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                        border: `1px solid ${feedback.tipo === 'exito' ? '#10b98155' : '#ef444455'}`,
                        color: feedback.tipo === 'exito' ? '#6ee7b7' : '#fca5a5',
                    }}>{feedback.msg}</div>
                )}

                {/* Identificación */}
                <div style={card}>
                    <div style={sectionTitle}>🚌 Identificación</div>
                    <div style={grid2}>
                        <div>
                            <label style={label}>Placa *</label>
                            <input style={input(errores.placa)} value={form.placa}
                                onChange={e => { setField('placa', e.target.value.toUpperCase()); setPlacaEstado(null); }}
                                onBlur={verificarPlaca} placeholder="1234ABC" />
                            {placaEstado === 'cargando' && <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem' }}>Verificando…</div>}
                            {placaEstado === 'ok' && <div style={{ fontSize: '0.72rem', color: '#6ee7b7', marginTop: '0.25rem' }}>✓ Placa disponible</div>}
                            {errores.placa && <div style={errMsg}>{errores.placa}</div>}
                        </div>
                        <div>
                            <label style={label}>Sucursal *</label>
                            <select style={input(errores.sucursal_id)} value={form.sucursal_id} onChange={e => setField('sucursal_id', e.target.value)}>
                                <option value="">— Selecciona —</option>
                                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre} · {s.departamentos?.nombre || ''}</option>)}
                            </select>
                            {errores.sucursal_id && <div style={errMsg}>{errores.sucursal_id}</div>}
                        </div>
                        <div>
                            <label style={label}>Marca</label>
                            <input style={input()} value={form.marca} onChange={e => setField('marca', e.target.value)} placeholder="Volvo" />
                        </div>
                        <div>
                            <label style={label}>Modelo</label>
                            <input style={input()} value={form.modelo} onChange={e => setField('modelo', e.target.value)} placeholder="B420R" />
                        </div>
                        <div>
                            <label style={label}>Año</label>
                            <input type="number" style={input()} value={form.anio} min={1990} max={new Date().getFullYear() + 1}
                                onChange={e => setField('anio', e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* Configuración */}
                <div style={card}>
                    <div style={sectionTitle}>🛠️ Configuración</div>

                    {/* Pisos */}
                    <label style={label}>Pisos</label>
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
                        {[1, 2].map(p => (
                            <button type="button" key={p} onClick={() => setField('pisos', p)} style={{
                                flex: 1, padding: '1rem', borderRadius: 12, cursor: 'pointer', fontWeight: 800, fontSize: '0.95rem',
                                border: `2px solid ${form.pisos === p ? tema.color : '#1e293b'}`,
                                background: form.pisos === p ? `${tema.color}1f` : '#07111f',
                                color: form.pisos === p ? tema.acento : '#64748b', transition: 'all 0.15s',
                            }}>
                                <div style={{ fontSize: '1.6rem', marginBottom: '0.2rem' }}>{p === 1 ? '🚌' : '🚍'}</div>
                                {p === 1 ? '1 Piso' : '2 Pisos'}
                            </button>
                        ))}
                    </div>

                    {/* Categoría */}
                    <label style={label}>Categoría</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
                        {CATEGORIAS.map(c => (
                            <button type="button" key={c.id} onClick={() => setField('categoria', c.id)} style={{
                                padding: '0.55rem 0.9rem', borderRadius: 10, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
                                border: `1.5px solid ${form.categoria === c.id ? c.color : '#1e293b'}`,
                                background: form.categoria === c.id ? `${c.color}1f` : '#07111f',
                                color: form.categoria === c.id ? c.color : '#64748b',
                            }}>{c.icono} {c.label}</button>
                        ))}
                    </div>

                    {/* Capacidad */}
                    <div style={{ maxWidth: 220 }}>
                        <label style={label}>Capacidad (asientos)</label>
                        <input type="number" style={input(errores.capacidad)} value={form.capacidad} min={4} max={90}
                            onChange={e => setField('capacidad', Number(e.target.value))} />
                        {errores.capacidad && <div style={errMsg}>{errores.capacidad}</div>}
                        <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.3rem' }}>
                            Distribución {colsDeCategoria(form.categoria) === 4 ? '2+2' : '2+1'} · {form.pisos} piso{form.pisos === 2 ? 's' : ''}
                        </div>
                    </div>
                </div>

                {/* Amenidades */}
                <div style={card}>
                    <div style={sectionTitle}>✨ Amenidades</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {AMENIDADES_DISPONIBLES.map(a => {
                            const on = form.amenidades.includes(a.id);
                            return (
                                <button type="button" key={a.id} onClick={() => toggleAmenidad(a.id)} style={{
                                    padding: '0.5rem 0.85rem', borderRadius: 999, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                                    border: `1.5px solid ${on ? tema.color : '#1e293b'}`,
                                    background: on ? `${tema.color}1f` : '#07111f', color: on ? tema.acento : '#64748b',
                                }}>{a.icono} {a.id}</button>
                            );
                        })}
                    </div>
                </div>

                {/* Documentación */}
                <div style={card}>
                    <div style={sectionTitle}>📄 Documentación</div>
                    <div style={grid2}>
                        <div>
                            <label style={label}>SOAT — N°</label>
                            <input style={input()} value={form.soat_numero} onChange={e => setField('soat_numero', e.target.value)} placeholder="SOAT-2026-..." />
                        </div>
                        <div>
                            <label style={label}>SOAT — Vence</label>
                            <input type="date" style={input(errores.soat_vence)} value={form.soat_vence} onChange={e => setField('soat_vence', e.target.value)} />
                            {errores.soat_vence && <div style={errMsg}>{errores.soat_vence}</div>}
                        </div>
                        <div>
                            <label style={label}>Inspección — N°</label>
                            <input style={input()} value={form.inspeccion_numero} onChange={e => setField('inspeccion_numero', e.target.value)} placeholder="INS-2026-..." />
                        </div>
                        <div>
                            <label style={label}>Inspección — Vence</label>
                            <input type="date" style={input(errores.inspeccion_vence)} value={form.inspeccion_vence} onChange={e => setField('inspeccion_vence', e.target.value)} />
                            {errores.inspeccion_vence && <div style={errMsg}>{errores.inspeccion_vence}</div>}
                        </div>
                    </div>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => navigate(-1)} style={{
                        padding: '0.7rem 1.3rem', borderRadius: 10, border: '1px solid #334155', background: 'transparent',
                        color: '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem',
                    }}>Cancelar</button>
                    <button type="submit" disabled={guardando} style={{
                        padding: '0.7rem 1.6rem', borderRadius: 10, border: 'none', cursor: guardando ? 'not-allowed' : 'pointer',
                        background: `linear-gradient(90deg, ${tema.color}, ${tema.colorSecundario})`, color: '#06121f',
                        fontWeight: 800, fontSize: '0.9rem', opacity: guardando ? 0.7 : 1,
                    }}>{guardando ? 'Guardando…' : '＋ Registrar bus'}</button>
                </div>
            </form>
        </div>
    );
};

export default RegistroBus;
