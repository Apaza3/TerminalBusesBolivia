-- Tablas Principales para TerminalBusesBolivia
-- Actualizado v1.1: Módulo de Horarios y Selección de Rutas

CREATE TABLE sucursales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    ranking DECIMAL DEFAULT 5.0,
    logo_url TEXT,
    amenidades TEXT[] DEFAULT '{}'  -- Tags: 'WiFi', 'Bus Cama', 'Baño', 'TV', 'Aire Acondicionado'
);

CREATE TABLE buses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID REFERENCES sucursales(id),
    placa TEXT UNIQUE,
    capacidad INT,
    estado TEXT DEFAULT 'disponible'
);

CREATE TABLE viajes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_id UUID REFERENCES buses(id),
    origen TEXT,
    destino TEXT,
    salida TIMESTAMP,
    precio DECIMAL DEFAULT 0,               -- Precio en Bolivianos (Bs)
    duracion_estimada TEXT,                  -- Ej: '8h 30min'
    estado TEXT DEFAULT 'programado'         -- programado, en_ruta, completado, cancelado
);

CREATE TABLE asientos_viaje (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viaje_id UUID REFERENCES viajes(id),
    numero INT,
    estado TEXT DEFAULT 'disponible',        -- disponible, bloqueado, reservado
    bloqueado_hasta TIMESTAMP               -- Bloqueo lógico de 10 min para concurrencia
);

CREATE TABLE usuarios (
    id UUID PRIMARY KEY,
    nombre TEXT,
    ci TEXT UNIQUE,
    rol TEXT CHECK (rol IN ('cliente', 'conductor', 'admin')),
    verificado BOOLEAN DEFAULT false         -- Requiere validación manual de CI
);

CREATE TABLE reservas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id),
    viaje_id UUID REFERENCES viajes(id),
    monto DECIMAL,
    pagado BOOLEAN DEFAULT false
);
