import { NextResponse } from "next/server";
import { readdir } from "node:fs/promises";
import { obtenerClaveSesion } from "@/lib/auth-server";
import { mensajeError } from "@/lib/errores";
import { bloqueoFreemium } from "@/lib/planes-server";
import { resolverCarpetaExistente } from "@/lib/rutas-espacio";

export async function GET(req: Request) {
  // `cookies()` se consulta fuera del try/catch: durante el prerender lanza una
  // excepción de control que Next debe poder propagar para marcar la ruta como
  // dinámica.
  const clave = await obtenerClaveSesion();

  if (!clave) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const bloqueo = await bloqueoFreemium();
  if (bloqueo) {
    return bloqueo;
  }

  try {
    const { searchParams } = new URL(req.url);
    const carpeta = searchParams.get("carpeta");

    if (!carpeta) {
      return NextResponse.json({ archivos: [] });
    }

    // Acepta tanto el nombre visible como el saneado, sin salir de Mi_Espacio.
    const carpetaResuelta = await resolverCarpetaExistente(clave, carpeta);

    if (!carpetaResuelta) {
      return NextResponse.json({ archivos: [] });
    }

    const entradas = await readdir(carpetaResuelta.ruta, {
      withFileTypes: true,
    });

    const pdfs = entradas
      .filter((entrada) => entrada.isFile() && entrada.name.endsWith(".pdf"))
      .map((entrada) => entrada.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    return NextResponse.json({ archivos: pdfs });
  } catch (error) {
    // Un fallo de lectura no debe romper la interfaz: se devuelve lista vacía.
    console.error("Error al listar archivos:", mensajeError(error));

    return NextResponse.json({ archivos: [] });
  }
}
