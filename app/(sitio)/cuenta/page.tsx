import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PerfilCuenta from "@/components/PerfilCuenta";
import {
  datosPublicosUsuario,
  obtenerUsuarioSesion,
} from "@/lib/auth-server";

export const metadata: Metadata = {
  title: "Mi perfil",
  description:
    "Consulta y modifica los datos de tu cuenta de OpoGen AI.",
};

export const instant = false;

export default async function CuentaPage() {
  const usuario = await obtenerUsuarioSesion();

  if (!usuario) {
    redirect("/");
  }

  return <PerfilCuenta usuario={datosPublicosUsuario(usuario)} />;
}
