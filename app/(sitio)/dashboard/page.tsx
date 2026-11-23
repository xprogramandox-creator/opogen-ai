import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  FolderKanban,
  Gamepad2,
  Lock,
  Plus,
  RotateCcw,
  UserRound,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import TarjetaOferta from "@/components/TarjetaOferta";
import CheckoutPendiente from "@/components/CheckoutPendiente";
import AvisoVerificacionPago from "@/components/AvisoVerificacionPago";
import BotonTestimonio from "@/components/BotonTestimonio";
import GuiaRapidaDashboard from "@/components/GuiaRapidaDashboard";
import TarjetaZonaKids from "@/components/TarjetaZonaKids";
import TestimoniosCarrusel from "@/components/TestimoniosCarrusel";
import { CLAVE_ADMIN } from "@/lib/planes";

export const metadata: Metadata = {
  title: "Panel de control",
  description:
    "Tu panel de OpoGen AI: crea tests, juega al Arcade y repasa tus fallos.",
};

export const instant = false;

const accesosRapidos = [
  {
    id: "space",
    href: "/mi-espacio",
    Icono: FolderKanban,
    soloPremium: true,
  },
  {
    id: "stats",
    href: "/estadisticas",
    Icono: BarChart3,
    soloPremium: true,
  },
  {
    id: "mistakes",
    href: "/mi-espacio?fallos=1",
    Icono: RotateCcw,
    soloPremium: true,
  },
  {
    id: "account",
    href: "/cuenta",
    Icono: UserRound,
    soloPremium: false,
  },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string; checkout?: string }>;
}) {
  const params = await searchParams;
  const usuario = await obtenerUsuarioSesion();

  if (!usuario) {
    const locale = await getLocale();

    redirect(`/${locale}`);
  }

  const t = await getTranslations("Dashboard");

  const esInvitado = !usuario;
  const nombre = usuario?.nombre.trim() || t("guestName");
  const esPremium = usuario?.rol === "premium";
  const esAdministrador = usuario?.clave === CLAVE_ADMIN;
  const mostrarAvisoPremium = params.aviso === "premium";
  const etiquetaPlan = esInvitado
    ? t("planGuest")
    : esPremium
      ? t("planPremium")
      : t("planFreemium");
  const clasePlan = esInvitado
    ? "border-[var(--th2)] bg-[var(--card2)] text-[var(--txt2)]"
    : esPremium
      ? "border-[var(--azul)] bg-[var(--sel)] text-[var(--azul)]"
      : "border-[var(--th2)] bg-[var(--sel)] text-[var(--azul)]";

  return (
    <main id="contenido" className="min-h-app bg-transparent font-sans">
      <CheckoutPendiente />
      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-14">
        <AvisoVerificacionPago
          mostrar={params.checkout === "success"}
        />

        {mostrarAvisoPremium ? (
          <div
            role="alert"
            className="mb-8 rounded-2xl border border-[var(--ambar-b)] bg-[var(--ambar)] p-4 text-sm font-medium text-[var(--ambar-t)]"
          >
            <strong className="font-bold">{t("noticeTitle")}</strong>{" "}
            {t("noticeText")}{" "}
            <Link
              href="/premium"
              className="font-bold underline underline-offset-4"
            >
              {t("noticeCta")}
            </Link>
            .
          </div>
        ) : null}

        <div className="mb-9 text-center">
          <span
            className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${clasePlan}`}
          >
            {etiquetaPlan}
          </span>

          <h1 className="text-balance text-3xl font-bold tracking-tight text-[var(--txt)] sm:text-4xl md:text-5xl">
            {t("greeting", { name: nombre })}
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-pretty leading-relaxed text-[var(--txt2)]">
            {t("subtitle")}
          </p>
        </div>

        <GuiaRapidaDashboard />

        {!esPremium ? <TarjetaOferta /> : null}

        <div className="mb-8">
          <TarjetaZonaKids />
        </div>

      {esPremium || esAdministrador ? (
        <BotonTestimonio nombreInicial={usuario?.nombre ?? ""} />
      ) : null}

        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--txt)]">
              {t("quickAccess")}
            </h2>
            <p className="mt-1 text-sm text-[var(--txt2)]">
              {t("quickSubtitle")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {accesosRapidos.map(({ id, href, Icono, soloPremium }) => {
            const titulo = t(`cards.${id}.title`);
            const descripcion = t(`cards.${id}.description`);
            const bloqueada = !esPremium && soloPremium;
              const clases =
                "card group flex flex-col rounded-2xl p-5 transition-transform duration-200 hover:-translate-y-1 motion-reduce:transform-none";

              const contenido = (
                <>
                  <span className="relative mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--sel)] text-[var(--azul)]">
                    <Icono
                      className="h-6 w-6"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    {bloqueada ? (
                      <Lock
                        className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-[var(--card)] p-0.5 text-[var(--ambar-t)]"
                        aria-hidden="true"
                      />
                    ) : null}
                  </span>

                  <h3 className="mb-1.5 text-base font-bold text-[var(--txt)]">
                    {titulo}
                  </h3>

                  <p className="text-sm leading-relaxed text-[var(--txt2)]">
                    {descripcion}
                  </p>

                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[var(--azul)]">
                    {bloqueada ? (
                      <>
                        <Lock className="h-4 w-4" aria-hidden="true" />
                        {t("onlyPremium")}
                      </>
                    ) : (
                      <>
                        {t("enter")}
                        <ArrowRight
                          className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
                          aria-hidden="true"
                        />
                      </>
                    )}
                  </span>
                </>
              );

              return bloqueada ? (
                <div
                  key={id}
                  aria-disabled="true"
                  title={t("premiumTooltip")}
                  className={`${clases} cursor-not-allowed opacity-70 hover:translate-y-0`}
                >
                  {contenido}
                </div>
              ) : (
                <Link key={id} href={href} className={clases}>
                  {contenido}
                </Link>
              );
            })}
        </div>

        {usuario && usuario.rol !== "premium" ? (
          <div className="mt-10">
            <TestimoniosCarrusel />
          </div>
        ) : null}

        <div className="mb-12 mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/crear"
            className="btn-action btn-action-compacta btn-examen mx-auto w-full max-w-none"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
            {t("createTest")}
            <ArrowRight className="ml-auto h-4 w-4" aria-hidden="true" />
          </Link>

          <Link
            href="/arcade"
            className="btn-action btn-action-compacta btn-arcade mx-auto w-full max-w-none"
          >
            <Gamepad2 className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
            {t("playArcade")}
            <ArrowRight className="ml-auto h-5 w-5" aria-hidden="true" />
          </Link>
        </div>

      </section>
    </main>
  );
}
