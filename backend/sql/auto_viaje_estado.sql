-- ==============================================================================
-- Auto-estado de viajes por tiempo (pg_cron + función SQL)
-- Ejecutar en Supabase SQL Editor. Requiere pg_cron habilitado.
-- ==============================================================================

-- ── 1. Función que parsea "8h 30min" → INTERVAL ───────────────────────────────
CREATE OR REPLACE FUNCTION parse_duracion_estimada(texto TEXT)
RETURNS INTERVAL
LANGUAGE plpgsql
AS $$
DECLARE
    horas    INT := 0;
    minutos  INT := 0;
BEGIN
    -- Extraer horas: "8h" o "8 h"
    IF texto ~ '\d+\s*h' THEN
        horas := regexp_replace(texto, '.*?(\d+)\s*h.*', '\1')::INT;
    END IF;
    -- Extraer minutos: "30min" o "30 min"
    IF texto ~ '\d+\s*min' THEN
        minutos := regexp_replace(texto, '.*?(\d+)\s*min.*', '\1')::INT;
    END IF;
    RETURN make_interval(hours => horas, mins => minutos);
END;
$$;

-- ── 2. Función principal de auto-estado ──────────────────────────────────────
CREATE OR REPLACE FUNCTION auto_actualizar_estado_viajes()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    ahora TIMESTAMPTZ := NOW();
BEGIN
    -- Iniciar viajes cuya hora de salida ya pasó
    UPDATE viajes
    SET estado = 'en_viaje'
    WHERE estado IN ('programado', 'autorizado')
      AND fecha_salida <= ahora;

    -- Completar viajes cuya hora estimada de llegada ya pasó
    -- Solo si duracion_estimada está disponible y es válida
    UPDATE viajes
    SET estado = 'completado'
    WHERE estado = 'en_viaje'
      AND duracion_estimada IS NOT NULL
      AND duracion_estimada ~ '\d'  -- tiene al menos un dígito
      AND fecha_salida + parse_duracion_estimada(duracion_estimada) <= ahora;

    -- Completar viajes en_viaje sin duración conocida después de 24h (fallback)
    UPDATE viajes
    SET estado = 'completado'
    WHERE estado = 'en_viaje'
      AND (duracion_estimada IS NULL OR duracion_estimada = '')
      AND fecha_salida + INTERVAL '24 hours' <= ahora;
END;
$$;

-- ── 3. Programar con pg_cron cada minuto ─────────────────────────────────────
-- Requiere: CREATE EXTENSION IF NOT EXISTS pg_cron;
-- En Supabase: habilitar desde Dashboard > Database > Extensions > pg_cron

SELECT cron.schedule(
    'auto-estado-viajes',           -- nombre del job (único)
    '* * * * *',                    -- cada minuto
    'SELECT auto_actualizar_estado_viajes();'
);

-- ── Para verificar jobs activos ───────────────────────────────────────────────
-- SELECT * FROM cron.job;

-- ── Para eliminar el job si necesitas re-crearlo ──────────────────────────────
-- SELECT cron.unschedule('auto-estado-viajes');

-- ── Test manual ───────────────────────────────────────────────────────────────
-- SELECT auto_actualizar_estado_viajes();
-- SELECT parse_duracion_estimada('8h 30min');  -- → 08:30:00
-- SELECT parse_duracion_estimada('2h');         -- → 02:00:00
-- SELECT parse_duracion_estimada('45min');      -- → 00:45:00
