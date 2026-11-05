import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowRight,
  CloudUpload,
  FolderKanban,
  Gamepad2,
  GraduationCap,
  RotateCcw,
  Settings2,
  Sparkles,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import { routing } from "@/i18n/routing";
import RedirigirSiSesion from "@/components/RedirigirSiSesion";
import TarjetaOferta from "@/components/TarjetaOferta";
import BotonAuth from "@/components/BotonAuth";
import ExamenHero from "@/components/ExamenHero";

export const metadata: Metadata = {
  title: "OpoGen AI | Convierte tus apuntes en exámenes",
  description:
    "Sube tus apuntes y genera exámenes tipo test personalizados con inteligencia artificial. Ideal para oposiciones, bachillerato, universidad y secundaria.",
};

export const instant = false;

const caracteristicas = [
  { id: "generation", Icono: Sparkles },
  { id: "level", Icono: GraduationCap },
  { id: "space", Icono: FolderKanban },
  { id: "mistakes", Icono: RotateCcw },
] as const;

const pasos = [
  { numero: "1", id: "upload", Icono: CloudUpload },
  { numero: "2", id: "configure", Icono: Settings2 },
  { numero: "3", id: "learn", Icono: TrendingUp },
] as const;

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "Landing" });
  const usuario = await obtenerUsuarioSesion();
  const mostrarOfertaPremium = !usuario || usuario.rol === "freemium";
  const ctaKids =
    usuario?.rol === "premium" ? "/kids" : "/premium";

  if (usuario) {
    redirect("/dashboard");
  }

  return (
    <>
      <a href="#contenido" className="skip-link">
        {t("skip")}
      </a>

      <main
        id="contenido"
        className="relative min-h-app bg-transparent font-sans"
      >
        <RedirigirSiSesion />

        {/* HERO */}
        <section
          aria-labelledby="titulo-principal"
          className="relative z-10 border-b border-[#1f1b16]/10 bg-[#f7f4ee] dark:border-[#efe9de]/10 dark:bg-[#12110f]"
        >
          <div className="mx-auto max-w-6xl px-5 pb-20 pt-14 sm:px-6 lg:pb-28 lg:pt-24">
            <div className="animate-fade-in-up grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <div className="max-w-xl">
                <h1
                  id="titulo-principal"
                  className="font-serif text-4xl font-medium leading-[1.08] text-[#1f1b16] dark:text-[#efe9de] sm:text-5xl lg:text-6xl"
                >
                  {t("titleStart")}{" "}
                  <span className="text-[#1d4ed8] dark:text-[#60a5fa]">
                    {t("titleHighlight")}
                  </span>
                </h1>

                <p className="mt-6 max-w-md text-lg leading-relaxed text-[#5e554a] dark:text-[#aaa398]">
                  {t("subtitle")}
                </p>

                <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <Link
                    href="/crear"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#1d4ed8] px-6 text-[15px] font-medium text-white transition-colors hover:bg-[#1e40af] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4ed8] dark:bg-[#efe9de] dark:text-[#12110f] dark:hover:bg-white dark:focus-visible:ring-[#60a5fa]"
                  >
                    {t("ctaPrimary")}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>

                  <a
                    href="#como-funciona"
                    className="inline-flex h-12 items-center justify-center rounded-xl border border-[#1f1b16]/15 px-6 text-[15px] font-medium text-[#1f1b16] transition-colors hover:bg-[#efe9df] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4ed8] dark:border-[#efe9de]/15 dark:text-[#efe9de] dark:hover:bg-[#262421] dark:focus-visible:ring-[#60a5fa]"
                  >
                    {t("ctaSecondary")}
                  </a>
                </div>
              </div>

              <ExamenHero />
            </div>
          </div>
        </section>

        {/* OFERTA PREMIUM */}
        {mostrarOfertaPremium ? (
          <div className="relative z-10 mx-auto max-w-5xl px-5 sm:px-6">
            <TarjetaOferta />
          </div>
        ) : null}

        {/* CARACTERÍSTICAS */}
        <section
          aria-labelledby="titulo-caracteristicas"
          className="relative z-10 mx-auto max-w-6xl px-5 pb-16 sm:px-6"
        >
          <div className="mb-9 text-center">
            <h2
              id="titulo-caracteristicas"
              className="text-balance text-3xl font-bold tracking-tight text-[var(--txt)] sm:text-4xl"
            >
              {t("featuresTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-pretty text-[var(--txt2)]">
              {t("featuresSubtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {caracteristicas.map(({ id, Icono }) => (
              <article
                key={id}
                className="card group rounded-2xl p-6 transition-transform duration-200 hover:-translate-y-1 motion-reduce:transform-none"
              >
                <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--sel)] text-[var(--azul)]">
                  <Icono className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
                </span>
                <h3 className="mb-2 text-lg font-bold text-[var(--txt)]">
                  {t(`features.${id}.title`)}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--txt2)]">
                  {t(`features.${id}.description`)}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ZONA KIDS */}
        <section
          aria-labelledby="titulo-zona-kids"
          className="relative z-10 mx-auto max-w-6xl px-5 pb-16 sm:px-6"
        >
          <div className="overflow-hidden rounded-3xl border-2 border-[var(--azul)]/30 bg-[var(--azul)]/10 p-7 shadow-[var(--sombra)] dark:border-[var(--azul)]/30 dark:bg-[var(--azul)]/15 sm:p-9">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-5">
                <span
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-4xl shadow-sm dark:bg-slate-900/60"
                  aria-hidden="true"
                >
                  🧒
                </span>

                <div>
                  <h2
                    id="titulo-zona-kids"
                    className="text-balance text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl"
                  >
                    {t("kidsTitle")}
                  </h2>

                  <p className="mt-2 max-w-2xl text-pretty leading-relaxed text-slate-700 dark:text-slate-300">
                    {t("kidsText")}
                  </p>
                </div>
              </div>

              <Link
                href={ctaKids}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[var(--azul)] px-5 py-3 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2 motion-reduce:transform-none"
              >
                {t("kidsCta")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section
          id="como-funciona"
          aria-labelledby="titulo-como-funciona"
          className="relative z-10 mx-auto max-w-6xl px-5 pb-16 sm:px-6"
        >
          <div className="mb-9 text-center">
            <h2
              id="titulo-como-funciona"
              className="text-balance text-3xl font-bold tracking-tight text-[var(--txt)] sm:text-4xl"
            >
              {t("stepsTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-pretty text-[var(--txt2)]">
              {t("stepsSubtitle")}
            </p>
          </div>

          <ol className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {pasos.map(({ numero, id, Icono }) => (
              <li key={numero} className="card relative rounded-2xl p-6 pt-10">
                <span className="absolute -top-4 left-6 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--azul)] text-sm font-bold text-white shadow-lg">
                  {numero}
                </span>
                <Icono
                  className="mb-3 h-7 w-7 text-[var(--azul)]"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <h3 className="mb-2 text-lg font-bold text-[var(--txt)]">
                  {t(`steps.${id}.title`)}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--txt2)]">
                  {t(`steps.${id}.description`)}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* ARCADE */}
        <section
          aria-labelledby="titulo-arcade"
          className="relative z-10 mx-auto max-w-5xl px-5 pb-16 sm:px-6"
        >
          <div className="relative overflow-hidden rounded-3xl border-2 border-[var(--azul)]/30 bg-[var(--azul)]/10 p-7 shadow-[var(--sombra-fuerte)] sm:p-10">
            <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--azul)] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                  <Gamepad2 className="h-4 w-4" aria-hidden="true" />
                  {t("arcadeBadge")}
                </span>

                <h2
                  id="titulo-arcade"
                  className="text-balance text-2xl font-bold tracking-tight text-[var(--txt)] sm:text-3xl"
                >
                  {t("arcadeTitle")}
                </h2>

                <p className="mt-3 text-pretty leading-relaxed text-[var(--txt2)]">
                  {t("arcadeText")}
                </p>
              </div>

              <Link href="/arcade" className="btn-action btn-arcade shrink-0">
                {t("arcadeCta")}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section
          aria-labelledby="titulo-registro"
          className="relative z-10 mx-auto max-w-4xl px-5 pb-20 sm:px-6"
        >
          <div className="card rounded-3xl p-8 text-center sm:p-12">
            <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--sel)] text-[var(--azul)]">
              <UserPlus className="h-7 w-7" strokeWidth={2} aria-hidden="true" />
            </span>

            <h2
              id="titulo-registro"
              className="text-balance text-3xl font-bold tracking-tight text-[var(--txt)] sm:text-4xl"
            >
              {t("finalTitle")}
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-pretty leading-relaxed text-[var(--txt2)]">
              {t("finalText")}
            </p>

            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <BotonAuth
                modo="registro"
                className="btn-action btn-examen"
              >
                {t("finalCta")}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </BotonAuth>

              <BotonAuth
                modo="login"
                className="cursor-pointer text-sm font-semibold text-[var(--txt2)] underline underline-offset-4 transition-colors hover:text-[var(--azul)]"
              >
                {t("finalLogin")}
              </BotonAuth>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
