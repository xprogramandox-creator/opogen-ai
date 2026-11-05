export type IdiomaExamen =
  | "español"
  | "inglés"
  | "francés"
  | "alemán"
  | "italiano"
  | "portugués";

type OpcionIdioma = {
  id: IdiomaExamen;
  label: string;
};

/**
 * El `id` es el nombre que entiende el backend; `label` es lo que ve el
 * usuario en el idioma actual de la página.
 */
export const IDIOMAS_EXAMEN_POR_LOCALE: Record<
  string,
  OpcionIdioma[]
> = {
  es: [
    { id: "español", label: "Español" },
    { id: "inglés", label: "Inglés" },
    { id: "francés", label: "Francés" },
    { id: "alemán", label: "Alemán" },
    { id: "italiano", label: "Italiano" },
    { id: "portugués", label: "Portugués" },
  ],
  en: [
    { id: "español", label: "Spanish" },
    { id: "inglés", label: "English" },
    { id: "francés", label: "French" },
    { id: "alemán", label: "German" },
    { id: "italiano", label: "Italian" },
    { id: "portugués", label: "Portuguese" },
  ],
  fr: [
    { id: "español", label: "Espagnol" },
    { id: "inglés", label: "Anglais" },
    { id: "francés", label: "Français" },
    { id: "alemán", label: "Allemand" },
    { id: "italiano", label: "Italien" },
    { id: "portugués", label: "Portugais" },
  ],
  de: [
    { id: "español", label: "Spanisch" },
    { id: "inglés", label: "Englisch" },
    { id: "francés", label: "Französisch" },
    { id: "alemán", label: "Deutsch" },
    { id: "italiano", label: "Italienisch" },
    { id: "portugués", label: "Portugiesisch" },
  ],
  it: [
    { id: "español", label: "Spagnolo" },
    { id: "inglés", label: "Inglese" },
    { id: "francés", label: "Francese" },
    { id: "alemán", label: "Tedesco" },
    { id: "italiano", label: "Italiano" },
    { id: "portugués", label: "Portoghese" },
  ],
  pt: [
    { id: "español", label: "Espanhol" },
    { id: "inglés", label: "Inglês" },
    { id: "francés", label: "Francês" },
    { id: "alemán", label: "Alemão" },
    { id: "italiano", label: "Italiano" },
    { id: "portugués", label: "Português" },
  ],
};

export function opcionesIdiomaExamen(locale: string): OpcionIdioma[] {
  return IDIOMAS_EXAMEN_POR_LOCALE[locale] ?? IDIOMAS_EXAMEN_POR_LOCALE.es;
}
