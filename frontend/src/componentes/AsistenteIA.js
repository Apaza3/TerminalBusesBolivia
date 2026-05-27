import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, RefreshCw } from 'lucide-react';
// Contexto IA: pending migración Supabase — stub temporal
const generarContextoIA = () => 'Sistema de terminal de buses Bolivia. Rutas nacionales. Información de viajes en tiempo real.';

/**
 * AsistenteIA — AI Scheduling & Logistics Consultant.
 * 
 * Two modes:
 * 1. Mock Mode (default): Intelligent local responses based on analytics data
 * 2. Gemini Mode: When REACT_APP_GEMINI_API_KEY is set in .env
 * 
 * Implements exponential backoff (1s, 2s, 4s, 8s, 16s) for API calls.
 */

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.5-flash-preview-04-17';
const MAX_RETRIES = 5;

const AsistenteIA = () => {
    const [mensajes, setMensajes] = useState([
        {
            rol: 'asistente',
            texto: '¡Hola! Soy el Consultor Inteligente del Terminal. Puedo ayudarte con:\n\n• 📊 Análisis de rutas más rentables\n• 🚌 Turnos extra para feriados\n• 🔧 Alertas de mantenimiento\n• 📈 Pronósticos de ingresos\n\n¿En qué puedo ayudarte?',
            timestamp: new Date(),
        }
    ]);
    const [input, setInput] = useState('');
    const [cargando, setCargando] = useState(false);
    const [modoIA, setModoIA] = useState(GEMINI_API_KEY ? 'gemini' : 'mock');
    const chatRef = useRef(null);

    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [mensajes]);

    // ── Exponential Backoff for Gemini API ───────────

    const llamarGeminiConBackoff = async (prompt, intento = 0) => {
        const delay = Math.pow(2, intento) * 1000; // 1s, 2s, 4s, 8s, 16s

        try {
            const contexto = generarContextoIA();
            const systemPrompt = `Eres un consultor experto en logística de terminales de buses en Bolivia. 
Contexto del terminal: ${contexto.resumen}
Rutas de alta demanda: ${contexto.rutasAltaDemanda.join(', ')}
Rutas de baja demanda: ${contexto.rutasBajaDemanda.join(', ')}
Horas pico: ${contexto.horasPico.join(', ')}
Buses con alertas: ${contexto.busesRequierenAtencion.map(b => `${b.placa} (${b.estado}, ${b.km}km)`).join(', ')}
KPIs: ${JSON.stringify(contexto.kpis)}
Responde en español, de forma concisa y profesional. Usa emojis para claridad.`;

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: `${systemPrompt}\n\nPregunta del gerente: ${prompt}` }] }],
                        generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
                    }),
                }
            );

            if (response.status === 429 || response.status >= 500) {
                if (intento < MAX_RETRIES) {
                    await new Promise(res => setTimeout(res, delay));
                    return llamarGeminiConBackoff(prompt, intento + 1);
                }
                throw new Error('Límite de reintentos alcanzado');
            }

            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No se pudo generar una respuesta.';
        } catch (error) {
            if (intento < MAX_RETRIES) {
                await new Promise(res => setTimeout(res, delay));
                return llamarGeminiConBackoff(prompt, intento + 1);
            }
            return `⚠️ Error de conexión con IA. Intenta de nuevo. (${error.message})`;
        }
    };

    // ── Mock Responses (intelligent local analysis) ──

    const generarRespuestaMock = (pregunta) => {
        const ctx = generarContextoIA();
        const q = pregunta.toLowerCase();

        if (q.includes('turno') || q.includes('extra') || q.includes('feriado') || q.includes('pico')) {
            return `📊 **Análisis de Turnos Extra:**\n\n🔥 Las horas pico detectadas son: **${ctx.horasPico.join(', ')}**\n\n🚌 Rutas que necesitan refuerzo:\n${ctx.rutasAltaDemanda.map(r => `• ${r} (demanda alta)`).join('\n')}\n\n💡 **Recomendación:** Programar 2-3 buses adicionales entre las 19:00-21:00 en las rutas La Paz → Santa Cruz y La Paz → Cochabamba. En feriados (Carnaval, Todos Santos) duplicar la frecuencia de salidas.`;
        }

        if (q.includes('mantenimiento') || q.includes('bus') || q.includes('alerta')) {
            const alertas = ctx.busesRequierenAtencion;
            return `🔧 **Alertas de Mantenimiento Predictivo:**\n\n${alertas.map(b => 
                `• **${b.placa}** — ${b.estado.toUpperCase()}\n  ${b.km.toLocaleString()} km, ${b.viajesDesde} viajes desde último servicio\n  ${b.estado === 'critico' ? '⚠️ Requiere atención INMEDIATA' : '🟡 Programar servicio esta semana'}`
            ).join('\n\n')}\n\n💡 **Recomendación:** Retirar ${alertas.filter(b => b.estado === 'critico').length} bus(es) críticos de servicio y programar mantenimiento preventivo para los de alerta.`;
        }

        if (q.includes('ingreso') || q.includes('revenue') || q.includes('ganancia') || q.includes('dinero') || q.includes('plata')) {
            return `💰 **Reporte de Ingresos:**\n\n📈 Ingresos mensuales: **Bs ${ctx.kpis.ingresosTotales.toLocaleString()}**\n🎫 Boletos vendidos: **${ctx.kpis.totalBoletos}**\n📊 Ocupación promedio: **${ctx.kpis.ocupacionPromedio}%**\n\n🏆 Rutas más rentables:\n${ctx.rutasAltaDemanda.map(r => `• ${r}`).join('\n')}\n\n💡 **Pronóstico:** Con la tendencia actual, se estima un crecimiento del 8-12% para el próximo mes, especialmente en rutas interprovinciales.`;
        }

        if (q.includes('ruta') || q.includes('demanda') || q.includes('ocupación') || q.includes('ocupacion')) {
            return `📊 **Análisis de Demanda:**\n\n🔥 **Alta demanda:**\n${ctx.rutasAltaDemanda.map(r => `• ${r}`).join('\n')}\n\n📉 **Baja demanda:**\n${ctx.rutasBajaDemanda.map(r => `• ${r}`).join('\n')}\n\n💡 **Recomendaciones:**\n1. Aumentar frecuencia en rutas de alta demanda\n2. Ofertar promociones en rutas de baja demanda\n3. Considerar precio dinámico según hora del día`;
        }

        if (q.includes('pronóstico') || q.includes('pronostico') || q.includes('futuro') || q.includes('predic')) {
            return `📈 **Pronóstico Operativo:**\n\n🗓️ **Próximo mes:**\n• Ingresos estimados: **Bs ${Math.round(ctx.kpis.ingresosTotales * 1.1).toLocaleString()}** (+10%)\n• Boletos proyectados: **${Math.round(ctx.kpis.totalBoletos * 1.08)}**\n• Rutas a reforzar: ${ctx.rutasAltaDemanda[0]}\n\n🔮 **Temporada alta (Jun-Ago):**\n• Se espera aumento del 25-35% en tráfico\n• Recomendación: preparar ${Math.ceil(ctx.kpis.busesEnServicio * 0.3)} buses de reserva\n• Contratar tripulación temporal para período vacacional`;
        }

        // Default intelligent response
        return `📋 **Resumen del Terminal:**\n\n• ${ctx.kpis.rutasActivas} rutas activas\n• ${ctx.kpis.busesEnServicio} buses en servicio\n• ${ctx.kpis.salidasDiarias} salidas diarias\n• Bs ${ctx.kpis.ingresosTotales.toLocaleString()} ingresos mensuales\n• ${ctx.kpis.ocupacionPromedio}% ocupación promedio\n\n¿Sobre qué aspecto te gustaría profundizar? Puedo analizar:\n• 🕐 Turnos extra y horas pico\n• 🔧 Mantenimiento de flota\n• 💰 Ingresos y rentabilidad\n• 📊 Demanda por ruta\n• 📈 Pronósticos operativos`;
    };

    // ── Send Message Handler ─────────────────────────

    const enviarMensaje = async () => {
        if (!input.trim() || cargando) return;

        const pregunta = input.trim();
        setInput('');
        setMensajes(prev => [...prev, { rol: 'usuario', texto: pregunta, timestamp: new Date() }]);
        setCargando(true);

        let respuesta;
        if (modoIA === 'gemini' && GEMINI_API_KEY) {
            respuesta = await llamarGeminiConBackoff(pregunta);
        } else {
            // Simulate thinking delay for realism
            await new Promise(res => setTimeout(res, 800 + Math.random() * 600));
            respuesta = generarRespuestaMock(pregunta);
        }

        setMensajes(prev => [...prev, { rol: 'asistente', texto: respuesta, timestamp: new Date() }]);
        setCargando(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            enviarMensaje();
        }
    };

    // ── Quick Actions ────────────────────────────────

    const preguntasRapidas = [
        { texto: '¿Necesito turnos extra?', icono: '🚌' },
        { texto: '¿Qué buses necesitan mantenimiento?', icono: '🔧' },
        { texto: 'Pronóstico de ingresos', icono: '📈' },
        { texto: 'Análisis de ocupación', icono: '📊' },
    ];

    return (
        <div style={{
            background: '#1e293b', borderRadius: '14px', border: '1px solid #334155',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                padding: '1rem 1.25rem', borderBottom: '1px solid #334155',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Bot size={20} color="white" />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#f1f5f9' }}>
                            Consultor de Terminal
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span style={{
                                width: '6px', height: '6px', borderRadius: '50%',
                                background: modoIA === 'gemini' ? '#10b981' : '#f59e0b',
                            }} />
                            <span style={{ color: '#64748b', fontSize: '0.65rem' }}>
                                {modoIA === 'gemini' ? 'Gemini AI' : 'Modo Análisis Local'}
                            </span>
                        </div>
                    </div>
                </div>
                <button onClick={() => setModoIA(m => m === 'gemini' && GEMINI_API_KEY ? 'mock' : (GEMINI_API_KEY ? 'gemini' : 'mock'))}
                    title="Cambiar modo"
                    style={{
                        background: 'transparent', border: '1px solid #334155', borderRadius: '8px',
                        padding: '0.3rem', cursor: 'pointer', color: '#64748b',
                    }}>
                    <RefreshCw size={14} />
                </button>
            </div>

            {/* Chat Messages */}
            <div ref={chatRef} style={{
                height: '320px', overflowY: 'auto', padding: '1rem',
                display: 'flex', flexDirection: 'column', gap: '0.75rem',
            }}>
                {mensajes.map((msg, i) => (
                    <div key={i} style={{
                        display: 'flex', justifyContent: msg.rol === 'usuario' ? 'flex-end' : 'flex-start',
                    }}>
                        <div style={{
                            maxWidth: '85%', padding: '0.75rem 1rem', borderRadius: '12px',
                            background: msg.rol === 'usuario'
                                ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                                : '#0f172a',
                            color: '#f1f5f9', fontSize: '0.82rem', lineHeight: 1.5,
                            border: msg.rol === 'asistente' ? '1px solid #1e293b' : 'none',
                            whiteSpace: 'pre-wrap',
                        }}>
                            {msg.texto}
                        </div>
                    </div>
                ))}

                {cargando && (
                    <div style={{ display: 'flex', gap: '0.4rem', padding: '0.5rem' }}>
                        {[0, 1, 2].map(i => (
                            <div key={i} style={{
                                width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6',
                                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                                opacity: 0.5,
                            }} />
                        ))}
                        <style>{`@keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }`}</style>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            {mensajes.length <= 2 && (
                <div style={{
                    padding: '0 1rem 0.75rem', display: 'flex', gap: '0.4rem',
                    overflowX: 'auto', flexWrap: 'nowrap',
                }}>
                    {preguntasRapidas.map((p, i) => (
                        <button key={i} onClick={() => { setInput(p.texto); }}
                            style={{
                                padding: '0.4rem 0.75rem', borderRadius: '20px',
                                border: '1px solid #334155', background: '#0f172a',
                                color: '#94a3b8', cursor: 'pointer', fontSize: '0.72rem',
                                whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem',
                            }}>
                            {p.icono} {p.texto}
                        </button>
                    ))}
                </div>
            )}

            {/* Input */}
            <div style={{
                padding: '0.75rem 1rem', borderTop: '1px solid #334155',
                display: 'flex', gap: '0.5rem', alignItems: 'center',
            }}>
                <input
                    type="text" value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Pregunta al consultor..."
                    disabled={cargando}
                    style={{
                        flex: 1, background: '#0f172a', border: '1px solid #334155',
                        color: '#f1f5f9', padding: '0.7rem 1rem', borderRadius: '10px',
                        fontSize: '0.85rem', outline: 'none',
                    }}
                />
                <button onClick={enviarMensaje} disabled={cargando || !input.trim()}
                    style={{
                        width: '42px', height: '42px', borderRadius: '10px',
                        background: input.trim() ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : '#1e293b',
                        border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    {cargando ? <Sparkles size={18} color="#f59e0b" /> : <Send size={18} color="white" />}
                </button>
            </div>
        </div>
    );
};

export default AsistenteIA;
