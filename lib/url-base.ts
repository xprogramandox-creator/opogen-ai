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
    leerEntorno("NEXT_PUBLIC_APP_URL") ||
    leerEntorno("APP_URL") ||
    leerEntorno("NEXT_PUBLIC_BASE_URL");

  if (configurada) {
    const url = normalizar(configurada);

    // Una URL local en producción rompería todos los correos. Aunque la
    // variable esté mal configurada, nunca enviamos enlaces a localhost.
    if (process.env.NODE_ENV === "production" && esUrlLocal(url)) {
      console.error(
        "[url-base] NEXT_PUBLIC_APP_URL apunta a localhost en producción; se usa https://opogenai.com",
      );
      return "https://opogenai.com";
    }

    return url;
  }

  if (origenSolicitud && !esUrlLocal(origenSolicitud)) {
    return normalizar(origenSolicitud);
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  return "https://opogenai.com";
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
