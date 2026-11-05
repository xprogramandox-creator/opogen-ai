import { NextResponse } from "next/server";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import { MENSAJE_SOLO_PREMIUM } from "@/lib/planes";
import {
  generarPdfExamen,
  normalizarPreguntasPdf,
} from "@/lib/pdf-examen";

export async function POST(request: Request) {
  const usuario = await obtenerUsuarioSesion();

  if (!usuario) {
    return NextResponse.json(
      {
        error:
          "Inicia sesión o regístrate para descargar el examen en PDF.",
      },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  if (usuario.rol !== "premium") {
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

  let cuerpo: unknown;

  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json(
      { error: "La solicitud no es válida." },
      { status: 400 },
    );
  }

  if (typeof cuerpo !== "object" || cuerpo === null) {
    return NextResponse.json(
      { error: "La solicitud no es válida." },
      { status: 400 },
    );
  }

  const preguntas = normalizarPreguntasPdf(
    (cuerpo as Record<string, unknown>).preguntas,
  );

  if (preguntas.length === 0) {
    return NextResponse.json(
      { error: "No hay preguntas válidas para crear el PDF." },
      { status: 400 },
    );
  }

  const pdf = generarPdfExamen(preguntas);

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        'attachment; filename="Examen_OpoGen.pdf"',
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
