"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ContextoSidebar = {
  abierto: boolean;
  abrir: () => void;
  cerrar: () => void;
  alternar: () => void;
};

const SidebarContext = createContext<ContextoSidebar | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);

  const abrir = useCallback(() => setAbierto(true), []);
  const cerrar = useCallback(() => setAbierto(false), []);
  const alternar = useCallback(() => setAbierto((valor) => !valor), []);

  const valor = useMemo(
    () => ({ abierto, abrir, cerrar, alternar }),
    [abierto, abrir, cerrar, alternar],
  );

  return (
    <SidebarContext.Provider value={valor}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): ContextoSidebar {
  const contexto = useContext(SidebarContext);

  if (!contexto) {
    throw new Error("useSidebar debe usarse dentro de SidebarProvider");
  }

  return contexto;
}
