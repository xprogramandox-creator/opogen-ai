# OpoGen AI · Panel de Administración

Documentación del panel administrativo total de OpoGen AI.

## Requisitos

- Node.js 24 o superior (usa `node:sqlite`).
- npm.
- Una clave `AUTH_SECRET` para las sesiones.
- Variables de Stripe y Resend si se usan sus funciones.

## Instalación

```bash
npm install
cp .env.example .env.local
npm run dev
```

La aplicación queda en `http://localhost:3000`.

## Variables de entorno

Además de las variables ya usadas por OpoGen AI, el panel utiliza:

```env
# Sesiones de usuario
AUTH_SECRET=una-cadena-larga-y-aleatoria

# Datos del administrador inicial (solo para seed:admin)
ADMIN_TELEFONO=34_601040557
ADMIN_PASSWORD=CambiaEstaClave123!
ADMIN_NOMBRE=Manuel
ADMIN_APELLIDOS=Pujante Noguera
ADMIN_CORREO=soporte@opogenai.com
```

No se debe versionar `.env.local`.

## Crear el primer administrador

```bash
npm run seed:admin
```

El script:

1. Crea `Premium/<teléfono>/datos.txt` con contraseña Argon2id si no existe.
2. Aplica la migración `migraciones/001_panel_admin.sql`.
3. Crea `.admin/panel.sqlite` y registra al administrador.

Si el archivo del administrador ya existe, **no se sobrescribe**. El acceso al panel está limitado al teléfono definido en `lib/planes.ts` como `CLAVE_ADMIN`.

Cambia `ADMIN_PASSWORD` antes de usar el seeder en producción.

## Acceso al panel

1. Inicia sesión con la cuenta administradora.
2. Entra en:

```text
/admin
```

Cualquier usuario que no sea el administrador es redirigido a `/dashboard` tanto en el layout del servidor como en las APIs.

## Secciones

### Resumen

- Usuarios totales, Free y Premium.
- Nuevos usuarios por día, semana, mes y año.
- Premium caducados sin renovar.
- Ingresos base e IVA por día, semana, mes y año.
- Próximos a caducar en 7, 15 y 30 días.
- Historial de acciones administrativas.

### Usuarios y suscripciones

- Búsqueda por nombre, apellidos, correo o teléfono.
- Filtros por tipo de cuenta, estado y plan.
- Paginación de 25 usuarios.
- Alta de usuarios Free/Premium.
- Edición de plan, precio base, IVA, fechas y contraseña.
- Eliminación con confirmación modal.
- Registro de pagos en el histórico.

Los precios se guardan **siempre separados**:

- `precio_base`
- `iva`
- `total`

El IVA se calcula automáticamente al escribir el precio base, pero puede editarse manualmente.

### Estadísticas de uso

El componente `RegistrarUsoZona` registra la zona visitada y el tiempo de permanencia. Se contabilizan:

- Número de usos.
- Usuarios únicos.
- Duración total.

Zonas registradas: Inicio, Crear test, Arcade, Mi Espacio, Estadísticas, Zona Kids, Premium, Cuenta, Legal y Otros.

### Facturación

- Base imponible, IVA y total anual.
- Facturación mensual agrupada.
- Histórico de pagos.
- Moneda: EUR.

Los pagos son inmutables: no se actualizan desde el panel. Cada alta o renovación crea un registro nuevo.

### Exportación

- Selección de campos mediante checkboxes.
- Filtros por fechas, tipo de usuario, plan y estado.
- Plantilla **Datos para Hacienda** con base imponible, IVA, total, usuario, fecha y concepto.
- Descarga en PDF y botón de impresión.

Cada exportación queda registrada en `logs_admin`.

## Base de datos

El proyecto mantiene el almacenamiento de usuarios existente en archivos (`Premium/` y `Freemium/`) y añade un índice relacional SQLite para el panel:

```text
.admin/panel.sqlite
```

Tablas:

- `usuarios`: instantánea administrativa de usuarios y suscripciones.
- `pagos`: histórico inmutable de pagos con base, IVA y total.
- `logs_admin`: administrador, acción, detalle, fecha e IP.
- `uso_zonas`: usos por zona, usuario y duración.
- `configuracion`: parámetros como el IVA general.

Migración:

```bash
sqlite3 .admin/panel.sqlite < migraciones/001_panel_admin.sql
```

La aplicación crea la base de datos automáticamente si no existe. `.admin/` está excluido de Git.

> Los usuarios se sincronizan desde los archivos existentes. El panel no elimina ni modifica los archivos originales salvo en las acciones de alta, edición o borrado de usuarios.

## Seguridad

- Acceso exclusivo al teléfono administrador (`CLAVE_ADMIN`).
- Comprobación de sesión en el layout y en cada endpoint.
- Verificación CSRF en todas las operaciones de escritura.
- Rate limiting en acciones administrativas y en el registro de uso.
- Consultas SQLite preparadas para evitar inyección SQL.
- React escapa el contenido de usuario; los PDF se generan con texto plano saneado.
- Log de acciones críticas con administrador, fecha, hora e IP.
- Sesiones HMAC existentes y cierre de sesión del resto de la aplicación.

## Endpoints principales

```text
GET    /api/admin/panel
GET    /api/admin/panel/usuarios
POST   /api/admin/panel/usuarios
DELETE /api/admin/panel/usuarios?clave=...
GET    /api/admin/panel/config
POST   /api/admin/panel/config
POST   /api/admin/panel/exportar
POST   /api/uso
```

## Estructura

```text
app/admin/
  layout.tsx          Protección de acceso
  page.tsx            Panel administrativo
app/api/admin/panel/
  route.ts            Resumen, pagos, uso y logs
  usuarios/route.ts   CRUD de usuarios
  config/route.ts     IVA configurable
  exportar/route.ts   PDF personalizado
app/api/uso/route.ts  Registro de uso por zona
components/AdminPanel.tsx
components/RegistrarUsoZona.tsx
lib/admin-db.ts       Esquema y consultas SQLite
lib/admin-panel-auth.ts
migraciones/001_panel_admin.sql
scripts/seed-admin.mjs
```

## Comprobaciones

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Limitaciones conocidas

- El sistema de autenticación original usa archivos, no un ORM. SQLite actúa como índice administrativo y almacén de logs, pagos y uso.
- Los pagos históricos iniciales se generan a partir de los datos de suscripción existentes; las renovaciones futuras deben registrarse desde el panel o desde el webhook de Stripe.
- El registro de uso se envía al salir de la página o al cambiar de ruta; sesiones cerradas abruptamente pueden no registrar la duración.
