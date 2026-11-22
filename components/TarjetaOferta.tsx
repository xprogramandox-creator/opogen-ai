"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Crown, Gem, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSesion } from "@/components/SessionProvider";
import { useAuthModal } from "@/components/AuthModalProvider";
import CheckoutModal from "@/components/CheckoutModal";
import type { PlanCheckout } from "@/components/CheckoutForm";
import type { PlanStripe } from "@/lib/plan-pendiente";
import {
  estaEnBlackFriday,
  estaEnTeaser,
  precioConDescuento,
} from "@/lib/black-friday";

const planes = [
  { id: "monthly", Icono: null },
  { id: "semestral", Icono: Crown },
  { id: "annual", Icono: Gem },
] as const;

const PRECIOS_BASE: Record<(typeof planes)[number]["id"], number> = {
  monthly: 9,
  semestral: 48,
  annual: 69.42,
};

const IVA = 0.21;

const PLAN_STRIPE: Record<(typeof planes)[number]["id"], PlanStripe> = {
  monthly: "mensual",
  semestral: "semestral",
  annual: "anual",
};

const ventajas = ["unlimited", "questions", "pdf", "space"] as const;

export default function TarjetaOferta() {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const router = useRouter();
  const { sesion, cargando } = useSesion();
  const { abrirAuth } = useAuthModal();
  const [planCheckout, setPlanCheckout] =
    useState<PlanCheckout | null>(null);
  // Modo de la promoción, calculado una sola vez por montaje. Las fechas se
  // comparan en UTC: "teaser" anuncia sin rebajar y "blackFriday" rebaja.
  const [modoPromo] = useState<"ninguno" | "teaser" | "blackFriday">(() => {
    if (estaEnBlackFriday()) return "blackFriday";
    if (estaEnTeaser()) return "teaser";
    return "ninguno";
  });
  const promoActiva = modoPromo === "blackFriday";
  const teaser = modoPromo === "teaser";

  const formatoMoneda = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  function elegirPlan(id: (typeof planes)[number]["id"]) {
    if (cargando) return;

    if (sesion) {
      if (!sesion.correo || !sesion.telefono) {
        router.push(`/checkout?plan=${PLAN_STRIPE[id]}`);
        return;
      }

      setPlanCheckout(PLAN_STRIPE[id]);
      return;
    }

    // Invitado: registro completo con el plan y la duración ya elegidos.
    // AuthDialog continúa automáticamente hacia Stripe tras crear la cuenta.
    abrirAuth("registro", {
      plan: "premium",
      duracion: PLAN_STRIPE[id],
    });
  }

  return (
    <>
      <section
      aria-labelledby="oferta-premium"
      className="relative mb-8 overflow-hidden rounded-3xl border-2 border-[var(--azul)]/30 p-6 shadow-[var(--sombra-fuerte)] sm:p-8"
      style={{
        background:
          "linear-gradient(135deg, var(--sel), var(--card) 60%)",
      }}
    >
      <div className="relative">
        <span className="inline-flex rounded-full border border-[var(--ambar-b)] bg-[var(--ambar)] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--ambar-t)]">
          {t("offer.launch")}
        </span>

        <h2
          id="oferta-premium"
          className="mt-4 text-balance text-2xl font-bold tracking-tight text-[var(--txt)] sm:text-3xl"
        >
          {t("offer.title")}
        </h2>

        <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-[var(--txt2)]">
          {t("offer.subtitle")}
        </p>

        {teaser ? (
          <p className="mt-4 inline-flex max-w-2xl items-center gap-2 rounded-xl border border-[var(--azul)]/20 bg-[var(--sel)]/60 px-3 py-1.5 text-xs font-semibold leading-snug text-[var(--azul)]">
            <Sparkles
              className="h-3.5 w-3.5 shrink-0"
              strokeWidth={2}
              aria-hidden="true"
            />
            {t("offer.blackFriday.teaserNotice")}
          </p>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {planes.map(({ id, Icono }) => {
            const nombre = t(`offer.plans.${id}.name`);
            const precioBase = PRECIOS_BASE[id] * (1 + IVA);
            const precioMostrado = promoActiva
              ? precioConDescuento(precioBase)
              : precioBase;
            const detalle = t(`offer.plans.${id}.detail`);
            const badge = t(`offer.plans.${id}.badge`);
            const esRecomendado = id === "semestral";
            const esMejor = id === "annual";

            return (
              <button
                key={id}
                type="button"
                onClick={() => elegirPlan(id)}
                aria-label={`${t("offer.choose")} ${nombre}`}
                className={`group relative flex w-full flex-col rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] ${
                  esRecomendado
                    ? "border-[var(--azul)]/40 bg-[var(--card)]"
                    : esMejor
                      ? "border-[var(--ambar-b)] bg-[var(--card)]"
                      : "border-[var(--th)] bg-[var(--card2)]"
                }`}
              >
                {teaser ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-transparent via-[var(--azul)]/45 to-transparent"
                  />
                ) : null}

                <div className="mb-2 flex min-h-5 items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    {badge ? (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          esRecomendado
                            ? "bg-[var(--sel)] text-[var(--azul)]"
                            : "bg-[var(--ambar)] text-[var(--ambar-t)]"
                        }`}
                      >
                        {badge}
                      </span>
                    ) : null}

                    {promoActiva || teaser ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--txt)]/15 bg-[var(--txt)] px-1.5 py-[2px] text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--card)]">
                        {teaser ? (
                          <Sparkles
                            className="h-2 w-2"
                            strokeWidth={2.5}
                            aria-hidden="true"
                          />
                        ) : null}
                        {teaser
                          ? t("offer.blackFriday.teaserBadge")
                          : t("offer.blackFriday.badge")}
                      </span>
                    ) : null}
                  </div>

                  {Icono ? (
                    <Icono
                      className={`h-5 w-5 ${
                        esRecomendado
                          ? "text-[var(--azul)]"
                          : "text-[var(--ambar-t)]"
                      }`}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  ) : null}
                </div>

                <p className="text-xs font-bold uppercase tracking-wide text-[var(--txt3)]">
                  {nombre}
                </p>

                <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[var(--txt)]">
                  {promoActiva ? (
                    <span className="text-sm font-semibold text-[var(--txt3)] line-through decoration-[var(--txt3)]/70">
                      {formatoMoneda.format(precioBase)}
                    </span>
                  ) : null}
                  <span className="text-4xl font-bold tracking-tight">
                    {formatoMoneda.format(precioMostrado)}
                  </span>
                  {id === "monthly" ? (
                    <span className="text-sm font-semibold text-[var(--txt3)]">
                      {t("offer.perMonth")}
                    </span>
                  ) : null}
                </p>

                <p className="mt-1 text-[11px] font-medium text-[var(--txt3)]">
                  {t("offer.vatIncluded")}
                </p>

                <p className="mt-1 text-[11px] leading-snug text-[var(--txt2)]">
                  {detalle}
                </p>

                <span className="mt-4 inline-flex items-center justify-center rounded-xl bg-[var(--azul)] px-3 py-2 text-xs font-bold text-[var(--btn-txt)] transition-colors group-hover:bg-[var(--azul-hover)]">
                  {t("offer.choose")}
                </span>

                {promoActiva ? (
                  <span className="mt-2 text-balance text-center text-[10px] font-medium leading-snug text-[var(--txt3)]">
                    {t("offer.blackFriday.codeHint")}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {promoActiva ? (
          <p className="mt-4 rounded-xl border border-[var(--azul)]/25 bg-[var(--sel)] px-3 py-2 text-center text-xs font-semibold text-[var(--azul)]">
            {t("offer.blackFriday.notice")}
          </p>
        ) : null}

        <ul className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {ventajas.map((ventaja) => (
            <li
              key={ventaja}
              className="flex items-start gap-2 text-sm font-medium text-[var(--txt2)]"
            >
              <Check
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ok-t)]"
                strokeWidth={3}
                aria-hidden="true"
              />
              {t(`offer.benefits.${ventaja}`)}
            </li>
          ))}
        </ul>
      </div>
    </section>

      {planCheckout && sesion?.correo && sesion.telefono ? (
        <CheckoutModal
          plan={planCheckout}
          usuario={{
            nombre: sesion.nombre,
            correo: sesion.correo,
            telefono: sesion.telefono,
          }}
          onClose={() => setPlanCheckout(null)}
        />
      ) : null}
    </>
  );
}

