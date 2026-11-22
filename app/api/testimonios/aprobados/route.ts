import { NextResponse } from "next/server";
import { listarAprobados } from "@/lib/testimonios-db";

export async function GET() {
  try {
    return NextResponse.json(
      { testimonios: listarAprobados() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudieron cargar los testimonios." },
      { status: 500 },
    );
  }
}
