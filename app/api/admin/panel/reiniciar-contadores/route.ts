import { NextResponse } from "next/server";
import { archivarPagos, registrarLog } from "@/lib/admin-db";
import {
  exigirAdminPanel,
  limitarAccionAdmin,
  respuestaCsrfInvalida,
  verificarCsrfAdmin,
} from "@/lib/admin-panel-auth";

type Contexto = "facturacion" | "estadisticas";

export async function POST(request: Request) {
  const acceso = await exigirAdminPanel(request);

  if (acceso instanceof NextResponse) {
    return acceso;
  }

  if (!(await verificarCsrfAdmin(request))) {
    return respuestaCsrfInvalida();
  }

  if (!limitarAccionAdmin(request, "reiniciar-contadores")) {
    return NextResponse.json(
      { error: "Demasiadas acciones. Espera un minuto." },
      { status: 429 },
    );
  }

  const cuerpo: unknown = await request.json().catch(() => null);
  const contexto = (cuerpo as { contexto?: unknown } | null)?.contexto;

  if (contexto !== "facturacion" && contexto !== "estadisticas") {
    return NextResponse.json(
      { error: "Contexto de reinicio no válido." },
      { status: 400 },
    );
  }

  const archivados = archivarPagos(contexto as Contexto);

  registrarLog(
    acceso.admin.clave,
    "Reiniciar contadores",
    `Contexto: ${contexto} · Pagos archivados: ${archivados}`,
    acceso.ip,
  );

  return NextResponse.json({ ok: true, archivados, contexto });
}
