"use client";

import React from "react";

type NotificacionTipo = "info" | "peligro" | "exito";

interface BotonNotificacion {
  texto: string;
  onClick: () => void;
  primario?: boolean;
}

interface NotificacionProps {
  titulo: string;
  mensaje: string;
  tipo: NotificacionTipo;
  botones: BotonNotificacion[];
}

export default function Notificacion({ titulo, mensaje, tipo, botones }: NotificacionProps) {
  const colores = {
    info: "text-[var(--azul)]",
    peligro: "text-red-600",
    exito: "text-emerald-600",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--card)] rounded-3xl border border-[var(--th)] p-6 shadow-2xl w-full max-w-sm text-center animate-zoom-in">
        <div className={`text-2xl font-bold mb-2 ${colores[tipo]}`}>
          {titulo}
        </div>
        <p className="text-[var(--txt2)] mb-6 leading-relaxed">
          {mensaje}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {botones.map((btn, idx) => (
            <button
              key={idx}
              onClick={btn.onClick}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                btn.primario
                  ? "bg-[var(--azul)] text-white hover:bg-[var(--azul-hover)] shadow-sm"
                  : "bg-[var(--card2)] text-[var(--txt2)] border border-[var(--th)] hover:bg-[var(--suave)]"
              }`}
            >
              {btn.texto}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
