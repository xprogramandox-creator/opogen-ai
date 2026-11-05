import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { obtenerClaveSesion } from "@/lib/auth-server";
import { mensajeError } from "@/lib/errores";
import {
  esNombreArchivoSeguro,
  estaDentroDe,
  resolverCarpetaExistente,
} from "@/lib/rutas-espacio";

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

    const rutaJson = path.join(carpetaResuelta.ruta, archivo);

    if (!estaDentroDe(carpetaResuelta.ruta, rutaJson)) {
      return NextResponse.json(
        { error: "Acceso no permitido" },
        { status: 403 },
      );
    }

    let datosJson: unknown;

    try {
      datosJson = JSON.parse(await readFile(rutaJson, "utf8"));
    } catch {
      return NextResponse.json(
        { error: "No se encontró el archivo de preguntas (JSON)" },
        { status: 404 },
      );
    }

    if (!datosJson || typeof datosJson !== "object") {
      return NextResponse.json(
        { error: "El archivo de preguntas no es válido" },
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
