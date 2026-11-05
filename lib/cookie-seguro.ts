import { headers } from "next/headers";

/**
 * Indica si la petición actual llega por HTTPS.
 *
 * Solo en ese caso se marca la cookie como `Secure`: si se marca siempre, al
 * abrir la app por HTTP en la red local (móvil -> 192.168.x.x) el navegador
 * descarta la cookie y el inicio de sesión no se mantiene.
 */
export async function peticionEsHttps(): Promise<boolean> {
  try {
    const cabeceras = await headers();
    const protocolo = cabeceras
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim()
      .toLowerCase();

    return protocolo === "https";
  } catch {
    return false;
  }
}
