import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import LegalContenido from "@/components/LegalContenido";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Legal");

  return {
    title: t("privacidad.title"),
    description: t("privacidad.description"),
  };
}

export default async function PoliticaPrivacidadPage() {
  const t = await getTranslations("Legal");
  const locale = await getLocale();
  const nota = t("common.translationNote");

  return (
    <main id="contenido" className="min-h-app bg-transparent font-sans">
      <section className="mx-auto max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
        <article className="rounded-3xl border border-[var(--th)] bg-[var(--card)] p-6 shadow-[var(--sombra)] sm:p-10">
          <Link
            href="/"
            className="mb-7 inline-flex items-center gap-2 rounded-xl border border-[var(--th)] bg-[var(--card2)] px-4 py-2 text-sm font-bold text-[var(--txt)] transition-colors hover:bg-[var(--suave2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2"
          >
            <span aria-hidden="true">←</span>
            {t("common.back")}
          </Link>

          <h1 className="font-serif text-balance text-3xl font-medium tracking-tight text-[var(--txt)] sm:text-4xl">
            {t("privacidad.title")}
          </h1>

          <p className="mt-4 text-sm text-[var(--txt3)]">
            {t("common.updated")}
          </p>

          {locale !== "es" && nota ? (
            <p className="mt-4 rounded-xl border border-[var(--ambar-b)] bg-[var(--ambar)] px-4 py-3 text-sm font-medium text-[var(--ambar-t)]">
              {nota}
            </p>
          ) : null}

          <LegalContenido body={t("privacidad.body")} />
        </article>
      </section>
    </main>
  );
}
