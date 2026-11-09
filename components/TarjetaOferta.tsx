"use client";

import { useRouter } from "next/navigation";
import { Check, Crown, Gem } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSesion } from "@/components/SessionProvider";
import { useAuthModal } from "@/components/AuthModalProvider";
import type { PlanStripe } from "@/lib/plan-pendiente";

const planes = [
  { id: "monthly", Icono: null },
  { id: "semestral", Icono: Crown },
  { id: "annual", Icono: Gem },
] as const;

const PRECIOS_BASE: Record<(typeof planes)[number]["id"], number> = {
  monthly: 9,
  semestral: 48,
  annual: 84,
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

  const formatoMoneda = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  function elegirPlan(id: (typeof planes)[number]["id"]) {
    if (cargando) return;

    if (sesion) {
      router.push(`/checkout?plan=${PLAN_STRIPE[id]}`);
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

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {planes.map(({ id, Icono }) => {
            const nombre = t(`offer.plans.${id}.name`);
            const precio = formatoMoneda.format(
              PRECIOS_BASE[id] * (1 + IVA),
            );
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
                <div className="mb-2 flex min-h-5 items-center justify-between gap-2">
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
                  ) : (
                    <span />
                  )}

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

                <p className="mt-1 flex items-baseline gap-1 text-[var(--txt)]">
                  <span className="text-4xl font-bold tracking-tight">
                    {precio}
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
              </button>
            );
          })}
        </div>

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
  );
}

