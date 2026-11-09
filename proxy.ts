import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { LOCALE_COOKIE, routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

const LOCALES = routing.locales;

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

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Para la portada (raíz o /es, /en, /fr, /de) delegamos en el middleware
  // oficial de next-intl: negocia Accept-Language, redirige y guarda cookie.
  const esPortada =
    pathname === "/" ||
    new RegExp(`^/(${LOCALES.join("|")})/?$`).test(pathname);

  if (esPortada) {
    return handleI18nRouting(request);
  }

  // En el resto de rutas (que siguen sin prefijo) determinamos el idioma
  // para que la cabecera pueda traducirse con el mismo locale.
  const locale = detectarLocale(request);
  const headers = new Headers(request.headers);
  headers.set("x-opogen-locale", locale);

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
