import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import { SUCURSALES_MOCK } from '../../data/mockDiscoveryDB';
import { useToast } from '../../componentes/ToastNotifications';
import { listarSucursales, crearSucursal, actualizarSucursal, toggleSucursal } from '../../servicios/fleetService';
import gsap from 'gsap';
import '../../estilos/escritorio/admin.css';
import '../../estilos/movil/admin-responsivo.css';

const FORM_INICIAL = {
    nombre: '', logo_emoji: '🚌', color_accent: '#3b82f6',
    departamento: 'La Paz', ciudad: '', telefono: '', direccion: '', descripcion: '',
};

const EMOJI_OPCIONES = ['🚌', '🚍', '✨', '🦅', '🌊', '🏔️', '🌴', '⭐', '💎', '🏢', '🛣️', '🎯'];

const GestionSucursales = () => {
    const { perfil, logout } = useAuth();
    const navigate = useNavigate();
    const { mostrar } = useToast();
    const rootRef = useRef(null);

    const sucursalInfo = SUCURSALES_MOCK.find(s => s.id === perfil?.sucursal_id) || SUCURSALES_MOCK[0];
    const deptNombre = perfil?.departamento || sucursalInfo?.departamento || 'La Paz';
    const tema = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];

    const [sucursales,  setSucursales]  = useState([]);
    const [cargando,    setCargando]    = useState(true);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [editando,    setEditando]    = useState(null);
    const [form,        setForm]        = useState(FORM_INICIAL);
    const [errores,     setErrores]     = useState({});
    const [guardando,   setGuardando]   = useState(false);
    const [feedback,    setFeedback]    = useState(null);
    const [filtro,      setFiltro]      = useState('todas');

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-anim="header"]',   { y: -24, opacity: 0, duration: 0.4, ease: 'power3.out' });
            gsap.from('[data-anim="sidebar"]',  { x: -24, opacity: 0, duration: 0.4, ease: 'power3.out', delay: 0.1 });
            gsap.from('[data-anim="content"]',  { y: 24,  opacity: 0, duration: 0.4, ease: 'power3.out', delay: 0.15 });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    const cargar = async () => {
        setCargando(true);
        try {
            const data = await listarSucursales();
            setSucursales(data);
        } catch (err) {
            mostrar('Error al cargar sucursales: ' + err.message, 'error');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => { cargar(); }, []); // eslint-disable-line

    const setField = (k, v) => {
        setForm(p => ({ ...p, [k]: v }));
        setErrores(p => ({ ...p, [k]: null }));
    };

    const validar = () => {
        const errs = {};
        if (!form.nombre.trim()) errs.nombre = 'El nombre es obligatorio.';
        if (form.nombre.trim().length < 3) errs.nombre = 'Mínimo 3 caracteres.';
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
                nombre:      form.nombre.trim(),
                logo_emoji:  form.logo_emoji,
                color_accent:form.color_accent,
                departamento:form.departamento,
                ciudad:      form.ciudad.trim()     || null,
                telefono:    form.telefono.trim()   || null,
                direccion:   form.direccion.trim()  || null,
                descripcion: form.descripcion.trim()|| null,
            };
            if (editando) {
                const res = await actualizarSucursal(editando, datos);
                if (!res.exito) throw new Error(res.error);
                mostrar(`✅ Sucursal "${form.nombre}" actualizada.`, 'exito');
            } else {
                const res = await crearSucursal(datos);
                if (!res.exito) throw new Error(res.error);
                mostrar(`✅ Sucursal "${form.nombre}" creada.`, 'exito');
            }
            setForm(FORM_INICIAL);
            setEditando(null);
            setMostrarForm(false);
            cargar();
        } catch (err) {
            console.error('GestionSucursales - handleGuardar:', err);
            setFeedback({ tipo: 'error', msg: `❌ Error: ${err.message}` });
        } finally {
            setGuardando(false);
        }
    };

    const handleEditar = (s) => {
        setForm({
            nombre:      s.nombre,
            logo_emoji:  s.logo_emoji  || '🚌',
            color_accent:s.color_accent|| '#3b82f6',
            departamento:s.departamento|| 'La Paz',
            ciudad:      s.ciudad      || '',
            telefono:    s.telefono    || '',
            direccion:   s.direccion   || '',
            descripcion: s.descripcion || '',
        });
        setEditando(s.id);
        setMostrarForm(true);
        setFeedback(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleToggle = async (s) => {
        try {
            const res = await toggleSucursal(s.id);
            if (!res.exito) throw new Error(res.error);
            mostrar(`${res.data.activa ? '✅ Activada' : '🔴 Desactivada'}: ${s.nombre}`, res.data.activa ? 'exito' : 'alerta');
            cargar();
        } catch (err) {
            mostrar('Error al cambiar estado: ' + err.message, 'error');
        }
    };

    const handleCancelar = () => {
        setForm(FORM_INICIAL);
        setEditando(null);
        setMostrarForm(false);
        setFeedback(null);
        setErrores({});
    };

    const sucursalesFiltradas = filtro === 'activas'   ? sucursales.filter(s => s.activa)
                              : filtro === 'inactivas' ? sucursales.filter(s => !s.activa)
                              : sucursales;

    return (
        <div ref={rootRef} style={{ display: 'flex', minHeight: '100vh', background: '#07111f', color: '#f1f5f9', fontFamily: "'Inter', system-ui, sans-serif" }}>

            {/* ── Sidebar ── */}
            <aside data-anim="sidebar" style={{
                width: 230, minHeight: '100vh', background: '#0b1628',
                borderRight: `1px solid ${tema.color}18`, padding: '1.5rem 1rem',
                display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: 0,
            }}>
                <div style={{ background: `${tema.color}15`, borderRadius: 10, padding: '0.8rem', border: `1px solid ${tema.color}25` }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{sucursalInfo?.logoEmoji || '🏢'}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: tema.color }}>{sucursalInfo?.nombre || 'Admin'}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{deptNombre}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {[
                        { path: '/admin/dashboard',   icon: '🏠', label: 'Dashboard' },
                        { path: '/admin/sucursales',  icon: '🏢', label: 'Sucursales', activo: true },
                        { path: '/admin/rutas',       icon: '🛣️', label: 'Rutas' },
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

            {/* ── Main ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div data-anim="header" style={{
                    padding: '1.25rem 2rem', borderBottom: `1px solid ${tema.color}18`,
                    background: '#0b1628', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>🏢 Gestión de Sucursales</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Crear, editar y habilitar/deshabilitar sucursales</div>
                    </div>
                    <button onClick={() => { setMostrarForm(!mostrarForm); handleCancelar(); }} style={{
                        background: tema.color, color: '#fff', border: 'none', borderRadius: 8,
                        padding: '0.55rem 1.1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                    }}>
                        {mostrarForm ? '✕ Cancelar' : '+ Nueva Sucursal'}
                    </button>
                </div>

                <div data-anim="content" style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* ── Formulario ── */}
                    {mostrarForm && (
                        <form onSubmit={handleGuardar} noValidate style={{
                            background: '#0d1a2e', borderRadius: 14, border: `1px solid ${tema.color}22`,
                            padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem',
                        }}>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: tema.color }}>
                                {editando ? '✏️ Editar Sucursal' : '➕ Nueva Sucursal'}
                            </div>
                            {feedback && (
                                <div className={`admin-feedback ${feedback.tipo}`}>{feedback.msg}</div>
                            )}
                            <div className="campos-grid-2">
                                <div className="campo-grupo">
                                    <label className="campo-label">Nombre <span className="campo-requerido">*</span></label>
                                    <input className={`campo-input ${errores.nombre ? 'error' : ''}`}
                                        value={form.nombre} onChange={e => setField('nombre', e.target.value)}
                                        placeholder="Trans Copacabana" maxLength={80} />
                                    {errores.nombre && <div className="campo-error-msg">{errores.nombre}</div>}
                                </div>
                                <div className="campo-grupo">
                                    <label className="campo-label">Departamento</label>
                                    <select className="campo-select" value={form.departamento} onChange={e => setField('departamento', e.target.value)}>
                                        {Object.keys(DEPARTAMENTOS).map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="campos-grid-2">
                                <div className="campo-grupo">
                                    <label className="campo-label">Ciudad</label>
                                    <input className="campo-input" value={form.ciudad} onChange={e => setField('ciudad', e.target.value)} placeholder="La Paz" />
                                </div>
                                <div className="campo-grupo">
                                    <label className="campo-label">Teléfono</label>
                                    <input className="campo-input" value={form.telefono} onChange={e => setField('telefono', e.target.value)} placeholder="+591 2 1234567" />
                                </div>
                            </div>
                            <div className="campo-grupo">
                                <label className="campo-label">Dirección</label>
                                <input className="campo-input" value={form.direccion} onChange={e => setField('direccion', e.target.value)} placeholder="Av. Simón Bolívar 123" />
                            </div>
                            <div className="campo-grupo">
                                <label className="campo-label">Descripción</label>
                                <input className="campo-input" value={form.descripcion} onChange={e => setField('descripcion', e.target.value)} placeholder="Breve descripción de la sucursal..." />
                            </div>
                            <div className="campos-grid-2">
                                <div className="campo-grupo">
                                    <label className="campo-label">Emoji / Logo</label>
                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                                        {EMOJI_OPCIONES.map(e => (
                                            <button key={e} type="button" onClick={() => setField('logo_emoji', e)} style={{
                                                width: 36, height: 36, borderRadius: 8, fontSize: '1.2rem', cursor: 'pointer',
                                                border: form.logo_emoji === e ? `2px solid ${tema.color}` : '1px solid #334155',
                                                background: form.logo_emoji === e ? `${tema.color}20` : '#0f172a',
                                            }}>{e}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="campo-grupo">
                                    <label className="campo-label">Color Acento</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                                        <input type="color" value={form.color_accent} onChange={e => setField('color_accent', e.target.value)}
                                            style={{ width: 40, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'transparent' }} />
                                        <code style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{form.color_accent}</code>
                                        <span style={{ width: 32, height: 32, borderRadius: '50%', background: form.color_accent, display: 'inline-block' }} />
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                <button type="button" className="btn-admin-cancelar" onClick={handleCancelar}>Cancelar</button>
                                <button type="submit" className="btn-admin-guardar" disabled={guardando}>
                                    {guardando ? 'Guardando...' : editando ? '💾 Actualizar' : '💾 Crear Sucursal'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ── Filtros ── */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {['todas', 'activas', 'inactivas'].map(f => (
                            <button key={f} onClick={() => setFiltro(f)} style={{
                                padding: '0.35rem 0.9rem', borderRadius: 999, fontSize: '0.78rem', cursor: 'pointer', fontWeight: filtro === f ? 600 : 400,
                                background: filtro === f ? `${tema.color}22` : 'transparent',
                                border: filtro === f ? `1px solid ${tema.color}` : '1px solid #334155',
                                color: filtro === f ? tema.color : '#64748b',
                            }}>
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                        <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#475569' }}>
                            {sucursalesFiltradas.length} sucursal{sucursalesFiltradas.length !== 1 ? 'es' : ''}
                        </span>
                    </div>

                    {/* ── Tabla ── */}
                    <div style={{ background: '#0d1a2e', borderRadius: 14, border: `1px solid ${tema.color}18`, overflow: 'hidden' }}>
                        <div style={{ padding: '1rem 1.5rem', borderBottom: `1px solid ${tema.color}18`, fontWeight: 700 }}>🏢 Sucursales</div>
                        {cargando ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>Cargando...</div>
                        ) : sucursalesFiltradas.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>Sin sucursales registradas.</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
                                    <thead>
                                        <tr style={{ background: '#07111f' }}>
                                            {['Sucursal', 'Departamento', 'Ciudad', 'Contacto', 'Estado', 'Acciones'].map(h => (
                                                <th key={h} style={{ padding: '0.75rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sucursalesFiltradas.map(s => (
                                            <tr key={s.id} style={{ borderBottom: '1px solid #0d1a2e' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#0f172a'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ padding: '0.75rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                        <span style={{ fontSize: '1.4rem' }}>{s.logo_emoji || '🚌'}</span>
                                                        <div>
                                                            <div style={{ fontWeight: 600 }}>{s.nombre}</div>
                                                            {s.descripcion && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{s.descripcion}</div>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '0.75rem', color: '#94a3b8' }}>{s.departamento || '—'}</td>
                                                <td style={{ padding: '0.75rem', color: '#94a3b8' }}>{s.ciudad || '—'}</td>
                                                <td style={{ padding: '0.75rem', color: '#94a3b8' }}>{s.telefono || '—'}</td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    <span style={{
                                                        padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600,
                                                        background: s.activa ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)',
                                                        color: s.activa ? '#6ee7b7' : '#94a3b8',
                                                    }}>{s.activa ? '✅ Activa' : '🔴 Inactiva'}</span>
                                                </td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                        <button onClick={() => handleEditar(s)} style={{
                                                            padding: '0.3rem 0.65rem', borderRadius: 6, border: `1px solid ${tema.color}40`,
                                                            background: `${tema.color}10`, color: tema.color, cursor: 'pointer', fontSize: '0.75rem',
                                                        }}>✏️ Editar</button>
                                                        <button onClick={() => handleToggle(s)} style={{
                                                            padding: '0.3rem 0.65rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem',
                                                            border: s.activa ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(16,185,129,0.4)',
                                                            background: s.activa ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                                            color: s.activa ? '#fca5a5' : '#6ee7b7',
                                                        }}>{s.activa ? '🔴 Desactivar' : '✅ Activar'}</button>
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

export default GestionSucursales;
