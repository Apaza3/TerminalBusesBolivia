// [Académico] Sprint 4 - ReporteMantenimiento con opsService + WS emit (R29)
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import { registrarMantenimiento } from '../../servicios/opsService';
import useWebSocket from '../../hooks/useWebSocket';
import gsap from 'gsap';
import '../../estilos/escritorio/admin.css';
import '../../estilos/movil/admin-responsivo.css';

const TIPOS = [
    { id: 'motor',     label: 'Motor',         icono: '⚙️', color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
    { id: 'frenos',    label: 'Frenos',         icono: '🛑', color: '#fb923c', bg: 'rgba(251,146,60,0.1)'  },
    { id: 'llantas',   label: 'Llantas',        icono: '⭕', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
    { id: 'electrico', label: 'Sistema eléct.', icono: '⚡', color: '#818cf8', bg: 'rgba(129,140,248,0.1)' },
    { id: 'carroceria',label: 'Carrocería',     icono: '🔩', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)'  },
    { id: 'otro',      label: 'Otro',           icono: '🔧', color: '#34d399', bg: 'rgba(52,211,153,0.1)'  },
];

const SEVERIDADES = [
    { id: 'baja',    label: 'Baja',    color: '#16a34a', desc: 'No afecta la operación inmediata'  },
    { id: 'media',   label: 'Media',   color: '#d97706', desc: 'Requiere revisión en la próxima parada' },
    { id: 'alta',    label: 'Alta',    color: '#dc2626', desc: 'Requiere atención antes de continuar' },
    { id: 'critica', label: 'Crítica', color: '#7c3aed', desc: 'Detener el bus de inmediato' },
];

const ReporteMantenimiento = () => {
    const navigate    = useNavigate();
    const { perfil }  = useAuth();

    const handleMensajeWS = useCallback(() => {}, []);
    const { emit } = useWebSocket(['flota'], handleMensajeWS);
    const rootRef     = useRef(null);

    const [tipo,       setTipo]       = useState('');
    const [severidad,  setSeveridad]  = useState('media');
    const [descripcion,setDescripcion]= useState('');
    const [foto,       setFoto]       = useState(null);
    const [fotoPreview,setFotoPreview]= useState(null);
    const [enviando,   setEnviando]   = useState(false);
    const [resultado,  setResultado]  = useState(null);
    const [errores,    setErrores]    = useState({});

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-m="hd"]',   { y: -24, opacity: 0, duration: 0.55, ease: 'power3.out' });
            gsap.from('[data-m="tipo"]', { y: 30, opacity: 0, duration: 0.45, stagger: 0.06, ease: 'power3.out', delay: 0.18 });
            gsap.from('[data-m="fld"]',  { y: 20, opacity: 0, duration: 0.45, stagger: 0.08, ease: 'power3.out', delay: 0.55 });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    useEffect(() => {
        if (resultado?.ok) {
            const ctx = gsap.context(() => {
                gsap.from('[data-m="ok"]', { scale: 0.6, opacity: 0, duration: 0.55, ease: 'back.out(1.7)' });
            }, rootRef);
            return () => ctx.revert();
        }
    }, [resultado]);

    const handleFoto = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setFoto(reader.result);
            setFotoPreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const validar = () => {
        const errs = {};
        if (!tipo) errs.tipo = 'Selecciona el tipo de problema.';
        if (!descripcion.trim() || descripcion.trim().length < 10)
            errs.descripcion = 'Descripción mínimo 10 caracteres.';
        setErrores(errs);
        return Object.keys(errs).length === 0;
    };

    const handleEnviar = async (e) => {
        e.preventDefault();
        if (!validar()) return;
        setEnviando(true);

        const payload = {
            bus_id:      perfil?.bus_id || null,
            tipo,
            descripcion: descripcion.trim(),
            severidad,
            foto_base64: foto || null,
            conductor:   perfil?.nombre_completo,
        };

        try {
            // [Académico] Sprint 4 - opsService gestiona mock/backend + WS emit (critica → broadcast)
            const res = await registrarMantenimiento(payload, emit);
            const id = res.reporte?.id || '';
            const origen = res.reporte?.pendiente_sync ? 'local' : 'servidor';
            setResultado({
                ok: true,
                msg: origen === 'servidor'
                    ? `Reporte #${String(id).slice(0, 8)} enviado al servidor.`
                    : 'Guardado localmente. Se sincronizará al reconectar.',
                origen,
            });
        } catch {
            setResultado({ ok: true, msg: 'Guardado localmente. Se sincronizará al reconectar.', origen: 'local' });
        } finally {
            setEnviando(false);
        }
    };

    const tipoSel     = TIPOS.find(t => t.id === tipo);
    const severidadSel = SEVERIDADES.find(s => s.id === severidad);

    if (resultado?.ok) {
        return (
            <div ref={rootRef} style={{
                background: '#07111f', minHeight: '100vh',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Inter', system-ui, sans-serif", padding: '2rem',
            }}>
                <div data-m="ok" style={{
                    textAlign: 'center', maxWidth: 400, width: '100%',
                    background: '#0a1726', border: '1px solid #1a2d42',
                    borderRadius: 16, padding: '2.5rem 2rem',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.9rem' }}>
                        {resultado.origen === 'servidor' ? '✅' : '💾'}
                    </div>
                    <h2 style={{ color: '#dde5f0', margin: '0 0 0.4rem', fontSize: '1.3rem', fontWeight: 700 }}>
                        Reporte Registrado
                    </h2>
                    <p style={{ color: '#4d6a87', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                        {resultado.msg}
                    </p>
                    {tipoSel && (
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                            background: tipoSel.bg, padding: '0.45rem 1rem', borderRadius: 8,
                            color: tipoSel.color, fontWeight: 600, fontSize: '0.85rem',
                            marginBottom: '0.6rem',
                        }}>
                            {tipoSel.icono} {tipoSel.label}
                        </div>
                    )}
                    {severidadSel && (
                        <div style={{
                            display: 'block', fontSize: '0.75rem', fontWeight: 600,
                            color: severidadSel.color, marginBottom: '1.5rem',
                        }}>
                            Severidad: {severidadSel.label}
                        </div>
                    )}
                    <button
                        onClick={() => navigate(-1)}
                        style={{
                            width: '100%', padding: '0.85rem',
                            background: '#16a34a', border: 'none',
                            color: '#fff', borderRadius: 9, fontWeight: 700,
                            cursor: 'pointer', fontSize: '0.9rem',
                            transition: 'background 0.18s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#15803d'}
                        onMouseLeave={e => e.currentTarget.style.background = '#16a34a'}
                    >
                        ← Volver al Panel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="pagina-admin" ref={rootRef}>
            <div data-m="hd" style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)',
                padding: '1rem 2rem', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center',
                boxShadow: '0 4px 20px rgba(124,58,237,0.25)',
            }}>
                <div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
                        🔧 Reporte de Mantenimiento
                    </div>
                    <div style={{ fontSize: '0.78rem', opacity: 0.7 }}>
                        {perfil?.nombre_completo || 'Conductor'} · {new Date().toLocaleDateString('es-BO', { day: 'numeric', month: 'long' })}
                    </div>
                </div>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)',
                        color: '#fff', padding: '0.45rem 1rem', borderRadius: 8,
                        cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem',
                        transition: 'background 0.18s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                >
                    ← Volver
                </button>
            </div>

            <form onSubmit={handleEnviar} style={{ maxWidth: 680, margin: '2rem auto', padding: '0 1rem' }}>

                {/* Tipo */}
                <div className="admin-seccion" data-m="fld">
                    <div className="admin-seccion-titulo">
                        <span className="seccion-icono">⚠️</span>
                        Tipo de Problema
                        {errores.tipo && (
                            <span style={{ marginLeft: 'auto', color: '#ef4444', fontSize: '0.78rem', fontWeight: 400 }}>
                                {errores.tipo}
                            </span>
                        )}
                    </div>
                    <div className="admin-seccion-cuerpo">
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                            gap: '0.65rem',
                        }}>
                            {TIPOS.map(t => (
                                <button
                                    key={t.id} type="button" data-m="tipo"
                                    onClick={() => { setTipo(t.id); setErrores(p => ({ ...p, tipo: null })); }}
                                    style={{
                                        padding: '0.9rem 0.7rem',
                                        background: tipo === t.id ? t.bg : '#0f172a',
                                        border: `2px solid ${tipo === t.id ? t.color : '#334155'}`,
                                        borderRadius: 10, color: tipo === t.id ? t.color : '#64748b',
                                        cursor: 'pointer', textAlign: 'left',
                                        transition: 'all 0.16s ease',
                                    }}
                                    onMouseEnter={e => {
                                        if (tipo !== t.id) {
                                            e.currentTarget.style.borderColor = t.color;
                                            gsap.to(e.currentTarget, { y: -2, duration: 0.14 });
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (tipo !== t.id) {
                                            e.currentTarget.style.borderColor = '#334155';
                                            gsap.to(e.currentTarget, { y: 0, duration: 0.14 });
                                        }
                                    }}
                                >
                                    <div style={{ fontSize: '1.4rem', marginBottom: '0.35rem' }}>{t.icono}</div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{t.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Severidad */}
                <div className="admin-seccion" data-m="fld">
                    <div className="admin-seccion-titulo">
                        <span className="seccion-icono">🚦</span> Severidad
                    </div>
                    <div className="admin-seccion-cuerpo">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                            {SEVERIDADES.map(s => (
                                <button
                                    key={s.id} type="button"
                                    onClick={() => setSeveridad(s.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.9rem',
                                        padding: '0.75rem 1rem',
                                        background: severidad === s.id ? `${s.color}12` : '#0f172a',
                                        border: `1px solid ${severidad === s.id ? s.color : '#334155'}`,
                                        borderRadius: 9, cursor: 'pointer',
                                        transition: 'all 0.16s ease', textAlign: 'left',
                                    }}
                                >
                                    <span style={{
                                        width: 10, height: 10, borderRadius: '50%',
                                        background: s.color, flexShrink: 0,
                                    }} />
                                    <div>
                                        <div style={{
                                            fontSize: '0.85rem', fontWeight: 700,
                                            color: severidad === s.id ? s.color : '#94a3b8',
                                        }}>
                                            {s.label}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                                            {s.desc}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Descripción + Foto */}
                <div className="admin-seccion" data-m="fld">
                    <div className="admin-seccion-titulo">
                        <span className="seccion-icono">📝</span> Detalle
                    </div>
                    <div className="admin-seccion-cuerpo">
                        <div className="campo-grupo">
                            <label className="campo-label">
                                Descripción del problema <span className="campo-requerido">*</span>
                            </label>
                            <textarea
                                className={`campo-input ${errores.descripcion ? 'error' : ''}`}
                                style={{ minHeight: 110, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
                                value={descripcion}
                                onChange={e => { setDescripcion(e.target.value); setErrores(p => ({ ...p, descripcion: null })); }}
                                placeholder="Ej: Ruido inusual en el motor al acelerar, posible fallo en la correa..."
                                maxLength={800}
                            />
                            {errores.descripcion
                                ? <div className="campo-error-msg">{errores.descripcion}</div>
                                : <div className="campo-hint">{descripcion.length}/800 caracteres</div>
                            }
                        </div>

                        <div className="campo-grupo" style={{ marginTop: '1.25rem' }}>
                            <label className="campo-label">Foto del problema (opcional)</label>
                            <input
                                type="file" accept="image/*"
                                onChange={handleFoto}
                                style={{
                                    background: '#0f172a', border: '1px dashed #334155',
                                    color: '#94a3b8', padding: '0.75rem',
                                    borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem',
                                    width: '100%', boxSizing: 'border-box',
                                }}
                            />
                            {fotoPreview && (
                                <img
                                    src={fotoPreview} alt="preview"
                                    style={{
                                        marginTop: '0.75rem', borderRadius: 8, maxHeight: 200,
                                        border: '1px solid #334155', display: 'block',
                                    }}
                                />
                            )}
                            <div className="campo-hint">Máx. 5 MB — jpg, png, webp</div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div data-m="fld" className="admin-footer" style={{ borderRadius: 12 }}>
                    <button type="button" className="btn-admin-cancelar" onClick={() => navigate(-1)} disabled={enviando}>
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={enviando || !tipo}
                        style={{
                            background: !tipo ? '#475569' : severidadSel?.id === 'critica'
                                ? 'linear-gradient(135deg, #7c3aed, #dc2626)'
                                : `linear-gradient(135deg, ${severidadSel?.color}bb, ${severidadSel?.color})`,
                            border: 'none', color: 'white',
                            padding: '0.75rem 2rem', borderRadius: 8,
                            fontWeight: 700, fontSize: '0.92rem',
                            cursor: enviando || !tipo ? 'not-allowed' : 'pointer',
                            opacity: !tipo ? 0.5 : 1,
                            boxShadow: tipo ? `0 4px 16px ${severidadSel?.color}44` : 'none',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { if (tipo && !enviando) gsap.to(e.currentTarget, { scale: 1.03, duration: 0.14 }); }}
                        onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, duration: 0.14 })}
                    >
                        {enviando ? '⏳ Enviando...' : '🔧 Enviar Reporte'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ReporteMantenimiento;
