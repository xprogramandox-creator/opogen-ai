import { networkInterfaces } from "node:os";

function normalizar(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function esUrlLocal(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1"
    );
  } catch {
    return false;
  }
}

function ipDeRedLocal(): string | null {
  const interfaces = networkInterfaces();
  const candidatas: string[] = [];

  for (const entradas of Object.values(interfaces)) {
    for (const entrada of entradas ?? []) {
      if (
        entrada.family === "IPv4" &&
        !entrada.internal &&
        !entrada.address.startsWith("169.254.")
      ) {
        candidatas.push(entrada.address);
      }
    }
  }

  return (
    candidatas.find((ip) => ip.startsWith("192.168.")) ??
    candidatas.find((ip) => ip.startsWith("10.")) ??
    candidatas.find((ip) => /^172\.(1[6-9]|2\d|3[01])\./.test(ip)) ??
    candidatas[0] ??
    null
  );
}

/**
 * URL pública usada en los enlaces de los correos.
 *
 * Prioridad:
 * 1. APP_URL
 * 2. NEXT_PUBLIC_BASE_URL
 * 3. Origen real de la petición, si no es localhost
 * 4. IP de la red local en desarrollo
 * 5. Dominio de producción
 */
export function obtenerUrlBase(origenSolicitud?: string): string {
  const configurada =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim();

  if (configurada && !esUrlLocal(configurada)) {
    return normalizar(configurada);
  }

  if (origenSolicitud && !esUrlLocal(origenSolicitud)) {
    return normalizar(origenSolicitud);
  }

  if (configurada) {
    return normalizar(configurada);
  }

  if (process.env.NODE_ENV === "development") {
    const ip = ipDeRedLocal();
    return `http://${ip ?? "192.168.1.137"}:3000`;
  }

  return "https://opogenai.com";
}
