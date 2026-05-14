-- ==============================================================================
-- Schema v3.0 — Terminal Buses Bolivia
-- Diseñado para Supabase (PostgreSQL + RLS + Realtime)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ==============================================================================

-- ── Extensiones ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Limpiar tablas anteriores (solo en desarrollo) ───────────────────────────
DROP TABLE IF EXISTS calificaciones CASCADE;
DROP TABLE IF EXISTS encomiendas CASCADE;
DROP TABLE IF EXISTS reportes_mantenimiento CASCADE;
DROP TABLE IF EXISTS incidencias CASCADE;
DROP TABLE IF EXISTS boletos CASCADE;
DROP TABLE IF EXISTS pagos CASCADE;
DROP TABLE IF EXISTS reservas CASCADE;
DROP TABLE IF EXISTS asientos_viaje CASCADE;
DROP TABLE IF EXISTS itinerarios CASCADE;
DROP TABLE IF EXISTS paradas_ruta CASCADE;
DROP TABLE IF EXISTS rutas CASCADE;
DROP TABLE IF EXISTS tripulacion CASCADE;
DROP TABLE IF EXISTS buses CASCADE;
DROP TABLE IF EXISTS sucursales CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS departamentos CASCADE;

-- ── 1. Departamentos de Bolivia ───────────────────────────────────────────────
CREATE TABLE departamentos (
    id   TEXT PRIMARY KEY,  -- 'LP', 'CB', 'SC', 'OR', 'PO', 'TJ', 'CH', 'BE', 'PA'
    nombre TEXT NOT NULL,
    capital TEXT NOT NULL,
    color_primario TEXT DEFAULT '#1a56db',   -- color del sistema por departamento
    color_secundario TEXT DEFAULT '#1e429f'
);

INSERT INTO departamentos (id, nombre, capital, color_primario, color_secundario) VALUES
    ('LP', 'La Paz',        'La Paz',       '#1a56db', '#1e429f'),
    ('CB', 'Cochabamba',    'Cochabamba',   '#0e9f6e', '#057a55'),
    ('SC', 'Santa Cruz',    'Santa Cruz',   '#e3a008', '#b45309'),
    ('OR', 'Oruro',         'Oruro',        '#7e3af2', '#6c2bd9'),
    ('PO', 'Potosí',        'Potosí',       '#c81e1e', '#9b1c1c'),
    ('TJ', 'Tarija',        'Tarija',       '#ff6b35', '#cc4a0a'),
    ('CH', 'Chuquisaca',    'Sucre',        '#1c64f2', '#1a56db'),
    ('BE', 'Beni',          'Trinidad',     '#0694a2', '#047481'),
    ('PA', 'Pando',         'Cobija',       '#31c48d', '#0e9f6e');

-- ── 2. Sucursales (empresas de transporte) ────────────────────────────────────
CREATE TABLE sucursales (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre          TEXT NOT NULL,
    departamento_id TEXT REFERENCES departamentos(id),
    ciudad          TEXT,
    direccion       TEXT,
    telefono        TEXT,
    logo_emoji      TEXT DEFAULT '🚌',
    ranking         DECIMAL(3,2) DEFAULT 5.00 CHECK (ranking >= 0 AND ranking <= 5),
    amenidades      TEXT[] DEFAULT '{}',
    activa          BOOLEAN DEFAULT true,
    creado_en       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Usuarios (extiende Supabase auth.users) ────────────────────────────────
-- Rol 'cajero' es adicional al esquema anterior (que solo tenía cliente/conductor/admin_sucursal)
CREATE TABLE usuarios (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email           TEXT UNIQUE NOT NULL,
    nombre_completo TEXT,
    ci              TEXT UNIQUE,
    telefono        TEXT,
    foto_url        TEXT,
    rol             TEXT NOT NULL CHECK (rol IN ('cliente', 'admin_sucursal', 'conductor', 'cajero')) DEFAULT 'cliente',
    sucursal_id     UUID REFERENCES sucursales(id) NULL,
    departamento_id TEXT REFERENCES departamentos(id) NULL,
    activo          BOOLEAN DEFAULT true,
    creado_en       TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. Tripulación (conductores y copilotos) ──────────────────────────────────
CREATE TABLE tripulacion (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID REFERENCES usuarios(id) NULL,  -- si tiene cuenta en el sistema
    sucursal_id     UUID REFERENCES sucursales(id),
    nombre_completo TEXT NOT NULL,
    ci              TEXT UNIQUE NOT NULL,
    licencia        TEXT,
    licencia_vence  DATE,
    telefono        TEXT,
    activo          BOOLEAN DEFAULT true,
    creado_en       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. Buses / Flota ──────────────────────────────────────────────────────────
-- LÓGICA CLAVE: ubicacion_actual_departamento determina disponibilidad por departamento
-- Cuando sale en viaje → estado='en_ruta', ubicacion_actual_departamento=NULL
-- Cuando llega        → estado='disponible', ubicacion_actual_departamento=departamento_destino
CREATE TABLE buses (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id                 UUID REFERENCES sucursales(id),
    placa                       TEXT UNIQUE NOT NULL,
    marca                       TEXT,
    modelo                      TEXT,
    anio                        INT,
    capacidad                   INT NOT NULL,
    categoria                   TEXT CHECK (categoria IN ('economico', 'semicama', 'cama', 'vip', 'ejecutivo')) DEFAULT 'economico',
    configuracion_asientos      TEXT DEFAULT '2+2',   -- '2+2', '2+1', '1+1'

    -- Estado y ubicación
    estado                      TEXT CHECK (estado IN ('disponible', 'en_ruta', 'mantenimiento', 'fuera_servicio')) DEFAULT 'disponible',
    ubicacion_actual_departamento TEXT REFERENCES departamentos(id) NULL,
    ubicacion_actual_ciudad     TEXT NULL,

    -- Documentación (R-SOAT)
    soat_numero                 TEXT,
    soat_vence                  DATE,
    inspeccion_numero           TEXT,
    inspeccion_vence            DATE,

    creado_en                   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. Rutas con paradas intermedias (R15) ────────────────────────────────────
CREATE TABLE rutas (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre              TEXT NOT NULL,   -- 'La Paz → Santa Cruz'
    departamento_origen TEXT REFERENCES departamentos(id),
    origen              TEXT NOT NULL,
    departamento_destino TEXT REFERENCES departamentos(id),
    destino             TEXT NOT NULL,
    distancia_km        INT,
    duracion_estimada   TEXT,           -- '8h 30min'
    activa              BOOLEAN DEFAULT true,
    creado_en           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE paradas_ruta (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ruta_id         UUID REFERENCES rutas(id) ON DELETE CASCADE,
    orden           INT NOT NULL,        -- 0=origen, N=destino
    ciudad          TEXT NOT NULL,
    departamento_id TEXT REFERENCES departamentos(id),
    distancia_desde_origen_km INT DEFAULT 0,
    tiempo_desde_origen_min   INT DEFAULT 0,
    precio_desde_origen       DECIMAL(10,2) DEFAULT 0,
    es_parada_intermedia      BOOLEAN DEFAULT true
);

-- ── 7. Itinerarios (viajes programados) (R16) ─────────────────────────────────
-- Vincula: ruta + bus + conductor + horario
CREATE TABLE itinerarios (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ruta_id         UUID REFERENCES rutas(id),
    bus_id          UUID REFERENCES buses(id),
    conductor_id    UUID REFERENCES tripulacion(id),
    copiloto_id     UUID REFERENCES tripulacion(id) NULL,
    sucursal_id     UUID REFERENCES sucursales(id),

    salida_programada       TIMESTAMPTZ NOT NULL,
    llegada_estimada        TIMESTAMPTZ,
    precio_base             DECIMAL(10,2) NOT NULL,

    -- Estado del viaje en tiempo real
    estado                  TEXT CHECK (estado IN ('programado', 'en_ruta', 'finalizado', 'cancelado')) DEFAULT 'programado',
    iniciado_en             TIMESTAMPTZ NULL,
    finalizado_en           TIMESTAMPTZ NULL,

    -- Ubicación actual del bus (para R17 monitoreo)
    latitud_actual          DECIMAL(9,6) NULL,
    longitud_actual         DECIMAL(9,6) NULL,
    ubicacion_actualizada_en TIMESTAMPTZ NULL,

    -- Andén
    anden                   TEXT NULL,

    creado_en               TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. Asientos por viaje ─────────────────────────────────────────────────────
-- Se generan automáticamente al crear itinerario (via función/trigger)
CREATE TABLE asientos_viaje (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerario_id   UUID REFERENCES itinerarios(id) ON DELETE CASCADE,
    numero          TEXT NOT NULL,       -- '1A', '2B', etc.
    piso            INT DEFAULT 1,
    tipo            TEXT DEFAULT 'normal',  -- 'normal', 'cama', 'vip'
    estado          TEXT CHECK (estado IN ('disponible', 'bloqueado', 'reservado', 'abordado')) DEFAULT 'disponible',
    bloqueado_hasta TIMESTAMPTZ NULL,
    bloqueado_por   UUID NULL,           -- usuario_id que bloqueó
    UNIQUE(itinerario_id, numero)
);

-- ── 9. Reservas ───────────────────────────────────────────────────────────────
CREATE TABLE reservas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerario_id   UUID REFERENCES itinerarios(id),
    usuario_id      UUID REFERENCES usuarios(id) NULL,  -- NULL si es venta en mostrador

    -- Datos del pasajero
    pasajero_nombre TEXT NOT NULL,
    pasajero_ci     TEXT NOT NULL,
    pasajero_telefono TEXT,

    monto_total     DECIMAL(10,2) NOT NULL,
    estado          TEXT CHECK (estado IN ('pendiente', 'confirmada', 'cancelada', 'abordada')) DEFAULT 'pendiente',
    origen_venta    TEXT DEFAULT 'online',  -- 'online', 'mostrador', 'telefono'

    -- Ida y vuelta (R-IDAVUELTA)
    reserva_enlazada_id UUID REFERENCES reservas(id) NULL,
    es_regreso      BOOLEAN DEFAULT false,

    creado_en       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 10. Boletos (uno por asiento por reserva) ─────────────────────────────────
CREATE TABLE boletos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reserva_id      UUID REFERENCES reservas(id) ON DELETE CASCADE,
    asiento_id      UUID REFERENCES asientos_viaje(id),
    numero_boleto   TEXT UNIQUE NOT NULL,   -- correlativo para factura
    qr_codigo       TEXT,                   -- UUID o hash para validación

    -- Pasajero específico por asiento
    pasajero_nombre TEXT NOT NULL,
    pasajero_ci     TEXT NOT NULL,

    precio          DECIMAL(10,2) NOT NULL,
    estado          TEXT CHECK (estado IN ('emitido', 'abordado', 'cancelado')) DEFAULT 'emitido',
    abordado_en     TIMESTAMPTZ NULL,

    -- Equipaje (R-EQUIPAJE)
    equipaje_maletas    INT DEFAULT 0,
    equipaje_peso_kg    DECIMAL(5,2) DEFAULT 0,
    equipaje_cobro_extra DECIMAL(10,2) DEFAULT 0,

    creado_en       TIMESTAMPTZ DEFAULT NOW()
);

-- Secuencia para número de boleto
CREATE SEQUENCE numero_boleto_seq START 1000;

-- ── 11. Pagos ─────────────────────────────────────────────────────────────────
CREATE TABLE pagos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reserva_id      UUID REFERENCES reservas(id),
    monto           DECIMAL(10,2) NOT NULL,
    metodo          TEXT CHECK (metodo IN ('efectivo', 'qr', 'tarjeta', 'transferencia')) NOT NULL,
    estado          TEXT CHECK (estado IN ('pendiente', 'verificando', 'confirmado', 'fallido')) DEFAULT 'pendiente',
    referencia      TEXT,               -- código de transacción externo
    confirmado_en   TIMESTAMPTZ NULL,
    confirmado_por  UUID REFERENCES usuarios(id) NULL,
    creado_en       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 12. Encomiendas (R-ENCOMIENDA) ───────────────────────────────────────────
CREATE TABLE encomiendas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerario_id   UUID REFERENCES itinerarios(id) NULL,
    codigo_seguimiento TEXT UNIQUE NOT NULL,  -- 'TBB-XXXXXX'

    -- Remitente
    remitente_nombre TEXT NOT NULL,
    remitente_ci     TEXT,
    remitente_telefono TEXT,
    ciudad_origen    TEXT NOT NULL,

    -- Destinatario
    destinatario_nombre TEXT NOT NULL,
    destinatario_ci     TEXT,
    destinatario_telefono TEXT,
    ciudad_destino   TEXT NOT NULL,

    descripcion      TEXT,
    peso_kg          DECIMAL(5,2),
    precio           DECIMAL(10,2),
    estado           TEXT CHECK (estado IN ('recibida', 'en_transito', 'entregada', 'devuelta')) DEFAULT 'recibida',
    entregada_en     TIMESTAMPTZ NULL,
    creado_en        TIMESTAMPTZ DEFAULT NOW()
);

-- ── 13. Reportes de Mantenimiento (R29) ──────────────────────────────────────
CREATE TABLE reportes_mantenimiento (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_id          UUID REFERENCES buses(id),
    itinerario_id   UUID REFERENCES itinerarios(id) NULL,
    reportado_por   UUID REFERENCES usuarios(id),
    tipo            TEXT CHECK (tipo IN ('motor', 'frenos', 'llantas', 'electrico', 'carroceria', 'otro')),
    descripcion     TEXT NOT NULL,
    severidad       TEXT CHECK (severidad IN ('baja', 'media', 'alta', 'critica')) DEFAULT 'media',
    foto_base64     TEXT NULL,
    estado          TEXT CHECK (estado IN ('abierto', 'en_revision', 'resuelto')) DEFAULT 'abierto',
    resuelto_en     TIMESTAMPTZ NULL,
    creado_en       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 14. Incidencias de Viaje (R31) ───────────────────────────────────────────
CREATE TABLE incidencias (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerario_id   UUID REFERENCES itinerarios(id),
    reportado_por   UUID REFERENCES usuarios(id),
    tipo            TEXT CHECK (tipo IN ('accidente', 'desvio', 'pasajero_conflictivo', 'mecanico', 'retraso', 'otro')),
    descripcion     TEXT NOT NULL,
    latitud         DECIMAL(9,6) NULL,
    longitud        DECIMAL(9,6) NULL,
    ubicacion_manual TEXT NULL,
    estado          TEXT CHECK (estado IN ('abierta', 'resuelta')) DEFAULT 'abierta',
    resuelta_en     TIMESTAMPTZ NULL,
    creado_en       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 15. Calificaciones / Feedback (R22-R24) ──────────────────────────────────
CREATE TABLE calificaciones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerario_id   UUID REFERENCES itinerarios(id),
    usuario_id      UUID REFERENCES usuarios(id) NULL,
    sucursal_id     UUID REFERENCES sucursales(id),

    puntuacion_bus          INT CHECK (puntuacion_bus BETWEEN 1 AND 5),
    puntuacion_tripulacion  INT CHECK (puntuacion_tripulacion BETWEEN 1 AND 5),
    puntuacion_general      INT CHECK (puntuacion_general BETWEEN 1 AND 5),
    comentario      TEXT,

    creado_en       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Funciones y Triggers ──────────────────────────────────────────────────────

-- Función: generar asientos al crear itinerario
CREATE OR REPLACE FUNCTION generar_asientos_itinerario()
RETURNS TRIGGER AS $$
DECLARE
    v_capacidad INT;
    v_config TEXT;
    v_asientos_por_fila INT;
    v_letras TEXT[];
    i INT;
    fila INT;
    letra TEXT;
    num_asiento TEXT;
BEGIN
    SELECT b.capacidad, b.configuracion_asientos
    INTO v_capacidad, v_config
    FROM buses b WHERE b.id = NEW.bus_id;

    -- Determinar letras según configuración
    IF v_config = '2+1' THEN
        v_letras := ARRAY['A','B','C'];
        v_asientos_por_fila := 3;
    ELSIF v_config = '1+1' THEN
        v_letras := ARRAY['A','B'];
        v_asientos_por_fila := 2;
    ELSE -- '2+2' por defecto
        v_letras := ARRAY['A','B','C','D'];
        v_asientos_por_fila := 4;
    END IF;

    FOR i IN 1..v_capacidad LOOP
        fila := CEIL(i::DECIMAL / v_asientos_por_fila);
        letra := v_letras[((i - 1) % v_asientos_por_fila) + 1];
        num_asiento := fila::TEXT || letra;

        INSERT INTO asientos_viaje (itinerario_id, numero, estado)
        VALUES (NEW.id, num_asiento, 'disponible');
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generar_asientos
AFTER INSERT ON itinerarios
FOR EACH ROW EXECUTE FUNCTION generar_asientos_itinerario();

-- Función: actualizar ubicación del bus cuando cambia estado del itinerario
CREATE OR REPLACE FUNCTION actualizar_ubicacion_bus()
RETURNS TRIGGER AS $$
DECLARE
    v_departamento_destino TEXT;
    v_ciudad_destino TEXT;
BEGIN
    IF NEW.estado = 'en_ruta' AND OLD.estado != 'en_ruta' THEN
        -- Bus sale: poner en tránsito
        UPDATE buses SET
            estado = 'en_ruta',
            ubicacion_actual_departamento = NULL,
            ubicacion_actual_ciudad = NULL
        WHERE id = NEW.bus_id;

        NEW.iniciado_en = NOW();

    ELSIF NEW.estado = 'finalizado' AND OLD.estado != 'finalizado' THEN
        -- Bus llega: actualizar a departamento destino
        SELECT r.departamento_destino, r.destino
        INTO v_departamento_destino, v_ciudad_destino
        FROM rutas r WHERE r.id = NEW.ruta_id;

        UPDATE buses SET
            estado = 'disponible',
            ubicacion_actual_departamento = v_departamento_destino,
            ubicacion_actual_ciudad = v_ciudad_destino
        WHERE id = NEW.bus_id;

        NEW.finalizado_en = NOW();

    ELSIF NEW.estado = 'cancelado' AND OLD.estado != 'cancelado' THEN
        -- Bus vuelve a disponible en el departamento origen
        UPDATE buses SET
            estado = 'disponible',
            ubicacion_actual_departamento = (SELECT r.departamento_origen FROM rutas r WHERE r.id = NEW.ruta_id),
            ubicacion_actual_ciudad = (SELECT r.origen FROM rutas r WHERE r.id = NEW.ruta_id)
        WHERE id = NEW.bus_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_bus_en_viaje
BEFORE UPDATE ON itinerarios
FOR EACH ROW EXECUTE FUNCTION actualizar_ubicacion_bus();

-- Función: liberar asientos bloqueados expirados
CREATE OR REPLACE FUNCTION liberar_asientos_expirados()
RETURNS void AS $$
BEGIN
    UPDATE asientos_viaje
    SET estado = 'disponible',
        bloqueado_hasta = NULL,
        bloqueado_por = NULL
    WHERE estado = 'bloqueado'
      AND bloqueado_hasta < NOW();
END;
$$ LANGUAGE plpgsql;

-- Función: generar número correlativo de boleto
CREATE OR REPLACE FUNCTION generar_numero_boleto()
RETURNS TRIGGER AS $$
BEGIN
    NEW.numero_boleto := 'TBB-' || LPAD(nextval('numero_boleto_seq')::TEXT, 6, '0');
    NEW.qr_codigo := NEW.id::TEXT;  -- UUID como código QR
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_numero_boleto
BEFORE INSERT ON boletos
FOR EACH ROW EXECUTE FUNCTION generar_numero_boleto();

-- ── RLS (Row Level Security) ──────────────────────────────────────────────────

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE asientos_viaje ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE boletos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

-- Lectura pública de datos de viajes y buses (para buscador)
CREATE POLICY "viajes_lectura_publica" ON itinerarios FOR SELECT USING (true);
CREATE POLICY "asientos_lectura_publica" ON asientos_viaje FOR SELECT USING (true);
CREATE POLICY "sucursales_lectura_publica" ON sucursales FOR SELECT USING (activa = true);
CREATE POLICY "buses_lectura_publica" ON buses FOR SELECT USING (true);
CREATE POLICY "rutas_lectura_publica" ON rutas FOR SELECT USING (activa = true);
CREATE POLICY "departamentos_lectura_publica" ON departamentos FOR SELECT USING (true);
CREATE POLICY "encomiendas_seguimiento_publico" ON encomiendas FOR SELECT USING (true);
CREATE POLICY "calificaciones_lectura_publica" ON calificaciones FOR SELECT USING (true);

-- Usuarios: solo su propio perfil (o admins con service role)
CREATE POLICY "usuarios_ver_propio" ON usuarios FOR SELECT USING (auth.uid() = id);
CREATE POLICY "usuarios_actualizar_propio" ON usuarios FOR UPDATE USING (auth.uid() = id);

-- Reservas: usuarios ven las suyas
CREATE POLICY "reservas_ver_propias" ON reservas FOR SELECT USING (auth.uid() = usuario_id);
CREATE POLICY "reservas_crear" ON reservas FOR INSERT WITH CHECK (auth.uid() = usuario_id OR usuario_id IS NULL);

-- Boletos: acceso via reserva propia
CREATE POLICY "boletos_ver_propios" ON boletos FOR SELECT
    USING (EXISTS (SELECT 1 FROM reservas r WHERE r.id = boletos.reserva_id AND r.usuario_id = auth.uid()));

-- ── Índices para rendimiento ──────────────────────────────────────────────────

CREATE INDEX idx_itinerarios_salida ON itinerarios(salida_programada);
CREATE INDEX idx_itinerarios_estado ON itinerarios(estado);
CREATE INDEX idx_itinerarios_ruta ON itinerarios(ruta_id);
CREATE INDEX idx_buses_ubicacion ON buses(ubicacion_actual_departamento, estado);
CREATE INDEX idx_asientos_itinerario ON asientos_viaje(itinerario_id, estado);
CREATE INDEX idx_reservas_ci ON reservas(pasajero_ci);
CREATE INDEX idx_boletos_qr ON boletos(qr_codigo);
CREATE INDEX idx_encomiendas_codigo ON encomiendas(codigo_seguimiento);

-- ── Datos iniciales (sucursales y rutas comunes de Bolivia) ───────────────────

INSERT INTO sucursales (id, nombre, departamento_id, ciudad, logo_emoji, ranking, amenidades) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Flota Bolívar',       'LP', 'La Paz',       '🚌', 4.8, '{"WiFi","Bus Cama","TV"}'),
    ('22222222-2222-2222-2222-222222222222', 'Trans Copacabana',    'LP', 'La Paz',       '🚌', 4.5, '{"WiFi","Bus Cama","Baño"}'),
    ('33333333-3333-3333-3333-333333333333', 'El Dorado',           'SC', 'Santa Cruz',   '🚌', 4.2, '{"TV","Aire Acondicionado"}'),
    ('44444444-4444-4444-4444-444444444444', 'Trans Cochabamba',    'CB', 'Cochabamba',   '🚌', 4.3, '{"WiFi","Bus Cama"}'),
    ('55555555-5555-5555-5555-555555555555', 'Bolívar Bus',         'OR', 'Oruro',        '🚌', 4.0, '{"TV"}');

INSERT INTO rutas (nombre, departamento_origen, origen, departamento_destino, destino, distancia_km, duracion_estimada) VALUES
    ('La Paz → Cochabamba',    'LP', 'La Paz',       'CB', 'Cochabamba', 393,  '5h 30min'),
    ('La Paz → Santa Cruz',    'LP', 'La Paz',       'SC', 'Santa Cruz', 1010, '14h 00min'),
    ('La Paz → Oruro',         'LP', 'La Paz',       'OR', 'Oruro',      230,  '3h 00min'),
    ('La Paz → Potosí',        'LP', 'La Paz',       'PO', 'Potosí',     450,  '6h 00min'),
    ('Cochabamba → Santa Cruz','CB', 'Cochabamba',   'SC', 'Santa Cruz', 490,  '7h 00min'),
    ('Cochabamba → Sucre',     'CB', 'Cochabamba',   'CH', 'Sucre',      330,  '4h 30min'),
    ('Santa Cruz → Sucre',     'SC', 'Santa Cruz',   'CH', 'Sucre',      480,  '7h 00min'),
    ('Oruro → Potosí',         'OR', 'Oruro',        'PO', 'Potosí',     230,  '3h 00min');
