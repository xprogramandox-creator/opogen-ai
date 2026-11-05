import { NextResponse } from "next/server";
import {
  archivarDatosLanzamiento,
  registrarLog,
} from "@/lib/admin-db";
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

  if (!limitarAccionAdmin(request, "limpieza-lanzamiento")) {
    return NextResponse.json(
      { error: "Demasiadas acciones. Espera un minuto." },
      { status: 429 },
    );
  }

  const resultado = archivarDatosLanzamiento();

  registrarLog(
    acceso.admin.clave,
    "Limpieza de lanzamiento",
    `Pagos archivados: ${resultado.pagos} · Usos archivados: ${resultado.uso}`,
    acceso.ip,
  );

  return NextResponse.json({
    ok: true,
    pagos: resultado.pagos,
    uso: resultado.uso,
  });
}
