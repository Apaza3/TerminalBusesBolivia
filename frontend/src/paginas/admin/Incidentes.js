import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contextos/AuthContext';
import { DEPARTAMENTOS } from '../../contextos/DepartamentoContext';
import { getIncidenciasSucursal } from '../../servicios/api';

const TIPOS_COLOR = {
    retraso:    { bg: '#f59e0b20', border: '#f59e0b40', text: '#fbbf24', label: 'Retraso' },
    accidente:  { bg: '#ef444420', border: '#ef444440', text: '#f87171', label: 'Accidente' },
    mecanico:   { bg: '#8b5cf620', border: '#8b5cf640', text: '#a78bfa', label: 'Mecánico' },
    otro:       { bg: '#64748b20', border: '#64748b40', text: '#94a3b8', label: 'Otro' },
};

const Incidentes = () => {
    const { perfil } = useAuth();
    const deptNombre = perfil?.departamento || 'La Paz';
    const tema = DEPARTAMENTOS[deptNombre] || DEPARTAMENTOS['La Paz'];

    const [incidentes, setIncidentes] = useState([]);
    const [filtroTipo, setFiltroTipo] = useState('todos');
    const [busqueda, setBusqueda] = useState('');

    const cargar = useCallback(() => {
        if (!perfil?.sucursal_id) { setIncidentes([]); return; }
        getIncidenciasSucursal(perfil.sucursal_id).then(setIncidentes);
    }, [perfil?.sucursal_id]);

    useEffect(() => { cargar(); }, [cargar]);

    const filtrados = incidentes.filter(inc => {
        if (filtroTipo !== 'todos' && inc.tipo !== filtroTipo) return false;
        if (busqueda) {
            const q = busqueda.toLowerCase();
            return inc.busPlaca?.toLowerCase().includes(q) ||
                   inc.conductor?.toLowerCase().includes(q) ||
                   inc.origen?.toLowerCase().includes(q) ||
                   inc.destino?.toLowerCase().includes(q) ||
                   inc.descripcion?.toLowerCase().includes(q);
        }
        return true;
    });

    const styles = {
        page: { padding: '2rem', maxWidth: 1000, margin: '0 auto' },
        header: { marginBottom: '1.5rem' },
        titulo: { fontSize: '1.45rem', fontWeight: 700, color: '#e2e8f0', margin: 0 },
        subtitulo: { fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' },
        controles: {
            display: 'flex', gap: '0.75rem', marginBottom: '1.25rem',
            flexWrap: 'wrap', alignItems: 'center',
        },
        input: {
            flex: 1, minWidth: 200, padding: '0.5rem 0.85rem',
            background: '#0f1e35', border: `1px solid ${tema.color}30`,
            borderRadius: 8, color: '#e2e8f0', fontSize: '0.84rem', outline: 'none',
        },
        filtroBtn: (activo) => ({
            padding: '0.4rem 0.9rem', borderRadius: 20,
            border: `1px solid ${activo ? tema.color : '#1e293b'}`,
            background: activo ? `${tema.color}20` : 'transparent',
            color: activo ? tema.acento : '#64748b',
            cursor: 'pointer', fontSize: '0.78rem', fontWeight: activo ? 600 : 400,
            transition: 'all 0.15s',
        }),
        tabla: {
            width: '100%', borderCollapse: 'collapse',
            background: '#0b1628', borderRadius: 12, overflow: 'hidden',
            border: `1px solid ${tema.color}15`,
        },
        th: {
            padding: '0.7rem 1rem', textAlign: 'left',
            fontSize: '0.7rem', color: '#475569',
            letterSpacing: '0.05em', textTransform: 'uppercase',
            borderBottom: `1px solid ${tema.color}15`,
            background: `${tema.color}08`,
        },
        td: {
            padding: '0.75rem 1rem', fontSize: '0.83rem',
            color: '#cbd5e1', borderBottom: '1px solid #0f1e3520',
        },
        badge: (tipo) => {
            const c = TIPOS_COLOR[tipo] || TIPOS_COLOR.otro;
            return {
                display: 'inline-block', padding: '0.2rem 0.6rem',
                borderRadius: 12, fontSize: '0.72rem', fontWeight: 600,
                background: c.bg, border: `1px solid ${c.border}`, color: c.text,
            };
        },
        vacio: {
            textAlign: 'center', padding: '3rem 1rem',
            color: '#334155', fontSize: '0.9rem',
        },
        totalBadge: {
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.3rem 0.75rem', borderRadius: 20,
            background: `${tema.color}15`, border: `1px solid ${tema.color}30`,
            color: tema.acento, fontSize: '0.78rem', fontWeight: 600,
        },
    };

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <h1 style={styles.titulo}>⚠️ Incidentes</h1>
                <p style={styles.subtitulo}>Reportes de la tripulación · {perfil?.sucursal_nombre}</p>
            </div>

            <div style={styles.controles}>
                <input
                    style={styles.input}
                    placeholder="Buscar por bus, conductor, ruta..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                />
                {['todos', 'retraso', 'accidente', 'mecanico', 'otro'].map(t => (
                    <button key={t} style={styles.filtroBtn(filtroTipo === t)} onClick={() => setFiltroTipo(t)}>
                        {t === 'todos' ? 'Todos' : (TIPOS_COLOR[t]?.label || t)}
                    </button>
                ))}
                <div style={styles.totalBadge}>
                    {filtrados.length} registro{filtrados.length !== 1 ? 's' : ''}
                </div>
                <button onClick={cargar} style={{
                    padding: '0.4rem 0.9rem', borderRadius: 8,
                    border: `1px solid ${tema.color}30`, background: 'transparent',
                    color: tema.acento, cursor: 'pointer', fontSize: '0.78rem',
                }}>↻ Actualizar</button>
            </div>

            {filtrados.length === 0 ? (
                <div style={styles.vacio}>
                    {incidentes.length === 0
                        ? 'No hay incidentes registrados'
                        : 'Sin resultados para el filtro actual'}
                </div>
            ) : (
                <table style={styles.tabla}>
                    <thead>
                        <tr>
                            {['Fecha', 'Hora', 'Tipo', 'Bus / Placa', 'Ruta', 'Conductor', 'Descripción'].map(h => (
                                <th key={h} style={styles.th}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtrados.map((inc, i) => (
                            <tr key={inc.id}
                                style={{ background: i % 2 === 0 ? 'transparent' : `${tema.color}04` }}>
                                <td style={styles.td}>{inc.fecha}</td>
                                <td style={{ ...styles.td, fontVariantNumeric: 'tabular-nums', color: tema.acento, fontWeight: 600 }}>
                                    {inc.hora}
                                </td>
                                <td style={styles.td}>
                                    <span style={styles.badge(inc.tipo)}>
                                        {TIPOS_COLOR[inc.tipo]?.label || inc.tipo}
                                    </span>
                                </td>
                                <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: '0.81rem', color: '#94a3b8' }}>
                                    {inc.busPlaca || '—'}
                                </td>
                                <td style={styles.td}>
                                    {inc.origen && inc.destino
                                        ? <span>{inc.origen} → {inc.destino}</span>
                                        : '—'}
                                    {inc.salida && <span style={{ display: 'block', fontSize: '0.7rem', color: '#475569' }}>Salida: {inc.salida}</span>}
                                </td>
                                <td style={styles.td}>
                                    <div>{inc.conductor || '—'}</div>
                                    {inc.ayudante && <div style={{ fontSize: '0.7rem', color: '#475569' }}>Ayud: {inc.ayudante}</div>}
                                </td>
                                <td style={{ ...styles.td, maxWidth: 240 }}>
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                         title={inc.descripcion}>
                                        {inc.descripcion || '—'}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default Incidentes;
