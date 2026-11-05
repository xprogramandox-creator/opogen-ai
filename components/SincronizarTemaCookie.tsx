"use client";

import { useEffect } from "react";

/**
 * Migra la preferencia guardada por next-themes en localStorage a una cookie
 * para que el servidor pueda renderizar el tema correcto sin un script inline.
 */
export default function SincronizarTemaCookie() {
  useEffect(() => {
    try {
      const tema = window.localStorage.getItem("theme");

      if (tema === "claro" || tema === "oscuro") {
        document.cookie = `opoquiz-tema=${tema}; path=/; max-age=31536000; samesite=lax${
          window.location.protocol === "https:" ? "; secure" : ""
        }`;
      }
    } catch {
      // Si localStorage o cookies no están disponibles, se mantiene el tema
      // por defecto del servidor.
    }
  }, []);

  return null;
}
