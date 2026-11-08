import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  buscarUsuarioPorCorreo,
  esClaveUsuarioValida,
  guardarUsuario,
  hashPassword,
  leerUsuario,
  type UsuarioRegistrado,
} from "@/lib/auth-server";
import { stripe } from "@/lib/stripe";
import {
  buscarPais,
  normalizarCodigoPais,
  normalizarNumeroTelefono,
} from "@/lib/telefono";
import { sanearTexto } from "@/lib/saneamiento";
import { correoValido, nombreValido } from "@/lib/validacion";
import {
  PRECIOS_STRIPE,
  esPlanStripe,
} from "@/lib/stripe-precios";
import { obtenerUrlBase } from "@/lib/url-base";
import { sincronizarPromocionesVigentes } from "@/lib/descuentos";

export async function POST(request: Request) {
  const cuerpo: unknown = await request.json().catch(() => null);

  if (!cuerpo || typeof cuerpo !== "object") {
    return NextResponse.json(
      { error: "Solicitud no válida." },
      { status: 400 },
    );
  }

  const datos = cuerpo as Record<string, unknown>;
  const nombre =
    typeof datos.nombre === "string" ? sanearTexto(datos.nombre) : "";
  const correo =
    typeof datos.correo === "string" ? sanearTexto(datos.correo) : "";
  const codigoBruto =
    typeof datos.codigo === "string" ? datos.codigo.trim() : "";
  const numeroBruto =
    typeof datos.numero === "string" ? datos.numero.trim() : "";
  const plan = datos.plan;

  if (!esPlanStripe(plan)) {
    return NextResponse.json(
      { error: "Plan no válido." },
      { status: 400 },
    );
  }

  if (!nombreValido(nombre)) {
    return NextResponse.json(
      { error: "El nombre solo puede contener letras y espacios." },
      { status: 400 },
    );
  }

  if (!correoValido(correo)) {
    return NextResponse.json(
      { error: "El correo electrónico no es válido." },
      { status: 400 },
    );
  }

  if (!/^\d{1,4}$/.test(codigoBruto) || !/^\d{4,15}$/.test(numeroBruto)) {
    return NextResponse.json(
      { error: "El teléfono no es válido." },
      { status: 400 },
    );
  }

  const codigo = normalizarCodigoPais(codigoBruto);
  const numero = normalizarNumeroTelefono(numeroBruto);

  if (!buscarPais(codigo)) {
    return NextResponse.json(
      { error: "El código de país no es válido." },
      { status: 400 },
    );
  }

  const clave = `${codigo}_${numero}`;

  if (!esClaveUsuarioValida(clave)) {
    return NextResponse.json(
      { error: "El teléfono no es válido." },
      { status: 400 },
    );
  }

  if (await leerUsuario(clave)) {
    return NextResponse.json(
      { error: "Ya existe una cuenta con este teléfono." },
      { status: 409 },
    );
  }

  if (await buscarUsuarioPorCorreo(correo)) {
    return NextResponse.json(
      { error: "Ya existe una cuenta con este correo electrónico." },
      { status: 409 },
    );
  }

  const tokenVerificacion = randomUUID();
  const tokenVerificacionExpira = Date.now() + 24 * 60 * 60 * 1000;

  const usuario: UsuarioRegistrado = {
    nombre,
    telefono: clave,
    passwordHash: await hashPassword(randomUUID()),
    correo,
    clave,
    rol: "freemium",
    emailVerificado: false,
    tokenVerificacion,
    tokenVerificacionExpira,
  };

  try {
    await guardarUsuario(usuario);
  } catch {
    return NextResponse.json(
      { error: "Ya existe una cuenta con estos datos." },
      { status: 409 },
    );
  }

  const origen = obtenerUrlBase(new URL(request.url).origin);
  const metadata = { userId: clave, plan, nombre };

  try {
    await sincronizarPromocionesVigentes().catch((error) => {
      console.warn(
        "[Stripe checkout invitado] No se sincronizaron los descuentos",
        error,
      );
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: PRECIOS_STRIPE[plan], quantity: 1 }],
      customer_email: correo,
      success_url: `${origen}/dashboard?checkout=success`,
      cancel_url: `${origen}/checkout?plan=${plan}&cancel=1`,
      allow_promotion_codes: true,
      metadata,
      subscription_data: { metadata },
      client_reference_id: clave,
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

    console.error("[Stripe checkout invitado]", {
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
