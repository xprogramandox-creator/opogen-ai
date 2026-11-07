import { NextResponse } from "next/server";
import { obtenerAnaliticaAdmin } from "@/lib/admin-db";
import { esDiaAnalitico } from "@/lib/analitica";
import { exigirAdminPanel } from "@/lib/admin-panel-auth";

export async function GET(request: Request) {
  const acceso = await exigirAdminPanel(request);

  if (acceso instanceof NextResponse) {
    return acceso;
  }

  const fecha = new URL(request.url).searchParams.get("fecha");

  if (fecha && !esDiaAnalitico(fecha)) {
    return NextResponse.json(
      { error: "Fecha no válida." },
      { status: 400 },
    );
  }

  return NextResponse.json(obtenerAnaliticaAdmin(fecha || undefined), {
    headers: { "Cache-Control": "no-store" },
  });
}
