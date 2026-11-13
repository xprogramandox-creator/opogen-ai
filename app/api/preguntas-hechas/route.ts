import { NextResponse } from "next/server";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import {
  obtenerPreguntasHechas,
  registrarPreguntasHechas,
} from "@/lib/preguntas-hechas";
import type { PlanUsuario } from "@/lib/rutas-espacio";

function planDe(rol: string): PlanUsuario {
  return rol === "premium" ? "premium" : "freemium";
}

function archivoDe(valor: unknown): string {
  return typeof valor === "string" ? valor.trim().slice(0, 300) : "";
}

export async function GET(request: Request) {
  const usuario = await obtenerUsuarioSesion();

  if (!usuario) {
    return NextResponse.json(
      { preguntas: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const archivo = archivoDe(
    new URL(request.url).searchParams.get("archivo"),
  );

  if (!archivo) {
    return NextResponse.json(
      { preguntas: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const preguntas = await obtenerPreguntasHechas(
    usuario.clave,
    archivo,
    planDe(usuario.rol),
  );

  return NextResponse.json(
    { preguntas },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const usuario = await obtenerUsuarioSesion();

  if (!usuario) {
    return NextResponse.json(
      { error: "No autenticado" },
      { status: 401 },
    );
  }

  const cuerpo = (await request.json().catch(() => null)) as {
    archivo?: unknown;
    preguntas?: unknown;
  } | null;

  const archivo = archivoDe(cuerpo?.archivo);
  const preguntas = Array.isArray(cuerpo?.preguntas)
    ? cuerpo.preguntas.filter(
        (pregunta): pregunta is string => typeof pregunta === "string",
      )
    : [];

  if (!archivo || preguntas.length === 0) {
    return NextResponse.json({ ok: true });
  }

  await registrarPreguntasHechas(
    usuario.clave,
    archivo,
    preguntas,
    planDe(usuario.rol),
  );

  return NextResponse.json({ ok: true });
}
