-- ============================================================
-- Migración v2.1: Flota Dinámica + Gestión de Tripulación
-- Proyecto: TerminalBusesBolivia
-- Fecha: 2026-03-31
-- Descripción: Adds dynamic bus layout columns, crew management
--              table, and trip-crew assignment foreign keys.
--
-- HOW TO APPLY: Run this script in Supabase SQL Editor.
--              Execute in order; each block is idempotent.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. BUSES — Add dynamic layout columns
-- ────────────────────────────────────────────────────────────
ALTER TABLE buses
    ADD COLUMN IF NOT EXISTS pisos        INT     DEFAULT 1 CHECK (pisos IN (1, 2)),
    ADD COLUMN IF NOT EXISTS columnas     INT     DEFAULT 4 CHECK (columnas IN (3, 4)),
    ADD COLUMN IF NOT EXISTS filas_piso_1 INT     DEFAULT 10,
    ADD COLUMN IF NOT EXISTS filas_piso_2 INT     DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tiene_bano   BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS amenidades   TEXT[]  DEFAULT '{}';

-- Backfill existing buses with a standard layout
UPDATE buses SET
    pisos        = 1,
    columnas     = 4,
    filas_piso_1 = 10,
    filas_piso_2 = 0,
    tiene_bano   = false
WHERE pisos IS NULL;

-- ────────────────────────────────────────────────────────────
-- 2. TRIPULACION — New table for crew members
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tripulacion (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID        REFERENCES sucursales(id) ON DELETE SET NULL,
    ci          TEXT        UNIQUE NOT NULL,
    nombre      TEXT        NOT NULL,
    telefono    TEXT,
    rol         TEXT        NOT NULL CHECK (rol IN ('conductor', 'copiloto', 'ayudante')),
    licencia_url TEXT,       -- URL in Supabase Storage bucket 'tripulacion-fotos'
    foto_url    TEXT,        -- URL in Supabase Storage bucket 'tripulacion-fotos'
    activo      BOOLEAN     DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by sucursal
CREATE INDEX IF NOT EXISTS idx_tripulacion_sucursal ON tripulacion(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_tripulacion_ci       ON tripulacion(ci);

-- ────────────────────────────────────────────────────────────
-- 3. VIAJES — Add crew assignment foreign keys
-- ────────────────────────────────────────────────────────────
ALTER TABLE viajes
    ADD COLUMN IF NOT EXISTS conductor_id UUID REFERENCES tripulacion(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS copiloto_id  UUID REFERENCES tripulacion(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS ayudante_id  UUID REFERENCES tripulacion(id) ON DELETE SET NULL;

-- ────────────────────────────────────────────────────────────
-- 4. ASIENTOS_VIAJE — Add layout metadata per seat
-- ────────────────────────────────────────────────────────────
ALTER TABLE asientos_viaje
    ADD COLUMN IF NOT EXISTS piso           INT     DEFAULT 1,
    ADD COLUMN IF NOT EXISTS fila           INT,
    ADD COLUMN IF NOT EXISTS columna        INT,
    ADD COLUMN IF NOT EXISTS numero_asiento TEXT,
    ADD COLUMN IF NOT EXISTS tipo_asiento   TEXT    DEFAULT 'normal'
        CHECK (tipo_asiento IN ('normal', 'semicama', 'cama'));

-- Replace old 'numero' with 'numero_asiento' (keep backward compat)
-- NOTE: Old 'numero' column is kept; 'numero_asiento' stores formatted label (e.g. '1A')

-- ────────────────────────────────────────────────────────────
-- 5. RLS POLICIES (Row Level Security)
--    Basic read policy: all authenticated users can read tripulacion
--    Write policy: only service_role (admin) can insert/update
-- ────────────────────────────────────────────────────────────
ALTER TABLE tripulacion ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read crew (for trip detail pages)
CREATE POLICY IF NOT EXISTS "tripulacion_read_all"
    ON tripulacion FOR SELECT
    USING (true);

-- Only service_role can mutate (admin operations via backend)
-- For the prototype, insert/update directly via Supabase anon key is allowed:
CREATE POLICY IF NOT EXISTS "tripulacion_insert_anon"
    ON tripulacion FOR INSERT
    WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "tripulacion_update_anon"
    ON tripulacion FOR UPDATE
    USING (true);

-- ────────────────────────────────────────────────────────────
-- 6. SUPABASE STORAGE — Instructions (cannot be done via SQL)
-- ────────────────────────────────────────────────────────────
-- Manual step: Create the following buckets in Supabase Dashboard → Storage:
--   Bucket name: tripulacion-fotos
--   Public: YES (so URLs can be displayed without auth tokens)
--   Allowed MIME types: image/jpeg, image/png, image/webp
-- ────────────────────────────────────────────────────────────
