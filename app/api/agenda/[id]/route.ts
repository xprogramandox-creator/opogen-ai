import { NextResponse } from "next/server";
import { obtenerClaveSesion } from "@/lib/auth-server";
import { mensajeError } from "@/lib/errores";
import {
  TIPOS_EXAMEN,
  actualizarExamen,
  diasHastaFechaAgenda,
  eliminarExamen,
  esFechaISOValida,
  formatearFechaDdMmAaaa,
  type DatosExamen,
  type TipoExamen,
} from "@/lib/agenda";

type Contexto = { params: Promise<{ id: string }> };

function leerId(valor: string): number | null {
  const id = Number(valor);

  return Number.isInteger(id) && id > 0 ? id : null;
}

function leerDatos(
  cuerpo: Record<string, unknown>,
): { datos: DatosExamen; error?: never } | { datos?: never; error: string } {
  const fecha = typeof cuerpo.fecha === "string" ? cuerpo.fecha.trim() : "";
  const hora = typeof cuerpo.hora === "string" ? cuerpo.hora.trim() : "";
  const materia =
    typeof cuerpo.materia === "string" ? cuerpo.materia.trim() : "";
  const tipo = typeof cuerpo.tipo === "string" ? cuerpo.tipo.trim() : "";
  const notas =
    typeof cuerpo.notas === "string" ? cuerpo.notas.trim().slice(0, 1000) : "";

  if (!esFechaISOValida(fecha)) {
    return { error: "La fecha no es válida." };
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
    return { error: "La hora no es válida." };
  }

  if (materia.length < 2 || materia.length > 80) {
    return { error: "La materia debe tener entre 2 y 80 caracteres." };
  }

  if (!(TIPOS_EXAMEN as readonly string[]).includes(tipo)) {
    return { error: "El tipo de examen no es válido." };
  }

  return {
    datos: { fecha, hora, materia, tipo: tipo as TipoExamen, notas },
  };
}

export async function PUT(req: Request, { params }: Contexto) {
  const clave = await obtenerClaveSesion();

  if (!clave) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const id = leerId((await params).id);

  if (!id) {
    return NextResponse.json(
      { error: "El examen no es válido" },
      { status: 400 },
    );
  }

  try {
    const cuerpo: unknown = await req.json().catch(() => null);

    if (!cuerpo || typeof cuerpo !== "object") {
      return NextResponse.json(
        { error: "Solicitud no válida" },
        { status: 400 },
      );
    }

    const lectura = leerDatos(cuerpo as Record<string, unknown>);

    if (!lectura.datos) {
      return NextResponse.json(
        { error: lectura.error },
        { status: 400 },
      );
    }

    if (!actualizarExamen(clave, id, lectura.datos)) {
      return NextResponse.json(
        { error: "No se encontró el examen" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      examen: {
        id,
        ...lectura.datos,
        fechaIso: lectura.datos.fecha,
        fecha: formatearFechaDdMmAaaa(lectura.datos.fecha),
        dias: diasHastaFechaAgenda(lectura.datos.fecha),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: mensajeError(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, { params }: Contexto) {
  const clave = await obtenerClaveSesion();

  if (!clave) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const id = leerId((await params).id);

  if (!id) {
    return NextResponse.json(
      { error: "El examen no es válido" },
      { status: 400 },
    );
  }

  try {
    if (!eliminarExamen(clave, id)) {
      return NextResponse.json(
        { error: "No se encontró el examen" },
        { status: 404 },
      );
    }

    return NextResponse.json({ mensaje: "Examen eliminado" });
  } catch (error) {
    return NextResponse.json(
      { error: mensajeError(error) },
      { status: 500 },
    );
  }
}
