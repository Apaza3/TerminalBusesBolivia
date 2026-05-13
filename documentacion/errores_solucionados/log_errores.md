# Log de Errores Solucionados — V5 Correcciones Iniciales

**Versión:** V5.0.0  
**Fecha:** 2026-04-03  
**Rama:** `feature/v5-correcciones-iniciales`  
**Equipo:** Aaron Jimy, Mario Alejandro, Jose Antonio, Dennis Omar

---

## Error #1 — Infante checkbox visible con un solo boleto

**Archivo:** `frontend/src/paginas/MapaAsientos.js`  
**Descripción:** El checkbox "Infante/Menor de edad" se mostraba incluso cuando el usuario solo compraba un boleto, lo que es contradictorio porque si hay un solo pasajero se asume que es mayor de edad.  
**Solución:** El checkbox ahora se renderiza únicamente cuando `asientosSeleccionados.length > 1`. Además se agregó una advertencia en color amarillo que explica la obligatoriedad de documentación presencial.

---

## Error #2 — QR de pago cambiaba en cada renderizado

**Archivo:** `frontend/src/componentes/PasarelaPago.js`  
**Descripción:** El QR de pago era regenerado en cada render porque usaba `Date.now()` directamente en el valor. Esto consumía recursos y desorientaba al usuario.  
**Solución:** Se generó un `pagoId` único con `useMemo([], [])` que persiste durante toda la sesión del componente. El QR ahora muestra siempre el mismo código mientras el modal esté abierto y muestra la referencia en texto debajo.

---

## Error #3 — Formulario de tarjeta sin formato profesional

**Archivo:** `frontend/src/componentes/PasarelaPago.js`  
**Descripción:** Los campos de tarjeta aceptaban cualquier entrada sin formato: número sin espacios, expiración sin slash automático, CVV sin validación, nombre sin restricciones.  
**Solución:** 
- `cardNum`: auto-formatea con espacios cada 4 dígitos, solo acepta números, max 16 dígitos
- `cardExp`: inserta el `/` automáticamente al escribir, solo números
- `cardCVV`: solo dígitos, max 4 caracteres
- `cardNombre`: solo letras y espacios, convierte a mayúsculas automáticamente

---

## Error #4 — WhatsApp enviaba texto plano con caracteres corruptos

**Archivos:** `frontend/src/componentes/TicketGenerator.js`, `frontend/src/utilidades/whatsapp.js`  
**Descripción:** El mensaje de WhatsApp enviaba emojis con caracteres corruptos y no podía enviarse como imagen. Los boletos digitales son más útiles como imagen.  
**Solución:** Se implementó la **Web Share API** (`navigator.share`) que permite compartir archivos PNG directamente. Genera cada ticket como imagen PNG desde el canvas del QR. Si el dispositivo no soporta `navigator.share`, cae al enlace de texto de WhatsApp como respaldo.

---

## Error #5 — Asientos ocupados no se actualizaban dinámicamente

**Archivo:** `frontend/src/paginas/MapaAsientos.js`  
**Descripción:** Los asientos ocupados estaban hardcodeados como `['1A', '2B', '5C']`. Después de una compra real, los asientos recién reservados no aparecían como ocupados para el siguiente usuario.  
**Solución:** Se importó `obtenerReservas` de `mockStorage`. En el `useEffect` inicial, se consultan las reservas con estado `'confirmada'` para el `viajeId` actual y se extraen todos los asientos con `.flatMap(r => r.asientos)`.

---

## Error #6 — Redireccionamiento post-login ignoraba la página anterior

**Archivos:** `LoginCliente.js`, `RegistroCliente.js`, `MapaAsientos.js`  
**Descripción:** Al ser redirigido al login desde el mapa de asientos, tras autenticarse el usuario iba a la pantalla de inicio y perdía el viaje que estaba reservando.  
**Solución:** 
- `MapaAsientos`: redirige a `/login-cliente?redirect=/reserva/${viajeId}` 
- `LoginCliente`: lee el param `redirect` con `useSearchParams` y navega ahí tras el login
- `RegistroCliente`: propaga el param `redirect` al login tras el registro

---

## Error #7 — Ticket mostraba un solo boleto aunque se compraran varios asientos

**Archivo:** `frontend/src/componentes/TicketGenerator.js`  
**Descripción:** Al comprar múltiples asientos, el ticket consolidaba todo en una sola tarjeta mostrando solo el nombre del comprador. Cada pasajero necesita su propio boleto individual.  
**Solución:** Se reescribió `TicketGenerator` para mostrar N tarjetas de boleto (una por asiento) con navegación Anterior/Siguiente. Cada tarjeta tiene: nombre del pasajero, CI, asiento, QR individual. Los botones de descarga permiten: descargar el PDF del boleto activo o todos los PDFs a la vez.

---

## Error #8 — Sin advertencia visible al marcar un pasajero como infante

**Archivo:** `frontend/src/paginas/MapaAsientos.js`  
**Descripción:** El checkbox de infante no informaba al comprador sobre los requisitos legales para menores, lo que podía causar cancelaciones de boletos en el terminal.  
**Solución:** Al marcar el checkbox de infante, aparece inmediatamente un banner amarillo con el texto: *"El menor debe presentar documentación vigente en la sucursal antes del viaje. Sin validación presencial, los boletos serán cancelados automáticamente. Las devoluciones se realizan únicamente de forma física en la sucursal."* El ticket PDF también incluye este aviso.

---

## Error #9 — Sin indicador de sesión en la barra de navegación

**Archivos:** `App.js`, Nuevo: `componentes/PerfilIndicador.js`  
**Descripción:** La navbar mostraba links fijos de "Login Staff" y "Registrarse" sin importar si el usuario ya tenía sesión activa. No había forma visual de saber quién estaba conectado.  
**Solución:** Se creó el componente `PerfilIndicador.js`:
- Si **no hay sesión**: muestra botones "Iniciar Sesión" y "Registrarse"
- Si **hay sesión**: muestra un avatar circular con la inicial del nombre, color según rol (azul=admin, verde=conductor, púrpura=cliente). Al hacer click abre un dropdown con: nombre, rol, opciones de navegación y "Cerrar Sesión"
- Soporta foto de perfil si está disponible

---

## Error #10 — Feedback sin distinción entre bus y tripulación

**Archivo:** `frontend/src/componentes/FeedbackEmoji.js`  
**Descripción:** Solo existía una calificación general que afectaba de forma uniforme a la sucursal, sin poder valorar por separado la calidad del bus y la atención de la tripulación.  
**Solución:** Se agregó un toggle opcional "🎯 Evaluar bus y tripulación por separado". Al activarlo, aparecen dos secciones emoji independientes: una para el bus (color azul) y otra para la tripulación (color verde). Los datos individuales (`moodBus`, `moodTripulacion`) se pasan a `enviarFeedback` para futuras analíticas segmentadas. Si el toggle está desactivado, la nota general se aplica a ambos.

---

## Archivos Modificados

| Archivo | Fixes |
|---------|-------|
| `paginas/MapaAsientos.js` | #1, #5, #6, #8 |
| `componentes/PasarelaPago.js` | #2, #3 |
| `componentes/TicketGenerator.js` | #4, #7 |
| `paginas/auth/LoginCliente.js` | #6 |
| `paginas/auth/RegistroCliente.js` | #6 |
| `App.js` | #9 |
| `componentes/FeedbackEmoji.js` | #10 |
| `componentes/PerfilIndicador.js` | #9 (NUEVO) |
