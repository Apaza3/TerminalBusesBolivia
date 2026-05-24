import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import { obtenerViajesFinalizados } from '../../data/mockStorage';

const PasajerosFinalizados = () => {
    const { perfil } = useAuth();
    const deptNombre = perfil?.departamento || 'La Paz';
    const tema = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];

    const [viajes, setViajes] = useState([]);
    const [expandidos, setExpandidos] = useState({});
    const [busqueda, setBusqueda] = useState('');

    const cargar = useCallback(() => {
        const lista = obtenerViajesFinalizados(perfil?.sucursal_id);
        lista.sort((a, b) => new Date(b.finalizadoEn) - new Date(a.finalizadoEn));
        setViajes(lista);
    }, [perfil?.sucursal_id]);

    useEffect(() => { cargar(); }, [cargar]);

    const filtrados = viajes.filter(v => {
        if (!busqueda) return true;
        const q = busqueda.toLowerCase();
        return v.busPlaca?.toLowerCase().includes(q) ||
               v.origen?.toLowerCase().includes(q) ||
               v.destino?.toLowerCase().includes(q) ||
               v.pasajeros?.some(p =>
                   p.nombre?.toLowerCase().includes(q) ||
                   p.ci?.toLowerCase().includes(q)
               );
    });

    const toggleExpand = (id) =>
        setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));

    const totalPasajeros = filtrados.reduce((s, v) => s + (v.totalPasajeros || 0), 0);

    const styles = {
        page: { padding: '2rem', maxWidth: 1000, margin: '0 auto' },
        titulo: { fontSize: '1.45rem', fontWeight: 700, color: '#e2e8f0', margin: 0 },
        subtitulo: { fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem', marginBottom: '1.5rem' },
        controles: {
            display: 'flex', gap: '0.75rem', marginBottom: '1.25rem',
            flexWrap: 'wrap', alignItems: 'center',
        },
        input: {
            flex: 1, minWidth: 220, padding: '0.5rem 0.85rem',
            background: '#0f1e35', border: `1px solid ${tema.color}30`,
            borderRadius: 8, color: '#e2e8f0', fontSize: '0.84rem', outline: 'none',
        },
        statBadge: (color) => ({
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.3rem 0.75rem', borderRadius: 20,
            background: `${color}15`, border: `1px solid ${color}30`,
            color: color, fontSize: '0.78rem', fontWeight: 600,
        }),
        card: (expandido) => ({
            background: '#0b1628', border: `1px solid ${tema.color}${expandido ? '35' : '15'}`,
            borderRadius: 12, marginBottom: '0.75rem', overflow: 'hidden',
            transition: 'border-color 0.2s',
        }),
        cardHeader: {
            display: 'flex', alignItems: 'center', gap: '1rem',
            padding: '0.9rem 1.1rem', cursor: 'pointer',
            background: `${tema.color}08`,
        },
        placa: {
            fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 700,
            color: '#94a3b8', background: '#0f1e35',
            padding: '0.25rem 0.55rem', borderRadius: 6,
        },
        ruta: { fontWeight: 600, color: '#e2e8f0', flex: 1, fontSize: '0.9rem' },
        metaDato: { fontSize: '0.72rem', color: '#475569' },
        chevron: (exp) => ({
            marginLeft: 'auto', color: tema.acento, fontSize: '0.85rem',
            transform: exp ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s',
        }),
        paxGrid: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr auto auto',
            gap: '0', borderTop: `1px solid ${tema.color}15`,
        },
        paxTh: {
            padding: '0.5rem 1rem', fontSize: '0.68rem', color: '#334155',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            background: `${tema.color}06`, borderBottom: `1px solid ${tema.color}12`,
        },
        paxTd: {
            padding: '0.6rem 1rem', fontSize: '0.8rem', color: '#94a3b8',
            borderBottom: '1px solid #0f1e3525',
        },
        vacio: {
            textAlign: 'center', padding: '3rem 1rem',
            color: '#334155', fontSize: '0.9rem',
        },
    };

    return (
        <div style={styles.page}>
            <h1 style={styles.titulo}>🧑‍✈️ Pasajeros — Viajes Finalizados</h1>
            <p style={styles.subtitulo}>Manifiestos de viajes completados · {perfil?.sucursal_nombre}</p>

            <div style={styles.controles}>
                <input
                    style={styles.input}
                    placeholder="Buscar por bus, ruta o pasajero..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                />
                <div style={styles.statBadge(tema.acento)}>
                    {filtrados.length} viaje{filtrados.length !== 1 ? 's' : ''}
                </div>
                <div style={styles.statBadge('#22c55e')}>
                    {totalPasajeros} pasajero{totalPasajeros !== 1 ? 's' : ''}
                </div>
                <button onClick={cargar} style={{
                    padding: '0.4rem 0.9rem', borderRadius: 8,
                    border: `1px solid ${tema.color}30`, background: 'transparent',
                    color: tema.acento, cursor: 'pointer', fontSize: '0.78rem',
                }}>↻ Actualizar</button>
            </div>

            {filtrados.length === 0 ? (
                <div style={styles.vacio}>
                    {viajes.length === 0
                        ? 'No hay viajes finalizados registrados aún'
                        : 'Sin resultados para la búsqueda'}
                </div>
            ) : (
                filtrados.map(viaje => {
                    const exp = !!expandidos[viaje.viajeId];
                    const pax = viaje.pasajeros || [];
                    return (
                        <div key={viaje.viajeId} style={styles.card(exp)}>
                            <div style={styles.cardHeader} onClick={() => toggleExpand(viaje.viajeId)}>
                                <span style={styles.placa}>{viaje.busPlaca || '???'}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={styles.ruta}>
                                        {viaje.origen} → {viaje.destino}
                                    </div>
                                    <div style={styles.metaDato}>
                                        Salida {viaje.salida} · Finalizado {viaje.fecha} {viaje.hora}
                                    </div>
                                </div>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    background: '#22c55e18', border: '1px solid #22c55e30',
                                    borderRadius: 20, padding: '0.25rem 0.65rem',
                                    fontSize: '0.75rem', color: '#4ade80', fontWeight: 600,
                                }}>
                                    ✓ {viaje.totalPasajeros} pax
                                </div>
                                <span style={styles.chevron(exp)}>▼</span>
                            </div>

                            {exp && (
                                pax.length === 0 ? (
                                    <div style={{ padding: '1rem', color: '#334155', fontSize: '0.82rem', textAlign: 'center' }}>
                                        Sin pasajeros registrados
                                    </div>
                                ) : (
                                    <div style={styles.paxGrid}>
                                        {['Nombre', 'CI', 'Asiento', 'Estado'].map(h => (
                                            <div key={h} style={styles.paxTh}>{h}</div>
                                        ))}
                                        {pax.map((p, i) => (
                                            <React.Fragment key={i}>
                                                <div style={{ ...styles.paxTd, color: '#cbd5e1', fontWeight: 500 }}>
                                                    {p.nombre || '—'}
                                                </div>
                                                <div style={{ ...styles.paxTd, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                                    {p.ci || '—'}
                                                </div>
                                                <div style={{ ...styles.paxTd, textAlign: 'center', fontWeight: 700, color: tema.acento }}>
                                                    {p.asiento || '—'}
                                                </div>
                                                <div style={styles.paxTd}>
                                                    {p.abordado
                                                        ? <span style={{ color: '#4ade80', fontSize: '0.78rem' }}>✅ Abordó {p.horaAbordaje ? `· ${p.horaAbordaje}` : ''}</span>
                                                        : <span style={{ color: '#f87171', fontSize: '0.78rem' }}>✗ No llegó</span>
                                                    }
                                                </div>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                )
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
};

export default PasajerosFinalizados;
