import React, { useState, useEffect } from 'react';
import { useAuth } from '../contextos/AuthContext';
import { enviarFeedback, obtenerFeedback, obtenerLabelsPorMood } from '../data/mockDiscoveryDB';

/**
 * FeedbackEmoji — Marketplace-style emoji feedback system.
 * 5 mood levels with dynamic labels. Reviews show real name + generic avatar.
 * Props: sucursalId (string)
 */
const FeedbackEmoji = ({ sucursalId }) => {
    const { perfil } = useAuth();
    const [mood, setMood] = useState(0); // 0 = unselected, 1-5
    const [labelsSeleccionados, setLabelsSeleccionados] = useState([]);
    const [enviando, setEnviando] = useState(false);
    const [enviado, setEnviado] = useState(false);
    const [reviews, setReviews] = useState([]);

    useEffect(() => {
        setReviews(obtenerFeedback(sucursalId));
    }, [sucursalId]);

    const emojis = [
        { valor: 1, emoji: '😡', label: 'Muy mal' },
        { valor: 2, emoji: '😕', label: 'Mal' },
        { valor: 3, emoji: '😐', label: 'Regular' },
        { valor: 4, emoji: '🙂', label: 'Bien' },
        { valor: 5, emoji: '😄', label: 'Excelente' },
    ];

    const labels = mood > 0 ? obtenerLabelsPorMood(mood) : [];

    const toggleLabel = (texto) => {
        setLabelsSeleccionados(prev =>
            prev.includes(texto) ? prev.filter(l => l !== texto) : [...prev, texto]
        );
    };

    const handleSubmit = () => {
        if (mood === 0) return;
        setEnviando(true);

        setTimeout(() => {
            const nuevo = enviarFeedback({
                sucursalId,
                nombreUsuario: perfil?.nombre_completo || perfil?.nombreCompleto || perfil?.email || 'Viajero',
                mood,
                labelsSeleccionados,
                comentario: '',
            });

            setReviews(prev => [nuevo, ...prev]);
            setMood(0);
            setLabelsSeleccionados([]);
            setEnviando(false);
            setEnviado(true);
            setTimeout(() => setEnviado(false), 3000);
        }, 400);
    };

    // Time ago helper
    const tiempoRelativo = (fecha) => {
        const diff = Date.now() - new Date(fecha).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Justo ahora';
        if (mins < 60) return `Hace ${mins} min`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `Hace ${hrs}h`;
        const dias = Math.floor(hrs / 24);
        return `Hace ${dias}d`;
    };

    return (
        <div style={{
            background: '#1e293b', borderRadius: '14px', padding: '1.5rem',
            border: '1px solid #334155', marginTop: '1.5rem',
        }}>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: '#f1f5f9' }}>
                💬 Experiencias de Viajeros
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                ¿Cómo fue tu viaje con esta empresa?
            </p>

            {/* Emoji Selector */}
            <div style={{
                display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem',
            }}>
                {emojis.map(e => (
                    <button key={e.valor} onClick={() => { setMood(e.valor); setLabelsSeleccionados([]); }}
                        style={{
                            width: '52px', height: '52px', borderRadius: '12px',
                            border: mood === e.valor ? '2px solid #3b82f6' : '1px solid #334155',
                            background: mood === e.valor ? 'rgba(59,130,246,0.15)' : '#0f172a',
                            cursor: 'pointer', fontSize: '1.6rem',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s', transform: mood === e.valor ? 'scale(1.1)' : 'scale(1)',
                        }}>
                        <span>{e.emoji}</span>
                    </button>
                ))}
            </div>

            {/* Selected mood label */}
            {mood > 0 && (
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <span style={{
                        color: mood <= 2 ? '#ef4444' : mood === 3 ? '#f59e0b' : '#10b981',
                        fontSize: '0.85rem', fontWeight: 600,
                    }}>
                        {emojis.find(e => e.valor === mood)?.label}
                    </span>
                </div>
            )}

            {/* Dynamic Labels */}
            {mood > 0 && labels.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                        {mood <= 2 ? 'Puntos a mejorar:' : mood === 3 ? 'Aspectos regulares:' : 'Puntos fuertes:'}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {labels.map(l => {
                            const seleccionado = labelsSeleccionados.includes(l.texto);
                            return (
                                <button key={l.texto} onClick={() => toggleLabel(l.texto)}
                                    style={{
                                        padding: '0.45rem 0.85rem', borderRadius: '20px',
                                        border: seleccionado ? '1px solid #3b82f6' : '1px solid #334155',
                                        background: seleccionado ? 'rgba(59,130,246,0.2)' : '#0f172a',
                                        color: seleccionado ? '#93c5fd' : '#94a3b8',
                                        cursor: 'pointer', fontSize: '0.8rem',
                                        transition: 'all 0.2s',
                                    }}>
                                    {l.emoji} {l.texto}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Submit */}
            {mood > 0 && labelsSeleccionados.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                    <button onClick={handleSubmit} disabled={enviando}
                        style={{
                            padding: '0.7rem 2rem', background: '#3b82f6', color: 'white',
                            border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer',
                            fontSize: '0.85rem',
                        }}>
                        {enviando ? 'Enviando...' : '✅ Enviar Opinión'}
                    </button>
                </div>
            )}

            {/* Success toast */}
            {enviado && (
                <div style={{
                    background: 'rgba(16,185,129,0.1)', border: '1px solid #065f46',
                    color: '#6ee7b7', padding: '0.6rem', borderRadius: '8px',
                    fontSize: '0.85rem', textAlign: 'center', marginBottom: '1rem',
                }}>
                    ✅ ¡Gracias por tu opinión!
                </div>
            )}

            {/* Reviews List */}
            {reviews.length > 0 && (
                <div style={{ borderTop: '1px solid #334155', paddingTop: '1rem' }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.75rem', fontWeight: 600 }}>
                        {reviews.length} opinión{reviews.length !== 1 ? 'es' : ''}
                    </p>
                    {reviews.slice(0, 5).map(r => (
                        <div key={r.id} style={{
                            display: 'flex', gap: '0.75rem', marginBottom: '0.75rem',
                            padding: '0.75rem', background: '#0f172a', borderRadius: '10px',
                        }}>
                            {/* Generic avatar */}
                            <div style={{
                                width: '36px', height: '36px', borderRadius: '50%',
                                background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.2rem', flexShrink: 0,
                            }}>
                                {r.avatarGenerico}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                    <span style={{ color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 600 }}>{r.nombreUsuario}</span>
                                    <span style={{ color: '#475569', fontSize: '0.7rem' }}>{tiempoRelativo(r.fecha)}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                                    <span style={{ fontSize: '1rem' }}>{emojis.find(e => e.valor === r.mood)?.emoji}</span>
                                    {r.labelsSeleccionados.length > 0 && (
                                        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                                            {r.labelsSeleccionados.join(' · ')}
                                        </span>
                                    )}
                                </div>

                            </div>
                        </div>
                    ))}
                    {reviews.length > 5 && (
                        <p style={{ color: '#64748b', fontSize: '0.8rem', textAlign: 'center' }}>
                            +{reviews.length - 5} opiniones más
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default FeedbackEmoji;
