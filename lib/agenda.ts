import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { RUTA_DATOS } from "@/lib/rutas";

export const TIPOS_EXAMEN = [
  "test",
  "oficial",
  "recuperacion",
  "simulacro",
] as const;

export type TipoExamen = (typeof TIPOS_EXAMEN)[number];

export type ExamenAgenda = {
  id: number;
  /** Fecha interna en ISO (YYYY-MM-DD), la que se guarda y se ordena. */
  fechaIso: string;
  hora: string;
  materia: string;
  tipo: TipoExamen;
  notas: string;
  creado: string;
};

export type DatosExamen = {
  fecha: string;
  hora: string;
  materia: string;
  tipo: TipoExamen;
  notas: string;
};

type FilaAgenda = {
  id: number;
  fecha: string;
  hora: string;
  materia: string;
  tipo: string;
  notas: string | null;
  creado: string;
};

type GlobalConAgenda = typeof globalThis & {
  __opogenAgendaDb?: DatabaseSync;
};

const RUTA_BD = path.join(/* turbopackIgnore: true */ RUTA_DATOS, "agenda.db");

function esTipoExamen(valor: string): valor is TipoExamen {
  return (TIPOS_EXAMEN as readonly string[]).includes(valor);
}

/** Conexión única (se reutiliza entre recargas de HMR en desarrollo). */
function obtenerBd(): DatabaseSync {
  const global = globalThis as GlobalConAgenda;

  if (!global.__opogenAgendaDb) {
    const bd = new DatabaseSync(RUTA_BD);

    bd.exec(`
      CREATE TABLE IF NOT EXISTS examenes_agenda (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_clave TEXT NOT NULL,
        fecha TEXT NOT NULL,
        hora TEXT NOT NULL,
        materia TEXT NOT NULL,
        tipo TEXT NOT NULL,
        notas TEXT,
        creado TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_agenda_usuario_fecha
        ON examenes_agenda (usuario_clave, fecha);
    `);

    global.__opogenAgendaDb = bd;
  }

  return global.__opogenAgendaDb;
}

function aExamen(fila: FilaAgenda): ExamenAgenda {
  return {
    id: fila.id,
    fechaIso: fila.fecha,
    hora: fila.hora,
    materia: fila.materia,
    tipo: esTipoExamen(fila.tipo) ? fila.tipo : "test",
    notas: fila.notas ?? "",
    creado: fila.creado,
  };
}

/** Exámenes del usuario, ya ordenados por fecha y hora. */
export function listarExamenes(clave: string): ExamenAgenda[] {
  const filas = obtenerBd()
    .prepare(
      `SELECT id, fecha, hora, materia, tipo, notas, creado
         FROM examenes_agenda
        WHERE usuario_clave = ?
        ORDER BY fecha ASC, hora ASC, id ASC`,
    )
    .all(clave) as unknown as FilaAgenda[];

  return filas.map(aExamen);
}

export function crearExamen(
  clave: string,
  datos: DatosExamen,
): ExamenAgenda {
  const creado = new Date().toISOString();
  const resultado = obtenerBd()
    .prepare(
      `INSERT INTO examenes_agenda
         (usuario_clave, fecha, hora, materia, tipo, notas, creado)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      clave,
      datos.fecha,
      datos.hora,
      datos.materia,
      datos.tipo,
      datos.notas,
      creado,
    );

  return {
    id: Number(resultado.lastInsertRowid),
    fechaIso: datos.fecha,
    hora: datos.hora,
    materia: datos.materia,
    tipo: datos.tipo,
    notas: datos.notas,
    creado,
  };
}

export function actualizarExamen(
  clave: string,
  id: number,
  datos: DatosExamen,
): boolean {
  const resultado = obtenerBd()
    .prepare(
      `UPDATE examenes_agenda
          SET fecha = ?, hora = ?, materia = ?, tipo = ?, notas = ?
        WHERE id = ? AND usuario_clave = ?`,
    )
    .run(
      datos.fecha,
      datos.hora,
      datos.materia,
      datos.tipo,
      datos.notas,
      id,
      clave,
    );

  return Number(resultado.changes) > 0;
}

export function eliminarExamen(clave: string, id: number): boolean {
  const resultado = obtenerBd()
    .prepare("DELETE FROM examenes_agenda WHERE id = ? AND usuario_clave = ?")
    .run(id, clave);

  return Number(resultado.changes) > 0;
}

/* =========================================================
   Fechas: se guarda ISO y se muestra DD-MM-YYYY
   ========================================================= */

/** Convierte YYYY-MM-DD en DD-MM-YYYY. */
export function formatearFechaDdMmAaaa(fechaIso: string): string {
  const [anio, mes, dia] = fechaIso.split("-");

  if (!anio || !mes || !dia) {
    return fechaIso;
  }

  return `${dia}-${mes}-${anio}`;
}

/** Convierte DD-MM-YYYY en YYYY-MM-DD (o null si no es válida). */
export function parsearFechaDdMmAaaa(valor: string): string | null {
  const coincidencia = /^(\d{2})-(\d{2})-(\d{4})$/.exec(valor.trim());

  if (!coincidencia) {
    return null;
  }

  const [, dia, mes, anio] = coincidencia;
  const iso = `${anio}-${mes}-${dia}`;

  return esFechaISOValida(iso) ? iso : null;
}

/** Comprueba que la fecha existe de verdad (no vale 2026-02-31). */
export function esFechaISOValida(fechaIso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaIso)) {
    return false;
  }

  const [anio, mes, dia] = fechaIso.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));

  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

/** Días que faltan hasta la fecha (0 = hoy, negativo = pasada). */
export function diasHastaFechaAgenda(fechaIso: string): number {
  const [anio, mes, dia] = fechaIso.split("-").map(Number);
  const hoy = new Date();
  const utcHoy = Date.UTC(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate(),
  );
  const utcFecha = Date.UTC(anio, mes - 1, dia);

  return Math.round((utcFecha - utcHoy) / (24 * 60 * 60 * 1000));
}
