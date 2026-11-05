import { NextResponse } from "next/server";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import { MENSAJE_SOLO_PREMIUM } from "@/lib/planes";

/**
 * Devuelve una respuesta 403 si el usuario tiene plan Freemium.
 * Se usa en las APIs que pertenecen a funcionalidades Premium.
 */
export async function bloqueoFreemium(): Promise<NextResponse | null> {
  const usuario = await obtenerUsuarioSesion();

  if (usuario?.rol !== "freemium") {
    return null;
  }

  return NextResponse.json(
    {
      error: MENSAJE_SOLO_PREMIUM,
      codigo: "PREMIUM_REQUERIDO",
    },
    {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
