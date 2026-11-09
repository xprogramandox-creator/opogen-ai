/**
 * IDs de precio de Stripe para cada plan.
 *
 * Se pueden sobrescribir con variables de entorno. Los valores de respaldo
 * son los IDs LIVE actuales del proyecto.
 */
export const PRECIOS_STRIPE = {
  mensual:
    process.env.STRIPE_PRICE_MENSUAL?.trim() ||
    "price_1UZzIJEcQCiUR7vYu7tKcYcb",
  semestral:
    process.env.STRIPE_PRICE_SEMESTRAL?.trim() ||
    "price_1UZzIJEcQCiUR7vYuk0ixGWJ",
  anual:
    process.env.STRIPE_PRICE_ANUAL?.trim() ||
    "price_1UZzIKEcQCiUR7vYRO0GwoSV",
} as const;

export type PlanStripe = keyof typeof PRECIOS_STRIPE;

export function esPlanStripe(valor: unknown): valor is PlanStripe {
  return typeof valor === "string" && valor in PRECIOS_STRIPE;
}
