type ResultadoEnvio = {
  enviado: boolean;
  motivo?: string;
};

const REMITENTE_POR_DEFECTO =
  "OpoGen AI <notificaciones@notificaciones.security-privacy-mask-meta.site>";

/**
 * Remitente común para verificación, recuperación y contacto.
 * EMAIL_FROM puede sobrescribirlo, pero el valor por defecto ya usa
 * el dominio verificado de OpoGen AI.
 */
function obtenerRemitente(): string {
  return process.env.EMAIL_FROM?.trim() || REMITENTE_POR_DEFECTO;
}

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Envía el enlace de restablecimiento con Resend (API HTTP, sin dependencias).
 *
 * Variables necesarias:
 * - RESEND_API_KEY
 * - EMAIL_FROM (opcional; por defecto el dominio verificado de OpoGen AI)
 */
export async function enviarCorreoRestablecimiento(
  destino: string,
  enlace: string,
): Promise<ResultadoEnvio> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const remitente = obtenerRemitente();

  if (!apiKey) {
    return { enviado: false, motivo: "RESEND_API_KEY no configurada" };
  }

  const enlaceSeguro = escaparHtml(enlace);

  try {
    const respuesta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: remitente,
        to: [destino],
        subject: "Restablece tu contraseña de OpoGen AI",
        text: `Recibimos una solicitud para restablecer tu contraseña.\n\nAbre este enlace (caduca en 30 minutos):\n${enlace}\n\nSi no has sido tú, ignora este correo.`,
        html: `<p>Recibimos una solicitud para restablecer tu contraseña de <strong>OpoGen AI</strong>.</p>
<p><a href="${enlaceSeguro}">Restablecer mi contraseña</a></p>
<p>El enlace caduca en 30 minutos. Si no has sido tú, ignora este correo.</p>`,
      }),
    });

    if (!respuesta.ok) {
      const errorData = await respuesta.json();
      console.error("ERROR DE RESEND (Restablecimiento):", errorData);
      return {
        enviado: false,
        motivo: `Resend respondió con ${respuesta.status}`,
      };
    }

    return { enviado: true };
  } catch (error) {
    console.error("ERROR DE CONEXIÓN (Restablecimiento):", error);
    return { enviado: false, motivo: "No se pudo conectar con Resend" };
  }
}

export async function enviarCorreoVerificacion(
  destino: string,
  enlace: string,
): Promise<ResultadoEnvio> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const remitente = obtenerRemitente();

  if (!apiKey) {
    return { enviado: false, motivo: "RESEND_API_KEY no configurada" };
  }

  const enlaceSeguro = escaparHtml(enlace);

  try {
    const respuesta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: remitente,
        to: [destino],
        subject: "Verifica tu cuenta en OpoGen AI",
        text: `Gracias por registrarte en OpoGen AI.\n\nPara verificar tu cuenta, abre este enlace:\n${enlace}\n\nSi no has sido tú, ignora este correo.`,
        html: `<p>Gracias por registrarte en <strong>OpoGen AI</strong>.</p>
<p>Para activar tu cuenta, haz clic en el siguiente enlace:</p>
<p><a href="${enlaceSeguro}">Verificar mi cuenta</a></p>
<p>Si no has sido tú, ignora este correo.</p>`,
      }),
    });

    if (!respuesta.ok) {
      const errorData = await respuesta.json();
      console.error("ERROR DE RESEND (Verificación):", errorData);
      return {
        enviado: false,
        motivo: `Resend respondió con ${respuesta.status}`,
      };
    }

    return { enviado: true };
  } catch (error) {
    console.error("ERROR DE CONEXIÓN (Verificación):", error);
    return { enviado: false, motivo: "No se pudo conectar con Resend" };
  }
}

export async function enviarCorreoContacto(datos: {
  nombre: string;
  correo: string;
  asunto: string;
  mensaje: string;
}): Promise<ResultadoEnvio> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const remitente = obtenerRemitente();

  if (!apiKey) {
    return { enviado: false, motivo: "RESEND_API_KEY no configurada" };
  }

  const nombreSeguro = escaparHtml(datos.nombre);
  const correoSeguro = escaparHtml(datos.correo);
  const asuntoSeguro = escaparHtml(datos.asunto);
  const mensajeSeguro = escaparHtml(datos.mensaje);
  const destinatario =
    process.env.CONTACT_EMAIL?.trim() || "soporte@opogenai.com";

  try {
    const respuesta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: remitente,
        to: [destinatario],
        reply_to: datos.correo,
        subject: `[Contacto OpoGen] ${datos.asunto}`,
        text: `Nuevo mensaje de contacto de OpoGen AI.\n\nNombre: ${datos.nombre}\nCorreo: ${datos.correo}\nAsunto: ${datos.asunto}\n\nMensaje:\n${datos.mensaje}`,
        html: `<h2>Nuevo mensaje de contacto</h2>
<p><strong>Nombre:</strong> ${nombreSeguro}</p>
<p><strong>Correo:</strong> ${correoSeguro}</p>
<p><strong>Asunto:</strong> ${asuntoSeguro}</p>
<hr />
<p style="white-space: pre-wrap;">${mensajeSeguro}</p>`,
      }),
    });

    if (!respuesta.ok) {
      const errorData = await respuesta.json();
      console.error("ERROR DE RESEND (Contacto):", errorData);
      return {
        enviado: false,
        motivo: `Resend respondió con ${respuesta.status}`,
      };
    }

    return { enviado: true };
  } catch (error) {
    console.error("ERROR DE CONEXIÓN (Contacto):", error);
    return { enviado: false, motivo: "No se pudo conectar con Resend" };
  }
}