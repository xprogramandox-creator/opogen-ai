import type { Metadata } from "next";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import MiEspacioContenido from "./MiEspacioContenido";
import MiEspacioBloqueado from "@/components/MiEspacioBloqueado";

export const metadata: Metadata = {
  title: "Mi Espacio",
  description:
    "Organiza tus tests, carpetas y simulacros mixtos en OpoGen AI.",
};

export const instant = false;

export default async function MiEspacioPage() {
  const usuario = await obtenerUsuarioSesion();

  if (!usuario || usuario.rol !== "premium") {
    return <MiEspacioBloqueado />;
  }

  return <MiEspacioContenido />;
}
