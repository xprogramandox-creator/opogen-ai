"use client";

import { useId } from "react";
import Link from "next/link";
import { ArrowRight, FileText, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

type Variante = "upgrade" | "premium";

export default function BannerResumenes({
  variante,
}: {
  variante: Variante;
}) {
  const t = useTranslations("BannerResumenes");
  const tituloId = useId();
  const esPremium = variante === "premium";
  const titulo = esPremium ? t("premiumTitle") : t("upgradeTitle");
  const texto = esPremium ? t("premiumText") : t("upgradeText");
  const cta = esPremium ? t("premiumCta") : t("upgradeCta");
  const href = esPremium ? "/mi-espacio" : "/premium";

  return (
    <section
      aria-labelledby={tituloId}
      className="my-6 w-full overflow-hidden rounded-2xl border border-[var(--azul)]/30 bg-[var(--sel)] p-5 text-[var(--txt)] shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--azul)]/10 text-[var(--azul)]">
            <FileText className="h-6 w-6" aria-hidden="true" />
            <Sparkles
              className="absolute -right-1 -top-1 h-4 w-4"
              aria-hidden="true"
            />
          </span>

          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--azul)]">
              {t("eyebrow")}
            </p>
            <h2
              id={tituloId}
              className="mt-1 text-lg font-black tracking-tight text-[var(--txt)] sm:text-xl"
            >
              {titulo}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--txt2)]">
              {texto}
            </p>
          </div>
        </div>

        <Link
          href={href}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--azul)] px-5 py-3 text-sm font-bold text-[var(--btn-txt)] transition-colors hover:bg-[var(--azul-hover)]"
        >
          {cta}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
