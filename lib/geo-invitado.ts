/**
 * Geolocalización ligera de invitados para el panel de administración.
 *
 * Prioriza las cabeceras de plataforma (Vercel/Cloudflare). Si no vienen,
 * consulta ipapi.co con un timeout corto y cachea el resultado por IP para no
 * castigar la API en cada evento.
 */

export type UbicacionInvitado = {
  pais: string;
  ciudad: string;
};

const TTL_OK_MS = 24 * 60 * 60 * 1000;
const TTL_ERROR_MS = 30 * 60 * 1000;
const MAX_ENTRADAS = 500;
const TIMEOUT_MS = 2_500;

type Entrada = {
  valor: UbicacionInvitado;
  expira: number;
};

const cache = new Map<string, Entrada>();

function leerCabecera(request: Request, nombres: string[]): string {
  for (const nombre of nombres) {
    const valor = request.headers.get(nombre)?.trim();

    if (valor) {
      return valor;
    }
  }

  return "";
}

function decodificar(valor: string): string {
  try {
    return decodeURIComponent(valor);
  } catch {
    return valor;
  }
}

function normalizar(valor: string): string {
  return valor.replace(/\s+/g, " ").trim().slice(0, 80);
}

function esIpPublica(ip: string): boolean {
  if (!ip || ip === "local" || ip === "127.0.0.1" || ip === "::1") {
    return false;
  }

  if (
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("169.254.") ||
    ip.startsWith("fc") ||
    ip.startsWith("fd") ||
    ip.startsWith("fe80")
  ) {
    return false;
  }

  if (ip.startsWith("172.")) {
    const segundo = Number(ip.split(".")[1]);

    if (segundo >= 16 && segundo <= 31) {
      return false;
    }
  }

  return true;
}

function guardar(ip: string, valor: UbicacionInvitado, ttl: number): void {
  if (cache.size >= MAX_ENTRADAS) {
    const primera = cache.keys().next().value;

    if (primera) {
      cache.delete(primera);
    }
  }

  cache.set(ip, { valor, expira: Date.now() + ttl });
}

async function consultarIpapi(ip: string): Promise<UbicacionInvitado | null> {
  const base = (process.env.IP_LOCALE_API?.trim() || "https://ipapi.co").replace(
    /\/+$/,
    "",
  );

  try {
    const respuesta = await fetch(`${base}/${encodeURIComponent(ip)}/json/`, {
      headers: { "User-Agent": "OpoGenAI-geo/1.0" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });

    if (!respuesta.ok) {
      return null;
    }

    const datos = (await respuesta.json().catch(() => null)) as {
      country_name?: unknown;
      country_code?: unknown;
      city?: unknown;
      error?: unknown;
    } | null;

    if (!datos || datos.error) {
      return null;
    }

    const pais =
      typeof datos.country_name === "string" && datos.country_name.trim()
        ? datos.country_name
        : typeof datos.country_code === "string"
          ? datos.country_code
          : "";
    const ciudad = typeof datos.city === "string" ? datos.city : "";

    return { pais: normalizar(pais), ciudad: normalizar(ciudad) };
  } catch {
    return null;
  }
}

export async function obtenerUbicacionInvitado(
  request: Request,
  ip: string,
): Promise<UbicacionInvitado> {
  const paisCabecera = leerCabecera(request, [
    "x-vercel-ip-country",
    "cf-ipcountry",
    "x-geo-country",
    "x-country-code",
  ]);
  const ciudadCabecera = leerCabecera(request, [
    "x-vercel-ip-city",
    "cf-ipcity",
    "x-geo-city",
    "x-city",
  ]);

  if (paisCabecera || ciudadCabecera) {
    return {
      pais: normalizar(paisCabecera),
      ciudad: normalizar(decodificar(ciudadCabecera)),
    };
  }

  if (!esIpPublica(ip)) {
    return { pais: "", ciudad: "" };
  }

  const cacheado = cache.get(ip);

  if (cacheado && cacheado.expira > Date.now()) {
    return cacheado.valor;
  }

  const ubicacion = await consultarIpapi(ip);

  if (!ubicacion) {
    guardar(ip, { pais: "", ciudad: "" }, TTL_ERROR_MS);
    return { pais: "", ciudad: "" };
  }

  guardar(ip, ubicacion, TTL_OK_MS);

  return ubicacion;
}
