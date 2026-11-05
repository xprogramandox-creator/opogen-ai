import { NextResponse } from "next/server";
import { archivarUso, registrarLog } from "@/lib/admin-db";
import {
  exigirAdminPanel,
  limitarAccionAdmin,
  respuestaCsrfInvalida,
  verificarCsrfAdmin,
} from "@/lib/admin-panel-auth";

export async function POST(request: Request) {
  const acceso = await exigirAdminPanel(request);

  if (acceso instanceof NextResponse) {
    return acceso;
  }

  if (!(await verificarCsrfAdmin(request))) {
    return respuestaCsrfInvalida();
  }

  if (!limitarAccionAdmin(request, "reiniciar-uso")) {
    return NextResponse.json(
      { error: "Demasiadas acciones. Espera un minuto." },
      { status: 429 },
    );
  }

  const archivados = archivarUso();

  registrarLog(
    acceso.admin.clave,
    "Reiniciar Uso por zona",
    `Registros de uso archivados: ${archivados}`,
    acceso.ip,
  );

  return NextResponse.json({ ok: true, archivados });
}
