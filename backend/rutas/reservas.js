const { Router } = require('express');
const { supabaseAdmin } = require('../servicios/supabase');
const { requireAuth, requireRol, optionalAuth } = require('../middleware/auth');

const router = Router();

// GET /api/reservas/buscar — buscar boletos por CI + fecha (R13, sin login)
router.get('/buscar', async (req, res) => {
    const { ci, fecha } = req.query;
    if (!ci) return res.status(400).json({ error: 'CI es requerido.' });

    const { data, error } = await supabaseAdmin
        .from('boletos')
        .select(`
            id,
            asiento,
            pasajero_nombre,
            pasajero_ci,
            precio,
            estado,
            qr_codigo,
            abordado_en,
            creado_en,
            reserva:reservas(id, monto, estado, creado_en, metodo_pago,
                viaje:viajes(origen, destino, fecha_salida, precio, estado, anden,
                    sucursal:sucursales(nombre, logo_emoji)))
        `)
        .eq('ci_pasajero', ci)
        .neq('estado', 'cancelado')
        .order('creado_en', { ascending: false })
        .limit(20);

    if (error) return res.status(500).json({ error: error.message });

    let resultados = data || [];
    if (fecha && resultados.length > 0) {
        resultados = resultados.filter(b => {
            const fechaViaje = b.reserva?.viaje?.fecha_salida?.split('T')[0];
            return fechaViaje === fecha;
        });
    }

    res.json(resultados);
});

// GET /api/reservas — listar reservas
router.get('/', requireAuth, async (req, res) => {
    const { ci, viaje_id, estado } = req.query;
    const rol = req.usuario.perfil?.rol;

    let query = supabaseAdmin
        .from('reservas')
        .select(`
            *,
            viaje:viajes(
                fecha_salida, estado, origen, destino,
                bus:buses(placa)
            ),
            boletos(id, asiento, nombre_pasajero, ci_pasajero, precio_individual, estado),
            pagos(id, metodo, estado, monto, confirmado_en)
        `)
        .order('creado_en', { ascending: false });

    if (rol === 'cliente') {
        query = query.eq('usuario_id', req.usuario.id);
    } else {
        if (viaje_id) query = query.eq('viaje_id', viaje_id);
        if (estado) query = query.eq('estado', estado);
        if (ci) {
            // Filter via boletos join — return matching reserva IDs first
            const { data: boletosCi } = await supabaseAdmin
                .from('boletos').select('reserva_id').eq('ci_pasajero', ci);
            const ids = (boletosCi || []).map(b => b.reserva_id);
            if (ids.length === 0) return res.json([]);
            query = query.in('id', ids);
        }
    }

    const { data, error } = await query.limit(200);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

// GET /api/reservas/:id
router.get('/:id', requireAuth, async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('reservas')
        .select(`
            *,
            viaje:viajes(*, bus:buses(*), sucursal:sucursales(*),
                conductor:tripulacion!conductor_id(nombre),
                origen_departamento:departamentos!origen_departamento_id(nombre),
                destino_departamento:departamentos!destino_departamento_id(nombre)),
            boletos(*),
            pagos(*)
        `)
        .eq('id', req.params.id)
        .single();

    if (error) return res.status(404).json({ error: 'Reserva no encontrada.' });

    const rol = req.usuario.perfil?.rol;
    if (rol === 'cliente' && data.usuario_id !== req.usuario.id) {
        return res.status(403).json({ error: 'Acceso denegado.' });
    }

    res.json(data);
});

// POST /api/reservas — crear reserva + boletos + pago
router.post('/', optionalAuth, async (req, res) => {
    const {
        viaje_id,
        pasajeros,     // [{ nombre, ci, email?, asiento, telefono?, equipaje_maletas?, equipaje_peso_kg? }]
        metodo_pago,
        email_cliente
    } = req.body;

    if (!viaje_id || !pasajeros?.length || !metodo_pago) {
        return res.status(400).json({ error: 'viaje_id, pasajeros[] y metodo_pago son requeridos.' });
    }

    // Verificar viaje disponible
    const { data: viaje } = await supabaseAdmin
        .from('viajes')
        .select('precio, estado, origen, destino, fecha_salida')
        .eq('id', viaje_id)
        .single();

    if (!viaje) return res.status(404).json({ error: 'Viaje no encontrado.' });
    if (!['programado', 'autorizado'].includes(viaje.estado)) {
        return res.status(409).json({ error: 'El viaje ya no está disponible para reserva.' });
    }

    const asientosNros = pasajeros.map(p => p.asiento);

    // Verificar que ningún asiento esté ya reservado
    const { data: asientosDB } = await supabaseAdmin
        .from('asientos_viaje')
        .select('id, numero_asiento, estado')
        .eq('viaje_id', viaje_id)
        .in('numero_asiento', asientosNros);

    const yaReservados = (asientosDB || []).filter(a => a.estado === 'reservado' || a.estado === 'ocupado');
    if (yaReservados.length > 0) {
        return res.status(409).json({
            error: `Asientos ya reservados: ${yaReservados.map(a => a.numero_asiento).join(', ')}`
        });
    }

    // Calcular monto con cobro por equipaje extra
    const PESO_INCLUIDO_KG = 25;
    const PRECIO_EXTRA_KG = 5;
    let montoTotal = 0;

    const pasajerosConMonto = pasajeros.map(p => {
        let precio = Number(viaje.precio);
        let cobroEquipaje = 0;
        if (p.equipaje_peso_kg > PESO_INCLUIDO_KG) {
            cobroEquipaje = (p.equipaje_peso_kg - PESO_INCLUIDO_KG) * PRECIO_EXTRA_KG;
            precio += cobroEquipaje;
        }
        montoTotal += precio;
        return { ...p, precio, cobroEquipaje };
    });

    const primerPasajero = pasajerosConMonto[0];
    const emailCliente = email_cliente || primerPasajero.email || '';

    // Crear reserva
    const { data: reserva, error: reservaError } = await supabaseAdmin
        .from('reservas')
        .insert({
            viaje_id,
            usuario_id: req.usuario?.id || null,
            asientos: asientosNros,
            monto: montoTotal,
            email_cliente: emailCliente,
            telefono_cliente: primerPasajero.telefono || null,
            metodo_pago,
            estado: 'pendiente',
            expira_en: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        })
        .select()
        .single();

    if (reservaError) return res.status(500).json({ error: reservaError.message });

    // Crear boletos (uno por pasajero)
    // Columnas según schema: pasajero_nombre, pasajero_ci, precio, estado:'emitido'
    const boletosInsert = pasajerosConMonto.map(p => ({
        reserva_id:      reserva.id,
        viaje_id,
        asiento:         p.asiento,
        pasajero_nombre: p.nombre,
        pasajero_ci:     p.ci,
        precio:          p.precio,
        equipaje_maletas:    p.equipaje_maletas    || 0,
        equipaje_peso_kg:    p.equipaje_peso_kg    || 0,
        equipaje_cobro_extra: p.cobroEquipaje      || 0,
        estado: 'emitido',
    }));

    const { data: boletos, error: boletosError } = await supabaseAdmin
        .from('boletos')
        .insert(boletosInsert)
        .select();

    if (boletosError) {
        await supabaseAdmin.from('reservas').delete().eq('id', reserva.id);
        return res.status(500).json({ error: boletosError.message });
    }

    // Marcar asientos como reservados
    await supabaseAdmin
        .from('asientos_viaje')
        .update({ estado: 'reservado', bloqueado_hasta: null, bloqueado_por: null })
        .eq('viaje_id', viaje_id)
        .in('numero_asiento', asientosNros);

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

    // Pago en efectivo → confirmar reserva; boletos ya están en 'emitido' (válido para abordaje)
    if (estadoPago === 'confirmado') {
        await supabaseAdmin.from('reservas').update({ estado: 'pagado' }).eq('id', reserva.id);
        // Estado 'emitido' ya es el correcto para boletos listos para abordar
        reserva.estado = 'pagado';
    }

    req.app.locals.broadcast('reserva_creada', {
        viajeId: viaje_id,
        asientos: asientosNros,
        reservaId: reserva.id
    });

    res.status(201).json({ ...reserva, boletos, pago });
});

// POST /api/reservas/:id/cancelar
router.post('/:id/cancelar', requireAuth, async (req, res) => {
    const { data: reserva } = await supabaseAdmin
        .from('reservas')
        .select('*, boletos(asiento, viaje_id)')
        .eq('id', req.params.id)
        .single();

    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada.' });

    const rol = req.usuario.perfil?.rol;
    if (rol === 'cliente' && reserva.usuario_id !== req.usuario.id) {
        return res.status(403).json({ error: 'Solo puedes cancelar tus propias reservas.' });
    }

    // Liberar asientos
    const asientosList = reserva.boletos.map(b => b.asiento).filter(Boolean);
    if (asientosList.length > 0 && reserva.viaje_id) {
        await supabaseAdmin
            .from('asientos_viaje')
            .update({ estado: 'disponible', bloqueado_hasta: null, bloqueado_por: null })
            .eq('viaje_id', reserva.viaje_id)
            .in('numero_asiento', asientosList);
    }

    await supabaseAdmin.from('boletos').update({ estado: 'cancelado' }).eq('reserva_id', req.params.id);
    const { data, error } = await supabaseAdmin
        .from('reservas')
        .update({ estado: 'cancelado' })
        .eq('id', req.params.id)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

module.exports = router;
