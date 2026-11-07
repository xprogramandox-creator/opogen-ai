import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import {
  listarUsuarios,
  serializarDatos,
} from "@/lib/auth-server";
import {
  obtenerPendientePorCorreo,
  eliminarRegistroPendiente,
  guardarRegistroPendiente,
} from "@/lib/admin-db";
import {
  obtenerTokenCSRFDesdeCookie,
  respuestaErrorCSRF,
  verificarTokenCSRF,
} from "@/lib/csrf";
import { enviarCorreoVerificacion } from "@/lib/email";
import { consumirLimite } from "@/lib/rate-limit";
import { crearEnlaceVerificacion } from "@/lib/url-base";
import { correoValido } from "@/lib/validacion";

const MAX_REENVIOS = 3;
const VENTANA_REENVIOS_MS = 60 * 60 * 1000;
const DURACION_TOKEN_MS = 24 * 60 * 60 * 1000;

function respuestaError(
  mensaje: string,
  estado: number,
  codigo: string,
  extra: Record<string, unknown> = {},
) {
  return NextResponse.json(
    { error: mensaje, codigo, ...extra },
    { status: estado },
  );
}

export async function POST(request: Request) {
  const tokenCookie = await obtenerTokenCSRFDesdeCookie();

  if (!verificarTokenCSRF(request, tokenCookie)) {
    return respuestaErrorCSRF();
  }

  const cuerpo: unknown = await request.json().catch(() => null);

  if (!cuerpo || typeof cuerpo !== "object") {
    return respuestaError(
      "Solicitud no válida.",
      400,
      "DATOS_INVALIDOS",
    );
  }

  const datos = cuerpo as Record<string, unknown>;
  const correo =
    typeof datos.correo === "string"
      ? datos.correo.trim().toLowerCase()
      : "";

  if (!correoValido(correo)) {
    return respuestaError(
      "El correo electrónico no es válido.",
      400,
      "CORREO_INVALIDO",
    );
  }

  const limite = consumirLimite(
    `reenviar-verificacion:${correo}`,
    MAX_REENVIOS,
    VENTANA_REENVIOS_MS,
  );

  if (!limite.permitido) {
    return respuestaError(
      "Has solicitado demasiados reenvíos. Inténtalo de nuevo más tarde.",
      429,
      "LIMITE_REENVIOS",
      {
        reintentarEnSegundos: limite.reintentarEnSegundos,
      },
    );
  }

  let usuarios;

  try {
    usuarios = await listarUsuarios();
  } catch (error) {
    console.error(
      "[reenviar-verificacion] No se pudieron listar los usuarios",
      error,
    );
    return respuestaError(
      "No se pudo comprobar la cuenta.",
      500,
      "ERROR_INTERNO",
    );
  }

  const existente = usuarios.find(
    ({ usuario }) =>
      usuario.correo.trim().toLowerCase() === correo,
  );

  let token: string;
  let expira: number;

  if (existente) {
    if (existente.usuario.emailVerificado === true) {
      return respuestaError(
        "Esta cuenta ya está verificada.",
        409,
        "YA_VERIFICADO",
      );
    }

    token = randomUUID();
    expira = Date.now() + DURACION_TOKEN_MS;

    const actualizado = {
      ...existente.usuario,
      emailVerificado: false,
      tokenVerificacion: token,
      tokenVerificacionExpira: expira,
    };

    await writeFile(
      existente.rutaArchivo,
      serializarDatos(actualizado),
      { encoding: "utf8" },
    );
  } else {
    const pendiente = obtenerPendientePorCorreo(correo);

    if (!pendiente) {
      return respuestaError(
        "No encontramos ninguna cuenta pendiente con ese correo.",
        404,
        "NO_ENCONTRADO",
      );
    }

    if (pendiente.usuario.emailVerificado === true) {
      return respuestaError(
        "Esta cuenta ya está verificada.",
        409,
        "YA_VERIFICADO",
      );
    }

    token = randomUUID();
    expira = Date.now() + DURACION_TOKEN_MS;

    const actualizado = {
      ...pendiente.usuario,
      emailVerificado: false,
      tokenVerificacion: token,
      tokenVerificacionExpira: expira,
    };

    eliminarRegistroPendiente(pendiente.token);
    guardarRegistroPendiente(actualizado, token, expira);
  }

  const enlace = crearEnlaceVerificacion(
    token,
    new URL(request.url).origin,
  );

  const resultado = await enviarCorreoVerificacion(correo, enlace);

  if (!resultado.enviado) {
    console.error(
      "[reenviar-verificacion] No se pudo enviar el correo",
      resultado.motivo,
    );
    return respuestaError(
      "No se pudo enviar el correo de verificación.",
      502,
      "ENVIO_FALLIDO",
    );
  }

  console.log("[reenviar-verificacion] Correo reenviado", {
    correo,
    enlace,
    origenPendiente: Boolean(existente),
  });

  return NextResponse.json({
    ok: true,
    mensaje: "Te hemos enviado un nuevo enlace de verificación.",
  });
}
