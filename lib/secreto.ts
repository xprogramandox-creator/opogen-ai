import { createHmac } from "node:crypto";

/**
 * Clave base para firmar cookies. En producción es obligatoria: si falta,
 * cualquier persona podría fabricar una sesión válida con el secreto por
 * defecto, que está publicado en el código.
 */
function claveBase(): string {
  const configurada = process.env.AUTH_SECRET?.trim();

  if (configurada) {
    return configurada;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET no está definido. Configura esta variable de entorno antes de desplegar.",
    );
  }

  // Solo para desarrollo local: valor fijo, nunca usado en producción.
  return "opoquiz-desarrollo-local-sin-valor-real";
}

/** Secreto para firmar la cookie de sesión. */
export function secretoSesion(): string {
  return claveBase();
}

/**
 * Secreto independiente para el límite de invitados. Se deriva del anterior
 * para que una cookie de límite no pueda reutilizarse como cookie de sesión.
 */
export function secretoLimiteInvitado(): string {
  return createHmac("sha256", claveBase())
    .update("opoquiz:limite-invitado:v1")
    .digest("hex");
}
