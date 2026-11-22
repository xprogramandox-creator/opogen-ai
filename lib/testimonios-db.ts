import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { RUTA_DATOS } from "@/lib/rutas";
import {
  esIdiomaTestimonio,
  textoEnIdioma,
  type IdiomaTestimonio,
} from "@/lib/traduccion";

export const ESTADOS_TESTIMONIO = ["pendiente", "aprobado", "rechazado"] as const;

export type EstadoTestimonio = (typeof ESTADOS_TESTIMONIO)[number];

export type Testimonio = {
  id: number;
  usuarioClave: string;
  nombreVisible: string;
  /** Texto original, en el idioma en el que lo escribió el usuario. */
  texto: string;
  /** Idioma original del testimonio. */
  idioma: IdiomaTestimonio;
  /** Traducciones por idioma (puede faltar alguna si la IA falló). */
  textos: Record<string, string>;
  estado: EstadoTestimonio;
  fecha: string;
  moderadoEn: string | null;
  moderadoPor: string | null;
};

/** Datos que se pueden publicar en la landing (sin usuario_clave). */
export type TestimonioPublico = {
  id: number;
  nombreVisible: string;
  texto: string;
  fecha: string;
};

type FilaTestimonio = {
  id: number;
  usuario_clave: string;
  nombre_visible: string;
  texto: string;
  idioma: string | null;
  textos: string | null;
  estado: string;
  fecha: string;
  moderado_en: string | null;
  moderado_por: string | null;
};

type GlobalConTestimonios = typeof globalThis & {
  __opogenTestimoniosDb?: DatabaseSync;
};

const RUTA_BD = path.join(/* turbopackIgnore: true */ RUTA_DATOS, "testimonios.db");

function esEstado(valor: string): valor is EstadoTestimonio {
  return (ESTADOS_TESTIMONIO as readonly string[]).includes(valor);
}

function abrirBd(): DatabaseSync {
  const global = globalThis as GlobalConTestimonios;

  if (!global.__opogenTestimoniosDb) {
    const bd = new DatabaseSync(RUTA_BD);

    bd.exec("PRAGMA journal_mode = WAL;");
    bd.exec(`
      CREATE TABLE IF NOT EXISTS testimonios (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_clave  TEXT NOT NULL,
        nombre_visible TEXT NOT NULL,
        texto          TEXT NOT NULL,
        idioma         TEXT NOT NULL DEFAULT 'es',
        textos         TEXT,
        estado         TEXT NOT NULL DEFAULT 'pendiente'
                       CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
        fecha          TEXT NOT NULL,
        moderado_en    TEXT,
        moderado_por   TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_testimonios_estado_fecha
        ON testimonios (estado, fecha DESC);

      CREATE INDEX IF NOT EXISTS idx_testimonios_usuario
        ON testimonios (usuario_clave);
    `);

    // Migración para bases creadas antes de las traducciones.
    const columnas = bd
      .prepare("PRAGMA table_info(testimonios)")
      .all() as unknown as Array<{ name: string }>;

    if (!columnas.some((columna) => columna.name === "idioma")) {
      bd.exec(
        "ALTER TABLE testimonios ADD COLUMN idioma TEXT NOT NULL DEFAULT 'es'",
      );
    }

    if (!columnas.some((columna) => columna.name === "textos")) {
      bd.exec("ALTER TABLE testimonios ADD COLUMN textos TEXT");
    }

    global.__opogenTestimoniosDb = bd;
  }

  return global.__opogenTestimoniosDb;
}

function parsearTextos(valor: string | null): Record<string, string> {
  if (!valor) {
    return {};
  }

  try {
    const datos = JSON.parse(valor) as unknown;

    if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
      return {};
    }

    const textos: Record<string, string> = {};

    for (const [idioma, texto] of Object.entries(datos)) {
      if (typeof texto === "string" && texto.trim()) {
        textos[idioma] = texto.trim();
      }
    }

    return textos;
  } catch {
    return {};
  }
}

function aTestimonio(fila: FilaTestimonio): Testimonio {
  return {
    id: fila.id,
    usuarioClave: fila.usuario_clave,
    nombreVisible: fila.nombre_visible,
    texto: fila.texto,
    idioma: esIdiomaTestimonio(fila.idioma) ? fila.idioma : "es",
    textos: parsearTextos(fila.textos),
    estado: esEstado(fila.estado) ? fila.estado : "pendiente",
    fecha: fila.fecha,
    moderadoEn: fila.moderado_en,
    moderadoPor: fila.moderado_por,
  };
}

export function crearTestimonio(
  usuarioClave: string,
  nombreVisible: string,
  texto: string,
  idioma: IdiomaTestimonio,
  textos: Record<string, string>,
): Testimonio {
  const fecha = new Date().toISOString();
  const resultado = abrirBd()
    .prepare(
      `INSERT INTO testimonios
         (usuario_clave, nombre_visible, texto, idioma, textos, estado, fecha)
       VALUES (?, ?, ?, ?, ?, 'pendiente', ?)`,
    )
    .run(
      usuarioClave,
      nombreVisible,
      texto,
      idioma,
      JSON.stringify(textos),
      fecha,
    );

  return {
    id: Number(resultado.lastInsertRowid),
    usuarioClave,
    nombreVisible,
    texto,
    idioma,
    textos,
    estado: "pendiente",
    fecha,
    moderadoEn: null,
    moderadoPor: null,
  };
}

/** Testimonios aprobados para el carrusel público, en el idioma pedido. */
export function listarAprobados(
  limite = 12,
  idioma: IdiomaTestimonio = "es",
): TestimonioPublico[] {
  const filas = abrirBd()
    .prepare(
      `SELECT id, nombre_visible, texto, textos, fecha
         FROM testimonios
        WHERE estado = 'aprobado'
        ORDER BY fecha DESC, id DESC
        LIMIT ?`,
    )
    .all(limite) as unknown as Array<
    Pick<FilaTestimonio, "id" | "nombre_visible" | "texto" | "textos" | "fecha">
  >;

  return filas.map((fila) => ({
    id: fila.id,
    nombreVisible: fila.nombre_visible,
    texto: textoEnIdioma(parsearTextos(fila.textos), fila.texto, idioma),
    fecha: fila.fecha,
  }));
}

export function listarTestimonios(estado?: EstadoTestimonio): Testimonio[] {
  const bd = abrirBd();

  const filas = estado
    ? (bd
        .prepare(
          `SELECT * FROM testimonios WHERE estado = ? ORDER BY fecha DESC, id DESC`,
        )
        .all(estado) as unknown as FilaTestimonio[])
    : (bd
        .prepare(`SELECT * FROM testimonios ORDER BY fecha DESC, id DESC`)
        .all() as unknown as FilaTestimonio[]);

  return filas.map(aTestimonio);
}

export function contarTestimonios(): {
  pendientes: number;
  aprobados: number;
  rechazados: number;
} {
  const filas = abrirBd()
    .prepare(`SELECT estado, COUNT(*) AS total FROM testimonios GROUP BY estado`)
    .all() as unknown as Array<{ estado: string; total: number }>;

  const resumen = { pendientes: 0, aprobados: 0, rechazados: 0 };

  for (const fila of filas) {
    if (fila.estado === "pendiente") resumen.pendientes = fila.total;
    if (fila.estado === "aprobado") resumen.aprobados = fila.total;
    if (fila.estado === "rechazado") resumen.rechazados = fila.total;
  }

  return resumen;
}

export function cambiarEstadoTestimonio(
  id: number,
  estado: EstadoTestimonio,
  moderadoPor: string,
): Testimonio | null {
  const bd = abrirBd();
  const fecha = new Date().toISOString();

  const resultado = bd
    .prepare(
      `UPDATE testimonios
          SET estado = ?, moderado_en = ?, moderado_por = ?
        WHERE id = ?`,
    )
    .run(estado, fecha, moderadoPor, id);

  if (Number(resultado.changes) === 0) {
    return null;
  }

  const fila = bd
    .prepare(`SELECT * FROM testimonios WHERE id = ?`)
    .get(id) as unknown as FilaTestimonio | undefined;

  return fila ? aTestimonio(fila) : null;
}

export function eliminarTestimonio(id: number): boolean {
  const resultado = abrirBd()
    .prepare(`DELETE FROM testimonios WHERE id = ?`)
    .run(id);

  return Number(resultado.changes) > 0;
}

/** `true` si el usuario ya tiene un testimonio pendiente de revisión. */
export function tieneTestimonioPendiente(usuarioClave: string): boolean {
  const fila = abrirBd()
    .prepare(
      `SELECT 1 AS existe FROM testimonios
        WHERE usuario_clave = ? AND estado = 'pendiente'
        LIMIT 1`,
    )
    .get(usuarioClave) as unknown as { existe: number } | undefined;

  return Boolean(fila);
}

/** Fecha ISO del último envío del usuario (para el límite de 24 h). */
export function ultimoEnvioTestimonio(usuarioClave: string): string | null {
  const fila = abrirBd()
    .prepare(
      `SELECT fecha FROM testimonios
        WHERE usuario_clave = ?
        ORDER BY fecha DESC
        LIMIT 1`,
    )
    .get(usuarioClave) as unknown as { fecha: string } | undefined;

  return fila?.fecha ?? null;
}
