import { NextResponse } from "next/server";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import {
  esNombreCarpetaSeguro,
  estaDentroDe,
  rutaEspacioUsuario,
} from "@/lib/rutas-espacio";
import { SUB_CARPETA_RESUMENES } from "@/lib/estructura-carpetas";

export async function GET(request: Request) {
  const usuario = await obtenerUsuarioSesion();

  if (!usuario) {
    return NextResponse.json(
      { error: "No autenticado" },
      { status: 401 },
    );
  }

  if (usuario.rol !== "premium") {
    return NextResponse.json(
      {
        error: "Los resúmenes de estudio son una función Premium.",
        codigo: "PREMIUM_REQUERIDO",
      },
      { status: 403 },
    );
  }

  const carpeta = new URL(request.url).searchParams
    .get("carpeta")
    ?.trim();

  if (!carpeta || !esNombreCarpetaSeguro(carpeta)) {
    return NextResponse.json(
      { error: "Carpeta no válida." },
      { status: 400 },
    );
  }

  const rutaEspacio = rutaEspacioUsuario(usuario.clave);
  const rutaResumenes = path.join(
    rutaEspacio,
    carpeta,
    SUB_CARPETA_RESUMENES,
  );

  if (!estaDentroDe(rutaEspacio, rutaResumenes)) {
    return NextResponse.json(
      { error: "Carpeta no válida." },
      { status: 400 },
    );
  }

  try {
    const entradas = await readdir(rutaResumenes, {
      withFileTypes: true,
    });
    const resumenes = await Promise.all(
      entradas
        .filter(
          (entrada) =>
            entrada.isFile() &&
            /\.md$/i.test(entrada.name) &&
            !entrada.name.startsWith("."),
        )
        .map(async (entrada) => {
          const info = await stat(
            path.join(rutaResumenes, entrada.name),
          );
          const titulo = entrada.name
            .replace(/^resumen-/i, "")
            .replace(/\.md$/i, "")
            .replace(/_[a-f0-9]{8}$/i, "")
            .replace(/[-_]+/g, " ")
            .trim();

          return {
            archivo: entrada.name,
            titulo: titulo || "Resumen de estudio",
            fecha: info.mtime.toISOString(),
            tamano: info.size,
          };
        }),
    );

    resumenes.sort((a, b) =>
      a.archivo.localeCompare(b.archivo, "es", {
        numeric: true,
        sensitivity: "base",
      }),
    );

    return NextResponse.json({ resumenes });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      return NextResponse.json({ resumenes: [] });
    }

    console.error("[Resumenes] Error al listar:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar los resúmenes." },
      { status: 500 },
    );
  }
}
