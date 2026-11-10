import { notFound } from "next/navigation";
import AdminPanel from "@/components/AdminPanel";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import { CLAVE_ADMIN } from "@/lib/planes";

export const instant = false;

export default async function AdminPage() {
  const usuario = await obtenerUsuarioSesion();

  if (!usuario || usuario.clave !== CLAVE_ADMIN) {
    notFound();
  }

  return <AdminPanel />;
}
