import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contextos/AuthContext';
import gsap from 'gsap';
import '../../estilos/escritorio/admin.css';
import '../../estilos/movil/admin-responsivo.css';

const TIPOS = [
    { id: 'accidente',            label: 'Accidente',            icono: '🚨', color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: '#7f1d1d' },
    { id: 'desvio',               label: 'Desvío de Ruta',       icono: '🔀', color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: '#7c2d12' },
    { id: 'pasajero_conflictivo', label: 'Pasajero Conflictivo', icono: '⚠️', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: '#78350f' },
    { id: 'mecanico',             label: 'Fallo Mecánico',       icono: '🔧', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: '#312e81' },
    { id: 'retraso',              label: 'Retraso',              icono: '⏱️', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  border: '#075985' },
    { id: 'otro',                 label: 'Otro',                 icono: '📝', color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: '#064e3b' },
];

const API_BASE = process.env.REACT_APP_API_URL || `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:4000`;

const RegistrarIncidencia = () => {
    const navigate = useNavigate();
    const { viajeId } = useParams();
    const { perfil } = useAuth();

    const [tipo, setTipo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [ubicacionManual, setUbicacionManual] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [resultado, setResultado] = useState(null);
    const [errores, setErrores] = useState({});

    const containerRef = useRef(null);
    const successRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-anim="header"]', {
                y: -30, opacity: 0, duration: 0.55, ease: 'power3.out'
            });
            gsap.from('[data-anim="tipo-btn"]', {
                y: 35, opacity: 0, duration: 0.45,
                stagger: 0.06, ease: 'power3.out', delay: 0.2
            });
            gsap.from('[data-anim="field"]', {
                y: 25, opacity: 0, duration: 0.45,
                stagger: 0.1, ease: 'power3.out', delay: 0.55
            });
        }, containerRef);
        return () => ctx.revert();
    }, []);

    useEffect(() => {
        if (resultado?.ok && successRef.current) {
            gsap.from(successRef.current, {
                scale: 0.6, opacity: 0, duration: 0.55, ease: 'back.out(1.7)'
            });
        }
    }, [resultado]);

    const validar = () => {
        const errs = {};
        if (!tipo) errs.tipo = 'Selecciona un tipo.';
        if (!descripcion.trim() || descripcion.trim().length < 10)
            errs.descripcion = 'Mínimo 10 caracteres.';
        setErrores(errs);
        return Object.keys(errs).length === 0;
    };

    const guardarFallback = (datos) => {
        const prev = JSON.parse(localStorage.getItem('tbb_incidencias') || '[]');
        prev.push({
            ...datos,
            id: `inc_${Date.now()}`,
            estado: 'abierta',
            creado_en: new Date().toISOString(),
            pendiente_sync: true,
        });
        localStorage.setItem('tbb_incidencias', JSON.stringify(prev));
    };

    const handleEnviar = async (e) => {
        e.preventDefault();
        if (!validar()) return;
        setEnviando(true);

        const payload = {
            viaje_id: viajeId,
            tipo,
            descripcion: descripcion.trim(),
            ubicacion_manual: ubicacionManual.trim() || null,
        };

        try {
            const resp = await fetch(`${API_BASE}/api/conductor/incidencias`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!resp.ok) throw new Error('auth_required');
            const data = await resp.json();
            setResultado({ ok: true, msg: `Registrada en servidor (ID: ${String(data.id).slice(0, 8)})`, origen: 'servidor' });
        } catch {
            // TODO: [Aaron Apaza] Integrar token JWT cuando AuthContext use Supabase Auth real (RN-SUPABASE)
            guardarFallback({ ...payload, conductor: perfil?.nombre_completo });
            setResultado({ ok: true, msg: 'Guardada localmente. Se sincronizará al conectar con el servidor.', origen: 'local' });
        } finally {
            setEnviando(false);
        }
    };

    const tipoSel = TIPOS.find(t => t.id === tipo);

    if (resultado?.ok) {
        return (
            <div style={{
                background: '#0f172a', minHeight: '100vh', display: 'flex',
                justifyContent: 'center', alignItems: 'center', fontFamily: 'Inter, system-ui, sans-serif'
            }}>
                <div ref={successRef} style={{
                    textAlign: 'center', maxWidth: 420, padding: '2.5rem 2rem',
                    background: 'rgba(16,185,129,0.06)',
                    border: '1px solid rgba(16,185,129,0.25)',
                    borderRadius: 20,
                    backdropFilter: 'blur(16px)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>
                        {resultado.origen === 'servidor' ? '✅' : '💾'}
                    </div>
                    <h2 style={{ color: '#10b981', margin: '0 0 0.5rem', fontSize: '1.4rem', fontWeight: 700 }}>
                        Incidencia Registrada
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '0 0 1.5rem' }}>
                        {resultado.msg}
                    </p>
                    {tipoSel && (
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                            background: tipoSel.bg, border: `1px solid ${tipoSel.border}`,
                            padding: '0.5rem 1.2rem', borderRadius: 10,
                            color: tipoSel.color, fontWeight: 700, fontSize: '0.9rem',
                            marginBottom: '1.5rem',
                        }}>
                            {tipoSel.icono} {tipoSel.label}
                        </div>
                    )}
                    <button
                        onClick={() => navigate(-1)}
                        style={{
                            width: '100%', padding: '0.9rem',
                            background: 'linear-gradient(135deg, #059669, #10b981)',
                            border: 'none', color: 'white', borderRadius: 12,
                            fontWeight: 700, cursor: 'pointer', fontSize: '1rem',
                            boxShadow: '0 6px 20px rgba(16,185,129,0.35)',
                            transition: 'transform 0.15s',
                        }}
                        onMouseEnter={e => gsap.to(e.currentTarget, { scale: 1.03, duration: 0.15 })}
                        onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, duration: 0.15 })}
                    >
                        ← Volver al Panel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="pagina-admin" ref={containerRef}>
            <div data-anim="header" style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #dc2626 100%)',
                padding: '1rem 2rem', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center',
                boxShadow: '0 4px 20px rgba(124,58,237,0.3)',
            }}>
                <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
                        🚨 Reportar Incidencia
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.75 }}>
                        Viaje {viajeId?.slice(0, 8) || '—'} · {perfil?.nombre_completo || 'Conductor'}
                    </div>
                </div>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                        color: 'white', padding: '0.5rem 1rem', borderRadius: 8,
                        cursor: 'pointer', fontWeight: 500, backdropFilter: 'blur(8px)',
                        transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                >
                    ← Volver
                </button>
            </div>

            <form onSubmit={handleEnviar} style={{ maxWidth: 700, margin: '2rem auto', padding: '0 1rem' }}>

                {/* Tipo */}
                <div className="admin-seccion" data-anim="field">
                    <div className="admin-seccion-titulo">
                        <span className="seccion-icono">⚡</span>
                        Tipo de Incidencia
                        {errores.tipo && (
                            <span style={{ marginLeft: 'auto', color: '#ef4444', fontSize: '0.78rem', fontWeight: 400 }}>
                                {errores.tipo}
                            </span>
                        )}
                    </div>
                    <div className="admin-seccion-cuerpo">
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                            gap: '0.75rem',
                        }}>
                            {TIPOS.map(t => (
                                <button
                                    key={t.id}
                                    type="button"
                                    data-anim="tipo-btn"
                                    onClick={() => { setTipo(t.id); setErrores(p => ({ ...p, tipo: null })); }}
                                    style={{
                                        padding: '1rem 0.75rem',
                                        background: tipo === t.id ? t.bg : 'rgba(15,23,42,0.9)',
                                        border: `2px solid ${tipo === t.id ? t.color : '#334155'}`,
                                        borderRadius: 12, color: tipo === t.id ? t.color : '#94a3b8',
                                        cursor: 'pointer', textAlign: 'left',
                                        transition: 'all 0.18s ease',
                                        backdropFilter: 'blur(6px)',
                                    }}
                                    onMouseEnter={e => {
                                        if (tipo !== t.id) {
                                            e.currentTarget.style.borderColor = t.color;
                                            e.currentTarget.style.color = t.color;
                                            gsap.to(e.currentTarget, { scale: 1.03, duration: 0.15 });
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (tipo !== t.id) {
                                            e.currentTarget.style.borderColor = '#334155';
                                            e.currentTarget.style.color = '#94a3b8';
                                            gsap.to(e.currentTarget, { scale: 1, duration: 0.15 });
                                        }
                                    }}
                                >
                                    <div style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>{t.icono}</div>
                                    <div style={{ fontWeight: 600, fontSize: '0.82rem', lineHeight: 1.3 }}>{t.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Descripción */}
                <div className="admin-seccion" data-anim="field">
                    <div className="admin-seccion-titulo">
                        <span className="seccion-icono">📝</span> Descripción
                    </div>
                    <div className="admin-seccion-cuerpo">
                        <div className="campo-grupo">
                            <label className="campo-label">
                                ¿Qué ocurrió? <span className="campo-requerido">*</span>
                            </label>
                            <textarea
                                className={`campo-input ${errores.descripcion ? 'error' : ''}`}
                                style={{ minHeight: 120, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
                                value={descripcion}
                                onChange={e => { setDescripcion(e.target.value); setErrores(p => ({ ...p, descripcion: null })); }}
                                placeholder="Ej: A las 14:30 el bus presentó ruidos en el motor al km 45 de la carretera La Paz–Oruro..."
                                maxLength={1000}
                            />
                            {errores.descripcion
                                ? <div className="campo-error-msg">{errores.descripcion}</div>
                                : <div className="campo-hint">{descripcion.length}/1000 caracteres</div>
                            }
                        </div>

                        <div className="campo-grupo" style={{ marginTop: '1.25rem' }}>
                            <label className="campo-label">Ubicación aproximada</label>
                            <input
                                type="text"
                                className="campo-input"
                                value={ubicacionManual}
                                onChange={e => setUbicacionManual(e.target.value)}
                                placeholder="Ej: Km 45 carretera La Paz–Oruro, frente a la gasolinera Repsol..."
                            />
                            <div className="campo-hint">Opcional — ayuda al equipo a localizar el incidente</div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div data-anim="field" className="admin-footer" style={{ borderRadius: 12 }}>
                    <button type="button" className="btn-admin-cancelar" onClick={() => navigate(-1)} disabled={enviando}>
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={enviando || !tipo}
                        style={{
                            background: tipoSel
                                ? `linear-gradient(135deg, ${tipoSel.color}bb, ${tipoSel.color})`
                                : '#475569',
                            border: 'none', color: 'white',
                            padding: '0.75rem 2rem', borderRadius: 8,
                            fontWeight: 700, fontSize: '0.95rem',
                            cursor: enviando || !tipo ? 'not-allowed' : 'pointer',
                            transition: 'all 0.25s ease',
                            boxShadow: tipoSel ? `0 4px 18px ${tipoSel.color}44` : 'none',
                            opacity: !tipo ? 0.5 : 1,
                        }}
                        onMouseEnter={e => { if (tipo && !enviando) gsap.to(e.currentTarget, { scale: 1.04, duration: 0.15 }); }}
                        onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, duration: 0.15 })}
                    >
                        {enviando ? '⏳ Enviando...' : '🚨 Registrar Incidencia'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RegistrarIncidencia;
