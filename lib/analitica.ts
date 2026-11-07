export const ZONA_HORARIA_ANALITICA = "Europe/Madrid";

const FORMATO_DIA = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_HORARIA_ANALITICA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function diaAnalitico(fecha: Date = new Date()): string {
  return FORMATO_DIA.format(fecha);
}

export function esDiaAnalitico(valor: unknown): valor is string {
  return (
    typeof valor === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(valor) &&
    !Number.isNaN(new Date(`${valor}T12:00:00Z`).getTime())
  );
}
