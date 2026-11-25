import { NextResponse } from "next/server";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import { mensajeError } from "@/lib/errores";
import {
  leerFallosCarpeta,
  obtenerCarpetaMadre,
} from "@/lib/fallos-db";
import { clavesPreguntasDeCarpeta } from "@/lib/preguntas-carpeta";
import { MENSAJE_SOLO_PREMIUM } from "@/lib/planes";
import { claveCanonicaPregunta } from "@/lib/tipos";

export async function GET(req: Request) {
  const usuario = await obtenerUsuarioSesion();

  if (!usuario) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (usuario.rol !== "premium") {
    return NextResponse.json(
      { error: MENSAJE_SOLO_PREMIUM, codigo: "PREMIUM_REQUERIDO" },
      { status: 403 },
    );
  }

  const clave = usuario.clave;

  try {
    const { searchParams } = new URL(req.url);
    const carpeta = searchParams.get("carpeta");

    if (!carpeta) {
      return NextResponse.json(
        { error: "Falta el parámetro carpeta" },
        { status: 400 },
      );
    }

    const guardadas = await leerFallosCarpeta(clave, carpeta);
    const unicas = new Map<string, (typeof guardadas)[number]>();

    for (const pregunta of guardadas) {
      const clavePregunta = claveCanonicaPregunta(pregunta.enunciado);
      if (!unicas.has(clavePregunta)) {
        unicas.set(clavePregunta, pregunta);
      }
    }

    if (unicas.size === 0) {
      return NextResponse.json(
        { error: "No hay fallos para esta carpeta" },
        { status: 404 },
      );
    }

    const fuente = await clavesPreguntasDeCarpeta(
      clave,
      obtenerCarpetaMadre(carpeta),
    );
    const preguntas = [...unicas.entries()]
      .filter(([clavePregunta]) =>
        fuente.size === 0 ? true : fuente.has(clavePregunta),
      )
      .map(([, pregunta]) => pregunta);

    return NextResponse.json({
      preguntas,
      pendientes: preguntas.length,
      totalPreguntas: fuente.size,
    });
  } catch (error) {
    return NextResponse.json(
      { error: mensajeError(error) },
      { status: 500 },
    );
  }
}
