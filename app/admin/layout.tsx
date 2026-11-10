import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import { CLAVE_ADMIN } from "@/lib/planes";
import SiteHeader from "@/components/SiteHeader";

export const instant = false;

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const usuario = await obtenerUsuarioSesion();

  if (!usuario || usuario.clave !== CLAVE_ADMIN) {
    notFound();
  }

  return (
    <>
      <SiteHeader showBrand />
      {children}
    </>
  );
}
