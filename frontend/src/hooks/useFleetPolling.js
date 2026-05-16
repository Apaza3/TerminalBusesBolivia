import { useEffect, useCallback, useRef } from 'react';

/**
 * Hook de polling genérico. Llama fetchFn cada intervaloMs y notifica via onUpdate.
 * Cleanup automático al desmontar.
 * @param {Function} fetchFn      - función async que retorna datos
 * @param {Function} onUpdate     - callback(data) cuando llegan datos
 * @param {number}   intervaloMs  - intervalo en ms (default 10000)
 * @param {boolean}  activo       - pausa el polling si es false
 */
const useFleetPolling = (fetchFn, onUpdate, intervaloMs = 10000, activo = true) => {
    const onUpdateRef = useRef(onUpdate);
    const fetchRef    = useRef(fetchFn);

    useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);
    useEffect(() => { fetchRef.current    = fetchFn;   }, [fetchFn]);

    const ejecutar = useCallback(async () => {
        try {
            const data = await fetchRef.current();
            onUpdateRef.current(data);
        } catch (err) {
            console.error('useFleetPolling - error:', err);
        }
    }, []);

    useEffect(() => {
        if (!activo) return;
        ejecutar();
        const timer = setInterval(ejecutar, intervaloMs);
        return () => clearInterval(timer);
    }, [activo, intervaloMs, ejecutar]);
};

export default useFleetPolling;
