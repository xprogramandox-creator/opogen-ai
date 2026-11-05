import { NextResponse } from "next/server";
import {
  leerUsuario,
  obtenerUsuarioSesion,
} from "@/lib/auth-server";
import { obtenerPendientePorClave } from "@/lib/admin-db";
import { stripe } from "@/lib/stripe";

const PRECIOS = {
  mensual: "price_1UW1VhI5YopvqVk9GrMsstVS",
  semestral: "price_1UW1aeI5YopvqVk9d2enCalc",
  anual: "price_1UW1c2I5YopvqVk97crubtT0",
} as const;

type PlanStripe = keyof typeof PRECIOS;

function esPlanStripe(valor: unknown): valor is PlanStripe {
  return typeof valor === "string" && valor in PRECIOS;
}

export async function POST(request: Request) {
  const cuerpo: unknown = await request.json().catch(() => null);
  const datos =
    cuerpo && typeof cuerpo === "object"
      ? (cuerpo as {
          plan?: unknown;
          userId?: unknown;
          token?: unknown;
        })
      : {};

  if (!esPlanStripe(datos.plan)) {
    return NextResponse.json(
      { error: "Plan no válido.", codigo: "PLAN_INVALIDO" },
      { status: 400 },
    );
  }

  const plan = datos.plan;
  let usuario = await obtenerUsuarioSesion();

  // Permite iniciar el pago justo después del registro Premium, antes de
  // verificar el correo, usando el token de verificación recién emitido.
  if (
    !usuario &&
    typeof datos.userId === "string" &&
    typeof datos.token === "string"
  ) {
    const candidato =
      (await leerUsuario(datos.userId)) ||
      obtenerPendientePorClave(datos.userId);

    if (
      candidato &&
      !candidato.emailVerificado &&
      candidato.tokenVerificacion === datos.token
    ) {
      usuario = candidato;
    }
  }

  if (!usuario) {
    return NextResponse.json(
      { error: "No autenticado", codigo: "NO_AUTENTICADO" },
      { status: 401 },
    );
  }

  const origen = new URL(request.url).origin;
  const metadata = {
    userId: usuario.clave,
    plan,
    ...(usuario.emailVerificado
      ? {}
      : {
          pendingToken:
            usuario.tokenVerificacion ||
            (typeof datos.token === "string" ? datos.token : ""),
        }),
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: PRECIOS[plan], quantity: 1 }],
      success_url: `${origen}/dashboard?checkout=success`,
      cancel_url: `${origen}/premium?checkout=cancel`,
      metadata,
      subscription_data: { metadata },
      client_reference_id: usuario.clave,
      ...(usuario.correo ? { customer_email: usuario.correo } : {}),
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe no devolvió una URL de pago." },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[Stripe checkout]", error);
    return NextResponse.json(
      { error: "No se pudo iniciar el pago." },
      { status: 500 },
    );
  }
}
