/** Idiomas públicos del sitio, en el mismo orden que `i18n/routing.ts`. */
export const IDIOMAS_SITIO = ["es", "en", "fr", "de", "it", "pt"] as const;

const BASE = "https://opogenai.com";

/**
 * Enlaces `hreflang` de una ruta interna sin prefijo de idioma.
 * `/` → https://opogenai.com/es, /mi-espacio → .../it/mi-espacio, etc.
 */
export function alternativasIdioma(
  rutaSinLocale: string,
): Record<string, string> {
  const ruta = rutaSinLocale === "/" ? "" : rutaSinLocale;

  const idiomas = Object.fromEntries(
    IDIOMAS_SITIO.map((idioma) => [idioma, `${BASE}/${idioma}${ruta}`]),
  ) as Record<string, string>;

  // x-default apunta al idioma de respaldo (inglés), que es el que reciben
  // los países sin idioma propio.
  return { ...idiomas, "x-default": `${BASE}/en${ruta}` };
}
