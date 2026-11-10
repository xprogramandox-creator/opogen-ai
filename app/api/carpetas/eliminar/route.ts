import { NextResponse } from "next/server";
import { rm } from "node:fs/promises";
import path from "node:path";
import { obtenerClaveSesion } from "@/lib/auth-server";
import { mensajeError } from "@/lib/errores";
import {
  eliminarFallosDeCarpeta,
} from "@/lib/fallos-db";
import { eliminarHistorialDeCarpeta } from "@/lib/historial-servidor";
import { bloqueoFreemium } from "@/lib/planes-server";
import {
  estaDentroDe,
  resolverCarpetaExistente,
  rutaEspacioUsuario,
} from "@/lib/rutas-espacio";

export async function DELETE(req: Request) {
  try {
    const clave = await obtenerClaveSesion();

    if (!clave) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const bloqueo = await bloqueoFreemium();
    if (bloqueo) {
      return bloqueo;
    }

    const { searchParams } = new URL(req.url);
    const carpeta = searchParams.get("carpeta");

    if (!carpeta) {
      return NextResponse.json(
        { error: "Falta el nombre de la carpeta" },
        { status: 400 },
      );
    }

    const nombre = carpeta.trim();
    const carpetaResuelta = await resolverCarpetaExistente(clave, nombre);
    let algoEliminado = false;

    if (carpetaResuelta) {
      const rutaEspacio = rutaEspacioUsuario(clave);
      const esCarpetaLogica =
        nombre.startsWith("Test Mixtos - ") ||
        nombre.startsWith("Fallos - ");
      const rutaEliminar = esCarpetaLogica
        ? carpetaResuelta.ruta
        : path.join(
            rutaEspacio,
            nombre.replace(/^Fallos - /, "").replace(/^Test Mixtos - /, ""),
          );

      // Nunca eliminar la raíz de Mi_Espacio, solo subcarpetas.
      if (
        path.resolve(rutaEliminar) === path.resolve(rutaEspacio) ||
        !estaDentroDe(rutaEspacio, rutaEliminar)
      ) {
        return NextResponse.json(
          { error: "No se puede eliminar esa carpeta" },
          { status: 400 },
        );
      }

      await rm(rutaEliminar, { recursive: true, force: true });
      algoEliminado = true;
    }

    if (carpetaResuelta) {
      // Al borrar la carpeta se eliminan su índice y su Repaso_Fallos.pdf.
      await eliminarFallosDeCarpeta(clave, nombre);
      await eliminarHistorialDeCarpeta(clave, nombre);
      algoEliminado = true;
    }

    if (!algoEliminado) {
      return NextResponse.json(
        { error: "No se encontró la carpeta" },
        { status: 404 },
      );
    }

    return NextResponse.json({ mensaje: "Carpeta eliminada correctamente" });
  } catch (error) {
    return NextResponse.json(
      { error: mensajeError(error) },
      { status: 500 },
    );
  }
}
