import { NextResponse } from "next/server";
import { exigirAdminPanel } from "@/lib/admin-panel-auth";
import {
  ESTADOS_TESTIMONIO,
  contarTestimonios,
  listarTestimonios,
  type EstadoTestimonio,
} from "@/lib/testimonios-db";

export async function GET(request: Request) {
  const acceso = await exigirAdminPanel(request);

  if (acceso instanceof NextResponse) {
    return acceso;
  }

  const estadoParam = new URL(request.url).searchParams.get("estado");
  const estado =
    estadoParam && (ESTADOS_TESTIMONIO as readonly string[]).includes(estadoParam)
      ? (estadoParam as EstadoTestimonio)
      : undefined;

  try {
    return NextResponse.json({
      testimonios: listarTestimonios(estado),
      resumen: contarTestimonios(),
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudieron cargar los testimonios." },
      { status: 500 },
    );
  }
}
