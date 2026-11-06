import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  esClaveUsuarioValida,
  hashPassword,
  leerUsuario,
  UsuarioRegistrado,
} from "@/lib/auth-server";
import {
  existePendientePorClaveOCorreo,
  guardarRegistroPendiente,
} from "@/lib/admin-db";
import {
  buscarPais,
  construirClaveTelefono,
  normalizarCodigoPais,
  normalizarNumeroTelefono,
} from "@/lib/telefono";
import { sanearTexto } from "@/lib/saneamiento";
import { obtenerIpCliente } from "@/lib/ip";
import { consumirLimite } from "@/lib/rate-limit";
import { ratelimitRegistro } from "@/lib/ratelimit";
import { obtenerTokenCSRFDesdeCookie, respuestaErrorCSRF, verificarTokenCSRF } from "@/lib/csrf";
import {
  correoValido,
  inferirTipoDocumento,
  validarDocumento,
  nombreValido,
  passwordValida,
} from "@/lib/validacion";
import { enviarCorreoVerificacion } from "@/lib/email";
import { obtenerUrlBase } from "@/lib/url-base";
import { codigoError, mensajeError } from "@/lib/errores";

const MAX_REGISTROS_POR_IP = 7;
const VENTANA_REGISTROS_MS = 60 * 60 * 1000;

const MESES_DURACION = {
  mensual: 1,
  semestral: 6,
  anual: 12,
} as const;

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

function respuestaError(mensaje: string, estado: number) {
  return NextResponse.json({ error: mensaje }, { status: estado });
}

export async function POST(request: Request) {
  const tokenCookie = await obtenerTokenCSRFDesdeCookie();
  if (!verificarTokenCSRF(request, tokenCookie)) {
    return respuestaErrorCSRF();
  }

  let cuerpo: unknown;

  try {
    cuerpo = await request.json();
  } catch {
    return respuestaError("Solicitud no válida.", 400);
  }

  if (typeof cuerpo !== "object" || cuerpo === null) {
    return respuestaError("Solicitud no válida.", 400);
  }

  const datos = cuerpo as Record<string, unknown>;
  const ip = obtenerIpCliente(request);

  const { success, reset } = await ratelimitRegistro.limit(`registro:${ip}`);
  if (!success) {
    const retryAfterSegundos = reset
      ? Math.max(1, Math.ceil((reset - Date.now()) / 1000))
      : 3600;
    return NextResponse.json(
      {
        error:
          "Demasiados intentos. Espera unos minutos antes de volver a probar.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSegundos),
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const limite = consumirLimite(
    `registro:${ip}`,
    MAX_REGISTROS_POR_IP,
    VENTANA_REGISTROS_MS,
  );

  if (!limite.permitido) {
    return NextResponse.json(
      {
        error:
          "Demasiados intentos. Espera unos minutos antes de volver a probar.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(limite.reintentarEnSegundos),
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const nombre =
    typeof datos.nombre === "string" ? sanearTexto(datos.nombre) : "";
  const apellidos =
    typeof datos.apellidos === "string"
      ? sanearTexto(datos.apellidos)
      : "";
  const codigoBruto =
    typeof datos.codigo === "string" ? datos.codigo.trim() : "";
  const numeroBruto =
    typeof datos.numero === "string" ? datos.numero.trim() : "";
  const correo =
    typeof datos.correo === "string" ? sanearTexto(datos.correo) : "";
  const password =
    typeof datos.password === "string" ? datos.password : "";
  const plan = datos.plan === "premium" ? "premium" : "freemium";
  const duracion =
    datos.duracion === "mensual" ||
    datos.duracion === "semestral" ||
    datos.duracion === "anual"
      ? datos.duracion
      : "";
  const dni =
    typeof datos.dni === "string"
      ? sanearTexto(datos.dni).toUpperCase()
      : "";
  const direccion =
    typeof datos.direccion === "string"
      ? sanearTexto(datos.direccion)
      : "";
  const ciudad =
    typeof datos.ciudad === "string" ? sanearTexto(datos.ciudad) : "";
  const provincia =
    typeof datos.provincia === "string"
      ? sanearTexto(datos.provincia)
      : "";
  const paisFacturacion =
    typeof datos.pais === "string" ? sanearTexto(datos.pais) : "";
  const codigoPostal =
    typeof datos.codigoPostal === "string"
      ? datos.codigoPostal.trim()
      : "";

  if (plan === "premium" && !duracion) {
    return respuestaError("Selecciona la duración del plan.", 400);
  }

  if (!validarDocumento(dni, paisFacturacion)) {
    return respuestaError(
      "El documento de identidad no es válido para el país seleccionado.",
      400,
    );
  }

  if (
    direccion.length < 3 ||
    ciudad.length < 2 ||
    provincia.length < 2 ||
    paisFacturacion.length < 2
  ) {
    return respuestaError(
      "Completa todos los datos de la dirección.",
      400,
    );
  }

  if (!/^[A-Za-z0-9 -]{3,10}$/.test(codigoPostal)) {
    return respuestaError("El código postal no es válido.", 400);
  }

  if (!nombreValido(nombre)) {
    return respuestaError(
      "El nombre solo puede contener letras y espacios.",
      400,
    );
  }

  if (!nombreValido(apellidos)) {
    return respuestaError(
      "Los apellidos solo pueden contener letras y espacios.",
      400,
    );
  }

  if (!/^\d{1,4}$/.test(codigoBruto)) {
    return respuestaError(
      "El código de país solo puede contener números.",
      400,
    );
  }

  if (!/^\d{4,15}$/.test(numeroBruto)) {
    return respuestaError(
      "El número de teléfono solo puede contener números.",
      400,
    );
  }

  const codigo = normalizarCodigoPais(codigoBruto);
  const numero = normalizarNumeroTelefono(numeroBruto);

  if (!buscarPais(codigo)) {
    return respuestaError("El código de país no es válido.", 400);
  }

  if (!correoValido(correo)) {
    return respuestaError(
      "El correo electrónico no es válido.",
      400,
    );
  }

  if (!passwordValida(password)) {
    return respuestaError(
      "La contraseña debe tener una mayúscula, una minúscula, un número y un carácter especial.",
      400,
    );
  }

  const clave = construirClaveTelefono(codigo, numero);

  if (!esClaveUsuarioValida(clave)) {
    return respuestaError("El teléfono no es válido.", 400);
  }

  try {
    if (await leerUsuario(clave)) {
      return respuestaError(
        "Ya existe una cuenta con este teléfono.",
        409,
      );
    }

    if (existePendientePorClaveOCorreo(clave, correo)) {
      return respuestaError(
        "Ya existe un registro pendiente con estos datos. Revisa tu correo o espera a que caduque.",
        409,
      );
    }

    const tokenVerificacion = randomUUID();
    const tokenVerificacionExpira = Date.now() + 24 * 60 * 60 * 1000;

    const fechaInicio = new Date();
    const fechaCaducidad =
      plan === "premium" && duracion
        ? sumarMeses(fechaInicio, MESES_DURACION[duracion])
        : null;

    const usuario: UsuarioRegistrado = {
      nombre,
      apellidos,
      telefono: clave,
      passwordHash: await hashPassword(password),
      correo,
      clave,
      // Todo registro nace como Freemium. Premium solo se activa cuando
      // el webhook de Stripe confirma el pago.
      rol: "freemium",
      emailVerificado: false,
      tokenVerificacion,
      tokenVerificacionExpira,
      nombreCompleto: `${nombre} ${apellidos}`.trim(),
      documentoIdentidad: dni || undefined,
      tipoDocumento: dni
        ? inferirTipoDocumento(dni, paisFacturacion)
        : undefined,
      dni,
      direccion,
      ciudad,
      provincia,
      pais: paisFacturacion,
      codigoPostal,
      ...(plan === "premium"
        ? {
            planContratado: duracion,
            fechaInicio: fechaInicio.toISOString(),
            fechaCaducidad: fechaCaducidad?.toISOString(),
          }
        : {}),
    };

    // La cuenta real no se crea hasta verificar el correo o completar el pago.
    guardarRegistroPendiente(
      usuario,
      tokenVerificacion,
      tokenVerificacionExpira,
    );

    const baseUrl = obtenerUrlBase(new URL(request.url).origin);
    const enlace = `${baseUrl}/api/auth/verificar?token=${tokenVerificacion}`;

    try {
      await enviarCorreoVerificacion(correo, enlace);
    } catch {
      // No revelamos errores de envío por seguridad
    }

    return NextResponse.json(
      {
        ok: true,
        nombre: usuario.nombre,
        mensaje: "Por favor, revisa tu correo para verificar tu cuenta",
        ...(plan === "premium"
          ? {
              userId: usuario.clave,
              checkoutPlan: duracion,
              checkoutToken: tokenVerificacion,
            }
          : {}),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[registro] No se pudo preparar el registro:", error);

    const codigo = codigoError(error);
    const detalle = mensajeError(error);

    return respuestaError(
      `No se pudo crear la cuenta: ${
        codigo ? `${codigo} · ` : ""
      }${detalle}`,
      500,
    );
  }
}
