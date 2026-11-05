"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import Notificacion from "./Notificacion";

type NotificacionTipo = "info" | "peligro" | "exito";

interface NotificacionEstado {
  titulo: string;
  mensaje: string;
  tipo: NotificacionTipo;
  botones: { texto: string; onClick: () => void; primario?: boolean }[];
}

interface NotificationContextType {
  notificar: (config: { titulo: string; mensaje: string; tipo?: NotificacionTipo }) => void;
  confirmar: (config: { titulo: string; mensaje: string; onAceptar: () => void; textoAceptar?: string; textoCancelar?: string }) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<NotificacionEstado | null>(null);

  const cerrar = useCallback(() => setEstado(null), []);

  const notificar = useCallback(({ titulo, mensaje, tipo = "info" }: { titulo: string; mensaje: string; tipo?: NotificacionTipo }) => {
    setEstado({
      titulo,
      mensaje,
      tipo,
      botones: [
        { texto: "Entendido", onClick: cerrar, primario: true },
      ],
    });
  }, [cerrar]);

  const confirmar = useCallback(({ titulo, mensaje, onAceptar, textoAceptar = "Aceptar", textoCancelar = "Cancelar" }: { titulo: string; mensaje: string; onAceptar: () => void; textoAceptar?: string; textoCancelar?: string }) => {
    setEstado({
      titulo,
      mensaje,
      tipo: "info",
      botones: [
        { texto: textoCancelar, onClick: cerrar, primario: false },
        { texto: textoAceptar, onClick: () => { onAceptar(); cerrar(); }, primario: true },
      ],
    });
  }, [cerrar]);

  return (
    <NotificationContext.Provider value={{ notificar, confirmar }}>
      {children}
      {estado && (
        <Notificacion
          titulo={estado.titulo}
          mensaje={estado.mensaje}
          tipo={estado.tipo}
          botones={estado.botones}
        />
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotification debe usarse dentro de NotificationProvider");
  return context;
}
