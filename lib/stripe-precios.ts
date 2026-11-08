/**
 * IDs de precio de Stripe para cada plan.
 *
 * Se pueden sobrescribir con variables de entorno. Los valores de respaldo
 * son los IDs LIVE actuales del proyecto.
 */
export const PRECIOS_STRIPE = {
  mensual:
    process.env.STRIPE_PRICE_MENSUAL?.trim() ||
    "price_1UZMIYEcQCiUR7vYJZCg7gVk",
  semestral:
    process.env.STRIPE_PRICE_SEMESTRAL?.trim() ||
    "price_1UZMRVEcQCiUR7vYYQQIbTRM",
  anual:
    process.env.STRIPE_PRICE_ANUAL?.trim() ||
    "price_1UZMTCEcQCiUR7vYotTPE1oz",
} as const;

export type PlanStripe = keyof typeof PRECIOS_STRIPE;

export function esPlanStripe(valor: unknown): valor is PlanStripe {
  return typeof valor === "string" && valor in PRECIOS_STRIPE;
}
