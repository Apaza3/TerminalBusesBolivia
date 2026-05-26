import React, { useState, useEffect } from 'react';

const RelojDigital = ({ size = 'normal' }) => {
    const [hora, setHora] = useState(new Date());
    useEffect(() => {
        const id = setInterval(() => setHora(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    const pad = n => String(n).padStart(2, '0');
    const h = pad(hora.getHours());
    const m = pad(hora.getMinutes());
    const s = pad(hora.getSeconds());
    const large = size === 'large';
    return (
        <div style={{
            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
            fontSize: large ? '1.55rem' : '1.35rem',
            fontWeight: 800, letterSpacing: '0.06em',
            color: '#dde5f0', lineHeight: 1,
            display: 'flex', alignItems: 'center', gap: '0.08em',
            userSelect: 'none',
        }}>
            <span>{h}</span>
            <span style={{ color: '#3b82f6', animation: 'tbbBlink 1s step-start infinite' }}>:</span>
            <span>{m}</span>
            <span style={{ color: '#3b82f6', animation: 'tbbBlink 1s step-start infinite' }}>:</span>
            <span style={{ fontSize: large ? '1.15rem' : '1rem', color: '#64748b' }}>{s}</span>
            <style>{`@keyframes tbbBlink { 50% { opacity: 0.25; } }`}</style>
        </div>
    );
};

export default RelojDigital;
