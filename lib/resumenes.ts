import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { extractText } from "unpdf";
import {
  SUB_CARPETA_RESUMENES,
  crearEstructuraCarpetaMadre,
} from "@/lib/estructura-carpetas";
import {
  esNombreCarpetaSeguro,
  rutaEspacioUsuario,
} from "@/lib/rutas-espacio";

export const MAX_CARACTERES_RESUMEN = 500_000;
const MAX_CARACTERES_FRAGMENTO = 15_000;
const MAX_CARACTERES_RESUMEN_CORTO = MAX_CARACTERES_FRAGMENTO;
const MAX_TOKENS_MAPA = 700;
const MAX_TOKENS_FINAL = 6_000;

export class ResumenError extends Error {
  status: number;
  codigo?: string;
  archivo?: string;

  constructor(
    mensaje: string,
    status = 400,
    codigo?: string,
    archivo?: string,
  ) {
    super(mensaje);
    this.name = "ResumenError";
    this.status = status;
    this.codigo = codigo;
    this.archivo = archivo;
  }
}

function normalizarTexto(texto: string): string {
  return texto
    .replace(/\u0000/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extraerTextoPdf(
  bytes: Uint8Array,
): Promise<string> {
  const resultado = await extractText(bytes, {
    mergePages: true,
  });
  const texto = normalizarTexto(resultado.text || "");

  if (texto.length < 80) {
    throw new ResumenError(
      "El PDF no contiene suficiente texto para generar un resumen.",
      422,
      "PDF_CORTO",
    );
  }

  if (texto.length > MAX_CARACTERES_RESUMEN) {
    throw new ResumenError(
      `El PDF es demasiado largo (${texto.length.toLocaleString(
        "es-ES",
      )} caracteres). El máximo es ${MAX_CARACTERES_RESUMEN.toLocaleString(
        "es-ES",
      )}. Sube un archivo más pequeño o divide el temario.`,
      413,
      "PDF_LARGO",
    );
  }

  return texto;
}

export function dividirEnFragmentos(texto: string): string[] {
  if (texto.length <= MAX_CARACTERES_RESUMEN_CORTO) {
    return [texto];
  }

  const parrafos = texto
    .split(/\n{2,}/)
    .map((parrafo) => parrafo.trim())
    .filter(Boolean);

  const unidades: string[] = [];

  for (const parrafo of parrafos) {
    if (parrafo.length <= MAX_CARACTERES_FRAGMENTO) {
      unidades.push(parrafo);
      continue;
    }

    // Si un párrafo no cabe, se divide por frases completas. Nunca se
    // trocea una frase por la mitad.
    const oraciones =
      parrafo.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) ??
      [parrafo];

    for (const oracion of oraciones) {
      const limpia = oracion.trim();

      if (limpia) {
        unidades.push(limpia);
      }
    }
  }

  const fragmentos: string[] = [];
  let actual = "";

  const cerrarFragmento = () => {
    const limpio = actual.trim();

    if (limpio) {
      fragmentos.push(limpio);
    }

    actual = "";
  };

  for (const unidad of unidades) {
    if (
      actual.length + unidad.length + 2 <=
      MAX_CARACTERES_FRAGMENTO
    ) {
      actual = actual ? `${actual}\n\n${unidad}` : unidad;
      continue;
    }

    cerrarFragmento();
    actual = unidad;
  }

  cerrarFragmento();

  return fragmentos.length > 0 ? fragmentos : [texto];
}

async function llamarDeepSeek(
  system: string,
  prompt: string,
  maxTokens: number,
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();

  if (!apiKey) {
    throw new ResumenError(
      "El servicio de resúmenes no está configurado.",
      503,
      "IA_NO_CONFIGURADA",
    );
  }

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 60_000);

  try {
    const respuesta = await fetch(
      "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          max_tokens: maxTokens,
        }),
        signal: controlador.signal,
      },
    );

    if (!respuesta.ok) {
      throw new ResumenError(
        "El servicio de IA no está disponible en este momento.",
        502,
        "IA_NO_DISPONIBLE",
      );
    }

    const datos = (await respuesta.json()) as {
      choices?: Array<{
        message?: { content?: string };
      }>;
    };
    const contenido =
      datos.choices?.[0]?.message?.content?.trim() || "";

    if (!contenido) {
      throw new ResumenError(
        "La IA no devolvió un resumen válido.",
        502,
        "IA_RESPUESTA",
      );
    }

    return contenido;
  } catch (error) {
    if (error instanceof ResumenError) throw error;

    if (error instanceof Error && error.name === "AbortError") {
      throw new ResumenError(
        "La generación del resumen tardó demasiado. Inténtalo de nuevo.",
        504,
        "IA_TIEMPO",
      );
    }

    throw new ResumenError(
      "No se pudo conectar con el servicio de IA.",
      502,
      "IA_CONEXION",
    );
  } finally {
    clearTimeout(temporizador);
  }
}

const SYSTEM_RESUMEN =
  "Eres un sintetizador académico. Devuelve únicamente Markdown esquemático, sin introducción, sin conclusiones y sin repetir el enunciado. Usa ## y ###, viñetas breves y conserva nombres, fechas y datos clave. No inventes información.";

function promptMapa(fragmento: string): string {
  return `Extrae las ideas y datos esenciales de este fragmento en notas de viñeta. Puedes usar hasta 250 palabras si el fragmento lo necesita. No añadas introducción ni cierre. No cortes frases a la mitad.\n\nFRAGMENTO:\n${fragmento}`;
}

function promptFinal(texto: string): string {
  return `Elabora un resumen de estudio esquemático en Markdown a partir del siguiente contenido. Usa títulos ##/### y viñetas. Prioriza la completitud: no tienes un límite fijo de 700 palabras y puedes extenderte si el documento es largo. No inventes datos y no cortes frases a la mitad.\n\nCONTENIDO:\n${texto}`;
}

export async function generarResumenMarkdown(
  texto: string,
): Promise<string> {
  const fragmentos = dividirEnFragmentos(texto);

  console.log("[Resumen] Estrategia de generación", {
    caracteres: texto.length,
    fragmentos: fragmentos.length,
    maxFragmento: Math.max(...fragmentos.map((f) => f.length)),
  });

  if (fragmentos.length === 1) {
    return llamarDeepSeek(
      SYSTEM_RESUMEN,
      promptFinal(fragmentos[0]),
      MAX_TOKENS_FINAL,
    );
  }

  const notas: string[] = [];

  for (const fragmento of fragmentos) {
    const nota = await llamarDeepSeek(
      SYSTEM_RESUMEN,
      promptMapa(fragmento),
      MAX_TOKENS_MAPA,
    );
    notas.push(nota);
  }

  // Reduce: se unen todas las notas completas y se sintetizan una sola vez.
  // No se recorta el resultado ni se corta ninguna frase por caracteres.
  return llamarDeepSeek(
    SYSTEM_RESUMEN,
    promptFinal(notas.join("\n\n")),
    MAX_TOKENS_FINAL,
  );
}

export type ResumenGuardado = {
  archivo: string;
  carpeta: string;
  contenido: string;
};

/**
 * Convierte el nombre del PDF en un nombre de Markdown limpio, conservando
 * espacios, acentos y guiones. No permite rutas ni nombres reservados.
 */
export function sanearNombreResumen(
  nombreOriginal: string,
): string {
  let base = nombreOriginal
    .replace(/\.(pdf|md)$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[. ]+|[. ]+$/g, "")
    .trim();

  if (!base) {
    base = "Resumen";
  }

  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(base)) {
    base = `${base}-resumen`;
  }

  return `${base.slice(0, 110)}.md`;
}

async function existeResumen(
  rutaResumenes: string,
  archivo: string,
): Promise<boolean> {
  try {
    const entradas = await readdir(rutaResumenes);
    return entradas.some(
      (nombre) =>
        nombre.toLocaleLowerCase("es") ===
        archivo.toLocaleLowerCase("es"),
    );
  } catch {
    return false;
  }
}

/** Comprueba el nombre antes de gastar una llamada a la IA. */
export async function comprobarResumenDisponible(
  clave: string,
  carpetaMadre: string,
  nombreArchivo: string,
): Promise<{ archivo: string; existe: boolean }> {
  if (!esNombreCarpetaSeguro(carpetaMadre)) {
    throw new ResumenError("La carpeta madre no es válida.");
  }

  const archivo = sanearNombreResumen(nombreArchivo);
  const rutaResumenes = path.join(
    rutaEspacioUsuario(clave),
    carpetaMadre,
    SUB_CARPETA_RESUMENES,
  );

  return {
    archivo,
    existe: await existeResumen(rutaResumenes, archivo),
  };
}

export async function guardarResumen(
  clave: string,
  carpetaMadre: string,
  nombreOriginal: string,
  markdown: string,
  nombreArchivo?: string,
): Promise<ResumenGuardado> {
  if (!esNombreCarpetaSeguro(carpetaMadre)) {
    throw new ResumenError("La carpeta madre no es válida.");
  }

  const rutaEspacio = rutaEspacioUsuario(clave);
  const rutaMadre = await crearEstructuraCarpetaMadre(
    carpetaMadre,
    rutaEspacio,
  );
  const rutaResumenes = path.join(
    rutaMadre,
    SUB_CARPETA_RESUMENES,
  );

  await mkdir(rutaResumenes, { recursive: true });

  const archivo = sanearNombreResumen(
    nombreArchivo || nombreOriginal,
  );

  if (await existeResumen(rutaResumenes, archivo)) {
    throw new ResumenError(
      "Ya existe un resumen con este nombre.",
      409,
      "RESUMEN_EXISTENTE",
      archivo,
    );
  }

  const contenido = `# Resumen: ${nombreOriginal}\n\n${markdown.trim()}\n`;

  try {
    await writeFile(
      path.join(rutaResumenes, archivo),
      contenido,
      {
        encoding: "utf8",
        flag: "wx",
      },
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "EEXIST"
    ) {
      throw new ResumenError(
        "Ya existe un resumen con este nombre.",
        409,
        "RESUMEN_EXISTENTE",
        archivo,
      );
    }

    throw error;
  }

  return {
    archivo,
    carpeta: carpetaMadre,
    contenido,
  };
}
