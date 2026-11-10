import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { CLAVE_ADMIN } from "./lib/planes";
import { LOCALE_COOKIE, routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

const LOCALES = routing.locales;
const COOKIE_SESION = "opoquiz_sesion";
const SECRETO_DESARROLLO =
  "opoquiz-desarrollo-local-sin-valor-real";

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

  // Para la portada (raíz o /es, /en, /fr, /de) delegamos en el middleware
  // oficial de next-intl: negocia Accept-Language, redirige y guarda cookie.
  const esPortada =
    pathname === "/" ||
    new RegExp(`^/(${LOCALES.join("|")})/?$`).test(pathname);

  if (esPortada) {
    const response = handleI18nRouting(request);

    // next-intl devuelve 307 por defecto. Para SEO usamos 308 permanente.
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

  // En el resto de rutas (que siguen sin prefijo) determinamos el idioma
  // para que la cabecera pueda traducirse con el mismo locale.
  const locale = detectarLocale(request);
  const headers = new Headers(request.headers);
  headers.set("x-opogen-locale", locale);
  headers.set("x-opogen-pathname", pathname);

  // Las páginas no localizadas pueden recibir un prefijo de idioma
  // (/en/legal/aviso-legal). Se reescribe internamente a la ruta real
  // (/legal/aviso-legal) manteniendo el idioma en la URL y en la cabecera.
  const primerSegmento = pathname.split("/")[1];

  if (esLocale(primerSegmento)) {
    const url = request.nextUrl.clone();
    url.pathname =
      pathname.replace(new RegExp(`^/${primerSegmento}`), "") || "/";

    const response = NextResponse.rewrite(url, {
      request: { headers },
    });
    response.cookies.set(LOCALE_COOKIE, primerSegmento, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: true,
    });
    return response;
  }

  const response = NextResponse.next({ request: { headers } });
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: true,
  });

  return response;
}

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
