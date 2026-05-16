import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import { SUCURSALES_MOCK } from '../../data/mockDiscoveryDB';
import { useToast } from '../../componentes/ToastNotifications';
import { listarRutas, crearRuta, actualizarRuta, toggleRuta } from '../../servicios/fleetService';
import gsap from 'gsap';
import '../../estilos/escritorio/admin.css';
import '../../estilos/movil/admin-responsivo.css';

const DEPARTAMENTOS_LISTA = ['La Paz', 'Cochabamba', 'Santa Cruz', 'Oruro', 'Potosí', 'Sucre', 'Tarija', 'Trinidad', 'Cobija'];

const FORM_INICIAL = {
    origen: '', destino: '',
    departamento_origen: 'La Paz', departamento_destino: 'Cochabamba',
    distancia_km: '', duracion_estimada: '',
};

const PARADA_INICIAL = { nombre: '', distancia_km: '', tiempo_min: '' };

const GestionRutas = () => {
    const { perfil, logout } = useAuth();
    const navigate = useNavigate();
    const { mostrar } = useToast();
    const rootRef = useRef(null);

    const sucursalInfo = SUCURSALES_MOCK.find(s => s.id === perfil?.sucursal_id) || SUCURSALES_MOCK[0];
    const deptNombre = perfil?.departamento || sucursalInfo?.departamento || 'La Paz';
    const tema = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];

    const [rutas,       setRutas]       = useState([]);
    const [cargando,    setCargando]    = useState(true);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [editando,    setEditando]    = useState(null);
    const [form,        setForm]        = useState(FORM_INICIAL);
    const [paradas,     setParadas]     = useState([{ ...PARADA_INICIAL }]);
    const [errores,     setErrores]     = useState({});
    const [guardando,   setGuardando]   = useState(false);
    const [feedback,    setFeedback]    = useState(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-anim="header"]',  { y: -24, opacity: 0, duration: 0.4, ease: 'power3.out' });
            gsap.from('[data-anim="sidebar"]', { x: -24, opacity: 0, duration: 0.4, ease: 'power3.out', delay: 0.1 });
            gsap.from('[data-anim="content"]', { y: 24,  opacity: 0, duration: 0.4, ease: 'power3.out', delay: 0.15 });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    const cargar = async () => {
        setCargando(true);
        try { setRutas(await listarRutas()); }
        catch (err) { mostrar('Error al cargar rutas: ' + err.message, 'error'); }
        finally { setCargando(false); }
    };

    useEffect(() => { cargar(); }, []); // eslint-disable-line

    const setField = (k, v) => {
        setForm(p => ({ ...p, [k]: v }));
        setErrores(p => ({ ...p, [k]: null }));
    };

    const setParada = (idx, k, v) => {
        setParadas(p => p.map((item, i) => i === idx ? { ...item, [k]: v } : item));
    };

    const agregarParada = () => setParadas(p => [...p, { ...PARADA_INICIAL }]);

    const eliminarParada = (idx) => setParadas(p => p.filter((_, i) => i !== idx));

    const distanciaTotal = paradas.length > 0
        ? paradas.reduce((sum, p) => sum + (Number(p.distancia_km) || 0), 0)
        : 0;

    const tiempoTotal = paradas.length > 0
        ? paradas.reduce((sum, p) => sum + (Number(p.tiempo_min) || 0), 0)
        : 0;

    const validar = () => {
        const errs = {};
        if (!form.origen.trim())  errs.origen  = 'El origen es obligatorio.';
        if (!form.destino.trim()) errs.destino  = 'El destino es obligatorio.';
        if (form.origen.trim().toLowerCase() === form.destino.trim().toLowerCase())
            errs.destino = 'Origen y destino no pueden ser iguales.';
        if (!form.distancia_km || Number(form.distancia_km) <= 0)
            errs.distancia_km = 'Distancia debe ser mayor a 0 km.';
        if (paradas.length < 3)
            errs.paradas = 'Se requieren mínimo 3 paradas intermedias.';
        paradas.forEach((p, i) => {
            if (!p.nombre.trim()) errs[`parada_${i}`] = 'Nombre requerido.';
        });
        setErrores(errs);
        return Object.keys(errs).length === 0;
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        if (!validar()) return;
        setGuardando(true);
        setFeedback(null);
        try {
            const datos = {
                origen:               form.origen.trim(),
                destino:              form.destino.trim(),
                departamento_origen:  form.departamento_origen,
                departamento_destino: form.departamento_destino,
                distancia_km:         Number(form.distancia_km),
                duracion_estimada:    form.duracion_estimada ? Number(form.duracion_estimada) : tiempoTotal || null,
                paradas: paradas.map((p, i) => ({
                    nombre:      p.nombre.trim(),
                    distancia_km:Number(p.distancia_km) || 0,
                    tiempo_min:  Number(p.tiempo_min)   || 0,
                    orden:       i + 1,
                })),
            };
            if (editando) {
                const res = await actualizarRuta(editando, datos);
                if (!res.exito) throw new Error(res.error);
                mostrar(`✅ Ruta "${form.origen} → ${form.destino}" actualizada.`, 'exito');
            } else {
                const res = await crearRuta(datos);
                if (!res.exito) throw new Error(res.error);
                mostrar(`✅ Ruta "${form.origen} → ${form.destino}" creada con ${paradas.length} paradas.`, 'exito');
            }
            setForm(FORM_INICIAL);
            setParadas([{ ...PARADA_INICIAL }]);
            setEditando(null);
            setMostrarForm(false);
            cargar();
        } catch (err) {
            console.error('GestionRutas - handleGuardar:', err);
            setFeedback({ tipo: 'error', msg: `❌ ${err.message}` });
        } finally {
            setGuardando(false);
        }
    };

    const handleEditar = (r) => {
        setForm({
            origen:               r.origen,
            destino:              r.destino,
            departamento_origen:  r.departamento_origen  || 'La Paz',
            departamento_destino: r.departamento_destino || 'Cochabamba',
            distancia_km:         r.distancia_km || '',
            duracion_estimada:    r.duracion_estimada || '',
        });
        setParadas(r.paradas?.length > 0 ? r.paradas.map(p => ({ nombre: p.nombre, distancia_km: p.distancia_km || '', tiempo_min: p.tiempo_min || '' })) : [{ ...PARADA_INICIAL }]);
        setEditando(r.id);
        setMostrarForm(true);
        setFeedback(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelar = () => {
        setForm(FORM_INICIAL);
        setParadas([{ ...PARADA_INICIAL }]);
        setEditando(null);
        setMostrarForm(false);
        setFeedback(null);
        setErrores({});
    };

    const handleToggle = async (r) => {
        try {
            const res = await toggleRuta(r.id);
            if (!res.exito) throw new Error(res.error);
            mostrar(`${res.data.activa ? '✅ Activada' : '🔴 Desactivada'}: ${r.origen} → ${r.destino}`, res.data.activa ? 'exito' : 'alerta');
            cargar();
        } catch (err) {
            mostrar('Error: ' + err.message, 'error');
        }
    };

    return (
        <div ref={rootRef} style={{ display: 'flex', minHeight: '100vh', background: '#07111f', color: '#f1f5f9', fontFamily: "'Inter', system-ui, sans-serif" }}>

            {/* Sidebar */}
            <aside data-anim="sidebar" style={{
                width: 230, minHeight: '100vh', background: '#0b1628',
                borderRight: `1px solid ${tema.color}18`, padding: '1.5rem 1rem',
                display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: 0,
            }}>
                <div style={{ background: `${tema.color}15`, borderRadius: 10, padding: '0.8rem', border: `1px solid ${tema.color}25` }}>
                    <div style={{ fontSize: '1.5rem' }}>{sucursalInfo?.logoEmoji || '🏢'}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: tema.color }}>{sucursalInfo?.nombre || 'Admin'}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{deptNombre}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {[
                        { path: '/admin/dashboard',   icon: '🏠', label: 'Dashboard' },
                        { path: '/admin/sucursales',  icon: '🏢', label: 'Sucursales' },
                        { path: '/admin/rutas',       icon: '🛣️', label: 'Rutas', activo: true },
                        { path: '/admin/itinerarios', icon: '📅', label: 'Itinerarios' },
                        { path: '/admin/recursos',    icon: '📊', label: 'Disponibilidad' },
                        { path: '/admin/bus/nuevo',   icon: '🚌', label: 'Registrar Bus' },
                    ].map(item => (
                        <button key={item.path} onClick={() => navigate(item.path)} style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            background: item.activo ? `${tema.color}18` : 'transparent',
                            border: item.activo ? `1px solid ${tema.color}30` : '1px solid transparent',
                            color: item.activo ? tema.color : '#94a3b8',
                            borderRadius: 8, padding: '0.5rem 0.75rem', cursor: 'pointer',
                            fontSize: '0.83rem', fontWeight: item.activo ? 600 : 400, textAlign: 'left', width: '100%',
                        }}>
                            {item.icon} {item.label}
                        </button>
                    ))}
                </div>
                <div style={{ marginTop: 'auto' }}>
                    <button onClick={() => { logout(); navigate('/login'); }} style={{
                        width: '100%', padding: '0.5rem', borderRadius: 8,
                        background: 'transparent', border: '1px solid #334155',
                        color: '#64748b', cursor: 'pointer', fontSize: '0.8rem',
                    }}>← Salir</button>
                </div>
            </aside>

            {/* Main */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div data-anim="header" style={{
                    padding: '1.25rem 2rem', borderBottom: `1px solid ${tema.color}18`,
                    background: '#0b1628', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>🛣️ Gestión de Rutas</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Configura rutas con paradas intermedias · Mínimo 3 paradas</div>
                    </div>
                    <button onClick={() => { setMostrarForm(!mostrarForm); if (mostrarForm) handleCancelar(); }} style={{
                        background: tema.color, color: '#fff', border: 'none', borderRadius: 8,
                        padding: '0.55rem 1.1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                    }}>
                        {mostrarForm ? '✕ Cancelar' : '+ Nueva Ruta'}
                    </button>
                </div>

                <div data-anim="content" style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Formulario */}
                    {mostrarForm && (
                        <form onSubmit={handleGuardar} noValidate style={{
                            background: '#0d1a2e', borderRadius: 14, border: `1px solid ${tema.color}22`, padding: '1.5rem',
                            display: 'flex', flexDirection: 'column', gap: '1.25rem',
                        }}>
                            <div style={{ fontWeight: 700, color: tema.color }}>
                                {editando ? '✏️ Editar Ruta' : '➕ Nueva Ruta'}
                            </div>
                            {feedback && <div className={`admin-feedback ${feedback.tipo}`}>{feedback.msg}</div>}

                            <div className="campos-grid-2">
                                <div className="campo-grupo">
                                    <label className="campo-label">Origen <span className="campo-requerido">*</span></label>
                                    <input className={`campo-input ${errores.origen ? 'error' : ''}`}
                                        value={form.origen} onChange={e => setField('origen', e.target.value)} placeholder="La Paz" />
                                    {errores.origen && <div className="campo-error-msg">{errores.origen}</div>}
                                </div>
                                <div className="campo-grupo">
                                    <label className="campo-label">Destino <span className="campo-requerido">*</span></label>
                                    <input className={`campo-input ${errores.destino ? 'error' : ''}`}
                                        value={form.destino} onChange={e => setField('destino', e.target.value)} placeholder="Cochabamba" />
                                    {errores.destino && <div className="campo-error-msg">{errores.destino}</div>}
                                </div>
                                <div className="campo-grupo">
                                    <label className="campo-label">Depto. Origen</label>
                                    <select className="campo-select" value={form.departamento_origen} onChange={e => setField('departamento_origen', e.target.value)}>
                                        {DEPARTAMENTOS_LISTA.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="campo-grupo">
                                    <label className="campo-label">Depto. Destino</label>
                                    <select className="campo-select" value={form.departamento_destino} onChange={e => setField('departamento_destino', e.target.value)}>
                                        {DEPARTAMENTOS_LISTA.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="campo-grupo">
                                    <label className="campo-label">Distancia total (km) <span className="campo-requerido">*</span></label>
                                    <input type="number" className={`campo-input ${errores.distancia_km ? 'error' : ''}`}
                                        value={form.distancia_km} onChange={e => setField('distancia_km', e.target.value)} min="1" placeholder="380" />
                                    {errores.distancia_km && <div className="campo-error-msg">{errores.distancia_km}</div>}
                                </div>
                                <div className="campo-grupo">
                                    <label className="campo-label">Duración estimada (min)</label>
                                    <input type="number" className="campo-input"
                                        value={form.duracion_estimada} onChange={e => setField('duracion_estimada', e.target.value)} min="1" placeholder="Auto-calculado de paradas" />
                                    {tiempoTotal > 0 && !form.duracion_estimada && (
                                        <div className="campo-hint">Auto: {tiempoTotal} min ({Math.round(tiempoTotal/60)}h {tiempoTotal%60}m)</div>
                                    )}
                                </div>
                            </div>

                            {/* Paradas */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                    <label style={{ fontWeight: 600, color: '#94a3b8', fontSize: '0.88rem' }}>
                                        Paradas intermedias <span style={{ color: '#ef4444' }}>* (mín. 3)</span>
                                        {' '}<span style={{ color: '#64748b', fontWeight: 400 }}>— {paradas.length} añadidas</span>
                                    </label>
                                    <button type="button" onClick={agregarParada} style={{
                                        background: `${tema.color}15`, border: `1px solid ${tema.color}40`, color: tema.color,
                                        borderRadius: 8, padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem',
                                    }}>+ Agregar parada</button>
                                </div>
                                {errores.paradas && <div className="campo-error-msg" style={{ marginBottom: '0.5rem' }}>{errores.paradas}</div>}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {paradas.map((p, idx) => (
                                        <div key={idx} style={{
                                            display: 'grid', gridTemplateColumns: '1fr 120px 120px 36px', gap: '0.5rem', alignItems: 'start',
                                            background: '#0f172a', borderRadius: 8, padding: '0.6rem 0.75rem', border: '1px solid #1e293b',
                                        }}>
                                            <div>
                                                <input className={`campo-input ${errores[`parada_${idx}`] ? 'error' : ''}`}
                                                    value={p.nombre} onChange={e => setParada(idx, 'nombre', e.target.value)}
                                                    placeholder={`Parada ${idx + 1} (ej: Oruro)`} style={{ marginBottom: 0 }} />
                                                {errores[`parada_${idx}`] && <div className="campo-error-msg">{errores[`parada_${idx}`]}</div>}
                                            </div>
                                            <input type="number" className="campo-input" value={p.distancia_km}
                                                onChange={e => setParada(idx, 'distancia_km', e.target.value)}
                                                placeholder="km desde origen" min="0" style={{ marginBottom: 0 }} />
                                            <input type="number" className="campo-input" value={p.tiempo_min}
                                                onChange={e => setParada(idx, 'tiempo_min', e.target.value)}
                                                placeholder="min desde inicio" min="0" style={{ marginBottom: 0 }} />
                                            <button type="button" onClick={() => eliminarParada(idx)} style={{
                                                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                                                color: '#fca5a5', borderRadius: 6, cursor: 'pointer', width: 36, height: 38,
                                            }}>✕</button>
                                        </div>
                                    ))}
                                </div>

                                {paradas.length >= 3 && (distanciaTotal > 0 || tiempoTotal > 0) && (
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                                        Acumulado paradas: {distanciaTotal} km · {tiempoTotal} min
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn-admin-cancelar" onClick={handleCancelar}>Cancelar</button>
                                <button type="submit" className="btn-admin-guardar" disabled={guardando}>
                                    {guardando ? 'Guardando...' : editando ? '💾 Actualizar' : '💾 Crear Ruta'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Tabla rutas */}
                    <div style={{ background: '#0d1a2e', borderRadius: 14, border: `1px solid ${tema.color}18`, overflow: 'hidden' }}>
                        <div style={{ padding: '1rem 1.5rem', borderBottom: `1px solid ${tema.color}18`, fontWeight: 700 }}>🛣️ Rutas registradas</div>
                        {cargando ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>Cargando...</div>
                        ) : rutas.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>Sin rutas registradas.</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
                                    <thead>
                                        <tr style={{ background: '#07111f' }}>
                                            {['Ruta', 'Distancia', 'Duración', 'Paradas', 'Estado', 'Acciones'].map(h => (
                                                <th key={h} style={{ padding: '0.75rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rutas.map(r => (
                                            <tr key={r.id} style={{ borderBottom: '1px solid #0d1a2e' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#0f172a'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ padding: '0.75rem' }}>
                                                    <div style={{ fontWeight: 600 }}>{r.origen} → {r.destino}</div>
                                                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{r.departamento_origen} → {r.departamento_destino}</div>
                                                </td>
                                                <td style={{ padding: '0.75rem', color: '#94a3b8' }}>{r.distancia_km} km</td>
                                                <td style={{ padding: '0.75rem', color: '#94a3b8' }}>
                                                    {r.duracion_estimada ? `${Math.floor(r.duracion_estimada/60)}h ${r.duracion_estimada%60}m` : '—'}
                                                </td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    {r.paradas?.length > 0 ? (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                            {r.paradas.map(p => (
                                                                <span key={p.id} style={{
                                                                    background: `${tema.color}15`, border: `1px solid ${tema.color}25`,
                                                                    color: '#94a3b8', padding: '0.1rem 0.45rem', borderRadius: 999, fontSize: '0.7rem',
                                                                }}>{p.nombre}</span>
                                                            ))}
                                                        </div>
                                                    ) : <span style={{ color: '#475569', fontSize: '0.75rem' }}>Sin paradas</span>}
                                                </td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    <span style={{
                                                        padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600,
                                                        background: r.activa ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)',
                                                        color: r.activa ? '#6ee7b7' : '#94a3b8',
                                                    }}>{r.activa ? '✅ Activa' : '🔴 Inactiva'}</span>
                                                </td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                        <button onClick={() => handleEditar(r)} style={{
                                                            padding: '0.3rem 0.65rem', borderRadius: 6, border: `1px solid ${tema.color}40`,
                                                            background: `${tema.color}10`, color: tema.color, cursor: 'pointer', fontSize: '0.75rem',
                                                        }}>✏️</button>
                                                        <button onClick={() => handleToggle(r)} style={{
                                                            padding: '0.3rem 0.65rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem',
                                                            border: r.activa ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(16,185,129,0.4)',
                                                            background: r.activa ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                                            color: r.activa ? '#fca5a5' : '#6ee7b7',
                                                        }}>{r.activa ? '🔴' : '✅'}</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GestionRutas;
