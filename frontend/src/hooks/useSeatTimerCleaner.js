import { useEffect } from 'react';

/**
 * useSeatTimerCleaner
 * Seat expiry is handled server-side via Supabase `bloqueado_hasta` timestamp.
 * This hook is a no-op kept for API compatibility.
 */
const useSeatTimerCleaner = (intervaloMs = 30000, onLiberados = null) => { // eslint-disable-line no-unused-vars
    useEffect(() => {}, []);
};

export default useSeatTimerCleaner;
