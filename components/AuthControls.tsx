"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { BarChart3, Briefcase, ClipboardCheck, Gamepad2, Home, Lock, Menu, X } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import ModalSesion from "@/components/ModalSesion";
import { useAuthModal } from "@/components/AuthModalProvider";
import { useSesion } from "@/components/SessionProvider";
import { MENSAJE_SOLO_PREMIUM } from "@/lib/planes";
import { diasHastaFecha, formatearFecha } from "@/lib/fechas";

const CLASE_BOTON_CABECERA =
  "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-2 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2 sm:h-10 sm:px-4 sm:text-sm";

const CLASE_SESION_CABECERA =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[var(--ok-b)] bg-[var(--ok)] px-2 text-[11px] font-bold text-[var(--ok-t)] transition-colors hover:bg-[var(--suave2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2 sm:h-10 sm:px-4 sm:text-sm";

const CLASE_KIDS =
  "inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-full bg-[var(--azul)] px-3 text-xs font-bold text-white shadow-md transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2 sm:h-10 sm:text-sm";

const CLASE_KIDS_MOVIL =
  "inline-flex h-12 w-full items-center justify-center gap-1 rounded-2xl bg-[var(--azul)] px-4 text-base font-bold text-white shadow-md transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2";
export default function AuthControls() {
  const { sesion, cargando } = useSesion();
  const t = useTranslations("Header");
  const locale = useLocale();
  const pathname = usePathname();
  const { abrirAuth } = useAuthModal();
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

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

  if (cargando) {
    contenido = (
      <span
        role="status"
        aria-label="Comprobando sesión"
        className="h-9 w-[86px] shrink-0 animate-pulse rounded-full border border-[var(--th)] bg-[var(--suave2)] sm:h-10 sm:w-[104px]"
      />
    );
  } else if (sesion) {
    contenido = (
      <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
        <nav
          aria-label="Navegación principal"
          className="mx-auto hidden min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1 lg:flex"
        >
          {pathname !== "/" ? (
            <Link
              href="/"
              aria-label="Inicio"
              className={`${CLASE_BOTON_CABECERA} border border-[var(--th)] bg-[var(--card)] text-[var(--txt)] hover:bg-[var(--suave2)]`}
              title="Inicio"
            >
              <Home className="h-5 w-5 shrink-0 xl:mr-1.5" strokeWidth={2} aria-hidden="true" />
              <span className="hidden xl:inline">{t("home")}</span>
            </Link>
          ) : null}
          {sesion.rol === "freemium" ? (
            <span
              aria-disabled="true"
              aria-label="Mi Espacio, solo para Premium"
              title={MENSAJE_SOLO_PREMIUM}
              className={`${CLASE_BOTON_CABECERA} cursor-not-allowed border border-[var(--th)] bg-[var(--card2)] text-[var(--txt3)] opacity-70`}
            >
              <Lock className="h-4 w-4 shrink-0 xl:mr-1.5" strokeWidth={2} aria-hidden="true" />
              <span className="hidden xl:inline">{t("mySpace")}</span>
            </span>
          ) : (
            <Link
              href="/mi-espacio"
              aria-label="Mi Espacio"
              className={`${CLASE_BOTON_CABECERA} border border-[var(--th)] bg-[var(--card)] text-[var(--txt)] hover:bg-[var(--suave2)]`}
              title="Acceder a Mi Espacio"
            >
              <Briefcase className="h-5 w-5 shrink-0 xl:mr-1.5" strokeWidth={2} aria-hidden="true" />
              <span className="hidden xl:inline">{t("mySpace")}</span>
            </Link>
          )}
          {sesion.rol === "freemium" ? (
            <span
              aria-disabled="true"
              aria-label="Estadísticas, solo para Premium"
              title={MENSAJE_SOLO_PREMIUM}
              className={`${CLASE_BOTON_CABECERA} cursor-not-allowed border border-[var(--th)] bg-[var(--card2)] text-[var(--txt3)] opacity-70`}
            >
              <Lock className="h-4 w-4 shrink-0 xl:mr-1.5" strokeWidth={2} aria-hidden="true" />
              <span className="hidden xl:inline">{t("stats")}</span>
            </span>
          ) : (
            <Link
              href="/estadisticas"
              aria-label="Estadísticas"
              title="Ver mis estadísticas"
              className={`${CLASE_BOTON_CABECERA} border border-[var(--th)] bg-[var(--card)] text-[var(--txt)] hover:bg-[var(--suave2)]`}
            >
              <BarChart3 className="h-5 w-5 shrink-0 xl:mr-1.5" strokeWidth={2} aria-hidden="true" />
              <span className="hidden xl:inline">{t("stats")}</span>
            </Link>
          )}
          <Link
            href="/crear"
            aria-label="Test"
            title="Crear un test"
            className={`${CLASE_BOTON_CABECERA} border border-[var(--th)] bg-[var(--card)] text-[var(--txt)] hover:bg-[var(--suave2)]`}
          >
            <ClipboardCheck className="h-5 w-5 shrink-0 xl:mr-1.5" strokeWidth={2} aria-hidden="true" />
            <span className="hidden xl:inline">{t("test")}</span>
          </Link>
          <Link
            href="/arcade"
            aria-label="Arcade"
            title="Jugar al modo Arcade"
            onClick={() =>
              window.dispatchEvent(
                new Event("opogen:arcade-menu"),
              )
            }
            className={`${CLASE_BOTON_CABECERA} border border-[var(--th)] bg-[var(--card)] text-[var(--txt)] hover:bg-[var(--suave2)]`}
          >
            <Gamepad2 className="h-5 w-5 shrink-0 xl:mr-1.5" strokeWidth={2} aria-hidden="true" />
            <span className="hidden xl:inline">{t("arcade")}</span>
          </Link>

          {sesion.rol === "premium" ? (
            <Link
              href="/kids"
              aria-label="OpoGen Kids"
              title="Entrar en la Zona Kids"
              className={CLASE_KIDS}
            >
              ⭐ KIDS
            </Link>
          ) : null}
        </nav>
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

        <button
          type="button"
          onClick={() => setMenuAbierto((abierto) => !abierto)}
          className={`${CLASE_BOTON_CABECERA} border border-[var(--th)] bg-[var(--card)] text-[var(--txt)] hover:bg-[var(--suave2)] lg:hidden`}
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuAbierto}
          aria-controls="menu-movil"
        >
          {menuAbierto ? (
            <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          )}
        </button>
      </div>
    );
  } else {
    contenido = (
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="hidden items-center gap-1.5 lg:flex sm:gap-2">
          {pathname !== "/" ? (
            <Link
              href="/"
              aria-label="Inicio"
              className={`${CLASE_BOTON_CABECERA} border border-[var(--th)] bg-[var(--card)] text-[var(--txt)] hover:bg-[var(--suave2)]`}
              title="Inicio"
            >
              <Home className="h-5 w-5 shrink-0 xl:mr-1.5" strokeWidth={2} aria-hidden="true" />
              <span className="hidden xl:inline">Inicio</span>
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => abrirAuth("login")}
            className={`${CLASE_BOTON_CABECERA} border border-[var(--th)] bg-[var(--card)] text-[var(--txt)] hover:bg-[var(--suave2)]`}
          >
            <span className="sm:hidden">{t("login")}</span>
            <span className="hidden sm:inline">{t("login")}</span>
          </button>

          <button
            type="button"
            onClick={() => abrirAuth("registro")}
            className={`${CLASE_BOTON_CABECERA} bg-[var(--azul)] text-[var(--btn-txt)] hover:bg-[var(--azul-hover)]`}
          >
            <span className="sm:hidden">{t("register")}</span>
            <span className="hidden sm:inline">{t("register")}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMenuAbierto((abierto) => !abierto)}
          className={`${CLASE_BOTON_CABECERA} border border-[var(--th)] bg-[var(--card)] text-[var(--txt)] hover:bg-[var(--suave2)] lg:hidden`}
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuAbierto}
          aria-controls="menu-movil"
        >
          {menuAbierto ? (
            <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          )}
        </button>
      </div>
    );
  }

  return (
    <>
      {contenido}

      {menuAbierto ? (
        <div
          id="menu-movil"
          className="fixed inset-x-3 top-[76px] z-[90] max-h-[calc(100dvh-90px)] overflow-y-auto rounded-2xl border border-[var(--th)] bg-[var(--card)] p-4 shadow-2xl lg:hidden"
        >
          {sesion ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-[var(--th)] bg-[var(--card2)] p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--txt3)]">
                  {t("profile")}
                </p>
                <p className="mt-1 break-words text-base font-bold text-[var(--txt)]">
                  {sesion.nombre || "Usuario"}
                </p>
                <p className="mt-1 text-xs font-semibold text-[var(--txt3)]">
                  {planMostrado}
                </p>
              </div>

              <div className="grid gap-1">
                {pathname !== "/" ? (
                  <Link
                    href="/"
                    onClick={() => setMenuAbierto(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--txt)] hover:bg-[var(--suave2)]"
                  >
                    <Home className="h-5 w-5" aria-hidden="true" />
                    {t("home")}
                  </Link>
                ) : null}

                {sesion.rol === "premium" ? (
                  <Link
                    href="/mi-espacio"
                    onClick={() => setMenuAbierto(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--txt)] hover:bg-[var(--suave2)]"
                  >
                    <Briefcase className="h-5 w-5" aria-hidden="true" />
                    {t("mySpace")}
                  </Link>
                ) : null}

                {sesion.rol === "premium" ? (
                  <Link
                    href="/estadisticas"
                    onClick={() => setMenuAbierto(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--txt)] hover:bg-[var(--suave2)]"
                  >
                    <BarChart3 className="h-5 w-5" aria-hidden="true" />
                    {t("stats")}
                  </Link>
                ) : null}

                <Link
                  href="/crear"
                  onClick={() => setMenuAbierto(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--txt)] hover:bg-[var(--suave2)]"
                >
                  <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
                  {t("test")}
                </Link>

                <Link
                  href="/arcade"
                  onClick={() => {
                    setMenuAbierto(false);
                    window.dispatchEvent(
                      new Event("opogen:arcade-menu"),
                    );
                  }}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--txt)] hover:bg-[var(--suave2)]"
                >
                  <Gamepad2 className="h-5 w-5" aria-hidden="true" />
                  {t("arcade")}
                </Link>

                {sesion.rol === "premium" ? (
                  <Link
                    href="/kids"
                    onClick={() => setMenuAbierto(false)}
                    className={CLASE_KIDS_MOVIL}
                  >
                    ⭐ KIDS
                  </Link>
                ) : null}

                <Link
                  href="/cuenta"
                  onClick={() => setMenuAbierto(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--txt)] hover:bg-[var(--suave2)]"
                >
                  <Lock className="h-5 w-5" aria-hidden="true" />
                  {t("viewData")}
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => {
                  setMenuAbierto(false);
                  abrirAuth("login");
                }}
                className={`${CLASE_BOTON_CABECERA} h-11 border border-[var(--th)] bg-[var(--card2)] text-[var(--txt)] hover:bg-[var(--suave2)]`}
              >
                {t("login")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuAbierto(false);
                  abrirAuth("registro");
                }}
                className={`${CLASE_BOTON_CABECERA} h-11 bg-[var(--azul)] text-[var(--btn-txt)] hover:bg-[var(--azul-hover)]`}
              >
                {t("register")}
              </button>
            </div>
          )}
        </div>
      ) : null}

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
                onClick={() => setPerfilAbierto(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--th)] bg-[var(--card2)] px-4 text-sm font-bold text-[var(--txt)] transition-colors hover:bg-[var(--suave2)]"
              >
                {t("viewData")}
              </Link>

              <Link
                href={sesion.rol === "premium" ? "/dashboard" : "/premium"}
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
