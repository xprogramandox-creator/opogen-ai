import { stripe } from "@/lib/stripe";
import {
  actualizarActivoDescuentoStripe,
  eliminarDescuentoStripeDb,
  guardarDescuentoStripe,
  listarDescuentosStripeDb,
} from "@/lib/admin-db";
import { diaAnalitico } from "@/lib/analitica";

export type EstadoDescuento =
  | "Activo"
  | "Programado"
  | "Caducado"
  | "Inactivo";

export type DescuentoAdmin = {
  promotionCodeId: string;
  codigo: string;
  descuento: string;
  fechaInicio: string;
  fechaFin: string | null;
  estado: EstadoDescuento;
  usos: number;
};

type EntradaCreacion = {
  codigo: string;
  tipo: "porcentaje" | "importe";
  valor: number;
  fechaInicio: string;
  fechaFin: string | null;
  activo: boolean;
};

function finDelDiaMadrid(fecha: string): number {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const base = new Date(
    Date.UTC(anio, mes - 1, dia, 23, 59, 59),
  );
  const formato = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const partes = Object.fromEntries(
    formato
      .formatToParts(base)
      .filter((parte) => parte.type !== "literal")
      .map((parte) => [parte.type, Number(parte.value)]),
  );
  const comoUtc = Date.UTC(
    partes.year,
    partes.month - 1,
    partes.day,
    partes.hour === 24 ? 0 : partes.hour,
    partes.minute,
    partes.second,
  );
  const offset = comoUtc - base.getTime();

  return Math.floor((base.getTime() - offset) / 1000);
}

function estadoDescuento(
  fechaInicio: string | null,
  fechaFin: string | null,
  activoStripe: boolean,
  activoManual = true,
): EstadoDescuento {
  const hoy = diaAnalitico();

  if (fechaFin && fechaFin < hoy) {
    return "Caducado";
  }

  if (!activoStripe || !activoManual) {
    return "Inactivo";
  }

  if (fechaInicio && fechaInicio > hoy) {
    return "Programado";
  }

  return "Activo";
}

function describirDescuento(cupon: {
  percent_off?: number | null;
  amount_off?: number | null;
  currency?: string | null;
}): string {
  if (typeof cupon.percent_off === "number") {
    return `${cupon.percent_off}%`;
  }

  if (typeof cupon.amount_off === "number") {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: (cupon.currency || "eur").toUpperCase(),
    }).format(cupon.amount_off / 100);
  }

  return "—";
}

export async function sincronizarPromocionesVigentes(): Promise<void> {
  const hoy = diaAnalitico();
  const descuentos = listarDescuentosStripeDb();

  await Promise.all(
    descuentos.map(async (descuento) => {
      if (!descuento.activoManual) return;
      if (descuento.fechaInicio > hoy) return;
      if (descuento.fechaFin && descuento.fechaFin < hoy) return;

      try {
        await stripe.promotionCodes.update(
          descuento.promotionCodeId,
          { active: true },
        );
      } catch (error) {
        console.error(
          "[descuentos] No se pudo activar el código",
          descuento.codigo,
          error,
        );
      }
    }),
  );
}

export async function crearDescuento(
  entrada: EntradaCreacion,
): Promise<DescuentoAdmin> {
  const codigo = entrada.codigo.trim().toUpperCase();
  const hoy = diaAnalitico();
  const activoStripe =
    entrada.activo && entrada.fechaInicio <= hoy;

  const cupon = await stripe.coupons.create({
    name: `OpoGen ${codigo}`,
    duration: "once",
    ...(entrada.tipo === "porcentaje"
      ? { percent_off: entrada.valor }
      : {
          amount_off: Math.round(entrada.valor * 100),
          currency: "eur",
        }),
  });

  let promotionCode:
    | Awaited<ReturnType<typeof stripe.promotionCodes.create>>
    | undefined;

  try {
    promotionCode = await stripe.promotionCodes.create({
      promotion: {
        type: "coupon",
        coupon: cupon.id,
      },
      code: codigo,
      active: activoStripe,
      ...(entrada.fechaFin
        ? { expires_at: finDelDiaMadrid(entrada.fechaFin) }
        : {}),
    });

    guardarDescuentoStripe({
      codigo,
      promotionCodeId: promotionCode.id,
      couponId: cupon.id,
      tipo: entrada.tipo,
      valor: entrada.valor,
      fechaInicio: entrada.fechaInicio,
      fechaFin: entrada.fechaFin,
      activoManual: entrada.activo,
    });
  } catch (error) {
    if (promotionCode) {
      await stripe.promotionCodes
        .update(promotionCode.id, { active: false })
        .catch(() => {});
    }

    await stripe.coupons.del(cupon.id).catch(() => {});
    throw error;
  }

  return {
    promotionCodeId: promotionCode.id,
    codigo,
    descuento:
      entrada.tipo === "porcentaje"
        ? `${entrada.valor}%`
        : new Intl.NumberFormat("es-ES", {
            style: "currency",
            currency: "EUR",
          }).format(entrada.valor),
    fechaInicio: entrada.fechaInicio,
    fechaFin: entrada.fechaFin,
    estado: estadoDescuento(
      entrada.fechaInicio,
      entrada.fechaFin,
      activoStripe,
      entrada.activo,
    ),
    usos: 0,
  };
}

export async function listarDescuentos(): Promise<DescuentoAdmin[]> {
  await sincronizarPromocionesVigentes();

  const db = new Map(
    listarDescuentosStripeDb().map((item) => [
      item.promotionCodeId,
      item,
    ]),
  );

  const promociones = [];
  let startingAfter: string | undefined;

  do {
    const pagina = await stripe.promotionCodes.list({
      limit: 100,
      expand: ["data.promotion.coupon"],
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    promociones.push(...pagina.data);
    startingAfter = pagina.has_more
      ? pagina.data.at(-1)?.id
      : undefined;
  } while (startingAfter);

  const vistos = new Set<string>();
  const resultado: DescuentoAdmin[] = promociones
    .filter((promocion) => db.has(promocion.id))
    .map(
    (promocion) => {
      vistos.add(promocion.id);

      const fila = db.get(promocion.id);
      const cupon =
        promocion.promotion.type === "coupon" &&
        typeof promocion.promotion.coupon !== "string"
          ? promocion.promotion.coupon
          : null;

      return {
        promotionCodeId: promocion.id,
        codigo: promocion.code,
        descuento: cupon ? describirDescuento(cupon) : "—",
        fechaInicio: fila?.fechaInicio || "—",
        fechaFin:
          fila?.fechaFin ||
          (promocion.expires_at
            ? new Date(promocion.expires_at * 1000)
                .toISOString()
                .slice(0, 10)
            : null),
        estado: estadoDescuento(
          fila?.fechaInicio || null,
          fila?.fechaFin ||
            (promocion.expires_at
              ? new Date(promocion.expires_at * 1000)
                  .toISOString()
                  .slice(0, 10)
              : null),
          promocion.active,
          fila?.activoManual ?? true,
        ),
        usos: promocion.times_redeemed,
      };
    },
  );

  // Códigos locales cuyo Promotion Code ya no existe en Stripe.
  for (const fila of db.values()) {
    if (vistos.has(fila.promotionCodeId)) continue;

    resultado.push({
      promotionCodeId: fila.promotionCodeId,
      codigo: fila.codigo,
      descuento:
        fila.tipo === "porcentaje"
          ? `${fila.valor}%`
          : new Intl.NumberFormat("es-ES", {
              style: "currency",
              currency: "EUR",
            }).format(fila.valor),
      fechaInicio: fila.fechaInicio,
      fechaFin: fila.fechaFin,
      estado: "Inactivo",
      usos: 0,
    });
  }

  return resultado.sort((a, b) =>
    a.codigo.localeCompare(b.codigo, "es"),
  );
}

export async function actualizarActivoDescuento(
  promotionCodeId: string,
  activo: boolean,
): Promise<void> {
  const hoy = diaAnalitico();
  const fila = listarDescuentosStripeDb().find(
    (item) => item.promotionCodeId === promotionCodeId,
  );

  const puedeEstarActivo =
    activo &&
    Boolean(fila) &&
    fila!.fechaInicio <= hoy &&
    (!fila!.fechaFin || fila!.fechaFin >= hoy);

  await stripe.promotionCodes.update(promotionCodeId, {
    active: puedeEstarActivo,
  });
  actualizarActivoDescuentoStripe(promotionCodeId, activo);
}

export async function eliminarDescuento(
  promotionCodeId: string,
): Promise<void> {
  const fila = listarDescuentosStripeDb().find(
    (item) => item.promotionCodeId === promotionCodeId,
  );

  let couponId = fila?.couponId || "";

  // Stripe es best-effort: si el código ya no existe o la API falla, el
  // borrado local debe continuar igualmente.
  if (!couponId) {
    try {
      const promocion = await stripe.promotionCodes.retrieve(
        promotionCodeId,
        { expand: ["promotion.coupon"] },
      );
      const cupon = promocion.promotion.coupon;

      if (cupon && typeof cupon !== "string") {
        couponId = cupon.id;
      } else if (typeof cupon === "string") {
        couponId = cupon;
      }
    } catch (error) {
      console.warn(
        "[descuentos] No se pudo recuperar el cupón en Stripe",
        error,
      );
    }
  }

  try {
    // El SDK actual no expone promotionCodes.del. Se desactiva el código
    // para impedir nuevos usos y se elimina el cupón subyacente.
    await stripe.promotionCodes.update(promotionCodeId, {
      active: false,
    });
  } catch (error) {
    console.warn(
      "[descuentos] No se pudo desactivar el Promotion Code; se continúa",
      error,
    );
  }

  if (couponId) {
    try {
      await stripe.coupons.del(couponId);
    } catch (error) {
      console.warn(
        "[descuentos] No se pudo eliminar el cupón; se continúa",
        error,
      );
    }
  }

  try {
    const cambios = eliminarDescuentoStripeDb(promotionCodeId);

    console.log("[descuentos] Código eliminado de SQLite", {
      promotionCodeId,
      cambios,
    });
  } catch (error) {
    console.error(
      "[descuentos] Error obligatorio al borrar SQLite",
      error,
    );
    throw new Error(
      "No se pudo eliminar el código de la base de datos. Inténtalo de nuevo.",
    );
  }
}

export { estadoDescuento };
