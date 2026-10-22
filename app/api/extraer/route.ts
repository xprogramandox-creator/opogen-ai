import { NextResponse } from "next/server";
import { extractText } from "unpdf";
import { extractRawText } from "mammoth";

export const maxDuration = 60;

const MAX_CANTIDAD_ARCHIVOS = 8;

// Vercel Hobby limita el cuerpo de las peticiones a aproximadamente 4,5 MB.
// Dejamos margen para los metadatos del formulario multipart.
const MAX_TOTAL_ARCHIVOS = 4_000_000;
const MAX_TOTAL_CUERPO = 4_200_000;
const MAX_ARCHIVO = 3_500_000;

const MAX_TEXTO_POR_ARCHIVO = 300_000;
const MAX_TEXTO_TOTAL = 700_000;

const PETICIONES_POR_MINUTO = 12;
const VENTANA_LIMITE_MS = 60_000;

const MIME_POR_EXTENSION: Record<string, string> = {
  // Documentos
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  // Texto y datos
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  json: "application/json",
  xml: "application/xml",
  html: "text/html",
  htm: "text/html",
  log: "text/plain",
  yaml: "application/yaml",
  yml: "application/yaml",
  ini: "text/plain",
  conf: "text/plain",
  rtf: "text/rtf",

  // Código y configuración
  css: "text/plain",
  scss: "text/plain",
  less: "text/plain",
  js: "text/plain",
  jsx: "text/plain",
  ts: "text/plain",
  tsx: "text/plain",
  py: "text/plain",
  java: "text/plain",
  c: "text/plain",
  cpp: "text/plain",
  cs: "text/plain",
  go: "text/plain",
  rs: "text/plain",
  php: "text/plain",
  rb: "text/plain",
  sh: "text/plain",
  ps1: "text/plain",
  sql: "text/plain",

  // Imágenes
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const limitePorIp = new Map<string, { peticiones: number; reinicio: number }>();

class ErrorDePeticion extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ErrorDePeticion";
    this.status = status;
  }
}

type RespuestaGemini = {
  error?: {
    message?: string;
  };
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

function obtenerIp(req: Request): string {
  const cabecera =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "desconocida";

  return cabecera.split(",")[0]?.trim() || "desconocida";
}

function exceedsLimite(req: Request): boolean {
  const ahora = Date.now();
  const ip = obtenerIp(req);

  if (limitePorIp.size > 1_000) {
    for (const [clave, datos] of limitePorIp) {
      if (datos.reinicio <= ahora) {
        limitePorIp.delete(clave);
      }
    }
  }

  const actual = limitePorIp.get(ip);

  if (!actual || actual.reinicio <= ahora) {
    limitePorIp.set(ip, {
      peticiones: 1,
      reinicio: ahora + VENTANA_LIMITE_MS,
    });

    return false;
  }

  actual.peticiones += 1;

  return actual.peticiones > PETICIONES_POR_MINUTO;
}

function origenPermitido(req: Request): boolean {
  const origen = req.headers.get("origin");

  if (!origen) {
    return true;
  }

  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host");

  if (!host) {
    return false;
  }

  try {
    return new URL(origen).host === host;
  } catch {
    return false;
  }
}

function limpiarNombre(nombre: string): string {
  return nombre
    .replace(/[\\/\0]/g, "_")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, 180);
}

function obtenerExtension(nombre: string): string {
  const partes = nombre.toLowerCase().split(".");

  if (partes.length < 2) {
    return "";
  }

  return partes.at(-1) || "";
}

const MIME_DE_TEXTO_ESPECIAL = new Set([
  "application/json",
  "application/xml",
  "application/yaml",
]);

function esFormatoDeTexto(mime: string): boolean {
  return (
    mime.startsWith("text/") ||
    MIME_DE_TEXTO_ESPECIAL.has(mime)
  );
}

async function leerTextoSeguro(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();

  let texto = new TextDecoder("utf-8", {
    fatal: false,
  }).decode(buffer);

  /*
   * Algunos archivos antiguos utilizan Windows-1252 o Latin-1.
   * Si UTF-8 produce caracteres de reemplazo, intentamos la
   * codificación latina para recuperar correctamente los acentos.
   */
  if (texto.includes("\uFFFD")) {
    const textoLatino = new TextDecoder(
      "windows-1252",
    ).decode(buffer);

    if (!textoLatino.includes("\uFFFD")) {
      texto = textoLatino;
    }
  }

  return texto.replace(/^\uFEFF/, "");
}

function limpiarRtf(texto: string): string {
  return texto
    .replace(
      /\\'([0-9a-f]{2})/gi,
      (_coincidencia, hexadecimal: string) => {
        return String.fromCharCode(
          parseInt(hexadecimal, 16),
        );
      },
    )
    .replace(/\\par[d]?/gi, "\n")
    .replace(/\\line/gi, "\n")
    .replace(/\\[a-z]+-?\d* ?/gi, " ")
    .replace(/[{}]/g, "")
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,
      " ",
    )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}
function comprobarFirma(
  bytes: Uint8Array,
  mime: string,
): boolean {
  if (mime === "application/pdf") {
    const inicio = new TextDecoder("latin1").decode(bytes);
    return inicio.includes("%PDF-");
  }

  if (
    mime ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    // Un DOCX es un archivo ZIP y comienza con PK.
    return bytes[0] === 0x50 && bytes[1] === 0x4b;
  }

  if (mime === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (mime === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  if (mime === "image/webp") {
    const firma = String.fromCharCode(
      bytes[0] ?? 0,
      bytes[1] ?? 0,
      bytes[2] ?? 0,
      bytes[3] ?? 0,
    );

    const tipo = String.fromCharCode(
      bytes[8] ?? 0,
      bytes[9] ?? 0,
      bytes[10] ?? 0,
      bytes[11] ?? 0,
    );

    return firma === "RIFF" && tipo === "WEBP";
  }

  if (esFormatoDeTexto(mime)) {
    // Un archivo de texto no debe contener bytes nulos.
    return !bytes.includes(0);
  }

  return false;
}

async function validarArchivo(file: File): Promise<string> {
  const nombre = limpiarNombre(file.name);
  const extension = obtenerExtension(nombre);
  const mime = MIME_POR_EXTENSION[extension];

  if (!mime) {
    throw new ErrorDePeticion(
      `El formato de «${nombre}» no está permitido. Usa PDF, DOCX, TXT, JPG, PNG o WebP.`,
    );
  }

  if (file.size <= 0) {
    throw new ErrorDePeticion(`El archivo «${nombre}» está vacío.`);
  }

  if (file.size > MAX_ARCHIVO) {
    throw new ErrorDePeticion(
      `El archivo «${nombre}» supera el máximo de 3,5 MB.`,
      413,
    );
  }

  const bytes = new Uint8Array(
    await file.slice(0, 1024).arrayBuffer(),
  );

  if (!comprobarFirma(bytes, mime)) {
    throw new ErrorDePeticion(
      `El contenido de «${nombre}» no coincide con su extensión.`,
    );
  }

  return mime;
}

function limpiarTexto(texto: string): string {
  return texto
    .replace(/\u0000/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

async function transcribirConGemini(
  file: File,
  mime: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new ErrorDePeticion(
      "El servicio de lectura de imágenes y PDF escaneado no está configurado.",
      503,
    );
  }

  const modelo =
    process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  const controlador = new AbortController();
  const temporizador = setTimeout(() => {
    controlador.abort();
  }, 30_000);

  let response: Response;

  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text:
                    "Transcribe o extrae todo el texto de este documento o imagen. " +
                    "Devuelve únicamente texto plano, respetando el orden de lectura. " +
                    "No añadas explicaciones, títulos inventados ni formato Markdown.",
                },
                {
                  inline_data: {
                    mime_type: mime,
                    data: base64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
          },
        }),
        signal: controlador.signal,
      },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ErrorDePeticion(
        "La lectura del archivo ha tardado demasiado. Inténtalo de nuevo.",
        504,
      );
    }

    throw new ErrorDePeticion(
      "No se ha podido conectar con el servicio de lectura de archivos.",
      502,
    );
  } finally {
    clearTimeout(temporizador);
  }

  let data: RespuestaGemini;

  try {
    data = (await response.json()) as RespuestaGemini;
  } catch {
    throw new ErrorDePeticion(
      "El servicio de lectura de archivos ha devuelto una respuesta no válida.",
      502,
    );
  }

  if (!response.ok) {
    const detalle = data.error?.message?.slice(0, 240);

    console.error(
      `[Extraer] Gemini respondió ${response.status}:`,
      detalle || "Sin detalle",
    );

    throw new ErrorDePeticion(
      "El servicio de lectura de archivos no ha podido procesar este documento.",
      502,
    );
  }

  const texto =
    data.candidates
      ?.flatMap((candidate) => candidate.content?.parts || [])
      .map((part) => part.text || "")
      .join("\n")
      .trim() || "";

  if (!texto) {
    throw new ErrorDePeticion(
      "No se ha encontrado texto legible en el archivo.",
      422,
    );
  }

  return texto;
}

async function extraerTextoArchivo(
  file: File,
  mime: string,
): Promise<string> {
  if (mime === "application/pdf") {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const resultado = await extractText(bytes, {
      mergePages: true,
    });

    const texto = limpiarTexto(resultado.text || "");

    if (texto.length >= 40) {
      return texto;
    }

    // Si el PDF no tiene capa de texto, intentamos transcribirlo con Gemini.
    return transcribirConGemini(file, mime);
  }

  if (
    mime ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const resultado = await extractRawText({ buffer });

    return limpiarTexto(resultado.value);
  }

  if (esFormatoDeTexto(mime)) {
    let texto = await leerTextoSeguro(file);

    if (mime === "text/rtf") {
      texto = limpiarRtf(texto);
    }

    // Conservamos el contenido legible de los documentos HTML.
    if (mime === "text/html") {
      texto = texto
        .replace(
          /<script\b[^>]*>[\s\S]*?<\/script>/gi,
          " ",
        )
        .replace(
          /<style\b[^>]*>[\s\S]*?<\/style>/gi,
          " ",
        )
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'");
    }

    return limpiarTexto(texto);
  }

  if (
    mime === "image/jpeg" ||
    mime === "image/png" ||
    mime === "image/webp"
  ) {
    return transcribirConGemini(file, mime);
  }

  throw new ErrorDePeticion(
    "No se puede extraer texto de este tipo de archivo.",
  );
}

export async function POST(req: Request) {
  if (!origenPermitido(req)) {
    return NextResponse.json(
      { error: "Origen de la petición no permitido." },
      { status: 403 },
    );
  }

  if (exceedsLimite(req)) {
    return NextResponse.json(
      {
        error:
          "Has realizado demasiadas lecturas de archivos. Espera un minuto antes de intentarlo de nuevo.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": "60",
        },
      },
    );
  }

  const longitudCuerpo = Number(
    req.headers.get("content-length") || "0",
  );

  if (longitudCuerpo > MAX_TOTAL_CUERPO) {
    return NextResponse.json(
      {
        error:
          "Los archivos superan el máximo permitido. Reduce el tamaño o sube menos documentos.",
      },
      { status: 413 },
    );
  }

  try {
    let formData: FormData;

    try {
      formData = await req.formData();
    } catch {
      throw new ErrorDePeticion(
        "No se han podido leer los archivos enviados.",
        400,
      );
    }

    const archivos = formData
      .getAll("archivos")
      .filter((entrada): entrada is File => entrada instanceof File);

    if (archivos.length === 0) {
      throw new ErrorDePeticion(
        "Selecciona al menos un archivo.",
        400,
      );
    }

    if (archivos.length > MAX_CANTIDAD_ARCHIVOS) {
      throw new ErrorDePeticion(
        `Puedes subir un máximo de ${MAX_CANTIDAD_ARCHIVOS} archivos por solicitud.`,
        400,
      );
    }

    const totalBytes = archivos.reduce(
      (total, archivo) => total + archivo.size,
      0,
    );

    if (totalBytes > MAX_TOTAL_ARCHIVOS) {
      throw new ErrorDePeticion(
        "El tamaño total de los archivos supera el máximo de 4 MB.",
        413,
      );
    }

    const documentos: Array<{
      nombre: string;
      texto: string;
      tipo: string;
    }> = [];

    let totalCaracteres = 0;

    for (const archivo of archivos) {
      const nombre = limpiarNombre(archivo.name);
      const mime = await validarArchivo(archivo);
      const texto = await extraerTextoArchivo(archivo, mime);

      if (texto.length < 10) {
        throw new ErrorDePeticion(
          `No se ha podido extraer suficiente texto de «${nombre}».`,
          422,
        );
      }

      if (texto.length > MAX_TEXTO_POR_ARCHIVO) {
        throw new ErrorDePeticion(
          `El texto extraído de «${nombre}» es demasiado largo.`,
          413,
        );
      }

      totalCaracteres += texto.length;

      if (totalCaracteres > MAX_TEXTO_TOTAL) {
        throw new ErrorDePeticion(
          "El contenido combinado de los archivos es demasiado largo.",
          413,
        );
      }

      documentos.push({
        nombre,
        texto,
        tipo: mime,
      });
    }

    return NextResponse.json({
      documentos,
      totalCaracteres,
    });
  } catch (error) {
    if (error instanceof ErrorDePeticion) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("[Extraer] Error inesperado:", error);

    return NextResponse.json(
      {
        error:
          "Ha ocurrido un error inesperado al procesar los archivos.",
      },
      { status: 500 },
    );
  }
}
