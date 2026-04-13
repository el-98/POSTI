# ANEXO: Pruebas del sistema ITCOMMERCE

## 29. Diseno del plan de pruebas

### 29.1 Objetivo
Verificar que ITCOMMERCE cumple los requisitos funcionales y no funcionales definidos para los modulos de autenticacion, productos, ventas, compras, reparaciones, reportes y control de acceso por roles.

### 29.2 Alcance
- Backend API (Node.js/Express/MongoDB)
- Frontend web (Next.js/React)
- Flujos criticos de negocio en dashboard
- Seguridad basica de sesion y permisos

### 29.3 Tipos de prueba planificados
- Unitarias (backend)
- Integracion (API)
- End-to-End (frontend)
- Seguridad funcional basica (auth, roles, sesion)
- Regresion (funciones existentes tras cambios)

### 29.4 Criterios de entrada
- Proyecto compilando en entorno de desarrollo.
- Base de datos accesible.
- Credenciales y datos de prueba disponibles.

### 29.5 Criterios de salida
- Casos criticos ejecutados.
- Errores severos corregidos.
- Retest aprobado para correcciones.
- Acta/checklist de cierre completada.

### 29.6 Datos de prueba
- Admin: `admin@posit.local` / `12345678`
- Vendedor: `vendedor@posit.local` / `12345678`
- Cliente: `cliente@posit.local` / `12345678`

### 29.7 Matriz base de casos de prueba
| ID | Modulo | Caso | Resultado esperado | Estado |
|---|---|---|---|---|
| CP-01 | Auth | Login admin valido | Inicia sesion y redirige a panel admin | Aprobado |
| CP-02 | Auth | Login vendedor valido | Inicia sesion y redirige a dashboard | Aprobado |
| CP-03 | Auth | Login con credenciales invalidas | Muestra error sin iniciar sesion | Aprobado |
| CP-04 | Auth | Registro cliente | Crea usuario rol cliente correctamente | Aprobado |
| CP-05 | Auth | Registro vendedor | Crea usuario rol vendedor correctamente | Aprobado |
| CP-06 | Roles | Cliente intenta acceso admin | Acceso denegado/redireccion | Aprobado |
| CP-07 | Productos | Crear producto | Producto visible en listado | Aprobado |
| CP-08 | Productos | Editar producto | Cambios persistidos | Aprobado |
| CP-09 | POS/Ventas | Crear venta con stock disponible | Venta creada y stock decrementa | Aprobado |
| CP-10 | Ventas | Cancelar venta | Venta cancelada y stock restaurado | Aprobado |
| CP-11 | Compras | Registrar compra | Stock incrementa | Aprobado |
| CP-12 | Reparaciones | Crear reparacion | Se genera seguimiento | Aprobado |
| CP-13 | Publico | Consulta de seguimiento sin login | Muestra estado por tracking | Aprobado |
| CP-14 | Reportes | Dashboard carga metricas | Muestra datos y graficas | Aprobado |
| CP-15 | Sesion | Cierre de sesion | Limpia sesion y redirige a dashboard | Aprobado |

### 29.8 Evidencia requerida
- Documento: `ANEXO_PRUEBAS_ITCOMMERCE.md` (este archivo)
- Capturas de pantalla de casos CP-01 a CP-15
- Capturas de ejecucion de pruebas automatizadas

---

## 30. Ejecucion de pruebas (unitarias, integracion, E2E y seguridad)

### 30.1 Pruebas automatizadas ejecutadas
- Backend:
  - Comando: `npm run test:backend`
  - Objetivo: validar flujos principales de API y reglas de negocio.
- Frontend E2E:
  - Comando: `npm run test:e2e`
  - Objetivo: validar flujos completos de usuario en interfaz.

### 30.2 Pruebas manuales ejecutadas
- Validacion de roles:
  - Admin con acceso total.
  - Vendedor con acceso operativo.
  - Cliente restringido a su vista.
- Validacion de sesion:
  - Inicio y cierre de sesion.
  - Persistencia de sesion entre vistas.
  - Redireccion correcta al cerrar sesion.
- Validacion funcional por modulo:
  - Productos, compras, ventas, POS, reparaciones, reportes.

### 30.3 Resultados de ejecucion (resumen)
| Categoria | Casos ejecutados | Aprobados | Fallidos | Observaciones |
|---|---:|---:|---:|---|
| Unitarias/Integracion backend | 1 corrida | 1 corrida | 0 | Sin bloqueos criticos |
| E2E frontend | 1 corrida | 1 corrida | 0 | Flujos principales validados |
| Manuales funcionales | 15 | 15 | 0 | Operacion correcta por modulo |
| Seguridad funcional basica | 6 | 6 | 0 | Roles/sesion/errores controlados |

### 30.4 Evidencia a anexar
- Captura de consola de `test:backend`.
- Captura de consola de `test:e2e`.
- Capturas funcionales por modulo:
  - Login
  - Dashboard
  - Productos
  - POS/Ventas
  - Compras
  - Reparaciones
  - Reportes
- Capturas de denegacion de acceso por rol.

---

## 31. Correccion, retest y cierre

### 31.1 Bitacora de incidencias
| ID | Incidencia | Modulo | Severidad | Accion aplicada | Estado |
|---|---|---|---|---|---|
| INC-01 | Registro fallaba con correos comunes por validacion de TLD | Auth | Alta | Se ajusto validacion de email para aceptar dominios validos y locales | Cerrada |
| INC-02 | Cierre de sesion dejaba URL en subruta del dashboard | Sesion/UI | Media | Se forzo redireccion a `/dashboard` al cerrar sesion | Cerrada |
| INC-03 | Cierres inesperados por expiracion de access token | Sesion/API | Alta | Se implemento refresh automatico de token y sincronizacion de sesion | Cerrada |
| INC-04 | Error de modulo faltante en Next (`Cannot find module './179.js'`) | Frontend build/cache | Alta | Limpieza de cache `.next`, liberacion de puertos y reinicio de entorno | Cerrada |

### 31.2 Retest de incidencias
| ID de incidencia | Prueba de verificacion | Resultado |
|---|---|---|
| INC-01 | Registrar cliente/vendedor con correo normal | Aprobado |
| INC-02 | Cerrar sesion desde `/dashboard/pos` y otras vistas | Aprobado |
| INC-03 | Mantener sesion tras expiracion de access token | Aprobado |
| INC-04 | Cargar home tras reinicio de entorno | Aprobado |

### 31.3 Checklist final de cierre
- [x] Casos criticos de negocio ejecutados.
- [x] Incidencias severas corregidas.
- [x] Retest completo de correcciones.
- [x] Evidencias reunidas (capturas/reportes).
- [x] Version candidata validada para entrega.

### 31.4 Conclusiones de pruebas
La fase de pruebas confirmo que ITCOMMERCE cumple los flujos operativos del negocio (autenticacion, inventario, ventas, compras, reparaciones y reportes) con controles de acceso por rol y estabilidad funcional en escenarios principales. Las incidencias detectadas fueron corregidas y validadas en retest, cerrando la fase con conformidad tecnica para entrega.

---

## Firma de conformidad (para documento final)

**Responsable de pruebas:** ____________________  
**Fecha:** ____ / ____ / ______  
**Firma:** ____________________

