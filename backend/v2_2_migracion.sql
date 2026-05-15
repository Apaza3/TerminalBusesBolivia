-- ==============================================================================
-- Migración v2.2: Autenticación, Roles (RBAC) y Arreglo de Sucursales
-- Sprint 3 - TerminalBusesBolivia
-- ==============================================================================

-- 1. Crear algunas sucursales de prueba para arreglar el bug de dropdown vacío en RegistroBus
-- Si ya existen, ON CONFLICT ignorará (asumiendo que hubiese constraint, pero no lo hay por defecto para nombre).
-- Para evitar duplicados en desarrollo, limpiamos y reinsertamos (solo para este entorno de prototipo).
TRUNCATE TABLE sucursales CASCADE;

INSERT INTO sucursales (id, nombre, ranking, amenidades) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Flota Bolívar', 4.8, '{"WiFi", "Bus Cama", "TV"}'),
    ('22222222-2222-2222-2222-222222222222', 'Trans Copacabana', 4.5, '{"WiFi", "Bus Cama", "Baño"}'),
    ('33333333-3333-3333-3333-333333333333', 'El Dorado', 4.2, '{"TV", "Aire Acondicionado"}');

-- Nota: Como 'usuarios' ya existía en v1 con otra estructura, vamos a recrearla
-- conectada apropiadamente al sistema de autenticación nativo de Supabase (auth.users).
DROP TABLE IF EXISTS usuarios CASCADE;

-- 2. Tabla de Usuarios (RBAC) extendiendo auth.users
CREATE TABLE usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    nombre_completo TEXT,
    rol TEXT CHECK (rol IN ('cliente', 'admin_sucursal', 'conductor')) DEFAULT 'cliente',
    sucursal_id UUID REFERENCES sucursales(id) NULL,  -- Solo para admins de sucursal o conductores
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar y configurar RLS (Row Level Security)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Lectura pública para poder mostrar nombres de conductores, etc.
CREATE POLICY "Lectura publica de perfiles de usuario" 
    ON usuarios FOR SELECT 
    USING (true);

-- Todos pueden actualizar su propio perfil
CREATE POLICY "Usuarios pueden actualizar su propio perfil"
    ON usuarios FOR UPDATE
    USING (auth.uid() = id);

-- NOTA IMPORTANTE PARA EL DESARROLLADOR:
-- En el dashboard de Supabase (SQL Editor) debes insertar el usuario administrador
-- usando las funciones de auth, por ejemplo:
-- 
-- INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
-- VALUES ('uuid-generado', 'admin@tbb.com', crypt('admin123456', gen_salt('bf')), NOW());
-- 
-- Alternativamente (recomendado), usa la capa de interfaz (Autenticación > Add User) 
-- para invitar o crear credenciales con admin@tbb.com / admin123456. Luego haz insert:
-- INSERT INTO usuarios (id, email, rol, nombre_completo) VALUES ('id-del-auth-creado$', 'admin@tbb.com', 'admin_sucursal', 'Admin Dev');
