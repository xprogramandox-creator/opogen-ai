"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSesion } from "@/components/SessionProvider";
import {
  esPlanStripe,
  PLAN_PENDIENTE_CLAVE,
} from "@/lib/plan-pendiente";

/**
 * Si el usuario eligió un plan antes de registrarse, una vez verificada la
 * cuenta y creada la sesión se inicia automáticamente el Checkout de Stripe.
 */
export default function CheckoutPendiente() {
  const { sesion, cargando } = useSesion();
  const router = useRouter();

  useEffect(() => {
    if (cargando || !sesion) return;

    const id = window.setTimeout(() => {
      let plan: string | null = null;

      try {
        plan = window.localStorage.getItem(PLAN_PENDIENTE_CLAVE);
      } catch {
        return;
      }

      if (!esPlanStripe(plan)) return;

      // Se elimina antes de navegar para no repetir el checkout al volver.
      try {
        window.localStorage.removeItem(PLAN_PENDIENTE_CLAVE);
      } catch {
        // Sin localStorage no se puede continuar con la intención guardada.
      }

      if (sesion.rol === "premium") return;

      // El checkout exige confirmar la contraseña, así que se abre la página
      // de pago en lugar de iniciar la sesión de Stripe automáticamente.
      router.push(`/checkout?plan=${plan}`);
    }, 0);

    return () => window.clearTimeout(id);
  }, [cargando, router, sesion]);

  return null;
}
