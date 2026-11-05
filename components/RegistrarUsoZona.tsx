"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function zonaDeRuta(pathname: string): string | null {
  if (pathname.startsWith("/kids")) return "Zona Kids";
  if (pathname.startsWith("/arcade")) return "Arcade";
  if (pathname.startsWith("/crear")) return "Crear test";
  if (pathname.startsWith("/mi-espacio")) return "Mi Espacio";
  if (pathname.startsWith("/estadisticas")) return "Estadísticas";
  if (pathname.startsWith("/premium")) return "Premium";
  if (pathname.startsWith("/cuenta")) return "Cuenta";
  if (pathname.startsWith("/legal")) return "Legal";
  if (pathname.startsWith("/admin")) return null;
  if (pathname === "/" || /^\/(es|en|fr|de|it|pt)\/?$/.test(pathname)) {
    return "Inicio";
  }
  return "Otros";
}

export default function RegistrarUsoZona() {
  const pathname = usePathname();

  useEffect(() => {
    const zona = zonaDeRuta(pathname);

    if (!zona) {
      return;
    }

    const inicio = Date.now();
    let enviado = false;

    const enviar = () => {
      if (enviado) return;
      enviado = true;
      const segundos = Math.min(
        3_600,
        Math.round((Date.now() - inicio) / 1000),
      );

      void fetch("/api/uso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zona, duracion: segundos }),
        keepalive: true,
      }).catch(() => {});
    };

    const alSalir = () => enviar();
    window.addEventListener("pagehide", alSalir);

    return () => {
      window.removeEventListener("pagehide", alSalir);
      enviar();
    };
  }, [pathname]);

  return null;
}
