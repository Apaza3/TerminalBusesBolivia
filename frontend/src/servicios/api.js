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
  if (!origen || !destino) return [];
  let q = supabase
    .from('viajes')
    .select(`
      id,origen,destino,fecha_salida,precio,duracion_estimada,estado,anden,
      sucursales(id,nombre,logo_emoji,color_accent,ranking,amenidades,ciudad),
      buses(id,capacidad,pisos,filas_piso_1,filas_piso_2,columnas,tiene_bano,configuracion_asientos,amenidades)
    `)
    .eq('origen', origen)
    .eq('destino', destino)
    .in('estado', ['programado', 'autorizado'])
    .order('fecha_salida');
  if (fecha) {
    q = q.gte('fecha_salida', `${fecha}T00:00:00`).lte('fecha_salida', `${fecha}T23:59:59`);
  } else {
    const hoy = new Date().toISOString().split('T')[0];
    const limite = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    q = q.gte('fecha_salida', `${hoy}T00:00:00`).lte('fecha_salida', `${limite}T23:59:59`);
  }
  const { data, error } = await q;
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

export async function getBusesSucursal(sucursalId) {
  const { data, error } = await supabase
    .from('buses')
    .select('id,placa,marca,modelo,capacidad,pisos,columnas,tiene_bano,amenidades,estado,categoria,anio')
    .eq('sucursal_id', sucursalId)
    .order('placa');
  if (error) { console.error('getBusesSucursal:', error.message); return []; }
  return data || [];
}

export async function getUsuariosSucursal(sucursalId) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id,email,nombre_completo,ci,telefono,rol,activo,departamentos(nombre)')
    .eq('sucursal_id', sucursalId)
    .in('rol', ['admin_sucursal', 'cajero', 'conductor'])
    .order('rol');
  if (error) { console.error('getUsuariosSucursal:', error.message); return []; }
  return (data || []).map(u => ({ ...u, departamento: u.departamentos?.nombre || '' }));
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

export async function getViajesSucursalProximos(sucursalId, dias = 30) {
  const hoy = new Date().toISOString().split('T')[0];
  const limite = new Date(Date.now() + dias * 86400000).toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('viajes')
    .select('id,origen,destino,fecha_salida,precio,duracion_estimada,estado,anden,buses(id,placa,capacidad,pisos,tiene_bano,amenidades)')
    .eq('sucursal_id', sucursalId)
    .gte('fecha_salida', `${hoy}T00:00:00`)
    .lte('fecha_salida', `${limite}T23:59:59`)
    .in('estado', ['programado','autorizado'])
    .order('fecha_salida')
    .limit(80);
  if (error) { console.error('getViajesSucursalProximos:', error.message); return []; }
  return data || [];
}

export async function getTodosViajesSucursal(sucursalId) {
  const { data, error } = await supabase
    .from('viajes')
    .select('id,origen,destino,fecha_salida,precio,duracion_estimada,estado,anden,buses(id,placa,capacidad,pisos,tiene_bano,amenidades)')
    .eq('sucursal_id', sucursalId)
    .order('fecha_salida')
    .limit(120);
  if (error) { console.error('getTodosViajesSucursal:', error.message); return []; }
  return data || [];
}

export async function getTodosViajesPorCiudad(ciudad) {
  const { data, error } = await supabase
    .from('viajes')
    .select('id,origen,destino,fecha_salida,precio,duracion_estimada,estado,anden,sucursales(id,nombre,logo_emoji,color_accent,ranking,ciudad),buses(id,placa,capacidad,pisos,tiene_bano,amenidades)')
    .eq('origen', ciudad)
    .order('fecha_salida')
    .limit(120);
  if (error) { console.error('getTodosViajesPorCiudad:', error.message); return []; }
  return data || [];
}

export async function buscarClientePorCI(ci) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('ci,nombre_completo,telefono,email')
    .eq('ci', ci)
    .eq('rol', 'cliente')
    .maybeSingle();
  if (error || !data) return null;
  return {
    ci: data.ci,
    nombreCompleto: data.nombre_completo || '',
    telefono: data.telefono || '',
    email: data.email || '',
  };
}

export async function getTripulacionSucursal(sucursalId) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id,nombre_completo,ci,rol,estado,rutas_conocidas')
    .eq('sucursal_id', sucursalId)
    .in('rol', ['conductor', 'copiloto'])
    .eq('activo', true)
    .order('nombre_completo');
  if (error) { console.error('getTripulacionSucursal:', error.message); return []; }
  return (data || []).map(u => ({ ...u, nombre: u.nombre_completo }));
}

export async function updateEstadoBus(id, estado) {
  const { error } = await supabase.from('buses').update({ estado }).eq('id', id);
  if (error) console.error('updateEstadoBus:', error.message);
}

export async function updateEstadoTripulacion(id, estado) {
  const { error } = await supabase.from('tripulacion').update({ estado }).eq('id', id);
  if (error) console.error('updateEstadoTripulacion:', error.message);
}

export async function updatePrecioViaje(id, precio) {
  const { data, error } = await supabase.from('viajes').update({ precio }).eq('id', id).select('id').single();
  if (error) { console.error('updatePrecioViaje:', error.message); return null; }
  return data;
}

export async function updatePreciosGlobal(sucursalId, incremento) {
  const { data: viajes, error: fetchErr } = await supabase
    .from('viajes')
    .select('id,precio')
    .eq('sucursal_id', sucursalId)
    .in('estado', ['programado', 'autorizado']);
  if (fetchErr) { console.error('updatePreciosGlobal:', fetchErr.message); return { total: 0 }; }
  let total = 0;
  for (const v of viajes || []) {
    const nuevo = Math.max(0, (v.precio || 0) + incremento);
    const { error } = await supabase.from('viajes').update({ precio: nuevo }).eq('id', v.id);
    if (!error) total++;
  }
  return { total };
}

export async function getViajesPorCiudad(ciudad, dias = 30) {
  const hoy = new Date().toISOString().split('T')[0];
  const limite = new Date(Date.now() + dias * 86400000).toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('viajes')
    .select('id,origen,destino,fecha_salida,precio,duracion_estimada,estado,anden,sucursales(id,nombre,logo_emoji,color_accent,ranking,ciudad),buses(id,placa,capacidad,pisos,tiene_bano,amenidades)')
    .eq('origen', ciudad)
    .gte('fecha_salida', `${hoy}T00:00:00`)
    .lte('fecha_salida', `${limite}T23:59:59`)
    .in('estado', ['programado','autorizado'])
    .order('fecha_salida')
    .limit(80);
  if (error) { console.error('getViajesPorCiudad:', error.message); return []; }
  return data || [];
}
