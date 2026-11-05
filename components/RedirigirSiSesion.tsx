"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSesion } from "@/components/SessionProvider";

/**
 * La portada es la página de venta para invitados. Si el usuario ya tiene
 * sesión, se le lleva a su panel en cuanto se comprueba la sesión.
 */
export default function RedirigirSiSesion() {
  const { sesion, cargando } = useSesion();
  const router = useRouter();

  useEffect(() => {
    if (!cargando && sesion) {
      router.replace("/dashboard");
    }
  }, [cargando, sesion, router]);

  return null;
}
