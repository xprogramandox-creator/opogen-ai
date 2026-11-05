import { NextResponse } from "next/server";
import { stat, unlink } from "node:fs/promises";
import path from "node:path";
import { obtenerClaveSesion } from "@/lib/auth-server";
import { mensajeError } from "@/lib/errores";
import {
  esNombreArchivoSeguro,
  resolverCarpetaExistente,
} from "@/lib/rutas-espacio";

async function existeArchivo(ruta: string): Promise<boolean> {
  try {
    const info = await stat(ruta);
    return info.isFile();
  } catch {
    return false;
  }
}

export async function DELETE(req: Request) {
  try {
    const clave = await obtenerClaveSesion();

    if (!clave) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const carpeta = searchParams.get("carpeta");
    const archivo = searchParams.get("archivo");

    if (!carpeta || !archivo) {
      return NextResponse.json(
        { error: "Faltan parámetros obligatorios" },
        { status: 400 },
      );
    }

    if (!esNombreArchivoSeguro(archivo)) {
      return NextResponse.json(
        { error: "El nombre del archivo no es válido" },
        { status: 400 },
      );
    }

    const carpetaResuelta = await resolverCarpetaExistente(clave, carpeta);

    if (!carpetaResuelta) {
      return NextResponse.json(
        { error: "No se encontró la carpeta" },
        { status: 404 },
      );
    }

    // Se elimina el PDF y su JSON asociado, sin depender de la extensión
    // que envíe el cliente.
    const base = path.join(
      carpetaResuelta.ruta,
      archivo.replace(/\.(pdf|json)$/i, ""),
    );

    if (path.dirname(base) !== path.resolve(carpetaResuelta.ruta)) {
      return NextResponse.json(
        { error: "Acceso no permitido" },
        { status: 403 },
      );
    }

    const rutas = [`${base}.pdf`, `${base}.json`];
    let eliminados = 0;

    for (const ruta of rutas) {
      if (!(await existeArchivo(ruta))) {
        continue;
      }

      await unlink(ruta);
      eliminados += 1;
    }

    if (eliminados === 0) {
      return NextResponse.json(
        { error: "No se encontró el archivo" },
        { status: 404 },
      );
    }

    return NextResponse.json({ mensaje: "Archivo eliminado correctamente" });
  } catch (error) {
    return NextResponse.json(
      { error: mensajeError(error) },
      { status: 500 },
    );
  }
}
