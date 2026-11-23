import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowRight,
  CloudUpload,
  FolderKanban,
  GraduationCap,
  RotateCcw,
  Settings2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import { routing } from "@/i18n/routing";
import RedirigirSiSesion from "@/components/RedirigirSiSesion";
import TarjetaOferta from "@/components/TarjetaOferta";
import ExamenHero from "@/components/ExamenHero";
import RegistrarEventoInvitado from "@/components/RegistrarEventoInvitado";
import TestimoniosCarrusel from "@/components/TestimoniosCarrusel";
import TarjetaZonaKids from "@/components/TarjetaZonaKids";
import GuiaRapidaDashboard from "@/components/GuiaRapidaDashboard";

export const metadata: Metadata = {
  title: "OpoGen AI | Convierte tus apuntes en exámenes",
  description:
    "Sube tus apuntes y genera exámenes tipo test personalizados con inteligencia artificial. Ideal para oposiciones, bachillerato, universidad y secundaria.",
};

export const instant = false;

const caracteristicas = [
  {
    id: "generation",
    Icono: Sparkles,
    fondo: "bg-blue-100 dark:bg-blue-900/50",
    fondoTarjeta: "bg-blue-50 dark:bg-blue-950/30",
    color: "text-blue-700 dark:text-blue-300",
  },
  {
    id: "level",
    Icono: GraduationCap,
    fondo: "bg-indigo-100 dark:bg-indigo-900/50",
    fondoTarjeta: "bg-indigo-50 dark:bg-indigo-950/30",
    color: "text-indigo-700 dark:text-indigo-300",
  },
  {
    id: "space",
    Icono: FolderKanban,
    fondo: "bg-teal-100 dark:bg-teal-900/50",
    fondoTarjeta: "bg-teal-50 dark:bg-teal-950/30",
    color: "text-teal-700 dark:text-teal-300",
  },
  {
    id: "mistakes",
    Icono: RotateCcw,
    fondo: "bg-sky-100 dark:bg-sky-900/50",
    fondoTarjeta: "bg-sky-50 dark:bg-sky-950/30",
    color: "text-sky-700 dark:text-sky-300",
  },
] as const;

const pasos = [
  {
    numero: "1",
    id: "upload",
    Icono: CloudUpload,
    pastel:
      "bg-blue-100 text-blue-800 ring-1 ring-blue-200 dark:bg-blue-900/60 dark:text-blue-200 dark:ring-blue-800",
  },
  {
    numero: "2",
    id: "configure",
    Icono: Settings2,
    pastel:
      "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200 dark:bg-indigo-900/60 dark:text-indigo-200 dark:ring-indigo-800",
  },
  {
    numero: "3",
    id: "learn",
    Icono: TrendingUp,
    pastel:
      "bg-teal-100 text-teal-800 ring-1 ring-teal-200 dark:bg-teal-900/60 dark:text-teal-200 dark:ring-teal-800",
  },
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
        <RegistrarEventoInvitado pagina="landing" accion="visita" />

        {/* HERO */}
        <section
          aria-labelledby="titulo-principal"
          className="relative z-10 border-b border-[#1f1b16]/10 bg-transparent dark:border-[#efe9de]/10"
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
                    prefetch={false}
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

        {/* GUÍA RÁPIDA */}
        <div className="relative z-10 px-5 pb-12 pt-12 sm:px-6 sm:pb-14 sm:pt-16">
          <GuiaRapidaDashboard className="mb-0" />
        </div>

        {/* OFERTA + ZONA KIDS (flex + gap para evitar el colapso de margenes) */}
        <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-10 px-5 pb-4 sm:px-6">
          {mostrarOfertaPremium ? <TarjetaOferta /> : null}

          <TarjetaZonaKids />
        </div>

        {/* TESTIMONIOS */}
        <div className="pt-12 sm:pt-16">
          <TestimoniosCarrusel />
        </div>

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
            {caracteristicas.map(({ id, Icono, fondo, color, fondoTarjeta }) => (
              <article
                key={id}
                className={`group rounded-2xl border border-[var(--th)] p-6 shadow-[var(--sombra)] transition-transform duration-200 hover:-translate-y-1 motion-reduce:transform-none ${fondoTarjeta}`}
              >
                <span className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${fondo} ${color}`}>
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

        {/* CÓMO FUNCIONA */}
        <section
          id="como-funciona"
          aria-labelledby="titulo-como-funciona"
          className="relative z-10 mx-auto max-w-6xl px-5 pb-16 sm:px-6"
        >
          <div className="rounded-3xl border border-[var(--th)] bg-[var(--card2)] px-5 py-8 shadow-[var(--sombra)] sm:px-8 sm:py-10">
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
            {pasos.map(({ numero, id, Icono, pastel }) => (
              <li key={numero} className="card relative rounded-2xl p-6 pt-10">
                <span className={`absolute -top-4 left-6 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold shadow-sm ${pastel}`}>
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
          </div>
        </section>

      </main>
    </>
  );
}
