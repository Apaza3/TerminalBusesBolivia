import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contextos/AuthContext';
import { crearComentario, getComentariosSucursal } from '../servicios/api';

// ── Inline mood labels (no mockDiscoveryDB) ────────────────────────────────────
const MOOD_LABELS = {
    1: [{ emoji: '🧹', texto: 'Suciedad' }, { emoji: '💺', texto: 'Asientos rotos' }, { emoji: '⏰', texto: 'Gran retraso' }, { emoji: '😤', texto: 'Mal trato' }, { emoji: '🛣️', texto: 'Manejo peligroso' }, { emoji: '🔒', texto: 'Me sentí inseguro/a' }, { emoji: '🚫', texto: 'No cumplió lo prometido' }],
    2: [{ emoji: '🧹', texto: 'Poca limpieza' }, { emoji: '💺', texto: 'Incomodidad' }, { emoji: '⏰', texto: 'Retraso' }, { emoji: '😒', texto: 'Atención pobre' }, { emoji: '💸', texto: 'Precio elevado' }, { emoji: '🕐', texto: 'Salida tardía' }],
    3: [{ emoji: '😐', texto: 'Servicio aceptable' }, { emoji: '💺', texto: 'Asientos regulares' }, { emoji: '🕐', texto: 'Leve retraso' }, { emoji: '💸', texto: 'Precio justo' }, { emoji: '🏁', texto: 'Llegó a destino' }],
    4: [{ emoji: '🤝', texto: 'Buena atención' }, { emoji: '✨', texto: 'Bus limpio' }, { emoji: '🏁', texto: 'Puntual' }, { emoji: '🛋️', texto: 'Cómodo' }, { emoji: '😊', texto: 'Conductor amable' }, { emoji: '💸', texto: 'Buen precio' }],
    5: [{ emoji: '🤩', texto: 'Servicio excepcional' }, { emoji: '✨', texto: 'Bus impecable' }, { emoji: '⚡', texto: 'Súper puntual' }, { emoji: '🛋️', texto: 'Máxima comodidad' }, { emoji: '😄', texto: 'Personal muy amable' }, { emoji: '🌟', texto: '100% recomendado' }, { emoji: '🏆', texto: 'Mejor empresa' }],
};
const obtenerLabelsPorMood = (mood) => MOOD_LABELS[mood] || [];

const EMOJIS = [
    { valor: 1, emoji: '😡', label: 'Muy mal',   color: '#ef4444' },
    { valor: 2, emoji: '😕', label: 'Mal',        color: '#f97316' },
    { valor: 3, emoji: '😐', label: 'Regular',    color: '#f59e0b' },
    { valor: 4, emoji: '🙂', label: 'Bien',       color: '#22c55e' },
    { valor: 5, emoji: '😄', label: 'Excelente',  color: '#10b981' },
];

const moodColor = (v) => EMOJIS.find(e => e.valor === v)?.color || '#64748b';
const moodEmoji = (v) => EMOJIS.find(e => e.valor === v)?.emoji || '😐';
const moodLabel = (v) => EMOJIS.find(e => e.valor === v)?.label || '';

const Stars = ({ valor, size = '0.9rem' }) => (
    <span style={{ fontSize: size, letterSpacing: '-0.05em' }}>
        {[1,2,3,4,5].map(i => (
            <span key={i} style={{ color: i <= valor ? '#f59e0b' : '#1e293b' }}>★</span>
        ))}
    </span>
);

const MiniMood = ({ label, valor, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{label}</span>
        <span style={{ fontSize: '0.8rem' }}>{moodEmoji(valor)}</span>
        <Stars valor={valor} size="0.65rem" />
    </div>
);

const EmojiBtn = ({ e, selected, onClick, size = 52 }) => (
    <button onClick={() => onClick(e.valor)} style={{
        width: size, height: size, borderRadius: 12,
        border: selected ? `2px solid ${e.color}` : '1px solid #334155',
        background: selected ? `${e.color}20` : '#0f172a',
        cursor: 'pointer', fontSize: size > 44 ? '1.6rem' : '1.25rem',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s', transform: selected ? 'scale(1.12)' : 'scale(1)',
        flexShrink: 0,
    }}>
        {e.emoji}
    </button>
);

const tiempoRelativo = (fecha) => {
    const diff = Date.now() - new Date(fecha).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Justo ahora';
    if (mins < 60) return `Hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Hace ${hrs}h`;
    return `Hace ${Math.floor(hrs / 24)}d`;
};

const FeedbackEmoji = ({ sucursalId, departamento, color = '#3b82f6', starsColor = '#f59e0b', badgeBg = '#f59e0b', badgeText = '#000', bgCard = 'rgba(8,15,30,0.85)', borderDefault = 'rgba(59,130,246,0.2)', onNuevoFeedback, textPrimary: tPrimary, accentText }) => {
    const textPrimary = tPrimary || '#f1f5f9';
    const accentColor = accentText || '#94a3b8';
    const { perfil } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [mood,               setMood]               = useState(0);
    const [labelsSeleccionados, setLabels]             = useState([]);
    const [comentario,          setComentario]         = useState('');
    const [evaluarIndividual,   setEvaluarIndividual]  = useState(false);
    const [moodBus,             setMoodBus]            = useState(0);
    const [moodTripulacion,     setMoodTripulacion]    = useState(0);
    const [enviando,            setEnviando]           = useState(false);
    const [enviado,             setEnviado]            = useState(false);
    const [errorEnvio,          setErrorEnvio]         = useState(null);
    const [reviews,             setReviews]            = useState([]);
    const [mostrarTodos,        setMostrarTodos]       = useState(false);

    const esCliente = perfil?.rol === 'cliente';
    const yaDejoOpinion = esCliente && perfil?.id && reviews.some(r => r.usuarioId === perfil.id);

    useEffect(() => {
        if (!sucursalId) return;
        getComentariosSucursal(sucursalId).then(data => {
            setReviews((data || []).map(r => ({
                id:                  r.id,
                mood:                r.puntuacion,
                moodBus:             r.puntuacion,
                moodTripulacion:     r.puntuacion,
                labelsSeleccionados: Array.isArray(r.categorias) ? r.categorias : [],
                comentario:          r.comentario || '',
                nombreUsuario:       r.nombre_usuario || 'Viajero',
                fecha:               r.creado_en,
                avatarGenerico:      '👤',
                usuarioId:           r.usuario_id,
            })));
        });
    }, [sucursalId, departamento]); // eslint-disable-line

    const labels = mood > 0 ? obtenerLabelsPorMood(mood) : [];

    const toggleLabel = (texto) => setLabels(prev =>
        prev.includes(texto) ? prev.filter(l => l !== texto) : [...prev, texto]
    );

    const puedeEnviar = mood > 0 && (!evaluarIndividual || (moodBus > 0 && moodTripulacion > 0));

    const handleSubmit = async () => {
        if (!puedeEnviar) return;
        setEnviando(true);
        const nuevo = await crearComentario({
            sucursalId,
            usuarioId:    perfil?.id || null,
            nombreUsuario: perfil?.nombre_completo || perfil?.nombreCompleto || perfil?.email || 'Viajero',
            puntuacion:   mood,
            comentario:   comentario.trim(),
            categorias:   labelsSeleccionados,
            departamentoId: null, // el sucursal_id ya scopa empresa+departamento (columna es uuid; el nombre rompia el insert)
        });
        if (!nuevo || nuevo.error) {
            setEnviando(false);
            setErrorEnvio(nuevo?.error || 'No se pudo enviar tu opinión. Intenta de nuevo.');
            setTimeout(() => setErrorEnvio(null), 5000);
            return;
        }
        setReviews(prev => [{
            id:                  nuevo.id,
            mood,
            moodBus:             evaluarIndividual ? moodBus        : mood,
            moodTripulacion:     evaluarIndividual ? moodTripulacion : mood,
            labelsSeleccionados,
            comentario:          nuevo.comentario || comentario.trim(),
            nombreUsuario:       nuevo.nombre_usuario || 'Viajero',
            fecha:               nuevo.creado_en,
            avatarGenerico:      '👤',
            usuarioId:           nuevo.usuario_id,
        }, ...prev]);
        setMood(0); setMoodBus(0); setMoodTripulacion(0);
        setLabels([]); setComentario('');
        setEvaluarIndividual(false);
        setEnviando(false);
        setEnviado(true);
        onNuevoFeedback?.();
        setTimeout(() => setEnviado(false), 4000);
    };

    // ── Aggregate stats ──
    const totalReviews = reviews.length;
    const promedio = totalReviews > 0
        ? (reviews.reduce((s, r) => s + ((r.mood + (r.moodBus || r.mood) + (r.moodTripulacion || r.mood)) / 3), 0) / totalReviews)
        : 0;
    const promRedondeado = Math.round(promedio * 10) / 10;

    const visibles = mostrarTodos ? reviews : reviews.slice(0, 4);

    return (
        <div style={{ background: bgCard, borderRadius: 16, padding: '1.5rem', border: `1px solid ${borderDefault}`, borderTop: `3px solid ${textPrimary}`, marginTop: '1.5rem', backdropFilter: 'blur(12px)', boxShadow: `0 4px 32px rgba(0,0,0,0.4), 0 -2px 14px ${textPrimary}35` }}>

            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '1rem' }}>
                <div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: textPrimary, textShadow: `0 0 12px ${textPrimary}55` }}>💬 Experiencias de Viajeros</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>Opiniones reales de este departamento</div>
                </div>
                {totalReviews > 0 && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: starsColor, lineHeight: 1, textShadow: `0 0 16px ${starsColor}80` }}>{promRedondeado}</div>
                        <Stars valor={Math.round(promedio)} size="0.85rem" />
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.1rem' }}>{totalReviews} opinión{totalReviews !== 1 ? 'es' : ''}</div>
                    </div>
                )}
            </div>

            {/* ── Login gate ── */}
            {!esCliente ? (
                <div style={{
                    background: `${color}06`, border: `1px dashed ${color}40`, borderRadius: 12,
                    padding: '1.25rem', textAlign: 'center', marginBottom: '1.25rem',
                }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>🔐</div>
                    <div style={{ color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                        Solo los clientes pueden dejar opiniones
                    </div>
                    <button onClick={() => navigate(`/login-cliente?redirect=${encodeURIComponent(location.pathname + location.search)}`)} style={{
                        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                        border: 'none', color: '#fff', borderRadius: 8,
                        padding: '0.5rem 1.25rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
                        boxShadow: `0 0 16px ${color}50`,
                    }}>
                        Iniciar sesión como cliente
                    </button>
                </div>
            ) : yaDejoOpinion ? (
                <div style={{
                    background: 'rgba(16,185,129,0.08)', border: '1px solid #065f46',
                    borderRadius: 10, padding: '0.85rem 1rem', marginBottom: '1.25rem',
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                }}>
                    <span style={{ fontSize: '1.2rem' }}>✅</span>
                    <span style={{ color: '#6ee7b7', fontSize: '0.82rem', fontWeight: 600 }}>
                        Ya dejaste tu opinión sobre esta empresa. ¡Gracias!
                    </span>
                </div>
            ) : (
                <div style={{ background: `${color}06`, borderRadius: 12, padding: '1.1rem', border: `1px solid ${color}25`, marginBottom: '1.25rem' }}>

                    {/* Mood selector */}
                    <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '0.6rem', fontWeight: 600 }}>
                            ¿Cómo fue tu viaje con esta empresa?
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            {EMOJIS.map(e => (
                                <EmojiBtn key={e.valor} e={e} selected={mood === e.valor} onClick={(v) => { setMood(v); setLabels([]); }} />
                            ))}
                        </div>
                        {mood > 0 && (
                            <div style={{ textAlign: 'center', marginTop: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: moodColor(mood) }}>
                                {moodLabel(mood)}
                            </div>
                        )}
                    </div>

                    {/* Tags */}
                    {mood > 0 && (
                        <div style={{ marginBottom: '0.85rem' }}>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.45rem', fontWeight: 600 }}>
                                {mood <= 2 ? '¿Qué falló? (selecciona los que apliquen)' :
                                 mood === 3 ? '¿Qué aspectos notas? (opcional)' :
                                 '¿Qué destacas? (selecciona los que apliquen)'}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                {labels.map(l => {
                                    const sel = labelsSeleccionados.includes(l.texto);
                                    return (
                                        <button key={l.texto} onClick={() => toggleLabel(l.texto)} style={{
                                            padding: '0.3rem 0.7rem', borderRadius: 20,
                                            border: sel ? `1px solid ${moodColor(mood)}` : '1px solid #1e293b',
                                            background: sel ? `${moodColor(mood)}20` : '#0d1a2e',
                                            color: sel ? moodColor(mood) : '#64748b',
                                            cursor: 'pointer', fontSize: '0.75rem', transition: 'all 0.15s',
                                        }}>
                                            {l.emoji} {l.texto}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Individual evaluation toggle — botón grande centrado */}
                    {mood > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                            <button
                                onClick={() => { setEvaluarIndividual(v => !v); setMoodBus(0); setMoodTripulacion(0); }}
                                style={{
                                    padding: '0.65rem 1.6rem', borderRadius: 999, cursor: 'pointer',
                                    background: evaluarIndividual ? `linear-gradient(135deg, ${color}, ${color}bb)` : `${color}10`,
                                    border: `1.5px solid ${evaluarIndividual ? color : color + '40'}`,
                                    color: evaluarIndividual ? '#fff' : accentColor,
                                    fontWeight: 800, fontSize: '0.92rem',
                                    letterSpacing: '0.04em', textTransform: 'uppercase',
                                    boxShadow: evaluarIndividual ? `0 0 22px ${color}55` : 'none',
                                    transition: 'all 0.2s ease',
                                }}>
                                🎯 EVALUAR BUS Y TRIPULACIÓN
                            </button>
                        </div>
                    )}

                    {/* Individual ratings */}
                    {mood > 0 && evaluarIndividual && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.75rem' }}>
                            {[
                                { label: '🚌 Bus', val: moodBus, set: setMoodBus },
                                { label: '👨‍✈️ Tripulación', val: moodTripulacion, set: setMoodTripulacion },
                            ].map(({ label, val, set }) => (
                                <div key={label} style={{ background: `${color}08`, borderRadius: 10, padding: '0.7rem', border: `1px solid ${val > 0 ? color + '40' : color + '15'}` }}>
                                    <div style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.4rem', textAlign: 'center' }}>{label}</div>
                                    <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                                        {EMOJIS.map(e => <EmojiBtn key={e.valor} e={e} selected={val === e.valor} onClick={set} size={36} />)}
                                    </div>
                                    {val > 0 && <div style={{ textAlign: 'center', fontSize: '0.68rem', color: moodColor(val), marginTop: '0.3rem', fontWeight: 600 }}>{moodLabel(val)}</div>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Submit */}
                    {puedeEnviar && (
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button onClick={handleSubmit} disabled={enviando} style={{
                                padding: '0.6rem 2rem', borderRadius: 999,
                                background: `linear-gradient(135deg, ${moodColor(mood)}, ${moodColor(mood)}cc)`,
                                border: 'none', color: 'white',
                                fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                                opacity: enviando ? 0.7 : 1, transition: 'opacity 0.15s',
                                boxShadow: `0 0 16px ${moodColor(mood)}50`,
                            }}>
                                {enviando ? 'Enviando...' : '✅ Enviar opinión'}
                            </button>
                        </div>
                    )}

                    {enviado && (
                        <div style={{
                            marginTop: '0.6rem', background: 'rgba(16,185,129,0.1)', border: '1px solid #065f46',
                            color: '#6ee7b7', padding: '0.55rem', borderRadius: 8,
                            fontSize: '0.8rem', textAlign: 'center',
                        }}>
                            ✅ ¡Gracias por tu opinión! Ayudas a otros viajeros.
                        </div>
                    )}
                    {errorEnvio && (
                        <div style={{
                            marginTop: '0.6rem', background: 'rgba(239,68,68,0.1)', border: '1px solid #7f1d1d',
                            color: '#fca5a5', padding: '0.55rem', borderRadius: 8,
                            fontSize: '0.8rem', textAlign: 'center',
                        }}>
                            ⚠ {errorEnvio}
                        </div>
                    )}
                </div>
            )}

            {/* ── Reviews list ── */}
            {totalReviews > 0 ? (
                <div>
                    <div style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                        Opiniones ({totalReviews})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {visibles.map(r => {
                            const mc = moodColor(r.mood);
                            return (
                                <div key={r.id} style={{
                                    background: '#07111f', borderRadius: 12, padding: '0.9rem',
                                    border: `1px solid ${mc}20`,
                                }}>
                                    {/* Row 1: avatar + name + time + mood emoji */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.45rem' }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                            background: `${mc}18`, border: `1.5px solid ${mc}40`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
                                        }}>
                                            {r.avatarGenerico}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.2 }}>{r.nombreUsuario}</div>
                                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{tiempoRelativo(r.fecha)}</div>
                                        </div>
                                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.2rem', lineHeight: 1 }}>{moodEmoji(r.mood)}</div>
                                            <Stars valor={r.mood} size="0.7rem" />
                                        </div>
                                    </div>

                                    {/* Row 2: bus + tripulación mini scores (only if evaluated separately) */}
                                    {(r.moodBus !== r.mood || r.moodTripulacion !== r.mood) && (
                                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.4rem', paddingLeft: '0.2rem' }}>
                                            <MiniMood label="Bus" valor={r.moodBus} />
                                            <MiniMood label="Tripulación" valor={r.moodTripulacion} />
                                        </div>
                                    )}

                                    {/* Row 3: labels */}
                                    {r.labelsSeleccionados?.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: r.comentario ? '0.4rem' : 0 }}>
                                            {r.labelsSeleccionados.map(l => (
                                                <span key={l} style={{
                                                    background: `${mc}12`, color: mc, border: `1px solid ${mc}30`,
                                                    borderRadius: 20, padding: '0.15rem 0.5rem', fontSize: '0.68rem', fontWeight: 600,
                                                }}>{l}</span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Row 4: comment text */}
                                    {r.comentario && (
                                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.1rem', paddingLeft: '0.2rem', borderLeft: `2px solid ${mc}30`, paddingLeft: '0.6rem' }}>
                                            "{r.comentario}"
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {totalReviews > 4 && (
                        <button onClick={() => setMostrarTodos(!mostrarTodos)} style={{
                            marginTop: '0.75rem', width: '100%', background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 8,
                            padding: '0.5rem', cursor: 'pointer', fontSize: '0.78rem',
                        }}>
                            {mostrarTodos ? '▲ Ver menos' : `▼ Ver ${totalReviews - 4} más`}
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', padding: '1rem 0' }}>
                    Sin opiniones todavía. ¡Sé el primero en opinar!
                </div>
            )}
        </div>
    );
};

export default FeedbackEmoji;
