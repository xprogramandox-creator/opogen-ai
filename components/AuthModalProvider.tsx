"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSesion } from "@/components/SessionProvider";
import { useVentanaPersistente } from "@/hooks/useVentanaPersistente";

export type ModoAuth = "login" | "registro";
export type PlanAuth = "freemium" | "premium";
export type DuracionAuth = "mensual" | "semestral" | "anual";

type OpcionesAuth = {
  plan?: PlanAuth;
  duracion?: DuracionAuth;
  verificado?: boolean;
  tokenInvalido?: boolean;
};

type AuthModalContextValue = {
  abrirAuth: (modo: ModoAuth, opciones?: OpcionesAuth) => void;
  cerrarAuth: () => void;
};

type EstadoAuth = {
  modo: ModoAuth;
  plan?: PlanAuth;
  duracion?: DuracionAuth;
  verificado?: boolean;
  tokenInvalido?: boolean;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

// El diálogo (formularios incluidos) solo se descarga cuando se abre.
const AuthDialog = dynamic(() => import("@/components/AuthDialog"), {
  ssr: false,
});

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const { sesion, cargando } = useSesion();
  const [estado, setEstado] = useState<EstadoAuth | null>(null);
  const ventanaAuth = useVentanaPersistente<EstadoAuth>({
    clave: "auth",
    version: 1,
  });
  const {
    abrir: guardarAuthPersistente,
    cerrar: cerrarAuthPersistente,
  } = ventanaAuth;

  const abrirAuth = useCallback(
    (modo: ModoAuth, opciones: OpcionesAuth = {}) => {
      const nuevoEstado = { modo, ...opciones };

      setEstado(nuevoEstado);
      guardarAuthPersistente(nuevoEstado);
    },
    [guardarAuthPersistente],
  );

  const cerrarAuth = useCallback(() => {
    setEstado(null);
    cerrarAuthPersistente();
  }, [cerrarAuthPersistente]);

  // Al volver de Stripe, el modal puede restaurarse desde sessionStorage.
  // Se cierra automáticamente pasados 5 segundos para dejar ver el Dashboard.
  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);

    if (parametros.get("checkout") !== "success") {
      return;
    }

    const id = window.setTimeout(() => {
      cerrarAuth();
    }, 5_000);

    return () => window.clearTimeout(id);
  }, [cerrarAuth]);

  useEffect(() => {
    if (cargando || sesion) return;

    const parametros = new URLSearchParams(window.location.search);
    const registro = parametros.get("registro") === "1";
    const login = parametros.get("login") === "1";
    const verificado = parametros.get("verificado") === "true";
    const tokenInvalido = parametros.get("error") === "token_invalido";

    if (!registro && !login && !verificado && !tokenInvalido) return;

    parametros.delete("login");
    parametros.delete("registro");
    parametros.delete("verificado");
    parametros.delete("error");

    const consulta = parametros.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${consulta ? `?${consulta}` : ""}${window.location.hash}`,
    );

    cerrarAuthPersistente();

    const id = window.setTimeout(
      () =>
        setEstado({
          modo: registro ? "registro" : "login",
          verificado,
          tokenInvalido,
        }),
      0,
    );

    return () => window.clearTimeout(id);
  }, [cargando, cerrarAuthPersistente, sesion]);

  useEffect(() => {
    if (cargando || sesion || estado) return;
    if (!ventanaAuth.restaurado || !ventanaAuth.datos) return;

    const id = window.setTimeout(() => {
      setEstado(ventanaAuth.datos);
    }, 0);

    return () => window.clearTimeout(id);
  }, [
    cargando,
    estado,
    sesion,
    ventanaAuth.datos,
    ventanaAuth.restaurado,
  ]);

  const valor = useMemo(
    () => ({ abrirAuth, cerrarAuth }),
    [abrirAuth, cerrarAuth],
  );

  return (
    <AuthModalContext.Provider value={valor}>
      {children}
      {estado ? (
        <AuthDialog
          modo={estado.modo}
          planInicial={estado.plan}
          duracionInicial={estado.duracion}
          verificado={estado.verificado}
          tokenInvalido={estado.tokenInvalido}
          onClose={cerrarAuth}
          onCambiarModo={(modo) =>
            abrirAuth(modo, {
              plan: estado.plan,
              duracion: estado.duracion,
              verificado: estado.verificado,
              tokenInvalido: estado.tokenInvalido,
            })
          }
        />
      ) : null}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal(): AuthModalContextValue {
  const contexto = useContext(AuthModalContext);

  if (!contexto) {
    throw new Error("useAuthModal debe usarse dentro de AuthModalProvider");
  }

  return contexto;
}
