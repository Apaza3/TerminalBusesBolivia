import React, { useState } from 'react';
import { guardarCalificacion, yaCalificado, e2eLog } from '../servicios/analyticsService';

const ESTRELLAS = [1, 2, 3, 4, 5];

const CalificacionViaje = ({ reserva, sucursalId, onCalificado }) => {
    const [hover, setHover] = useState(0);
    const [puntuacion, setPuntuacion] = useState(0);
    const [comentario, setComentario] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState('');
    const [enviado, setEnviado] = useState(() => yaCalificado(reserva?.id));

    if (!reserva || enviado) {
        if (enviado) {
            return (
                <div style={{
                    marginTop: '0.75rem', padding: '0.6rem 1rem',
                    background: 'rgba(16,185,129,0.08)', border: '1px solid #065f46',
                    borderRadius: 8, fontSize: '0.78rem', color: '#6ee7b7',
                }}>
                    ✓ Viaje calificado — gracias por tu opinión
                </div>
            );
        }
        return null;
    }

    const handleEnviar = () => {
        if (puntuacion === 0) { setError('Selecciona una puntuación.'); return; }
        setEnviando(true);
        const result = guardarCalificacion({
            boletoId: reserva.id,
            sucursalId: sucursalId || reserva.sucursalId || 'demo-s1',
            puntuacion,
            comentario: comentario.trim(),
            ruta: `${reserva.origen} → ${reserva.destino}`,
            fecha: reserva.fechaSalida,
        });

        if (!result.ok) {
            setError(result.error || 'Error al guardar.');
            setEnviando(false);
            return;
        }

        e2eLog('calificacion_guardada', { boletoId: reserva.id, puntuacion, sucursalId });
        setEnviado(true);
        onCalificado?.();
    };

    return (
        <div style={{
            marginTop: '0.75rem', padding: '1rem',
            background: 'rgba(139,92,246,0.07)', border: '1px solid #4c1d95',
            borderRadius: 10,
        }}>
            <div style={{ fontSize: '0.78rem', color: '#c4b5fd', fontWeight: 600, marginBottom: '0.6rem' }}>
                ⭐ Califica este viaje
            </div>

            <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.6rem' }}>
                {ESTRELLAS.map(n => (
                    <button
                        key={n}
                        onMouseEnter={() => setHover(n)}
                        onMouseLeave={() => setHover(0)}
                        onClick={() => { setPuntuacion(n); setError(''); }}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: '1.4rem', padding: '0 0.1rem',
                            color: n <= (hover || puntuacion) ? '#f59e0b' : '#334155',
                            transition: 'color 0.1s',
                        }}
                    >★</button>
                ))}
                {puntuacion > 0 && (
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', alignSelf: 'center', marginLeft: '0.4rem' }}>
                        {['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'][puntuacion]}
                    </span>
                )}
            </div>

            <textarea
                placeholder="Comentario opcional..."
                value={comentario}
                onChange={e => setComentario(e.target.value)}
                maxLength={300}
                style={{
                    width: '100%', boxSizing: 'border-box',
                    background: '#0f172a', border: '1px solid #334155',
                    color: '#e2e8f0', borderRadius: 6, padding: '0.5rem 0.7rem',
                    fontSize: '0.78rem', resize: 'vertical', minHeight: 54,
                    fontFamily: 'inherit',
                }}
            />

            {error && <div style={{ color: '#f87171', fontSize: '0.73rem', marginTop: '0.3rem' }}>{error}</div>}

            <button
                onClick={handleEnviar}
                disabled={enviando || puntuacion === 0}
                style={{
                    marginTop: '0.6rem', padding: '0.45rem 1.1rem',
                    background: puntuacion > 0 ? 'linear-gradient(135deg, #7c3aed, #8b5cf6)' : '#1e293b',
                    border: 'none', color: puntuacion > 0 ? 'white' : '#475569',
                    borderRadius: 6, cursor: puntuacion > 0 ? 'pointer' : 'not-allowed',
                    fontSize: '0.8rem', fontWeight: 700,
                    opacity: enviando ? 0.7 : 1,
                }}
            >
                {enviando ? 'Enviando...' : 'Enviar calificación'}
            </button>
        </div>
    );
};

export default CalificacionViaje;
