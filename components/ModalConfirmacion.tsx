"use client";

import React from "react";

interface ModalConfirmacionProps {
  isOpen: boolean;
  titulo: string;
  mensaje: string;
  onConfirm: () => void;
  onCancel: () => void;
  textoCancelar?: string;
  textoAceptar?: string;
}

export default function ModalConfirmacion({ isOpen, titulo, mensaje, onConfirm, onCancel, textoCancelar = "Cancelar", textoAceptar = "Aceptar" }: ModalConfirmacionProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--card)] rounded-3xl border border-[var(--th)] p-8 shadow-2xl w-full max-w-sm text-center animate-zoom-in">
        <h3 className="text-xl font-bold mb-4 text-[var(--txt)]">{titulo}</h3>
        <p className="text-[var(--txt2)] mb-8 leading-relaxed">
          {mensaje}
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded-xl bg-[var(--card2)] text-[var(--txt2)] border border-[var(--th)] font-semibold hover:bg-[var(--suave)] transition-all"
          >
            {textoCancelar}
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 rounded-xl bg-[var(--azul)] text-[var(--btn-txt)] font-semibold hover:bg-[var(--azul-hover)] shadow-sm transition-all"
          >
            {textoAceptar}
          </button>
        </div>
      </div>
    </div>
  );
}
