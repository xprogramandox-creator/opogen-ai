import { defineRouting } from "next-intl/routing";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export const routing = defineRouting({
  locales: ["es", "en", "fr", "de", "it", "pt"],
  defaultLocale: "es",
  localePrefix: "always",
  localeCookie: {
    name: LOCALE_COOKIE,
    sameSite: "lax",
    secure: true,
  },
});
