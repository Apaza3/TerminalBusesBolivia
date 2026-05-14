# Terminal Buses Bolivia — Estado del Proyecto

> **Rama activa:** `feature/completar-parciales-v5`
> **Stack:** React 19 (frontend) · Express + WebSocket (backend) · localStorage (sin Supabase por ahora)
> **Build:** ✅ Compila sin errores

---

## ✅ CAMBIOS REALIZADOS (rama feature/completar-parciales-v5)

### Commit 1 — `feat(auth): R1+R2 - add cajero role, mockAuthDB, remove hardcoded backdoors, add recordar sesion`

| Archivo | Cambio |
|---------|--------|
| `frontend/src/data/mockAuthDB.js` | **NUEVO.** Base de datos local de usuarios staff. Tiene 3 usuarios por defecto: admin, cajero, conductor. CRUD completo: registrar, listar, suspender, activar, actualizar perfil. Almacena en localStorage clave `tbb_staff_users`. |
| `frontend/src/contextos/AuthContext.js` | **REESCRITO.** Usa `mockAuthDB` en lugar de credenciales hardcodeadas. Funciones: `login()` (staff), `loginComoCliente()` (CI+password), `logout()`, `actualizarPerfil()`. Soporta `recordar=true` (localStorage) y `recordar=false` (sessionStorage). |
| `frontend/src/paginas/auth/LoginAdmin.js` | **REESCRITO.** Formulario de login staff con checkbox "Recordar sesión", mostrar/ocultar contraseña, redirect por rol (admin→/admin/dashboard, cajero→/cajero/panel, conductor→/conductor/panel). |
| `frontend/src/paginas/auth/LoginCliente.js` | Agregado checkbox "Recordar sesión" y se pasa al `loginComoCliente()`. |

---

### Commit 2 — `feat: R9 seat blocking, R10 boletos filter, R11 webhook QR sim, R19 manifest, R20 polling, cajero panel`

| Archivo | Cambio |
|---------|--------|
| `frontend/src/data/mockStorage.js` | Función `liberarAsientosBloqueados()` agregada. `crearReserva()` ahora acepta `pasajeros` y `metodoPago`. Timer de bloqueo reducido a 10 min (era 15). |
| `frontend/src/paginas/MapaAsientos.js` | Estado `asientosBloqueados` (morado en mapa). Polling cada 15s para sincronizar asientos. Al presionar "Continuar" se bloquean temporalmente los asientos seleccionados. Asientos bloqueados por otros son `not-allowed`. |
| `frontend/src/estilos/escritorio/mapa-asientos.css` | Nueva clase `.asiento-btn.bloqueado` (fondo morado `#4c1d95`). |
| `frontend/src/paginas/BuscadorViajes.js` | Input numérico "Boletos" (1–10) en el formulario de búsqueda. Se pasa como `state.cantidadBoletos` al navegar al mapa de asientos. |
| `frontend/src/componentes/PasarelaPago.js` | Webhook simulado: al seleccionar QR, después de 18–30 segundos la pantalla muestra "Verificando pago..." y auto-confirma. Estado visual con dot animado. Botón manual sigue disponible. |
| `frontend/src/paginas/conductor/PanelConductor.js` | **REESCRITO.** Manifiesto con búsqueda por nombre/CI. Botón imprimir (ventana del navegador). Botón exportar `.txt`. Estados de viaje (iniciar/finalizar). Polling 15s para actualizar. |
| `frontend/src/paginas/cajero/PanelCajero.js` | **NUEVO.** Panel exclusivo del rol cajero: KPIs (reservas, ventas, ingresos, boletos), tabla de reservas con búsqueda, tabla de ventas. |
| `frontend/src/componentes/PerfilIndicador.js` | Color y label para rol cajero (amarillo/🏷️). Botón "Panel Cajero" en dropdown. |
| `frontend/src/data/mockDiscoveryDB.js` | `enviarFeedback()` acepta y guarda `moodBus` y `moodTripulacion` por separado. |
| `frontend/src/App.js` | Ruta `/cajero/panel` protegida con `ProtectedRoute`. Import de `PanelCajero`. |

---

### Commit 3 — `feat(admin): R6 user management CRUD+suspend/activate, AdminDashboard local data`

| Archivo | Cambio |
|---------|--------|
| `frontend/src/paginas/admin/AdminDashboard.js` | **REESCRITO.** Usa datos locales (no Supabase). KPIs desde localStorage. Sidebar con navegación interna (tabs: Flota / Usuarios Staff). Tab "Usuarios Staff": tabla de todos los staff con rol, estado activo/suspendido, botón suspender/activar. Formulario inline para crear nuevos usuarios (todos los roles). |
| `frontend/src/paginas/auth/LoginAdmin.js` | Fix de redirect: lee el rol del resultado directo de `loginStaff()` antes de navegar. |

---

### Commit 4 — `feat(cliente): R27 historial de viajes MisViajes page`

| Archivo | Cambio |
|---------|--------|
| `frontend/src/paginas/cliente/MisViajes.js` | **NUEVO.** Historial de viajes del pasajero. Filtra reservas por CI/nombre del perfil. Tabs: Todos / Próximos / Pasados. Búsqueda por ciudad o ID. Badge de estado (Próximo/Completado). Botón "Ver Detalles". Redirige al login si no hay sesión. |
| `frontend/src/componentes/PerfilIndicador.js` | Botón "🗺️ Mis Viajes" en dropdown para clientes. |
| `frontend/src/App.js` | Ruta `/mis-viajes`. |

---

### Commit 5 — `feat(auth): R3 recuperar password - local token 30min`

| Archivo | Cambio |
|---------|--------|
| `frontend/src/paginas/auth/RecuperarPassword.js` | **NUEVO.** Flujo 3 pasos: (1) ingresar email → genera token local alfanumérico, (2) ingresar el código → valida expiración 30 min, (3) nueva contraseña → la actualiza en `tbb_staff_users` o `tbb_clientes`. En producción el token se enviaría por email; aquí se muestra en pantalla para desarrollo. |
| `frontend/src/App.js` | Ruta `/recuperar-password`. |
| `frontend/src/paginas/auth/LoginAdmin.js` | Link "¿Olvidaste tu contraseña?" → `/recuperar-password`. |

---

### Commit 6 — `feat(perfil): R5 editar perfil`

| Archivo | Cambio |
|---------|--------|
| `frontend/src/paginas/perfil/EditarPerfil.js` | **NUEVO.** Editar nombre completo, teléfono y foto de perfil (base64). Campos de solo lectura: email, CI, rol. Funciona para admin, cajero, conductor y cliente vía `AuthContext.actualizarPerfil()`. |
| `frontend/src/componentes/PerfilIndicador.js` | Botón "Mi Cuenta / Editar Perfil" navega a `/perfil/editar`. |
| `frontend/src/App.js` | Ruta `/perfil/editar`. Import de `EditarPerfil`. |

---

### Commit 7 — `feat(backend): servidor Express+WebSocket completo`

| Archivo | Cambio |
|---------|--------|
| `backend/servidor.js` | **DE 0 BYTES A FUNCIONAL.** Servidor Express con WebSocket. In-memory DB (Map). Endpoints: `GET /health`, `POST /api/auth/login`, `GET/POST /api/viajes`, `GET /api/asientos/:id`, `POST /api/asientos/bloquear`, `GET/POST /api/reservas`, `GET/PUT /api/estado-viaje/:id`, `GET /api/stats`. WebSocket broadcast en: bloqueo de asientos, nueva reserva, liberación de asientos expirados, cambio de estado de viaje. Limpieza automática de asientos expirados cada 30s. |
| `backend/package.json` | Dependencias `express`, `cors`, `ws` instaladas. |

---

### Commit 8 — `fix(auth): restore sessionStorage sessions on page reload`

| Archivo | Cambio |
|---------|--------|
| `frontend/src/contextos/AuthContext.js` | Al inicializar, ahora lee de `sessionStorage` si no encuentra sesión en `localStorage`. Arregla el bug donde al recargar la página se perdía la sesión cuando `recordar=false`. |

---

### Commit 9 — `fix: eslint PasarelaPago, build exitoso`

| Archivo | Cambio |
|---------|--------|
| `frontend/src/componentes/PasarelaPago.js` | Corrección de comentario ESLint (`// eslint-disable-line`). Build de producción confirma 0 errores. |

---

## ❌ REQUERIMIENTOS PENDIENTES

> Los siguientes requerimientos **no tienen implementación** en el proyecto. Se listan con una descripción técnica para guiar la implementación.

---

### 🔐 Módulo de Identidad y Acceso

#### R8-OTP — Validación de identidad con CI + OTP vía SMS
- **Descripción:** Al registrarse o iniciar sesión, el sistema debe enviar un código numérico de 6 dígitos al celular del usuario mediante un servicio SMS (ej. Twilio, MessageBird o API local). El código expira en 5 minutos. El backend valida que el código ingresado coincida con el enviado al número asociado al CI.
- **Archivos a crear/modificar:** `backend/servicios/smsService.js`, `frontend/src/paginas/auth/ValidarOTP.js`, modificar `RegistroCliente.js` para agregar paso OTP.

---

### 🎫 Módulo de Gestión Comercial y Reservas

#### R13 — Recuperar boleto con CI + fecha
- **Descripción:** El pasajero puede buscar sus boletos ingresando su número de CI y la fecha de viaje. El sistema retorna todos los boletos que coincidan, con opción de re-descargar el PDF o compartir por WhatsApp. No requiere login.
- **Archivos a crear:** `frontend/src/paginas/RecuperarBoleto.js`. Ruta pública `/recuperar-boleto`.

#### R25 — Emitir facturas y recibos con NIT/CI
- **Descripción:** Después de confirmar el pago, el sistema genera un documento PDF con formato de factura: datos del emisor (empresa), datos del comprador (NIT o CI), detalle del servicio (ruta, fecha, asientos), monto, fecha de emisión y número correlativo. El PDF debe poder descargarse o imprimirse.
- **Archivos a crear:** `frontend/src/componentes/GeneradorFactura.js`. Usa `jsPDF` que ya está instalado. Integrar en el flujo post-pago de `MapaAsientos.js`.

#### R-IDAVUELTA — Modo Ida y Vuelta en búsqueda de viajes
- **Descripción:** En `BuscadorViajes.js` agregar un toggle "Solo Ida / Ida y Vuelta". En modo ida y vuelta, mostrar un segundo selector de fecha de regreso. El sistema busca viajes en ambas direcciones simultáneamente y los presenta en dos secciones. Al confirmar, crea dos reservas enlazadas.
- **Archivos a modificar:** `BuscadorViajes.js`, `mockStorage.js` (campo `reservaEnlazadaId`).

#### R-ENCOMIENDA — Registro de encomiendas con código de seguimiento
- **Descripción:** Formulario para registrar paquetes/encomiendas: remitente, destinatario, descripción, peso estimado, ruta y precio. El sistema genera un código de seguimiento alfanumérico único. El destinatario puede consultar el estado ingresando el código en una pantalla pública.
- **Archivos a crear:** `frontend/src/paginas/encomiendas/RegistrarEncomienda.js`, `frontend/src/paginas/encomiendas/SeguimientoEncomienda.js`, `frontend/src/data/mockEncomiendaDB.js`.

#### R-EQUIPAJE — Registro de equipaje con peso
- **Descripción:** Durante el proceso de reserva, el pasajero declara el equipaje: cantidad de maletas y peso total estimado. Si el peso supera el límite de la empresa (ej. 25kg incluido, cobro extra por cada kg adicional), el sistema calcula y suma el costo al total de la reserva.
- **Archivos a modificar:** Formulario de pasajeros en `MapaAsientos.js` (paso 'formulario'), `mockStorage.js` (campo `equipaje` en reserva).

---

### 🚌 Módulo de Planificación Operativa

#### R15 — Configurar rutas con paradas intermedias
- **Descripción:** Panel admin para crear rutas nombradas (ej. "La Paz → Cochabamba"): origen, destino, lista de ciudades intermedias con distancia y tiempo estimado entre cada parada. Las rutas se almacenan y se usan al programar itinerarios. Cada parada puede tener su propio precio desde el origen.
- **Archivos a crear:** `frontend/src/paginas/admin/GestionRutas.js`, `frontend/src/data/mockRutasDB.js`.

#### R16 — Programar itinerarios (bus + chofer + ruta + horario)
- **Descripción:** Formulario para crear un viaje programado: seleccionar ruta existente, bus disponible de la flota, conductor asignado, copiloto, fecha y hora de salida. El sistema valida que el bus y conductor no tengan conflictos de horario. El itinerario queda disponible en el buscador de viajes.
- **Archivos a crear:** `frontend/src/paginas/admin/ProgramarItinerario.js`. Modificar `mockDiscoveryDB.js` para leer viajes dinámicos.

#### R21 — CRUD de sucursales
- **Descripción:** Panel admin para gestionar sucursales: crear, editar y desactivar. Campos: nombre, logo/emoji, color acento, ciudad, teléfono, dirección, descripción. Las sucursales activas aparecen en la pantalla de inicio ordenadas por ranking.
- **Archivos a crear:** `frontend/src/paginas/admin/GestionSucursales.js`. Modificar `mockDiscoveryDB.js` para que `SUCURSALES_MOCK` sea editable en localStorage.

#### R28 — Consultar disponibilidad de recursos (flota/personal)
- **Descripción:** Vista de calendario o tabla que muestra para cada bus y conductor: qué viajes tiene asignados en el rango de fechas seleccionado y en qué fechas está disponible. Permite al admin ver conflictos antes de programar un nuevo itinerario.
- **Archivos a crear:** `frontend/src/paginas/admin/DisponibilidadRecursos.js`.

#### R-SOAT — Validación de SOAT e inspección técnica de buses
- **Descripción:** Al registrar o editar un bus, campos obligatorios: número de SOAT, fecha de vencimiento SOAT, número de inspección técnica, fecha de vencimiento inspección. El sistema muestra alertas automáticas cuando un documento vence en menos de 30 días. Buses con documentación vencida no pueden ser asignados a itinerarios.
- **Archivos a modificar:** `RegistroBus.js`, `mockStaffDB.js` (agregar campos de documentación).

#### R-CATEGORIA — Categorización de buses (Cama / Semi-cama / VIP / Ejecutivo)
- **Descripción:** Al registrar un bus, campo de selección de categoría de servicio: Económico, Semi-cama, Cama, VIP, Ejecutivo. La categoría define la configuración de asientos predeterminada (ej. VIP = 2+1, Cama = reclinable 180°) y el rango de precio sugerido. Se muestra como badge en los resultados de búsqueda.
- **Archivos a modificar:** `RegistroBus.js`, `TarjetaViaje.js`, `mockStaffDB.js`.

---

### 🛣️ Módulo de Operaciones de Transporte

#### R17 — Monitoreo de flota en tiempo real (mapa)
- **Descripción:** Panel admin/operador con mapa (usando Leaflet.js o similar) que muestra la posición aproximada de cada bus en ruta. El conductor envía su ubicación GPS desde la app. El mapa se actualiza cada 30 segundos vía WebSocket. Incluye historial de ruta recorrida.
- **Archivos a crear:** `frontend/src/paginas/admin/MonitoreoFlota.js`. Modificar `PanelConductor.js` para enviar coordenadas GPS. Modificar `backend/servidor.js` para endpoint WebSocket de geolocalización.

#### R18 — Alertas automáticas por correo/SMS a pasajeros
- **Descripción:** Cuando el conductor cambia el estado de un viaje a "en_ruta" o reporta un retraso, el backend envía notificaciones automáticas a todos los pasajeros del manifiesto. El mensaje incluye: nombre del pasajero, ruta, hora actualizada de salida, número de bus. Requiere integración con servicio de email (SendGrid/Nodemailer) y/o SMS.
- **Archivos a modificar:** `backend/servidor.js` (agregar `notificacionService.js`). Endpoint `PUT /api/estado-viaje/:id` debe disparar notificaciones.

#### R26 — Notificar cambios de andén o retrasos
- **Descripción:** El admin o cajero puede emitir una notificación de andén (número de andén de salida) o retraso (nueva hora estimada) para un viaje. La notificación se muestra en tiempo real en la app del pasajero (toast/banner) vía WebSocket, y opcionalmente se envía por SMS.
- **Archivos a crear:** `frontend/src/paginas/cajero/EmitirNotificacion.js`. Evento WebSocket `tipo: 'cambio_anden'` en backend. Componente en frontend que escucha el WS y muestra toast.

#### R29 — Reportes de mantenimiento desde la app del chofer
- **Descripción:** En `PanelConductor.js`, botón "Reportar Problema" que abre un formulario: tipo de problema (motor, frenos, llantas, eléctrico, otro), descripción, foto adjunta (base64), severidad (baja/media/alta/crítica). El reporte se guarda y aparece en el panel admin con alerta si es crítico.
- **Archivos a crear:** `frontend/src/paginas/conductor/ReporteMantenimiento.js`, `frontend/src/data/mockMantenimientoDB.js`. Modificar `AdminDashboard.js` para mostrar alertas de mantenimiento.

#### R31 — Registrar incidencias de viaje
- **Descripción:** El conductor puede registrar incidencias durante el viaje: accidente, desvío, pasajero conflictivo, problema mecánico, etc. Cada incidencia tiene: tipo, descripción, hora, ubicación (manual o GPS), estado (abierta/resuelta). El admin ve todas las incidencias activas en su dashboard.
- **Archivos a crear:** `frontend/src/paginas/conductor/RegistrarIncidencia.js`, `frontend/src/data/mockIncidenciasDB.js`.

#### R-QR-SCANNER — Escáner QR para validación de abordaje
- **Descripción:** El conductor o cajero escanea el QR del ticket del pasajero usando la cámara del dispositivo. El sistema valida que el ticket corresponde al viaje correcto, que el asiento es válido y que no fue ya abordado. Marca el pasajero como "abordado" en el manifiesto. Usa la librería `html5-qrcode` o `@zxing/browser`.
- **Archivos a crear:** `frontend/src/componentes/EscanerQR.js`, `frontend/src/paginas/conductor/ValidarAbordaje.js`.

---

### 📊 Módulo de Analítica y Reportes

#### R30 — Exportar reportes a PDF y Excel
- **Descripción:** En `DashboardAnalitico.js`, botones para exportar los datos actuales: (1) PDF con gráficos y tablas usando `jsPDF` + `html2canvas`, (2) Excel/CSV con los datos crudos usando `SheetJS` (`xlsx`). Los reportes incluyen: ventas por ruta, ocupación por bus, ingresos por período.
- **Archivos a modificar:** `DashboardAnalitico.js`. Instalar `xlsx` con npm.

#### R-HISTORICO — Vista previa de datos históricos
- **Descripción:** En el dashboard analítico, selector de rango de fechas (semana/mes/trimestre/personalizado) para filtrar todos los KPIs, gráficos y tablas al período seleccionado. Los datos históricos se acumulan en localStorage con marca de tiempo y se agregan por período.
- **Archivos a modificar:** `DashboardAnalitico.js`, `mockAnalyticsDB.js` (agregar timestamps a ventas).

#### R-AUDITORIA — Auditoría de calidad por sindicato
- **Descripción:** Módulo de reportes especial: exporta una tabla con todas las calificaciones recibidas por empresa/ruta en un período dado. Incluye: promedio general, desglose por bus/tripulación/sucursal, comparativa entre empresas, tendencia mensual. Exportable a PDF.
- **Archivos a crear:** `frontend/src/paginas/admin/ReporteAuditoria.js`.

---

### ⚙️ Requerimientos Técnicos Transversales

#### RN-WS-FRONTEND — Conectar frontend al WebSocket del backend
- **Descripción:** El backend en `servidor.js` ya emite eventos WebSocket. Falta crear un hook en el frontend que se conecte a `ws://localhost:4000` y escuche eventos (`asientos_bloqueados`, `reserva_creada`, `estado_viaje_actualizado`, `asientos_liberados`). Al recibir un evento, actualizar el estado local del componente correspondiente (MapaAsientos, PanelConductor).
- **Archivos a crear:** `frontend/src/hooks/useWebSocket.js`. Modificar `MapaAsientos.js` y `PanelConductor.js` para usar el hook en lugar de solo polling.

#### RN-MOBILE — Aplicación móvil React Native
- **Descripción:** Clonar la lógica de negocio del frontend web a una app React Native que pueda ejecutarse en Android/iOS. Pantallas mínimas: login, búsqueda de viajes, mapa de asientos, pago QR, ticket digital, panel conductor.
- **Archivos a crear:** Nuevo proyecto en `/mobile/` con `npx react-native init` o Expo.

#### RN-TERMICA — Impresión en impresora térmica 80mm
- **Descripción:** El cajero puede imprimir tickets físicos en impresora térmica usando el protocolo ESC/POS. El backend genera el comando de impresión y lo envía al dispositivo conectado por USB o red local. El ticket impreso incluye: QR, datos del pasajero, ruta, asiento, precio.
- **Archivos a crear:** `backend/servicios/impresora.js` usando librería `node-escpos` o `thermalprinter`.

#### RN-BIOMETRICO — Lector biométrico para validación de identidad
- **Descripción:** Integración con lector de huella dactilar USB en los puestos de cajero. Al registrar un cliente en la terminal física, se captura su huella y se asocia a su CI. En futuras visitas, el cajero puede verificar la identidad por huella en lugar de CI + foto.
- **Archivos a crear:** `backend/servicios/biometrico.js`. Requiere driver/SDK del fabricante del lector.

#### RN-SUPABASE — Migración completa a Supabase cuando se reconecte
- **Descripción:** Actualmente el frontend usa `mockAuthDB.js`, `mockStorage.js`, `mockClientDB.js` y `mockDiscoveryDB.js`. Cuando Supabase esté disponible, reemplazar cada llamada a estos mocks por llamadas reales al cliente de Supabase (`@supabase/supabase-js`). Las tablas ya están definidas en `esquema_inicial.sql` y `v2_2_migracion.sql`. Configurar variables de entorno `REACT_APP_SUPABASE_URL` y `REACT_APP_SUPABASE_ANON_KEY` en `.env`.
- **Archivos a modificar:** `AuthContext.js`, `MapaAsientos.js`, `BuscadorViajes.js`, `AdminDashboard.js`, `PanelConductor.js`, `PanelCajero.js`.

---

## 📁 Estructura de archivos nuevos en esta rama

```
frontend/src/
├── data/
│   └── mockAuthDB.js                   ← NUEVO: auth staff local (4 roles)
├── paginas/
│   ├── auth/
│   │   └── RecuperarPassword.js        ← NUEVO: R3 recuperar contraseña
│   ├── cajero/
│   │   └── PanelCajero.js              ← NUEVO: panel cajero
│   ├── cliente/
│   │   └── MisViajes.js                ← NUEVO: R27 historial de viajes
│   └── perfil/
│       └── EditarPerfil.js             ← NUEVO: R5 editar perfil
backend/
└── servidor.js                         ← REESCRITO: de 0 bytes a servidor completo
```

## 🔑 Credenciales de acceso por defecto

| Rol | Email | Contraseña | Ruta |
|-----|-------|-----------|------|
| Admin | `admin@tbb.com` | `admin123456` | `/admin/dashboard` |
| Cajero | `cajero@tbb.com` | `cajero123456` | `/cajero/panel` |
| Conductor | `conductor@tbb.com` | `conductor123456` | `/conductor/panel` |
| Cliente | CI: cualquier registrado | password del registro | `/mis-viajes` |

## 🚀 Comandos para ejecutar

```bash
# Frontend
cd frontend && npm start

# Backend (en otra terminal)
cd backend && npm start
# → http://localhost:4000/health
# → ws://localhost:4000
```
