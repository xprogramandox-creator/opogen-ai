import { cookies, headers } from "next/headers";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { LOCALE_COOKIE, routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  let locale = hasLocale(routing.locales, requested)
    ? requested
    : undefined;

  if (!locale) {
    const almacen = await cookies();
    const desdeCookie = almacen.get(LOCALE_COOKIE)?.value;

    if (hasLocale(routing.locales, desdeCookie)) {
      locale = desdeCookie;
    }
  }

  if (!locale) {
    const cabeceras = await headers();
    const desdeCabecera = cabeceras.get("x-opogen-locale");

    if (hasLocale(routing.locales, desdeCabecera)) {
      locale = desdeCabecera;
    }
  }

  if (!locale) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
