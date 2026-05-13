/**
 * whatsapp.js
 * Utility to generate WhatsApp share links (wa.me protocol).
 * Used for sending ticket information to passengers.
 */

/**
 * Generates a WhatsApp share URL.
 * @param {string} telefono - Phone number (with country code, e.g. '59177012345'). If empty, opens without recipient.
 * @param {string} mensaje - Pre-filled message text.
 * @returns {string} wa.me URL
 */
export const generarLinkWhatsApp = (telefono = '', mensaje = '') => {
    const textoEncoded = encodeURIComponent(mensaje);
    
    if (telefono) {
        // Remove any non-numeric chars and ensure country code
        let telLimpio = telefono.replace(/\D/g, '');
        // Add Bolivia country code if not present
        if (telLimpio.length <= 8) {
            telLimpio = '591' + telLimpio;
        }
        return `https://api.whatsapp.com/send?phone=${telLimpio}&text=${textoEncoded}`;
    }
    
    // Without phone number — opens WhatsApp contact picker
    return `https://api.whatsapp.com/send?text=${textoEncoded}`;
};

/**
 * Generates a formatted ticket message for WhatsApp.
 * @param {object} reserva - Reservation object from mockStorage
 * @returns {string} Formatted message
 */
export const generarMensajeTicket = (reserva) => {
    return [
        `🚌 *TERMINAL BUSES BOLIVIA*`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `📋 *Pasaje Digital*`,
        ``,
        `👤 Pasajero: ${reserva.pasajeroNombre}`,
        `🪪 CI: ${reserva.pasajeroCI}`,
        `💺 Asiento(s): ${reserva.asientos.join(', ')}`,
        `🚍 Bus: ${reserva.busPlaca}`,
        ``,
        `📍 ${reserva.origen} → ${reserva.destino}`,
        `📅 Salida: ${new Date(reserva.fechaSalida).toLocaleString('es-BO')}`,
        `💰 Total: Bs ${reserva.precio}`,
        ``,
        `🔑 Código: ${reserva.id}`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `¡Buen viaje! 🇧🇴`,
    ].join('\n');
};

export default { generarLinkWhatsApp, generarMensajeTicket };
