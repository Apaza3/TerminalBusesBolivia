// [Académico] Sprint 4 - Hook WebSocket con reconexión exponencial y fallback polling
import { useEffect, useRef, useState, useCallback } from 'react';
import { USE_MOCK_DATA } from '../config';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:4000';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const POLL_INTERVAL_MS = 5000;

const useWebSocket = (canales = [], onMessage) => {
    const wsRef = useRef(null);
    const retriesRef = useRef(0);
    const pollRef = useRef(null);
    const onMessageRef = useRef(onMessage);
    const [isRealtime, setIsRealtime] = useState(false);
    const [conectado, setConectado] = useState(false);

    // Keep callback ref fresh without re-triggering effects
    useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);

    const iniciarPolling = useCallback(() => {
        if (pollRef.current) return;
        pollRef.current = setInterval(() => {
            onMessageRef.current?.({ tipo: 'poll_tick', timestamp: Date.now() });
        }, POLL_INTERVAL_MS);
    }, []);

    const conectar = useCallback(() => {
        if (USE_MOCK_DATA) {
            iniciarPolling();
            return;
        }
        try {
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                retriesRef.current = 0;
                setConectado(true);
                setIsRealtime(true);
                canales.forEach(canal => {
                    ws.send(JSON.stringify({ tipo: 'subscribe', canal }));
                });
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    onMessageRef.current?.(data);
                } catch {}
            };

            ws.onclose = () => {
                setConectado(false);
                setIsRealtime(false);
                if (retriesRef.current < MAX_RETRIES) {
                    const delay = BASE_DELAY_MS * Math.pow(2, retriesRef.current);
                    retriesRef.current++;
                    setTimeout(conectar, delay);
                } else {
                    // Fallback silencioso a polling
                    iniciarPolling();
                }
            };

            ws.onerror = () => ws.close();
        } catch {
            iniciarPolling();
        }
    // eslint-disable-next-line
    }, [iniciarPolling]);

    const emit = useCallback((tipo, payload) => {
        if (USE_MOCK_DATA) {
            // Simular emit — propaga como mensaje local para que MonitoreoFlota lo reciba
            setTimeout(() => {
                onMessageRef.current?.({ tipo, payload, origen: 'local', timestamp: Date.now() });
            }, 0);
            return true;
        }
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ tipo, payload }));
            return true;
        }
        return false;
    }, []);

    useEffect(() => {
        conectar();
        return () => {
            wsRef.current?.close();
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [conectar]);

    return { emit, isRealtime, conectado };
};

export default useWebSocket;
