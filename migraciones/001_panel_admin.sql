-- Migración inicial del panel administrativo de OpoGen AI.
-- Motor: SQLite (node:sqlite). Moneda: EUR. Importes en euros con 2 decimales.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS usuarios (
  clave TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellidos TEXT NOT NULL DEFAULT '',
  correo TEXT NOT NULL,
  telefono TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('freemium', 'premium')),
  plan TEXT NOT NULL DEFAULT '',
  email_verificado INTEGER NOT NULL DEFAULT 0,
  fecha_registro TEXT NOT NULL,
  fecha_pago TEXT,
  fecha_caducidad TEXT,
  precio_base REAL NOT NULL DEFAULT 0,
  iva REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'Sin suscripción',
  stripe_customer_id TEXT NOT NULL DEFAULT '',
  stripe_subscription_id TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS pagos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_clave TEXT NOT NULL,
  usuario_nombre TEXT NOT NULL,
  fecha TEXT NOT NULL,
  concepto TEXT NOT NULL,
  plan TEXT NOT NULL,
  precio_base REAL NOT NULL,
  iva REAL NOT NULL,
  total REAL NOT NULL,
  referencia TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS logs_admin (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  administrador TEXT NOT NULL,
  accion TEXT NOT NULL,
  detalle TEXT NOT NULL DEFAULT '',
  fecha TEXT NOT NULL,
  ip TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS uso_zonas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_clave TEXT NOT NULL DEFAULT '',
  zona TEXT NOT NULL,
  fecha TEXT NOT NULL,
  duracion_segundos INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS configuracion (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS registros_pendientes (
  token TEXT PRIMARY KEY,
  clave TEXT NOT NULL,
  correo TEXT NOT NULL,
  datos_json TEXT NOT NULL,
  expira INTEGER NOT NULL,
  creado TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pendientes_clave ON registros_pendientes(clave);
CREATE INDEX IF NOT EXISTS idx_pendientes_correo ON registros_pendientes(correo);

CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_estado ON usuarios(estado);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON pagos(fecha);
CREATE INDEX IF NOT EXISTS idx_uso_fecha ON uso_zonas(fecha);
CREATE INDEX IF NOT EXISTS idx_logs_fecha ON logs_admin(fecha);

INSERT OR IGNORE INTO configuracion (clave, valor) VALUES ('iva', '21');
