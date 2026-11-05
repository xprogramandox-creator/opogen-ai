"use client";

import { useEffect, useRef, useState } from "react";
import { useNotification } from "@/components/NotificationProvider";
import { useSesion } from "@/components/SessionProvider";

const TIEMPO_INACTIVIDAD = 60 * 60 * 1000;
const THROTTLE_ACTIVIDAD = 1000;
const RETRASO_REDIRECCION = 4000;

const EVENTOS_ACTIVIDAD = [
  "mousemove",
  "keydown",
  "click",
  "scroll",
  "touchstart",
] as const;

export default function InactivityGuard() {
  const { sesion, cerrarSesion } = useSesion();
  const { notificar } = useNotification();

  const temporizadorRef = useRef<number | null>(null);
  const ultimaActividadRef = useRef(0);
  const cerrandoRef = useRef(false);
  const [haySesion, setHaySesion] = useState(false);

  // Sincronizamos la sesión en el siguiente tick para no encadenar renders
  // dentro del efecto.
  useEffect(() => {
    const id = window.setTimeout(() => setHaySesion(Boolean(sesion)), 0);
    return () => window.clearTimeout(id);
  }, [sesion]);

  useEffect(() => {
    if (!haySesion) return;

    const cancelarTemporizador = () => {
      if (temporizadorRef.current !== null) {
        window.clearTimeout(temporizadorRef.current);
        temporizadorRef.current = null;
      }
    };

    const expirarSesion = async () => {
      if (cerrandoRef.current) return;

      cerrandoRef.current = true;
      cancelarTemporizador();

      notificar({
        titulo: "Sesión expirada",
        mensaje:
          "Tu sesión ha expirado por inactividad. Vuelve a iniciar sesión.",
        tipo: "peligro",
      });

      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        });
      } catch {
        // Aunque falle la petición, cerramos la sesión local y volvemos al inicio.
      } finally {
        cerrarSesion();

        // Damos unos segundos para que se pueda leer el aviso antes de salir.
        window.setTimeout(() => {
          window.location.replace("/");
        }, RETRASO_REDIRECCION);
      }
    };

    const programarExpiracion = () => {
      cancelarTemporizador();
      temporizadorRef.current = window.setTimeout(() => {
        void expirarSesion();
      }, TIEMPO_INACTIVIDAD);
    };

    const registrarActividad = () => {
      if (cerrandoRef.current) return;

      const ahora = Date.now();
      if (ahora - ultimaActividadRef.current < THROTTLE_ACTIVIDAD) return;

      ultimaActividadRef.current = ahora;
      programarExpiracion();
    };

    cerrandoRef.current = false;
    ultimaActividadRef.current = Date.now();
    programarExpiracion();

    for (const evento of EVENTOS_ACTIVIDAD) {
      window.addEventListener(evento, registrarActividad, { passive: true });
    }

    return () => {
      cancelarTemporizador();
      for (const evento of EVENTOS_ACTIVIDAD) {
        window.removeEventListener(evento, registrarActividad);
      }
    };
  }, [haySesion, notificar, cerrarSesion]);

  return null;
}
