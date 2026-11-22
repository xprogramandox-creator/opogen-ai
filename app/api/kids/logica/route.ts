import { NextResponse } from "next/server";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import {
  leerAcertijosVistos,
  marcarAcertijoVisto,
  reiniciarAcertijosVistos,
} from "@/lib/acertijos-server";
import {
  esEdadAcertijo,
  type Acertijo,
  type EdadAcertijo,
} from "@/lib/acertijos";
import type { PlanUsuario } from "@/lib/rutas-espacio";
import acertijos from "@/data/acertijos.json";

const ACERTIJOS = acertijos as Acertijo[];

function seleccionar(
  edad: EdadAcertijo,
  vistos: string[],
): Acertijo | null {
  const disponibles = ACERTIJOS.filter(
    (acertijo) =>
      acertijo.edad === edad && !vistos.includes(acertijo.id),
  );

  if (disponibles.length === 0) {
    return null;
  }

  return disponibles[Math.floor(Math.random() * disponibles.length)];
}

async function responder(edad: EdadAcertijo, idActual?: string) {
  const usuario = await obtenerUsuarioSesion();

  if (!usuario || usuario.rol !== "premium") {
    return NextResponse.json(
      { error: "Acceso exclusivo para usuarios Premium." },
      { status: 403 },
    );
  }

  const plan: PlanUsuario =
    usuario.rol === "premium" ? "premium" : "freemium";

  let estado = idActual
    ? await marcarAcertijoVisto(usuario.clave, plan, idActual)
    : await leerAcertijosVistos(usuario.clave, plan);

  let acertijo = seleccionar(edad, estado.vistos);

  // Si ya ha visto todos los de su edad, se reinicia la ronda y se sigue
  // jugando: nunca se bloquea el juego ni se muestra un aviso de fin.
  if (!acertijo) {
    estado = await reiniciarAcertijosVistos(usuario.clave, plan);
    acertijo = seleccionar(edad, estado.vistos);
  }

  if (!acertijo) {
    return NextResponse.json(
      { error: "No hay acertijos disponibles para esta edad." },
      { status: 404 },
    );
  }

  return NextResponse.json(
    { acertijo },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request) {
  const edad = new URL(request.url).searchParams.get("edad");

  if (!esEdadAcertijo(edad)) {
    return NextResponse.json(
      { error: "Edad no válida." },
      { status: 400 },
    );
  }

  return responder(edad);
}

export async function POST(request: Request) {
  const cuerpo = (await request.json().catch(() => null)) as {
    edad?: unknown;
    id?: unknown;
  } | null;

  if (!esEdadAcertijo(cuerpo?.edad)) {
    return NextResponse.json(
      { error: "Edad no válida." },
      { status: 400 },
    );
  }

  const id = typeof cuerpo?.id === "string" ? cuerpo.id : undefined;

  return responder(cuerpo.edad, id);
}
