"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSesion } from "@/components/SessionProvider";
import { LogOut } from "lucide-react";

const CLASE_COMPACTA =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-500 bg-[var(--card)] text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-10";

const CLASE_COMPLETA =
  "inline-flex h-12 w-full items-center justify-center rounded-xl border border-red-500 bg-[var(--card2)] px-5 text-sm font-bold text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto";

export default function LogoutButton({
  compacto = false,
}: {
  compacto?: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("Header");
  const { cerrarSesion } = useSesion();
  const [saliendo, setSaliendo] = useState(false);
  const [error, setError] = useState("");

  async function cerrarSesionActual() {
    if (saliendo) {
      return;
    }

    setSaliendo(true);
    setError("");

    try {
      const respuesta = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!respuesta.ok) {
        throw new Error("No se pudo cerrar la sesión.");
      }

      cerrarSesion();
      router.replace("/");
      router.refresh();
    } catch {
      setError("No se pudo cerrar la sesión.");
      setSaliendo(false);
    }
  }

  return (
    <div className={compacto ? "inline-flex" : undefined}>
      <button
        type="button"
        onClick={cerrarSesionActual}
        disabled={saliendo}
        title={error || t("logout")}
        aria-label={t("logout")}
        className={compacto ? CLASE_COMPACTA : CLASE_COMPLETA}
      >
        {compacto ? (
          <LogOut
            className="h-5 w-5"
            strokeWidth={2}
            aria-hidden="true"
          />
        ) : (
          <>
            <span className="sm:hidden">
              {saliendo ? "…" : t("logout")}
            </span>
            <span className="hidden sm:inline">
              {saliendo ? "..." : t("logout")}
            </span>
          </>
        )}
      </button>

      {error ? (
        <p
          role="alert"
          className={
            compacto
              ? "sr-only"
              : "mt-2 text-sm text-[var(--err-t)]"
          }
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
