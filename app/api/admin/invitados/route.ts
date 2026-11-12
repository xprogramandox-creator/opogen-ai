import { NextResponse } from "next/server";
import { obtenerInvitadosAdmin } from "@/lib/admin-db";
import { exigirAdminPanel } from "@/lib/admin-panel-auth";

export async function GET(request: Request) {
  const acceso = await exigirAdminPanel(request);

  if (acceso instanceof NextResponse) {
    return acceso;
  }

  return NextResponse.json(obtenerInvitadosAdmin(), {
    headers: { "Cache-Control": "no-store" },
  });
}
