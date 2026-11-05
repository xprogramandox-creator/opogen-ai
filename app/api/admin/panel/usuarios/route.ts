import { NextResponse } from "next/server";
import { rm } from "node:fs/promises";
import path from "node:path";
import {
  actualizarUsuario,
  degradarUsuarioAFreemium,
  guardarUsuario,
  hashPassword,
  leerUsuario,
  migrarUsuarioAPremium,
  rutaArchivoUsuario,
} from "@/lib/auth-server";
import {
  guardarPreciosUsuario,
  listarUsuariosAdmin,
  obtenerIvaConfig,
  obtenerUsuarioAdmin,
  registrarLog,
  registrarPago,
  sincronizarUsuarios,
} from "@/lib/admin-db";
import {
  exigirAdminPanel,
  limitarAccionAdmin,
  obtenerAdminPanel,
  respuestaCsrfInvalida,
  verificarCsrfAdmin,
} from "@/lib/admin-panel-auth";
import { correoValido, nombreValido } from "@/lib/validacion";

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
      await guardarUsuario({
        clave,
        telefono: clave,
        nombre,
        apellidos,
        correo,
        passwordHash: await hashPassword(password),
        rol: rol as "freemium" | "premium",
        emailVerificado: true,
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

    await rm(path.dirname(rutaArchivoUsuario(clave)), {
      recursive: true,
      force: true,
    });
    await sincronizarUsuarios();
    registrarLog(
      acceso.admin.clave,
      "Eliminar usuario",
      `${clave} · ${usuario.nombre} ${usuario.apellidos || ""}`.trim(),
      acceso.ip,
    );

    return NextResponse.json({ ok: true });
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
