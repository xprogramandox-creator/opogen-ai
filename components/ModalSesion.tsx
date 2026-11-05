"use client";

import { useEffect, useId } from "react";

type ModalSesionProps = {
  titulo: string;
  onClose: () => void;
  children: React.ReactNode;
};
function ModalSesion({ titulo, onClose, children }: ModalSesionProps) {
  const idTitulo = useId();

  useEffect(() => {
    const overflowAnterior = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflowAnterior;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-slate-950/65 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className="card relative my-auto max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl p-4 shadow-2xl sm:max-h-[90vh] sm:p-6"
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2
            id={idTitulo}
            className="text-2xl font-bold tracking-tight text-[var(--txt)]"
          >
            {titulo}
          </h2>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            aria-label="Cerrar"
            className="relative z-50 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--th)] bg-[var(--card2)] text-[var(--txt)] transition-colors hover:bg-[var(--suave)] hover:text-[var(--txt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

export default ModalSesion;

