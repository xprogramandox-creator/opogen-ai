"use client";

import { Menu } from "lucide-react";
import { useSidebar } from "@/components/SidebarProvider";

/** Botón hamburguesa de la cabecera: solo aparece cuando la barra lateral está oculta. */
export default function SidebarToggle() {
  const { abierto, abrir } = useSidebar();

  return (
    <button
      type="button"
      onClick={abrir}
      aria-label="Abrir menú"
      aria-controls="sidebar-movil"
      aria-expanded={abierto}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--th)] bg-[var(--card)] text-[var(--txt)] transition-colors hover:bg-[var(--suave2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2 lg:hidden"
    >
      <Menu className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
