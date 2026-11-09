"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

const ETAPAS = [
  {
    edadKey: "stageExplorersAge",
    codigo: "3-6",
    etapaKey: "stageExplorers",
    subtituloKey: "stageExplorersSubtitle",
    icono: "🧸",
    clase:
      "bg-[var(--azul)]/10 text-[var(--txt)]",
  },
  {
    edadKey: "stageAventurersAge",
    codigo: "6-9",
    etapaKey: "stageAventurers",
    subtituloKey: "stageAventurersSubtitle",
    icono: "🚀",
    clase:
      "bg-[var(--azul)]/10 text-[var(--txt)]",
  },
  {
    edadKey: "stageGeniusesAge",
    codigo: "9-12",
    etapaKey: "stageGeniuses",
    subtituloKey: "stageGeniusesSubtitle",
    icono: "🧠",
    clase:
      "bg-[var(--azul)]/10 text-[var(--txt)]",
  },
] as const;

export default function KidsPage() {
  const router = useRouter();
  const t = useTranslations("Kids");

  function elegirEtapa(codigo: string): void {
    try {
      window.localStorage.setItem("kids_age", codigo);
    } catch {
      // Si localStorage no está disponible, la navegación continúa.
    }

    router.push("/kids/temas");
  }

  return (
    <main
      id="contenido"
      className="relative min-h-app overflow-hidden bg-transparent"
    >

      <section className="relative mx-auto max-w-6xl px-5 py-12 text-center sm:px-8 sm:py-16">
        <h1 className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[clamp(40px,12vw,66px)] font-semibold leading-none tracking-[-1px] text-[var(--txt)]">
          <span className="bg-gradient-to-r from-[var(--azul)] via-[#7c3aed] to-[#06b6d4] dark:via-[#a78bfa] dark:to-[#22d3ee] bg-clip-text text-transparent">
            {t("brand")}
          </span>
          <span className="text-[var(--txt)]">{t("brandKids")}</span>
        </h1>

        <h2 className="mx-auto mt-8 max-w-3xl text-balance text-3xl font-bold tracking-tight text-[var(--txt)] sm:text-5xl">
          {t("question")}
        </h2>

        <p className="mx-auto mt-0.5 max-w-xl text-pretty text-sm text-[#7b7266] dark:text-[#8a847a]">
          {t("intro")}
        </p>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:mt-14 sm:grid-cols-3">
          {ETAPAS.map((etapa) => (
            <button
              key={etapa.codigo}
              type="button"
              onClick={() => elegirEtapa(etapa.codigo)}
              aria-label={`${t(etapa.etapaKey)}: ${t(etapa.edadKey)}`}
              className={`group relative min-h-[280px] cursor-pointer overflow-hidden rounded-3xl ${etapa.clase} p-8 text-left shadow-xl transition-transform duration-300 hover:-translate-y-1 hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--azul)]/60`}
            >
              <span
                className="absolute -right-4 -top-4 text-8xl opacity-20 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110"
                aria-hidden="true"
              >
                {etapa.icono}
              </span>

              <span className="relative flex h-full flex-col">
                <span className="text-6xl" aria-hidden="true">
                  {etapa.icono}
                </span>

                <span className="mt-5 text-sm font-bold uppercase tracking-widest opacity-80">
                  {t(etapa.etapaKey)}
                </span>

                <span className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                  {t(etapa.edadKey)}
                </span>

                <span className="mt-3 text-base font-bold opacity-90">
                  {t(etapa.subtituloKey)}
                </span>

                <span className="mt-auto pt-6 text-sm font-bold uppercase tracking-wide underline decoration-2 underline-offset-4">
                  {t("go")}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-3xl rounded-3xl border border-[var(--th)] bg-[var(--card)] p-6 text-left shadow-lg dark:border-[var(--th)] dark:bg-[var(--card)] sm:p-8">
          <h3 className="text-xl font-bold text-[var(--txt)] sm:text-2xl">
            {t("infoTitle")}
          </h3>

          <p className="mt-3 text-sm leading-relaxed text-[var(--txt2)] sm:text-base">
            {t("infoIntro")}
          </p>

          <ul className="mt-5 grid gap-3 text-sm text-[var(--txt2)] sm:text-base">
            <li className="flex gap-3">
              <span aria-hidden="true">🧠</span>
              <span>
                <strong className="font-bold text-[var(--txt)]">
                  {t("infoAgilidadTitle")}
                </strong>{" "}
                {t("infoAgilidadText")}
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true">💡</span>
              <span>
                <strong className="font-bold text-[var(--txt)]">
                  {t("infoCuriosidadTitle")}
                </strong>{" "}
                {t("infoCuriosidadText")}
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true">🏆</span>
              <span>
                <strong className="font-bold text-[var(--txt)]">
                  {t("infoConfianzaTitle")}
                </strong>{" "}
                {t("infoConfianzaText")}
              </span>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
