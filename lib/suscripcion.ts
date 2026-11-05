import type { UsuarioRegistrado } from "@/lib/auth-server";
import { stripe } from "@/lib/stripe";

type SuscripcionConPeriodo = {
  current_period_end?: number;
  items?: { data?: Array<{ current_period_end?: number }> };
};

function finDePeriodo(suscripcion: SuscripcionConPeriodo): number | null {
  const finItem = suscripcion.items?.data?.[0]?.current_period_end;
  const finSuscripcion = suscripcion.current_period_end;
  const timestamp = finItem ?? finSuscripcion;

  return typeof timestamp === "number" && Number.isFinite(timestamp)
    ? timestamp
    : null;
}

/**
 * Devuelve el ISO de la fecha de renovación/caducidad de la suscripción
 * Premium, consultando Stripe por subscriptionId o por email.
 */
export async function obtenerFechaCaducidadPremium(
  usuario: UsuarioRegistrado,
): Promise<string | null> {
  if (usuario.rol !== "premium") return null;

  const respaldo =
    usuario.fechaCaducidad &&
    !Number.isNaN(Date.parse(usuario.fechaCaducidad))
      ? usuario.fechaCaducidad
      : null;

  try {
    let suscripcion: SuscripcionConPeriodo | null = null;

    if (usuario.stripeSubscriptionId) {
      const remota = await stripe.subscriptions.retrieve(
        usuario.stripeSubscriptionId,
      );
      suscripcion = remota as unknown as SuscripcionConPeriodo;
    } else {
      let customerId = usuario.stripeCustomerId;

      if (!customerId && usuario.correo) {
        const clientes = await stripe.customers.list({
          email: usuario.correo,
          limit: 1,
        });
        customerId = clientes.data[0]?.id;
      }

      if (!customerId) return respaldo;

      const suscripciones = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 5,
      });

      const activa = suscripciones.data.find((s) =>
        ["active", "trialing", "past_due"].includes(s.status),
      );

      if (activa) {
        suscripcion = activa as unknown as SuscripcionConPeriodo;
      }
    }

    if (!suscripcion) return respaldo;

    const timestamp = finDePeriodo(suscripcion);
    return timestamp
      ? new Date(timestamp * 1_000).toISOString()
      : respaldo;
  } catch (error) {
    console.warn("[Suscripción] No se pudo consultar Stripe", error);
    return respaldo;
  }
}
