import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";
import PantallaBloqueo from "@/components/PantallaBloqueo";
import { obtenerUsuarioSesion } from "@/lib/auth-server";

export const instant = false;

export default async function KidsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const usuario = await obtenerUsuarioSesion();

  if (usuario?.rol === "premium") {
    return <>{children}</>;
  }

  const t = await getTranslations("KidsLock");

  return (
    <PantallaBloqueo
      icono={<Sparkles className="h-7 w-7" strokeWidth={2} aria-hidden="true" />}
      titulo={t("title")}
      subtitulo={t("subtitle")}
      ventajas={[1, 2, 3, 4, 5].map((indice) => t(`benefits.${indice}`))}
      textoBoton={t("cta")}
      enlaceBoton="/premium"
    />
  );
}
