/**
 * IDs de precio LIVE de Stripe para cada plan.
 * Los importes base son 9,00 €, 48,00 € y 69,42 €.
 * No se leen de variables de entorno para evitar IDs obsoletos.
 */
export const PRECIOS_STRIPE = {
  mensual: "price_1Ua1eaEcQCiUR7vYK4J6AfTJ",
  semestral: "price_1Ua1eaEcQCiUR7vYjK6MaNki",
  anual: "price_1Ua1eaEcQCiUR7vYnwjbTaIA",
} as const;

export type PlanStripe = keyof typeof PRECIOS_STRIPE;

export function esPlanStripe(valor: unknown): valor is PlanStripe {
  return typeof valor === "string" && valor in PRECIOS_STRIPE;
}
