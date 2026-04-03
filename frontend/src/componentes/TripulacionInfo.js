import React from 'react';
import { Star, MapPin, Shield } from 'lucide-react';

/**
 * TripulacionInfo — Bottom-sheet style panel showing crew and bus info
 * for a selected trip. Displays driver, assistant, and bus ratings.
 *
 * Props:
 *   conductor: { nombre, rolLabel, rating, totalViajes, experiencia }
 *   ayudante: { nombre, rolLabel, rating, totalViajes, experiencia }
 *   bus: { placa, tipo, tipoIcono, marca, modelo, capacidad, rating, amenidades }
 *   onCerrar: function (optional, to dismiss)
 */
const TripulacionInfo = ({ conductor, ayudante, bus, onCerrar }) => {

    // Render stars (lucide-react)
    const renderStars = (rating) => {
        const stars = [];
        const num = parseFloat(rating) || 0;
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <Star
                    key={i}
                    size={14}
                    fill={i <= Math.floor(num) ? '#f59e0b' : (i === Math.ceil(num) && num % 1 >= 0.3 ? '#f59e0b' : 'none')}
                    color={i <= Math.round(num) ? '#f59e0b' : '#475569'}
                    strokeWidth={1.5}
                />
            );
        }
        return stars;
    };

    // Generate initial avatar from name
    const getInitials = (nombre) => {
        if (!nombre) return '?';
        return nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    };

    // Crew card
    const CrewCard = ({ persona, colorAccent, icono }) => (
        <div style={{
            display: 'flex', gap: '0.85rem', padding: '0.85rem',
            background: '#0f172a', borderRadius: '12px',
            border: '1px solid #1e293b',
        }}>
            {/* Avatar */}
            <div style={{
                width: '50px', height: '50px', borderRadius: '50%',
                background: `${colorAccent}20`, border: `2px solid ${colorAccent}50`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.9rem', color: colorAccent,
                flexShrink: 0,
            }}>
                {getInitials(persona.nombre)}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f1f5f9' }}>
                            {persona.nombre}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem' }}>
                            {icono} {persona.rolLabel}
                        </div>
                    </div>
                </div>

                {/* Rating */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.4rem' }}>
                    {renderStars(persona.rating)}
                    <span style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600, marginLeft: '0.2rem' }}>
                        {persona.rating}
                    </span>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem', fontSize: '0.72rem', color: '#64748b' }}>
                    <span>{persona.totalViajes} viajes</span>
                    <span>·</span>
                    <span>{persona.experiencia}</span>
                </div>
            </div>
        </div>
    );

    return (
        <div style={{
            background: '#1e293b', borderRadius: '14px', padding: '1.25rem',
            border: '1px solid #334155', marginBottom: '1rem',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Shield size={18} color="#60a5fa" />
                    <h3 style={{ margin: 0, fontSize: '1rem', color: '#f1f5f9' }}>
                        ¿Quién te lleva?
                    </h3>
                </div>
                {onCerrar && (
                    <button onClick={onCerrar} style={{
                        background: 'transparent', border: 'none', color: '#64748b',
                        cursor: 'pointer', fontSize: '1.2rem', padding: '0.25rem',
                    }}>✕</button>
                )}
            </div>

            {/* Crew Members */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
                {conductor && <CrewCard persona={conductor} colorAccent="#3b82f6" icono="🚗" />}
                {ayudante && <CrewCard persona={ayudante} colorAccent="#10b981" icono="🤝" />}
            </div>

            {/* Bus Info */}
            {bus && (
                <div style={{
                    padding: '0.85rem', background: '#0f172a', borderRadius: '12px',
                    border: '1px solid #1e293b',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div style={{
                                width: '42px', height: '42px', borderRadius: '10px',
                                background: '#1e293b', border: '1px solid #334155',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.4rem',
                            }}>
                                {bus.tipoIcono || '🚌'}
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f1f5f9' }}>{bus.tipo}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{bus.marca} {bus.modelo}</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.4rem' }}>
                        {renderStars(bus.rating)}
                        <span style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600, marginLeft: '0.2rem' }}>
                            {bus.rating}
                        </span>
                    </div>

                    {/* Bus details row */}
                    <div style={{
                        display: 'flex', flexWrap: 'wrap', gap: '0.6rem',
                        fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.3rem',
                    }}>
                        <span style={{
                            background: '#1e293b', padding: '0.25rem 0.6rem',
                            borderRadius: '6px', border: '1px solid #334155',
                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                        }}>
                            <MapPin size={12} /> {bus.placa}
                        </span>
                        <span style={{
                            background: '#1e293b', padding: '0.25rem 0.6rem',
                            borderRadius: '6px', border: '1px solid #334155',
                        }}>
                            {bus.capacidad} asientos
                        </span>
                        <span style={{
                            background: '#1e293b', padding: '0.25rem 0.6rem',
                            borderRadius: '6px', border: '1px solid #334155',
                        }}>
                            {bus.pisos} piso{bus.pisos > 1 ? 's' : ''}
                        </span>
                    </div>

                    {/* Amenidades */}
                    {bus.amenidades && bus.amenidades.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                            {bus.amenidades.map((a, i) => (
                                <span key={i} style={{
                                    fontSize: '0.7rem', padding: '0.2rem 0.5rem',
                                    borderRadius: '4px', background: 'rgba(59,130,246,0.1)',
                                    color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)',
                                }}>
                                    {a}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TripulacionInfo;
