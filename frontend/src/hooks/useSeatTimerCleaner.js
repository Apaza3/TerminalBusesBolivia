import { useEffect, useCallback } from 'react';
import { liberarAsientosExpirados } from '../data/mockStorage';

/**
 * useSeatTimerCleaner
 * Background service that periodically checks for expired pending seats
 * and releases them back to "available" status.
 * 
 * @param {number} intervaloMs - Check interval in milliseconds (default: 30s)
 * @param {function} onLiberados - Callback when seats are freed (receives array of freed seats)
 */
const useSeatTimerCleaner = (intervaloMs = 30000, onLiberados = null) => {
    
    const limpiar = useCallback(() => {
        const { liberados } = liberarAsientosExpirados();
        
        if (liberados.length > 0) {
            console.log(`[SeatTimerCleaner] Liberados ${liberados.length} asiento(s) expirado(s):`, 
                liberados.map(l => `${l.asiento} (viaje: ${l.viajeId})`));
            
            if (onLiberados) {
                onLiberados(liberados);
            }
        }
    }, [onLiberados]);

    useEffect(() => {
        // Run immediately on mount
        limpiar();
        
        // Set up periodic check
        const timer = setInterval(limpiar, intervaloMs);
        
        return () => clearInterval(timer);
    }, [limpiar, intervaloMs]);
};

export default useSeatTimerCleaner;
