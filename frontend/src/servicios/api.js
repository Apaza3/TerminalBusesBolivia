/**
 * api.js — Supabase queries, datos normalizados al shape que usa el frontend.
 */
import { supabase } from './supabase';

// DB usa "Beni"/"Pando"/"Chuquisaca"; el contexto usa "Trinidad"/"Cobija"/"Sucre"
const DB_TO_DEPT = {
  'Beni': 'Trinidad', 'Pando': 'Cobija', 'Chuquisaca': 'Sucre',
};
const normDept = (nombre) => DB_TO_DEPT[nombre] || nombre || '';

// ── Sucursales ────────────────────────────────────────────
export async function getSucursales() {
  const { data, error } = await supabase
    .from('sucursales')
    .select('id,nombre,ciudad,logo_emoji,color_accent,ranking,amenidades,departamentos(nombre)')
    .eq('activo', true)
    .order('ranking', { ascending: false });
  if (error) { console.error('getSucursales:', error.message); return []; }
  return data.map(s => ({
    ...s,
    logoEmoji:   s.logo_emoji   || '🚌',
    colorAccent: s.color_accent || '#2563eb',
    departamento: normDept(s.departamentos?.nombre),
  }));
}

export async function getSucursal(id) {
  const { data, error } = await supabase
    .from('sucursales')
    .select('*,departamentos(nombre)')
    .eq('id', id)
    .single();
  if (error) return null;
  return {
    ...data,
    logoEmoji:   data.logo_emoji   || '🚌',
    colorAccent: data.color_accent || '#2563eb',
    departamento: normDept(data.departamentos?.nombre),
  };
}

// ── Viajes ────────────────────────────────────────────────
export async function buscarViajes(origen, destino, fecha) {
  if (!origen || !destino || !fecha) return [];
  const { data, error } = await supabase
    .from('viajes')
    .select(`
      id,origen,destino,fecha_salida,precio,duracion_estimada,estado,anden,
      sucursales(id,nombre,logo_emoji,color_accent,ranking,amenidades,ciudad),
      buses(id,capacidad,pisos,filas_piso_1,filas_piso_2,columnas,tiene_bano,configuracion_asientos,amenidades)
    `)
    .eq('origen', origen)
    .eq('destino', destino)
    .gte('fecha_salida', `${fecha}T00:00:00`)
    .lte('fecha_salida', `${fecha}T23:59:59`)
    .in('estado', ['programado', 'autorizado'])
    .order('fecha_salida');
  if (error) { console.error('buscarViajes:', error.message); return []; }
  return (data || []).map(v => ({
    ...v,
    sucursales: v.sucursales ? {
      ...v.sucursales,
      logoEmoji:   v.sucursales.logo_emoji   || '🚌',
      colorAccent: v.sucursales.color_accent || '#2563eb',
    } : null,
  }));
}

export async function getViaje(id) {
  const { data, error } = await supabase
    .from('viajes')
    .select(`
      id,origen,destino,fecha_salida,precio,duracion_estimada,estado,anden,
      sucursales(id,nombre,logo_emoji,color_accent,ranking,amenidades,ciudad,telefono),
      buses(id,capacidad,pisos,filas_piso_1,filas_piso_2,columnas,tiene_bano,configuracion_asientos,amenidades,marca,modelo)
    `)
    .eq('id', id)
    .single();
  if (error) { console.error('getViaje:', error.message); return null; }
  return data;
}

export async function getViajesSucursal(sucursalId, fecha) {
  const f = fecha || new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('viajes')
    .select('id,origen,destino,fecha_salida,precio,duracion_estimada,estado,anden,buses(id,placa,capacidad)')
    .eq('sucursal_id', sucursalId)
    .gte('fecha_salida', `${f}T00:00:00`)
    .lte('fecha_salida', `${f}T23:59:59`)
    .order('fecha_salida');
  if (error) return [];
  return data || [];
}
