import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  actualizarPlanContratado,
  buscarUsuarioPorCorreo,
  esClaveUsuarioValida,
  leerUsuario,
  migrarUsuarioAPremium,
  obtenerUsuarioSesion,
} from "@/lib/auth-server";
import { construirClaveTelefono } from "@/lib/telefono";
import { CLAVE_ADMIN } from "@/lib/planes";

const DURACION_PLAN_ANUAL_MESES = 12;

function secretoValido(recibido: string, esperado: string): boolean {
  const valorRecibido = Buffer.from(recibido, "utf8");
  const valorEsperado = Buffer.from(esperado, "utf8");

  return (
    valorRecibido.length === valorEsperado.length &&
    timingSafeEqual(valorRecibido, valorEsperado)
  );
}

function sumarMeses(fecha: Date, meses: number): Date {
  const resultado = new Date(fecha);
  const dia = resultado.getDate();

  resultado.setDate(1);
  resultado.setMonth(resultado.getMonth() + meses);

  const ultimoDia = new Date(
    resultado.getFullYear(),
    resultado.getMonth() + 1,
    0,
  ).getDate();

  resultado.setDate(Math.min(dia, ultimoDia));
  return resultado;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    mensaje: "Ruta de admin funcionando",
  });
}

export async function POST(request: Request) {
  const secretoConfigurado = process.env.ADMIN_SECRET?.trim();

  const secretoRecibido =
    request.headers.get("x-admin-secret")?.trim() ||
    request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim() ||
    "";

  const autorizadoPorSecreto = Boolean(
    secretoConfigurado &&
      secretoValido(secretoRecibido, secretoConfigurado),
  );

  // El botón del Dashboard no expone ADMIN_SECRET al navegador: se autoriza
  // únicamente la sesión del administrador.
  let autorizadoPorSesion = false;

  if (!autorizadoPorSecreto) {
    const sesion = await obtenerUsuarioSesion();
    autorizadoPorSesion =
      sesion?.rol === "premium" &&
      sesion.clave === CLAVE_ADMIN;
  }

  if (!autorizadoPorSecreto && !autorizadoPorSesion) {
    if (!secretoConfigurado) {
      return NextResponse.json(
        { error: "Administración no configurada." },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401 },
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
  const telefono =
    typeof datos.telefono === "string" ? datos.telefono.trim() : "";
  const codigo =
    typeof datos.codigo === "string" ? datos.codigo.trim() : "";
  const numero =
    typeof datos.numero === "string" ? datos.numero.trim() : "";
  const correo =
    typeof datos.correo === "string" ? datos.correo.trim() : "";

  let claveTelefono = "";

  if (telefono.includes("_")) {
    claveTelefono = telefono;
  } else if (codigo && numero) {
    claveTelefono = construirClaveTelefono(codigo, numero);
  } else if (/^\d{5,20}$/.test(telefono)) {
    claveTelefono = telefono;
  }

  if (!claveTelefono && !correo) {
    return NextResponse.json(
      {
        error:
          "Indica un teléfono (con formato 34_600000000) o un correo.",
      },
      { status: 400 },
    );
  }

  let usuario =
    claveTelefono && esClaveUsuarioValida(claveTelefono)
      ? await leerUsuario(claveTelefono)
      : null;

  if (!usuario && correo) {
    const encontrado = await buscarUsuarioPorCorreo(correo);
    usuario = encontrado?.usuario ?? null;
  }

  if (!usuario) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404 },
    );
  }

  try {
    await migrarUsuarioAPremium(usuario.clave);

    const fechaInicio = new Date();
    const fechaCaducidad = sumarMeses(
      fechaInicio,
      DURACION_PLAN_ANUAL_MESES,
    );

    await actualizarPlanContratado(
      usuario.clave,
      "anual",
      fechaCaducidad.toISOString(),
      fechaInicio.toISOString(),
    );

    return NextResponse.json(
      {
        ok: true,
        mensaje:
          usuario.clave === CLAVE_ADMIN
            ? "Administrador configurado como Premium ilimitado correctamente"
            : "Usuario ascendido a Premium Anual correctamente",
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error("[Admin hacer-premium]", error);

    return NextResponse.json(
      { error: "No se pudo actualizar el usuario." },
      { status: 500 },
    );
  }
}
