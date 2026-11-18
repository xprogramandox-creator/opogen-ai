import { NextResponse } from "next/server";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { obtenerClaveSesion } from "@/lib/auth-server";
import { mensajeError } from "@/lib/errores";
import {
  carpetasCandidatasParaArchivo,
  esNombreArchivoSeguro,
  resolverCarpetaExistente,
} from "@/lib/rutas-espacio";

/** El JSON existe pero no se puede leer: no es lo mismo que no tenerlo. */
const MENSAJE_JSON_DANADO =
  "El archivo de preguntas está dañado y no se puede leer. Vuelve a generar el test.";

/** Hay PDF pero no JSON: el test se guardó con una versión anterior. */
const MENSAJE_SIN_PREGUNTAS =
  "Este test no tiene preguntas guardadas: es posible que se creara con una versión anterior. Vuelve a generarlo.";

export async function GET(req: Request) {
  const clave = await obtenerClaveSesion();

  if (!clave) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const carpeta = searchParams.get("carpeta");
    const archivo = searchParams.get("archivo");

    if (!carpeta || !archivo) {
      return NextResponse.json(
        { error: "Faltan parámetros" },
        { status: 400 },
      );
    }

    if (!esNombreArchivoSeguro(archivo) || !/\.json$/i.test(archivo)) {
      return NextResponse.json(
        { error: "El nombre del archivo no es válido" },
        { status: 400 },
      );
    }

    const carpetaResuelta = await resolverCarpetaExistente(clave, carpeta);

    if (!carpetaResuelta) {
      return NextResponse.json(
        { error: "No se encontró la carpeta del examen" },
        { status: 404 },
      );
    }

    // La carpeta pedida es una pista: si el JSON no está ahí (por ejemplo un
    // test mixto guardado en "Test Mixtos" pero abierto desde la carpeta
    // madre), se busca el mismo archivo en las carpetas hermanas.
    const candidatas = [
      carpetaResuelta.ruta,
      ...(await carpetasCandidatasParaArchivo(clave, carpeta)),
    ];
    const carpetas = [...new Set(candidatas)];

    let rutaJson: string | null = null;

    for (const directorio of carpetas) {
      const intento = path.join(directorio, archivo);

      if (existsSync(intento)) {
        rutaJson = intento;
        break;
      }
    }

    if (!rutaJson) {
      const archivoPdf = archivo.replace(/\.json$/i, ".pdf");
      const hayPdf = carpetas.some((directorio) =>
        existsSync(path.join(directorio, archivoPdf)),
      );

      return NextResponse.json(
        {
          error: hayPdf ? MENSAJE_SIN_PREGUNTAS : "No se encontró el archivo del test.",
          codigo: hayPdf ? "SIN_PREGUNTAS" : "SIN_ARCHIVO",
        },
        { status: 404 },
      );
    }

    let datosJson: unknown;

    try {
      datosJson = JSON.parse(await readFile(rutaJson, "utf8"));
    } catch {
      return NextResponse.json(
        { error: MENSAJE_JSON_DANADO, codigo: "JSON_INVALIDO" },
        { status: 422 },
      );
    }

    if (!datosJson || typeof datosJson !== "object") {
      return NextResponse.json(
        { error: MENSAJE_JSON_DANADO, codigo: "JSON_INVALIDO" },
        { status: 422 },
      );
    }

    const datos = datosJson as Record<string, unknown>;
    const textoContexto =
      typeof datos.textoContexto === "string" && datos.textoContexto.trim()
        ? datos.textoContexto
        : "Examen de OpoGen";

    return NextResponse.json({
      preguntas: Array.isArray(datos.preguntas) ? datos.preguntas : [],
      textoContexto,
    });
  } catch (error) {
    return NextResponse.json(
      { error: mensajeError(error) },
      { status: 500 },
    );
  }
}
