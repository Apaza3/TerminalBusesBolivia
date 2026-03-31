import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../servicios/supabase';

// ============================================================
// ModalPasajero — Passenger data capture after seat lock
// Props:
//   asientosIds  - Array of locked seat IDs
//   asientos     - Array of full seat objects (for display)
//   esModoDemo   - Boolean, skips Supabase calls when true
//   onCerrar     - Callback to close modal without confirming
//   onConfirmado - Callback after successful data save
// ============================================================
const ModalPasajero = ({ asientosIds, asientos, esModoDemo, onCerrar, onConfirmado }) => {
    // One passenger entry per seat
    const [pasajeros, setPasajeros] = useState(
        asientosIds.map(id => ({
            asientoId: id,
            ci: '',
            nombre: '',
            fecha_nacimiento: '',
            telefono: '',
            cargandoCI: false,
            ciFounded: false, // true if CI was found and auto-filled
        }))
    );
    const [guardando, setGuardando] = useState(false);
    const [errores, setErrores] = useState({});
    const primerInputRef = useRef(null);

    // Focus first CI field on mount
    useEffect(() => {
        primerInputRef.current?.focus();
    }, []);

    // ============================================================
    // CI AUTO-FILL — Lazy user lookup in `usuarios` table
    // ============================================================
    const buscarPorCI = async (index, ci) => {
        if (ci.length < 4 || esModoDemo) return;

        setPasajeros(prev =>
            prev.map((p, i) => i === index ? { ...p, cargandoCI: true } : p)
        );

        try {
            const { data, error } = await supabase
                .from('usuarios')
                .select('nombre, fecha_nacimiento, telefono')
                .eq('ci', ci.trim())
                .maybeSingle(); // Returns null (not error) if not found

            if (!error && data) {
                setPasajeros(prev =>
                    prev.map((p, i) =>
                        i === index
                            ? {
                                ...p,
                                nombre: data.nombre || '',
                                fecha_nacimiento: data.fecha_nacimiento || '',
                                telefono: data.telefono || '',
                                cargandoCI: false,
                                ciFounded: true,
                            }
                            : p
                    )
                );
            } else {
                // Not found — allow manual entry without error
                setPasajeros(prev =>
                    prev.map((p, i) =>
                        i === index ? { ...p, cargandoCI: false, ciFounded: false } : p
                    )
                );
            }
        } catch (err) {
            console.error('ModalPasajero - Error buscando CI:', err);
            setPasajeros(prev =>
                prev.map((p, i) =>
                    i === index ? { ...p, cargandoCI: false, ciFounded: false } : p
                )
            );
        }
    };

    const handleCambioCI = (index, valor) => {
        setPasajeros(prev =>
            prev.map((p, i) =>
                i === index
                    ? { ...p, ci: valor, ciFounded: false, nombre: p.ciFounded ? '' : p.nombre }
                    : p
            )
        );
    };

    const handleCampo = (index, campo, valor) => {
        setPasajeros(prev =>
            prev.map((p, i) =>
                i === index ? { ...p, [campo]: valor } : p
            )
        );
        // Clear validation error for this field
        setErrores(prev => {
            const nuevos = { ...prev };
            delete nuevos[`${index}-${campo}`];
            return nuevos;
        });
    };

    // ============================================================
    // VALIDATION
    // ============================================================
    const validar = () => {
        const nuevosErrores = {};
        pasajeros.forEach((p, i) => {
            if (!p.nombre.trim()) {
                nuevosErrores[`${i}-nombre`] = 'El nombre es requerido';
            }
            if (!p.ci.trim()) {
                nuevosErrores[`${i}-ci`] = 'El CI es requerido';
            }
        });
        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    };

    // ============================================================
    // SAVE — Stores passenger data in asientos_viaje.datos_pasajero (JSONB)
    // ============================================================
    const guardarDatos = async () => {
        if (!validar()) return;

        setGuardando(true);

        if (esModoDemo) {
            // Demo mode: just simulate success
            setTimeout(() => {
                setGuardando(false);
                onConfirmado();
            }, 800);
            return;
        }

        try {
            const updates = pasajeros.map(p => ({
                id: p.asientoId,
                datos_pasajero: {
                    ci: p.ci.trim(),
                    nombre: p.nombre.trim(),
                    fecha_nacimiento: p.fecha_nacimiento || null,
                    telefono: p.telefono.trim() || null,
                },
            }));

            // Upsert each seat's passenger data individually
            for (const update of updates) {
                const { error } = await supabase
                    .from('asientos_viaje')
                    .update({ datos_pasajero: update.datos_pasajero })
                    .eq('id', update.id);
                if (error) throw error;
            }

            onConfirmado();
        } catch (err) {
            console.error('ModalPasajero - Error guardando datos:', err);
            setErrores({ general: 'Error al guardar los datos. Por favor, intente nuevamente.' });
        } finally {
            setGuardando(false);
        }
    };

    // ============================================================
    // RENDER
    // ============================================================
    return (
        <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-titulo"
            onClick={(e) => e.target === e.currentTarget && onCerrar()}
        >
            <div className="modal-contenido">
                {/* Header */}
                <div className="modal-header">
                    <h2 className="modal-titulo" id="modal-titulo">
                        👥 Datos de Pasajeros
                    </h2>
                    <button
                        className="modal-btn-cerrar"
                        onClick={onCerrar}
                        aria-label="Cerrar modal"
                        id="btn-cerrar-modal"
                    >
                        ✕
                    </button>
                </div>

                <p className="modal-descripcion">
                    Completá los datos para cada asiento. Si el CI ya existe, los campos se llenan automáticamente.
                </p>

                {/* Error general */}
                {errores.general && (
                    <div className="modal-error-general" role="alert">
                        ⚠️ {errores.general}
                    </div>
                )}

                {/* One form per seat */}
                <div className="modal-pasajeros-lista">
                    {pasajeros.map((pasajero, index) => {
                        const asiento = asientos.find(a => a.id === pasajero.asientoId);
                        return (
                            <div key={pasajero.asientoId} className="pasajero-seccion">
                                <div className="pasajero-titulo">
                                    💺 Asiento <strong>{asiento?.numero_asiento || index + 1}</strong>
                                </div>

                                <div className="pasajero-campos">
                                    {/* CI Field with auto-fill */}
                                    <div className="campo-grupo">
                                        <label
                                            htmlFor={`ci-${index}`}
                                            className="campo-label"
                                        >
                                            CI (Cédula de Identidad)
                                        </label>
                                        <div className="campo-ci-wrapper">
                                            <input
                                                id={`ci-${index}`}
                                                type="text"
                                                className={`campo-input ${errores[`${index}-ci`] ? 'campo-error' : ''}`}
                                                value={pasajero.ci}
                                                onChange={e => handleCambioCI(index, e.target.value)}
                                                onBlur={e => buscarPorCI(index, e.target.value)}
                                                placeholder="Ej: 12345678"
                                                ref={index === 0 ? primerInputRef : null}
                                                maxLength={15}
                                                aria-describedby={errores[`${index}-ci`] ? `error-ci-${index}` : undefined}
                                            />
                                            {pasajero.cargandoCI && (
                                                <span className="ci-spinner" aria-live="polite">⌛</span>
                                            )}
                                            {pasajero.ciFounded && (
                                                <span className="ci-encontrado" aria-live="polite">✅</span>
                                            )}
                                        </div>
                                        {errores[`${index}-ci`] && (
                                            <span id={`error-ci-${index}`} className="campo-error-msg">
                                                {errores[`${index}-ci`]}
                                            </span>
                                        )}
                                    </div>

                                    {/* Nombre */}
                                    <div className="campo-grupo">
                                        <label htmlFor={`nombre-${index}`} className="campo-label">
                                            Nombre Completo *
                                        </label>
                                        <input
                                            id={`nombre-${index}`}
                                            type="text"
                                            className={`campo-input ${errores[`${index}-nombre`] ? 'campo-error' : ''} ${pasajero.ciFounded ? 'campo-autollenado' : ''}`}
                                            value={pasajero.nombre}
                                            onChange={e => handleCampo(index, 'nombre', e.target.value)}
                                            placeholder="Nombre y apellidos"
                                        />
                                        {errores[`${index}-nombre`] && (
                                            <span className="campo-error-msg">{errores[`${index}-nombre`]}</span>
                                        )}
                                    </div>

                                    {/* Fecha de Nacimiento */}
                                    <div className="campo-grupo">
                                        <label htmlFor={`fecha-${index}`} className="campo-label">
                                            Fecha de Nacimiento
                                        </label>
                                        <input
                                            id={`fecha-${index}`}
                                            type="date"
                                            className={`campo-input ${pasajero.ciFounded ? 'campo-autollenado' : ''}`}
                                            value={pasajero.fecha_nacimiento}
                                            onChange={e => handleCampo(index, 'fecha_nacimiento', e.target.value)}
                                        />
                                    </div>

                                    {/* Teléfono */}
                                    <div className="campo-grupo">
                                        <label htmlFor={`tel-${index}`} className="campo-label">
                                            Teléfono
                                        </label>
                                        <input
                                            id={`tel-${index}`}
                                            type="tel"
                                            className={`campo-input ${pasajero.ciFounded ? 'campo-autollenado' : ''}`}
                                            value={pasajero.telefono}
                                            onChange={e => handleCampo(index, 'telefono', e.target.value)}
                                            placeholder="Ej: 70012345"
                                            maxLength={10}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer actions */}
                <div className="modal-footer">
                    <button
                        className="btn-modal-cancelar"
                        onClick={onCerrar}
                        id="btn-modal-cancelar"
                        disabled={guardando}
                    >
                        Cancelar
                    </button>
                    <button
                        className="btn-modal-confirmar"
                        onClick={guardarDatos}
                        disabled={guardando}
                        id="btn-modal-confirmar"
                    >
                        {guardando ? '⌛ Guardando...' : '✅ Confirmar Reserva'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalPasajero;
