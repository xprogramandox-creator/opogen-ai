import type { Metadata } from "next";
import { redirect } from "next/navigation";
import EstadisticasContenido from "@/components/EstadisticasContenido";
import { obtenerUsuarioSesion } from "@/lib/auth-server";

export const metadata: Metadata = {
  title: "Estadísticas",
  description:
    "Consulta tu progreso de estudio: tests completados, nota media, aciertos, fallos y actividad de los últimos días.",
};

export const instant = false;

export default async function EstadisticasPage() {
  const usuario = await obtenerUsuarioSesion();

  if (!usuario) {
    // No existe una ruta /login: la home abre el modal de inicio de sesión
    // cuando recibe el parámetro ?login=1.
    redirect("/?login=1");
  }

  if (usuario.rol !== "premium") {
    redirect("/dashboard?aviso=premium");
  }

  return (
    <main id="contenido" className="min-h-app bg-transparent font-sans">
        <section className="mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-14 lg:py-16">
          <EstadisticasContenido />
        </section>
      </main>
  );
}
