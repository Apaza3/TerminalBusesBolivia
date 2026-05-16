// [Académico] Sprint 4 - Cola de notificaciones en tiempo real (R18, R26)
import { useState, useCallback, useRef } from 'react';

const DURACION_DEFAULT_MS = 5000;

const useNotifications = () => {
    const [notificaciones, setNotificaciones] = useState([]);
    const counterRef = useRef(0);
    const timeoutsRef = useRef({});

    const agregar = useCallback((mensaje, tipo = 'info', duracion = DURACION_DEFAULT_MS) => {
        const id = `notif_${Date.now()}_${counterRef.current++}`;
        setNotificaciones(prev => [...prev.slice(-4), { id, mensaje, tipo, timestamp: Date.now() }]);

        timeoutsRef.current[id] = setTimeout(() => {
            setNotificaciones(prev => prev.filter(n => n.id !== id));
            delete timeoutsRef.current[id];
        }, duracion);

        return id;
    }, []);

    const eliminar = useCallback((id) => {
        clearTimeout(timeoutsRef.current[id]);
        delete timeoutsRef.current[id];
        setNotificaciones(prev => prev.filter(n => n.id !== id));
    }, []);

    const limpiar = useCallback(() => {
        Object.values(timeoutsRef.current).forEach(clearTimeout);
        timeoutsRef.current = {};
        setNotificaciones([]);
    }, []);

    return { notificaciones, agregar, eliminar, limpiar };
};

export default useNotifications;
