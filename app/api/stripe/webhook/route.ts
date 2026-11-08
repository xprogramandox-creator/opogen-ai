import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  actualizarPlanContratado,
  actualizarSuscripcionUsuario,
  buscarUsuarioPorCorreo,
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
  sincronizarUsuarios,
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
    console.error(
      "[Stripe webhook] Firma no válida. Comprueba que STRIPE_WEBHOOK_SECRET corresponde al endpoint LIVE de Stripe.",
      error,
    );
    return NextResponse.json(
      { error: "Firma de Stripe no válida." },
      { status: 400 },
    );
  }

  if (evento.type === "checkout.session.completed") {
    const sesion = evento.data.object as Stripe.Checkout.Session;
    const customerId =
      typeof sesion.customer === "string"
        ? sesion.customer
        : sesion.customer?.id || null;
    const subscriptionId =
      typeof sesion.subscription === "string"
        ? sesion.subscription
        : sesion.subscription?.id || null;
    const emailCliente =
      sesion.customer_details?.email ||
      sesion.customer_email ||
      null;

    let userId =
      sesion.metadata?.userId ||
      sesion.client_reference_id ||
      (typeof sesion.subscription !== "string"
        ? sesion.subscription?.metadata?.userId
        : undefined) ||
      "";

    if (!userId && emailCliente) {
      const encontrado = await buscarUsuarioPorCorreo(emailCliente);
      userId = encontrado?.usuario.clave || "";
    }

    console.log("[Stripe webhook] checkout.session.completed", {
      eventoId: evento.id,
      sesionId: sesion.id,
      userId,
      clientReferenceId: sesion.client_reference_id,
      emailCliente,
      customerId,
      subscriptionId,
      paymentStatus: sesion.payment_status,
      amountTotal: sesion.amount_total,
      currency: sesion.currency,
      metadata: sesion.metadata,
    });

    if (!userId) {
      console.error(
        "[Stripe webhook] checkout.session.completed sin userId identificable",
        {
          sesionId: sesion.id,
          clientReferenceId: sesion.client_reference_id,
          emailCliente,
        },
      );

      // No devolvemos 500: un reintento no puede recuperar un userId que
      // no venía en la sesión. Queda registrado para revisión manual.
      return NextResponse.json({
        received: true,
        ignored: "sin_user_id",
      });
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

      await actualizarSuscripcionUsuario(userId, {
        customerId: customerId || undefined,
        subscriptionId: subscriptionId || undefined,
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

        // Asegura que el usuario ya existe en el índice administrativo sin
        // crear un pago con el precio canónico del plan.
        await sincronizarUsuarios(false);

        const totalCentimos =
          typeof sesion.amount_total === "number"
            ? sesion.amount_total
            : typeof sesion.amount_subtotal === "number"
              ? sesion.amount_subtotal
              : null;
        const totalPagado =
          totalCentimos === null ? null : totalCentimos / 100;
        const ivaConfig = obtenerIvaConfig();
        const precioBase =
          totalPagado === null
            ? precioBasePlan(plan)
            : totalPagado / (1 + ivaConfig / 100);
        const baseRedondeada =
          Math.round(precioBase * 100) / 100;
        const ivaPago =
          totalPagado === null
            ? Math.round(
                baseRedondeada * (ivaConfig / 100) * 100,
              ) / 100
            : Math.round((totalPagado - baseRedondeada) * 100) / 100;

        guardarPreciosUsuario(
          userId,
          baseRedondeada,
          ivaPago,
          fechaInicio.toISOString(),
          totalPagado ?? undefined,
        );

        const usuarioAdmin = obtenerUsuarioAdmin(userId);

        if (usuarioAdmin) {
          registrarPagoUnico(
            usuarioAdmin,
            `Suscripción ${plan}`,
            sesion.id,
          );
        }

        console.log("[Stripe webhook] Usuario actualizado a Premium", {
          userId,
          plan,
          importeStripe: totalPagado,
          precioBase: baseRedondeada,
          iva: ivaPago,
          fechaInicio: fechaInicio.toISOString(),
          fechaCaducidad: fechaCaducidad.toISOString(),
        });
      } else {
        console.warn(
          "[Stripe webhook] Pago completado sin plan válido en metadata",
          { userId, plan },
        );
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

      // Refresca el índice del panel para que el cambio de rol no se quede
      // únicamente en datos.txt.
      await sincronizarUsuarios();
      console.log("[Stripe webhook] Índice del panel sincronizado", {
        userId,
      });
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
