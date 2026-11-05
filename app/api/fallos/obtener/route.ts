import { NextResponse } from "next/server";
import { obtenerClaveSesion } from "@/lib/auth-server";
import { mensajeError } from "@/lib/errores";
import { leerFallosCarpeta } from "@/lib/fallos-db";

export async function GET(req: Request) {
  const clave = await obtenerClaveSesion();

  if (!clave) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const carpeta = searchParams.get("carpeta");

    if (!carpeta) {
      return NextResponse.json(
        { error: "Falta el parámetro carpeta" },
        { status: 400 },
      );
    }

    const preguntas = await leerFallosCarpeta(clave, carpeta);

    if (preguntas.length === 0) {
      return NextResponse.json(
        { error: "No hay fallos para esta carpeta" },
        { status: 404 },
      );
    }

    return NextResponse.json({ preguntas });
  } catch (error) {
    return NextResponse.json(
      { error: mensajeError(error) },
      { status: 500 },
    );
  }
}
