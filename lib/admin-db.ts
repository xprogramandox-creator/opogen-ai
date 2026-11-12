import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { listarUsuarios } from "@/lib/auth-server";
import type { UsuarioRegistrado } from "@/lib/auth-server";
import { RUTA_DATOS } from "@/lib/rutas";
import { diaAnalitico } from "@/lib/analitica";

const DIRECTORIO = path.join(
  /* turbopackIgnore: true */
  RUTA_DATOS,
  ".admin",
);
const ARCHIVO = path.join(
  /* turbopackIgnore: true */
  DIRECTORIO,
  "panel.sqlite",
);
const IVA_POR_DEFECTO = 21;

export type UsuarioAdmin = {
  clave: string;
  nombre: string;
  apellidos: string;
  nombreCompleto: string;
  documentoIdentidad: string;
  tipoDocumento: string;
  correo: string;
  telefono: string;
  rol: "freemium" | "premium";
  plan: string;
  emailVerificado: boolean;
  fechaRegistro: string;
  fechaPago: string | null;
  fechaCaducidad: string | null;
  precioBase: number;
  iva: number;
  total: number;
  estado: "Activa" | "Caducada" | "Sin suscripción";
  stripeCustomerId: string;
  stripeSubscriptionId: string;
};

export type PagoAdmin = {
  id: number;
  usuarioClave: string;
  usuarioNombre: string;
  fecha: string;
  concepto: string;
  plan: string;
  precioBase: number;
  iva: number;
  total: number;
  referencia: string;
  archivado: boolean;
  archivadoEstadisticas: boolean;
};

export type LogAdmin = {
  id: number;
  administrador: string;
  accion: string;
  detalle: string;
  fecha: string;
  ip: string;
};

type FilaUsuario = {
  clave: string;
  nombre: string;
  apellidos: string;
  nombre_completo: string;
  documento_identidad: string;
  tipo_documento: string;
  correo: string;
  telefono: string;
  rol: string;
  plan: string;
  email_verificado: number;
  fecha_registro: string;
  fecha_pago: string | null;
  fecha_caducidad: string | null;
  precio_base: number;
  iva: number;
  total: number;
  estado: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
};

const globalDb = globalThis as typeof globalThis & {
  __opogenAdminDb?: DatabaseSync;
};

function abrirDb(): DatabaseSync {
  if (!globalDb.__opogenAdminDb) {
    mkdirSync(DIRECTORIO, { recursive: true });
    const db = new DatabaseSync(ARCHIVO);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(`
      CREATE TABLE IF NOT EXISTS usuarios (
        clave TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        apellidos TEXT NOT NULL DEFAULT '',
        nombre_completo TEXT NOT NULL DEFAULT '',
        documento_identidad TEXT NOT NULL DEFAULT '',
        tipo_documento TEXT NOT NULL DEFAULT '',
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
        referencia TEXT NOT NULL DEFAULT '',
        archivado INTEGER NOT NULL DEFAULT 0,
        archivado_estadisticas INTEGER NOT NULL DEFAULT 0
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
        duracion_segundos INTEGER NOT NULL DEFAULT 0,
        archivado INTEGER NOT NULL DEFAULT 0
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
      CREATE TABLE IF NOT EXISTS analitica_sesiones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        usuario_clave TEXT NOT NULL DEFAULT '',
        usuario_nombre TEXT NOT NULL DEFAULT '',
        rol TEXT NOT NULL CHECK (rol IN ('premium', 'freemium', 'invitado')),
        dia TEXT NOT NULL,
        primera_visita TEXT NOT NULL,
        ultima_actividad TEXT NOT NULL,
        UNIQUE(session_id, dia)
      );
      CREATE TABLE IF NOT EXISTS actividad_invitados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        pagina TEXT NOT NULL CHECK (pagina IN ('landing', 'crear', 'arcade')),
        accion TEXT NOT NULL CHECK (accion IN ('visita', 'test_creado', 'partida_arcade')),
        fecha TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS descuentos_stripe (
        codigo TEXT PRIMARY KEY,
        promotion_code_id TEXT NOT NULL UNIQUE,
        coupon_id TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('porcentaje', 'importe')),
        valor REAL NOT NULL,
        fecha_inicio TEXT NOT NULL,
        fecha_fin TEXT,
        activo_manual INTEGER NOT NULL DEFAULT 1,
        creado TEXT NOT NULL,
        actualizado TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_pendientes_clave ON registros_pendientes(clave);
      CREATE INDEX IF NOT EXISTS idx_pendientes_correo ON registros_pendientes(correo);
      CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
      CREATE INDEX IF NOT EXISTS idx_usuarios_estado ON usuarios(estado);
      CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON pagos(fecha);
      CREATE INDEX IF NOT EXISTS idx_uso_fecha ON uso_zonas(fecha);
      CREATE INDEX IF NOT EXISTS idx_logs_fecha ON logs_admin(fecha);
      CREATE INDEX IF NOT EXISTS idx_analitica_ultima ON analitica_sesiones(ultima_actividad);
      CREATE INDEX IF NOT EXISTS idx_analitica_dia_rol ON analitica_sesiones(dia, rol);
      CREATE INDEX IF NOT EXISTS idx_actividad_invitados_fecha ON actividad_invitados(fecha);
      CREATE INDEX IF NOT EXISTS idx_actividad_invitados_session ON actividad_invitados(session_id);
    `);

    // Migración aditiva para instalaciones que ya tenían la tabla creada.
    const columnas = db
      .prepare("PRAGMA table_info(usuarios)")
      .all() as Array<{ name: string }>;
    const existentes = new Set(columnas.map((columna) => columna.name));
    const columnasNuevas: Array<[string, string]> = [
      ["nombre_completo", "TEXT NOT NULL DEFAULT ''"],
      ["documento_identidad", "TEXT NOT NULL DEFAULT ''"],
      ["tipo_documento", "TEXT NOT NULL DEFAULT ''"],
    ];

    for (const [nombre, definicion] of columnasNuevas) {
      if (!existentes.has(nombre)) {
        db.exec(
          `ALTER TABLE usuarios ADD COLUMN ${nombre} ${definicion}`,
        );
      }
    }

    const columnasPagos = db
      .prepare("PRAGMA table_info(pagos)")
      .all() as Array<{ name: string }>;
    const existentesPagos = new Set(
      columnasPagos.map((columna) => columna.name),
    );

    for (const [nombre, definicion] of [
      ["archivado", "INTEGER NOT NULL DEFAULT 0"],
      ["archivado_estadisticas", "INTEGER NOT NULL DEFAULT 0"],
    ] as Array<[string, string]>) {
      if (!existentesPagos.has(nombre)) {
        db.exec(
          `ALTER TABLE pagos ADD COLUMN ${nombre} ${definicion}`,
        );
      }
    }

    const columnasUso = db
      .prepare("PRAGMA table_info(uso_zonas)")
      .all() as Array<{ name: string }>;
    const existentesUso = new Set(
      columnasUso.map((columna) => columna.name),
    );

    if (!existentesUso.has("archivado")) {
      db.exec(
        "ALTER TABLE uso_zonas ADD COLUMN archivado INTEGER NOT NULL DEFAULT 0",
      );
    }

    db.prepare(
      "INSERT OR IGNORE INTO configuracion (clave, valor) VALUES ('iva', ?)",
    ).run(String(IVA_POR_DEFECTO));
    globalDb.__opogenAdminDb = db;
  }

  const db = globalDb.__opogenAdminDb;
  db.exec(`
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
  `);

  return db;
}

function numero(valor: unknown): number {
  return typeof valor === "number" && Number.isFinite(valor)
    ? valor
    : 0;
}

export function precioBasePlan(plan: string): number {
  if (plan === "mensual") return 9;
  if (plan === "semestral") return 48;
  if (plan === "anual") return 69.42;
  return 0;
}

export function obtenerIva(): number {
  const fila = abrirDb()
    .prepare("SELECT valor FROM configuracion WHERE clave = 'iva'")
    .get() as { valor?: string } | undefined;
  const valor = Number(fila?.valor);
  return Number.isFinite(valor) && valor >= 0 && valor <= 100
    ? valor
    : IVA_POR_DEFECTO;
}

export function guardarIva(valor: number): void {
  abrirDb()
    .prepare(
      "INSERT INTO configuracion (clave, valor) VALUES ('iva', ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor",
    )
    .run(String(valor));
}

function estadoSuscripcion(usuario: UsuarioRegistrado): UsuarioAdmin["estado"] {
  if (usuario.rol !== "premium") return "Sin suscripción";
  if (usuario.planContratado === "ilimitado") return "Activa";
  if (!usuario.fechaCaducidad) return "Caducada";
  return new Date(usuario.fechaCaducidad).getTime() > Date.now()
    ? "Activa"
    : "Caducada";
}

function convertir(fila: FilaUsuario): UsuarioAdmin {
  return {
    clave: fila.clave,
    nombre: fila.nombre,
    apellidos: fila.apellidos,
    nombreCompleto:
      fila.nombre_completo ||
      `${fila.nombre} ${fila.apellidos}`.trim(),
    documentoIdentidad: fila.documento_identidad,
    tipoDocumento: fila.tipo_documento,
    correo: fila.correo,
    telefono: fila.telefono,
    rol: fila.rol === "premium" ? "premium" : "freemium",
    plan: fila.plan,
    emailVerificado: fila.email_verificado === 1,
    fechaRegistro: fila.fecha_registro,
    fechaPago: fila.fecha_pago,
    fechaCaducidad: fila.fecha_caducidad,
    precioBase: numero(fila.precio_base),
    iva: numero(fila.iva),
    total: numero(fila.total),
    estado: fila.estado as UsuarioAdmin["estado"],
    stripeCustomerId: fila.stripe_customer_id,
    stripeSubscriptionId: fila.stripe_subscription_id,
  };
}

/** Sincroniza los usuarios de los archivos con el índice administrativo. */
export async function sincronizarUsuarios(
  crearPagos = true,
): Promise<void> {
  const db = abrirDb();
  const iva = obtenerIva() / 100;
  const usuarios = await listarUsuarios();
  const ahora = new Date().toISOString();
  const clavesVivas = new Set(usuarios.map(({ usuario }) => usuario.clave));

  for (const { usuario, rutaArchivo } of usuarios) {
    const existente = db
      .prepare("SELECT * FROM usuarios WHERE clave = ?")
      .get(usuario.clave) as FilaUsuario | undefined;

    const plan = usuario.planContratado || "";
    const estado = estadoSuscripcion(usuario);
    const sinSuscripcion = usuario.rol !== "premium" || !plan;

    // El precio debe corresponder al plan actual. Si el último pago registrado
    // es de otro plan, el usuario cambió de suscripción y hay que recalcularlo.
    const ultimoPago = existente
      ? (db
          .prepare(
            "SELECT plan FROM pagos WHERE usuario_clave = ? ORDER BY fecha DESC, id DESC LIMIT 1",
          )
          .get(usuario.clave) as { plan?: string } | undefined)
      : undefined;
    const precioCanonico = precioBasePlan(plan);
    const debeRecalcularPrecio =
      Boolean(plan) &&
      precioCanonico > 0 &&
      (!existente ||
        !ultimoPago ||
        (ultimoPago.plan || "") !== plan);

    const precioBase = redondearMoneda(
      sinSuscripcion
        ? 0
        : debeRecalcularPrecio
          ? precioCanonico
          : existente
            ? numero(existente.precio_base)
            : precioCanonico,
    );
    const ivaUsuario = redondearMoneda(
      sinSuscripcion
        ? 0
        : debeRecalcularPrecio
          ? precioBase * iva
          : existente
            ? numero(existente.iva)
            : precioBase * iva,
    );
    const total = redondearMoneda(
      sinSuscripcion
        ? 0
        : debeRecalcularPrecio
          ? precioBase + ivaUsuario
          : existente
            ? numero(existente.total)
            : precioBase + ivaUsuario,
    );
    const fechaPago = sinSuscripcion
      ? null
      : debeRecalcularPrecio
        ? usuario.fechaInicio || ahora
        : existente?.fecha_pago || usuario.fechaInicio || null;

    if (existente) {
      db.prepare(
        `UPDATE usuarios SET
          nombre = ?, apellidos = ?, nombre_completo = ?,
          documento_identidad = ?, tipo_documento = ?,
          correo = ?, telefono = ?, rol = ?,
          plan = ?, email_verificado = ?, fecha_caducidad = ?,
          estado = ?, stripe_customer_id = ?, stripe_subscription_id = ?,
          precio_base = ?, iva = ?, total = ?, fecha_pago = ?
        WHERE clave = ?`,
      ).run(
        usuario.nombre,
        usuario.apellidos || "",
        usuario.nombreCompleto ||
          `${usuario.nombre} ${usuario.apellidos || ""}`.trim(),
        usuario.documentoIdentidad || usuario.dni || "",
        usuario.tipoDocumento || "",
        usuario.correo,
        usuario.telefono,
        usuario.rol,
        plan,
        usuario.emailVerificado ? 1 : 0,
        usuario.fechaCaducidad || null,
        estado,
        usuario.stripeCustomerId || "",
        usuario.stripeSubscriptionId || "",
        precioBase,
        ivaUsuario,
        total,
        fechaPago,
        usuario.clave,
      );
    } else {
      let fechaArchivo = ahora;
      try {
        const { stat } = await import("node:fs/promises");
        fechaArchivo = (await stat(rutaArchivo)).birthtime.toISOString();
      } catch {
        // Se usa la fecha actual si no se puede leer el archivo.
      }

      db.prepare(
        `INSERT INTO usuarios (
          clave, nombre, apellidos, nombre_completo,
          documento_identidad, tipo_documento, correo, telefono, rol, plan,
          email_verificado, fecha_registro, fecha_pago, fecha_caducidad,
          precio_base, iva, total, estado, stripe_customer_id,
          stripe_subscription_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        usuario.clave,
        usuario.nombre,
        usuario.apellidos || "",
        usuario.nombreCompleto ||
          `${usuario.nombre} ${usuario.apellidos || ""}`.trim(),
        usuario.documentoIdentidad || usuario.dni || "",
        usuario.tipoDocumento || "",
        usuario.correo,
        usuario.telefono,
        usuario.rol,
        plan,
        usuario.emailVerificado ? 1 : 0,
        fechaArchivo,
        fechaPago,
        usuario.fechaCaducidad || null,
        precioBase,
        ivaUsuario,
        total,
        estado,
        usuario.stripeCustomerId || "",
        usuario.stripeSubscriptionId || "",
      );
    }

    if (crearPagos && usuario.rol === "premium" && plan) {
      const pago = db
        .prepare("SELECT id FROM pagos WHERE usuario_clave = ? LIMIT 1")
        .get(usuario.clave);

      if (!pago) {
        db.prepare(
          `INSERT INTO pagos (
            usuario_clave, usuario_nombre, fecha, concepto, plan,
            precio_base, iva, total, referencia
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          usuario.clave,
          `${usuario.nombre} ${usuario.apellidos || ""}`.trim(),
          usuario.fechaInicio || usuario.fechaCaducidad || ahora,
          `Suscripción ${plan}`,
          plan,
          precioBase,
          ivaUsuario,
          total,
          usuario.stripeSubscriptionId || "",
        );
      }
    }
  }

  const filasDb = db
    .prepare("SELECT clave FROM usuarios")
    .all() as Array<{ clave: string }>;

  for (const fila of filasDb) {
    if (!clavesVivas.has(fila.clave)) {
      db.prepare("DELETE FROM usuarios WHERE clave = ?").run(fila.clave);
    }
  }
}

export function eliminarUsuarioAdmin(clave: string): void {
  const db = abrirDb();

  db.exec("BEGIN");

  try {
    db.prepare("DELETE FROM usuarios WHERE clave = ?").run(clave);
    db.prepare("DELETE FROM pagos WHERE usuario_clave = ?").run(clave);
    db.prepare("DELETE FROM uso_zonas WHERE usuario_clave = ?").run(
      clave,
    );
    db.prepare("DELETE FROM registros_pendientes WHERE clave = ?").run(
      clave,
    );
    db.prepare(
      "DELETE FROM analitica_sesiones WHERE usuario_clave = ?",
    ).run(clave);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export type DescuentoStripeDb = {
  codigo: string;
  promotionCodeId: string;
  couponId: string;
  tipo: "porcentaje" | "importe";
  valor: number;
  fechaInicio: string;
  fechaFin: string | null;
  activoManual: boolean;
  creado: string;
  actualizado: string;
};

type FilaDescuentoStripe = {
  codigo: string;
  promotion_code_id: string;
  coupon_id: string;
  tipo: string;
  valor: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  activo_manual: number;
  creado: string;
  actualizado: string;
};

function mapearDescuento(
  fila: FilaDescuentoStripe,
): DescuentoStripeDb {
  return {
    codigo: fila.codigo,
    promotionCodeId: fila.promotion_code_id,
    couponId: fila.coupon_id,
    tipo: fila.tipo === "importe" ? "importe" : "porcentaje",
    valor: numero(fila.valor),
    fechaInicio: fila.fecha_inicio,
    fechaFin: fila.fecha_fin,
    activoManual: Boolean(fila.activo_manual),
    creado: fila.creado,
    actualizado: fila.actualizado,
  };
}

export function guardarDescuentoStripe(
  descuento: Omit<DescuentoStripeDb, "creado" | "actualizado">,
): void {
  const ahora = new Date().toISOString();

  abrirDb()
    .prepare(
      `INSERT INTO descuentos_stripe (
        codigo, promotion_code_id, coupon_id, tipo, valor,
        fecha_inicio, fecha_fin, activo_manual, creado, actualizado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      descuento.codigo,
      descuento.promotionCodeId,
      descuento.couponId,
      descuento.tipo,
      descuento.valor,
      descuento.fechaInicio,
      descuento.fechaFin,
      descuento.activoManual ? 1 : 0,
      ahora,
      ahora,
    );
}

export function listarDescuentosStripeDb(): DescuentoStripeDb[] {
  const filas = abrirDb()
    .prepare("SELECT * FROM descuentos_stripe ORDER BY creado DESC")
    .all() as FilaDescuentoStripe[];

  return filas.map(mapearDescuento);
}

export function actualizarActivoDescuentoStripe(
  promotionCodeId: string,
  activo: boolean,
): void {
  abrirDb()
    .prepare(
      `UPDATE descuentos_stripe
       SET activo_manual = ?, actualizado = ?
       WHERE promotion_code_id = ?`,
    )
    .run(
      activo ? 1 : 0,
      new Date().toISOString(),
      promotionCodeId,
    );
}

export function eliminarDescuentoStripeDb(
  promotionCodeId: string,
): number {
  const resultado = abrirDb()
    .prepare(
      "DELETE FROM descuentos_stripe WHERE promotion_code_id = ?",
    )
    .run(promotionCodeId);

  return Number(resultado.changes ?? 0);
}

export function registrarLog(  administrador: string,
  accion: string,
  detalle: string,
  ip: string,
): void {
  abrirDb().prepare(
    `INSERT INTO logs_admin (administrador, accion, detalle, fecha, ip)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(administrador, accion, detalle, new Date().toISOString(), ip);
}

export function listarLogs(limite = 80): LogAdmin[] {
  const filas = abrirDb()
    .prepare("SELECT * FROM logs_admin ORDER BY id DESC LIMIT ?")
    .all(limite) as Array<{
      id: number;
      administrador: string;
      accion: string;
      detalle: string;
      fecha: string;
      ip: string;
    }>;

  return filas;
}

export type FiltrosUsuarios = {
  busqueda?: string;
  tipo?: string;
  estado?: string;
  plan?: string;
  pagina?: number;
  porPagina?: number;
};

export function listarUsuariosAdmin(filtros: FiltrosUsuarios): {
  usuarios: UsuarioAdmin[];
  total: number;
} {
  const db = abrirDb();
  const condiciones: string[] = [];
  const valores: Array<string | number> = [];

  if (filtros.busqueda?.trim()) {
    condiciones.push(
      "(nombre LIKE ? OR apellidos LIKE ? OR correo LIKE ? OR telefono LIKE ?)",
    );
    const busqueda = `%${filtros.busqueda.trim()}%`;
    valores.push(busqueda, busqueda, busqueda, busqueda);
  }

  if (filtros.tipo === "freemium" || filtros.tipo === "premium") {
    condiciones.push("rol = ?");
    valores.push(filtros.tipo);
  }

  if (filtros.estado === "Activa" || filtros.estado === "Caducada") {
    condiciones.push("estado = ?");
    valores.push(filtros.estado);
  }

  if (filtros.plan) {
    condiciones.push("plan = ?");
    valores.push(filtros.plan);
  }

  const where = condiciones.length
    ? `WHERE ${condiciones.join(" AND ")}`
    : "";
  const porPagina = Math.min(
    100,
    Math.max(5, filtros.porPagina || 25),
  );
  const pagina = Math.max(1, filtros.pagina || 1);
  const totalFila = db
    .prepare(`SELECT COUNT(*) AS total FROM usuarios ${where}`)
    .get(...valores) as { total?: number };
  const filas = db
    .prepare(
      `SELECT * FROM usuarios ${where} ORDER BY fecha_registro DESC LIMIT ? OFFSET ?`,
    )
    .all(...valores, porPagina, (pagina - 1) * porPagina) as FilaUsuario[];

  return {
    usuarios: filas.map(convertir),
    total: Number(totalFila.total || 0),
  };
}

export function obtenerUsuarioAdmin(clave: string): UsuarioAdmin | null {
  const fila = abrirDb()
    .prepare("SELECT * FROM usuarios WHERE clave = ?")
    .get(clave) as FilaUsuario | undefined;
  return fila ? convertir(fila) : null;
}

export function guardarPreciosUsuario(
  clave: string,
  precioBase: number,
  iva: number,
  fechaPago: string | null,
  totalPagado?: number,
): void {
  const baseRedondeada = redondearMoneda(precioBase);
  const ivaRedondeado = redondearMoneda(iva);
  const totalRedondeado =
    typeof totalPagado === "number"
      ? redondearMoneda(totalPagado)
      : redondearMoneda(baseRedondeada + ivaRedondeado);

  abrirDb().prepare(
    `UPDATE usuarios SET precio_base = ?, iva = ?, total = ?, fecha_pago = ?
     WHERE clave = ?`,
  ).run(
    baseRedondeada,
    ivaRedondeado,
    totalRedondeado,
    fechaPago,
    clave,
  );
}

export function registrarPago(
  usuario: UsuarioAdmin,
  concepto: string,
  referencia: string,
): void {
  const baseRedondeada = redondearMoneda(usuario.precioBase);
  const ivaRedondeado = redondearMoneda(usuario.iva);

  abrirDb().prepare(
    `INSERT INTO pagos (
      usuario_clave, usuario_nombre, fecha, concepto, plan,
      precio_base, iva, total, referencia
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    usuario.clave,
    `${usuario.nombre} ${usuario.apellidos}`.trim(),
    usuario.fechaPago || new Date().toISOString(),
    concepto,
    usuario.plan,
    baseRedondeada,
    ivaRedondeado,
    redondearMoneda(baseRedondeada + ivaRedondeado),
    referencia,
  );
}

export function registrarPagoUnico(
  usuario: UsuarioAdmin,
  concepto: string,
  referencia: string,
): void {
  const existente = abrirDb()
    .prepare(
      "SELECT id FROM pagos WHERE usuario_clave = ? AND referencia = ? LIMIT 1",
    )
    .get(usuario.clave, referencia);

  if (!existente) {
    registrarPago(usuario, concepto, referencia);
  }
}

/** Archiva los pagos activos del contexto indicado sin borrar datos. */
export function archivarPagos(
  contexto: "facturacion" | "estadisticas",
): number {
  const columna =
    contexto === "estadisticas"
      ? "archivado_estadisticas"
      : "archivado";
  const resultado = abrirDb()
    .prepare(
      `UPDATE pagos SET ${columna} = 1 WHERE ${columna} = 0`,
    )
    .run();

  return Number(
    (resultado as { changes?: number }).changes || 0,
  );
}

export function listarPagos(): PagoAdmin[] {
  const filas = abrirDb()
    .prepare(
      "SELECT * FROM pagos WHERE archivado = 0 ORDER BY fecha DESC",
    )
    .all() as FilaPago[];

  return filas.map(convertirPago);
}

type FilaPago = {
  id: number;
  usuario_clave: string;
  usuario_nombre: string;
  fecha: string;
  concepto: string;
  plan: string;
  precio_base: number;
  iva: number;
  total: number;
  referencia: string;
  archivado: number;
  archivado_estadisticas: number;
};

export type FiltrosPagos = {
  desde?: string | Date;
  hasta?: string | Date;
  tipo?: string;
  plan?: string;
  estado?: string;
  incluirCero?: boolean;
  contexto?: "facturacion" | "estadisticas";
};

export function redondearMoneda(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function convertirPago(fila: FilaPago): PagoAdmin {
  const precioBase = redondearMoneda(Number(fila.precio_base));
  const iva = redondearMoneda(Number(fila.iva));

  return {
    id: fila.id,
    usuarioClave: fila.usuario_clave,
    usuarioNombre: fila.usuario_nombre,
    fecha: fila.fecha,
    concepto: fila.concepto,
    plan: fila.plan,
    precioBase,
    iva,
    total: redondearMoneda(precioBase + iva),
    referencia: fila.referencia,
    archivado: fila.archivado === 1,
    archivadoEstadisticas: fila.archivado_estadisticas === 1,
  };
}

function diaFiltro(valor: string | Date | undefined): string | null {
  if (!valor) return null;

  const texto =
    valor instanceof Date ? valor.toISOString() : valor;

  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto);
  return coincidencia
    ? `${coincidencia[1]}-${coincidencia[2]}-${coincidencia[3]}`
    : null;
}

/**
 * Única fuente de verdad para los pagos fiscales.
 * Los límites se interpretan como días UTC completos.
 */
export function obtenerPagosPorRango(
  filtros: FiltrosPagos = {},
): PagoAdmin[] {
  const db = abrirDb();
  const condiciones: string[] = [];
  const valores: string[] = [];
  const contexto = filtros.contexto ?? "facturacion";

  condiciones.push(
    contexto === "estadisticas"
      ? "p.archivado_estadisticas = 0"
      : "p.archivado = 0",
  );

  if (filtros.incluirCero !== true) {
    condiciones.push("p.total > 0");
  }

  const desde = diaFiltro(filtros.desde);
  if (desde) {
    condiciones.push("p.fecha >= ?");
    valores.push(`${desde}T00:00:00.000Z`);
  }

  const hasta = diaFiltro(filtros.hasta);
  if (hasta) {
    const fin = new Date(`${hasta}T00:00:00.000Z`);
    fin.setUTCDate(fin.getUTCDate() + 1);
    condiciones.push("p.fecha < ?");
    valores.push(fin.toISOString());
  }

  if (filtros.tipo) {
    condiciones.push("u.rol = ?");
    valores.push(filtros.tipo);
  }

  if (filtros.plan) {
    condiciones.push("u.plan = ?");
    valores.push(filtros.plan);
  }

  if (filtros.estado) {
    condiciones.push("u.estado = ?");
    valores.push(filtros.estado);
  }

  const where = condiciones.length
    ? `WHERE ${condiciones.join(" AND ")}`
    : "";

  const filas = db
    .prepare(
      `SELECT p.*
       FROM pagos p
       INNER JOIN usuarios u ON u.clave = p.usuario_clave
       ${where}
       ORDER BY p.fecha DESC, p.id DESC`,
    )
    .all(...valores) as FilaPago[];

  return filas.map(convertirPago);
}

export function resumenAdmin(): {
  usuariosTotales: number;
  free: number;
  premium: number;
  nuevosDia: number;
  nuevosSemana: number;
  nuevosMes: number;
  nuevosAno: number;
  noRenovados: number;
  gananciasDia: number;
  gananciasSemana: number;
  gananciasMes: number;
  gananciasAno: number;
  ivaDia: number;
  ivaSemana: number;
  ivaMes: number;
  ivaAno: number;
  proximos7: number;
  proximos15: number;
  proximos30: number;
  logs: LogAdmin[];
} {
  const db = abrirDb();
  const ahora = new Date();
  const inicioDia = new Date(
    Date.UTC(
      ahora.getUTCFullYear(),
      ahora.getUTCMonth(),
      ahora.getUTCDate(),
    ),
  );
  const inicioSemana = new Date(inicioDia);
  const diaSemana = inicioDia.getUTCDay();
  inicioSemana.setUTCDate(
    inicioDia.getUTCDate() - ((diaSemana + 6) % 7),
  );
  const inicioMes = new Date(
    Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1),
  );
  const inicioAno = new Date(Date.UTC(ahora.getUTCFullYear(), 0, 1));

  const conteo = (condicion: string, valor?: string | number) => {
    const fila = db
      .prepare(`SELECT COUNT(*) AS total FROM usuarios WHERE ${condicion}`)
      .get(...(valor === undefined ? [] : [valor])) as { total?: number };
    return Number(fila.total || 0);
  };

  const ingresos = (desde: Date) => {
    const pagos = obtenerPagosPorRango({
      desde,
      contexto: "estadisticas",
    });
    return {
      base: redondearMoneda(
        pagos.reduce((total, pago) => total + pago.precioBase, 0),
      ),
      iva: redondearMoneda(
        pagos.reduce((total, pago) => total + pago.iva, 0),
      ),
    };
  };

  const proximos = (dias: number) => {
    const limite = new Date();
    limite.setUTCDate(limite.getUTCDate() + dias);
    return conteo(
      "rol = 'premium' AND plan != 'ilimitado' AND estado = 'Activa' AND fecha_caducidad IS NOT NULL AND fecha_caducidad <= ?",
      limite.toISOString(),
    );
  };

  const dia = ingresos(inicioDia);
  const semana = ingresos(inicioSemana);
  const mes = ingresos(inicioMes);
  const ano = ingresos(inicioAno);

  return {
    usuariosTotales: conteo("1 = 1"),
    free: conteo("rol = 'freemium'"),
    premium: conteo("rol = 'premium'"),
    nuevosDia: conteo("fecha_registro >= ?", inicioDia.toISOString()),
    nuevosSemana: conteo(
      "fecha_registro >= ?",
      inicioSemana.toISOString(),
    ),
    nuevosMes: conteo("fecha_registro >= ?", inicioMes.toISOString()),
    nuevosAno: conteo("fecha_registro >= ?", inicioAno.toISOString()),
    noRenovados: conteo("rol = 'premium' AND estado = 'Caducada'"),
    gananciasDia: dia.base,
    gananciasSemana: semana.base,
    gananciasMes: mes.base,
    gananciasAno: ano.base,
    ivaDia: dia.iva,
    ivaSemana: semana.iva,
    ivaMes: mes.iva,
    ivaAno: ano.iva,
    proximos7: proximos(7),
    proximos15: proximos(15),
    proximos30: proximos(30),
    logs: listarLogs(25),
  };
}

export function listarProximosACaducar(dias: number): UsuarioAdmin[] {
  const limite = new Date();
  limite.setDate(limite.getDate() + dias);
  const filas = abrirDb()
    .prepare(
      `SELECT * FROM usuarios
       WHERE rol = 'premium' AND plan != 'ilimitado'
         AND estado = 'Activa' AND fecha_caducidad IS NOT NULL
         AND fecha_caducidad <= ?
       ORDER BY fecha_caducidad ASC`,
    )
    .all(limite.toISOString()) as FilaUsuario[];

  return filas.map(convertir);
}

export function registrarUso(
  usuarioClave: string,
  zona: string,
  duracion = 0,
): void {
  const zonaSegura = zona
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s/_-]/gu, "")
    .slice(0, 80)
    .trim();

  if (!zonaSegura) return;

  abrirDb().prepare(
    `INSERT INTO uso_zonas (usuario_clave, zona, fecha, duracion_segundos)
     VALUES (?, ?, ?, ?)`,
  ).run(
    usuarioClave,
    zonaSegura,
    new Date().toISOString(),
    Math.max(0, Math.round(duracion)),
  );
}

export function archivarUso(): number {
  const resultado = abrirDb()
    .prepare(
      "UPDATE uso_zonas SET archivado = 1 WHERE archivado = 0",
    )
    .run();

  return Number(
    (resultado as { changes?: number }).changes || 0,
  );
}

/** Archiva todos los pagos y usos sin tocar los usuarios. */
export function archivarDatosLanzamiento(): {
  pagos: number;
  uso: number;
} {
  const db = abrirDb();
  db.exec("BEGIN");

  try {
    const pagos = db
      .prepare(
        `UPDATE pagos
         SET archivado = 1, archivado_estadisticas = 1
         WHERE archivado = 0 OR archivado_estadisticas = 0`,
      )
      .run();
    const uso = db
      .prepare(
        "UPDATE uso_zonas SET archivado = 1 WHERE archivado = 0",
      )
      .run();

    db.exec("COMMIT");

    return {
      pagos: Number(
        (pagos as { changes?: number }).changes || 0,
      ),
      uso: Number((uso as { changes?: number }).changes || 0),
    };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function resumenUso(): Array<{
  zona: string;
  usos: number;
  usuariosUnicos: number;
  duracionTotal: number;
}> {
  return abrirDb()
    .prepare(
      `SELECT zona,
        COUNT(*) AS usos,
        COUNT(DISTINCT NULLIF(usuario_clave, '')) AS usuariosUnicos,
        COALESCE(SUM(duracion_segundos), 0) AS duracionTotal
       FROM uso_zonas
       WHERE archivado = 0
       GROUP BY zona
       ORDER BY usos DESC`,
    )
    .all() as Array<{
    zona: string;
    usos: number;
    usuariosUnicos: number;
    duracionTotal: number;
  }>;
}

export function registrarActividadAnalitica(
  sessionId: string,
  usuario: UsuarioRegistrado | null,
): void {
  const db = abrirDb();
  const ahora = new Date().toISOString();
  const dia = diaAnalitico();
  const sessionFinal = usuario
    ? `user:${usuario.clave}`
    : `anon:${sessionId}`;
  const rol = usuario?.rol || "invitado";
  const usuarioClave = usuario?.clave || "";
  const usuarioNombre = usuario
    ? `${usuario.nombre} ${usuario.apellidos || ""}`.trim()
    : "";

  db.prepare(
    `INSERT INTO analitica_sesiones (
      session_id, usuario_clave, usuario_nombre, rol, dia,
      primera_visita, ultima_actividad
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id, dia) DO UPDATE SET
      usuario_clave = excluded.usuario_clave,
      usuario_nombre = excluded.usuario_nombre,
      rol = excluded.rol,
      ultima_actividad = excluded.ultima_actividad`,
  ).run(
    sessionFinal,
    usuarioClave,
    usuarioNombre,
    rol,
    dia,
    ahora,
    ahora,
  );
}

export function registrarActividadInvitado(
  sessionId: string,
  pagina: "landing" | "crear" | "arcade",
  accion: "visita" | "test_creado" | "partida_arcade",
): void {
  abrirDb()
    .prepare(
      `INSERT INTO actividad_invitados (session_id, pagina, accion, fecha)
       VALUES (?, ?, ?, ?)`,
    )
    .run(sessionId, pagina, accion, new Date().toISOString());
}

export type InvitadoAdmin = {
  sessionId: string;
  visitasLanding: number;
  testsCreados: number;
  partidasArcade: number;
  ultimaActividad: string;
};

export function obtenerInvitadosAdmin(fecha?: string): InvitadoAdmin[] {
  const db = abrirDb();
  const condiciones: string[] = [];
  const valores: string[] = [];

  const dia = diaFiltro(fecha);

  if (dia) {
    const fin = new Date(`${dia}T00:00:00.000Z`);
    fin.setUTCDate(fin.getUTCDate() + 1);
    condiciones.push("fecha >= ? AND fecha < ?");
    valores.push(`${dia}T00:00:00.000Z`, fin.toISOString());
  }

  const where = condiciones.length
    ? `WHERE ${condiciones.join(" AND ")}`
    : "";

  const filas = db
    .prepare(
      `SELECT session_id,
         COALESCE(SUM(CASE WHEN pagina = 'landing' AND accion = 'visita' THEN 1 ELSE 0 END), 0) AS visitas_landing,
         COALESCE(SUM(CASE WHEN accion = 'test_creado' THEN 1 ELSE 0 END), 0) AS tests_creados,
         COALESCE(SUM(CASE WHEN accion = 'partida_arcade' THEN 1 ELSE 0 END), 0) AS partidas_arcade,
         MAX(fecha) AS ultima_actividad
       FROM actividad_invitados
       ${where}
       GROUP BY session_id
       ORDER BY ultima_actividad DESC`,
    )
    .all(...valores) as Array<{
    session_id: string;
    visitas_landing: number;
    tests_creados: number;
    partidas_arcade: number;
    ultima_actividad: string;
  }>;

  return filas.map((fila) => ({
    sessionId: fila.session_id,
    visitasLanding: Number(fila.visitas_landing),
    testsCreados: Number(fila.tests_creados),
    partidasArcade: Number(fila.partidas_arcade),
    ultimaActividad: fila.ultima_actividad,
  }));
}

export function borrarActividadInvitados(fecha?: string): number {
  const db = abrirDb();
  const dia = diaFiltro(fecha);

  if (!dia) {
    const resultado = db.prepare("DELETE FROM actividad_invitados").run();
    return Number((resultado as { changes?: number }).changes || 0);
  }

  const fin = new Date(`${dia}T00:00:00.000Z`);
  fin.setUTCDate(fin.getUTCDate() + 1);

  const resultado = db
    .prepare("DELETE FROM actividad_invitados WHERE fecha >= ? AND fecha < ?")
    .run(`${dia}T00:00:00.000Z`, fin.toISOString());

  return Number((resultado as { changes?: number }).changes || 0);
}

export function obtenerAnaliticaAdmin(fecha?: string): {
  activos: {
    premium: Array<{
      clave: string;
      nombre: string;
      ultimaActividad: string;
    }>;
    freemium: Array<{
      clave: string;
      nombre: string;
      ultimaActividad: string;
    }>;
    invitados: number;
  };
  accesos: {
    dia: string;
    premium: number;
    freemium: number;
    invitados: number;
  };
} {
  const db = abrirDb();
  const dia = fecha || diaAnalitico();
  const limiteActivo = new Date(
    Date.now() - 5 * 60 * 1000,
  ).toISOString();

  const activos = db
    .prepare(
      `SELECT usuario_clave AS clave,
              MAX(usuario_nombre) AS nombre,
              MAX(ultima_actividad) AS ultimaActividad,
              rol
       FROM analitica_sesiones
       WHERE ultima_actividad >= ?
         AND rol IN ('premium', 'freemium')
         AND usuario_clave <> ''
       GROUP BY usuario_clave
       ORDER BY nombre COLLATE NOCASE`,
    )
    .all(limiteActivo) as Array<{
    clave: string;
    nombre: string;
    ultimaActividad: string;
    rol: "premium" | "freemium";
  }>;

  const invitadosActivos = db
    .prepare(
      `SELECT COUNT(DISTINCT session_id) AS total
       FROM analitica_sesiones
       WHERE ultima_actividad >= ?
         AND rol = 'invitado'`,
    )
    .get(limiteActivo) as { total?: number };

  const accesos = db
    .prepare(
      `SELECT rol, COUNT(*) AS total
       FROM analitica_sesiones
       WHERE dia = ?
       GROUP BY rol`,
    )
    .all(dia) as Array<{
    rol: "premium" | "freemium" | "invitado";
    total: number;
  }>;

  return {
    activos: {
      premium: activos
        .filter((usuario) => usuario.rol === "premium")
        .map(({ clave, nombre, ultimaActividad }) => ({
          clave,
          nombre,
          ultimaActividad,
        })),
      freemium: activos
        .filter((usuario) => usuario.rol === "freemium")
        .map(({ clave, nombre, ultimaActividad }) => ({
          clave,
          nombre,
          ultimaActividad,
        })),
      invitados: Number(invitadosActivos.total || 0),
    },
    accesos: {
      dia,
      premium:
        accesos.find((acceso) => acceso.rol === "premium")?.total ||
        0,
      freemium:
        accesos.find((acceso) => acceso.rol === "freemium")?.total ||
        0,
      invitados:
        accesos.find((acceso) => acceso.rol === "invitado")?.total ||
        0,
    },
  };
}

export function pagosMensuales(): Array<{
  mes: string;
  base: number;
  iva: number;
  total: number;
  facturas: number;
}> {
  const agrupados = new Map<
    string,
    { base: number; iva: number; total: number; facturas: number }
  >();

  for (const pago of obtenerPagosPorRango({
    contexto: "estadisticas",
  })) {
    const mes = pago.fecha.slice(0, 7);
    const actual = agrupados.get(mes) ?? {
      base: 0,
      iva: 0,
      total: 0,
      facturas: 0,
    };

    actual.base = redondearMoneda(actual.base + pago.precioBase);
    actual.iva = redondearMoneda(actual.iva + pago.iva);
    actual.total = redondearMoneda(actual.total + pago.total);
    actual.facturas += 1;
    agrupados.set(mes, actual);
  }

  return Array.from(agrupados.entries())
    .map(([mes, datos]) => ({ mes, ...datos }))
    .sort((a, b) => b.mes.localeCompare(a.mes));
}

export function usuariosParaExportar(): UsuarioAdmin[] {
  return (abrirDb()
    .prepare("SELECT * FROM usuarios ORDER BY fecha_registro DESC")
    .all() as FilaUsuario[]).map(convertir);
}

export function obtenerIvaConfig(): number {
  return obtenerIva();
}

type FilaPendiente = {
  token: string;
  clave: string;
  correo: string;
  datos_json: string;
  expira: number;
  creado: string;
};

export function limpiarPendientesExpirados(): number {
  const resultado = abrirDb()
    .prepare("DELETE FROM registros_pendientes WHERE expira <= ?")
    .run(Date.now());

  return Number(resultado.changes ?? 0);
}

export function guardarRegistroPendiente(
  usuario: UsuarioRegistrado,
  token: string,
  expira: number,
): void {
  limpiarPendientesExpirados();

  abrirDb().prepare(
    `INSERT INTO registros_pendientes (
      token, clave, correo, datos_json, expira, creado
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(token) DO UPDATE SET
      datos_json = excluded.datos_json,
      expira = excluded.expira`,
  ).run(
    token,
    usuario.clave,
    usuario.correo,
    JSON.stringify(usuario),
    expira,
    new Date().toISOString(),
  );
}

export function obtenerRegistroPendiente(
  token: string,
): UsuarioRegistrado | null {
  const fila = abrirDb()
    .prepare(
      "SELECT * FROM registros_pendientes WHERE token = ?",
    )
    .get(token) as FilaPendiente | undefined;

  if (!fila) return null;

  if (fila.expira <= Date.now()) {
    abrirDb()
      .prepare("DELETE FROM registros_pendientes WHERE token = ?")
      .run(token);
    return null;
  }

  try {
    return JSON.parse(fila.datos_json) as UsuarioRegistrado;
  } catch {
    return null;
  }
}

export function obtenerPendientePorClave(
  clave: string,
): UsuarioRegistrado | null {
  const fila = abrirDb()
    .prepare(
      "SELECT * FROM registros_pendientes WHERE clave = ? ORDER BY creado DESC LIMIT 1",
    )
    .get(clave) as FilaPendiente | undefined;

  if (!fila) return null;

  if (fila.expira <= Date.now()) {
    abrirDb()
      .prepare("DELETE FROM registros_pendientes WHERE token = ?")
      .run(fila.token);
    return null;
  }

  try {
    return JSON.parse(fila.datos_json) as UsuarioRegistrado;
  } catch {
    return null;
  }
}

export function obtenerPendientePorCorreo(correo: string): {
  usuario: UsuarioRegistrado;
  token: string;
} | null {
  const fila = abrirDb()
    .prepare(
      "SELECT * FROM registros_pendientes WHERE lower(correo) = lower(?) AND expira > ? ORDER BY creado DESC LIMIT 1",
    )
    .get(correo, Date.now()) as FilaPendiente | undefined;

  if (!fila) return null;

  try {
    return {
      usuario: JSON.parse(fila.datos_json) as UsuarioRegistrado,
      token: fila.token,
    };
  } catch {
    return null;
  }
}

export type PendienteVerificacion = {
  clave: string;
  nombre: string;
  telefono: string;
  correo: string;
  fechaRegistro: string;
  rol: "freemium" | "premium";
  plan: string;
  origen: "pendiente" | "archivo";
};

export async function listarPendientesVerificacion(): Promise<
  PendienteVerificacion[]
> {
  const db = abrirDb();
  const pendientes = new Map<string, PendienteVerificacion>();

  const filasPendientes = db
    .prepare(
      "SELECT * FROM registros_pendientes WHERE expira > ? ORDER BY creado DESC",
    )
    .all(Date.now()) as FilaPendiente[];

  for (const fila of filasPendientes) {
    try {
      const usuario = JSON.parse(
        fila.datos_json,
      ) as UsuarioRegistrado;

      pendientes.set(fila.clave, {
        clave: fila.clave,
        nombre:
          `${usuario.nombre || ""} ${usuario.apellidos || ""}`.trim() ||
          fila.clave,
        telefono: usuario.telefono || fila.clave,
        correo: usuario.correo || fila.correo,
        fechaRegistro: fila.creado,
        rol: usuario.rol === "premium" ? "premium" : "freemium",
        plan: usuario.planContratado || "",
        origen: "pendiente",
      });
    } catch {
      // Se ignora un JSON corrupto; el registro sigue visible en SQLite.
    }
  }

  const filasUsuarios = db
    .prepare(
      "SELECT * FROM usuarios WHERE email_verificado = 0",
    )
    .all() as FilaUsuario[];

  for (const fila of filasUsuarios) {
    if (pendientes.has(fila.clave)) continue;

    pendientes.set(fila.clave, {
      clave: fila.clave,
      nombre:
        fila.nombre_completo ||
        `${fila.nombre} ${fila.apellidos || ""}`.trim() ||
        fila.clave,
      telefono: fila.telefono || fila.clave,
      correo: fila.correo,
      fechaRegistro: fila.fecha_registro,
      rol: fila.rol === "premium" ? "premium" : "freemium",
      plan: fila.plan || "",
      origen: "archivo",
    });
  }

  // Archivos que aún no están indexados en SQLite y siguen sin verificar.
  const usuarios = await listarUsuarios();

  for (const { usuario, rutaArchivo } of usuarios) {
    if (pendientes.has(usuario.clave)) continue;
    if (usuario.emailVerificado !== false) continue;

    let fechaRegistro = new Date().toISOString();

    try {
      const { stat } = await import("node:fs/promises");
      fechaRegistro = (await stat(rutaArchivo)).birthtime.toISOString();
    } catch {
      // Se conserva la fecha actual.
    }

    pendientes.set(usuario.clave, {
      clave: usuario.clave,
      nombre:
        `${usuario.nombre} ${usuario.apellidos || ""}`.trim() ||
        usuario.clave,
      telefono: usuario.telefono,
      correo: usuario.correo,
      fechaRegistro,
      rol: usuario.rol === "premium" ? "premium" : "freemium",
      plan: usuario.planContratado || "",
      origen: "archivo",
    });
  }

  return [...pendientes.values()].sort((a, b) =>
    a.fechaRegistro.localeCompare(b.fechaRegistro),
  );
}

export function existePendientePorClaveOCorreo(
  clave: string,
  correo: string,
): boolean {
  const fila = abrirDb()
    .prepare(
      "SELECT 1 AS existe FROM registros_pendientes WHERE (clave = ? OR correo = ?) AND expira > ? LIMIT 1",
    )
    .get(clave, correo, Date.now()) as
    | { existe?: number }
    | undefined;

  return Boolean(fila?.existe);
}

export function eliminarRegistroPendiente(token: string): void {
  abrirDb()
    .prepare("DELETE FROM registros_pendientes WHERE token = ?")
    .run(token);
}

export function eliminarPendientesPorClave(clave: string): void {
  abrirDb()
    .prepare("DELETE FROM registros_pendientes WHERE clave = ?")
    .run(clave);
}

