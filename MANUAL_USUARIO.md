# Manual de usuario — ITCOMMERCE

## 1. Introducción

**ITCOMMERCE** es un sistema de punto de venta (POS) y gestión comercial que permite:

- Registrar ventas en caja y llevar historial de ventas.
- Gestionar productos, stock e inventario.
- Registrar compras a proveedores y reponer inventario.
- Gestionar reparaciones con seguimiento por código.
- Ver reportes, corte de caja y recompensas (monedero y puntos) para clientes.
- Panel de administración con auditoría, permisos y gráficos de ventas.

Este manual describe el uso de la aplicación desde el navegador para cada tipo de usuario.

---

## 2. Roles de usuario

| Rol        | Descripción breve |
|-----------|-------------------|
| **Admin** | Acceso total: auditoría, permisos, configuración, gráficos de ventas y productos vendidos. |
| **Vendedor** | Caja, ventas, productos, compras, reparaciones, reportes, corte, recompensas y alertas. |
| **Cliente** | Solo "Mi cuenta": monedero, puntos, mis compras y mis reparaciones. |

Los clientes pueden acceder con **código y PIN** (sin correo) desde la opción "¿Eres cliente? Accede con código y PIN".

---

## 3. Acceso a la aplicación

### 3.1 Iniciar sesión (correo y contraseña)

1. Abra la URL del sistema (ej.: `http://localhost:3000`).
2. En la pantalla de login:
   - **Correo electrónico**: su correo.
   - **Contraseña**: su contraseña.
3. Pulse **Iniciar sesión**.
4. Según su rol será redirigido a:
   - **Admin** → Panel de administración.
   - **Cliente** → Mi cuenta.
   - **Vendedor** u otro → Dashboard principal.

**Nota:** El primer administrador se crea al iniciar el servidor (por defecto `admin@posit.local` / `12345678`). No es posible registrarse como admin desde la interfaz.

### 3.2 Acceso para clientes (código y PIN)

1. En la pantalla de login, pulse **"¿Eres cliente? Accede con código y PIN"**.
2. En la página **Ver cuenta**:
   - **Código de cliente**: el que le entregaron al registrarse.
   - **PIN**: el PIN asignado.
3. Pulse el botón de acceso. Entrará a **Mi cuenta** (monedero, compras, reparaciones).

### 3.3 Cerrar sesión

En el menú lateral (sidebar), pulse **Cerrar sesión**.

---

## 4. Dashboard principal (vendedor / admin)

Tras iniciar sesión como vendedor o admin, verá el **Dashboard** con:

- **Resumen del día**: ventas de hoy, ganancia total, reparaciones pendientes, usuarios, clientes (frecuente/ocasional).
- **Alerta de stock bajo** (si aplica): barra en la parte superior con la lista de productos con stock bajo o en cero; puede cerrarla o ir a Productos.
- **Ventas recientes**: tabla con las últimas ventas y enlace a "Ver todas las ventas".
- **Ventas por mes**: gráfico de barras con el total de ventas por mes.
- **Productos con poco stock**: lista de productos en o por debajo del mínimo; enlace a Productos.
- **Top clientes**: clientes con mayor total comprado.

Desde aquí puede ir a **Caja**, **Corte**, **Reportes**, **Productos**, **Ventas**, **Recompensas**, **Compras**, **Reparaciones** y (solo admin) **Admin**.

---

## 5. Caja (POS)

Permite registrar una venta rápida en punto de venta.

1. Seleccione **cliente** (o cree uno nuevo por nombre).
2. Elija **forma de pago**: efectivo, tarjeta, transferencia, monedero o mixto.
3. Añada **ítems**: producto y cantidad; puede agregar más líneas.
4. Si el cliente tiene monedero, puede aplicarse al total.
5. Pulse **Crear venta** (o equivalente). Se descuenta stock y se registra la venta.
6. Opcional: imprimir ticket / PDF desde el historial de ventas.

---

## 6. Ventas

- **Historial**: filtros por cliente, fecha desde/hasta y opción **Ver canceladas**.
- **Resumen**: total vendido en el período y desglose por **método de pago** (tarjetas con total y cantidad de ventas).
- Por cada venta puede:
  - **Cancelar**: confirma; se restaura el stock y la venta queda marcada como cancelada. Solo ventas no canceladas cuentan en reportes y totales.
  - **Ticket / PDF**: imprimir o descargar el ticket.
- **Exportar CSV**: descarga un CSV con las ventas del filtro actual.
- **Registrar venta**: formulario para crear una venta (cliente, pago, ítems), igual que en Caja.

---

## 7. Productos

- **Listado** de productos con nombre, SKU, categoría, stock, precios, etc.
- **Crear producto**: nombre, SKU, categoría, stock actual, mínimo, proveedor, precios, imagen (URL o subida desde el equipo).
- **Editar producto**: modificar datos y/o imagen.
- **Imagen**: se puede indicar una URL o subir un archivo; la aplicación muestra la imagen en el listado cuando está configurada.
- Productos con stock en cero o por debajo del mínimo aparecen en el reporte de faltantes y en la alerta de stock bajo del dashboard.

---

## 8. Compras

- **Listado** de compras a proveedores.
- **Registrar compra**: proveedor, productos y cantidades. Al confirmar, se **reponen** las cantidades en el inventario (incremento de stock).
- **Proveedores**: se obtienen del listado de compras (suppliers).

---

## 9. Reparaciones

- **Listado** de reparaciones con estado, cliente, descripción, número de seguimiento, etc.
- **Crear reparación**: cliente, descripción del problema, etc. Al crearla se genera un **código de seguimiento**.
- **Enlace cliente**: desde cada reparación puede copiarse el enlace para que el cliente vea el estado en la página pública de seguimiento.
- **Actualizar estado**: cambiar el estado de la reparación (Recibido, En proceso, etc.).

El cliente puede ver sus reparaciones en **Mi cuenta** y seguir el estado por el enlace o en la página pública **Seguimiento de reparación** (código o `?tracking=`).

---

## 10. Reportes

- **Reporte de dashboard**: resumen general (ventas por mes, ganancia, reparaciones, stock bajo, etc.).
- **Corte de caja**: ver/exportar el corte por día (totales y por forma de pago).
- **Faltantes**: productos en cero o bajo mínimo; exportar a Excel/PDF.
- **Exportar**: reportes en Excel y PDF según la opción disponible en cada pantalla.

---

## 11. Corte de caja

- Selección de **fecha** para el corte.
- Se muestra el **resumen del día**: total cobrado, número de ventas y desglose por **método de pago**.
- Listado de ventas del día.
- Opción de **imprimir** el corte.

Solo se consideran ventas no canceladas.

---

## 12. Recompensas

- **Monedero y puntos** del cliente: consultar saldo y movimientos.
- Búsqueda por **cliente** (correo o identificador) para ver su monedero y aplicar saldo o gestionar recompensas según permisos.
- Las compras generan puntos; la conversión de puntos a monedero se hace de forma automática (tarea programada mensual).

---

## 13. Panel de administración (Admin)

Solo visible para el rol **admin**. Incluye:

### 13.1 Ventas y productos vendidos

- **Gráfico de ventas por mes**: total de ventas ($) por mes.
- **Gráfico de productos más vendidos**: barras horizontales con los productos con más unidades vendidas (top 10).

### 13.2 Configuración del sistema

- **Retención ACK (horas)**: tiempo que se mantienen las alertas reconocidas.
- **Bitácora de cambios de configuración**: historial de cambios con filtros y exportación CSV/Excel.
- **Tendencia de cambios**: gráfico de actividad de cambios por día.

### 13.3 Matriz de permisos

- Permisos por rol (admin, vendedor, cliente): marcar/desmarcar permisos y **Guardar** por rol.
- Define qué puede hacer cada rol (lectura de productos, crear ventas, reparaciones, etc.).

### 13.4 Auditoría avanzada

- **Filtros**: búsqueda global, entidad, acción, usuario, fechas, firma ACK.
- **Resumen**: total de logs, tendencia, top acciones, top entidades, usuarios más activos.
- **Alertas inteligentes (anomalías)** y **alertas en tiempo real** (socket); opción de reconocer alerta.
- **Historial de alertas reconocidas** (solo admin) con exportación.
- **Actividad diaria**: gráfico de logs por día.
- **Timeline** de registros de auditoría con opción de exportar CSV/Excel.

---

## 14. Mi cuenta (Cliente)

Para usuarios con rol **cliente**:

- **Monedero y puntos**: saldo de monedero, puntos acumulados, próximas conversiones y últimos movimientos (monedero y puntos).
- **Mis compras**: resumen (total gastado, última compra, número de compras) y listado de compras con detalle de ítems. No se muestran ventas canceladas.
- **Mis reparaciones**: listado con número de seguimiento, estado, descripción y enlace para ver seguimiento en la página pública.

---

## 15. Ver cuenta (acceso cliente por código y PIN)

- Ruta típica: `/ver-cuenta`.
- El cliente introduce **código** y **PIN** para acceder sin correo/contraseña.
- Tras validar, entra a **Mi cuenta** con las mismas opciones descritas arriba.

---

## 16. Seguimiento de reparación (público)

- Ruta: `/public/repair-status` o con parámetro `?tracking=CODIGO`.
- Cualquier persona con el **código de seguimiento** puede ver el estado de la reparación sin iniciar sesión.
- Se muestra un **stepper** con el estado actual e **historial** de cambios.
- Opción para **copiar enlace** y compartirlo con el cliente.

---

## 17. Alertas y notificaciones

- **Stock bajo**: al cargar el dashboard (vendedor/admin), si hay productos en o por debajo del mínimo, se muestra una **alerta push** en la parte superior con la lista de productos y cantidades; se puede cerrar o ir a Productos. La alerta no se vuelve a mostrar en la misma sesión durante un tiempo (según configuración).
- **Toasts**: mensajes breves de éxito o error en la esquina de la pantalla (por ejemplo al guardar, cancelar venta o cargar reportes).

---

## 18. Tema (claro / oscuro)

- En la esquina superior derecha hay un **selector de tema** (claro/oscuro). El cambio afecta a toda la interfaz.

---

## 19. Resumen rápido por rol

| Acción                    | Admin | Vendedor | Cliente |
|---------------------------|-------|----------|--------|
| Dashboard                 | Sí    | Sí       | No (va a Mi cuenta) |
| Caja / POS                | Sí    | Sí       | No     |
| Ventas (historial, cancelar) | Sí | Sí       | No     |
| Productos                 | Sí    | Sí       | No     |
| Compras                   | Sí    | Sí       | No     |
| Reparaciones              | Sí    | Sí       | No     |
| Reportes / Corte          | Sí    | Sí       | No     |
| Recompensas (monedero)    | Sí    | Sí       | No     |
| Mi cuenta (monedero, compras, reparaciones) | No* | No* | Sí |
| Admin (auditoría, permisos, gráficos) | Sí | No | No |
| Ver cuenta (código y PIN) | No    | No       | Sí     |
| Seguimiento reparación (público) | Sí (con enlace) | Sí (con enlace) | Sí (con enlace) |

\* Admin y vendedor no usan la vista "Mi cuenta"; los clientes solo ven esa vista tras login o acceso por código/PIN.

---

*Documento: Manual de usuario ITCOMMERCE. Versión 1.0.*
