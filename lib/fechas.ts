export function diasHastaFecha(fechaIso: string): number {
  return Math.ceil(
    (new Date(fechaIso).getTime() - Date.now()) /
      (24 * 60 * 60 * 1000),
  );
}

export function formatearFecha(
  fechaIso: string,
  locale: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(fechaIso));
}
