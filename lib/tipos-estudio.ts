export type TipoEstudioId =
  | "primaria"
  | "secundaria"
  | "bachillerato"
  | "universidad"
  | "oposiciones";

export type OpcionTipoEstudio = {
  id: TipoEstudioId;
  label: string;
};

/** Etiquetas adaptadas al sistema educativo de cada idioma. */
export const TIPOS_ESTUDIO_POR_LOCALE: Record<
  string,
  OpcionTipoEstudio[]
> = {
  es: [
    { id: "primaria", label: "Primaria" },
    { id: "secundaria", label: "Secundaria" },
    { id: "bachillerato", label: "Bachillerato" },
    { id: "universidad", label: "Universidad" },
    { id: "oposiciones", label: "Oposiciones" },
  ],
  en: [
    { id: "primaria", label: "Primary" },
    { id: "secundaria", label: "Secondary" },
    { id: "bachillerato", label: "Sixth Form" },
    { id: "universidad", label: "University" },
    { id: "oposiciones", label: "Public Exams" },
  ],
  fr: [
    { id: "primaria", label: "Élémentaire" },
    { id: "secundaria", label: "Collège" },
    { id: "bachillerato", label: "Lycée" },
    { id: "universidad", label: "Université" },
    { id: "oposiciones", label: "Concours" },
  ],
  de: [
    { id: "primaria", label: "Grundschule" },
    { id: "secundaria", label: "Sekundarstufe I" },
    { id: "bachillerato", label: "Gymnasium" },
    { id: "universidad", label: "Universität" },
    { id: "oposiciones", label: "Öffentlicher Dienst" },
  ],
  it: [
    { id: "primaria", label: "Primaria" },
    { id: "secundaria", label: "Secondaria" },
    { id: "bachillerato", label: "Liceo" },
    { id: "universidad", label: "Università" },
    { id: "oposiciones", label: "Concorsi Pubblici" },
  ],
  pt: [
    { id: "primaria", label: "Primário" },
    { id: "secundaria", label: "Secundário" },
    { id: "bachillerato", label: "Ensino Médio" },
    { id: "universidad", label: "Universidade" },
    { id: "oposiciones", label: "Concursos Públicos" },
  ],
};

export const TIPO_ESTUDIO_POR_DEFECTO: Record<string, TipoEstudioId> = {
  es: "primaria",
  en: "primaria",
  fr: "primaria",
  de: "primaria",
  it: "primaria",
  pt: "primaria",
};

/** Identificador interno -> nombre canónico usado por la IA. */
export const TIPO_ESTUDIO_CANONICO: Record<TipoEstudioId, string> = {
  primaria: "Primaria",
  secundaria: "Secundaria",
  bachillerato: "Bachillerato",
  universidad: "Universidad",
  oposiciones: "Oposiciones",
};

export function opcionesTipoEstudio(locale: string): OpcionTipoEstudio[] {
  return TIPOS_ESTUDIO_POR_LOCALE[locale] ?? TIPOS_ESTUDIO_POR_LOCALE.es;
}

export function tipoEstudioPorDefecto(locale: string): TipoEstudioId {
  return TIPO_ESTUDIO_POR_DEFECTO[locale] ?? "primaria";
}

export function normalizarTipoEstudio(valor: string): string {
  const limpio = valor.trim();

  if (limpio in TIPO_ESTUDIO_CANONICO) {
    return TIPO_ESTUDIO_CANONICO[limpio as TipoEstudioId];
  }

  return limpio;
}
