import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { codigoError } from "@/lib/errores";
import {
  PREFIJO_FALLOS,
  PREFIJO_TEST_MIXTO,
  esNombreCarpetaSeguro,
  rutaBaseUsuario,
  rutaEspacioUsuario,
} from "@/lib/rutas-espacio";
import { normalizarPreguntas, type Pregunta } from "@/lib/tipos";
import { conBloqueoUsuario } from "@/lib/file-lock";
import {
  guardarPdfFallos,
} from "@/lib/pdf-fallos";

/** Archivo antiguo (global) que se migra automáticamente. */
const NOMBRE_DB_LEGADO = "fallos_db.json";
const PREFIJO_LEGADO = "Simulacros - ";

type FallosLegado = Record<string, Pregunta[]>;

/**
 * Devuelve la carpeta "madre" de un examen: quita prefijos de test mixto o
 * de repaso para que todos los fallos acaben en la carpeta del tema.
 */
export function obtenerCarpetaMadre(nombre: string): string {
  let resultado = nombre.trim();

  const prefijos = [
    PREFIJO_FALLOS,
    PREFIJO_TEST_MIXTO,
    PREFIJO_LEGADO,
  ];

  let cambiado = true;

  while (cambiado) {
    cambiado = false;

    for (const prefijo of prefijos) {
      if (resultado.startsWith(prefijo)) {
        resultado = resultado.slice(prefijo.length).trim();
        cambiado = true;
      }
    }
  }

  return resultado;
}

const NOMBRE_JSON_REPASO = "repaso_data.json";
const NOMBRE_JSON_REPASO_ANTERIOR = "repaso.json";
const PREFIJO_JSON_LEGADO = "Fallos - ";
const SUB_CARPETA_REPASO = "Repaso";

function rutaArchivoFallos(clave: string, madre: string): string {
  return path.join(
    rutaEspacioUsuario(clave),
    madre,
    SUB_CARPETA_REPASO,
    NOMBRE_JSON_REPASO,
  );
}

function rutaArchivoFallosLegado(clave: string, madre: string): string {
  return path.join(
    rutaEspacioUsuario(clave),
    madre,
    `${PREFIJO_JSON_LEGADO}${madre}.json`,
  );
}

function rutaArchivoFallosAnterior(clave: string, madre: string): string {
  return path.join(
    rutaEspacioUsuario(clave),
    madre,
    SUB_CARPETA_REPASO,
    NOMBRE_JSON_REPASO_ANTERIOR,
  );
}

function rutaLegado(clave: string): string {
  return path.join(rutaBaseUsuario(clave), NOMBRE_DB_LEGADO);
}

function normalizarLista(valor: unknown): Pregunta[] {
  if (Array.isArray(valor)) {
    return normalizarPreguntas(valor);
  }

  if (valor && typeof valor === "object") {
    const preguntas = (valor as { preguntas?: unknown }).preguntas;

    if (Array.isArray(preguntas)) {
      return normalizarPreguntas(preguntas);
    }
  }

  return [];
}

function unirPreguntas(...listas: Pregunta[][]): Pregunta[] {
  const mapa = new Map<string, Pregunta>();

  for (const lista of listas) {
    for (const pregunta of lista) {
      if (!mapa.has(pregunta.enunciado)) {
        mapa.set(pregunta.enunciado, pregunta);
      }
    }
  }

  return [...mapa.values()];
}

async function existeArchivo(ruta: string): Promise<boolean> {
  try {
    return (await stat(ruta)).isFile();
  } catch {
    return false;
  }
}

async function existeCarpeta(ruta: string): Promise<boolean> {
  try {
    return (await stat(ruta)).isDirectory();
  } catch {
    return false;
  }
}

async function leerArchivoFallos(
  clave: string,
  madre: string,
): Promise<Pregunta[]> {
  try {
    const contenido = await readFile(
      rutaArchivoFallos(clave, madre),
      "utf8",
    );
    return normalizarLista(JSON.parse(contenido));
  } catch (error) {
    if (codigoError(error) === "ENOENT") {
      // Compatibilidad con versiones intermedias y con el índice antiguo.
      for (const rutaAlternativa of [
        rutaArchivoFallosAnterior(clave, madre),
        rutaArchivoFallosLegado(clave, madre),
      ]) {
        try {
          const legado = await readFile(rutaAlternativa, "utf8");
          return normalizarLista(JSON.parse(legado));
        } catch {
          // Se prueba la siguiente ubicación.
        }
      }

      return [];
    }

    console.error(
      `No se pudo leer el repaso de ${madre}:`,
      codigoError(error),
    );

    return [];
  }
}

async function escribirArchivoFallos(
  clave: string,
  madre: string,
  fallos: Pregunta[],
): Promise<void> {
  const carpeta = path.join(
    rutaEspacioUsuario(clave),
    madre,
    SUB_CARPETA_REPASO,
  );
  await mkdir(carpeta, { recursive: true });
  await writeFile(
    rutaArchivoFallos(clave, madre),
    JSON.stringify(fallos, null, 2),
    "utf8",
  );
}

async function leerLegado(clave: string): Promise<FallosLegado> {
  try {
    const contenido = await readFile(rutaLegado(clave), "utf8");
    const datos: unknown = JSON.parse(contenido);

    if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
      return {};
    }

    const db: FallosLegado = {};

    for (const [carpeta, valor] of Object.entries(
      datos as Record<string, unknown>,
    )) {
      const lista = normalizarLista(valor);

      if (lista.length > 0) {
        db[carpeta] = lista;
      }
    }

    return db;
  } catch {
    return {};
  }
}

async function escribirLegado(
  clave: string,
  db: FallosLegado,
): Promise<void> {
  await mkdir(rutaBaseUsuario(clave), { recursive: true });
  await writeFile(
    rutaLegado(clave),
    JSON.stringify(db, null, 2),
    "utf8",
  );
}

function clavesLegadoDeMadre(
  legado: FallosLegado,
  madre: string,
): string[] {
  return Object.keys(legado).filter(
    (clave) => obtenerCarpetaMadre(clave) === madre,
  );
}

/**
 * Migra las entradas antiguas de una carpeta al archivo
 * Mi_Espacio/<madre>/Fallos - <madre>.json.
 */
async function migrarLegado(
  clave: string,
  madre: string,
  legado: FallosLegado,
): Promise<void> {
  const claves = clavesLegadoDeMadre(legado, madre);

  if (claves.length === 0) {
    return;
  }

  const carpeta = path.join(rutaEspacioUsuario(clave), madre);

  if (!(await existeCarpeta(carpeta))) {
    return;
  }

  const actuales = await leerArchivoFallos(clave, madre);
  const unidas = unirPreguntas(
    actuales,
    ...claves.map((claveLegado) => legado[claveLegado]),
  );

  await escribirArchivoFallos(clave, madre, unidas);
  await guardarPdfFallos(clave, madre, unidas);

  for (const claveLegado of claves) {
    delete legado[claveLegado];
  }

  await escribirLegado(clave, legado);
}

/** Lee los fallos acumulados de una carpeta madre. */
export async function leerFallosCarpeta(
  clave: string,
  nombre: string,
): Promise<Pregunta[]> {
  const madre = nombre.trim();

  if (!esNombreCarpetaSeguro(madre)) {
    return [];
  }

  const archivo = await leerArchivoFallos(clave, madre);
  const legado = await leerLegado(clave);
  const claves = clavesLegadoDeMadre(legado, madre);

  if (claves.length === 0) {
    return archivo;
  }

  const unidas = unirPreguntas(
    archivo,
    ...claves.map((claveLegado) => legado[claveLegado]),
  );

  await migrarLegado(clave, madre, legado);

  return unidas;
}

/** Guarda el array completo de fallos de una carpeta madre. */
export async function guardarFallosCarpeta(
  clave: string,
  nombre: string,
  fallos: Pregunta[],
): Promise<void> {
  const madre = nombre.trim();

  if (!esNombreCarpetaSeguro(madre)) {
    return;
  }

  return conBloqueoUsuario(clave, async () => {
    const carpeta = path.join(rutaEspacioUsuario(clave), madre);

    // Sin carpeta física (por ejemplo, test rápido "General") se conserva en
    // el archivo antiguo para no crear carpetas vacías.
    if (!(await existeCarpeta(carpeta))) {
      const legado = await leerLegado(clave);

      for (const claveLegado of clavesLegadoDeMadre(legado, madre)) {
        delete legado[claveLegado];
      }

      if (fallos.length > 0) {
        legado[madre] = fallos;
      }

      await escribirLegado(clave, legado);
      return;
    }

    if (fallos.length === 0) {
      await rm(rutaArchivoFallos(clave, madre), { force: true });
      await guardarPdfFallos(clave, madre, []);
    } else {
      await escribirArchivoFallos(clave, madre, fallos);
      await guardarPdfFallos(clave, madre, fallos);
    }

    const legado = await leerLegado(clave);
    const claves = clavesLegadoDeMadre(legado, madre);

    if (claves.length > 0) {
      for (const claveLegado of claves) {
        delete legado[claveLegado];
      }

      await escribirLegado(clave, legado);
    }
  });
}

/** Elimina los fallos de una carpeta madre (no la carpeta). */
export async function eliminarFallosDeCarpeta(
  clave: string,
  nombre: string,
): Promise<void> {
  const madre = nombre.trim();

  if (!esNombreCarpetaSeguro(madre)) {
    return;
  }

  return conBloqueoUsuario(clave, async () => {
    await rm(rutaArchivoFallos(clave, madre), { force: true });
    await rm(rutaArchivoFallosLegado(clave, madre), { force: true });
    await guardarPdfFallos(clave, madre, []);
    await rm(
      path.join(
        rutaEspacioUsuario(clave),
        madre,
        `Repaso_Fallos.pdf`,
      ),
      { force: true },
    );

    const legado = await leerLegado(clave);
    const claves = clavesLegadoDeMadre(legado, madre);

    if (claves.length > 0) {
      for (const claveLegado of claves) {
        delete legado[claveLegado];
      }

      await escribirLegado(clave, legado);
    }
  });
}

/**
 * Lista las carpetas madre con fallos guardados, migrando de paso las
 * entradas del archivo antiguo.
 */
export async function listarCarpetasConFallos(
  clave: string,
): Promise<string[]> {
  const espacio = rutaEspacioUsuario(clave);
  const madres = new Set<string>();

  try {
    const entradas = await readdir(espacio, { withFileTypes: true });

    for (const entrada of entradas) {
      if (
        !entrada.isDirectory() ||
        !esNombreCarpetaSeguro(entrada.name) ||
        entrada.name.startsWith(PREFIJO_FALLOS) ||
        entrada.name.startsWith(PREFIJO_TEST_MIXTO)
      ) {
        continue;
      }

      if (
        await existeArchivo(
          rutaArchivoFallos(clave, entrada.name),
        )
      ) {
        madres.add(entrada.name);
      }
    }
  } catch {
    // Sin espacio todavía.
  }

  const legado = await leerLegado(clave);

  for (const carpeta of Object.keys(legado)) {
    const madre = obtenerCarpetaMadre(carpeta);

    if (
      esNombreCarpetaSeguro(madre) &&
      legado[carpeta].length > 0
    ) {
      madres.add(madre);
    }
  }

  // Migra las claves antiguas que ya tengan carpeta física.
  for (const madre of [...madres]) {
    await migrarLegado(clave, madre, legado);
  }

  return [...madres].sort((a, b) =>
    a.localeCompare(b, "es", { numeric: true }),
  );
}
