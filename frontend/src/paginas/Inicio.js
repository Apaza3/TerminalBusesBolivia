import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { obtenerSucursalesOrdenadas } from '../data/mockDiscoveryDB';
import '../estilos/escritorio/principal.css';
import '../estilos/movil/responsivo.css';

/**
 * Inicio - Premium grid of bus companies sorted by rating.
 * V4: Minimalist design — only logo, name, and star rating.
 * Auto-sorted by ranking (highest first).
 */
const Inicio = () => {
    const [sucursales, setSucursales] = useState([]);

    useEffect(() => {
        const data = obtenerSucursalesOrdenadas();
        setSucursales(data);
    }, []);

    // Render star rating with lucide-react
    const renderEstrellas = (ranking) => {
        const stars = [];
        const num = parseFloat(ranking) || 0;
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.floor(num)) {
                stars.push(<Star key={i} size={16} fill="#f59e0b" color="#f59e0b" strokeWidth={1.5} />);
            } else if (i === Math.ceil(num) && num % 1 >= 0.3) {
                stars.push(<Star key={i} size={16} fill="#f59e0b" color="#f59e0b" strokeWidth={1.5} style={{ clipPath: 'inset(0 50% 0 0)' }} />);
            } else {
                stars.push(<Star key={i} size={16} fill="none" color="#475569" strokeWidth={1.5} />);
            }
        }
        return stars;
    };

    return (
        <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: '#f1f5f9', padding: '1.5rem 1rem 3rem' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                {/* Hero Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem', paddingTop: '1rem' }}>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem', background: 'linear-gradient(135deg, #3b82f6, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Terminal de Buses Bolivia
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '400px', margin: '0 auto' }}>
                        Elige tu empresa de confianza y viaja seguro
                    </p>
                </div>

                {/* CTA Search */}
                <Link to="/buscar" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    margin: '0 auto 2rem', padding: '0.85rem 1.5rem', maxWidth: '320px',
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white',
                    borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem',
                    boxShadow: '0 4px 14px rgba(59,130,246,0.35)', transition: 'transform 0.2s',
                }} id="btn-ir-buscador">
                    🔍 Buscar Viajes Disponibles
                </Link>

                {/* Sucursales Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: '1rem',
                }}>
                    {sucursales.map((s, index) => (
                        <Link key={s.id} to={`/sucursal/${s.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div style={{
                                background: '#1e293b',
                                borderRadius: '14px',
                                padding: '1.5rem',
                                border: '1px solid #334155',
                                transition: 'all 0.25s ease',
                                cursor: 'pointer',
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = s.colorAccent; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 25px ${s.colorAccent}22`; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                                {/* Ranking badge for top 3 */}
                                {index < 3 && (
                                    <div style={{
                                        position: 'absolute', top: '0.75rem', right: '0.75rem',
                                        background: index === 0 ? '#f59e0b' : index === 1 ? '#94a3b8' : '#cd7f32',
                                        color: '#0f172a', fontSize: '0.7rem', fontWeight: 800,
                                        padding: '0.2rem 0.5rem', borderRadius: '6px',
                                    }}>
                                        #{index + 1}
                                    </div>
                                )}

                                {/* Logo */}
                                <div style={{
                                    width: '56px', height: '56px', borderRadius: '14px',
                                    background: `${s.colorAccent}15`,
                                    border: `1px solid ${s.colorAccent}30`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.8rem', marginBottom: '1rem',
                                }}>
                                    {s.logoEmoji}
                                </div>

                                {/* Name */}
                                <h3 style={{
                                    margin: '0 0 0.6rem 0', fontSize: '1.1rem', fontWeight: 700,
                                    color: '#f1f5f9',
                                }}>
                                    {s.nombre}
                                </h3>

                                {/* Stars */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    {renderEstrellas(s.ranking)}
                                    <span style={{ color: '#94a3b8', fontSize: '0.85rem', marginLeft: '0.3rem', fontWeight: 500 }}>
                                        {s.ranking}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Inicio;