import { NextResponse } from "next/server";
import { enviarCorreoContacto } from "@/lib/email";
import { correoValido } from "@/lib/validacion";
import { obtenerIpCliente } from "@/lib/ip";
import { consumirLimite } from "@/lib/rate-limit";

function respuestaError(
  mensaje: string,
  estado: number,
  codigo: string,
) {
  return NextResponse.json({ error: mensaje, codigo }, { status: estado });
}

export async function POST(request: Request) {
  const ip = obtenerIpCliente(request);
  const limite = consumirLimite(`contacto:${ip}`, 5, 60_000);

  if (!limite.permitido) {
    return respuestaError(
      "Demasiados envíos. Espera un minuto.",
      429,
      "DEMASIADAS_PETICIONES",
    );
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
  const nombre =
    typeof datos.nombre === "string" ? datos.nombre.trim() : "";
  const correo =
    typeof datos.correo === "string" ? datos.correo.trim() : "";
  const mensaje =
    typeof datos.mensaje === "string" ? datos.mensaje.trim() : "";

  if (!nombre || nombre.length > 120) {
    return respuestaError(
      "Indica un nombre válido.",
      400,
      "DATOS_INVALIDOS",
    );
  }

  if (!correoValido(correo)) {
    return respuestaError(
      "El correo electrónico no es válido.",
      400,
      "CORREO_INVALIDO",
    );
  }

  if (!mensaje || mensaje.length > 5_000) {
    return respuestaError(
      "El mensaje debe tener entre 1 y 5000 caracteres.",
      400,
      "MENSAJE_LARGO",
    );
  }

  const resultado = await enviarCorreoContacto({
    nombre,
    correo,
    asunto: "Nuevo mensaje desde la web",
    mensaje,
  });

  if (!resultado.enviado) {
    return respuestaError(
      "No se pudo enviar el mensaje. Inténtalo de nuevo.",
      502,
      "ENVIO_FALLIDO",
    );
  }

  return NextResponse.json({ ok: true });
}
