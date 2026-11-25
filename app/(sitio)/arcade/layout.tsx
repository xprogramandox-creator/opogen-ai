import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import PantallaBloqueo from "@/components/PantallaBloqueo";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import "./arcade.css";

export const metadata: Metadata = {
  title: "Modo Arcade",
  description:
    "Juega y aprende con tus propios apuntes en el modo Arcade de OpoGen.",
};

type ArcadeLayoutProps = {
  children: ReactNode;
};

export default async function ArcadeLayout({ children }: ArcadeLayoutProps) {
  const usuario = await obtenerUsuarioSesion();

  if (usuario?.rol !== "premium") {
    const t = await getTranslations("Bloqueos.arcade");

    return (
      <PantallaBloqueo
        icono={<Lock className="h-7 w-7" strokeWidth={2} aria-hidden="true" />}
        titulo={t("title")}
        subtitulo={t("subtitle")}
        ventajas={[1, 2, 3, 4].map((indice) => t(`benefits.${indice}`))}
        textoBoton={t("cta")}
        enlaceBoton="/premium"
      />
    );
  }

  return children;
}
