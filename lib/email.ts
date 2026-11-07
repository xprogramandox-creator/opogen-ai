type ResultadoEnvio = {
  enviado: boolean;
  motivo?: string;
};

/**
 * Remitente obligatorio para verificación, recuperación y contacto.
 * Debe configurarse en EMAIL_FROM con un dominio verificado en Resend.
 */
function obtenerRemitente(): string | null {
  const remitente = process.env.EMAIL_FROM?.trim();

  if (!remitente) {
    console.error(
      "[email] Falta EMAIL_FROM. Configura un remitente verificado en Resend.",
    );
    return null;
  }

  return remitente;
}

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function obtenerUrlBaseEnlace(enlace: string): string {
  try {
    return new URL(enlace).origin;
  } catch {
    return "(URL no válida)";
  }
}

/**
 * Envía el enlace de restablecimiento con Resend (API HTTP, sin dependencias).
 *
 * Variables necesarias:
 * - RESEND_API_KEY
 * - EMAIL_FROM (obligatoria; remitente verificado)
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

  if (!remitente) {
    return { enviado: false, motivo: "EMAIL_FROM no configurada" };
  }

  const enlaceSeguro = escaparHtml(enlace);

  console.log("[email] Enviando restablecimiento", {
    from: remitente,
    to: [destino],
    subject: "Restablece tu contraseña de OpoGen AI",
    urlBase: obtenerUrlBaseEnlace(enlace),
  });

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

  if (!remitente) {
    return { enviado: false, motivo: "EMAIL_FROM no configurada" };
  }

  const enlaceSeguro = escaparHtml(enlace);

  console.log("[email] Enviando verificación de cuenta", {
    from: remitente,
    to: [destino],
    subject: "Verifica tu cuenta en OpoGen AI",
    urlBase: obtenerUrlBaseEnlace(enlace),
  });

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

  if (!remitente) {
    return { enviado: false, motivo: "EMAIL_FROM no configurada" };
  }

  const nombreSeguro = escaparHtml(datos.nombre);
  const correoSeguro = escaparHtml(datos.correo);
  const asuntoSeguro = escaparHtml(datos.asunto);
  const mensajeSeguro = escaparHtml(datos.mensaje);
  const destinatario = "soporte@opogenai.com";

  console.log("[email] Enviando mensaje de contacto", {
    from: remitente,
    to: [destinatario],
    replyTo: datos.correo,
    subject: `[Contacto OpoGen] ${datos.asunto}`,
  });

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