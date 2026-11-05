"use client";

import { useCallback, useEffect, useState } from "react";

type OpcionesVentana = {
  clave: string;
  version?: number;
  maxAgeMs?: number;
};

type EntradaGuardada<T> = {
  version: number;
  guardadoEn: number;
  datos: T;
};

const PREFIJO = "opogen:ventana:";
const MAX_AGE_DEFAULT = 6 * 60 * 60 * 1000;

export function claveVentana(clave: string): string {
  return `${PREFIJO}${clave}`;
}

export function useVentanaPersistente<T>({
  clave,
  version = 1,
  maxAgeMs = MAX_AGE_DEFAULT,
}: OpcionesVentana) {
  const [abierta, setAbierta] = useState(false);
  const [datos, setDatos] = useState<T | null>(null);
  const [restaurado, setRestaurado] = useState(false);
  const storageKey = claveVentana(clave);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const guardado = window.sessionStorage.getItem(storageKey);

        if (!guardado) {
          setRestaurado(true);
          return;
        }

        const entrada = JSON.parse(guardado) as EntradaGuardada<T>;

        if (
          !entrada ||
          entrada.version !== version ||
          !Number.isFinite(entrada.guardadoEn) ||
          Date.now() - entrada.guardadoEn > maxAgeMs
        ) {
          window.sessionStorage.removeItem(storageKey);
          setRestaurado(true);
          return;
        }

        setDatos(entrada.datos);
        setAbierta(true);
      } catch {
        try {
          window.sessionStorage.removeItem(storageKey);
        } catch {
          // sessionStorage puede estar deshabilitado.
        }
      } finally {
        setRestaurado(true);
      }
    }, 0);

    return () => window.clearTimeout(id);
  }, [maxAgeMs, storageKey, version]);

  const abrir = useCallback(
    (nuevoDato: T) => {
      setDatos(nuevoDato);
      setAbierta(true);

      try {
        window.sessionStorage.setItem(
          storageKey,
          JSON.stringify({
            version,
            guardadoEn: Date.now(),
            datos: nuevoDato,
          } satisfies EntradaGuardada<T>),
        );
      } catch {
        // Si sessionStorage no está disponible, la ventana sigue abierta.
      }
    },
    [storageKey, version],
  );

  const actualizar = useCallback(
    (nuevoDato: T | ((anterior: T | null) => T)) => {
      setDatos((anterior) => {
        const siguiente =
          typeof nuevoDato === "function"
            ? (nuevoDato as (valor: T | null) => T)(anterior)
            : nuevoDato;

        try {
          window.sessionStorage.setItem(
            storageKey,
            JSON.stringify({
              version,
              guardadoEn: Date.now(),
              datos: siguiente,
            } satisfies EntradaGuardada<T>),
          );
        } catch {
          // Sin persistencia, pero el estado en memoria sigue funcionando.
        }

        return siguiente;
      });
    },
    [storageKey, version],
  );

  const cerrar = useCallback(() => {
    setAbierta(false);
    setDatos(null);

    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      // Sin persistencia.
    }
  }, [storageKey]);

  return {
    abierta,
    datos,
    restaurado,
    abrir,
    actualizar,
    cerrar,
  };
}
