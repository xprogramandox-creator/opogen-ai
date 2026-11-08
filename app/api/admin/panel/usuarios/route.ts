import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";
import {
  actualizarUsuario,
  degradarUsuarioAFreemium,
  guardarUsuario,
  hashPassword,
  leerUsuario,
  migrarUsuarioAPremium,
} from "@/lib/auth-server";
import {
  CARPETA_FREEMIUM,
  CARPETA_PREMIUM,
} from "@/lib/rutas-espacio";
import {
  eliminarUsuarioAdmin,
  guardarPreciosUsuario,
  listarUsuariosAdmin,
  obtenerIvaConfig,
  obtenerUsuarioAdmin,
  registrarLog,
  registrarPago,
  sincronizarUsuarios,
} from "@/lib/admin-db";
import { stripe } from "@/lib/stripe";
import {
  exigirAdminPanel,
  limitarAccionAdmin,
  obtenerAdminPanel,
  respuestaCsrfInvalida,
  verificarCsrfAdmin,
} from "@/lib/admin-panel-auth";
import { correoValido, nombreValido } from "@/lib/validacion";
import { enviarCorreoVerificacion } from "@/lib/email";
import { crearEnlaceVerificacion } from "@/lib/url-base";

const PLANES = new Set(["", "mensual", "semestral", "anual", "ilimitado"]);
const ROLES = new Set(["freemium", "premium"]);

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function numero(valor: unknown): number {
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
}

function fecha(valor: unknown): string | null {
  const textoFecha = texto(valor);
  if (!textoFecha) return null;
  const fechaObj = new Date(textoFecha);
  return Number.isNaN(fechaObj.getTime())
    ? null
    : fechaObj.toISOString();
}

export async function GET(request: Request) {
  const acceso = await exigirAdminPanel(request);

  if (acceso instanceof NextResponse) {
    return acceso;
  }

  await sincronizarUsuarios();
  const params = new URL(request.url).searchParams;
  const resultado = listarUsuariosAdmin({
    busqueda: params.get("busqueda") || "",
    tipo: params.get("tipo") || "",
    estado: params.get("estado") || "",
    plan: params.get("plan") || "",
    pagina: Number(params.get("pagina") || 1),
    porPagina: Number(params.get("porPagina") || 25),
  });

  return NextResponse.json(resultado);
}

export async function POST(request: Request) {
  const acceso = await exigirAdminPanel(request);

  if (acceso instanceof NextResponse) {
    return acceso;
  }

  if (!(await verificarCsrfAdmin(request))) {
    return respuestaCsrfInvalida();
  }

  if (!limitarAccionAdmin(request, "usuarios")) {
    return NextResponse.json(
      { error: "Demasiadas acciones. Espera un minuto." },
      { status: 429 },
    );
  }

  const cuerpo: unknown = await request.json().catch(() => null);

  if (!cuerpo || typeof cuerpo !== "object") {
    return NextResponse.json(
      { error: "Solicitud no válida." },
      { status: 400 },
    );
  }

  const datos = cuerpo as Record<string, unknown>;
  const modo = texto(datos.modo) === "crear" ? "crear" : "editar";
  const claveOriginal = texto(datos.claveOriginal);
  const nombre = texto(datos.nombre);
  const apellidos = texto(datos.apellidos);
  const correo = texto(datos.correo);
  const telefono = texto(datos.telefono);
  const rol = texto(datos.rol);
  const plan = texto(datos.plan);
  const password = texto(datos.password);
  const precioBase = numero(datos.precioBase);
  const iva = numero(datos.iva);
  const fechaPago = fecha(datos.fechaPago);
  const fechaCaducidad = fecha(datos.fechaCaducidad);
  const registrarPagoNuevo = datos.registrarPago === true;
  const marcarVerificado = datos.emailVerificado !== false;

  if (!ROLES.has(rol)) {
    return NextResponse.json(
      { error: "El rol no es válido." },
      { status: 400 },
    );
  }

  if (!PLANES.has(plan)) {
    return NextResponse.json(
      { error: "El plan no es válido." },
      { status: 400 },
    );
  }

  if (!nombreValido(nombre)) {
    return NextResponse.json(
      { error: "El nombre no es válido." },
      { status: 400 },
    );
  }

  if (apellidos && !nombreValido(apellidos)) {
    return NextResponse.json(
      { error: "Los apellidos no son válidos." },
      { status: 400 },
    );
  }

  if (!correoValido(correo)) {
    return NextResponse.json(
      { error: "El correo no es válido." },
      { status: 400 },
    );
  }

  if (rol === "premium" && (!plan || plan === "")) {
    return NextResponse.json(
      { error: "Selecciona un plan para el usuario Premium." },
      { status: 400 },
    );
  }

  const clave = modo === "crear" ? telefono : claveOriginal;

  if (!clave) {
    return NextResponse.json(
      { error: "Falta el identificador del usuario." },
      { status: 400 },
    );
  }

  try {
    if (modo === "crear") {
      if (await leerUsuario(clave)) {
        return NextResponse.json(
          { error: "Ya existe un usuario con ese teléfono." },
          { status: 409 },
        );
      }

      if (password.length < 8) {
        return NextResponse.json(
          { error: "La contraseña debe tener al menos 8 caracteres." },
          { status: 400 },
        );
      }

      const ahora = new Date();
      const tokenVerificacion = marcarVerificado
        ? undefined
        : randomUUID();
      const tokenVerificacionExpira = marcarVerificado
        ? undefined
        : Date.now() + 24 * 60 * 60 * 1000;

      await guardarUsuario({
        clave,
        telefono: clave,
        nombre,
        apellidos,
        correo,
        passwordHash: await hashPassword(password),
        rol: rol as "freemium" | "premium",
        emailVerificado: marcarVerificado,
        tokenVerificacion,
        tokenVerificacionExpira,
        fechaInicio:
          rol === "premium" ? fechaPago || ahora.toISOString() : undefined,
        fechaCaducidad:
          rol === "premium" && plan !== "ilimitado"
            ? fechaCaducidad || undefined
            : rol === "premium"
              ? "Sin límite"
              : undefined,
        planContratado: rol === "premium" ? plan : undefined,
      });

      if (!marcarVerificado && tokenVerificacion) {
        const enlace = crearEnlaceVerificacion(
          tokenVerificacion,
          new URL(request.url).origin,
        );

        console.log("[admin] Enviando verificación a usuario creado", {
          clave,
          correo,
          enlace,
        });

        try {
          await enviarCorreoVerificacion(correo, enlace);
        } catch (error) {
          console.error(
            "[admin] No se pudo enviar el correo de verificación",
            error,
          );
        }
      }
    } else {
      const usuario = await leerUsuario(clave);

      if (!usuario) {
        return NextResponse.json(
          { error: "Usuario no encontrado." },
          { status: 404 },
        );
      }

      if (rol === "premium" && usuario.rol !== "premium") {
        await migrarUsuarioAPremium(clave);
      } else if (rol === "freemium" && usuario.rol === "premium") {
        await degradarUsuarioAFreemium(clave);
      }

      const actualizado = await leerUsuario(clave);

      if (!actualizado) {
        return NextResponse.json(
          { error: "No se pudo actualizar el usuario." },
          { status: 500 },
        );
      }

      await actualizarUsuario({
        ...actualizado,
        nombre,
        apellidos,
        correo,
        rol: rol as "freemium" | "premium",
        planContratado: rol === "premium" ? plan : undefined,
        fechaInicio:
          rol === "premium" ? fechaPago || actualizado.fechaInicio : undefined,
        fechaCaducidad:
          rol === "premium"
            ? plan === "ilimitado"
              ? "Sin límite"
              : fechaCaducidad || actualizado.fechaCaducidad
            : undefined,
        ...(password.length >= 8
          ? { passwordHash: await hashPassword(password) }
          : {}),
      });
    }

    await sincronizarUsuarios();
    const adminUsuario = obtenerUsuarioAdmin(clave);

    if (adminUsuario && rol === "premium") {
      guardarPreciosUsuario(
        clave,
        precioBase,
        iva || Math.round(precioBase * (obtenerIvaConfig() / 100) * 100) / 100,
        fechaPago,
      );

      if (modo === "crear" || registrarPagoNuevo) {
        const actualizado = obtenerUsuarioAdmin(clave);
        if (actualizado) {
          registrarPago(
            actualizado,
            `Suscripción ${plan}`,
            "admin-panel",
          );
        }
      }
    }

    registrarLog(
      acceso.admin.clave,
      modo === "crear" ? "Crear usuario" : "Editar usuario",
      `${clave} · ${nombre} ${apellidos} · ${rol} ${plan}`.trim(),
      acceso.ip,
    );

    return NextResponse.json({ ok: true, usuario: obtenerUsuarioAdmin(clave) });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo guardar el usuario.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const acceso = await exigirAdminPanel(request);

  if (acceso instanceof NextResponse) {
    return acceso;
  }

  if (!(await verificarCsrfAdmin(request))) {
    return respuestaCsrfInvalida();
  }

  if (!limitarAccionAdmin(request, "usuarios-eliminar")) {
    return NextResponse.json(
      { error: "Demasiadas acciones. Espera un minuto." },
      { status: 429 },
    );
  }

  const clave = new URL(request.url).searchParams.get("clave")?.trim();

  if (!clave) {
    return NextResponse.json(
      { error: "Falta la clave del usuario." },
      { status: 400 },
    );
  }

  if (clave === (await obtenerAdminPanel())?.clave) {
    return NextResponse.json(
      { error: "No puedes eliminar al administrador actual." },
      { status: 400 },
    );
  }

  try {
    const usuario = await leerUsuario(clave);

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado." },
        { status: 404 },
      );
    }

    const carpetasUsuario = [
      path.join(CARPETA_PREMIUM, clave),
      path.join(CARPETA_FREEMIUM, clave),
    ];

    for (const carpeta of carpetasUsuario) {
      await rm(carpeta, {
        recursive: true,
        force: true,
      });
      console.log("[admin] Carpeta física eliminada", {
        clave,
        carpeta,
      });
    }

    eliminarUsuarioAdmin(clave);
    console.log("[admin] Registro y datos locales eliminados en SQLite", {
      clave,
    });

    await sincronizarUsuarios();

    let stripeCustomerEliminado = false;

    if (usuario.stripeCustomerId) {
      try {
        if (usuario.stripeSubscriptionId) {
          await stripe.subscriptions
            .cancel(usuario.stripeSubscriptionId)
            .catch((error) => {
              console.warn(
                "[admin] No se pudo cancelar la suscripción de Stripe",
                error,
              );
            });
        }

        await stripe.customers.del(usuario.stripeCustomerId);
        stripeCustomerEliminado = true;
        console.log("[admin] Cliente de Stripe eliminado", {
          clave,
          stripeCustomerId: usuario.stripeCustomerId,
        });
      } catch (error) {
        console.error(
          "[admin] No se pudo eliminar el cliente de Stripe",
          error,
        );
      }
    }

    registrarLog(
      acceso.admin.clave,
      "Eliminar usuario",
      `${clave} · ${usuario.nombre} ${usuario.apellidos || ""}`.trim(),
      acceso.ip,
    );

    return NextResponse.json({
      ok: true,
      carpetaEliminada: true,
      registroEliminado: true,
      stripeCustomerEliminado,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar el usuario.",
      },
      { status: 500 },
    );
  }
}
