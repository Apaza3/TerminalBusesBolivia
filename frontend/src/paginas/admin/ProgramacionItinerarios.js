import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import { SUCURSALES_MOCK } from '../../data/mockDiscoveryDB';
import { useToast } from '../../componentes/ToastNotifications';
import { listarRutas, listarBusesDisponibles, listarConductores, listarItinerarios, crearItinerario, cambiarEstadoItinerario } from '../../servicios/fleetService';
import { verificarSOATVigente, verificarInspeccionVigente, validarSolapamientoItinerario } from '../../utilidades/fleetValidators';
import gsap from 'gsap';
import '../../estilos/escritorio/admin.css';
import '../../estilos/movil/admin-responsivo.css';

const FORM_INICIAL = {
    ruta_id: '', bus_id: '', conductor_id: '', copiloto_id: '',
    salida_programada: '', precio_base: '', anden: '',
};

const ESTADOS_COLOR = {
    programado: { bg: 'rgba(59,130,246,0.15)',   color: '#93c5fd',  label: 'Programado' },
    en_ruta:    { bg: 'rgba(16,185,129,0.15)',   color: '#6ee7b7',  label: 'En Ruta' },
    finalizado: { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8',  label: 'Finalizado' },
    cancelado:  { bg: 'rgba(239,68,68,0.15)',    color: '#fca5a5',  label: 'Cancelado' },
};

const formatFecha = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });
};

const ProgramacionItinerarios = () => {
    const { perfil, logout } = useAuth();
    const navigate = useNavigate();
    const { mostrar } = useToast();
    const rootRef = useRef(null);

    const sucursalInfo = SUCURSALES_MOCK.find(s => s.id === perfil?.sucursal_id) || SUCURSALES_MOCK[0];
    const deptNombre = perfil?.departamento || sucursalInfo?.departamento || 'La Paz';
    const tema = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];

    const [rutas,        setRutas]        = useState([]);
    const [buses,        setBuses]        = useState([]);
    const [conductores,  setConductores]  = useState([]);
    const [itinerarios,  setItinerarios]  = useState([]);
    const [cargando,     setCargando]     = useState(true);
    const [mostrarForm,  setMostrarForm]  = useState(false);
    const [form,         setForm]         = useState(FORM_INICIAL);
    const [errores,      setErrores]      = useState({});
    const [validaciones, setValidaciones] = useState({ errores: [], advertencias: [] });
    const [guardando,    setGuardando]    = useState(false);
    const [feedback,     setFeedback]     = useState(null);
    const [filtroEstado, setFiltroEstado] = useState('');

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-anim="header"]',  { y: -24, opacity: 0, duration: 0.4, ease: 'power3.out' });
            gsap.from('[data-anim="sidebar"]', { x: -24, opacity: 0, duration: 0.4, ease: 'power3.out', delay: 0.1 });
            gsap.from('[data-anim="content"]', { y: 24,  opacity: 0, duration: 0.4, ease: 'power3.out', delay: 0.15 });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    const cargarOpciones = useCallback(async () => {
        try {
            const [r, b, c] = await Promise.all([listarRutas(true), listarBusesDisponibles(), listarConductores()]);
            setRutas(r);
            setBuses(b);
            setConductores(c);
        } catch (err) { mostrar('Error al cargar opciones: ' + err.message, 'error'); }
    }, [mostrar]);

    const cargarItinerarios = useCallback(async () => {
        setCargando(true);
        try {
            const filtros = filtroEstado ? { estado: filtroEstado } : {};
            setItinerarios(await listarItinerarios(filtros));
        } catch (err) { mostrar('Error: ' + err.message, 'error'); }
        finally { setCargando(false); }
    }, [filtroEstado, mostrar]);

    useEffect(() => { cargarOpciones(); }, [cargarOpciones]);
    useEffect(() => { cargarItinerarios(); }, [cargarItinerarios]);

    // Validación RN-02 en tiempo real al cambiar bus o fecha
    useEffect(() => {
        if (!form.bus_id || !form.salida_programada) { setValidaciones({ errores: [], advertencias: [] }); return; }

        const bus = buses.find(b => b.id === form.bus_id);
        if (!bus) return;

        const fecha = form.salida_programada.split('T')[0];
        const errs = [];
        const warns = [];

        const soat = verificarSOATVigente(bus.soat_vence, fecha);
        if (!soat.valido) errs.push(soat.error);
        else if (soat.advertencia) warns.push(soat.advertencia);

        const insp = verificarInspeccionVigente(bus.inspeccion_vence, fecha);
        if (!insp.valido) errs.push(insp.error);
        else if (insp.advertencia) warns.push(insp.advertencia);

        // Solapamiento local con itinerarios cargados
        const ruta = rutas.find(r => r.id === form.ruta_id);
        const duracion = ruta?.duracion_estimada || 240;
        const solapa = validarSolapamientoItinerario(itinerarios, form.bus_id, form.conductor_id, form.salida_programada, duracion);
        if (!solapa.valido) errs.push(solapa.error);

        setValidaciones({ errores: errs, advertencias: warns });
    }, [form.bus_id, form.conductor_id, form.salida_programada, form.ruta_id, buses, rutas, itinerarios]);

    const setField = (k, v) => {
        setForm(p => ({ ...p, [k]: v }));
        setErrores(p => ({ ...p, [k]: null }));
    };

    const validar = () => {
        const errs = {};
        if (!form.ruta_id)          errs.ruta_id          = 'Selecciona una ruta.';
        if (!form.bus_id)           errs.bus_id           = 'Selecciona un bus.';
        if (!form.salida_programada)errs.salida_programada= 'Fecha y hora de salida requeridas.';
        if (!form.precio_base || Number(form.precio_base) <= 0) errs.precio_base = 'Precio base debe ser > 0.';
        if (validaciones.errores.length > 0) errs._validacion = validaciones.errores.join(' | ');
        setErrores(errs);
        return Object.keys(errs).length === 0;
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        if (!validar()) return;
        setGuardando(true);
        setFeedback(null);
        try {
            const res = await crearItinerario({
                ruta_id:           form.ruta_id,
                bus_id:            form.bus_id,
                conductor_id:      form.conductor_id  || null,
                copiloto_id:       form.copiloto_id   || null,
                salida_programada: form.salida_programada,
                precio_base:       Number(form.precio_base),
                anden:             form.anden.trim()  || null,
            });
            if (!res.exito) throw new Error(res.error);

            const ruta = rutas.find(r => r.id === form.ruta_id);
            mostrar(`✅ Itinerario programado: ${ruta?.origen || ''} → ${ruta?.destino || ''}`, 'exito');
            setForm(FORM_INICIAL);
            setMostrarForm(false);
            cargarItinerarios();
        } catch (err) {
            console.error('ProgramacionItinerarios - handleGuardar:', err);
            setFeedback({ tipo: 'error', msg: `❌ ${err.message}` });
        } finally { setGuardando(false); }
    };

    const handleCambiarEstado = async (it, nuevoEstado) => {
        try {
            const res = await cambiarEstadoItinerario(it.id, nuevoEstado);
            if (!res.exito) throw new Error(res.error);
            mostrar(`Estado actualizado: ${nuevoEstado}`, 'exito');
            cargarItinerarios();
        } catch (err) { mostrar('Error: ' + err.message, 'error'); }
    };

    const rutaSeleccionada = rutas.find(r => r.id === form.ruta_id);
    const busSeleccionado  = buses.find(b => b.id === form.bus_id);
    const hayErroresVal    = validaciones.errores.length > 0;

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
                        { path: '/admin/rutas',       icon: '🛣️', label: 'Rutas' },
                        { path: '/admin/itinerarios', icon: '📅', label: 'Itinerarios', activo: true },
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
                        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>📅 Programación de Itinerarios</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Asigna ruta + bus + conductor · Valida SOAT y solapamientos</div>
                    </div>
                    <button onClick={() => setMostrarForm(!mostrarForm)} style={{
                        background: tema.color, color: '#fff', border: 'none', borderRadius: 8,
                        padding: '0.55rem 1.1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                    }}>
                        {mostrarForm ? '✕ Cancelar' : '+ Nuevo Itinerario'}
                    </button>
                </div>

                <div data-anim="content" style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Formulario */}
                    {mostrarForm && (
                        <form onSubmit={handleGuardar} noValidate style={{
                            background: '#0d1a2e', borderRadius: 14, border: `1px solid ${tema.color}22`,
                            padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem',
                        }}>
                            <div style={{ fontWeight: 700, color: tema.color }}>➕ Nuevo Itinerario</div>
                            {feedback && <div className={`admin-feedback ${feedback.tipo}`}>{feedback.msg}</div>}

                            {/* Alertas de validación RN-02 */}
                            {hayErroresVal && (
                                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem 1rem' }}>
                                    <div style={{ color: '#fca5a5', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem' }}>⛔ Bloqueos RN-02</div>
                                    {validaciones.errores.map((e, i) => <div key={i} style={{ color: '#fca5a5', fontSize: '0.82rem' }}>• {e}</div>)}
                                </div>
                            )}
                            {validaciones.advertencias.length > 0 && (
                                <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '0.75rem 1rem' }}>
                                    <div style={{ color: '#fde68a', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem' }}>⚠️ Advertencias</div>
                                    {validaciones.advertencias.map((a, i) => <div key={i} style={{ color: '#fde68a', fontSize: '0.82rem' }}>• {a}</div>)}
                                </div>
                            )}

                            <div className="campos-grid-2">
                                {/* Ruta */}
                                <div className="campo-grupo">
                                    <label className="campo-label">Ruta <span className="campo-requerido">*</span></label>
                                    <select className={`campo-select ${errores.ruta_id ? 'error' : ''}`} value={form.ruta_id} onChange={e => setField('ruta_id', e.target.value)}>
                                        <option value="">— Seleccionar ruta —</option>
                                        {rutas.map(r => <option key={r.id} value={r.id}>{r.origen} → {r.destino} ({r.distancia_km} km)</option>)}
                                    </select>
                                    {errores.ruta_id && <div className="campo-error-msg">{errores.ruta_id}</div>}
                                    {rutaSeleccionada && (
                                        <div className="campo-hint">{rutaSeleccionada.paradas?.length || 0} paradas · {rutaSeleccionada.duracion_estimada ? `${Math.floor(rutaSeleccionada.duracion_estimada/60)}h ${rutaSeleccionada.duracion_estimada%60}m` : 'duración no especificada'}</div>
                                    )}
                                </div>

                                {/* Bus */}
                                <div className="campo-grupo">
                                    <label className="campo-label">Bus <span className="campo-requerido">*</span></label>
                                    <select className={`campo-select ${errores.bus_id || hayErroresVal ? 'error' : ''}`} value={form.bus_id} onChange={e => setField('bus_id', e.target.value)}>
                                        <option value="">— Seleccionar bus —</option>
                                        {buses.map(b => <option key={b.id} value={b.id}>{b.placa} · {b.marca} {b.modelo} · {b.capacidad} asientos</option>)}
                                    </select>
                                    {errores.bus_id && <div className="campo-error-msg">{errores.bus_id}</div>}
                                    {busSeleccionado && (
                                        <div className="campo-hint">SOAT: {busSeleccionado.soat_vence || 'no registrado'} · Inspección: {busSeleccionado.inspeccion_vence || 'no registrada'}</div>
                                    )}
                                </div>

                                {/* Conductor */}
                                <div className="campo-grupo">
                                    <label className="campo-label">Conductor Principal</label>
                                    <select className={`campo-select ${hayErroresVal && form.conductor_id ? 'error' : ''}`} value={form.conductor_id} onChange={e => setField('conductor_id', e.target.value)}>
                                        <option value="">— Seleccionar conductor —</option>
                                        {conductores.map(c => <option key={c.id} value={c.id}>{c.nombre_completo || c.nombre} {c.ci ? `(CI: ${c.ci})` : ''}</option>)}
                                    </select>
                                </div>

                                {/* Copiloto */}
                                <div className="campo-grupo">
                                    <label className="campo-label">Copiloto / Ayudante</label>
                                    <select className="campo-select" value={form.copiloto_id} onChange={e => setField('copiloto_id', e.target.value)}>
                                        <option value="">— Opcional —</option>
                                        {conductores.filter(c => c.id !== form.conductor_id).map(c => (
                                            <option key={c.id} value={c.id}>{c.nombre_completo || c.nombre}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Fecha/hora salida */}
                                <div className="campo-grupo">
                                    <label className="campo-label">Salida programada <span className="campo-requerido">*</span></label>
                                    <input type="datetime-local" className={`campo-input ${errores.salida_programada ? 'error' : ''}`}
                                        value={form.salida_programada} onChange={e => setField('salida_programada', e.target.value)}
                                        min={new Date().toISOString().slice(0, 16)} />
                                    {errores.salida_programada && <div className="campo-error-msg">{errores.salida_programada}</div>}
                                </div>

                                {/* Precio */}
                                <div className="campo-grupo">
                                    <label className="campo-label">Precio base (Bs.) <span className="campo-requerido">*</span></label>
                                    <input type="number" className={`campo-input ${errores.precio_base ? 'error' : ''}`}
                                        value={form.precio_base} onChange={e => setField('precio_base', e.target.value)}
                                        min="1" placeholder="120" />
                                    {errores.precio_base && <div className="campo-error-msg">{errores.precio_base}</div>}
                                </div>

                                {/* Andén */}
                                <div className="campo-grupo">
                                    <label className="campo-label">Número de andén</label>
                                    <input className="campo-input" value={form.anden} onChange={e => setField('anden', e.target.value)} placeholder="Ej: 12A" maxLength={10} />
                                </div>
                            </div>

                            {errores._validacion && (
                                <div className="admin-feedback error">{errores._validacion}</div>
                            )}

                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn-admin-cancelar" onClick={() => { setForm(FORM_INICIAL); setMostrarForm(false); setFeedback(null); setErrores({}); }}>Cancelar</button>
                                <button type="submit" className="btn-admin-guardar" disabled={guardando || hayErroresVal}>
                                    {guardando ? 'Guardando...' : hayErroresVal ? '⛔ Bloqueado por RN-02' : '💾 Programar Itinerario'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Filtros */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Estado:</span>
                        {['', 'programado', 'en_ruta', 'finalizado', 'cancelado'].map(e => (
                            <button key={e} onClick={() => setFiltroEstado(e)} style={{
                                padding: '0.3rem 0.75rem', borderRadius: 999, fontSize: '0.75rem', cursor: 'pointer',
                                background: filtroEstado === e ? `${tema.color}22` : 'transparent',
                                border: filtroEstado === e ? `1px solid ${tema.color}` : '1px solid #334155',
                                color: filtroEstado === e ? tema.color : '#64748b',
                            }}>{e ? (ESTADOS_COLOR[e]?.label || e) : 'Todos'}</button>
                        ))}
                    </div>

                    {/* Tabla itinerarios */}
                    <div style={{ background: '#0d1a2e', borderRadius: 14, border: `1px solid ${tema.color}18`, overflow: 'hidden' }}>
                        <div style={{ padding: '1rem 1.5rem', borderBottom: `1px solid ${tema.color}18`, fontWeight: 700 }}>📅 Itinerarios programados</div>
                        {cargando ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>Cargando...</div>
                        ) : itinerarios.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>Sin itinerarios{filtroEstado ? ` con estado "${filtroEstado}"` : ''}.</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ background: '#07111f' }}>
                                            {['Ruta', 'Bus', 'Conductor', 'Salida', 'Precio', 'Estado', 'Acciones'].map(h => (
                                                <th key={h} style={{ padding: '0.75rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {itinerarios.map(it => {
                                            const ec = ESTADOS_COLOR[it.estado] || ESTADOS_COLOR.programado;
                                            const ruta = it.ruta || rutas.find(r => r.id === it.ruta_id);
                                            const bus  = it.bus  || buses.find(b => b.id === it.bus_id);
                                            const cond = it.conductor || conductores.find(c => c.id === it.conductor_id);
                                            return (
                                                <tr key={it.id} style={{ borderBottom: '1px solid #0d1a2e' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#0f172a'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                    <td style={{ padding: '0.75rem' }}>
                                                        <div style={{ fontWeight: 600 }}>{ruta?.origen || '—'} → {ruta?.destino || '—'}</div>
                                                        {it.anden && <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Andén: {it.anden}</div>}
                                                    </td>
                                                    <td style={{ padding: '0.75rem', color: '#94a3b8' }}>
                                                        {bus?.placa || it.bus_id?.slice(0, 8) || '—'}
                                                        {bus?.marca && <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{bus.marca} {bus.modelo}</div>}
                                                    </td>
                                                    <td style={{ padding: '0.75rem', color: '#94a3b8' }}>
                                                        {cond?.nombre_completo || cond?.nombre || '—'}
                                                    </td>
                                                    <td style={{ padding: '0.75rem', color: '#94a3b8' }}>{formatFecha(it.salida_programada)}</td>
                                                    <td style={{ padding: '0.75rem', color: '#94a3b8' }}>
                                                        {it.precio_base ? `Bs. ${Number(it.precio_base).toFixed(0)}` : '—'}
                                                    </td>
                                                    <td style={{ padding: '0.75rem' }}>
                                                        <span style={{
                                                            padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600,
                                                            background: ec.bg, color: ec.color,
                                                        }}>{ec.label}</span>
                                                    </td>
                                                    <td style={{ padding: '0.75rem' }}>
                                                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                                                            {it.estado === 'programado' && (
                                                                <button onClick={() => handleCambiarEstado(it, 'en_ruta')} style={{
                                                                    padding: '0.25rem 0.55rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.72rem',
                                                                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.35)', color: '#6ee7b7',
                                                                }}>▶ Iniciar</button>
                                                            )}
                                                            {it.estado === 'en_ruta' && (
                                                                <button onClick={() => handleCambiarEstado(it, 'finalizado')} style={{
                                                                    padding: '0.25rem 0.55rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.72rem',
                                                                    background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.35)', color: '#93c5fd',
                                                                }}>✓ Finalizar</button>
                                                            )}
                                                            {['programado'].includes(it.estado) && (
                                                                <button onClick={() => handleCambiarEstado(it, 'cancelado')} style={{
                                                                    padding: '0.25rem 0.55rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.72rem',
                                                                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5',
                                                                }}>✕</button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
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

export default ProgramacionItinerarios;
