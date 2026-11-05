import { timingSafeEqual } from "node:crypto";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import { CLAVE_ADMIN } from "@/lib/planes";

function secretoValido(recibido: string, esperado: string): boolean {
  const valorRecibido = Buffer.from(recibido, "utf8");
  const valorEsperado = Buffer.from(esperado, "utf8");

  return (
    valorRecibido.length === valorEsperado.length &&
    timingSafeEqual(valorRecibido, valorEsperado)
  );
}

export async function esPeticionAdmin(request: Request): Promise<boolean> {
  const secretoConfigurado = process.env.ADMIN_SECRET?.trim();
  const secretoRecibido =
    request.headers.get("x-admin-secret")?.trim() ||
    request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim() ||
    "";

  if (
    secretoConfigurado &&
    secretoRecibido &&
    secretoValido(secretoRecibido, secretoConfigurado)
  ) {
    return true;
  }

  const sesion = await obtenerUsuarioSesion();

  return (
    sesion?.rol === "premium" &&
    sesion.clave === CLAVE_ADMIN
  );
}
