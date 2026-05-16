-- Sprint 2 Fleet Planning — Migración incremental
-- Aplica sobre schema_v3 ya existente. Usa IF NOT EXISTS / DO $$ para seguridad.
-- Ejecutar via Supabase Dashboard > SQL Editor.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Columnas faltantes en sucursales
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS activa        BOOLEAN      DEFAULT TRUE;
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS logo_emoji    TEXT         DEFAULT '🚌';
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS color_accent  TEXT         DEFAULT '#3b82f6';
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS descripcion   TEXT;
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS direccion     TEXT;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Columnas faltantes en rutas
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE rutas ADD COLUMN IF NOT EXISTS activa BOOLEAN DEFAULT TRUE;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. paradas_ruta — asegurar columnas necesarias
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS paradas_ruta (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ruta_id         UUID        NOT NULL REFERENCES rutas(id) ON DELETE CASCADE,
    nombre          TEXT        NOT NULL,
    orden           INTEGER     NOT NULL DEFAULT 1,
    distancia_km    NUMERIC(8,2) DEFAULT 0,
    tiempo_min      INTEGER     DEFAULT 0,
    creado_en       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE paradas_ruta ADD COLUMN IF NOT EXISTS distancia_km NUMERIC(8,2) DEFAULT 0;
ALTER TABLE paradas_ruta ADD COLUMN IF NOT EXISTS tiempo_min   INTEGER      DEFAULT 0;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Índices de rendimiento para itinerarios
-- ──────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_itinerarios_bus_fecha       ON itinerarios(bus_id,       salida_programada);
CREATE INDEX IF NOT EXISTS idx_itinerarios_conductor_fecha ON itinerarios(conductor_id, salida_programada);
CREATE INDEX IF NOT EXISTS idx_itinerarios_ruta_fecha      ON itinerarios(ruta_id,      salida_programada);
CREATE INDEX IF NOT EXISTS idx_itinerarios_estado          ON itinerarios(estado);
CREATE INDEX IF NOT EXISTS idx_paradas_ruta_ruta_id        ON paradas_ruta(ruta_id, orden);

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Función y trigger: validar documentos del bus antes de programar itinerario
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION validar_documentos_bus_itinerario()
RETURNS TRIGGER AS $$
DECLARE
    v_soat_vence        DATE;
    v_inspeccion_vence  DATE;
    v_fecha_salida      DATE;
BEGIN
    SELECT soat_vence, inspeccion_vence
    INTO v_soat_vence, v_inspeccion_vence
    FROM buses WHERE id = NEW.bus_id;

    v_fecha_salida := NEW.salida_programada::DATE;

    IF v_soat_vence IS NOT NULL AND v_soat_vence < v_fecha_salida THEN
        RAISE EXCEPTION 'RN-02: SOAT del bus vence el % (antes de la salida %)',
            v_soat_vence, v_fecha_salida;
    END IF;

    IF v_inspeccion_vence IS NOT NULL AND v_inspeccion_vence < v_fecha_salida THEN
        RAISE EXCEPTION 'RN-02: Inspección técnica del bus vence el % (antes de la salida %)',
            v_inspeccion_vence, v_fecha_salida;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_validar_documentos_bus ON itinerarios;
CREATE TRIGGER tg_validar_documentos_bus
    BEFORE INSERT OR UPDATE ON itinerarios
    FOR EACH ROW EXECUTE FUNCTION validar_documentos_bus_itinerario();

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. Función y trigger: validar solapamiento de bus/conductor en itinerarios
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION validar_solapamiento_itinerario()
RETURNS TRIGGER AS $$
DECLARE
    v_duracion_min  INTEGER;
    v_fin_nuevo     TIMESTAMPTZ;
    v_conflicto_bus INTEGER;
    v_conflicto_cond INTEGER;
BEGIN
    -- Obtener duración de la ruta (default 240 min = 4h si no hay ruta)
    SELECT COALESCE(duracion_estimada, 240)
    INTO v_duracion_min
    FROM rutas WHERE id = NEW.ruta_id;

    v_fin_nuevo := NEW.salida_programada + (v_duracion_min || ' minutes')::INTERVAL;

    -- Verificar conflicto de bus
    SELECT COUNT(*) INTO v_conflicto_bus
    FROM itinerarios
    WHERE bus_id = NEW.bus_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND estado NOT IN ('cancelado', 'finalizado')
      AND (
          salida_programada < v_fin_nuevo
          AND salida_programada + (
              SELECT COALESCE(duracion_estimada, 240) || ' minutes'
              FROM rutas WHERE id = itinerarios.ruta_id
          )::INTERVAL > NEW.salida_programada
      );

    IF v_conflicto_bus > 0 THEN
        RAISE EXCEPTION 'SOLAPAMIENTO: El bus ya tiene un itinerario en ese horario.';
    END IF;

    -- Verificar conflicto de conductor
    IF NEW.conductor_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_conflicto_cond
        FROM itinerarios
        WHERE conductor_id = NEW.conductor_id
          AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
          AND estado NOT IN ('cancelado', 'finalizado')
          AND (
              salida_programada < v_fin_nuevo
              AND salida_programada + (
                  SELECT COALESCE(duracion_estimada, 240) || ' minutes'
                  FROM rutas WHERE id = itinerarios.ruta_id
              )::INTERVAL > NEW.salida_programada
          );

        IF v_conflicto_cond > 0 THEN
            RAISE EXCEPTION 'SOLAPAMIENTO: El conductor ya tiene un itinerario en ese horario.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_validar_solapamiento ON itinerarios;
CREATE TRIGGER tg_validar_solapamiento
    BEFORE INSERT OR UPDATE ON itinerarios
    FOR EACH ROW EXECUTE FUNCTION validar_solapamiento_itinerario();

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. RLS básico para rutas y sucursales (admin_sucursal puede todo)
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE rutas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE paradas_ruta ENABLE ROW LEVEL SECURITY;
ALTER TABLE sucursales  ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS — sin policy adicional para service role
-- Anon/auth: lectura de rutas activas y sucursales activas
CREATE POLICY IF NOT EXISTS "rutas_lectura_publica"
    ON rutas FOR SELECT
    USING (activa = TRUE);

CREATE POLICY IF NOT EXISTS "sucursales_lectura_publica"
    ON sucursales FOR SELECT
    USING (activa = TRUE);

CREATE POLICY IF NOT EXISTS "paradas_lectura_publica"
    ON paradas_ruta FOR SELECT
    USING (EXISTS (SELECT 1 FROM rutas r WHERE r.id = ruta_id AND r.activa = TRUE));

-- ──────────────────────────────────────────────────────────────────────────────
-- 8. Verificación final
-- ──────────────────────────────────────────────────────────────────────────────

-- Comprobar columna activa en sucursales
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'sucursales' AND column_name = 'activa') THEN
        RAISE NOTICE 'OK: sucursales.activa existe';
    END IF;
    RAISE NOTICE 'sprint2_fleet.sql aplicado correctamente';
END $$;
