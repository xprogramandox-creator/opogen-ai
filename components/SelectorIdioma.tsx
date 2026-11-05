"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { routing, LOCALE_COOKIE } from "@/i18n/routing";

const ETIQUETAS: Record<string, string> = {
  es: "ES",
  en: "EN",
  fr: "FR",
  de: "DE",
  it: "IT",
  pt: "PT",
};

export default function SelectorIdioma() {
  const locale = useLocale();
  const t = useTranslations("Header");
  const pathname = usePathname();
  const router = useRouter();

  function cambiarIdioma(nuevo: string): void {
    if (!routing.locales.includes(nuevo as (typeof routing.locales)[number])) {
      return;
    }

    document.cookie = `${LOCALE_COOKIE}=${nuevo}; path=/; max-age=31536000; samesite=lax${
      window.location.protocol === "https:" ? "; secure" : ""
    }`;

    const prefijo = new RegExp(
      `^/(${routing.locales.join("|")})(?=/|$)`,
    );
    const tienePrefijo = prefijo.test(pathname);

    let destino: string;

    if (tienePrefijo) {
      // /es -> /en, /es/crear -> /en/crear, /fr/mi-espacio -> /de/mi-espacio
      const sinPrefijo = pathname.replace(prefijo, "") || "/";
      destino = `/${nuevo}${sinPrefijo === "/" ? "" : sinPrefijo}`;
    } else {
      // Rutas de la app que no llevan prefijo (/crear, /mi-espacio…):
      // se mantiene la misma ruta y el idioma se resuelve por la cookie.
      destino = pathname === "/" ? `/${nuevo}` : pathname;
    }

    router.push(
      `${destino}${window.location.search}${window.location.hash}`,
    );
    router.refresh();
  }

  return (
    <label className="inline-flex h-9 shrink-0 items-center rounded-full border border-[var(--th)] bg-[var(--card)] px-2 text-[var(--txt)] transition-colors focus-within:ring-2 focus-within:ring-[var(--azul)] sm:h-10">
      <span className="sr-only">{t("language")}</span>
      <select
        value={locale}
        onChange={(evento) => cambiarIdioma(evento.target.value)}
        aria-label={t("language")}
        className="cursor-pointer rounded-full bg-transparent text-[11px] font-bold text-[var(--txt)] outline-none dark:bg-slate-800 dark:text-white sm:text-xs"
      >
        {routing.locales.map((codigo) => (
          <option
            key={codigo}
            value={codigo}
            className="bg-[var(--card)] text-[var(--txt)] dark:bg-slate-800 dark:text-white"
          >
            {ETIQUETAS[codigo] ?? codigo.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
