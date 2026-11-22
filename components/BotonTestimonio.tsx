"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, MessageSquareQuote, X } from "lucide-react";
import FormularioTestimonio from "@/components/FormularioTestimonio";

type Props = {
  nombreInicial: string;
};

export default function BotonTestimonio({ nombreInicial }: Props) {
  const t = useTranslations("Dashboard");
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="group mb-8 flex w-full items-center gap-4 rounded-3xl border border-[var(--th)] bg-[var(--card)] p-5 text-left shadow-[var(--sombra)] transition-colors hover:border-[var(--azul)]/40 hover:bg-[var(--suave)]"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--sel)] text-[var(--azul)]">
          <MessageSquareQuote className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold text-[var(--txt)]">
            {t("testimonialButton")}
          </span>
          <span className="mt-0.5 block text-sm text-[var(--txt2)]">
            {t("testimonialButtonHint")}
          </span>
        </span>
        <ArrowRight
          className="h-4 w-4 shrink-0 text-[var(--azul)] transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
          aria-hidden="true"
        />
      </button>

      {abierto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="testimonio-modal-titulo"
            className="w-full max-w-lg rounded-3xl border border-[var(--th)] bg-[var(--card)] p-6 shadow-2xl sm:p-8"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2
                  id="testimonio-modal-titulo"
                  className="text-xl font-bold tracking-tight text-[var(--txt)]"
                >
                  {t("testimonialModalTitle")}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-[var(--txt2)]">
                  {t("testimonialForm.hint")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label={t("testimonialForm.close")}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--txt3)] transition-colors hover:bg-[var(--card2)] hover:text-[var(--txt)]"
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>

            <FormularioTestimonio
              nombreInicial={nombreInicial}
              compacto
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
