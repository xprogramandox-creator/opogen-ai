"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import LogoutButton from "@/components/LogoutButton";
import ModalSesion from "@/components/ModalSesion";
import { useAuthModal } from "@/components/AuthModalProvider";
import { useSesion } from "@/components/SessionProvider";
import { diasHastaFecha, formatearFecha } from "@/lib/fechas";

const CLASE_BOTON_CABECERA =
  "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-1.5 text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2 sm:h-10 sm:px-2.5 sm:text-xs xl:px-3 xl:text-[13px]";

const CLASE_SESION_CABECERA =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[var(--ok-b)] bg-[var(--ok)] px-2 text-[11px] font-bold text-[var(--ok-t)] transition-colors hover:bg-[var(--suave2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2 sm:h-10 sm:px-4 sm:text-sm";

export default function AuthControls() {
  const { sesion } = useSesion();
  const t = useTranslations("Header");
  const locale = useLocale();
  const { abrirAuth } = useAuthModal();
  const [perfilAbierto, setPerfilAbierto] = useState(false);

  const fechaCaducidad = sesion?.fechaCaducidadPremium ?? null;
  const fechaCaducidadLegible = fechaCaducidad
    ? formatearFecha(fechaCaducidad, locale)
    : null;
  const caducidadUrgente = fechaCaducidad
    ? diasHastaFecha(fechaCaducidad) <= 5
    : false;
  const planMostrado =
    sesion?.rol === "premium" && sesion.planContratado
      ? {
          mensual: "Plan 1 mes",
          semestral: "Plan 6 meses",
          anual: "Plan 12 meses",
          ilimitado: "Premium ilimitado",
          admin: "Premium ilimitado",
        }[sesion.planContratado] ?? "Freemium"
      : "Freemium";
  const esAdminIlimitado =
    sesion?.planContratado === "ilimitado" ||
    sesion?.planContratado === "admin";
  const esPlanPremium = planMostrado !== "Freemium";

  let contenido: React.ReactNode;

  if (sesion) {
    contenido = (
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        <div className="hidden lg:block">
          <button
            type="button"
            onClick={() => setPerfilAbierto(true)}
            title={
              sesion.nombre
                ? `Conectado como ${sesion.nombre}`
                : "Conectado"
            }
            className={CLASE_SESION_CABECERA}
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ok-t)]"
              aria-hidden="true"
            />
            <span className="sr-only">Conectado</span>
            <span className="hidden max-w-[160px] truncate sm:inline">
              {sesion.nombre || "Conectado"}
            </span>
            {sesion.rol === "freemium" ? (
              <span
                title="Plan Freemium: 3 tests y 3 partidas de Arcade al día"
                className="rounded-full border border-[var(--ambar-b)] bg-[var(--ambar)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--ambar-t)]"
              >
                Freemium
              </span>
            ) : null}
          </button>
        </div>

        <LogoutButton compacto />
      </div>
    );
  } else {
    contenido = (
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => abrirAuth("login")}
          className={`${CLASE_BOTON_CABECERA} border border-[var(--th)] bg-[var(--card)] text-[var(--txt)] hover:bg-[var(--suave2)]`}
        >
          <span className="sm:hidden">{t("login")}</span>
          <span className="hidden sm:inline">{t("login")}</span>
        </button>

        <div className="hidden lg:block">
          <button
            type="button"
            onClick={() => abrirAuth("registro")}
            className={`${CLASE_BOTON_CABECERA} bg-[var(--azul)] text-[var(--btn-txt)] hover:bg-[var(--azul-hover)]`}
          >
            {t("register")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {contenido}

      {perfilAbierto && sesion ? (
        <ModalSesion titulo={t("profile")} onClose={() => setPerfilAbierto(false)}>
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--th)] bg-[var(--card2)] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--txt3)]">
                {t("name")}
              </p>
              <p className="mt-1 break-words text-base font-semibold text-[var(--txt)]">
                {sesion.nombreCompleto || sesion.nombre || "Usuario"}
              </p>

              <p className="mt-4 text-xs font-bold uppercase tracking-wide text-[var(--txt3)]">
                {t("plan")}
              </p>
              <span
                className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${
                  esPlanPremium
                    ? "border-[var(--azul)] bg-[var(--sel)] text-[var(--azul)]"
                    : "border-[var(--ambar-b)] bg-[var(--ambar)] text-[var(--ambar-t)]"
                }`}
              >
                {planMostrado}
              </span>

              {sesion.rol === "premium" &&
              (esAdminIlimitado || fechaCaducidadLegible) ? (
                <p
                  className={`mt-2 text-xs font-medium ${
                    caducidadUrgente && !esAdminIlimitado
                      ? "text-[var(--ambar-t)]"
                      : "text-[var(--txt3)]"
                  }`}
                >
                  {esAdminIlimitado
                    ? "Sin límite"
                    : `Caduca el ${fechaCaducidadLegible}`}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Link
                href="/cuenta"
                prefetch={false}
                onClick={() => setPerfilAbierto(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--th)] bg-[var(--card2)] px-4 text-sm font-bold text-[var(--txt)] transition-colors hover:bg-[var(--suave2)]"
              >
                {t("viewData")}
              </Link>

              <Link
                href={sesion.rol === "premium" ? "/dashboard" : "/premium"}
                prefetch={false}
                onClick={() => setPerfilAbierto(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--azul)] px-4 text-sm font-bold text-[var(--btn-txt)] transition-colors hover:bg-[var(--azul-hover)]"
              >
                {sesion.rol === "premium"
                  ? t("goPanel")
                  : t("goPremium")}
              </Link>
            </div>
          </div>
        </ModalSesion>
      ) : null}
    </>
  );
}
