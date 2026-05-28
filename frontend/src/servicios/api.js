/**
 * api.js — Supabase queries, datos normalizados al shape que usa el frontend.
 * Columnas reales verificadas contra schema Supabase (mayo 2025).
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
  return (data || []).map(s => ({
    ...s,
    logoEmoji:    s.logo_emoji   || '🚌',
    colorAccent:  s.color_accent || '#2563eb',
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
    logoEmoji:    data.logo_emoji   || '🚌',
    colorAccent:  data.color_accent || '#2563eb',
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
    const hoy    = new Date().toISOString().split('T')[0];
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

/** Todos los buses de la empresa (todos los departamentos) con info de departamento */
export async function getBusesEmpresa(sucursalId) {
  const { data: suc } = await supabase.from('sucursales').select('nombre').eq('id', sucursalId).single();
  if (!suc) return getBusesSucursal(sucursalId);
  const { data: sucs } = await supabase.from('sucursales').select('id').eq('nombre', suc.nombre);
  const ids = (sucs || []).map(s => s.id);
  const { data, error } = await supabase
    .from('buses')
    .select('id,placa,marca,modelo,capacidad,pisos,columnas,tiene_bano,amenidades,estado,categoria,anio,sucursales!sucursal_id(departamentos(nombre))')
    .in('sucursal_id', ids)
    .order('placa');
  if (error) { console.error('getBusesEmpresa:', error.message); return []; }
  return (data || []).map(b => ({ ...b, departamento: b.sucursales?.departamentos?.nombre || '—' }));
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

/** Todos los empleados de la misma empresa (por nombre de sucursal) */
export async function getUsuariosEmpresa(sucursalId) {
  const { data: suc } = await supabase.from('sucursales').select('nombre').eq('id', sucursalId).single();
  if (!suc) return getUsuariosSucursal(sucursalId);
  const { data: sucs } = await supabase.from('sucursales').select('id').eq('nombre', suc.nombre);
  const ids = (sucs || []).map(s => s.id);
  const { data, error } = await supabase
    .from('usuarios')
    .select('id,email,nombre_completo,ci,telefono,rol,activo,sucursales(nombre),departamentos(nombre)')
    .in('sucursal_id', ids)
    .in('rol', ['admin_sucursal', 'cajero', 'conductor'])
    .order('rol');
  if (error) { console.error('getUsuariosEmpresa:', error.message); return []; }

  // Bus asignado por conductor: próximo viaje de cada conductor
  const conductorIds = (data || []).filter(u => u.rol === 'conductor').map(u => u.id);
  const busMap = {};
  if (conductorIds.length > 0) {
    const hoy = new Date().toISOString();
    const { data: trips } = await supabase
      .from('tripulacion')
      .select('usuario_id,viajes!conductor_id(fecha_salida,buses(placa))')
      .in('usuario_id', conductorIds)
      .gte('viajes.fecha_salida', hoy)
      .limit(1);
    for (const t of (trips || [])) {
      const proximos = (t.viajes || []).sort((a, b) => a.fecha_salida.localeCompare(b.fecha_salida));
      if (proximos[0]?.buses?.placa) busMap[t.usuario_id] = proximos[0].buses.placa;
    }
  }

  return (data || []).map(u => ({
    ...u,
    departamento:  u.departamentos?.nombre || '—',
    sucursalNombre: u.sucursales?.nombre   || '—',
    busAsignado:   busMap[u.id] || '—',
  }));
}

export async function actualizarUsuario(id, campos) {
  const { error } = await supabase.from('usuarios').update(campos).eq('id', id);
  return !error;
}

export async function eliminarUsuario(id) {
  const { error } = await supabase.from('usuarios').update({ activo: false }).eq('id', id);
  return !error;
}

export async function getViajesSucursal(sucursalId, fecha) {
  const f = fecha || new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('viajes')
    .select('id,origen,destino,fecha_salida,precio,duracion_estimada,estado,anden,buses(id,placa,capacidad),tripulacion!conductor_id(nombre,ci,rol)')
    .eq('sucursal_id', sucursalId)
    .gte('fecha_salida', `${f}T00:00:00`)
    .lte('fecha_salida', `${f}T23:59:59`)
    .order('fecha_salida');
  if (error) return [];
  return (data || []).map(v => ({ ...v, conductorNombre: v.tripulacion?.nombre || '—', conductorCI: v.tripulacion?.ci || '' }));
}

export async function getViajesSucursalProximos(sucursalId, dias = 30) {
  const hoy    = new Date().toISOString().split('T')[0];
  const limite = new Date(Date.now() + dias * 86400000).toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('viajes')
    .select('id,origen,destino,fecha_salida,precio,duracion_estimada,estado,anden,buses(id,placa,capacidad,pisos,tiene_bano,amenidades),tripulacion!conductor_id(nombre,ci)')
    .eq('sucursal_id', sucursalId)
    .gte('fecha_salida', `${hoy}T00:00:00`)
    .lte('fecha_salida', `${limite}T23:59:59`)
    .in('estado', ['programado', 'autorizado'])
    .order('fecha_salida')
    .limit(80);
  if (error) { console.error('getViajesSucursalProximos:', error.message); return []; }
  return (data || []).map(v => ({ ...v, conductorNombre: v.tripulacion?.nombre || '—', conductorCI: v.tripulacion?.ci || '' }));
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
    ci:             data.ci,
    nombreCompleto: data.nombre_completo || '',
    telefono:       data.telefono || '',
    email:          data.email || '',
  };
}

export async function getTripulacionSucursal(sucursalId) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id,nombre_completo,ci,rol,activo')
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
    .from('viajes').select('id,precio').eq('sucursal_id', sucursalId)
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
  const hoy    = new Date().toISOString().split('T')[0];
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

// ── Asientos ──────────────────────────────────────────────
/** Devuelve asientos ocupados (reservados) + temporalmente bloqueados */
export async function getAsientosOcupados(viajeId) {
  // Reservas confirmadas
  const { data: resData } = await supabase
    .from('reservas')
    .select('asientos')
    .eq('viaje_id', viajeId)
    .in('estado', ['pendiente', 'pagado', 'autorizado']);
  const ocupados = (resData || []).flatMap(r => r.asientos || []);
  return [...new Set(ocupados)];
}

/** Devuelve asientos temporalmente bloqueados por OTROS usuarios */
export async function getAsientosBloqueados(viajeId, excludeUserId = null) {
  const ahora = new Date().toISOString();
  let q = supabase
    .from('asientos_viaje')
    .select('numero_asiento')
    .eq('viaje_id', viajeId)
    .eq('estado', 'pendiente')
    .gt('bloqueado_hasta', ahora);
  if (excludeUserId) q = q.neq('bloqueado_por', excludeUserId);
  const { data } = await q;
  return (data || []).map(a => a.numero_asiento);
}

/** Bloquear asientos temporalmente (10 min) */
export async function bloquearAsientos(viajeId, asientos, usuarioId) {
  if (!asientos?.length) return;
  const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const rows = asientos.map(numero_asiento => ({
    viaje_id:        viajeId,
    numero_asiento,
    estado:          'pendiente',
    bloqueado_hasta: expiry,
    bloqueado_por:   usuarioId || null,
    usuario_id:      usuarioId || null,
  }));
  const { error } = await supabase
    .from('asientos_viaje')
    .upsert(rows, { onConflict: 'viaje_id,numero_asiento' });
  if (error) console.error('bloquearAsientos:', error.message);
}

/** Liberar asientos del usuario (al salir sin completar reserva) */
export async function liberarAsientos(viajeId, asientos, usuarioId) {
  if (!asientos?.length) return;
  let q = supabase.from('asientos_viaje').delete()
    .eq('viaje_id', viajeId)
    .in('numero_asiento', asientos)
    .eq('estado', 'pendiente');
  if (usuarioId) q = q.eq('bloqueado_por', usuarioId);
  await q;
}

// ── Reservas ──────────────────────────────────────────────
/**
 * Crea reserva en Supabase.
 * estado: 'pendiente' (esperando pago) | 'pagado' (pago confirmado) | 'autorizado' (cajero)
 */
export async function crearReservaSupabase({
  viajeId, usuarioId, asientos, monto,
  emailCliente, telefonoCliente, metodoPago,
  estado = 'pagado',
  requiereAutorizacion = false,
  qrData = null,
  expiraEn = null,
  nombre, origen, destino, fechaSalida, empresa,
}) {
  const insertObj = {
    viaje_id:          viajeId,
    usuario_id:        usuarioId        || null,
    asientos,
    monto,
    email_cliente:     emailCliente     || '',
    telefono_cliente:  telefonoCliente  || null,
    metodo_pago:       metodoPago       || 'efectivo',
    estado,
    requiere_autorizacion: requiereAutorizacion,
  };
  if (qrData)   insertObj.qr_data    = qrData;
  if (expiraEn) insertObj.expira_en  = expiraEn;

  const { data, error } = await supabase
    .from('reservas').insert(insertObj).select('id').single();
  if (error) { console.error('crearReservaSupabase:', error.message); return { error: error.message }; }

  return { id: data.id };
}

export async function updateReservaEstado(reservaId, estado) {
  const { error } = await supabase.from('reservas').update({ estado }).eq('id', reservaId);
  if (error) { console.error('updateReservaEstado:', error.message); return false; }
  return true;
}

export async function getReservaById(reservaId) {
  const { data, error } = await supabase
    .from('reservas')
    .select('id,estado,monto,metodo_pago,asientos,viaje_id,email_cliente,creado_en,viajes(origen,destino,fecha_salida,sucursales(nombre))')
    .eq('id', reservaId)
    .single();
  if (error) return null;
  return data;
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
    pasajeroCI:     r.usuarios?.ci   || '—',
    origen:         r.viajes?.origen || '',
    destino:        r.viajes?.destino || '',
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
      id, viaje_id, asientos, monto, estado, metodo_pago, creado_en,
      viajes(id, origen, destino, fecha_salida, sucursal_id,
        sucursales(id, nombre),
        buses(placa)
      )
    `)
    .eq('usuario_id', usuarioId)
    .order('creado_en', { ascending: false });
  if (error) return [];
  return (data || []).map(r => ({
    id:             r.id,
    viajeId:        r.viaje_id,
    sucursalId:     r.viajes?.sucursal_id       || null,
    sucursalNombre: r.viajes?.sucursales?.nombre || null,
    origen:         r.viajes?.origen             || '—',
    destino:        r.viajes?.destino            || '—',
    fechaSalida:    r.viajes?.fecha_salida       || null,
    asientos:       r.asientos                   || [],
    busPlaca:       r.viajes?.buses?.placa       || null,
    precio:         r.monto                      || 0,
    metodoPago:     r.metodo_pago                || 'efectivo',
    estado:         r.estado                     || 'pendiente',
    creadoEn:       r.creado_en,
  }));
}

// ── Boletos ──────────────────────────────────────────────
/**
 * Crea boletos para todos los asientos de una reserva.
 * Columnas reales: nombre_pasajero, ci_pasajero, precio_individual, qr_token (auto), estado
 */
export async function crearBoletosBatch({
  reservaId, viajeId, asientos, datosPasajeros,
  precioUnitario, sucursalId = null, departamentoId = null, horarioSalida = null,
}) {
  const rows = asientos.map(asiento => {
    const p = datosPasajeros?.[asiento] || {};
    return {
      reserva_id:       reservaId,
      viaje_id:         viajeId,
      asiento,
      nombre_pasajero:  p.nombre       || '',
      ci_pasajero:      p.ci           || '',
      email_pasajero:   p.email        || null,
      es_infante:       p.esInfante    || false,
      declaraciones:    {
        lleva1000:       p.lleva1000       || false,
        llevaAnimales:   p.llevaAnimales   || false,
        llevaProductos:  p.llevaProductos  || false,
      },
      precio_individual: precioUnitario,
      estado:            'autorizado',
      sucursal_id:       sucursalId    || null,
      departamento_id:   departamentoId || null,
      horario_salida:    horarioSalida || null,
    };
  });
  const { data, error } = await supabase
    .from('boletos')
    .insert(rows)
    .select('id,asiento,nombre_pasajero,ci_pasajero,qr_token,precio_individual,estado,email_pasajero,es_infante,declaraciones');
  if (error) { console.error('crearBoletosBatch:', error.message); return { error: error.message }; }
  return { boletos: data || [], ok: true };
}

/** Boletos de una reserva específica */
export async function getBoletosReserva(reservaId) {
  const { data, error } = await supabase
    .from('boletos')
    .select('id,asiento,nombre_pasajero,ci_pasajero,email_pasajero,qr_token,precio_individual,estado,es_infante,declaraciones,creado_en')
    .eq('reserva_id', reservaId)
    .neq('estado', 'cancelado');
  if (error) { console.error('getBoletosReserva:', error.message); return []; }
  return (data || []).map(b => ({
    id:             b.id,
    asiento:        b.asiento,
    pasajeroNombre: b.nombre_pasajero,
    pasajeroCI:     b.ci_pasajero,
    email:          b.email_pasajero,
    qrToken:        b.qr_token,
    precio:         b.precio_individual,
    estado:         b.estado,
    esInfante:      b.es_infante,
    declaraciones:  b.declaraciones || {},
  }));
}

/** Todos los boletos de un viaje (manifiesto del conductor) */
export async function getBoletosViaje(viajeId) {
  const { data, error } = await supabase
    .from('boletos')
    .select('id,asiento,nombre_pasajero,ci_pasajero,qr_token,precio_individual,estado,es_infante,reserva_id,declaraciones')
    .eq('viaje_id', viajeId)
    .neq('estado', 'cancelado')
    .order('asiento');
  if (error) { console.error('getBoletosViaje:', error.message); return []; }
  return (data || []).map(b => ({
    id:             b.id,
    asiento:        b.asiento,
    pasajeroNombre: b.nombre_pasajero,
    pasajeroCI:     b.ci_pasajero,
    qrToken:        b.qr_token,
    precio:         b.precio_individual,
    estado:         b.estado,
    abordado:       b.estado === 'validado',
    esInfante:      b.es_infante,
    declaraciones:  b.declaraciones || {},
  }));
}

/** Buscar boleto por qr_token (página pública de boleto) */
export async function getBoletoPorQR(qrToken) {
  const { data, error } = await supabase
    .from('boletos')
    .select(`
      id,asiento,nombre_pasajero,ci_pasajero,qr_token,precio_individual,estado,es_infante,declaraciones,viaje_id,
      viajes!viaje_id(origen,destino,fecha_salida,anden,
        sucursales(id,nombre,logo_emoji,color_accent),
        buses(placa,marca,modelo)
      ),
      reservas!reserva_id(email_cliente)
    `)
    .eq('qr_token', qrToken)
    .maybeSingle();
  if (error || !data) return null;
  const viaje = data.viajes || {};
  return {
    id:             data.id,
    asiento:        data.asiento,
    pasajeroNombre: data.nombre_pasajero,
    pasajeroCI:     data.ci_pasajero,
    qrToken:        data.qr_token,
    precio:         data.precio_individual,
    estado:         data.estado,
    esInfante:      data.es_infante,
    declaraciones:  data.declaraciones || {},
    email:          data.reservas?.email_cliente,
    viajeId:        data.viaje_id,
    origen:         viaje.origen    || '—',
    destino:        viaje.destino   || '—',
    fechaSalida:    viaje.fecha_salida,
    anden:          viaje.anden,
    empresa:        viaje.sucursales?.nombre       || '—',
    empresaLogo:    viaje.sucursales?.logo_emoji   || '🚌',
    empresaColor:   viaje.sucursales?.color_accent || '#3b82f6',
    busPlaca:       viaje.buses?.placa             || '',
  };
}

/** Pasajeros de un viaje con estado de abordaje */
export async function getReservasViaje(viajeId) {
  const { data, error } = await supabase
    .from('boletos')
    .select(`
      id, asiento, nombre_pasajero, ci_pasajero, precio_individual,
      qr_token, estado, escaneado_en,
      reservas!reserva_id(email_cliente, telefono_cliente)
    `)
    .eq('viaje_id', viajeId)
    .neq('estado', 'cancelado')
    .order('asiento');
  if (error) { console.error('getReservasViaje:', error.message); return []; }
  return (data || []).map(b => ({
    reservaId:   b.id,
    asiento:     b.asiento,
    nombre:      b.nombre_pasajero || 'Pasajero',
    ci:          b.ci_pasajero     || '—',
    telefono:    b.reservas?.telefono_cliente || '—',
    email:       b.reservas?.email_cliente    || '',
    qr_token:    b.qr_token,
    abordado:    b.estado === 'validado',
    abordado_en: b.escaneado_en || null,
  }));
}

/** Marcar boleto como abordado (escaneado por conductor) */
export async function marcarBoletoValidado(boletoId, conductorUsuarioId) {
  const { error } = await supabase
    .from('boletos')
    .update({
      estado:        'validado',
      escaneado_en:  new Date().toISOString(),
      escaneado_por: conductorUsuarioId || null,
    })
    .eq('id', boletoId);
  if (error) { console.error('marcarBoletoValidado:', error.message); return false; }
  return true;
}

export async function updateViajeEstado(viajeId, estado) {
  const { error } = await supabase.from('viajes').update({ estado }).eq('id', viajeId);
  if (error) { console.error('updateViajeEstado:', error.message); return false; }
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
  const hoy    = new Date().toISOString().split('T')[0];
  const limite = new Date(Date.now() + dias * 86400000).toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('viajes')
    .select('id,origen,destino,fecha_salida,precio,duracion_estimada,estado,anden,sucursales(id,nombre,logo_emoji,color_accent,ranking,ciudad),buses(id,placa,capacidad,pisos,tiene_bano,amenidades)')
    .eq('origen', ciudad)
    .gte('fecha_salida', `${hoy}T00:00:00`)
    .lte('fecha_salida', `${limite}T23:59:59`)
    .in('estado', ['programado', 'autorizado'])
    .order('fecha_salida')
    .limit(80);
  if (error) { console.error('getViajesPorCiudad:', error.message); return []; }
  return data || [];
}

// ── Comentarios / Feedback ────────────────────────────────
export async function getComentariosSucursal(sucursalId) {
  const { data, error } = await supabase
    .from('comentarios')
    .select('id,puntuacion,comentario,nombre_usuario,categorias,creado_en,puntuaciones_detalle(aspecto,puntuacion)')
    .eq('sucursal_id', sucursalId)
    .order('creado_en', { ascending: false })
    .limit(50);
  if (error) { console.error('getComentariosSucursal:', error.message); return []; }
  return data || [];
}

export async function crearComentario({ sucursalId, usuarioId, nombreUsuario, puntuacion, comentario, categorias, departamentoId }) {
  const { data, error } = await supabase
    .from('comentarios')
    .insert({
      sucursal_id:     sucursalId,
      usuario_id:      usuarioId     || null,
      nombre_usuario:  nombreUsuario || 'Anónimo',
      puntuacion,
      comentario:      comentario || null,
      categorias:      categorias || [],
      departamento_id: departamentoId || null,
    })
    .select('id').single();
  if (error) { console.error('crearComentario:', error.message); return { error: error.message }; }
  return { id: data.id };
}

// ── Ventas (cajero) ────────────────────────────────────────
export async function registrarVenta({ reservaId, sucursalId, departamentoId, monto, cantidadBoletos, ruta, metodoPago, cajeroId }) {
  const { error } = await supabase.from('ventas').insert({
    reserva_id:        reservaId    || null,
    sucursal_id:       sucursalId   || null,
    departamento_id:   departamentoId || null,
    monto,
    cantidad_boletos:  cantidadBoletos || 1,
    ruta:              ruta || null,
    metodo_pago:       metodoPago   || 'efectivo',
    cajero_id:         cajeroId     || null,
  });
  if (error) console.error('registrarVenta:', error.message);
}

export async function getVentasSucursal(sucursalId, dias = 7) {
  const inicio = new Date(Date.now() - dias * 86400000).toISOString();
  const { data, error } = await supabase
    .from('ventas')
    .select('id,monto,cantidad_boletos,ruta,metodo_pago,fecha,usuarios!cajero_id(nombre_completo)')
    .eq('sucursal_id', sucursalId)
    .gte('fecha', inicio)
    .order('fecha', { ascending: false })
    .limit(200);
  if (error) { console.error('getVentasSucursal:', error.message); return []; }
  return data || [];
}
