import { NextResponse } from "next/server";
import { enviarCorreoContacto } from "@/lib/email";
import { correoValido } from "@/lib/validacion";

function respuestaError(mensaje: string, estado: number) {
  return NextResponse.json({ error: mensaje }, { status: estado });
}

export async function POST(request: Request) {
  const cuerpo: unknown = await request.json().catch(() => null);

  if (!cuerpo || typeof cuerpo !== "object") {
    return respuestaError("Solicitud no válida.", 400);
  }

  const datos = cuerpo as Record<string, unknown>;
  const nombre =
    typeof datos.nombre === "string" ? datos.nombre.trim() : "";
  const correo =
    typeof datos.correo === "string" ? datos.correo.trim() : "";
  const asunto =
    typeof datos.asunto === "string" ? datos.asunto.trim() : "";
  const mensaje =
    typeof datos.mensaje === "string" ? datos.mensaje.trim() : "";

  if (!nombre || nombre.length > 120) {
    return respuestaError("Indica un nombre válido.", 400);
  }

  if (!correoValido(correo)) {
    return respuestaError(
      "El correo electrónico no es válido.",
      400,
    );
  }

  if (!asunto || asunto.length > 160) {
    return respuestaError("Indica un asunto válido.", 400);
  }

  if (!mensaje || mensaje.length > 5_000) {
    return respuestaError(
      "El mensaje debe tener entre 1 y 5000 caracteres.",
      400,
    );
  }

  const resultado = await enviarCorreoContacto({
    nombre,
    correo,
    asunto,
    mensaje,
  });

  if (!resultado.enviado) {
    return respuestaError(
      "No se pudo enviar el mensaje. Inténtalo de nuevo.",
      502,
    );
  }

  return NextResponse.json({
    ok: true,
    mensaje: "Mensaje enviado correctamente.",
  });
}
