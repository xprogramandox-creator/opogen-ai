"use client";

import { useEffect } from "react";

const CLAVE_SESION = "opogen:analitica:sesion";
const INTERVALO_MS = 30_000;

function nuevoId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // Se usa el fallback de abajo.
  }

  return `anon-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function obtenerSesion(): string {
  try {
    const existente = window.sessionStorage.getItem(CLAVE_SESION);

    if (existente) return existente;

    const nuevo = nuevoId();
    window.sessionStorage.setItem(CLAVE_SESION, nuevo);
    return nuevo;
  } catch {
    return nuevoId();
  }
}

export default function AnaliticaTracker() {
  useEffect(() => {
    let activo = true;
    const sessionId = obtenerSesion();

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
