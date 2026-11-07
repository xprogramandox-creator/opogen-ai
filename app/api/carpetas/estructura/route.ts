import { NextResponse } from "next/server";
import path from "node:path";
import { crearEstructuraCarpetaMadre } from "@/lib/estructura-carpetas";
import {
  esNombreCarpetaSeguro,
  existeCarpeta,
  rutaEspacioUsuario,
} from "@/lib/rutas-espacio";
import { obtenerClaveSesion } from "@/lib/auth-server";
import { mensajeError } from "@/lib/errores";

export async function POST(request: Request) {
  const clave = await obtenerClaveSesion();

  if (!clave) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const cuerpo: unknown = await request.json().catch(() => null);

  if (!cuerpo || typeof cuerpo !== "object") {
    return NextResponse.json(
      { error: "Solicitud no válida." },
      { status: 400 },
    );
  }

  const nombre = (cuerpo as { carpeta?: unknown }).carpeta;

  if (
    typeof nombre !== "string" ||
    !nombre.trim() ||
    !esNombreCarpetaSeguro(nombre.trim())
  ) {
    return NextResponse.json(
      { error: "Carpeta no válida." },
      { status: 400 },
    );
  }

  try {
    const rutaEspacio = rutaEspacioUsuario(clave);
    const rutaCarpeta = path.join(rutaEspacio, nombre.trim());

    if (!(await existeCarpeta(rutaCarpeta))) {
      return NextResponse.json(
        { error: "La carpeta madre no existe." },
        { status: 404 },
      );
    }

    await crearEstructuraCarpetaMadre(nombre.trim(), rutaEspacio);

    return NextResponse.json({
      ok: true,
      subcarpetas: ["Test", "Test Mixtos", "Resumenes", "Repaso"],
    });
  } catch (error) {
    console.error("[carpetas/estructura] Error:", error);

    return NextResponse.json(
      { error: mensajeError(error) },
      { status: 500 },
    );
  }
}
