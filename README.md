# ITCOMMERCE - SaaS POS Full Stack

Aplicación web profesional para gestión de compras, ventas, inventario, reparaciones, monedero de puntos, alertas automáticas y reportes inteligentes.

## Stack tecnológico

- Backend: `Node.js`, `Express`, `MongoDB`, `Mongoose`
- Frontend: `Next.js` (App Router), `React`, `Chart.js`
- Seguridad: `JWT` + refresh tokens, `bcrypt`, `helmet`, `cors`, `rate limit`, sanitización XSS/NoSQL
- Seguridad avanzada adicional: CSRF (double submit cookie), rotación de refresh token por dispositivo, revocación por dispositivo
- Automatización: `node-cron` (conversión mensual de puntos)
- Extras: exportación `PDF`/`Excel`, `WebSockets`, script de backup MongoDB

## Arquitectura

Proyecto monorepo:

```txt
ITCOMMERCE/
  backend/
    src/
      config/
      controllers/
      jobs/
      middlewares/
      models/
      routes/
      services/
      validators/
      app.js
      server.js
    scripts/
    .env.example
  frontend/
    app/
      dashboard/
      public/repair-status/
    components/
    lib/
    public/
    .env.example
  package.json
```

Patrón aplicado: separación por capas `Routes -> Controllers -> Services -> Models`.

## Funcionalidades implementadas

- Gestión de usuarios con roles (`admin`, `vendedor`, `cliente`)
- Autenticación JWT + refresh token
- CRUD base de productos e inventario crítico
- Compras con incremento automático de stock
- Ventas con descuento de stock automático
- Alertas automáticas de bajo stock
- Sistema de puntos (acumulación y monedero)
- Conversión mensual automática de puntos a saldo (cron)
- Reparaciones con tracking público sin login
- Reportes inteligentes para dashboard
- Exportación de reportes a PDF y Excel
- Registro básico de auditoría de actividad
- Frontend SaaS con dashboard + consulta pública + PWA
- Páginas de operación en dashboard: Productos (listar, críticos, crear), Compras (registrar), Ventas (registrar), Reparaciones (listar, crear, cambiar estado)

## Variables de entorno

### Backend (`backend/.env`)

Copiar `backend/.env.example` a `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/itcommerce
JWT_ACCESS_SECRET=super_access_secret_change_me
JWT_REFRESH_SECRET=super_refresh_secret_change_me
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d
CORS_ORIGIN=http://localhost:3000
POINTS_RATE=0.05
POINTS_TO_WALLET_RATE=0.01
AUDIT_RETENTION_DAYS=180
ACK_RETENTION_HOURS=24
NODE_ENV=development
```

### Frontend (`frontend/.env.local`)

Copiar `frontend/.env.example` a `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Requisitos previos

- **Node.js** 18+ (recomendado 20 o 22)
- **MongoDB** en ejecución (local: `mongodb://127.0.0.1:27017` o MongoDB Atlas)
- Puertos **3000** (frontend) y **5000** (backend) libres

## Instalación y ejecución

Desde la raíz del proyecto:

```bash
npm install
npm run dev
```

Con eso se levantan **backend** (puerto 5000) y **frontend** (puerto 3000) a la vez. El **administrador** se crea automáticamente la primera vez que arranca el backend (no hace falta `seed` para entrar como admin).

Datos de prueba opcionales (productos y usuarios extra):

```bash
npm run seed
```

Servicios:

- Frontend: **http://localhost:3000**
- Backend: **http://localhost:5000**
- Healthcheck: **http://localhost:5000/health**

### Si un puerto está en uso

En PowerShell (Windows), para liberar el puerto 5000 o 3000:

```powershell
# Ver qué proceso usa el puerto (ej. 5000)
netstat -ano | findstr :5000

# Cerrar el proceso por PID (sustituye 12345 por el número que salga)
taskkill /PID 12345 /F
```

O en una sola línea para el 5000:

```powershell
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
```

## Cómo usar la aplicación

### 1. Arrancar y cargar datos de prueba

- Tener **MongoDB** en marcha (por ejemplo `mongodb://127.0.0.1:27017`).
- En la raíz del proyecto: `npm install` y luego `npm run dev` (levanta backend y frontend).
- Opcional: `npm run seed` para crear usuarios y productos de prueba.

### 2. Entrar al dashboard

- Abre en el navegador: **http://localhost:3000**
- Ve a **Dashboard** (o directamente **http://localhost:3000/dashboard**).
- Para usar el dashboard necesitas un **token JWT**. El token se pega una vez en la barra superior y se reutiliza en todas las páginas del dashboard (se guarda en esta sesión).

### 3. Cuenta de administrador (admin)

El rol **admin** no se puede elegir al registrarse. Para tener un admin:

**A) Primera vez (desarrollo)**  
Ejecuta en la raíz: `npm run seed`. Se crea un usuario admin. Luego inicia sesión con **Email:** `admin@posit.local` y **Contraseña:** `12345678`.

**B) Más administradores**  
Un admin puede asignar el rol "admin" a otro usuario desde el panel **Admin** (lista de usuarios, cambiar rol).

### 4. Otras cuentas y login (antes: obtener token)

Puedes iniciar sesión en el dashboard con email y contraseña. Si prefieres usar la API para obtener token:

**Desde la API (Postman, curl, etc.):**

```bash
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{ "email": "admin@posit.local", "password": "12345678" }
```

En la respuesta viene `accessToken`. Copia ese valor y pégalo en el campo **“Token JWT”** del dashboard.

**Usuarios de prueba tras `npm run seed`:**

- **Vendedor:** `vendedor@posit.local` / `12345678`
- **Cliente:** `cliente@posit.local` / `12345678`

Inicia sesión en el dashboard con cualquiera de estos usuarios.

### 5. Navegación del dashboard

En la parte superior del dashboard tienes:

- **Dashboard** – Resumen: ventas por mes, ganancia, reparaciones pendientes, productos críticos, top clientes.
- **Productos** – Listado (solo activos; opción "Ver inactivos"), productos en stock crítico, crear producto (SKU automático), **editar** y **desactivar** (soft delete). Proveedores con sugerencias para no duplicar.
- **Compras** – Historial de compras (con filtro por proveedor) y formulario para registrar una compra (proveedor + ítems: producto, cantidad, costo).
- **Ventas** – Historial de ventas (filtro por cliente) y formulario para registrar venta (cliente, forma de pago, ítems).
- **Reparaciones** – Listado con filtro por estado, formulario para nueva reparación (cliente, descripción, fecha estimada, costo) y cambio de estado (Recibido → En proceso → Terminado → Entregado).
- **Admin** – Panel de auditoría, permisos por rol, configuración del sistema, bitácora de cambios de configuración, alertas y reconocimiento de anomalías (requiere rol admin).

### 6. Flujo típico

1. **Productos:** Crear o revisar productos y stock mínimo. Los que estén por debajo del mínimo aparecen como “Crítico”.
2. **Compras:** Registrar una compra con proveedor e ítems; el stock de los productos se incrementa automáticamente.
3. **Ventas:** Registrar una venta eligiendo cliente (usuario), forma de pago e ítems; el stock se descuenta y se generan puntos para el cliente.
4. **Reparaciones:** Crear una reparación (cliente, descripción). Luego ir cambiando el estado según avance el trabajo.

### 7. Consulta pública de reparaciones (sin login)

Un cliente puede ver el estado de su reparación sin iniciar sesión:

- URL: `http://localhost:3000/public/repair-status/[numeroDeSeguimiento]`
- El número de seguimiento se genera al crear la reparación (ej. `REP-1739...`) y puede mostrarse o enviarse al cliente.

### 8. Roles y permisos

- **admin:** Acceso completo (usuarios, permisos, auditoría, reportes, settings, etc.).
- **vendedor:** Crear ventas, compras, reparaciones; ver productos y listados según permisos asignados.
- **cliente:** Consulta de monedero y uso en ventas; no accede al panel de operación.

Los permisos granulares se gestionan en **Admin → matriz de permisos** (solo admin).

## Endpoints principales

- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`
- Auth extra: `GET /api/auth/csrf`, `POST /api/auth/logout`
- Productos: `GET /api/products` (opcional `?includeInactive=1`), `GET /api/products/critical`, `POST /api/products`, `PATCH /api/products/:id` (editar / desactivar con `active: false`)
- Compras: `GET /api/purchases` (listado con `supplier`, `page`, `limit`), `POST /api/purchases`
- Ventas: `GET /api/sales` (listado con `client`, `page`, `limit`), `POST /api/sales`
- Reparaciones: `GET /api/repairs` (listado con `status`, `page`, `limit`), `POST /api/repairs`, `PATCH /api/repairs/:id/status`
- Tracking público: `GET /api/public/repair-status/:trackingNumber`
- Reportes admin: `GET /api/reports/dashboard`, `GET /api/reports/export/pdf`, `GET /api/reports/export/excel`
- Monedero: `GET /api/wallet/me`
- Alertas: `GET /api/alerts`, `PATCH /api/alerts/:id/attend`
- Usuarios admin: `GET /api/users`, `PATCH /api/users/:id/role`
- Settings admin:
  - `GET /api/settings`
  - `PUT /api/settings`
  - `GET /api/settings/history` (filtros por `user`, `from`, `to`, `q`, `changedField`)
  - `GET /api/settings/history/summary` (resumen ejecutivo + serie diaria, soporta `windowDays=7|30`)
  - `GET /api/settings/history/export/csv`
  - `GET /api/settings/history/export/excel`

## Operación y mantenimiento

- Conversión mensual de puntos: programada en `backend/src/jobs/monthlyConversionJob.js`
- Backup de base de datos:

```bash
npm run backup --workspace backend
```

## Tests automatizados

Ejecución de tests backend:

```bash
npm run test:backend
```

Incluye pruebas de:

- Healthcheck del API
- Registro y login con JWT
- Flujo integrado compra/venta (stock y alertas)
- Flujo integrado de reparaciones con tracking público
- RBAC granular por permisos

Pruebas E2E frontend (Playwright):

```bash
npm run test:e2e
```

## Ejecución con Docker

Si prefieres entorno containerizado completo:

```bash
npm run docker:up
```

Detener servicios:

```bash
npm run docker:down
```

## Seguridad de sesión y CSRF

- Para operaciones mutables (`POST`, `PATCH`, etc.) el backend valida `x-csrf-token` contra cookie `csrfToken`.
- Obtener token CSRF:

```bash
GET /api/auth/csrf
```

- Login soporta `deviceId` para emitir refresh token ligado a dispositivo.
- Refresh rota token anterior y revoca la sesión previa en ese dispositivo.
- Logout revoca sesiones por dispositivo (`userId`, `deviceId`).
- RBAC ahora usa permisos granulares por acción (`backend/src/config/permissions.js`).
- Auditoría avanzada guarda `before`, `after` y `diff` por cambio.
- Matriz de permisos editable en runtime vía API (`GET/PUT /api/permissions`).
- Panel admin frontend en `/dashboard/admin` para gestionar permisos y consultar auditoría.
- Edición de permisos restringida estrictamente a rol `admin`.
- Auditoría con filtros por entidad, acción, usuario, rango de fechas y paginación.
- Vista timeline para lectura de cambios y diffs.
- Búsqueda global en auditoría (`q`) y exportación a CSV/Excel.
- Retención automática de logs de auditoría por días (`AUDIT_RETENTION_DAYS`) con cron diario.
- Endpoint de resumen de auditoría: `GET /api/audit-logs/summary`.
- Mini dashboard en `/dashboard/admin` con total logs, top acciones, top entidades, top usuarios y actividad diaria.
- Comparador de periodos en resumen (actual vs previo equivalente) con delta y porcentaje.
- Alertas inteligentes en resumen de auditoría con semáforo de riesgo (alto/medio/bajo).
- Notificación proactiva en tiempo real por WebSocket para anomalías de riesgo alto (`audit:anomaly`).
- Emisión en canal por usuario/rol (admins autenticados por socket).
- Soporte de reconocimiento (`ack`) de anomalías por usuario vía `audit:anomaly:ack`, persistido en MongoDB con expiración automática.
- Historial de acknowledgements consultable por admin en `GET /api/audit-logs/acknowledgements`.
- Historial de acknowledgements con filtro por firma (`signature`) y exportación:
  - `GET /api/audit-logs/acknowledgements/export/csv`
  - `GET /api/audit-logs/acknowledgements/export/excel`
- Bitácora dedicada de cambios de configuración en `GET /api/settings/history` con `before/after`, usuario y fecha.
- Exportación de bitácora de settings a CSV/Excel.
- Tarjeta en `/dashboard/admin` para auditar cambios de settings (valor anterior/nuevo, usuario, timestamp), con filtros por usuario, rango de fechas, búsqueda global y campo cambiado.
- Resumen ejecutivo en la bitácora de settings: total de cambios filtrados, último cambio y usuario más activo.
- Mini gráfico temporal en bitácora de settings con ventana de 7 o 30 días.
- Línea de tendencia por promedio diario sobre el gráfico temporal de cambios en settings.
- Color dinámico de tendencia (verde/amarillo/rojo) según intensidad de cambios promedio.

## CI/CD

Se agregó pipeline en `.github/workflows/ci.yml` que ejecuta:

- Instalación (`npm ci`)
- Tests backend (`npm run test:backend`)
- Build frontend (`npm run build --workspace frontend`)
- E2E frontend con Playwright (`npm run test:e2e`)

## Despliegue recomendado

- Backend: Docker o PM2 sobre VPS
- Frontend Next.js: Vercel o Node server
- MongoDB: Atlas o instancia administrada
- Reverse proxy: Nginx con HTTPS (Let's Encrypt)
- Variables sensibles en secretos del entorno (no en git)

## Mejoras sugeridas para siguiente iteración

- Tests automáticos (unit/integration/e2e)
- CSRF token en flujos basados en cookies
- Módulo completo de órdenes de reparación con adjuntos
- Panel de configuración dinámica de reglas de puntos
- Métricas en tiempo real más avanzadas con rooms de Socket.IO
