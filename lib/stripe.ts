import Stripe from "stripe";

let clienteStripe: Stripe | null = null;

function obtenerClienteStripe(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "STRIPE_SECRET_KEY no está configurada en el servidor.",
    );
  }

  if (!clienteStripe) {
    clienteStripe = new Stripe(apiKey, {
      apiVersion:
        "2026-09-30.endive" as unknown as Stripe.LatestApiVersion,
    });
  }

  return clienteStripe;
}

/**
 * Cliente perezoso: no se inicializa durante el build ni al importar la
 * ruta. Solo se crea cuando una petición real necesita hablar con Stripe.
 */
export const stripe = new Proxy({} as Stripe, {
  get(_target, propiedad, receptor) {
    const cliente = obtenerClienteStripe();
    const valor = Reflect.get(cliente, propiedad, receptor);

    return typeof valor === "function"
      ? valor.bind(cliente)
      : valor;
  },
});
