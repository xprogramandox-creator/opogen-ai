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

function leerEntorno(nombre: string): string {
  // Acceso con corchetes para que Next/Turbopack no sustituya el valor
  // NEXT_PUBLIC_* por el valor que existiera durante el build.
  const entorno = process.env as Record<string, string | undefined>;
  return entorno[nombre]?.trim() || "";
}

const DOMINIO_PRODUCCION = "https://opogenai.com";

/**
 * URL pública usada en los enlaces de los correos.
 *
 * Prioridad:
 * 1. NEXT_PUBLIC_APP_URL
 * 2. APP_URL
 * 3. NEXT_PUBLIC_BASE_URL
 * 4. Origen real de la petición, si no es localhost
 * 5. Dominio de producción
 *
 * Nunca se devuelve localhost, ni siquiera en desarrollo.
 */
export function obtenerUrlBase(origenSolicitud?: string): string {
  const configurada =
    leerEntorno("NEXT_PUBLIC_APP_URL") ||
    leerEntorno("APP_URL") ||
    leerEntorno("NEXT_PUBLIC_BASE_URL");

  if (configurada) {
    const url = normalizar(configurada);

    if (esUrlLocal(url)) {
      console.error(
        "[url-base] La URL configurada apunta a localhost; se usa https://opogenai.com",
      );
      return DOMINIO_PRODUCCION;
    }

    return url;
  }

  if (origenSolicitud && !esUrlLocal(origenSolicitud)) {
    return normalizar(origenSolicitud);
  }

  return DOMINIO_PRODUCCION;
}

export function crearEnlaceVerificacion(
  token: string,
  origenSolicitud?: string,
): string {
  const url = new URL(
    "/api/auth/verificar",
    obtenerUrlBase(origenSolicitud),
  );
  url.searchParams.set("token", token);
  return url.toString();
}
