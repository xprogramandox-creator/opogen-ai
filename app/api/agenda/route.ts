import { NextResponse } from "next/server";
import { obtenerClaveSesion } from "@/lib/auth-server";
import { mensajeError } from "@/lib/errores";
import {
  TIPOS_EXAMEN,
  crearExamen,
  diasHastaFechaAgenda,
  esFechaISOValida,
  formatearFechaDdMmAaaa,
  listarExamenes,
  type DatosExamen,
  type TipoExamen,
} from "@/lib/agenda";

type LecturaDatos = { datos: DatosExamen; error?: never } | { datos?: never; error: string };

function leerDatos(cuerpo: Record<string, unknown>): LecturaDatos {
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

/** Añade la fecha visible (DD-MM-YYYY) y los días que faltan. */
function conFechasVisibles(clave: string) {
  return listarExamenes(clave).map((examen) => ({
    ...examen,
    fecha: formatearFechaDdMmAaaa(examen.fechaIso),
    dias: diasHastaFechaAgenda(examen.fechaIso),
  }));
}

export async function GET() {
  const clave = await obtenerClaveSesion();

  if (!clave) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const examenes = conFechasVisibles(clave);
    const proximo = examenes.find((examen) => examen.dias >= 0) ?? null;

    return NextResponse.json({
      examenes,
      proximo: proximo
        ? {
            id: proximo.id,
            fecha: proximo.fecha,
            dias: proximo.dias,
            materia: proximo.materia,
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: mensajeError(error) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const clave = await obtenerClaveSesion();

  if (!clave) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
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

    const examen = crearExamen(clave, lectura.datos);

    return NextResponse.json(
      {
        examen: {
          ...examen,
          fecha: formatearFechaDdMmAaaa(examen.fechaIso),
          dias: diasHastaFechaAgenda(examen.fechaIso),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: mensajeError(error) },
      { status: 500 },
    );
  }
}
