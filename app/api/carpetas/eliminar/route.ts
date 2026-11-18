import { NextResponse } from "next/server";
import { rm } from "node:fs/promises";
import path from "node:path";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import { mensajeError } from "@/lib/errores";
import { eliminarFallosDeCarpeta } from "@/lib/fallos-db";
import { eliminarHistorialDeCarpeta } from "@/lib/historial-servidor";
import { bloqueoFreemium } from "@/lib/planes-server";
import {
  PREFIJOS_CARPETA_LOGICA,
  estaDentroDe,
  listarCarpetasMadreExistentes,
  normalizarNombreCarpeta,
  resolverCarpetaExistente,
  rutaEspacioUsuario,
} from "@/lib/rutas-espacio";

export async function DELETE(req: Request) {
  try {
    const usuario = await obtenerUsuarioSesion();

    if (!usuario) {
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
    const plan = usuario.rol;
    const espacio = rutaEspacioUsuario(usuario.clave, plan);
    const esCarpetaLogica = PREFIJOS_CARPETA_LOGICA.some((prefijo) =>
      nombre.startsWith(prefijo),
    );

    // 1) Estadísticas y fallos pendientes SIEMPRE, aunque la carpeta ya no
    // exista físicamente (borrado externo, fallo de red, bug futuro). Así la
    // BD nunca se queda con datos de una carpeta que ya no está.
    const historialEliminado = await eliminarHistorialDeCarpeta(
      usuario.clave,
      nombre,
      plan,
    );
    const fallosEliminados = await eliminarFallosDeCarpeta(
      usuario.clave,
      nombre,
      plan,
    );

    // 2) Archivos de la carpeta.
    let rutaEliminar: string | null = null;
    const carpetaResuelta = await resolverCarpetaExistente(usuario.clave, nombre);

    if (carpetaResuelta) {
      rutaEliminar = esCarpetaLogica
        ? carpetaResuelta.ruta
        : path.join(
            espacio,
            nombre.replace(/^Fallos - /, "").replace(/^Test Mixtos - /, ""),
          );
    } else if (!esCarpetaLogica) {
      // Fallback por nombre normalizado: "Humanizacion" encuentra
      // "Humanización" y viceversa.
      const existentes = await listarCarpetasMadreExistentes(
        usuario.clave,
        plan,
      );
      const objetivo = normalizarNombreCarpeta(nombre);
      const real = existentes.find(
        (candidata) => normalizarNombreCarpeta(candidata) === objetivo,
      );

      if (real) {
        rutaEliminar = path.join(espacio, real);
      }
    }

    let carpetaEliminada = false;

    if (rutaEliminar) {
      // Nunca eliminar la raíz de Mi_Espacio, solo subcarpetas.
      if (
        path.resolve(rutaEliminar) === path.resolve(espacio) ||
        !estaDentroDe(espacio, rutaEliminar)
      ) {
        return NextResponse.json(
          { error: "No se puede eliminar esa carpeta" },
          { status: 400 },
        );
      }

      await rm(rutaEliminar, { recursive: true, force: true });
      carpetaEliminada = true;
    }

    if (
      !carpetaEliminada &&
      historialEliminado === 0 &&
      fallosEliminados === 0
    ) {
      return NextResponse.json(
        { error: "No se encontró la carpeta" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      mensaje: "Carpeta eliminada correctamente",
      carpeta_eliminada: carpetaEliminada,
      historial_eliminado: historialEliminado,
      fallos_eliminados: fallosEliminados,
    });
  } catch (error) {
    return NextResponse.json(
      { error: mensajeError(error) },
      { status: 500 },
    );
  }
}
