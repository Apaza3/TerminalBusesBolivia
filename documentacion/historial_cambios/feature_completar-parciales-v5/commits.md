# Historial de Cambios: feature/completar-parciales-v5

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

### Commit 10 — `feat(frontend): R-SOAT, R-CATEGORIA, R31 incidencias — pantallas parciales completadas`

| Archivo | Cambio |
|---------|--------|
| `frontend/src/paginas/admin/RegistroBus.js` | Implementación de R-SOAT y R-CATEGORIA (campos de inspección, SOAT y tipo de bus). |
| `frontend/src/paginas/conductor/RegistrarIncidencia.js` | **NUEVO.** Página para registrar incidencias en viaje (R31) usando GSAP. |
| `frontend/src/componentes/TarjetaViaje.js` | Badge de categoría del bus. |

---

### Commit 11 — `feat(frontend): rediseño premium Inicio+Login, R13 RecuperarBoleto, R29 Mantenimiento`

| Archivo | Cambio |
|---------|--------|
| `frontend/src/paginas/Inicio.js`, `LoginAdmin.js`, `LoginCliente.js` | Rediseño premium UI/UX usando animaciones GSAP. |
| `frontend/src/paginas/RecuperarBoleto.js` | **NUEVO.** Funcionalidad pública para recuperar boleto por CI (R13). |
| `frontend/src/paginas/conductor/ReporteMantenimiento.js` | **NUEVO.** Formulario de reporte de mantenimiento del bus (R29). |
