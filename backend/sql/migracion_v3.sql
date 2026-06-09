ALTER TABLE IF EXISTS usuarios DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON usuarios;
DROP POLICY IF EXISTS "Lectura publica de perfiles de usuario" ON usuarios;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON usuarios;
DROP POLICY IF EXISTS "usuarios_ver_propio" ON usuarios;
DROP POLICY IF EXISTS "usuarios_actualizar_propio" ON usuarios;

ALTER TABLE IF EXISTS buses DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "buses_lectura_publica" ON buses;

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ci TEXT UNIQUE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS departamento_id TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
    CHECK (rol IN ('cliente', 'admin_sucursal', 'conductor', 'cajero'));

ALTER TABLE buses ADD COLUMN IF NOT EXISTS marca TEXT;
ALTER TABLE buses ADD COLUMN IF NOT EXISTS modelo TEXT;
ALTER TABLE buses ADD COLUMN IF NOT EXISTS anio INT;
ALTER TABLE buses ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'economico';
ALTER TABLE buses ADD COLUMN IF NOT EXISTS configuracion_asientos TEXT DEFAULT '2+2';
ALTER TABLE buses ADD COLUMN IF NOT EXISTS ubicacion_actual_departamento TEXT;
ALTER TABLE buses ADD COLUMN IF NOT EXISTS ubicacion_actual_ciudad TEXT;
ALTER TABLE buses ADD COLUMN IF NOT EXISTS soat_numero TEXT;
ALTER TABLE buses ADD COLUMN IF NOT EXISTS soat_vence DATE;
ALTER TABLE buses ADD COLUMN IF NOT EXISTS inspeccion_numero TEXT;
ALTER TABLE buses ADD COLUMN IF NOT EXISTS inspeccion_vence DATE;
ALTER TABLE buses DROP COLUMN IF EXISTS estado;
ALTER TABLE buses ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'disponible'
    CHECK (estado IN ('disponible', 'en_ruta', 'mantenimiento', 'fuera_servicio'));

ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS departamento_id TEXT;
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS ciudad TEXT;
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS logo_emoji TEXT DEFAULT '🚌';
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS activa BOOLEAN DEFAULT true;
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS creado_en TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS tripulacion (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID REFERENCES usuarios(id) NULL,
    sucursal_id     UUID REFERENCES sucursales(id),
    nombre_completo TEXT NOT NULL,
    ci              TEXT UNIQUE NOT NULL,
    licencia        TEXT,
    licencia_vence  DATE,
    telefono        TEXT,
    activo          BOOLEAN DEFAULT true,
    creado_en       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rutas (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre               TEXT NOT NULL,
    departamento_origen  TEXT,
    origen               TEXT NOT NULL,
    departamento_destino TEXT,
    destino              TEXT NOT NULL,
    distancia_km         INT,
    duracion_estimada    TEXT,
    activa               BOOLEAN DEFAULT true,
    creado_en            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS paradas_ruta (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ruta_id                   UUID REFERENCES rutas(id) ON DELETE CASCADE,
    orden                     INT NOT NULL,
    ciudad                    TEXT NOT NULL,
    departamento_id           TEXT,
    distancia_desde_origen_km INT DEFAULT 0,
    tiempo_desde_origen_min   INT DEFAULT 0,
    precio_desde_origen       DECIMAL(10,2) DEFAULT 0,
    es_parada_intermedia      BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS itinerarios (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ruta_id                  UUID REFERENCES rutas(id),
    bus_id                   UUID REFERENCES buses(id),
    conductor_id             UUID REFERENCES tripulacion(id),
    copiloto_id              UUID REFERENCES tripulacion(id) NULL,
    sucursal_id              UUID REFERENCES sucursales(id),
    salida_programada        TIMESTAMPTZ NOT NULL,
    llegada_estimada         TIMESTAMPTZ,
    precio_base              DECIMAL(10,2) NOT NULL,
    estado                   TEXT DEFAULT 'programado'
        CHECK (estado IN ('programado', 'en_ruta', 'finalizado', 'cancelado')),
    iniciado_en              TIMESTAMPTZ NULL,
    finalizado_en            TIMESTAMPTZ NULL,
    latitud_actual           DECIMAL(9,6) NULL,
    longitud_actual          DECIMAL(9,6) NULL,
    ubicacion_actualizada_en TIMESTAMPTZ NULL,
    anden                    TEXT NULL,
    creado_en                TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asientos_viaje (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerario_id   UUID REFERENCES itinerarios(id) ON DELETE CASCADE,
    numero          TEXT NOT NULL,
    piso            INT DEFAULT 1,
    tipo            TEXT DEFAULT 'normal',
    estado          TEXT DEFAULT 'disponible'
        CHECK (estado IN ('disponible', 'bloqueado', 'reservado', 'abordado')),
    bloqueado_hasta TIMESTAMPTZ NULL,
    bloqueado_por   UUID NULL,
    UNIQUE(itinerario_id, numero)
);

CREATE TABLE IF NOT EXISTS reservas (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerario_id       UUID REFERENCES itinerarios(id),
    usuario_id          UUID REFERENCES usuarios(id) NULL,
    pasajero_nombre     TEXT NOT NULL,
    pasajero_ci         TEXT NOT NULL,
    pasajero_telefono   TEXT,
    monto_total         DECIMAL(10,2) NOT NULL,
    estado              TEXT DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'confirmada', 'cancelada', 'abordada')),
    origen_venta        TEXT DEFAULT 'online',
    reserva_enlazada_id UUID NULL,
    es_regreso          BOOLEAN DEFAULT false,
    creado_en           TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS numero_boleto_seq START 1000;

CREATE TABLE IF NOT EXISTS boletos (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reserva_id           UUID REFERENCES reservas(id) ON DELETE CASCADE,
    asiento_id           UUID REFERENCES asientos_viaje(id),
    numero_boleto        TEXT UNIQUE,
    qr_codigo            TEXT,
    pasajero_nombre      TEXT NOT NULL,
    pasajero_ci          TEXT NOT NULL,
    precio               DECIMAL(10,2) NOT NULL,
    estado               TEXT DEFAULT 'emitido'
        CHECK (estado IN ('emitido', 'abordado', 'cancelado')),
    abordado_en          TIMESTAMPTZ NULL,
    equipaje_maletas     INT DEFAULT 0,
    equipaje_peso_kg     DECIMAL(5,2) DEFAULT 0,
    equipaje_cobro_extra DECIMAL(10,2) DEFAULT 0,
    creado_en            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pagos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reserva_id      UUID REFERENCES reservas(id),
    monto           DECIMAL(10,2) NOT NULL,
    metodo          TEXT NOT NULL CHECK (metodo IN ('efectivo', 'qr', 'tarjeta', 'transferencia')),
    estado          TEXT DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'verificando', 'confirmado', 'fallido')),
    referencia      TEXT,
    confirmado_en   TIMESTAMPTZ NULL,
    confirmado_por  UUID NULL,
    creado_en       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS encomiendas (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerario_id         UUID REFERENCES itinerarios(id) NULL,
    codigo_seguimiento    TEXT UNIQUE NOT NULL,
    remitente_nombre      TEXT NOT NULL,
    remitente_ci          TEXT,
    remitente_telefono    TEXT,
    ciudad_origen         TEXT NOT NULL,
    destinatario_nombre   TEXT NOT NULL,
    destinatario_ci       TEXT,
    destinatario_telefono TEXT,
    ciudad_destino        TEXT NOT NULL,
    descripcion           TEXT,
    peso_kg               DECIMAL(5,2),
    precio                DECIMAL(10,2),
    estado                TEXT DEFAULT 'recibida'
        CHECK (estado IN ('recibida', 'en_transito', 'entregada', 'devuelta')),
    entregada_en          TIMESTAMPTZ NULL,
    creado_en             TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reportes_mantenimiento (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_id          UUID REFERENCES buses(id),
    itinerario_id   UUID REFERENCES itinerarios(id) NULL,
    reportado_por   UUID REFERENCES usuarios(id),
    tipo            TEXT CHECK (tipo IN ('motor', 'frenos', 'llantas', 'electrico', 'carroceria', 'otro')),
    descripcion     TEXT NOT NULL,
    severidad       TEXT DEFAULT 'media' CHECK (severidad IN ('baja', 'media', 'alta', 'critica')),
    foto_base64     TEXT NULL,
    estado          TEXT DEFAULT 'abierto' CHECK (estado IN ('abierto', 'en_revision', 'resuelto')),
    resuelto_en     TIMESTAMPTZ NULL,
    creado_en       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidencias (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerario_id    UUID REFERENCES itinerarios(id),
    reportado_por    UUID REFERENCES usuarios(id),
    tipo             TEXT CHECK (tipo IN ('accidente', 'desvio', 'pasajero_conflictivo', 'mecanico', 'retraso', 'otro')),
    descripcion      TEXT NOT NULL,
    latitud          DECIMAL(9,6) NULL,
    longitud         DECIMAL(9,6) NULL,
    ubicacion_manual TEXT NULL,
    estado           TEXT DEFAULT 'abierta' CHECK (estado IN ('abierta', 'resuelta')),
    resuelta_en      TIMESTAMPTZ NULL,
    creado_en        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calificaciones (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerario_id           UUID REFERENCES itinerarios(id),
    usuario_id              UUID REFERENCES usuarios(id) NULL,
    sucursal_id             UUID REFERENCES sucursales(id),
    puntuacion_bus          INT CHECK (puntuacion_bus BETWEEN 1 AND 5),
    puntuacion_tripulacion  INT CHECK (puntuacion_tripulacion BETWEEN 1 AND 5),
    puntuacion_general      INT CHECK (puntuacion_general BETWEEN 1 AND 5),
    comentario              TEXT,
    creado_en               TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION generar_asientos_itinerario()
RETURNS TRIGGER AS $$
DECLARE
    v_capacidad INT;
    v_config TEXT;
    v_letras TEXT[];
    v_asientos_por_fila INT;
    i INT;
    fila INT;
    letra TEXT;
    num_asiento TEXT;
BEGIN
    SELECT b.capacidad, COALESCE(b.configuracion_asientos, '2+2')
    INTO v_capacidad, v_config
    FROM buses b WHERE b.id = NEW.bus_id;

    IF v_config = '2+1' THEN
        v_letras := ARRAY['A','B','C'];
        v_asientos_por_fila := 3;
    ELSIF v_config = '1+1' THEN
        v_letras := ARRAY['A','B'];
        v_asientos_por_fila := 2;
    ELSE
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

DROP TRIGGER IF EXISTS trigger_generar_asientos ON itinerarios;
CREATE TRIGGER trigger_generar_asientos
AFTER INSERT ON itinerarios
FOR EACH ROW EXECUTE FUNCTION generar_asientos_itinerario();

CREATE OR REPLACE FUNCTION actualizar_ubicacion_bus()
RETURNS TRIGGER AS $$
DECLARE
    v_dep_destino TEXT;
    v_ciudad_destino TEXT;
    v_dep_origen TEXT;
    v_ciudad_origen TEXT;
BEGIN
    IF NEW.estado = OLD.estado THEN RETURN NEW; END IF;

    IF NEW.estado = 'en_ruta' THEN
        UPDATE buses SET estado = 'en_ruta',
            ubicacion_actual_departamento = NULL,
            ubicacion_actual_ciudad = NULL
        WHERE id = NEW.bus_id;
        NEW.iniciado_en := COALESCE(NEW.iniciado_en, NOW());

    ELSIF NEW.estado = 'finalizado' THEN
        SELECT r.departamento_destino, r.destino
        INTO v_dep_destino, v_ciudad_destino
        FROM rutas r WHERE r.id = NEW.ruta_id;

        UPDATE buses SET estado = 'disponible',
            ubicacion_actual_departamento = v_dep_destino,
            ubicacion_actual_ciudad = v_ciudad_destino
        WHERE id = NEW.bus_id;
        NEW.finalizado_en := COALESCE(NEW.finalizado_en, NOW());

    ELSIF NEW.estado = 'cancelado' THEN
        SELECT r.departamento_origen, r.origen
        INTO v_dep_origen, v_ciudad_origen
        FROM rutas r WHERE r.id = NEW.ruta_id;

        UPDATE buses SET estado = 'disponible',
            ubicacion_actual_departamento = v_dep_origen,
            ubicacion_actual_ciudad = v_ciudad_origen
        WHERE id = NEW.bus_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_actualizar_bus_en_viaje ON itinerarios;
CREATE TRIGGER trigger_actualizar_bus_en_viaje
BEFORE UPDATE ON itinerarios
FOR EACH ROW EXECUTE FUNCTION actualizar_ubicacion_bus();

CREATE OR REPLACE FUNCTION liberar_asientos_expirados()
RETURNS void AS $$
BEGIN
    UPDATE asientos_viaje
    SET estado = 'disponible', bloqueado_hasta = NULL, bloqueado_por = NULL
    WHERE estado = 'bloqueado' AND bloqueado_hasta < NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION asignar_numero_boleto()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_boleto IS NULL THEN
        NEW.numero_boleto := 'TBB-' || LPAD(nextval('numero_boleto_seq')::TEXT, 6, '0');
    END IF;
    IF NEW.qr_codigo IS NULL THEN
        NEW.qr_codigo := NEW.id::TEXT;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_numero_boleto ON boletos;
CREATE TRIGGER trigger_numero_boleto
BEFORE INSERT ON boletos
FOR EACH ROW EXECUTE FUNCTION asignar_numero_boleto();

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuarios_service_role" ON usuarios USING (true);

ALTER TABLE rutas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rutas_publico" ON rutas FOR SELECT USING (activa = true);

ALTER TABLE itinerarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "itinerarios_publico" ON itinerarios FOR SELECT USING (true);

ALTER TABLE asientos_viaje ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asientos_publico" ON asientos_viaje FOR SELECT USING (true);

ALTER TABLE encomiendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "encomiendas_publico" ON encomiendas FOR SELECT USING (true);

ALTER TABLE calificaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calificaciones_publico" ON calificaciones FOR SELECT USING (true);

ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buses_publico" ON buses FOR SELECT USING (true);

ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reservas_service" ON reservas USING (true);

ALTER TABLE boletos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "boletos_service" ON boletos USING (true);

ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pagos_service" ON pagos USING (true);

CREATE INDEX IF NOT EXISTS idx_itinerarios_salida ON itinerarios(salida_programada);
CREATE INDEX IF NOT EXISTS idx_itinerarios_estado ON itinerarios(estado);
CREATE INDEX IF NOT EXISTS idx_itinerarios_ruta ON itinerarios(ruta_id);
CREATE INDEX IF NOT EXISTS idx_buses_ubicacion ON buses(ubicacion_actual_departamento, estado);
CREATE INDEX IF NOT EXISTS idx_asientos_itinerario ON asientos_viaje(itinerario_id, estado);
CREATE INDEX IF NOT EXISTS idx_reservas_ci ON reservas(pasajero_ci);
CREATE INDEX IF NOT EXISTS idx_boletos_qr ON boletos(qr_codigo);
CREATE INDEX IF NOT EXISTS idx_encomiendas_codigo ON encomiendas(codigo_seguimiento);

INSERT INTO rutas (nombre, departamento_origen, origen, departamento_destino, destino, distancia_km, duracion_estimada)
VALUES
    ('La Paz → Cochabamba',    'LP', 'La Paz',    'CB', 'Cochabamba', 393,  '5h 30min'),
    ('La Paz → Santa Cruz',    'LP', 'La Paz',    'SC', 'Santa Cruz', 1010, '14h 00min'),
    ('La Paz → Oruro',         'LP', 'La Paz',    'OR', 'Oruro',      230,  '3h 00min'),
    ('La Paz → Potosí',        'LP', 'La Paz',    'PO', 'Potosí',     450,  '6h 00min'),
    ('Cochabamba → Santa Cruz','CB', 'Cochabamba','SC', 'Santa Cruz', 490,  '7h 00min'),
    ('Cochabamba → Sucre',     'CB', 'Cochabamba','CH', 'Sucre',      330,  '4h 30min'),
    ('Santa Cruz → Sucre',     'SC', 'Santa Cruz','CH', 'Sucre',      480,  '7h 00min'),
    ('Oruro → Potosí',         'OR', 'Oruro',     'PO', 'Potosí',     230,  '3h 00min')
ON CONFLICT DO NOTHING;

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;
