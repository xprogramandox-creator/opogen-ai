"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import TituloPagina, { CLASE_SUBTITULO_PAGINA } from "@/components/TituloPagina";

const ETAPAS = [
  {
    edadKey: "stageExplorersAge",
    codigo: "3-6",
    etapaKey: "stageExplorers",
    subtituloKey: "stageExplorersSubtitle",
    icono: "🧸",
    clase: "text-[var(--txt)]",
  },
  {
    edadKey: "stageAventurersAge",
    codigo: "6-9",
    etapaKey: "stageAventurers",
    subtituloKey: "stageAventurersSubtitle",
    icono: "🚀",
    clase: "text-[var(--txt)]",
  },
  {
    edadKey: "stageGeniusesAge",
    codigo: "9-12",
    etapaKey: "stageGeniuses",
    subtituloKey: "stageGeniusesSubtitle",
    icono: "🧠",
    clase: "text-[var(--txt)]",
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

      <section className="relative mx-auto max-w-6xl px-5 pb-12 text-center sm:px-8 sm:pb-16">
        <TituloPagina marca={t("brand")} sufijo={t("brandKids")} />

        <h2 className="mx-auto mt-8 max-w-3xl text-balance text-3xl font-bold tracking-tight text-[var(--txt)] sm:text-5xl">
          {t("question")}
        </h2>

        <p className={CLASE_SUBTITULO_PAGINA}>
          {t("intro")}
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-3">
          {ETAPAS.map((etapa) => (
            <button
              key={etapa.codigo}
              type="button"
              onClick={() => elegirEtapa(etapa.codigo)}
              aria-label={`${t(etapa.etapaKey)}: ${t(etapa.edadKey)}`}
              className={`group relative min-h-[210px] cursor-pointer overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-sky-100/80 to-blue-300/65 p-5 text-left shadow-xl ring-1 ring-inset ring-sky-200/40 backdrop-blur-md transition-transform duration-300 hover:-translate-y-1 hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--azul)]/60 dark:border-white/10 dark:bg-none dark:bg-[#141b2d]/50 dark:ring-sky-400/20 sm:p-6 ${etapa.clase}`}
            >
              <span
                className="absolute -right-4 -top-4 text-8xl opacity-20 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110"
                aria-hidden="true"
              >
                {etapa.icono}
              </span>

              <span className="relative flex h-full flex-col">
                <span className="text-5xl" aria-hidden="true">
                  {etapa.icono}
                </span>

                <span className="mt-3 text-xs font-bold uppercase tracking-widest opacity-80">
                  {t(etapa.etapaKey)}
                </span>

                <span className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  {t(etapa.edadKey)}
                </span>

                <span className="mt-2 text-sm font-bold opacity-90">
                  {t(etapa.subtituloKey)}
                </span>

                <span className="mt-auto pt-4 text-xs font-bold uppercase tracking-wide underline decoration-2 underline-offset-4">
                  {t("go")}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-3xl rounded-3xl border border-white/40 bg-gradient-to-br from-sky-100/80 to-blue-300/65 p-5 text-left shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-none dark:bg-[#141b2d]/50 dark:ring-sky-400/20 sm:p-6">
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
