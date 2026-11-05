import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { generarPdfFallos } from "@/lib/pdf-fallos";
import {
  esNombreCarpetaSeguro,
  estaDentroDe,
} from "@/lib/rutas-espacio";
import { normalizarPreguntas, type Pregunta } from "@/lib/tipos";

export const SUB_CARPETA_TEST = "Test";
export const SUB_CARPETA_MIXTOS = "Test Mixtos";
export const SUB_CARPETA_REPASO = "Repaso";
export const SUB_CARPETA_RESUMENES = "Resumenes";
export const NOMBRE_PDF_REPASO = "repaso.pdf";
export const NOMBRE_JSON_REPASO = "repaso_data.json";
export const NOMBRE_JSON_REPASO_ANTERIOR = "repaso.json";

export const SUB_CARPETAS_MADRE = [
  SUB_CARPETA_TEST,
  SUB_CARPETA_MIXTOS,
  SUB_CARPETA_REPASO,
  SUB_CARPETA_RESUMENES,
] as const;

function validarRutaMadre(rutaCarpetaMadre: string): string {
  const ruta = path.resolve(rutaCarpetaMadre);
  const nombre = path.basename(ruta);

  if (
    !nombre ||
    !esNombreCarpetaSeguro(nombre) ||
    nombre === "." ||
    nombre === ".."
  ) {
    throw new Error("La ruta de la carpeta madre no es válida.");
  }

  return ruta;
}

/**
 * Crea la carpeta madre y sus tres subcarpetas de trabajo:
 * Test, Test Mixtos y Repaso.
 */
export async function crearEstructuraCarpetaMadre(
  nombreCarpeta: string,
  rutaUsuario: string,
): Promise<string> {
  if (!esNombreCarpetaSeguro(nombreCarpeta)) {
    throw new Error("El nombre de la carpeta madre no es válido.");
  }

  const base = path.resolve(rutaUsuario);

  if (!estaDentroDe(base, path.join(base, nombreCarpeta))) {
    throw new Error("La ruta de la carpeta madre no es válida.");
  }

  const rutaMadre = path.join(base, nombreCarpeta);

  await mkdir(rutaMadre, { recursive: true });

  await Promise.all(
    SUB_CARPETAS_MADRE.map((subcarpeta) =>
      mkdir(path.join(rutaMadre, subcarpeta), { recursive: true }),
    ),
  );

  // Migración suave de la estructura antigua: los PDF/JSON que estaban en la
  // raíz de la carpeta madre pasan a Test o Repaso sin borrar nada.
  try {
    const entradas = await readdir(rutaMadre, { withFileTypes: true });

    for (const entrada of entradas) {
      if (
        !entrada.isFile() ||
        !/\.(pdf|json)$/i.test(entrada.name) ||
        /^Fallos - .*\.json$/i.test(entrada.name)
      ) {
        continue;
      }

      const esRepaso =
        /^repaso(?:_fallos)?\.(pdf|json)$/i.test(entrada.name) ||
        /^repaso_data\.json$/i.test(entrada.name);
      const nombreDestino =
        entrada.name === "Repaso_Fallos.pdf"
          ? NOMBRE_PDF_REPASO
          : entrada.name === "repaso.json"
            ? NOMBRE_JSON_REPASO
            : entrada.name;
      const destino = path.join(
        rutaMadre,
        esRepaso ? SUB_CARPETA_REPASO : SUB_CARPETA_TEST,
        nombreDestino,
      );

      try {
        await rename(path.join(rutaMadre, entrada.name), destino);
      } catch {
        // Si ya existe un archivo con ese nombre, se conserva el original
        // para no sobrescribir datos.
      }
    }
  } catch {
    // La estructura ya se ha creado; un fallo de migración no la invalida.
  }

  return rutaMadre;
}

export function rutaSubcarpetaMadre(
  rutaCarpetaMadre: string,
  subcarpeta: (typeof SUB_CARPETAS_MADRE)[number],
): string {
  return path.join(validarRutaMadre(rutaCarpetaMadre), subcarpeta);
}

export function rutaPdfRepaso(rutaCarpetaMadre: string): string {
  return path.join(
    rutaSubcarpetaMadre(rutaCarpetaMadre, SUB_CARPETA_REPASO),
    NOMBRE_PDF_REPASO,
  );
}

function rutaJsonRepaso(rutaCarpetaMadre: string): string {
  return path.join(
    rutaSubcarpetaMadre(rutaCarpetaMadre, SUB_CARPETA_REPASO),
    NOMBRE_JSON_REPASO,
  );
}

function deduplicarPreguntas(preguntas: Pregunta[]): Pregunta[] {
  const mapa = new Map<string, Pregunta>();

  for (const pregunta of preguntas) {
    const clave = pregunta.enunciado.trim().toLocaleLowerCase("es");

    if (clave && !mapa.has(clave)) {
      mapa.set(clave, pregunta);
    }
  }

  return [...mapa.values()];
}

async function leerPreguntasRepaso(
  rutaCarpetaMadre: string,
): Promise<Pregunta[]> {
  const rutas = [
    rutaJsonRepaso(rutaCarpetaMadre),
    path.join(
      rutaSubcarpetaMadre(rutaCarpetaMadre, SUB_CARPETA_REPASO),
      NOMBRE_JSON_REPASO_ANTERIOR,
    ),
  ];

  for (const ruta of rutas) {
    try {
      const contenido = await readFile(ruta, "utf8");
      const datos: unknown = JSON.parse(contenido);

      if (Array.isArray(datos)) {
        return normalizarPreguntas(datos);
      }

      if (datos && typeof datos === "object") {
        return normalizarPreguntas(
          (datos as { preguntas?: unknown }).preguntas,
        );
      }

      return [];
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "ENOENT"
      ) {
        continue;
      }

      if (error instanceof SyntaxError) {
        throw new Error(
          "El índice del PDF de repaso está corrupto.",
        );
      }

      throw error;
    }
  }

  return [];
}

async function escribirPdfYIndice(
  rutaCarpetaMadre: string,
  preguntas: Pregunta[],
): Promise<void> {
  const madre = path.basename(validarRutaMadre(rutaCarpetaMadre));
  const carpetaRepaso = path.dirname(rutaPdfRepaso(rutaCarpetaMadre));

  await mkdir(carpetaRepaso, { recursive: true });

  const unicas = deduplicarPreguntas(preguntas);

  if (unicas.length === 0) {
    await Promise.all([
      rm(rutaPdfRepaso(rutaCarpetaMadre), { force: true }),
      rm(rutaJsonRepaso(rutaCarpetaMadre), { force: true }),
    ]);
    return;
  }

  await writeFile(
    rutaJsonRepaso(rutaCarpetaMadre),
    JSON.stringify(unicas, null, 2),
    "utf8",
  );
  await writeFile(
    rutaPdfRepaso(rutaCarpetaMadre),
    Buffer.from(generarPdfFallos(unicas, madre)),
  );
}

/**
 * Añade fallos al banco acumulativo de la carpeta madre.
 * Si el índice no existe se crea; si el PDF no existe se regenera.
 */
export async function actualizarPdfRepaso(
  rutaCarpetaMadre: string,
  nuevasPreguntasFalladas: Pregunta[],
): Promise<void> {
  const ruta = validarRutaMadre(rutaCarpetaMadre);

  if (nuevasPreguntasFalladas.length === 0) {
    return;
  }

  const actuales = await leerPreguntasRepaso(ruta);
  const nuevas = normalizarPreguntas(nuevasPreguntasFalladas);

  await escribirPdfYIndice(ruta, [...actuales, ...nuevas]);
}

/**
 * Elimina del banco de repaso las preguntas acertadas en un test de repaso.
 * La comparación se hace por enunciado normalizado.
 */
export async function limpiarPdfRepaso(
  rutaCarpetaMadre: string,
  preguntasAcertadas: Pregunta[],
): Promise<void> {
  const ruta = validarRutaMadre(rutaCarpetaMadre);

  if (preguntasAcertadas.length === 0) {
    return;
  }

  const actuales = await leerPreguntasRepaso(ruta);
  const superadas = new Set(
    preguntasAcertadas.map((pregunta) =>
      pregunta.enunciado.trim().toLocaleLowerCase("es"),
    ),
  );
  const restantes = actuales.filter(
    (pregunta) =>
      !superadas.has(
        pregunta.enunciado.trim().toLocaleLowerCase("es"),
      ),
  );

  await escribirPdfYIndice(ruta, restantes);
}
