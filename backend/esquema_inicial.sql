-- Tablas Principales para TerminalBusesBolivia
CREATE TABLE sucursales (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nombre TEXT NOT NULL, ranking DECIMAL DEFAULT 5.0);
CREATE TABLE buses (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), sucursal_id UUID REFERENCES sucursales(id), placa TEXT UNIQUE, capacidad INT, estado TEXT DEFAULT 'disponible');
CREATE TABLE viajes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), bus_id UUID REFERENCES buses(id), origen TEXT, destino TEXT, salida TIMESTAMP);
CREATE TABLE asientos_viaje (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), viaje_id UUID REFERENCES viajes(id), numero INT, estado TEXT DEFAULT 'disponible', bloqueado_hasta TIMESTAMP);
CREATE TABLE usuarios (id UUID PRIMARY KEY, nombre TEXT, ci TEXT UNIQUE, rol TEXT CHECK (rol IN ('cliente', 'conductor', 'admin')), verificado BOOLEAN DEFAULT false);
CREATE TABLE reservas (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), usuario_id UUID REFERENCES usuarios(id), viaje_id UUID REFERENCES viajes(id), monto DECIMAL, pagado BOOLEAN DEFAULT false);
