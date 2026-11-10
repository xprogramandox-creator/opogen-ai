"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import CheckoutForm, {
  type PlanCheckout,
} from "@/components/CheckoutForm";

type UsuarioCheckout = {
  nombre: string;
  correo: string;
  telefono: string;
};

export default function CheckoutModal({
  plan,
  usuario,
  onClose,
}: {
  plan: PlanCheckout;
  usuario: UsuarioCheckout;
  onClose: () => void;
}) {
  useEffect(() => {
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function cerrarConEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") onClose();
    }

    window.addEventListener("keydown", cerrarConEscape);

    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", cerrarConEscape);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[120] overflow-y-auto bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onClose();
      }}
    >
      <div className="relative mx-auto my-4 w-full max-w-xl sm:my-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--th)] bg-[var(--card2)] text-[var(--txt)] transition-colors hover:bg-[var(--suave)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)]"
        >
          <X className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
        </button>

        <h2 id="checkout-modal-title" className="sr-only">
          Finalizar suscripción
        </h2>

        <CheckoutForm
          plan={plan}
          usuario={usuario}
          modoModal
          onClose={onClose}
        />
      </div>
    </div>
  );
}
