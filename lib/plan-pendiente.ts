export type PlanStripe = "mensual" | "semestral" | "anual";

export const PLAN_PENDIENTE_CLAVE = "plan_pendiente";

export function esPlanStripe(valor: unknown): valor is PlanStripe {
  return valor === "mensual" || valor === "semestral" || valor === "anual";
}
