-- ==============================================================================
-- MIGRACIÓN V2.0: TerminalBusesBolivia
-- Objetivo: Concurrencia de asientos, roles de usuario y datos de pago
-- ==============================================================================

-- 1. Actualización de Usuarios (Roles específicos y asociación a sucursales)
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES sucursales(id), -- Null para clientes, obligatorio para admins/conductores
ADD COLUMN IF NOT EXISTS foto_url TEXT,
DROP CONSTRAINT IF EXISTS usuarios_rol_check,
ADD CONSTRAINT usuarios_rol_check CHECK (rol IN ('cliente', 'admin_sucursal', 'conductor', 'superadmin'));

-- 2. Actualización de Asientos (El corazón de la concurrencia)
ALTER TABLE asientos_viaje
DROP CONSTRAINT IF EXISTS asientos_viaje_estado_check,
ADD CONSTRAINT asientos_viaje_estado_check CHECK (estado IN ('disponible', 'pendiente', 'ocupado')),
ADD COLUMN IF NOT EXISTS bloqueado_hasta TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES usuarios(id),
ADD COLUMN IF NOT EXISTS datos_pasajero JSONB; -- Usamos JSONB para guardar CI y nombre del acompañante sin saturar con más tablas

-- 3. Modificación de Reservas (Tiempo de expiración y comprobantes)
ALTER TABLE reservas
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'cancelado')),
ADD COLUMN IF NOT EXISTS expira_en TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS qr_url TEXT;

-- 4. Nueva Tabla: Registro de Asistencia y Estados del Conductor
CREATE TABLE IF NOT EXISTS bitacora_viajes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viaje_id UUID REFERENCES viajes(id),
    conductor_id UUID REFERENCES usuarios(id),
    estado_reportado TEXT CHECK (estado_reportado IN ('disponible', 'partiendo', 'en_ruta', 'atrasado', 'emergencia', 'ruta_cumplida')),
    latitud TEXT,
    longitud TEXT,
    registrado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Habilitar RLS en la nueva tabla
ALTER TABLE bitacora_viajes ENABLE ROW LEVEL SECURITY;