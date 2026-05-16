import { useState, useCallback, useRef } from 'react';
import { verificarSOATVigente, verificarInspeccionVigente, validarSolapamientoItinerario } from '../utilidades/fleetValidators';
import { listarItinerarios } from '../servicios/fleetService';

/**
 * Hook para validar un itinerario candidato: SOAT/inspección + solapamiento.
 * @param {object} bus - objeto bus con soat_vence, inspeccion_vence
 */
const useItineraryValidation = (bus = null) => {
    const [verificando, setVerificando] = useState(false);
    const [errores,     setErrores]     = useState([]);
    const [advertencias,setAdvertencias]= useState([]);
    const debounceRef = useRef(null);

    const validar = useCallback(async ({ busId, conductorId, salida, duracionMin, excluirId = null } = {}) => {
        if (!salida) { setErrores([]); setAdvertencias([]); return { valido: true }; }

        setVerificando(true);

        const errs  = [];
        const warns = [];

        // SOAT/inspección del bus en memoria si se pasó
        if (bus) {
            const soat = verificarSOATVigente(bus.soat_vence, salida.split('T')[0]);
            if (!soat.valido) errs.push(soat.error);
            else if (soat.advertencia) warns.push(soat.advertencia);

            const insp = verificarInspeccionVigente(bus.inspeccion_vence, salida.split('T')[0]);
            if (!insp.valido) errs.push(insp.error);
            else if (insp.advertencia) warns.push(insp.advertencia);
        }

        // Solapamiento (carga itinerarios existentes)
        if (busId && duracionMin) {
            try {
                const existentes = await listarItinerarios({ bus_id: busId });
                const condExistentes = conductorId ? await listarItinerarios({ conductor_id: conductorId }) : [];
                const todos = [...new Map([...existentes, ...condExistentes].map(it => [it.id, it])).values()];

                const solapaResult = validarSolapamientoItinerario(todos, busId, conductorId, salida, duracionMin, excluirId);
                if (!solapaResult.valido) errs.push(solapaResult.error);
            } catch {
                warns.push('No se pudo verificar solapamiento online. Verifica manualmente.');
            }
        }

        setErrores(errs);
        setAdvertencias(warns);
        setVerificando(false);
        return { valido: errs.length === 0, errores: errs, advertencias: warns };
    }, [bus]);

    const validarDebounced = useCallback((params) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => validar(params), 400);
    }, [validar]);

    return { verificando, errores, advertencias, validar, validarDebounced };
};

export default useItineraryValidation;
