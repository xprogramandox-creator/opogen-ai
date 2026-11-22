import { NextResponse } from "next/server";
import {
  exigirAdminPanel,
  limitarAccionAdmin,
  respuestaCsrfInvalida,
  verificarCsrfAdmin,
} from "@/lib/admin-panel-auth";
import { registrarLog } from "@/lib/admin-db";
import {
  ESTADOS_TESTIMONIO,
  cambiarEstadoTestimonio,
  eliminarTestimonio,
  type EstadoTestimonio,
} from "@/lib/testimonios-db";

type Contexto = { params: Promise<{ id: string }> };

function leerId(valor: string): number | null {
  const id = Number(valor);

  return Number.isInteger(id) && id > 0 ? id : null;
}

function error(mensaje: string, status = 400) {
  return NextResponse.json({ error: mensaje }, { status });
}

export async function PUT(request: Request, { params }: Contexto) {
  const acceso = await exigirAdminPanel(request);

  if (acceso instanceof NextResponse) {
    return acceso;
  }

  if (!(await verificarCsrfAdmin(request))) {
    return respuestaCsrfInvalida();
  }

  if (!limitarAccionAdmin(request, "testimonios-moderar")) {
    return error("Demasiadas acciones. Espera un minuto.", 429);
  }

  const id = leerId((await params).id);

  if (!id) {
    return error("El testimonio no es válido.");
  }

  const cuerpo: unknown = await request.json().catch(() => null);
  const datos =
    cuerpo && typeof cuerpo === "object"
      ? (cuerpo as Record<string, unknown>)
      : null;
  const estado = typeof datos?.estado === "string" ? datos.estado.trim() : "";

  if (!(ESTADOS_TESTIMONIO as readonly string[]).includes(estado)) {
    return error("Estado no válido.");
  }

  try {
    const testimonio = cambiarEstadoTestimonio(
      id,
      estado as EstadoTestimonio,
      acceso.admin.clave,
    );

    if (!testimonio) {
      return error("No se encontró el testimonio.", 404);
    }

    registrarLog(
      acceso.admin.clave,
      "testimonio-moderar",
      `#${testimonio.id} → ${testimonio.estado}`,
      acceso.ip,
    );

    return NextResponse.json({ testimonio });
  } catch {
    return error("No se pudo actualizar el testimonio.", 500);
  }
}

export async function DELETE(request: Request, { params }: Contexto) {
  const acceso = await exigirAdminPanel(request);

  if (acceso instanceof NextResponse) {
    return acceso;
  }

  if (!(await verificarCsrfAdmin(request))) {
    return respuestaCsrfInvalida();
  }

  if (!limitarAccionAdmin(request, "testimonios-eliminar")) {
    return error("Demasiadas acciones. Espera un minuto.", 429);
  }

  const id = leerId((await params).id);

  if (!id) {
    return error("El testimonio no es válido.");
  }

  try {
    if (!eliminarTestimonio(id)) {
      return error("No se encontró el testimonio.", 404);
    }

    registrarLog(
      acceso.admin.clave,
      "testimonio-eliminar",
      `#${id}`,
      acceso.ip,
    );

    return NextResponse.json({ mensaje: "Testimonio eliminado." });
  } catch {
    return error("No se pudo eliminar el testimonio.", 500);
  }
}
