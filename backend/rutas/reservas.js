const { Router } = require('express');
const { supabaseAdmin } = require('../servicios/supabase');
const { requireAuth, requireRol, optionalAuth } = require('../middleware/auth');

const router = Router();

// GET /api/reservas — listar reservas (propias o todas para staff)
router.get('/', requireAuth, async (req, res) => {
    const { ci, itinerario_id, estado } = req.query;
    const rol = req.usuario.perfil?.rol;

    let query = supabaseAdmin
        .from('reservas')
        .select(`
            *,
            itinerario:itinerarios(
                salida_programada, estado,
                ruta:rutas(nombre, origen, destino),
                bus:buses(placa)
            ),
            boletos(numero_boleto, pasajero_nombre, pasajero_ci, precio, estado,
                    asiento:asientos_viaje(numero)),
            pago:pagos(metodo, estado, monto, confirmado_en)
        `)
        .order('creado_en', { ascending: false });

    // Clientes solo ven las suyas
    if (rol === 'cliente') {
        query = query.eq('usuario_id', req.usuario.id);
    } else {
        // Staff puede filtrar
        if (ci) query = query.eq('pasajero_ci', ci);
        if (itinerario_id) query = query.eq('itinerario_id', itinerario_id);
        if (estado) query = query.eq('estado', estado);
    }

    const { data, error } = await query.limit(200);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

// GET /api/reservas/buscar — buscar boleto por CI + fecha (R13, sin login)
router.get('/buscar', async (req, res) => {
    const { ci, fecha } = req.query;
    if (!ci) return res.status(400).json({ error: 'CI es requerido.' });

    let query = supabaseAdmin
        .from('reservas')
        .select(`
            id,
            pasajero_nombre,
            pasajero_ci,
            monto_total,
            estado,
            creado_en,
            itinerario:itinerarios(
                salida_programada, estado,
                ruta:rutas(nombre, origen, destino)
            ),
            boletos(numero_boleto, qr_codigo, pasajero_nombre, precio, estado,
                    asiento:asientos_viaje(numero))
        `)
        .eq('pasajero_ci', ci)
        .neq('estado', 'cancelada');

    if (fecha) {
        const inicio = `${fecha}T00:00:00.000Z`;
        const fin = `${fecha}T23:59:59.999Z`;
        query = query.gte('creado_en', inicio).lte('creado_en', fin);
    }

    const { data, error } = await query.order('creado_en', { ascending: false }).limit(20);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

// GET /api/reservas/:id
router.get('/:id', requireAuth, async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('reservas')
        .select(`
            *,
            itinerario:itinerarios(*, ruta:rutas(*), bus:buses(*), sucursal:sucursales(*)),
            boletos(*, asiento:asientos_viaje(numero, piso, tipo)),
            pago:pagos(*)
        `)
        .eq('id', req.params.id)
        .single();

    if (error) return res.status(404).json({ error: 'Reserva no encontrada.' });

    // Verificar acceso: cliente solo ve las suyas
    const rol = req.usuario.perfil?.rol;
    if (rol === 'cliente' && data.usuario_id !== req.usuario.id) {
        return res.status(403).json({ error: 'Acceso denegado.' });
    }

    res.json(data);
});

// POST /api/reservas — crear reserva + boletos + pago
router.post('/', optionalAuth, async (req, res) => {
    const {
        itinerario_id,
        pasajeros,           // [{ nombre, ci, asiento, equipaje_maletas?, equipaje_peso_kg? }]
        metodo_pago,
        origen_venta
    } = req.body;

    if (!itinerario_id || !pasajeros?.length || !metodo_pago) {
        return res.status(400).json({ error: 'itinerario_id, pasajeros[] y metodo_pago son requeridos.' });
    }

    // Obtener precio del itinerario
    const { data: itinerario } = await supabaseAdmin
        .from('itinerarios')
        .select('precio_base, estado, ruta:rutas(nombre, origen, destino)')
        .eq('id', itinerario_id)
        .single();

    if (!itinerario) return res.status(404).json({ error: 'Itinerario no encontrado.' });
    if (itinerario.estado !== 'programado') {
        return res.status(409).json({ error: 'El viaje ya no está disponible para reserva.' });
    }

    const asientosNros = pasajeros.map(p => p.asiento);

    // Verificar que los asientos estén bloqueados por este cliente (previene doble compra)
    const { data: asientosDB } = await supabaseAdmin
        .from('asientos_viaje')
        .select('id, numero, estado, bloqueado_por')
        .eq('itinerario_id', itinerario_id)
        .in('numero', asientosNros);

    const noDisponibles = (asientosDB || []).filter(a =>
        a.estado === 'reservado' || a.estado === 'abordado'
    );
    if (noDisponibles.length > 0) {
        return res.status(409).json({
            error: `Asientos ya reservados: ${noDisponibles.map(a => a.numero).join(', ')}`
        });
    }

    // Calcular monto (peso extra de equipaje)
    const PESO_INCLUIDO_KG = 25;
    const PRECIO_EXTRA_KG = 5; // Bs por kg extra
    let montoTotal = 0;

    const pasajerosConMonto = pasajeros.map(p => {
        let precio = itinerario.precio_base;
        let cobroEquipaje = 0;

        if (p.equipaje_peso_kg > PESO_INCLUIDO_KG) {
            cobroEquipaje = (p.equipaje_peso_kg - PESO_INCLUIDO_KG) * PRECIO_EXTRA_KG;
            precio += cobroEquipaje;
        }
        montoTotal += precio;

        return { ...p, precio, equipaje_cobro_extra: cobroEquipaje };
    });

    // Crear reserva
    const primerPasajero = pasajerosConMonto[0];
    const { data: reserva, error: reservaError } = await supabaseAdmin
        .from('reservas')
        .insert({
            itinerario_id,
            usuario_id: req.usuario?.id || null,
            pasajero_nombre: primerPasajero.nombre,
            pasajero_ci: primerPasajero.ci,
            pasajero_telefono: primerPasajero.telefono || null,
            monto_total: montoTotal,
            estado: 'pendiente',
            origen_venta: origen_venta || (req.usuario ? 'online' : 'mostrador')
        })
        .select()
        .single();

    if (reservaError) return res.status(500).json({ error: reservaError.message });

    // Crear boletos (uno por pasajero)
    const boletosInsert = pasajerosConMonto.map(p => {
        const asientoData = (asientosDB || []).find(a => a.numero === p.asiento);
        return {
            reserva_id: reserva.id,
            asiento_id: asientoData?.id,
            pasajero_nombre: p.nombre,
            pasajero_ci: p.ci,
            precio: p.precio,
            equipaje_maletas: p.equipaje_maletas || 0,
            equipaje_peso_kg: p.equipaje_peso_kg || 0,
            equipaje_cobro_extra: p.equipaje_cobro_extra || 0
        };
    });

    const { data: boletos, error: boletosError } = await supabaseAdmin
        .from('boletos')
        .insert(boletosInsert)
        .select('*, asiento:asientos_viaje(numero)');

    if (boletosError) {
        await supabaseAdmin.from('reservas').delete().eq('id', reserva.id);
        return res.status(500).json({ error: boletosError.message });
    }

    // Marcar asientos como reservados
    await supabaseAdmin
        .from('asientos_viaje')
        .update({ estado: 'reservado', bloqueado_hasta: null, bloqueado_por: null })
        .eq('itinerario_id', itinerario_id)
        .in('numero', asientosNros);

    // Crear registro de pago
    const estadoPago = metodo_pago === 'efectivo' ? 'confirmado' : 'pendiente';
    const { data: pago } = await supabaseAdmin
        .from('pagos')
        .insert({
            reserva_id: reserva.id,
            monto: montoTotal,
            metodo: metodo_pago,
            estado: estadoPago,
            confirmado_en: estadoPago === 'confirmado' ? new Date().toISOString() : null
        })
        .select()
        .single();

    // Si pago en efectivo, confirmar reserva de inmediato
    if (estadoPago === 'confirmado') {
        await supabaseAdmin
            .from('reservas')
            .update({ estado: 'confirmada' })
            .eq('id', reserva.id);
        reserva.estado = 'confirmada';
    }

    req.app.locals.broadcast('reserva_creada', {
        itinerarioId: itinerario_id,
        asientos: asientosNros,
        reservaId: reserva.id
    });

    res.status(201).json({ ...reserva, boletos, pago });
});

// POST /api/reservas/:id/cancelar
router.post('/:id/cancelar', requireAuth, async (req, res) => {
    const { data: reserva } = await supabaseAdmin
        .from('reservas')
        .select('*, boletos(asiento_id, asientos_viaje(itinerario_id))')
        .eq('id', req.params.id)
        .single();

    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada.' });

    const rol = req.usuario.perfil?.rol;
    if (rol === 'cliente' && reserva.usuario_id !== req.usuario.id) {
        return res.status(403).json({ error: 'Solo puedes cancelar tus propias reservas.' });
    }

    // Liberar asientos
    const asientoIds = reserva.boletos.map(b => b.asiento_id).filter(Boolean);
    if (asientoIds.length > 0) {
        await supabaseAdmin
            .from('asientos_viaje')
            .update({ estado: 'disponible', bloqueado_hasta: null, bloqueado_por: null })
            .in('id', asientoIds);
    }

    // Cancelar boletos y reserva
    await supabaseAdmin.from('boletos').update({ estado: 'cancelado' }).eq('reserva_id', req.params.id);
    const { data, error } = await supabaseAdmin
        .from('reservas')
        .update({ estado: 'cancelada' })
        .eq('id', req.params.id)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

module.exports = router;
