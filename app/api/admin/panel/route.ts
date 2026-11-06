import { NextResponse } from "next/server";
import {
  listarLogs,
  listarPagos,
  listarProximosACaducar,
  pagosMensuales,
  resumenAdmin,
  resumenUso,
  sincronizarUsuarios,
  obtenerIvaConfig,
} from "@/lib/admin-db";
import { exigirAdminPanel } from "@/lib/admin-panel-auth";

export async function GET(request: Request) {
  const acceso = await exigirAdminPanel(request);

  if (acceso instanceof NextResponse) {
    return acceso;
  }

  await sincronizarUsuarios();

  return NextResponse.json({
    resumen: resumenAdmin(),
    proximos: listarProximosACaducar(30),
    pagos: listarPagos(),
    pagosMensuales: pagosMensuales(),
    uso: resumenUso(),
    logs: listarLogs(80),
    iva: obtenerIvaConfig(),
  });
}
