-- ==============================================================================
-- Seed de datos de prueba — Itinerarios / Viajes
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Genera: buses, tripulación y viajes SOLO para Trans Copacabana S.R.L (La Paz)
-- ==============================================================================

-- ── 1. Insertar buses de prueba (si no existen) ──────────────────────────────
INSERT INTO buses (id, sucursal_id, placa, marca, modelo, anio, capacidad, categoria, configuracion_asientos, estado, ubicacion_actual_departamento, ubicacion_actual_ciudad, soat_numero, soat_vence, inspeccion_numero, inspeccion_vence)
VALUES
    -- Trans Copacabana S.R.L. (La Paz) - ID de sucursal: 22222222-2222-2222-2222-222222222222
    ('b2000001-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '2001-TCP', 'Mercedes Benz', 'O500-RS', 2020, 44, 'semicama', '2+2', 'disponible', 'LP', 'La Paz', 'SOAT-010', '2027-07-01', 'INSP-010', '2027-04-01'),
    ('b2000001-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', '2002-TCP', 'Scania', 'K360', 2019, 40, 'cama', '2+1', 'disponible', 'LP', 'La Paz', 'SOAT-011', '2027-09-15', 'INSP-011', '2027-06-10'),
    ('b2000001-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', '2003-TCP', 'Volvo', 'B420R', 2022, 36, 'vip', '2+1', 'disponible', 'LP', 'La Paz', 'SOAT-012', '2027-04-20', 'INSP-012', '2027-02-28'),
    ('b2000001-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', '2004-TCP', 'Mercedes Benz', 'O500-RSD', 2023, 50, 'semicama', '2+2', 'disponible', 'LP', 'La Paz', 'SOAT-013', '2027-11-10', 'INSP-013', '2027-08-05'),
    ('b2000001-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', '2005-TCP', 'Scania', 'K410', 2021, 42, 'cama', '2+1', 'disponible', 'LP', 'La Paz', 'SOAT-014', '2027-01-15', 'INSP-014', '2028-01-10')
ON CONFLICT (placa) DO NOTHING;

-- ── 2. Insertar tripulación de prueba ────────────────────────────────────────
INSERT INTO tripulacion (id, sucursal_id, nombre_completo, ci, licencia, licencia_vence, telefono, activo)
VALUES
    -- Trans Copacabana S.R.L.
    ('c2000001-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Juan Huanca Ticona', '3412567', 'CAT-A', '2027-11-30', '74567890', true),
    ('c2000001-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Pedro Apaza Soto', '4523678', 'CAT-A', '2028-02-15', '75678901', true),
    ('c2000001-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'Roberto Quispe Choque', '5632789', 'CAT-A', '2027-10-15', '72345678', true),
    ('c2000001-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'Miguel Ríos Pacheco', '5438765', 'CAT-A', '2028-05-01', '71234568', true),
    ('c2000001-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 'Andrés Salinas Pinto', '6547890', 'CAT-A', '2028-04-20', '79012345', true)
ON CONFLICT (ci) DO NOTHING;

-- ── 3. Insertar viajes de prueba (pasados, hoy, y futuros) ──────────────────
-- Función helper para generar fechas relativas a hoy
DO $$
DECLARE
    hoy DATE := CURRENT_DATE;
    ahora TIMESTAMPTZ := NOW();
BEGIN
    -- ═══ TRANS COPACABANA S.R.L. — La Paz ════════════════════════════════════════
    -- Eliminamos viajes futuros de prueba de esta sucursal si los hubiera (para evitar duplicados exactos al reejecutar)
    DELETE FROM viajes WHERE sucursal_id = '22222222-2222-2222-2222-222222222222' AND fecha_salida >= hoy;

    INSERT INTO viajes (sucursal_id, bus_id, conductor_id, origen, destino,
        origen_departamento_id, destino_departamento_id,
        fecha_salida, precio, duracion_estimada, estado, anden)
    VALUES
    -- ================= PASADOS =================
    ('22222222-2222-2222-2222-222222222222', 'b2000001-0000-0000-0000-000000000001', 'c2000001-0000-0000-0000-000000000001',
     'La Paz', 'Cochabamba', 'LP', 'CB', hoy - 3 + TIME '07:00', 110.00, '5h 30min', 'completado', 'D1'),

    ('22222222-2222-2222-2222-222222222222', 'b2000001-0000-0000-0000-000000000002', 'c2000001-0000-0000-0000-000000000002',
     'La Paz', 'Oruro', 'LP', 'OR', hoy - 2 + TIME '14:30', 40.00, '3h 00min', 'completado', 'D2'),

    ('22222222-2222-2222-2222-222222222222', 'b2000001-0000-0000-0000-000000000003', 'c2000001-0000-0000-0000-000000000003',
     'La Paz', 'Santa Cruz', 'LP', 'SC', hoy - 2 + TIME '18:00', 250.00, '14h 00min', 'completado', 'D3'),

    ('22222222-2222-2222-2222-222222222222', 'b2000001-0000-0000-0000-000000000004', 'c2000001-0000-0000-0000-000000000004',
     'La Paz', 'Potosí', 'LP', 'PO', hoy - 1 + TIME '20:30', 100.00, '6h 00min', 'cancelado', NULL),

    ('22222222-2222-2222-2222-222222222222', 'b2000001-0000-0000-0000-000000000005', 'c2000001-0000-0000-0000-000000000005',
     'La Paz', 'Cochabamba', 'LP', 'CB', hoy - 1 + TIME '08:00', 115.00, '5h 30min', 'completado', 'D1'),

    -- ================= HOY =================
    ('22222222-2222-2222-2222-222222222222', 'b2000001-0000-0000-0000-000000000001', 'c2000001-0000-0000-0000-000000000001',
     'La Paz', 'Cochabamba', 'LP', 'CB', hoy + TIME '06:30', 110.00, '5h 30min', 'en_viaje', 'D1'),

    ('22222222-2222-2222-2222-222222222222', 'b2000001-0000-0000-0000-000000000002', 'c2000001-0000-0000-0000-000000000002',
     'La Paz', 'Oruro', 'LP', 'OR', hoy + TIME '10:00', 40.00, '3h 00min', 'programado', 'D2'),

    ('22222222-2222-2222-2222-222222222222', 'b2000001-0000-0000-0000-000000000003', 'c2000001-0000-0000-0000-000000000003',
     'La Paz', 'Santa Cruz', 'LP', 'SC', hoy + TIME '19:30', 240.00, '14h 00min', 'programado', 'D3'),

    ('22222222-2222-2222-2222-222222222222', 'b2000001-0000-0000-0000-000000000004', 'c2000001-0000-0000-0000-000000000004',
     'La Paz', 'Sucre', 'LP', 'CH', hoy + TIME '21:00', 160.00, '11h 00min', 'programado', 'D4'),

    -- ================= MAÑANA =================
    ('22222222-2222-2222-2222-222222222222', 'b2000001-0000-0000-0000-000000000005', 'c2000001-0000-0000-0000-000000000005',
     'La Paz', 'Cochabamba', 'LP', 'CB', hoy + 1 + TIME '06:00', 115.00, '5h 30min', 'programado', 'D1'),

    ('22222222-2222-2222-2222-222222222222', 'b2000001-0000-0000-0000-000000000001', 'c2000001-0000-0000-0000-000000000001',
     'La Paz', 'Potosí', 'LP', 'PO', hoy + 1 + TIME '20:00', 100.00, '6h 00min', 'programado', 'D2'),

    ('22222222-2222-2222-2222-222222222222', 'b2000001-0000-0000-0000-000000000002', 'c2000001-0000-0000-0000-000000000002',
     'La Paz', 'Santa Cruz', 'LP', 'SC', hoy + 1 + TIME '17:00', 250.00, '14h 00min', 'programado', 'D3'),

    -- ================= PRÓXIMOS DÍAS =================
    ('22222222-2222-2222-2222-222222222222', 'b2000001-0000-0000-0000-000000000003', 'c2000001-0000-0000-0000-000000000003',
     'La Paz', 'Oruro', 'LP', 'OR', hoy + 2 + TIME '08:30', 45.00, '3h 00min', 'programado', NULL),

    ('22222222-2222-2222-2222-222222222222', 'b2000001-0000-0000-0000-000000000004', 'c2000001-0000-0000-0000-000000000004',
     'La Paz', 'Cochabamba', 'LP', 'CB', hoy + 2 + TIME '14:30', 110.00, '5h 30min', 'programado', NULL),

    ('22222222-2222-2222-2222-222222222222', 'b2000001-0000-0000-0000-000000000005', 'c2000001-0000-0000-0000-000000000005',
     'La Paz', 'Santa Cruz', 'LP', 'SC', hoy + 3 + TIME '20:30', 240.00, '14h 00min', 'programado', NULL),
     
    ('22222222-2222-2222-2222-222222222222', 'b2000001-0000-0000-0000-000000000001', 'c2000001-0000-0000-0000-000000000001',
     'La Paz', 'Sucre', 'LP', 'CH', hoy + 4 + TIME '19:00', 160.00, '11h 00min', 'programado', NULL),
     
    ('22222222-2222-2222-2222-222222222222', 'b2000001-0000-0000-0000-000000000002', 'c2000001-0000-0000-0000-000000000002',
     'La Paz', 'Cochabamba', 'LP', 'CB', hoy + 5 + TIME '07:30', 115.00, '5h 30min', 'programado', NULL);

    RAISE NOTICE '✅ Datos de prueba insertados SOLO para Trans Copacabana S.R.L. (La Paz)';
END $$;

-- Verificar resultados de Trans Copacabana S.R.L.
SELECT 'Buses Trans Copacabana:' AS info, COUNT(*) AS total FROM buses WHERE sucursal_id = '22222222-2222-2222-2222-222222222222';
SELECT 'Tripulación Trans Copacabana:' AS info, COUNT(*) AS total FROM tripulacion WHERE sucursal_id = '22222222-2222-2222-2222-222222222222';
SELECT 'Viajes Trans Copacabana:' AS info, COUNT(*) AS total FROM viajes WHERE sucursal_id = '22222222-2222-2222-2222-222222222222';
