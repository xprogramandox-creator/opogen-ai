import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  BarChart3,
  FileText,
  Folder,
  LockKeyhole,
} from "lucide-react";
import BannerResumenes from "@/components/BannerResumenes";

export default async function MiEspacioBloqueado() {
  const t = await getTranslations("MiEspacioBloqueado");

  return (
    <main className="min-h-app bg-transparent p-4 font-sans text-[var(--txt)] sm:p-6 md:p-12">
      <div className="mx-auto max-w-6xl">
        <BannerResumenes variante="upgrade" />

        <section className="mt-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--azul)]/30 bg-[var(--sel)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--azul)]">
            <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
            {t("badge")}
          </span>
          <h1 className="mx-auto mt-4 max-w-2xl text-3xl font-black tracking-tight text-[var(--txt)] sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-pretty leading-relaxed text-[var(--txt2)]">
            {t("text")}
          </p>
          <Link
            href="/premium"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-[var(--azul)] px-6 py-3 text-sm font-bold text-[var(--btn-txt)] transition-colors hover:bg-[var(--azul-hover)]"
          >
            {t("cta")}
          </Link>
        </section>

        <div className="relative mt-10 overflow-hidden rounded-3xl border border-[var(--th)] bg-[var(--card)] p-4 shadow-[var(--sombra)] sm:p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none grid select-none gap-4 opacity-50 blur-[3px] sm:grid-cols-2"
          >
            {[0, 1].map((indice) => (
              <div
                key={indice}
                className="rounded-2xl border-2 border-[var(--azul)]/40 bg-[var(--azul)]/10 p-5"
              >
                <div className="flex items-center gap-3">
                  <Folder className="h-6 w-6 text-[var(--azul)]" />
                  <span className="font-black text-[var(--txt)]">
                    {indice === 0
                      ? t("folderName")
                      : `${t("folderName")} 2`}
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  {[
                    t("test"),
                    t("mixed"),
                    t("review"),
                    t("summaries"),
                  ].map((subcarpeta) => (
                    <div
                      key={subcarpeta}
                      className="flex items-center gap-2 rounded-lg border border-[var(--th)] bg-[var(--card2)] px-3 py-2 text-sm text-[var(--txt2)]"
                    >
                      {subcarpeta === t("summaries") ? (
                        <FileText className="h-4 w-4" />
                      ) : subcarpeta === t("review") ? (
                        <BarChart3 className="h-4 w-4" />
                      ) : (
                        <Folder className="h-4 w-4" />
                      )}
                      {subcarpeta}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="absolute inset-0 flex items-center justify-center bg-[var(--card)]/30 p-6">
            <div className="max-w-sm rounded-2xl border border-[var(--azul)]/30 bg-[var(--card)] p-6 text-center shadow-lg">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--sel)] text-[var(--azul)]">
                <LockKeyhole className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="mt-3 text-lg font-black text-[var(--txt)]">
                {t("lockedTitle")}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--txt2)]">
                {t("lockedText")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
