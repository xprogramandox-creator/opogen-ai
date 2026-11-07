/**
 * IDs de precio de Stripe para cada plan.
 *
 * Se pueden sobrescribir con variables de entorno. Los valores de respaldo
 * son los IDs históricos del proyecto y deben coincidir con el modo de la
 * clave de Stripe (test o live).
 */
export const PRECIOS_STRIPE = {
  mensual:
    process.env.STRIPE_PRICE_MENSUAL?.trim() ||
    "price_1UW1VhI5YopvqVk9GrMsstVS",
  semestral:
    process.env.STRIPE_PRICE_SEMESTRAL?.trim() ||
    "price_1UW1aeI5YopvqVk9d2enCalc",
  anual:
    process.env.STRIPE_PRICE_ANUAL?.trim() ||
    "price_1UW1c2I5YopvqVk97crubtT0",
} as const;

export type PlanStripe = keyof typeof PRECIOS_STRIPE;

export function esPlanStripe(valor: unknown): valor is PlanStripe {
  return typeof valor === "string" && valor in PRECIOS_STRIPE;
}
