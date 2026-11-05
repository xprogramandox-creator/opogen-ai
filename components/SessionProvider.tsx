"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { LimiteInvitadoPublico } from "@/lib/limites-invitado-constantes";
import { useNotification } from "@/components/NotificationProvider";

type RolUsuario = "premium" | "freemium";

type SesionUsuario = {
  nombre: string;
  nombreCompleto?: string;
  rol: RolUsuario;
  planContratado?: string | null;
  fechaCaducidadPremium?: string | null;
  emailVerificado: boolean;
};

type RespuestaSesion = {
  autenticado?: unknown;
  nombre?: unknown;
  nombreCompleto?: unknown;
  rol?: unknown;
  planContratado?: unknown;
  fechaCaducidadPremium?: unknown;
  emailVerificado?: unknown;
  limiteInvitado?: unknown;
};

type ContextoSesion = {
  sesion: SesionUsuario | null;
  cargando: boolean;
  limiteInvitado: LimiteInvitadoPublico | null;
  iniciarSesion: (nombre: string, rol?: RolUsuario) => void;
  cerrarSesion: () => void;
  actualizarLimiteInvitado: (valor: unknown) => void;
  recargarSesion: () => Promise<void>;
};

const Contexto = createContext<ContextoSesion | null>(null);

function normalizarRol(valor: unknown): RolUsuario {
  return valor === "freemium" ? "freemium" : "premium";
}

function normalizarLimiteInvitado(
  valor: unknown,
): LimiteInvitadoPublico | null {
  if (!valor || typeof valor !== "object") {
    return null;
  }

  const limite = valor as Record<string, unknown>;
  const usos =
    typeof limite.usos === "number" && Number.isInteger(limite.usos)
      ? limite.usos
      : null;
  const restantes =
    typeof limite.restantes === "number" &&
    Number.isInteger(limite.restantes)
      ? limite.restantes
      : null;

  if (usos === null || restantes === null) {
    return null;
  }

  return {
    usos,
    restantes,
    maximo:
      typeof limite.maximo === "number" &&
      Number.isInteger(limite.maximo)
        ? limite.maximo
        : Math.max(usos, restantes),
    agotado:
      limite.agotado === true || restantes <= 0,
    mensaje:
      typeof limite.mensaje === "string" &&
      limite.mensaje.trim()
        ? limite.mensaje.trim()
        : "",
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const { notificar } = useNotification();
  const [sesion, setSesion] = useState<SesionUsuario | null>(null);
  const [limiteInvitado, setLimiteInvitado] =
    useState<LimiteInvitadoPublico | null>(null);
  const [cargando, setCargando] = useState(true);
  const verificadoAnterior = useRef<boolean | null>(null);

  const recargarSesion = useCallback(async () => {
    // En redes móviles lentas la petición puede quedarse colgada y dejar la
    // cabecera mostrando el esqueleto de carga: se corta a los 8 segundos.
    const controlador = new AbortController();
    const temporizador = window.setTimeout(() => controlador.abort(), 8000);

    try {
      const respuesta = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "include",
        signal: controlador.signal,
      });
      const datos = (await respuesta
        .json()
        .catch(() => ({}))) as RespuestaSesion;

      if (!respuesta.ok) {
        throw new Error("No se ha podido comprobar la sesión.");
      }

      if (datos.autenticado === true) {
        const emailVerificado = datos.emailVerificado === true;

        if (
          verificadoAnterior.current === false &&
          emailVerificado
        ) {
          notificar({
            titulo: "¡Cuenta verificada!",
            mensaje:
              "Tu correo se ha verificado correctamente. Ya puedes usar todas las funciones de tu cuenta.",
            tipo: "exito",
          });
        }

        verificadoAnterior.current = emailVerificado;

        setSesion({
          nombre:
            typeof datos.nombre === "string" ? datos.nombre : "",
          nombreCompleto:
            typeof datos.nombreCompleto === "string"
              ? datos.nombreCompleto
              : undefined,
          rol: normalizarRol(datos.rol),
          planContratado:
            typeof datos.planContratado === "string"
              ? datos.planContratado
              : null,
          fechaCaducidadPremium:
            typeof datos.fechaCaducidadPremium === "string"
              ? datos.fechaCaducidadPremium
              : null,
          emailVerificado,
        });
        setLimiteInvitado(null);
        return;
      }

      verificadoAnterior.current = null;
      setSesion(null);
      setLimiteInvitado(
        normalizarLimiteInvitado(datos.limiteInvitado),
      );
    } catch {
      setSesion(null);
      setLimiteInvitado(null);
    } finally {
      window.clearTimeout(temporizador);
      setCargando(false);
    }
  }, [notificar]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void recargarSesion();
    }, 0);

    return () => window.clearTimeout(id);
  }, [recargarSesion]);

  // Si la cuenta aún no está verificada, comprueba el estado al volver a la
  // ventana y cada 15 segundos. Cuando el móvil verifica la cuenta, el PC
  // actualiza la sesión y muestra el aviso sin recargar la página.
  const pendienteVerificacion = sesion?.emailVerificado === false;

  useEffect(() => {
    if (!pendienteVerificacion) {
      return;
    }

    let activo = true;

    const comprobar = () => {
      if (activo && !document.hidden) {
        void recargarSesion();
      }
    };

    const alRecuperarFoco = () => comprobar();
    const alCambiarVisibilidad = () => comprobar();

    const intervalo = window.setInterval(comprobar, 15_000);
    window.addEventListener("focus", alRecuperarFoco);
    document.addEventListener("visibilitychange", alCambiarVisibilidad);

    return () => {
      activo = false;
      window.clearInterval(intervalo);
      window.removeEventListener("focus", alRecuperarFoco);
      document.removeEventListener(
        "visibilitychange",
        alCambiarVisibilidad,
      );
    };
  }, [pendienteVerificacion, recargarSesion]);

  const iniciarSesion = useCallback(
    (nombre: string, rol?: RolUsuario) => {
      setSesion({
        nombre,
        rol: rol ?? "premium",
        emailVerificado: false,
      });
      setLimiteInvitado(null);
      setCargando(false);
      void recargarSesion();
    },
    [recargarSesion],
  );

  const cerrarSesion = useCallback(() => {
    verificadoAnterior.current = null;
    setSesion(null);
    setLimiteInvitado(null);
    setCargando(false);
  }, []);

  const actualizarLimiteInvitado = useCallback(
    (valor: unknown) => {
      const limite = normalizarLimiteInvitado(valor);

      if (limite) {
        setLimiteInvitado(limite);
      }
    },
    [],
  );

  const valor = useMemo(
    () => ({
      sesion,
      cargando,
      limiteInvitado,
      iniciarSesion,
      cerrarSesion,
      actualizarLimiteInvitado,
      recargarSesion,
    }),
    [
      sesion,
      cargando,
      limiteInvitado,
      iniciarSesion,
      cerrarSesion,
      actualizarLimiteInvitado,
      recargarSesion,
    ],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): ContextoSesion {
  const contexto = useContext(Contexto);

  if (!contexto) {
    throw new Error("useSesion debe usarse dentro de SessionProvider.");
  }

  return contexto;
}
