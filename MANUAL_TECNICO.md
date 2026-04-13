# Manual técnico — ITCOMMERCE

## 1. Descripción general

**ITCOMMERCE** es una aplicación full-stack de punto de venta (POS) y gestión comercial. La arquitectura es de tipo **cliente-servidor**: frontend en Next.js (React) y backend en Node.js (Express) con base de datos MongoDB. La comunicación entre frontend y backend es vía REST API (JSON) y opcionalmente WebSockets (Socket.IO) para alertas en tiempo real.

---

## 2. Stack tecnológico

| Capa        | Tecnología |
|------------|------------|
| Frontend   | Next.js 14 (App Router), React 18, Chart.js, react-hot-toast, Axios, Socket.IO Client, Zustand |
| Backend    | Node.js, Express 4, Mongoose 8 |
| Base de datos | MongoDB |
| Autenticación | JWT (access + refresh), cookies para CSRF y refresh |
| Tareas programadas | node-cron |
| Exportación | ExcelJS, PDFKit |
| Seguridad  | Helmet, CORS, rate limiting, express-mongo-sanitize, xss-clean, bcryptjs |
| Validación | Joi (backend) |

---

## 3. Estructura del proyecto

```
ITCOMMERCE/
├── frontend/                 # Aplicación Next.js
│   ├── app/                  # App Router (páginas y layouts)
│   │   ├── dashboard/        # Rutas bajo /dashboard (layout con sidebar)
│   │   ├── public/           # Rutas públicas (ej. repair-status)
│   │   ├── ver-cuenta/       # Acceso cliente por código y PIN
│   │   ├── layout.js         # Layout raíz (Toaster, tema, fuentes)
│   │   └── globals.css       # Estilos globales y variables CSS
│   ├── lib/                  # Utilidades (api.js, printTicket, etc.)
│   ├── components/           # Componentes reutilizables (ThemeToggle, etc.)
│   └── package.json
├── backend/                  # API Express
│   ├── src/
│   │   ├── server.js         # Punto de entrada (HTTP + Socket.IO)
│   │   ├── app.js            # Express app, rutas, middlewares
│   │   ├── config/           # env, db, permissions
│   │   ├── controllers/      # Lógica por recurso
│   │   ├── models/           # Mongoose (User, Product, Sale, etc.)
│   │   ├── routes/           # Rutas por recurso
│   │   ├── services/         # Lógica de negocio (inventory, reports, audit, etc.)
│   │   ├── middlewares/      # auth, validate, csrf, upload, errorHandler
│   │   ├── jobs/             # Tareas cron (conversión puntos, retención auditoría, anomalías)
│   │   ├── validators/       # Esquemas Joi
│   │   └── utils/            # asyncHandler, ApiError, objectDiff
│   ├── uploads/              # Archivos subidos (imágenes de productos)
│   ├── scripts/              # seed, backup
│   └── package.json
└── MANUAL_USUARIO.md / MANUAL_TECNICO.md
```

---

## 4. Backend

### 4.1 Punto de entrada

- **`server.js`**: conecta a MongoDB, ejecuta `ensureSingleAdmin` (crea admin inicial si no existe), inicia tareas cron (`monthlyConversionJob`, `auditRetentionJob`, `auditAnomalyJob`), crea el servidor HTTP y monta Socket.IO con autenticación JWT. Escucha en `env.port` (por defecto 5000).

### 4.2 Aplicación Express (`app.js`)

- **Middlewares globales**: CORS, Helmet, `express.json`, `cookie-parser`, `ensureCsrfCookie`, Morgan, mongo-sanitize, xss-clean, `csrfProtection`.
- **Rate limit**: 300 req/15 min en `/api`; 10 req/15 min en `/api/auth/login`; 15 req/15 min en `/api/auth/client-access`.
- **Rutas montadas bajo `/api`**:
  - `/api/auth` — login, register, refresh, logout, client-access, me, csrf
  - `/api/products` — CRUD productos, upload imagen, critical
  - `/api/purchases` — listado compras, crear compra, suppliers
  - `/api/sales` — listado ventas, crear venta, cancelar venta, my sales
  - `/api/repairs` — listado reparaciones, crear, actualizar estado, my repairs
  - `/api/public` — repair-status por tracking (público)
  - `/api/reports` — dashboard, corte, faltantes, export excel/pdf
  - `/api/wallet` — me, client/:clientId
  - `/api/users` — clients, create client, list users, update role
  - `/api/alerts` — list, attend
  - `/api/audit-logs` — list, summary, acknowledgements, export
  - `/api/permissions` — get, put (admin)
  - `/api/settings` — get, put, history, history/summary, history/export
- **Estáticos**: `/uploads` sirve la carpeta `uploads` (imágenes de productos).
- **Health**: `GET /health` → `{ status: "ok" }`.

### 4.3 Autenticación y autorización

- **JWT**: access token (Bearer) y refresh token (cookie). Variables en `config/env.js`: `accessSecret`, `refreshSecret`, `accessExpires`, `refreshExpires`.
- **Middleware `protect`**: exige `Authorization: Bearer <token>` y asigna `req.user`.
- **Middleware `authorize(role1, role2)`**: comprueba que `req.user.role` esté en los roles indicados.
- **Middleware `authorizePermission(perm1, perm2)`**: obtiene permisos del rol desde BD (PermissionConfig) y comprueba que el usuario tenga todos los permisos indicados. Permisos definidos en `config/permissions.js` (PERMISSIONS, ROLE_PERMISSIONS).

### 4.4 Modelos principales (Mongoose)

- **User**: name, email, password (hash), role (admin|vendedor|cliente), accountType (frecuente|ocasional), clientCode, pin, etc.
- **Product**: name, sku, category, currentStock, minStock, supplier, purchasePrice, salePrice, imageUrl, active, movementHistory.
- **Sale**: client (ref User), items[{ product, quantity, unitPrice, subtotal }], total, walletApplied, finalCharged, paymentMethod, soldBy, cancelled, cancelledAt, cancelledBy.
- **Purchase**: supplier, items[{ product, quantity, unitPrice }], total, etc.
- **Repair**: client (ref User), problemDescription, status, trackingNumber, dateIn, dateOut, history (cambios de estado).
- **WalletMovement**, **PointsMovement**, **Alert**, **AuditLog**, **RefreshToken**, **AnomalyAcknowledgement**, **AppSetting**, **PermissionConfig**.

### 4.5 Servicios destacados

- **inventoryService**: `validateStockForSale`, `decreaseStockFromSale`, `restoreStockFromCancelledSale`, `createLowStockAlert`.
- **reportService**: `getDashboardReport`, `getCorteCaja`, `getFaltantesReport` (excluyen ventas canceladas donde aplica).
- **pointsService**: cálculo de puntos, aplicación de monedero, conversión.
- **auditService**: escritura de logs, resumen, anomalías, acknowledgements.
- **socketService**: registro de usuarios conectados; emisión de eventos `audit:anomaly`.
- **ensureSingleAdmin**: crea un único usuario admin al arrancar (env: INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD, INITIAL_ADMIN_NAME).

### 4.6 Tareas programadas (jobs)

- **monthlyConversionJob**: conversión de puntos a monedero (configuración en BD/AppSetting).
- **auditRetentionJob**: borrado de logs de auditoría antiguos (AUDIT_RETENTION_DAYS).
- **auditAnomalyJob**: detección de anomalías y emisión por Socket.IO a usuarios con rol correspondiente.

### 4.7 Subida de archivos

- **Multer** en `middlewares/uploadProductImage.js`: subida de imagen de producto; se guarda en `uploads/` y se devuelve la ruta. Ruta: `POST /api/products/upload` con permiso PRODUCTS_CREATE.

---

## 5. Frontend

### 5.1 Next.js App Router

- **Layout raíz** (`app/layout.js`): fuentes (Plus Jakarta Sans vía `next/font`), Toaster (react-hot-toast), ThemeToggle. Metadata: title "ITCOMMERCE".
- **Dashboard** (`app/dashboard/layout.js`): TokenProvider, lógica de login/registro, sidebar con navegación por rol, alerta push de stock bajo (para staff), y contenido `children` en `main`.
- **Rutas principales**:
  - `/dashboard` — Dashboard (resumen, gráfico ventas por mes, recientes, stock bajo, top clientes).
  - `/dashboard/pos` — Caja (POS).
  - `/dashboard/sales` — Ventas (historial, filtros, cancelar, por método de pago, export CSV).
  - `/dashboard/products` — Productos (listado, crear, editar, imagen URL o upload).
  - `/dashboard/purchases` — Compras (listado, crear compra).
  - `/dashboard/repairs` — Reparaciones (listado, crear, actualizar estado, enlace cliente).
  - `/dashboard/reportes` — Reportes (dashboard, corte, faltantes, export).
  - `/dashboard/corte` — Corte de caja (fecha, totales, por método de pago).
  - `/dashboard/rewards` — Recompensas (monedero/puntos por cliente).
  - `/dashboard/cliente` — Mi cuenta (cliente): monedero, compras, reparaciones.
  - `/dashboard/admin` — Admin: gráficos ventas/productos vendidos, configuración, permisos, auditoría.
  - `/ver-cuenta` — Acceso cliente por código y PIN.
  - `/public/repair-status` — Seguimiento público de reparación por código o `?tracking=`.

### 5.2 Cliente HTTP y autenticación

- **`lib/api.js`**: instancia Axios con `baseURL`: `process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"`, `withCredentials: true`. Interceptor de solicitud: añade `x-csrf-token` en POST/PUT/PATCH/DELETE desde cookie. Interceptor de respuesta: en 401 llama a `onUnauthorized` (para redirigir a login). Funciones: `getApiBase`, `getProductImageUrl` (usa proxy `/api-uploads` en cliente para imágenes del backend), `getCsrfToken`, `withAuth(token)`.

### 5.3 Estado y contexto

- **TokenContext** (`dashboard/TokenContext.js`): provee `token`, `user`, `login`, `logout`, `loading`. El token se usa en las cabeceras `Authorization: Bearer` para las llamadas a la API. Refresh token vía cookie en flujo de login/refresh.

### 5.4 Proxy de imágenes

- Las imágenes de productos guardadas en el backend (`/uploads/...`) se referencian en el frontend mediante `/api-uploads/...` (rewrite en Next.js hacia el backend) para evitar CORS y exponer la misma base URL.

---

## 6. API REST — Referencia rápida

Base URL: `http://localhost:5000/api` (o la definida en `NEXT_PUBLIC_API_URL` + `/api`).

### 6.1 Autenticación

- `POST /auth/register` — Registro (name, email, password, role).
- `POST /auth/login` — Login (email, password). Devuelve access token; refresh en cookie.
- `POST /auth/client-access` — Acceso cliente (clientCode, pin). Devuelve tokens.
- `POST /auth/refresh` — Renovar access token usando refresh cookie.
- `POST /auth/logout` — Invalidar refresh (cookie).
- `GET /auth/csrf` — Obtener cookie CSRF.
- `GET /auth/me` — Usuario actual (Bearer). Requiere `protect`.

### 6.2 Productos

- `GET /products` — Listado (permiso products:read).
- `GET /products/critical` — Productos críticos (stock).
- `POST /products/upload` — Subir imagen (multipart). Permiso products:create.
- `POST /products` — Crear producto. Permiso products:create.
- `PATCH /products/:id` — Actualizar producto. Permiso products:create.

### 6.3 Ventas

- `GET /sales` — Listado (query: client, page, limit, dateFrom, dateTo, includeCancelled). Permiso sales:create.
- `POST /sales` — Crear venta. Permiso sales:create.
- `PATCH /sales/:id/cancel` — Cancelar venta (restaura stock). Permiso sales:create.
- `GET /sales/me` — Ventas del usuario (cliente). Requiere autenticación.

### 6.4 Compras

- `GET /purchases` — Listado.
- `GET /purchases/suppliers` — Lista de proveedores.
- `POST /purchases` — Crear compra (reposición stock).

### 6.5 Reparaciones

- `GET /repairs` — Listado. Permiso repairs:create.
- `POST /repairs` — Crear reparación. Permiso repairs:create.
- `PATCH /repairs/:id/status` — Actualizar estado. Permiso repairs:update-status.
- `GET /repairs/me` — Reparaciones del usuario (cliente).

### 6.6 Público

- `GET /public/repair-status/:trackingNumber` — Estado de reparación por código (sin auth).

### 6.7 Reportes

- `GET /reports/dashboard` — Reporte dashboard (ventas por mes, topProducts, lowStock, gain, etc.). Requiere auth.
- `GET /reports/corte` — Corte de caja (query: date).
- `GET /reports/faltantes` — Faltantes (en cero / bajo mínimo).
- `GET /reports/export/excel` — Export Excel del reporte dashboard.
- `GET /reports/export/pdf` — Export PDF.
- `GET /reports/export/faltantes/excel` y `/pdf` — Export faltantes.

### 6.8 Usuarios y clientes

- `GET /users/clients` — Lista de clientes. Permiso sales:create.
- `POST /users/clients` — Crear cliente. Permiso sales:create.
- `PATCH /users/clients/:id` — Actualizar cliente.
- `GET /users` — Lista usuarios. Permiso users:read.
- `PATCH /users/:id/role` — Cambiar rol. Permiso users:update-role.

### 6.9 Monedero

- `GET /wallet/me` — Monedero del usuario (cliente).
- `GET /wallet/client/:clientId` — Monedero de un cliente (staff).

### 6.10 Alertas, auditoría, permisos, configuración

- `GET /alerts`, `PATCH /alerts/:id/attend` — Alertas (stock bajo, etc.).
- `GET /audit-logs`, `GET /audit-logs/summary`, `GET /audit-logs/acknowledgements`, export csv/excel.
- `GET /permissions`, `PUT /permissions` — Matriz de permisos (admin).
- `GET /settings`, `PUT /settings`, `GET /settings/history`, etc. — Configuración y bitácora.

---

## 7. WebSockets (Socket.IO)

- **Conexión**: el cliente se conecta al mismo origen del backend (sin `/api`), con `auth: { token }` (JWT access). El servidor verifica el token y asocia `userId` y `role` al socket.
- **Salas**: cada socket se une a `user:<userId>` y `role:<role>`.
- **Eventos servidor → cliente**:
  - `system`: mensaje de bienvenida.
  - `audit:anomaly`: alerta de anomalía (payload con message, severity, signature).
- **Eventos cliente → servidor**:
  - `audit:anomaly:ack`: reconocer alerta (payload `{ signature }`). Respuesta `audit:anomaly:ack:ok`.

---

## 8. Variables de entorno

### 8.1 Backend (`.env` en `backend/`)

| Variable | Descripción | Por defecto |
|----------|-------------|-------------|
| PORT | Puerto del servidor | 5000 |
| MONGO_URI | URI de MongoDB | mongodb://127.0.0.1:27017/itcommerce |
| CORS_ORIGIN | Orígenes permitidos (separados por coma) | http://localhost:3000, http://localhost:3001 |
| JWT_ACCESS_SECRET | Secreto del access token | access_secret |
| JWT_REFRESH_SECRET | Secreto del refresh token | refresh_secret |
| JWT_ACCESS_EXPIRES | Caducidad access | 15m |
| JWT_REFRESH_EXPIRES | Caducidad refresh | 30d |
| POINTS_RATE | Puntos por cada $1 de compra | 0.05 |
| POINTS_TO_WALLET_RATE | $ por punto en conversión | 0.01 |
| AUDIT_RETENTION_DAYS | Días de retención de logs de auditoría | 180 |
| ACK_RETENTION_HOURS | Horas de retención de ACK (configurable también en BD) | 24 |
| NODE_ENV | development / production | development |
| INITIAL_ADMIN_EMAIL | Email del admin inicial | admin@posit.local |
| INITIAL_ADMIN_PASSWORD | Contraseña del admin inicial | 12345678 |
| INITIAL_ADMIN_NAME | Nombre del admin inicial | Administrador |

### 8.2 Frontend (`.env.local` o variables de build)

| Variable | Descripción | Por defecto |
|----------|-------------|-------------|
| NEXT_PUBLIC_API_URL | URL base de la API (incluye /api) | http://localhost:5000/api |

Para imágenes y Socket.IO el frontend deriva la base del backend quitando `/api` de `NEXT_PUBLIC_API_URL`.

---

## 9. Base de datos (MongoDB)

- **Conexión**: Mongoose con `env.mongoUri`. No se usa réplica set por defecto.
- **Colecciones principales**: users, products, sales, purchases, repairs, walletmovements, pointsmovements, alerts, auditlogs, refreshtokens, anomalyacknowledgements, appsettings, permissionconfigs, etc.
- **Índices**: los definidos en los esquemas (por ejemplo `cancelled` en Sale, índices por rol/permisos). Crear índices adicionales en producción si se filtran por fechas o campos de búsqueda frecuentes.
- **Backup**: script `npm run backup` en backend (según `scripts/backup.js`). Configurar cron o tarea programada en el servidor para copias periódicas.

---

## 10. Scripts y comandos

### 10.1 Backend

- `npm run dev` — Desarrollo con nodemon (`src/server.js`).
- `npm start` — Producción: `node src/server.js`.
- `npm run seed` — Ejecutar seed (datos iniciales si existe).
- `npm run backup` — Ejecutar script de backup.
- `npm test` — Pruebas (Vitest).

### 10.2 Frontend

- `npm run dev` — Desarrollo Next.js en puerto 3000.
- `npm run build` — Build de producción.
- `npm start` — Servir build (`next start`).
- `npm run test:e2e` — Pruebas E2E (Playwright).

---

## 11. Despliegue

- **Backend**: Node.js 18+ recomendado. Establecer `NODE_ENV=production`, configurar `MONGO_URI`, `CORS_ORIGIN` (dominio(s) del frontend), y secretos JWT fuertes. Servir detrás de un proxy inverso (Nginx, Caddy) con HTTPS; opcionalmente configurar rate limit en el proxy.
- **Frontend**: `npm run build` y `npm start`, o desplegar en Vercel/Netlify u otro host de Next.js. Definir `NEXT_PUBLIC_API_URL` apuntando a la URL pública de la API (con HTTPS).
- **MongoDB**: usar Atlas o instancia gestionada; restringir acceso por IP y usuario/contraseña o integración IAM según el proveedor.
- **Uploads**: la carpeta `backend/uploads` debe persistir entre reinicios; en entornos escalados, considerar almacenamiento externo (S3, etc.) y servir las URLs correspondientes.
- **Socket.IO**: en producción usar el mismo dominio que la API o configurar CORS y transporte adecuado (websocket). Si hay varios nodos, configurar adaptador Redis para Socket.IO.

---

## 12. Seguridad

- **CSRF**: cookie `csrfToken` y cabecera `x-csrf-token` en mutaciones (POST/PUT/PATCH/DELETE).
- **CORS**: orígenes permitidos vía `CORS_ORIGIN`; credenciales habilitadas.
- **Helmet**: cabeceras de seguridad HTTP.
- **Rate limiting**: límites por ruta (login y client-access más restrictivos).
- **Sanitización**: mongo-sanitize y xss-clean en Express.
- **Contraseñas**: hash con bcrypt antes de guardar.
- **Permisos**: cada ruta sensible protegida con `protect` y/o `authorizePermission`/`authorize(role)`.

---

## 13. Consideraciones de mantenimiento

- **Ventas canceladas**: las ventas con `cancelled: true` se excluyen de totales, reportes, corte y del historial del cliente; el stock se restaura al cancelar.
- **Conversión puntos a monedero**: ejecutada por tarea cron mensual; parámetros en BD (AppSetting) y/o variables de entorno.
- **Retención de auditoría**: job que elimina logs más antiguos que `AUDIT_RETENTION_DAYS`.
- **Admin único**: solo se crea un usuario admin al arrancar; no hay registro público como admin. Cambios de contraseña del admin requieren flujo adicional o script si se implementa.

---

*Documento: Manual técnico ITCOMMERCE. Versión 1.0.*
