import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import MiEspacioContenido from "./MiEspacioContenido";
import PantallaBloqueo from "@/components/PantallaBloqueo";

export const metadata: Metadata = {
  title: "Mi Espacio",
  description:
    "Organiza tus tests, carpetas y simulacros mixtos en OpoGen AI.",
};

export const instant = false;

export default async function MiEspacioPage() {
  const usuario = await obtenerUsuarioSesion();

  if (!usuario || usuario.rol !== "premium") {
    const t = await getTranslations("Bloqueos.miEspacio");

    return (
      <PantallaBloqueo
        icono={<span className="text-3xl">📁</span>}
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

  return <MiEspacioContenido />;
}
