import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SUCURSALES_MOCK, obtenerViajesSucursal } from '../data/mockDiscoveryDB';
import { useDepartamento } from '../contextos/DepartamentoContext';
import gsap from 'gsap';

const CIUDADES = ['Cobija', 'Cochabamba', 'La Paz', 'Oruro', 'Potosí', 'Santa Cruz', 'Sucre', 'Tarija', 'Trinidad'];

const AMENIDADES_OPCIONES = ['WiFi', 'Bus Cama', 'Baño', 'TV', 'Aire Acondicionado'];

const BuscadorViajes = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { tema } = useDepartamento();
    const rootRef = useRef(null);

    const [origen, setOrigen] = useState(searchParams.get('origen') || '');
    const [destino, setDestino] = useState(searchParams.get('destino') || '');
    const [fecha, setFecha] = useState(searchParams.get('fecha') || '');
    const [cantidadBoletos, setCantidadBoletos] = useState(1);
    const [precioMax, setPrecioMax] = useState('');
    const [amenidadesSeleccionadas, setAmenidadesSeleccionadas] = useState([]);
    const [ordenamiento, setOrdenamiento] = useState('precio'); // precio | calidad | hora
    const [resultados, setResultados] = useState([]);
    const [buscado, setBuscado] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [mostrarFiltros, setMostrarFiltros] = useState(false);

    const fechaMin = new Date().toISOString().split('T')[0];

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('[data-b="header"]', { y: -20, opacity: 0, duration: 0.5, ease: 'power3.out' });
            gsap.from('[data-b="form"]', { y: 24, opacity: 0, duration: 0.55, ease: 'power3.out', delay: 0.1 });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    // gemini: los viajes son recurrentes semanalmente.
    // Se proyecta cada viaje al próximo día de la semana que coincida con su día original.
    // La fecha del mock solo importa para el día de la semana y la hora.
    const proyectarAProximaOcurrencia = (salidaISO) => {
        const original = new Date(salidaISO);
        const diasSemanaOriginal = original.getDay(); // 0=dom, 1=lun...
        const ahora = new Date();
        const hoy = ahora.getDay();
        let diasDiff = diasSemanaOriginal - hoy;
        if (diasDiff < 0) diasDiff += 7;
        // Si es el mismo día pero la hora ya pasó, proyectar a la siguiente semana
        if (diasDiff === 0 && original.getHours() * 60 + original.getMinutes() <= ahora.getHours() * 60 + ahora.getMinutes()) {
            diasDiff = 7;
        }
        const proyectado = new Date(ahora);
        proyectado.setDate(ahora.getDate() + diasDiff);
        proyectado.setHours(original.getHours(), original.getMinutes(), 0, 0);
        return proyectado.toISOString();
    };

    const buscarViajes = () => {
        if (!origen || !destino) return;
        setCargando(true);
        setBuscado(true);

        setTimeout(() => {
            let todos = SUCURSALES_MOCK.flatMap(s =>
                obtenerViajesSucursal(s.id).map(v => ({
                    ...v,
                    // gemini: reemplazar fecha pasada del mock con la próxima ocurrencia del mismo día/hora
                    salida: proyectarAProximaOcurrencia(v.salida),
                    sucursalNombre: s.nombre,
                    sucursalEmoji: s.logoEmoji,
                    sucursalColor: s.colorAccent,
                    ranking: s.ranking,
                    amenidades: s.amenidades,
                }))
            );

            todos = todos.filter(v =>
                v.origen.toLowerCase() === origen.toLowerCase() &&
                v.destino.toLowerCase() === destino.toLowerCase()
            );

            if (fecha) {
                // gemini: comparar solo el día de la semana, no la fecha exacta
                const diaFiltro = new Date(fecha + 'T00:00:00').getDay();
                todos = todos.filter(v => new Date(v.salida).getDay() === diaFiltro);
            }
            if (precioMax) {
                todos = todos.filter(v => v.precio <= parseFloat(precioMax));
            }
            if (amenidadesSeleccionadas.length > 0) {
                todos = todos.filter(v =>
                    amenidadesSeleccionadas.every(a => v.amenidades?.includes(a))
                );
            }

            if (ordenamiento === 'precio') todos.sort((a, b) => a.precio - b.precio);
            else if (ordenamiento === 'calidad') todos.sort((a, b) => b.ranking - a.ranking);
            else if (ordenamiento === 'hora') todos.sort((a, b) => new Date(a.salida) - new Date(b.salida));

            setResultados(todos);
            setCargando(false);

            setTimeout(() => {
                gsap.from('[data-b="card"]', {
                    y: 20, opacity: 0, stagger: 0.06, duration: 0.4, ease: 'power2.out',
                });
            }, 50);
        }, 500);
    };

    const toggleAmenidad = (a) => {
        setAmenidadesSeleccionadas(prev =>
            prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
        );
    };

    const handleSeleccionar = (viaje) => {
        navigate(`/reserva/${viaje.id}`, { state: { cantidadBoletos, viaje } });
    };

    const starColor = (r) => r >= 4.5 ? '#f59e0b' : r >= 4.0 ? '#d97706' : '#64748b';

    const selectStyle = {
        background: '#0d1a2e', border: `1px solid ${tema.color}35`,
        color: '#f1f5f9', borderRadius: '8px', padding: '0.6rem 1rem',
        fontSize: '0.88rem', outline: 'none', width: '100%',
        cursor: 'pointer', transition: 'border-color 0.2s',
    };

    return (
        <div ref={rootRef} style={{ background: '#07111f', minHeight: '100vh', color: '#dde5f0', fontFamily: "'Inter', system-ui, sans-serif" }}>

            {/* Header */}
            <div data-b="header" style={{
                background: `linear-gradient(135deg, ${tema.bg} 0%, #07111f 100%)`,
                borderBottom: `1px solid ${tema.color}25`,
                padding: '1.5rem clamp(1rem, 5vw, 3rem)',
            }}>
                <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                    <button onClick={() => navigate('/')} style={{
                        background: 'none', border: `1px solid ${tema.color}40`, color: tema.acento,
                        padding: '0.4rem 0.9rem', borderRadius: '8px', cursor: 'pointer',
                        fontSize: '0.82rem', marginBottom: '1.25rem', transition: 'all 0.2s',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.background = `${tema.color}15`; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
                        ← Volver
                    </button>
                    <h1 style={{ margin: '0 0 0.25rem', fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, color: '#f1f5f9' }}>
                        Buscar Viajes
                    </h1>
                    <p style={{ margin: 0, color: '#475569', fontSize: '0.88rem' }}>
                        Encuentra tu próximo destino · Bolivia
                    </p>
                </div>
            </div>

            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem clamp(1rem, 5vw, 2rem)' }}>

                {/* Search Form */}
                <div data-b="form" style={{
                    background: '#0d1a2e', borderRadius: '16px', border: `1px solid ${tema.color}25`,
                    padding: '1.5rem', marginBottom: '1.5rem',
                    boxShadow: `0 8px 40px rgba(0,0,0,0.4)`,
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                        {/* Origen */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                                Origen
                            </label>
                            <select value={origen} onChange={e => setOrigen(e.target.value)} style={selectStyle}
                                onFocus={e => e.target.style.borderColor = tema.color}
                                onBlur={e => e.target.style.borderColor = `${tema.color}35`}>
                                <option value="" style={{ background: '#0d1a2e' }}>¿De dónde?</option>
                                {CIUDADES.map(c => <option key={c} value={c} style={{ background: '#0d1a2e' }}>{c}</option>)}
                            </select>
                        </div>

                        {/* Swap button */}
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '0.1rem', maxWidth: 48, margin: '0 auto' }}>
                            <button onClick={() => { const tmp = origen; setOrigen(destino); setDestino(tmp); }} style={{
                                width: 36, height: 36, borderRadius: '50%', border: `1px solid ${tema.color}50`,
                                background: `${tema.color}12`, color: tema.acento, cursor: 'pointer', fontSize: '0.9rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                            }} title="Intercambiar">⇄</button>
                        </div>

                        {/* Destino */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                                Destino
                            </label>
                            <select value={destino} onChange={e => setDestino(e.target.value)} style={selectStyle}
                                onFocus={e => e.target.style.borderColor = tema.color}
                                onBlur={e => e.target.style.borderColor = `${tema.color}35`}>
                                <option value="" style={{ background: '#0d1a2e' }}>¿A dónde?</option>
                                {CIUDADES.filter(c => c !== origen).map(c => <option key={c} value={c} style={{ background: '#0d1a2e' }}>{c}</option>)}
                            </select>
                        </div>

                        {/* Fecha */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                                Fecha
                            </label>
                            <input type="date" value={fecha} min={fechaMin} onChange={e => setFecha(e.target.value)} style={{ ...selectStyle, colorScheme: 'dark' }} />
                        </div>

                        {/* Boletos */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                                Boletos
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#0d1a2e', border: `1px solid ${tema.color}35`, borderRadius: '8px', padding: '0.45rem 0.75rem' }}>
                                <button onClick={() => setCantidadBoletos(Math.max(1, cantidadBoletos - 1))} style={{
                                    width: 24, height: 24, borderRadius: '50%', border: `1px solid ${tema.color}40`,
                                    background: `${tema.color}15`, color: tema.acento, cursor: 'pointer', fontSize: '1rem', lineHeight: 1,
                                }}>−</button>
                                <span style={{ flex: 1, textAlign: 'center', fontWeight: 700, color: '#f1f5f9' }}>{cantidadBoletos}</span>
                                <button onClick={() => setCantidadBoletos(Math.min(10, cantidadBoletos + 1))} style={{
                                    width: 24, height: 24, borderRadius: '50%', border: `1px solid ${tema.color}40`,
                                    background: `${tema.color}15`, color: tema.acento, cursor: 'pointer', fontSize: '1rem', lineHeight: 1,
                                }}>+</button>
                            </div>
                        </div>
                    </div>

                    {/* Filters row */}
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => setMostrarFiltros(!mostrarFiltros)} style={{
                            background: mostrarFiltros ? `${tema.color}20` : 'transparent',
                            border: `1px solid ${mostrarFiltros ? tema.color : tema.color + '40'}`,
                            color: mostrarFiltros ? tema.acento : '#64748b',
                            borderRadius: '8px', padding: '0.4rem 0.85rem', cursor: 'pointer', fontSize: '0.8rem',
                            transition: 'all 0.2s',
                        }}>
                            ⚙️ Filtros {amenidadesSeleccionadas.length > 0 && `(${amenidadesSeleccionadas.length})`}
                        </button>

                        <div style={{ display: 'flex', gap: '0.35rem', fontSize: '0.75rem' }}>
                            {['precio', 'calidad', 'hora'].map(o => (
                                <button key={o} onClick={() => setOrdenamiento(o)} style={{
                                    padding: '0.35rem 0.75rem', borderRadius: '6px', border: 'none',
                                    background: ordenamiento === o ? `${tema.color}25` : '#07111f',
                                    color: ordenamiento === o ? tema.acento : '#475569',
                                    cursor: 'pointer', fontWeight: ordenamiento === o ? 600 : 400,
                                    transition: 'all 0.15s', textTransform: 'capitalize',
                                }}>
                                    {o === 'precio' ? '💰 Precio' : o === 'calidad' ? '⭐ Calidad' : '🕐 Hora'}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={buscarViajes}
                            disabled={!origen || !destino || cargando}
                            style={{
                                marginLeft: 'auto', padding: '0.6rem 1.75rem',
                                background: origen && destino ? tema.color : '#1e293b',
                                color: origen && destino ? '#fff' : '#475569',
                                border: 'none', borderRadius: '10px', fontWeight: 700,
                                cursor: origen && destino ? 'pointer' : 'not-allowed',
                                fontSize: '0.9rem', transition: 'all 0.2s',
                                boxShadow: origen && destino ? `0 4px 20px ${tema.color}50` : 'none',
                            }}>
                            {cargando ? '⏳ Buscando...' : '🔍 Buscar Viajes'}
                        </button>
                    </div>

                    {/* Advanced filters panel */}
                    {mostrarFiltros && (
                        <div style={{
                            marginTop: '1rem', padding: '1rem', background: '#07111f',
                            borderRadius: '10px', border: `1px solid ${tema.color}20`,
                        }}>
                            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Precio máximo</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.85rem' }}>Bs</span>
                                        <input type="number" min="0" max="500" value={precioMax}
                                            onChange={e => setPrecioMax(e.target.value)}
                                            placeholder="Sin límite"
                                            style={{ ...selectStyle, width: 110, padding: '0.45rem 0.75rem' }} />
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Amenidades</div>
                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                        {AMENIDADES_OPCIONES.map(a => (
                                            <button key={a} onClick={() => toggleAmenidad(a)} style={{
                                                padding: '0.3rem 0.7rem', borderRadius: '999px', fontSize: '0.75rem',
                                                border: `1px solid ${amenidadesSeleccionadas.includes(a) ? tema.color : '#334155'}`,
                                                background: amenidadesSeleccionadas.includes(a) ? `${tema.color}20` : 'transparent',
                                                color: amenidadesSeleccionadas.includes(a) ? tema.acento : '#64748b',
                                                cursor: 'pointer', transition: 'all 0.15s',
                                            }}>
                                                {a}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Results */}
                {cargando && (
                    <div style={{ textAlign: 'center', padding: '4rem', color: '#475569' }}>
                        <div style={{
                            width: 48, height: 48, margin: '0 auto 1rem',
                            border: `3px solid ${tema.color}30`,
                            borderTop: `3px solid ${tema.color}`,
                            borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                        }} />
                        <div style={{ fontWeight: 600, color: '#64748b' }}>Buscando viajes...</div>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                )}

                {!cargando && buscado && resultados.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '4rem', background: '#0d1a2e', borderRadius: '14px', border: '1px solid #1e293b' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚌</div>
                        <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem' }}>Sin viajes disponibles</div>
                        <div style={{ color: '#475569', fontSize: '0.85rem' }}>Intenta con otra fecha o ruta</div>
                    </div>
                )}

                {!cargando && resultados.length > 0 && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div style={{ color: '#475569', fontSize: '0.85rem' }}>
                                <span style={{ color: tema.acento, fontWeight: 700 }}>{resultados.length}</span> viaje{resultados.length !== 1 ? 's' : ''} encontrado{resultados.length !== 1 ? 's' : ''}
                                {' · '}{origen} → {destino}
                            </div>
                            <div style={{ color: '#475569', fontSize: '0.78rem' }}>
                                {cantidadBoletos} boleto{cantidadBoletos !== 1 ? 's' : ''}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {resultados.map(viaje => (
                                <div key={viaje.id} data-b="card" style={{
                                    background: '#0d1a2e', borderRadius: '14px',
                                    border: `1px solid ${viaje.sucursalColor || tema.color}22`,
                                    overflow: 'hidden', transition: 'all 0.2s',
                                    cursor: 'pointer',
                                }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.borderColor = `${viaje.sucursalColor || tema.color}70`;
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = `0 8px 30px rgba(0,0,0,0.3)`;
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.borderColor = `${viaje.sucursalColor || tema.color}22`;
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}>
                                    {/* Color accent bar */}
                                    <div style={{ height: 3, background: `linear-gradient(90deg, ${viaje.sucursalColor || tema.color} 0%, transparent 100%)` }} />

                                    <div style={{ padding: '1.25rem 1.5rem', display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'center' }}>
                                        <div>
                                            {/* Company */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                                                <div style={{
                                                    width: 36, height: 36, borderRadius: '8px',
                                                    background: `${viaje.sucursalColor || '#3b82f6'}18`,
                                                    border: `1px solid ${viaje.sucursalColor || '#3b82f6'}35`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '1.1rem',
                                                }}>
                                                    {viaje.sucursalEmoji || '🚌'}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.92rem' }}>{viaje.sucursalNombre}</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                        {[1, 2, 3, 4, 5].map(s => (
                                                            <span key={s} style={{ fontSize: '0.6rem', color: s <= Math.round(viaje.ranking) ? starColor(viaje.ranking) : '#1e293b' }}>★</span>
                                                        ))}
                                                        <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '0.25rem' }}>{viaje.ranking}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Route */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
                                                <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '1rem' }}>{viaje.origen}</span>
                                                <div style={{ flex: 1, maxWidth: 80, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <div style={{ flex: 1, height: 1, background: `${viaje.sucursalColor || tema.color}50` }} />
                                                    <span style={{ fontSize: '0.7rem', color: viaje.sucursalColor || tema.color }}>✈</span>
                                                    <div style={{ flex: 1, height: 1, background: `${viaje.sucursalColor || tema.color}50` }} />
                                                </div>
                                                <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '1rem' }}>{viaje.destino}</span>
                                            </div>

                                            {/* Time & duration */}
                                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: '#64748b', marginBottom: '0.6rem' }}>
                                                <span>🕐 {new Date(viaje.salida).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span>📅 {new Date(viaje.salida).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })}</span>
                                                {viaje.duracion_estimada && <span>⏱ {viaje.duracion_estimada}</span>}
                                            </div>

                                            {/* Amenidades */}
                                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                                {(viaje.amenidades || []).map(a => (
                                                    <span key={a} style={{
                                                        fontSize: '0.68rem', color: '#475569',
                                                        background: '#07111f', padding: '0.15rem 0.5rem',
                                                        borderRadius: '4px', border: '1px solid #1e293b',
                                                    }}>{a}</span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Price + CTA */}
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.72rem', color: '#475569', marginBottom: '0.25rem' }}>por persona</div>
                                            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>
                                                Bs {viaje.precio}
                                            </div>
                                            {cantidadBoletos > 1 && (
                                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.75rem' }}>
                                                    Total: Bs {viaje.precio * cantidadBoletos}
                                                </div>
                                            )}
                                            <button onClick={() => handleSeleccionar(viaje)} style={{
                                                background: viaje.sucursalColor || tema.color,
                                                color: '#fff', border: 'none', borderRadius: '10px',
                                                padding: '0.6rem 1.25rem', fontWeight: 700, cursor: 'pointer',
                                                fontSize: '0.85rem', marginTop: '0.5rem',
                                                boxShadow: `0 4px 15px ${viaje.sucursalColor || tema.color}50`,
                                                transition: 'transform 0.15s',
                                            }}
                                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                                Elegir →
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {!buscado && (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#1e293b' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.3 }}>🚌</div>
                        <div style={{ color: '#334155', fontWeight: 600 }}>Selecciona origen y destino para comenzar</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BuscadorViajes;
