import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  actualizarPlanContratado,
  actualizarSuscripcionUsuario,
  crearVerificacionPendiente,
  degradarUsuarioAFreemium,
  guardarUsuario,
  leerUsuario,
  migrarUsuarioAPremium,
} from "@/lib/auth-server";
import {
  eliminarRegistroPendiente,
  guardarPreciosUsuario,
  obtenerIvaConfig,
  obtenerPendientePorClave,
  obtenerRegistroPendiente,
  obtenerUsuarioAdmin,
  precioBasePlan,
  registrarPagoUnico,
} from "@/lib/admin-db";
import { enviarCorreoVerificacion } from "@/lib/email";
import { stripe } from "@/lib/stripe";
import { crearEnlaceVerificacion } from "@/lib/url-base";

const MESES_PLAN = {
  mensual: 1,
  semestral: 6,
  anual: 12,
} as const;

type PlanContratado = keyof typeof MESES_PLAN;

function esPlanContratado(valor: unknown): valor is PlanContratado {
  return typeof valor === "string" && valor in MESES_PLAN;
}

function sumarMeses(fecha: Date, meses: number): Date {
  const resultado = new Date(fecha);
  const dia = resultado.getDate();

  resultado.setDate(1);
  resultado.setMonth(resultado.getMonth() + meses);

  const ultimoDia = new Date(
    resultado.getFullYear(),
    resultado.getMonth() + 1,
    0,
  ).getDate();

  resultado.setDate(Math.min(dia, ultimoDia));
  return resultado;
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Falta la firma de Stripe." },
      { status: 400 },
    );
  }

  let evento: Stripe.Event;

  try {
    evento = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (error) {
    console.error("[Stripe webhook] Firma no válida", error);
    return NextResponse.json(
      { error: "Firma de Stripe no válida." },
      { status: 400 },
    );
  }

  if (evento.type === "checkout.session.completed") {
    const sesion = evento.data.object as Stripe.Checkout.Session;
    const userId = sesion.metadata?.userId;

    if (!userId) {
      console.error(
        "[Stripe webhook] checkout.session.completed sin metadata.userId",
        sesion.id,
      );
      return NextResponse.json(
        { error: "Falta metadata.userId." },
        { status: 400 },
      );
    }

    try {
      // Si el pago se completó antes de verificar el correo, el usuario aún
      // solo existe como registro pendiente. Se materializa ahora.
      if (!(await leerUsuario(userId))) {
        const pendingToken = sesion.metadata?.pendingToken;
        const pendiente = pendingToken
          ? obtenerRegistroPendiente(pendingToken)
          : obtenerPendientePorClave(userId);

        if (pendiente) {
          await guardarUsuario({
            ...pendiente,
            emailVerificado: false,
            tokenVerificacion: undefined,
            tokenVerificacionExpira: undefined,
          });
          eliminarRegistroPendiente(
            pendiente.tokenVerificacion || pendingToken || "",
          );
        }
      }

      await migrarUsuarioAPremium(userId);

      const customerId =
        typeof sesion.customer === "string"
          ? sesion.customer
          : sesion.customer?.id;
      const subscriptionId =
        typeof sesion.subscription === "string"
          ? sesion.subscription
          : sesion.subscription?.id;

      await actualizarSuscripcionUsuario(userId, {
        customerId,
        subscriptionId,
      });

      const plan = sesion.metadata?.plan;

      if (esPlanContratado(plan)) {
        const fechaInicio = new Date();
        const fechaCaducidad = sumarMeses(
          fechaInicio,
          MESES_PLAN[plan],
        );

        await actualizarPlanContratado(
          userId,
          plan,
          fechaCaducidad.toISOString(),
          fechaInicio.toISOString(),
        );

        // El importe debe corresponder al plan contratado, no al pago
        // anterior del usuario.
        const precioBase = precioBasePlan(plan);
        const ivaPago =
          Math.round(
            precioBase * (obtenerIvaConfig() / 100) * 100,
          ) / 100;

        guardarPreciosUsuario(
          userId,
          precioBase,
          ivaPago,
          fechaInicio.toISOString(),
        );

        const usuarioAdmin = obtenerUsuarioAdmin(userId);

        if (usuarioAdmin) {
          registrarPagoUnico(
            usuarioAdmin,
            `Suscripción ${plan}`,
            sesion.id,
          );
        }
      }

      const verificacion = await crearVerificacionPendiente(userId);

      if (verificacion) {
        const enlace = crearEnlaceVerificacion(
          verificacion.token,
          new URL(request.url).origin,
        );

        try {
          await enviarCorreoVerificacion(verificacion.correo, enlace);
        } catch (error) {
          console.error(
            "[Stripe webhook] No se pudo enviar la verificación",
            error,
          );
        }
      }
    } catch (error) {
      console.error("[Stripe webhook] Error al migrar a Premium", error);
      return NextResponse.json(
        { error: "No se pudo actualizar el usuario." },
        { status: 500 },
      );
    }
  }

  if (evento.type === "customer.subscription.deleted") {
    const suscripcion = evento.data.object as Stripe.Subscription;
    const userId = suscripcion.metadata?.userId;

    if (!userId) {
      console.error(
        "[Stripe webhook] customer.subscription.deleted sin metadata.userId",
        suscripcion.id,
      );
      return NextResponse.json({ received: true });
    }

    try {
      await degradarUsuarioAFreemium(userId);
    } catch (error) {
      console.error(
        "[Stripe webhook] Error al degradar a Freemium",
        error,
      );
      return NextResponse.json(
        { error: "No se pudo actualizar el usuario." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ received: true });
}
