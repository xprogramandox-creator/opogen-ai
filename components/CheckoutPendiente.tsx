"use client";

import { useEffect } from "react";
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

      void (async () => {
        try {
          const respuesta = await fetch("/api/stripe/checkout", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan }),
            cache: "no-store",
          });

          if (!respuesta.ok) return;

          const datos = (await respuesta.json().catch(() => ({}))) as {
            url?: unknown;
          };

          if (typeof datos.url === "string") {
            window.location.assign(datos.url);
          }
        } catch {
          // Si falla, el usuario puede volver a elegir plan desde la tarjeta.
        }
      })();
    }, 0);

    return () => window.clearTimeout(id);
  }, [cargando, sesion]);

  return null;
}
