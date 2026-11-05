import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { obtenerUsuarioSesion } from "@/lib/auth-server";

export const instant = false;

export default async function KidsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const usuario = await obtenerUsuarioSesion();

  if (!usuario || usuario.rol !== "premium") {
    redirect("/premium");
  }

  return <>{children}</>;
}
