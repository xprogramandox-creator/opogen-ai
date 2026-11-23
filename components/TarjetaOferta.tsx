"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Crown, Gem, Sparkles, X } from "lucide-react";
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
      <section aria-label={t("offer.title")} className="relative mb-8">
        <div className="text-center">

        {teaser || promoActiva ? (
          <p className="mx-auto mt-3 inline-flex max-w-2xl items-center gap-2 rounded-xl border border-[var(--azul)]/20 bg-[var(--sel)]/60 px-3 py-1.5 text-xs font-semibold leading-snug text-[var(--azul)]">
            <Sparkles
              className="h-3.5 w-3.5 shrink-0"
              strokeWidth={2}
              aria-hidden="true"
            />
            {teaser
              ? t("offer.blackFriday.teaserNotice")
              : t("offer.blackFriday.notice")}
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <article className="relative flex h-full flex-col overflow-hidden rounded-xl border border-[var(--th)] bg-[var(--card)] text-left shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transform-none">
            <div className="flex min-h-[72px] flex-col items-center justify-center gap-1 px-2.5 pb-2 pt-3">
              <span className="inline-flex rounded-full border border-[var(--th)] bg-[var(--card2)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--txt2)]">
                {t("offer.freemium.badge")}
              </span>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--txt3)]">
                {t("offer.freemium.name")}
              </p>
            </div>

            <div className="w-full border-y border-[var(--th)] bg-[var(--card2)] px-2.5 py-3 text-center text-[var(--txt)]">
              <p className="flex flex-wrap items-baseline justify-center gap-x-1.5">
                <span className="text-2xl font-bold tracking-tight">
                  {formatoMoneda.format(0)}
                </span>
                <span className="text-xs font-semibold text-[var(--txt3)]">
                  {t("offer.perMonth")}
                </span>
              </p>
              <p className="mt-1 text-[10px] font-medium text-[var(--txt3)]">
                {t("offer.freemium.vat")}
              </p>
              <p className="mt-1 text-[10px] leading-snug text-[var(--txt2)]">
                {t("offer.freemium.detail")}
              </p>
            </div>

            <ul className="flex flex-1 flex-col gap-1 px-2.5 py-2.5">
              {(["daily", "noPdf", "noSummary"] as const).map(
                (beneficio) => (
                  <li
                    key={beneficio}
                    className="flex items-start gap-2 text-[10px] font-medium leading-snug text-[var(--txt2)]"
                  >
                    <Check
                      className="mt-[1px] h-2.5 w-2.5 shrink-0 text-[var(--ok-t)]"
                      strokeWidth={3}
                      aria-hidden="true"
                    />
                    {t(`offer.freemium.benefits.${beneficio}`)}
                  </li>
                ),
              )}
              {(["noKids", "noSpace", "noAgenda", "noStats"] as const).map(
                (limite) => (
                  <li
                    key={limite}
                    className="flex items-start gap-2 text-[10px] font-medium leading-snug text-[var(--txt3)]"
                  >
                    <X
                      className="mt-[1px] h-2.5 w-2.5 shrink-0 text-red-500"
                      strokeWidth={3}
                      aria-hidden="true"
                    />
                    {t(`offer.freemium.limits.${limite}`)}
                  </li>
                ),
              )}
            </ul>

            <div className="px-2.5 pb-2.5">
              <button
                type="button"
                onClick={() => abrirAuth("registro")}
                className="inline-flex w-full items-center justify-center rounded-xl border-2 border-[var(--azul)] bg-[var(--card)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--azul)] transition-colors hover:bg-[var(--sel)]"
              >
                {t("offer.freemium.cta")}
              </button>
            </div>
          </article>

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
              <article
                key={id}
                className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-[var(--th)] bg-[var(--card)] text-left shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transform-none"
              >
                {teaser ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-[var(--azul)]/45 to-transparent"
                  />
                ) : null}

                <div className="flex min-h-[72px] flex-col items-center justify-center gap-1 px-2.5 pb-2 pt-3">
                  <div className="flex min-h-5 flex-wrap items-center justify-center gap-1.5">
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

                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--txt3)]">
                    {nombre}
                  </p>
                </div>

                <div
                  className={`w-full px-2.5 py-3 text-center ${
                    esRecomendado
                      ? "bg-[var(--azul)] text-white"
                      : esMejor
                        ? "bg-[var(--ambar)] text-[var(--txt)]"
                        : "bg-[var(--sel)] text-[var(--txt)]"
                  }`}
                >
                  {promoActiva || teaser ? (
                    <span
                      className={`mb-1.5 inline-flex items-center gap-1 rounded-full border px-1.5 py-[2px] text-[9px] font-bold uppercase tracking-wide ${
                        esRecomendado
                          ? "border-white/30 bg-white/15 text-white"
                          : "border-[var(--txt)]/15 bg-[var(--txt)] text-[var(--card)]"
                      }`}
                    >
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

                  {promoActiva ? (
                    <p
                      className={`text-xs font-semibold line-through ${
                        esRecomendado
                          ? "text-white/70 decoration-white/60"
                          : "text-[var(--txt3)] decoration-[var(--txt3)]/70"
                      }`}
                    >
                      {formatoMoneda.format(precioBase)}
                    </p>
                  ) : null}

                  <p className="flex flex-wrap items-baseline justify-center gap-x-1.5">
                    <span className="text-2xl font-bold tracking-tight">
                      {formatoMoneda.format(precioMostrado)}
                    </span>
                    {id === "monthly" ? (
                      <span
                        className={`text-xs font-semibold ${
                          esRecomendado
                            ? "text-white/80"
                            : "text-[var(--txt3)]"
                        }`}
                      >
                        {t("offer.perMonth")}
                      </span>
                    ) : null}
                  </p>

                  <p
                    className={`mt-1 text-[11px] font-medium ${
                      esRecomendado ? "text-white/80" : "text-[var(--txt3)]"
                    }`}
                  >
                    {t("offer.vatIncluded")}
                  </p>

                  <p
                    className={`mt-1 text-[11px] leading-snug ${
                      esRecomendado ? "text-white/85" : "text-[var(--txt2)]"
                    }`}
                  >
                    {detalle}
                  </p>

                  {promoActiva ? (
                    <p
                      className={`mt-1 text-[10px] font-medium leading-snug ${
                        esRecomendado
                          ? "text-white/75"
                          : "text-[var(--txt3)]"
                      }`}
                    >
                      {t("offer.blackFriday.codeHint")}
                    </p>
                  ) : null}
                </div>

                <ul className="flex flex-1 flex-col gap-1 px-2.5 py-2.5">
                  {ventajas.map((ventaja) => (
                    <li
                      key={ventaja}
                      className="flex items-start gap-2 text-[10px] font-medium leading-snug text-[var(--txt2)]"
                    >
                      <Check
                        className="mt-[1px] h-2.5 w-2.5 shrink-0 text-[var(--ok-t)]"
                        strokeWidth={3}
                        aria-hidden="true"
                      />
                      {t(`offer.benefits.${ventaja}`)}
                    </li>
                  ))}
                </ul>

                <div className="px-2.5 pb-2.5">
                  <button
                    type="button"
                    onClick={() => elegirPlan(id)}
                    aria-label={`${t("offer.choose")} ${nombre}`}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--azul)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--btn-txt)] transition-colors hover:bg-[var(--azul-hover)]"
                  >
                    {t("offer.choose")}
                  </button>
                </div>
              </article>
            );
          })}
        </div>


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

