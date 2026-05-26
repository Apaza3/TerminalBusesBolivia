/**
 * api.js — Supabase queries, datos normalizados al shape que usa el frontend.
 */
import { supabase } from './supabase';

const normDept = (nombre) => nombre || '';

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
    .in('estado', ['programado', 'autorizado', 'en_viaje'])
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
  const { error } = await supabase.from('viajes').update({ precio }).eq('id', id);
  if (error) { console.error('updatePrecioViaje:', error.message); return { ok: false, error: error.message }; }
  return { ok: true };
}

export async function updatePreciosGlobal(sucursalId, incremento) {
  const { data: viajes, error: fetchErr } = await supabase
    .from('viajes')
    .select('id,precio')
    .eq('sucursal_id', sucursalId)
    .in('estado', ['programado', 'autorizado']);
  if (fetchErr) { console.error('updatePreciosGlobal:', fetchErr.message); return { ok: false, error: fetchErr.message }; }
  let total = 0;
  for (const v of viajes || []) {
    const nuevo = Math.max(0, (v.precio || 0) + incremento);
    const { error } = await supabase.from('viajes').update({ precio: nuevo }).eq('id', v.id);
    if (!error) total++;
  }
  return { ok: true, total };
}

export async function getTripulacionByUsuario(usuarioId) {
  const { data, error } = await supabase
    .from('tripulacion')
    .select('id,nombre,ci,rol,estado')
    .eq('usuario_id', usuarioId)
    .single();
  if (error) { console.error('getTripulacionByUsuario:', error.message); return null; }
  return data;
}

export async function getViajesConductor(tripulacionId, dias = 1) {
  const hoy = new Date().toISOString().split('T')[0];
  const limite = new Date(Date.now() + dias * 86400000).toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('viajes')
    .select('id,origen,destino,fecha_salida,precio,duracion_estimada,estado,anden,sucursales(id,nombre),buses(id,placa,capacidad,pisos)')
    .eq('conductor_id', tripulacionId)
    .gte('fecha_salida', `${hoy}T00:00:00`)
    .lte('fecha_salida', `${limite}T23:59:59`)
    .order('fecha_salida');
  if (error) { console.error('getViajesConductor:', error.message); return []; }
  return data || [];
}

export async function getReservasViaje(viajeId) {
  const { data, error } = await supabase
    .from('reservas')
    .select('id,asientos,estado,email_cliente,telefono_cliente,metodo_pago,usuarios(nombre_completo,ci)')
    .eq('viaje_id', viajeId)
    .neq('estado', 'cancelada');
  if (error) { console.error('getReservasViaje:', error.message); return []; }
  return (data || [])
    .flatMap(r => (r.asientos || []).map(asiento => ({
      asiento,
      nombre: r.usuarios?.nombre_completo || r.email_cliente || 'Pasajero',
      ci:     r.usuarios?.ci || '—',
      telefono: r.telefono_cliente || '—',
      email:    r.email_cliente || '',
      reservaId: r.id,
    })))
    .sort((a, b) => a.asiento.localeCompare(b.asiento, undefined, { numeric: true }));
}

export async function updateViajeEstado(viajeId, estado) {
  const { error } = await supabase.from('viajes').update({ estado }).eq('id', viajeId);
  if (error) { console.error('updateViajeEstado:', error.message); return false; }
  return true;
}

export async function getReservasSucursal(sucursalId) {
  const inicio = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const { data: vs } = await supabase
    .from('viajes').select('id').eq('sucursal_id', sucursalId)
    .gte('fecha_salida', `${inicio}T00:00:00`);
  if (!vs?.length) return [];
  const { data, error } = await supabase
    .from('reservas')
    .select('id,viaje_id,asientos,monto,estado,email_cliente,telefono_cliente,metodo_pago,creado_en,usuarios(nombre_completo,ci),viajes(origen,destino,fecha_salida)')
    .in('viaje_id', vs.map(v => v.id))
    .order('creado_en', { ascending: false })
    .limit(200);
  if (error) { console.error('getReservasSucursal:', error.message); return []; }
  return (data || []).map(r => ({
    ...r,
    pasajeroNombre: r.usuarios?.nombre_completo || r.email_cliente || 'Pasajero',
    pasajeroCI:     r.usuarios?.ci || '—',
    origen:         r.viajes?.origen     || '',
    destino:        r.viajes?.destino    || '',
    fechaSalida:    r.viajes?.fecha_salida || '',
    creadoEn:       r.creado_en,
    precio:         r.monto,
    metodoPago:     r.metodo_pago,
  }));
}

export async function getReservasByUsuario(usuarioId) {
  const { data, error } = await supabase
    .from('reservas')
    .select(`
      id, viaje_id, asientos, monto, estado, metodo_pago, created_at,
      viajes(id, origen, destino, fecha_salida, sucursal_id,
        sucursales(id, nombre),
        buses(placa)
      )
    `)
    .eq('usuario_id', usuarioId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data || []).map(r => ({
    id:             r.id,
    viajeId:        r.viaje_id,
    sucursalId:     r.viajes?.sucursal_id   || null,
    sucursalNombre: r.viajes?.sucursales?.nombre || null,
    origen:         r.viajes?.origen        || '—',
    destino:        r.viajes?.destino       || '—',
    fechaSalida:    r.viajes?.fecha_salida  || null,
    asientos:       r.asientos              || [],
    busPlaca:       r.viajes?.buses?.placa  || null,
    precio:         r.monto                 || 0,
    metodoPago:     r.metodo_pago           || 'efectivo',
    estado:         r.estado                || 'confirmada',
    creadoEn:       r.created_at,
  }));
}

export async function getAsientosOcupados(viajeId) {
  const { data, error } = await supabase
    .from('reservas').select('asientos').eq('viaje_id', viajeId).neq('estado', 'cancelada');
  if (error) return [];
  return (data || []).flatMap(r => r.asientos || []);
}

export async function crearReservaSupabase({ viajeId, usuarioId, asientos, monto, emailCliente, telefonoCliente, metodoPago, nombre, origen, destino, fechaSalida, empresa }) {
  const { data, error } = await supabase
    .from('reservas')
    .insert({
      viaje_id:         viajeId,
      usuario_id:       usuarioId   || null,
      asientos,
      monto,
      email_cliente:    emailCliente    || '',
      telefono_cliente: telefonoCliente || null,
      metodo_pago:      metodoPago      || 'efectivo',
      estado:           'confirmada',
    })
    .select('id').single();
  if (error) { console.error('crearReservaSupabase:', error.message); return { error: error.message }; }

  // Enviar email de confirmación (sin bloquear)
  if (emailCliente) {
    const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://eoiindqtjhvyyoahnpcp.supabase.co';
    const ANON_KEY     = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
    fetch(`${SUPABASE_URL}/functions/v1/send-booking-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
      body: JSON.stringify({ email: emailCliente, nombre, origen, destino, fechaSalida, asientos, monto, empresa, reservaId: data.id }),
    }).catch(() => {});
  }

  return { id: data.id };
}

export async function updateReservaEstado(reservaId, estado) {
  const { error } = await supabase.from('reservas').update({ estado }).eq('id', reservaId);
  if (error) { console.error('updateReservaEstado:', error.message); return false; }
  return true;
}

export async function getViajesHistoricosSucursal(sucursalId, dias = 30) {
  const inicio = new Date(Date.now() - dias * 86400000).toISOString().split('T')[0];
  const hoy    = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('viajes')
    .select('id,origen,destino,fecha_salida,precio,duracion_estimada,estado,buses(placa,capacidad)')
    .eq('sucursal_id', sucursalId)
    .lt('fecha_salida', `${hoy}T00:00:00`)
    .gte('fecha_salida', `${inicio}T00:00:00`)
    .in('estado', ['completado', 'en_viaje', 'cancelado'])
    .order('fecha_salida', { ascending: false })
    .limit(120);
  if (error) { console.error('getViajesHistoricosSucursal:', error.message); return []; }
  return data || [];
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
