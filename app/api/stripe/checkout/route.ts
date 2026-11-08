import { NextResponse } from "next/server";
import {
  leerUsuario,
  obtenerUsuarioSesion,
} from "@/lib/auth-server";
import { obtenerPendientePorClave } from "@/lib/admin-db";
import { stripe } from "@/lib/stripe";
import {
  PRECIOS_STRIPE,
  esPlanStripe,
} from "@/lib/stripe-precios";
import { obtenerUrlBase } from "@/lib/url-base";
import { sincronizarPromocionesVigentes } from "@/lib/descuentos";

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

  const origen = obtenerUrlBase(new URL(request.url).origin);
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
    await sincronizarPromocionesVigentes().catch((error) => {
      console.warn("[Stripe checkout] No se sincronizaron los descuentos", error);
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: PRECIOS_STRIPE[plan], quantity: 1 }],
      success_url: `${origen}/dashboard?checkout=success`,
      cancel_url: `${origen}/premium?checkout=cancel`,
      allow_promotion_codes: true,
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
    const errorStripe = error as {
      message?: string;
      code?: string;
      type?: string;
    };

    console.error("[Stripe checkout]", {
      message: errorStripe.message,
      code: errorStripe.code,
      type: errorStripe.type,
      error,
    });

    return NextResponse.json(
      {
        error:
          errorStripe.message || "No se pudo iniciar el pago.",
        codigo: errorStripe.code || "STRIPE_ERROR",
        tipo: errorStripe.type || "api_error",
      },
      { status: 500 },
    );
  }
}
