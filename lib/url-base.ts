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

/**
 * URL pública usada en los enlaces de los correos.
 *
 * Prioridad:
 * 1. NEXT_PUBLIC_APP_URL
 * 2. APP_URL
 * 3. NEXT_PUBLIC_BASE_URL
 * 4. Origen real de la petición, si no es localhost
 * 5. localhost en desarrollo
 * 6. Dominio de producción
 */
export function obtenerUrlBase(origenSolicitud?: string): string {
  const configurada =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim();

  if (configurada) {
    return normalizar(configurada);
  }

  if (origenSolicitud && !esUrlLocal(origenSolicitud)) {
    return normalizar(origenSolicitud);
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  return "https://opogenai.com";
}
