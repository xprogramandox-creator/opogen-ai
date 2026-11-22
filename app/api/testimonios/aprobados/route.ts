import { connection, NextResponse } from "next/server";
import { listarAprobados, type TestimonioPublico } from "@/lib/testimonios-db";
import { TESTIMONIOS_SEMILLA, semillaEnIdioma } from "@/lib/testimonios-semilla";
import {
  IDIOMAS_TESTIMONIO,
  esIdiomaTestimonio,
  type IdiomaTestimonio,
} from "@/lib/traduccion";

const MAXIMO = 12;

/** Mezcla aprobados y semilla para que ambos aparezcan desde el principio. */
function idiomaSolicitado(request: Request): IdiomaTestimonio {
  const parametro = new URL(request.url).searchParams.get("locale");

  if (esIdiomaTestimonio(parametro)) {
    return parametro;
  }

  const cabecera = request.headers.get("accept-language")?.toLowerCase() ?? "";

  for (const idioma of IDIOMAS_TESTIMONIO) {
    if (cabecera.includes(idioma)) {
      return idioma;
    }
  }

  return "en";
}

function combinar(
  aprobados: TestimonioPublico[],
  semilla: TestimonioPublico[],
): TestimonioPublico[] {
  const resultado: TestimonioPublico[] = [];
  const vistos = new Set<number>();

  // Los aprobados de la BD van primero y nunca se descartan; las semillas
  // rellenan el resto sin duplicar ids.
  for (const testimonio of [...aprobados, ...semilla]) {
    if (vistos.has(testimonio.id)) continue;

    vistos.add(testimonio.id);
    resultado.push(testimonio);

    if (resultado.length >= MAXIMO) break;
  }

  return resultado;
}

export async function GET(request: Request) {
  // Obliga a renderizar en cada petición: con cacheComponents la ruta se
  // prerenderizaría en el build y los aprobados posteriores no saldrían.
  await connection();

  const idioma = idiomaSolicitado(request);

  try {
    return NextResponse.json(
      {
        testimonios: combinar(
          listarAprobados(MAXIMO, idioma),
          semillaEnIdioma(TESTIMONIOS_SEMILLA, idioma),
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudieron cargar los testimonios." },
      { status: 500 },
    );
  }
}
