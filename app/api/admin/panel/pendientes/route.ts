import { NextResponse } from "next/server";
import { rm } from "node:fs/promises";
import path from "node:path";
import {
  eliminarPendientesPorClave,
  eliminarUsuarioAdmin,
  listarPendientesVerificacion,
  obtenerPendientePorClave,
  obtenerUsuarioAdmin,
  registrarLog,
  sincronizarUsuarios,
} from "@/lib/admin-db";
import {
  guardarUsuario,
  leerUsuario,
  rutaArchivoUsuario,
  serializarDatos,
} from "@/lib/auth-server";
import {
  exigirAdminPanel,
  limitarAccionAdmin,
  respuestaCsrfInvalida,
  verificarCsrfAdmin,
} from "@/lib/admin-panel-auth";
import {
  CARPETA_FREEMIUM,
  CARPETA_PREMIUM,
} from "@/lib/rutas-espacio";
import { stripe } from "@/lib/stripe";
import { writeFile } from "node:fs/promises";

function normalizarPlan(
  rol: "freemium" | "premium",
  plan: string | undefined,
): string {
  if (rol === "freemium") return plan || "";
  return plan || "mensual";
}

export async function GET(request: Request) {
  const acceso = await exigirAdminPanel(request);

  if (acceso instanceof NextResponse) {
    return acceso;
  }

  try {
    const pendientes = await listarPendientesVerificacion();
    return NextResponse.json({ pendientes });
  } catch (error) {
    console.error(
      "[admin-pendientes] No se pudieron listar los pendientes",
      error,
    );
    return NextResponse.json(
      { error: "No se pudieron cargar los usuarios pendientes." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const acceso = await exigirAdminPanel(request);

  if (acceso instanceof NextResponse) {
    return acceso;
  }

  if (!(await verificarCsrfAdmin(request))) {
    return respuestaCsrfInvalida();
  }

  const cuerpo: unknown = await request.json().catch(() => null);

  if (!cuerpo || typeof cuerpo !== "object") {
    return NextResponse.json(
      { error: "Solicitud no válida." },
      { status: 400 },
    );
  }

  const datos = cuerpo as Record<string, unknown>;
  const clave =
    typeof datos.clave === "string" ? datos.clave.trim() : "";
  const accion =
    typeof datos.accion === "string" ? datos.accion : "";

  if (!clave || !["verificar", "eliminar"].includes(accion)) {
    return NextResponse.json(
      { error: "Acción no válida." },
      { status: 400 },
    );
  }

  if (!limitarAccionAdmin(request, `pendientes-${accion}`)) {
    return NextResponse.json(
      { error: "Demasiadas acciones. Espera un minuto." },
      { status: 429 },
    );
  }

  try {
    if (accion === "verificar") {
      return await verificarPendiente(clave, acceso.admin.clave, acceso.ip);
    }

    return await eliminarPendiente(clave, acceso.admin.clave, acceso.ip);
  } catch (error) {
    console.error(`[admin-pendientes] Error en acción ${accion}`, error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo completar la acción.",
      },
      { status: 500 },
    );
  }
}

async function verificarPendiente(
  clave: string,
  adminClave: string,
  ip: string,
) {
  const pendiente = obtenerPendientePorClave(clave);

  if (pendiente) {
    if (pendiente.emailVerificado === true) {
      return NextResponse.json(
        { error: "El usuario ya está verificado." },
        { status: 409 },
      );
    }

    const rol: "premium" | "freemium" =
      pendiente.rol === "premium" ? "premium" : "freemium";
    const actualizado = {
      ...pendiente,
      rol,
      planContratado: normalizarPlan(rol, pendiente.planContratado),
      emailVerificado: true,
      tokenVerificacion: undefined,
      tokenVerificacionExpira: undefined,
    };

    await guardarUsuario(actualizado);
    eliminarPendientesPorClave(clave);
    await sincronizarUsuarios();

    registrarLog(
      adminClave,
      "Verificar usuario manualmente",
      `${clave} · ${actualizado.nombre} ${actualizado.apellidos || ""}`.trim(),
      ip,
    );

    console.log("[admin-pendientes] Usuario pendiente verificado", {
      clave,
      rol,
      plan: actualizado.planContratado,
    });

    return NextResponse.json({ ok: true });
  }

  const usuario = await leerUsuario(clave);

  if (!usuario) {
    const soloDb = obtenerUsuarioAdmin(clave);

    return NextResponse.json(
      {
        error: soloDb
          ? "No se puede verificar sin el archivo datos.txt del usuario."
          : "Usuario no encontrado.",
      },
      { status: soloDb ? 422 : 404 },
    );
  }

  if (usuario.emailVerificado === true) {
    return NextResponse.json(
      { error: "El usuario ya está verificado." },
      { status: 409 },
    );
  }

  const rol: "premium" | "freemium" =
    usuario.rol === "premium" ? "premium" : "freemium";
  const actualizado = {
    ...usuario,
    rol,
    planContratado: normalizarPlan(rol, usuario.planContratado),
    emailVerificado: true,
    tokenVerificacion: undefined,
    tokenVerificacionExpira: undefined,
  };

  await writeFile(
    rutaArchivoUsuario(clave, rol),
    serializarDatos(actualizado),
    { encoding: "utf8" },
  );
  await sincronizarUsuarios();

  registrarLog(
    adminClave,
    "Verificar usuario manualmente",
    `${clave} · ${actualizado.nombre} ${actualizado.apellidos || ""}`.trim(),
    ip,
  );

  console.log("[admin-pendientes] Usuario verificado", {
    clave,
    rol,
    plan: actualizado.planContratado,
  });

  return NextResponse.json({ ok: true });
}

async function eliminarPendiente(
  clave: string,
  adminClave: string,
  ip: string,
) {
  const pendiente = obtenerPendientePorClave(clave);
  const usuario = await leerUsuario(clave);
  const datos = usuario || pendiente || obtenerUsuarioAdmin(clave);

  if (!datos) {
    return NextResponse.json(
      { error: "Usuario no encontrado." },
      { status: 404 },
    );
  }

  const carpetas = [
    path.join(CARPETA_PREMIUM, clave),
    path.join(CARPETA_FREEMIUM, clave),
  ];

  for (const carpeta of carpetas) {
    await rm(carpeta, { recursive: true, force: true });
    console.log("[admin-pendientes] Carpeta eliminada", {
      clave,
      carpeta,
    });
  }

  eliminarUsuarioAdmin(clave);
  console.log("[admin-pendientes] Datos locales eliminados", { clave });
  await sincronizarUsuarios();

  let stripeEliminado = false;

  if (datos.stripeCustomerId) {
    try {
      if (datos.stripeSubscriptionId) {
        await stripe.subscriptions
          .cancel(datos.stripeSubscriptionId)
          .catch((error) => {
            console.warn(
              "[admin-pendientes] No se pudo cancelar la suscripción",
              error,
            );
          });
      }

      await stripe.customers.del(datos.stripeCustomerId);
      stripeEliminado = true;
      console.log("[admin-pendientes] Cliente Stripe eliminado", {
        clave,
        stripeCustomerId: datos.stripeCustomerId,
      });
    } catch (error) {
      console.error(
        "[admin-pendientes] No se pudo eliminar el cliente Stripe",
        error,
      );
    }
  }

  registrarLog(
    adminClave,
    "Eliminar usuario pendiente",
    `${clave} · ${datos.nombre} ${datos.apellidos || ""}`.trim(),
    ip,
  );

  return NextResponse.json({ ok: true, stripeEliminado });
}
