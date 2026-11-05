import type { Metadata } from "next";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import CheckoutForm, {
  type PlanCheckout,
} from "@/components/CheckoutForm";

export const metadata: Metadata = {
  title: "Checkout | OpoGen AI",
  description: "Completa tus datos y activa tu plan Premium.",
};

export const instant = false;

const PLANES = new Set<PlanCheckout>([
  "mensual",
  "semestral",
  "anual",
]);

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string | string[]; cancel?: string }>;
}) {
  const params = await searchParams;
  const planBruto = Array.isArray(params.plan)
    ? params.plan[0]
    : params.plan;
  const plan = PLANES.has(planBruto as PlanCheckout)
    ? (planBruto as PlanCheckout)
    : "mensual";

  const usuario = await obtenerUsuarioSesion();

  return (
    <main id="contenido" className="min-h-app bg-transparent font-sans">
      <section className="mx-auto max-w-xl px-5 py-12 sm:px-6 sm:py-16">
        <div className="mb-7 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--azul)]">
            Checkout Premium
          </p>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-[var(--txt)] sm:text-4xl">
            Finaliza tu suscripción
          </h1>
          <p className="mx-auto mt-3 max-w-md text-pretty text-sm leading-relaxed text-[var(--txt2)]">
            Revisa tus datos y continúa al pago seguro de Stripe.
          </p>
        </div>

        {params.cancel === "1" ? (
          <div
            role="status"
            className="mb-4 rounded-xl border border-[var(--ambar-b)] bg-[var(--ambar)] px-4 py-3 text-sm font-medium text-[var(--ambar-t)]"
          >
            El pago se canceló. Puedes intentarlo de nuevo cuando quieras.
          </div>
        ) : null}

        <CheckoutForm
          plan={plan}
          usuario={
            usuario
              ? {
                  nombre: usuario.nombre,
                  correo: usuario.correo,
                  telefono: usuario.telefono,
                }
              : null
          }
        />
      </section>
    </main>
  );
}
