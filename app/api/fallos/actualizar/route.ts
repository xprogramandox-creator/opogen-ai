import { NextResponse } from "next/server";
import { obtenerClaveSesion } from "@/lib/auth-server";
import { mensajeError } from "@/lib/errores";
import {
  guardarFallosCarpeta,
  leerFallosCarpeta,
  obtenerCarpetaMadre,
} from "@/lib/fallos-db";
import { esNombreCarpetaSeguro } from "@/lib/rutas-espacio";
import { normalizarPregunta, type Pregunta } from "@/lib/tipos";

type ResultadoTest = {
  carpeta: string;
  pregunta: Pregunta;
  acierto: boolean;
};

function leerResultado(valor: unknown): ResultadoTest | null {
  if (!valor || typeof valor !== "object") {
    return null;
  }

  const datos = valor as Record<string, unknown>;
  const carpeta =
    typeof datos.carpeta === "string" ? datos.carpeta.trim() : "";
  const pregunta = normalizarPregunta(datos.pregunta);

  if (
    !carpeta ||
    !pregunta ||
    typeof datos.acierto !== "boolean"
  ) {
    return null;
  }

  return { carpeta, pregunta, acierto: datos.acierto };
}

function clavePregunta(pregunta: Pregunta): string {
  return pregunta.enunciado;
}

export async function POST(req: Request) {
  try {
    const clave = await obtenerClaveSesion();

    if (!clave) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const cuerpo: unknown = await req.json().catch(() => null);

    if (!Array.isArray(cuerpo)) {
      return NextResponse.json(
        { error: "Se espera un array de resultados" },
        { status: 400 },
      );
    }

    // Cada carpeta de examen tiene su propio Repaso_Fallos.pdf y su índice
    // interno. Así "Test Mixtos - Humanización" no comparte repaso con
    // "Humanización".
    const porCarpeta = new Map<string, Pregunta[]>();
    let procesados = 0;

    for (const item of cuerpo) {
      const resultado = leerResultado(item);

      if (!resultado) {
        continue;
      }

      const madre = obtenerCarpetaMadre(resultado.carpeta);

      if (!esNombreCarpetaSeguro(madre)) {
        continue;
      }

      let fallos = porCarpeta.get(madre);

      if (!fallos) {
        fallos = await leerFallosCarpeta(clave, madre);
        porCarpeta.set(madre, fallos);
      }

      const indice = fallos.findIndex(
        (guardada) =>
          clavePregunta(guardada) === clavePregunta(resultado.pregunta),
      );

      if (!resultado.acierto && indice === -1) {
        fallos.push(resultado.pregunta);
      } else if (resultado.acierto && indice !== -1) {
        fallos.splice(indice, 1);
      }

      procesados += 1;
    }

    for (const [madre, fallos] of porCarpeta) {
      await guardarFallosCarpeta(clave, madre, fallos);
    }

    return NextResponse.json({
      mensaje: "Fallos actualizados correctamente",
      procesados,
      carpetas: [...porCarpeta.keys()],
    });
  } catch (error) {
    return NextResponse.json(
      { error: mensajeError(error) },
      { status: 500 },
    );
  }
}
