-- Migración v1.1: Módulo de Horarios y Selección de Rutas
-- Fecha: 2026-03-22
-- Descripción: Agregar columnas necesarias para filtrado de viajes, amenidades y precios.

-- Agregar amenidades y logo a sucursales
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS amenidades TEXT[] DEFAULT '{}';

-- Agregar precio, duración y estado a viajes
ALTER TABLE viajes ADD COLUMN IF NOT EXISTS precio DECIMAL DEFAULT 0;
ALTER TABLE viajes ADD COLUMN IF NOT EXISTS duracion_estimada TEXT;
ALTER TABLE viajes ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'programado';
