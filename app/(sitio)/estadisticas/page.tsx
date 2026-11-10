import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import EstadisticasContenido from "@/components/EstadisticasContenido";
import PantallaBloqueo from "@/components/PantallaBloqueo";
import { obtenerUsuarioSesion } from "@/lib/auth-server";

export const metadata: Metadata = {
  title: "Estadísticas",
  description:
    "Consulta tu progreso de estudio: tests completados, nota media, aciertos, fallos y actividad de los últimos días.",
};

export const instant = false;

export default async function EstadisticasPage() {
  const usuario = await obtenerUsuarioSesion();

  if (!usuario || usuario.rol !== "premium") {
    const t = await getTranslations("Bloqueos.estadisticas");

    return (
      <PantallaBloqueo
        icono={<span className="text-3xl">📊</span>}
        titulo={t("title")}
        subtitulo={t("subtitle")}
        ventajas={[1, 2, 3, 4].map((indice) =>
          t(`benefits.${indice}`),
        )}
        textoBoton={t("cta")}
        enlaceBoton="/premium"
      />
    );
  }

  return (
    <main id="contenido" className="min-h-app bg-transparent font-sans">
        <section className="mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-14 lg:py-16">
          <EstadisticasContenido />
        </section>
      </main>
  );
}
