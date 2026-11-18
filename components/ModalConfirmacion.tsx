"use client";

import React, { useEffect, useState } from "react";

interface ModalConfirmacionProps {
  isOpen: boolean;
  titulo: string;
  mensaje: string;
  onConfirm: () => void;
  onCancel: () => void;
  textoCancelar?: string;
  textoAceptar?: string;
  /**
   * Texto del checkbox de confirmación. Si se indica, el botón de aceptar
   * permanece deshabilitado hasta que el usuario lo marca (acciones
   * destructivas).
   */
  textoConfirmacion?: string;
}

export default function ModalConfirmacion({
  isOpen,
  titulo,
  mensaje,
  onConfirm,
  onCancel,
  textoCancelar = "Cancelar",
  textoAceptar = "Aceptar",
  textoConfirmacion,
}: ModalConfirmacionProps) {
  const [confirmado, setConfirmado] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Se reinicia cada vez que se abre el modal.
    const id = window.setTimeout(() => setConfirmado(false), 0);

    return () => window.clearTimeout(id);
  }, [isOpen]);

  if (!isOpen) return null;

  const bloqueado = Boolean(textoConfirmacion) && !confirmado;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--card)] rounded-3xl border border-[var(--th)] p-8 shadow-2xl w-full max-w-sm text-center animate-zoom-in">
        <h3 className="text-xl font-bold mb-4 text-[var(--txt)]">{titulo}</h3>
        <p className="text-[var(--txt2)] mb-8 leading-relaxed whitespace-pre-line">
          {mensaje}
        </p>

        {textoConfirmacion ? (
          <label className="mb-8 flex items-start gap-3 text-left text-sm text-[var(--txt2)]">
            <input
              type="checkbox"
              checked={confirmado}
              onChange={(evento) => setConfirmado(evento.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--azul)]"
            />
            <span>{textoConfirmacion}</span>
          </label>
        ) : null}

        <div className="flex justify-center gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded-xl bg-[var(--card2)] text-[var(--txt2)] border border-[var(--th)] font-semibold hover:bg-[var(--suave)] transition-all"
          >
            {textoCancelar}
          </button>
          <button
            onClick={onConfirm}
            disabled={bloqueado}
            className="px-6 py-2 rounded-xl bg-[var(--azul)] text-[var(--btn-txt)] font-semibold hover:bg-[var(--azul-hover)] shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50"
          >
            {textoAceptar}
          </button>
        </div>
      </div>
    </div>
  );
}
