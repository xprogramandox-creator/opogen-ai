import { NextResponse } from "next/server";
import { borrarActividadInvitados, registrarLog } from "@/lib/admin-db";
import { esDiaAnalitico } from "@/lib/analitica";
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

  if (!limitarAccionAdmin(request, "borrar-invitados")) {
    return NextResponse.json(
      { error: "Demasiadas acciones. Espera un minuto." },
      { status: 429 },
    );
  }

  const cuerpo = (await request.json().catch(() => null)) as {
    fecha?: unknown;
  } | null;
  const fecha =
    typeof cuerpo?.fecha === "string" && cuerpo.fecha.trim()
      ? cuerpo.fecha.trim()
      : undefined;

  if (fecha && !esDiaAnalitico(fecha)) {
    return NextResponse.json(
      { error: "Fecha no válida." },
      { status: 400 },
    );
  }

  const borrados = borrarActividadInvitados(fecha);

  registrarLog(
    acceso.admin.clave,
    "Borrar actividad de invitados",
    `Registros de invitados borrados: ${borrados}${
      fecha ? ` (${fecha})` : " (todos los días)"
    }`,
    acceso.ip,
  );

  return NextResponse.json({ ok: true, borrados });
}
