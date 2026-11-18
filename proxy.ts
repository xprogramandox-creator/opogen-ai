import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { isIP } from "node:net";
import path from "node:path";
import { open, type CountryResponse, type Reader } from "maxmind";
import { CLAVE_ADMIN } from "./lib/planes";
import { LOCALE_COOKIE, routing } from "./i18n/routing";

/*
 * Proxy (antiguo middleware) de OpoGen AI.
 *
 * Orden de decisiones:
 *   1. /admin exige sesión de administrador (404 si no lo es).
 *   2. Las rutas con prefijo de idioma (/es, /it/...) se reescriben a la ruta
 *      interna sin prefijo, como hasta ahora.
 *   3. Las rutas SIN prefijo, en navegación de documento, sin cookie de idioma,
 *      que no sean de un bot y con detección activada, se redirigen al idioma
 *      del país de la IP. El resto (bots, API, fetch, cookie ya elegida...)
 *      mantiene el comportamiento anterior con next-intl o con la cabecera
 *      interna x-opogen-locale.
 *
 * El proxy de Next.js 16 corre siempre en el runtime de Node.js, así que se
 * puede leer el mmdb de MaxMind con `node:fs` sin configuración extra.
 */

const handleI18nRouting = createMiddleware(routing);

const LOCALES = routing.locales;
const COOKIE_SESION = "opoquiz_sesion";
const SECRETO_DESARROLLO =
  "opoquiz-desarrollo-local-sin-valor-real";

/* =========================================================
   Detección de país por IP
   ========================================================= */

/** País ISO-3166 alpha-2 → idioma soportado. */
const LOCALE_POR_PAIS: Record<string, string> = {
  IT: "it",
  FR: "fr",
  DE: "de",
  PT: "pt",
  ES: "es",
};

/** País detectado pero sin idioma propio (o no detectado) → inglés. */
const LOCALE_POR_DEFECTO_PAIS = "en";

const TTL_PAIS_MS = 24 * 60 * 60 * 1000;
const TTL_FALLO_MS = 60 * 60 * 1000;
const MAX_ENTRADAS_CACHE = 5000;
const TIMEOUT_API_MS = 2000;

const RUTA_GEOLITE2 =
  process.env.GEOLITE2_DB_PATH?.trim() ||
  path.join(
    /* turbopackIgnore: true */ process.env.DATA_DIR?.trim() || "/app/datos",
    "geolite2",
    "GeoLite2-Country.mmdb",
  );

type EntradaPais = { pais: string | null; expira: number };

const cachePaises = new Map<string, EntradaPais>();

let lectorGeolite: Promise<Reader<CountryResponse> | null> | null = null;

/** Feature flag para apagar la detección sin tocar código. */
function deteccionPorIpActiva(): boolean {
  const valor = (process.env.IP_LOCALE_DETECTION ?? "on").trim().toLowerCase();

  return !["off", "0", "false", "no", "disabled"].includes(valor);
}

/** Reader de MaxMind abierto una sola vez (singleton por proceso). */
async function obtenerLectorGeolite(): Promise<Reader<CountryResponse> | null> {
  if (!lectorGeolite) {
    lectorGeolite = (async () => {
      try {
        const fs = await import("node:fs/promises");

        await fs.access(RUTA_GEOLITE2);

        return await open<CountryResponse>(RUTA_GEOLITE2);
      } catch {
        // Sin mmdb (o ilegible) se usará la API externa como respaldo.
        return null;
      }
    })();
  }

  return lectorGeolite;
}

function esIpPrivadaOEspecial(ip: string): boolean {
  if (isIP(ip) === 6) {
    return (
      ip === "::1" ||
      ip.startsWith("fc") ||
      ip.startsWith("fd") ||
      ip.startsWith("fe80")
    );
  }

  const [a, b] = ip.split(".").map(Number);

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

/** IP real del cliente según las cabeceras que inyecta Coolify/Traefik. */
function getClientIp(request: NextRequest): string | null {
  const reenviada = request.headers.get("x-forwarded-for");

  if (reenviada) {
    const primera = reenviada.split(",")[0]?.trim();

    if (primera && isIP(primera)) {
      return primera;
    }
  }

  const real = request.headers.get("x-real-ip")?.trim() ??
    request.headers.get("cf-connecting-ip")?.trim();

  if (real && isIP(real)) {
    return real;
  }

  return null;
}

/** Respaldo sin mmdb: API gratuita con timeout corto. */
async function paisPorApiExterna(ip: string): Promise<string | null> {
  const base = (process.env.IP_LOCALE_API?.trim() || "https://ipapi.co").replace(
    /\/+$/,
    "",
  );

  try {
    const respuesta = await fetch(`${base}/${encodeURIComponent(ip)}/country/`, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_API_MS),
      headers: { "User-Agent": "OpoGenAI-locale/1.0" },
    });

    if (!respuesta.ok) {
      return null;
    }

    const texto = (await respuesta.text()).trim().toUpperCase();

    return /^[A-Z]{2}$/.test(texto) ? texto : null;
  } catch {
    // Timeout, red caída o respuesta rara: se trata como "no detectado".
    return null;
  }
}

function guardarEnCache(ip: string, pais: string | null): void {
  if (cachePaises.size >= MAX_ENTRADAS_CACHE) {
    const ahora = Date.now();

    for (const [clave, entrada] of cachePaises) {
      if (entrada.expira <= ahora) {
        cachePaises.delete(clave);
      }
    }

    // Si sigue lleno, se descarta la entrada más antigua (un Map conserva el
    // orden de inserción).
    if (cachePaises.size >= MAX_ENTRADAS_CACHE) {
      const primera = cachePaises.keys().next().value;
      if (primera) cachePaises.delete(primera);
    }
  }

  cachePaises.set(ip, {
    pais,
    expira: Date.now() + (pais ? TTL_PAIS_MS : TTL_FALLO_MS),
  });
}

/**
 * País ISO-3166 de una IP. Usa el mmdb local y, si no está disponible, la API
 * externa. La IP solo vive en memoria durante la petición y en una caché en
 * memoria; no se guarda ni se registra.
 */
async function getCountryForIp(ip: string): Promise<string | null> {
  const cacheado = cachePaises.get(ip);

  if (cacheado && cacheado.expira > Date.now()) {
    return cacheado.pais;
  }

  const lector = await obtenerLectorGeolite();
  let pais: string | null = null;

  if (lector) {
    try {
      const datos = lector.get(ip);

      pais =
        datos?.country?.iso_code?.toUpperCase() ??
        datos?.registered_country?.iso_code?.toUpperCase() ??
        null;
    } catch {
      pais = null;
    }
  }

  if (!pais) {
    pais = await paisPorApiExterna(ip);
  }

  guardarEnCache(ip, pais);

  return pais;
}

/** País del cliente a partir de las cabeceras de la petición. */
async function getCountryFromRequest(
  request: NextRequest,
): Promise<string | null> {
  const ip = getClientIp(request);

  if (!ip || esIpPrivadaOEspecial(ip)) {
    return null;
  }

  return getCountryForIp(ip);
}

/** Solo hay detección si la petición trae una IP pública real. */
function hayIpPublica(request: NextRequest): boolean {
  const ip = getClientIp(request);

  return Boolean(ip) && !esIpPrivadaOEspecial(ip as string);
}

function pickLocaleFromCountry(pais: string | null): string {
  if (!pais) {
    return LOCALE_POR_DEFECTO_PAIS;
  }

  return LOCALE_POR_PAIS[pais.toUpperCase()] ?? LOCALE_POR_DEFECTO_PAIS;
}

/* =========================================================
   Bots y tipo de petición
   ========================================================= */

const RE_BOT =
  /bot|crawl|spider|slurp|bingpreview|yandex|baidu|duckduck|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram|applebot|petalbot|semrush|ahrefs|mj12bot|seznam|qwant|gptbot|chatgpt-user|claudebot|perplexitybot|google-inspectiontool/i;

function esBot(request: NextRequest): boolean {
  const ua = request.headers.get("user-agent") ?? "";

  return ua.length > 0 && RE_BOT.test(ua);
}

/** Solo se redirige al navegar a una página, nunca a fetch/XHR/JSON. */
function esNavegacionDeDocumento(request: NextRequest): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return false;
  }

  if (request.headers.get("x-requested-with")) {
    return false;
  }

  const destino = request.headers.get("sec-fetch-dest");

  if (destino) {
    return destino === "document";
  }

  return (request.headers.get("accept") ?? "").includes("text/html");
}

/* =========================================================
   Sesión de administrador
   ========================================================= */

function base64UrlABytes(
  valor: string,
): Uint8Array<ArrayBuffer> | null {
  try {
    const base64 = valor
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(valor.length / 4) * 4, "=");
    const binario = atob(base64);

    return Uint8Array.from(binario, (caracter) =>
      caracter.charCodeAt(0),
    );
  } catch {
    return null;
  }
}

async function esSesionAdmin(request: NextRequest): Promise<boolean> {
  const cookie = request.cookies.get(COOKIE_SESION)?.value;

  if (!cookie) return false;

  const partes = cookie.split(".");
  if (partes.length !== 2) return false;

  const [datos, firma] = partes;
  const firmaBytes = base64UrlABytes(firma);
  const datosBytes = base64UrlABytes(datos);

  if (!firmaBytes || !datosBytes) return false;

  const secreto =
    process.env.AUTH_SECRET?.trim() ||
    (process.env.NODE_ENV === "production" ? "" : SECRETO_DESARROLLO);

  if (!secreto) return false;

  try {
    const clave = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secreto),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    // La firma se calcula sobre el texto base64url, no sobre la clave.
    const valida = await crypto.subtle.verify(
      "HMAC",
      clave,
      firmaBytes,
      new TextEncoder().encode(datos),
    );

    if (!valida) return false;

    return new TextDecoder().decode(datosBytes) === CLAVE_ADMIN;
  } catch {
    return false;
  }
}

/* =========================================================
   Locales
   ========================================================= */

function esLocale(valor: string | undefined): valor is (typeof LOCALES)[number] {
  return Boolean(valor && LOCALES.includes(valor as (typeof LOCALES)[number]));
}

function detectarLocale(request: NextRequest): string {
  const primerSegmento = request.nextUrl.pathname.split("/")[1];

  if (esLocale(primerSegmento)) {
    return primerSegmento;
  }

  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;

  if (esLocale(cookie)) {
    return cookie;
  }

  const acceptLanguage =
    request.headers.get("accept-language")?.toLowerCase() ?? "";

  for (const locale of LOCALES) {
    if (
      new RegExp(`(^|[,;\\s])${locale}([-;,\\s]|$)`).test(
        acceptLanguage,
      )
    ) {
      return locale;
    }
  }

  return routing.defaultLocale;
}

function opcionesCookieIdioma() {
  return {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax" as const,
    secure: true,
  };
}

/**
 * Deja que next-intl resuelva la ruta, pero con el idioma ya decidido por IP:
 * se le inyecta la cookie NEXT_LOCALE solo en esta petición. Así no se duplica
 * la lógica de prefijos, redirecciones ni cookies de next-intl.
 */
function enrutarConLocale(
  request: NextRequest,
  locale: string,
): NextResponse {
  const cabeceras = new Headers(request.headers);
  const cookiePrevia = cabeceras.get("cookie");
  const cookieLocale = `${LOCALE_COOKIE}=${locale}`;

  cabeceras.set(
    "cookie",
    cookiePrevia ? `${cookiePrevia}; ${cookieLocale}` : cookieLocale,
  );

  const conLocale = new NextRequest(request.nextUrl, {
    headers: cabeceras,
    method: request.method,
  });
  const respuesta = handleI18nRouting(conLocale);

  // Sin cookie previa, se persiste el idioma elegido por país para que las
  // siguientes navegaciones no repitan la consulta.
  if (!request.cookies.get(LOCALE_COOKIE)?.value) {
    respuesta.cookies.set(
      LOCALE_COOKIE,
      locale,
      opcionesCookieIdioma(),
    );
  }

  return respuesta;
}

/* =========================================================
   Proxy
   ========================================================= */

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // El panel de administración no debe revelar su existencia. Comprobamos
  // la sesión antes de renderizar y devolvemos un 404 real si no es admin.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!(await esSesionAdmin(request))) {
      return new NextResponse("Página no encontrada", {
        status: 404,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }
  }

  const primerSegmento = pathname.split("/")[1];
  const yaLocalizada = esLocale(primerSegmento);
  const esPortada =
    pathname === "/" ||
    new RegExp(`^/(${LOCALES.join("|")})/?$`).test(pathname);

  // Una URL que ya lleva idioma nunca se redirige por IP.
  if (yaLocalizada) {
    // La portada localizada (/es, /it...) la resuelve next-intl.
    if (esPortada) {
      return handleI18nRouting(request);
    }

    // Rutas internas sin prefijo, pero con idioma en la URL: se reescriben a
    // la ruta real manteniendo el idioma en la cabecera y en la cookie.
    const locale = primerSegmento;
    const headers = new Headers(request.headers);
    headers.set("x-opogen-locale", locale);
    headers.set("x-opogen-pathname", pathname);

    const url = request.nextUrl.clone();
    url.pathname =
      pathname.replace(new RegExp(`^/${primerSegmento}`), "") || "/";

    const response = NextResponse.rewrite(url, {
      request: { headers },
    });
    response.cookies.set(LOCALE_COOKIE, locale, opcionesCookieIdioma());

    return response;
  }

  const cookieIdioma = request.cookies.get(LOCALE_COOKIE)?.value;

  // Detección por país: solo documento, sin cookie, sin bots y con la función
  // activa. Si falla cualquier condición se mantiene el comportamiento previo.
  const puedeDetectarPorIp =
    deteccionPorIpActiva() &&
    !cookieIdioma &&
    !esBot(request) &&
    esNavegacionDeDocumento(request) &&
    hayIpPublica(request);

  if (puedeDetectarPorIp) {
    const pais = await getCountryFromRequest(request);
    const locale = pickLocaleFromCountry(pais);
    const respuesta = enrutarConLocale(request, locale);

    // Si next-intl no redirigiese (por ejemplo, por una ruta ya resuelta),
    // se fuerza la redirección preservando ruta y query.
    if (respuesta.status >= 300 && respuesta.status < 400) {
      return respuesta;
    }

    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;

    const redireccion = NextResponse.redirect(url, 307);
    redireccion.cookies.set(
      LOCALE_COOKIE,
      locale,
      opcionesCookieIdioma(),
    );

    return redireccion;
  }

  // Portada sin detección por IP (bots, cookie previa o función apagada):
  // next-intl negocia Accept-Language y redirige. Se mantiene el 308 de SEO.
  if (esPortada) {
    const response = handleI18nRouting(request);

    if (response.status === 307) {
      const destino = response.headers.get("location");

      if (destino) {
        const permanente = NextResponse.redirect(
          new URL(destino, request.url),
          308,
        );

        for (const cookie of response.cookies.getAll()) {
          permanente.cookies.set(
            cookie.name,
            cookie.value,
            cookie,
          );
        }

        return permanente;
      }
    }

    return response;
  }

  // Resto de rutas sin prefijo: se determina el idioma para que la cabecera
  // pueda traducirse con el mismo locale (comportamiento original).
  const locale = detectarLocale(request);
  const headers = new Headers(request.headers);
  headers.set("x-opogen-locale", locale);
  headers.set("x-opogen-pathname", pathname);

  const response = NextResponse.next({ request: { headers } });
  response.cookies.set(LOCALE_COOKIE, locale, opcionesCookieIdioma());

  return response;
}

export const config = {
  // Se excluyen API, recursos internos de Next y cualquier archivo con
  // extensión (imágenes, CSS, JS, fuentes, robots.txt, sitemap.xml...).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
