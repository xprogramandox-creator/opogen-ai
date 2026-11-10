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

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // El panel de administración no debe revelar su existencia. Comprobamos
  // la sesión antes de renderizar y devolvemos un 404 real si no es admin.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    try {
      const respuesta = await fetch(
        new URL("/api/auth/session", request.url),
        {
          headers: {
            cookie: request.headers.get("cookie") || "",
          },
          cache: "no-store",
        },
      );
      const sesion = (await respuesta.json().catch(() => null)) as {
        autenticado?: unknown;
        esAdmin?: unknown;
      } | null;

      if (
        !respuesta.ok ||
        sesion?.autenticado !== true ||
        sesion.esAdmin !== true
      ) {
        return new NextResponse("Página no encontrada", {
          status: 404,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      }
    } catch {
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
