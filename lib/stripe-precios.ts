/**
 * IDs de precio LIVE de Stripe para cada plan.
 * Los importes base son 10,89 €, 58,08 € y 84,00 €.
 * No se leen de variables de entorno para evitar IDs obsoletos.
 */
export const PRECIOS_STRIPE = {
  mensual: "price_1UZgIiEcQCiUR7vY1oo7urnl",
  semestral: "price_1UZMRVEcQCiUR7vYYQQIbTRM",
  anual: "price_1UZzIKEcQCiUR7vYRO0GwoSV",
} as const;

export type PlanStripe = keyof typeof PRECIOS_STRIPE;

export function esPlanStripe(valor: unknown): valor is PlanStripe {
  return typeof valor === "string" && valor in PRECIOS_STRIPE;
}
