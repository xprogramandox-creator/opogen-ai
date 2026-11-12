"use client";

import { useEffect } from "react";
import { obtenerSessionIdAnalitica } from "@/lib/analitica-cliente";

const INTERVALO_MS = 30_000;

export default function AnaliticaTracker() {
  useEffect(() => {
    let activo = true;
    const sessionId = obtenerSessionIdAnalitica();

    const enviar = () => {
      if (!activo || document.visibilityState === "hidden") return;

      void fetch("/api/analitica/ping", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
        cache: "no-store",
        keepalive: true,
      }).catch(() => {});
    };

    const alVolver = () => {
      if (document.visibilityState === "visible") enviar();
    };

    enviar();

    const intervalo = window.setInterval(enviar, INTERVALO_MS);
    document.addEventListener("visibilitychange", alVolver);

    return () => {
      activo = false;
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, []);

  return null;
}
