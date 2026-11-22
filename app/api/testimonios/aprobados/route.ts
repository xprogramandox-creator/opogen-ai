import { NextResponse } from "next/server";
import { listarAprobados, type TestimonioPublico } from "@/lib/testimonios-db";
import { TESTIMONIOS_SEMILLA } from "@/lib/testimonios-semilla";

const MAXIMO = 12;

/** Mezcla aprobados y semilla para que ambos aparezcan desde el principio. */
function combinar(
  aprobados: TestimonioPublico[],
  semilla: TestimonioPublico[],
): TestimonioPublico[] {
  const resultado: TestimonioPublico[] = [];
  const maximo = Math.max(aprobados.length, semilla.length);

  for (let indice = 0; indice < maximo; indice++) {
    const aprobado = aprobados[indice];
    const semillaActual = semilla[indice];

    if (aprobado) resultado.push(aprobado);
    if (semillaActual) resultado.push(semillaActual);
  }

  return resultado.slice(0, MAXIMO);
}

export async function GET() {
  try {
    return NextResponse.json(
      { testimonios: combinar(listarAprobados(MAXIMO), TESTIMONIOS_SEMILLA) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudieron cargar los testimonios." },
      { status: 500 },
    );
  }
}
