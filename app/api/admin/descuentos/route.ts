import { NextResponse } from "next/server";
import {
  actualizarActivoDescuento,
  crearDescuento,
  listarDescuentos,
} from "@/lib/descuentos";
import {
  exigirAdminPanel,
  limitarAccionAdmin,
  respuestaCsrfInvalida,
  verificarCsrfAdmin,
} from "@/lib/admin-panel-auth";
import { registrarLog } from "@/lib/admin-db";

const CODIGO = /^[A-Z0-9_-]{3,64}$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function error(mensaje: string, status = 400) {
  return NextResponse.json({ error: mensaje }, { status });
}

export async function GET(request: Request) {
  const acceso = await exigirAdminPanel(request);
  if (acceso instanceof NextResponse) return acceso;

  try {
    const descuentos = await listarDescuentos();
    return NextResponse.json({ descuentos });
  } catch (err) {
    console.error("[admin/descuentos] Error al listar", err);

    return error(
      err instanceof Error
        ? err.message
        : "No se pudieron cargar los descuentos.",
      502,
    );
  }
}

export async function POST(request: Request) {
  const acceso = await exigirAdminPanel(request);
  if (acceso instanceof NextResponse) return acceso;

  if (!(await verificarCsrfAdmin(request))) {
    return respuestaCsrfInvalida();
  }

  if (!limitarAccionAdmin(request, "descuentos-crear")) {
    return error("Demasiadas acciones. Espera un minuto.", 429);
  }

  const cuerpo: unknown = await request.json().catch(() => null);

  if (!cuerpo || typeof cuerpo !== "object") {
    return error("Solicitud no válida.");
  }

  const datos = cuerpo as Record<string, unknown>;
  const codigo =
    typeof datos.codigo === "string"
      ? datos.codigo.trim().toUpperCase()
      : "";
  const tipo =
    datos.tipo === "porcentaje" || datos.tipo === "importe"
      ? datos.tipo
      : "";
  const valor = Number(datos.valor);
  const fechaInicio =
    typeof datos.fechaInicio === "string"
      ? datos.fechaInicio
      : "";
  const fechaFin =
    typeof datos.fechaFin === "string" && datos.fechaFin
      ? datos.fechaFin
      : null;
  const activo = datos.activo !== false;

  if (!CODIGO.test(codigo)) {
    return error(
      "El código debe tener entre 3 y 64 caracteres: letras, números, guiones o guiones bajos.",
    );
  }

  if (!tipo) {
    return error("Selecciona un tipo de descuento.");
  }

  if (!Number.isFinite(valor) || valor <= 0) {
    return error("El valor del descuento debe ser mayor que cero.");
  }

  if (tipo === "porcentaje" && valor > 100) {
    return error("El porcentaje no puede superar el 100%.");
  }

  if (tipo === "importe" && valor > 100_000) {
    return error("El importe del descuento es demasiado alto.");
  }

  if (!FECHA.test(fechaInicio)) {
    return error("La fecha de inicio no es válida.");
  }

  if (fechaFin && !FECHA.test(fechaFin)) {
    return error("La fecha de fin no es válida.");
  }

  if (fechaFin && fechaFin < fechaInicio) {
    return error(
      "La fecha de fin no puede ser anterior a la fecha de inicio.",
    );
  }

  try {
    const descuento = await crearDescuento({
      codigo,
      tipo,
      valor,
      fechaInicio,
      fechaFin,
      activo,
    });

    registrarLog(
      acceso.admin.clave,
      "Crear descuento",
      `${codigo} · ${descuento.descuento}`,
      acceso.ip,
    );

    return NextResponse.json({ ok: true, descuento }, { status: 201 });
  } catch (err) {
    console.error("[admin/descuentos] Error al crear", err);

    return error(
      err instanceof Error
        ? err.message
        : "No se pudo crear el descuento.",
      502,
    );
  }
}

export async function PATCH(request: Request) {
  const acceso = await exigirAdminPanel(request);
  if (acceso instanceof NextResponse) return acceso;

  if (!(await verificarCsrfAdmin(request))) {
    return respuestaCsrfInvalida();
  }

  if (!limitarAccionAdmin(request, "descuentos-actualizar")) {
    return error("Demasiadas acciones. Espera un minuto.", 429);
  }

  const cuerpo: unknown = await request.json().catch(() => null);

  if (!cuerpo || typeof cuerpo !== "object") {
    return error("Solicitud no válida.");
  }

  const datos = cuerpo as Record<string, unknown>;
  const promotionCodeId =
    typeof datos.promotionCodeId === "string"
      ? datos.promotionCodeId.trim()
      : "";
  const activo = datos.activo === true;

  if (!promotionCodeId.startsWith("promo_")) {
    return error("Código de promoción no válido.");
  }

  try {
    await actualizarActivoDescuento(promotionCodeId, activo);

    registrarLog(
      acceso.admin.clave,
      activo ? "Activar descuento" : "Desactivar descuento",
      promotionCodeId,
      acceso.ip,
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/descuentos] Error al actualizar", err);

    return error(
      err instanceof Error
        ? err.message
        : "No se pudo actualizar el descuento.",
      502,
    );
  }
}
