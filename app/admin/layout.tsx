import type { Metadata } from "next";
import type { ReactNode } from "react";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import { CLAVE_ADMIN } from "@/lib/planes";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Panel de administración | OpoGen AI",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const usuario = await obtenerUsuarioSesion();

  if (!usuario || usuario.clave !== CLAVE_ADMIN) {
    return (
      <>
        <SiteHeader showBrand />
        <main className="flex min-h-app items-center justify-center bg-transparent px-6 py-16">
          <section className="max-w-lg rounded-3xl border border-[var(--th)] bg-[var(--card)] p-8 text-center shadow-[var(--sombra)]">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--azul)]">
              Administración
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--txt)]">
              Acceso restringido
            </h1>
            <p className="mt-3 leading-relaxed text-[var(--txt2)]">
              Esta zona es exclusiva para la cuenta administradora. Cierra
              sesión e inicia sesión con la cuenta Admin para acceder al
              panel.
            </p>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader showBrand />
      {children}
    </>
  );
}
