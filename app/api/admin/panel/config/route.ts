import { NextResponse } from "next/server";
import {
  obtenerIvaConfig,
  guardarIva,
  registrarLog,
} from "@/lib/admin-db";
import {
  exigirAdminPanel,
  limitarAccionAdmin,
  respuestaCsrfInvalida,
  verificarCsrfAdmin,
} from "@/lib/admin-panel-auth";

export async function GET(request: Request) {
  const acceso = await exigirAdminPanel(request);
  if (acceso instanceof NextResponse) return acceso;

  return NextResponse.json({ iva: obtenerIvaConfig() });
}

export async function POST(request: Request) {
  const acceso = await exigirAdminPanel(request);
  if (acceso instanceof NextResponse) return acceso;

  if (!(await verificarCsrfAdmin(request))) {
    return respuestaCsrfInvalida();
  }

  if (!limitarAccionAdmin(request, "config")) {
    return NextResponse.json(
      { error: "Demasiadas acciones. Espera un minuto." },
      { status: 429 },
    );
  }

  const cuerpo: unknown = await request.json().catch(() => null);
  const iva = Number(
    (cuerpo as { iva?: unknown } | null)?.iva,
  );

  if (!Number.isFinite(iva) || iva < 0 || iva > 100) {
    return NextResponse.json(
      { error: "El IVA debe estar entre 0 y 100." },
      { status: 400 },
    );
  }

  guardarIva(Math.round(iva * 100) / 100);
  registrarLog(
    acceso.admin.clave,
    "Cambiar IVA",
    `Nuevo IVA: ${iva}%`,
    acceso.ip,
  );

  return NextResponse.json({ ok: true, iva });
}
