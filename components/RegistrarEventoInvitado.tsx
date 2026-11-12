"use client";

import { useEffect } from "react";
import {
  registrarEventoInvitado,
  type AccionInvitado,
  type PaginaInvitado,
} from "@/lib/analitica-cliente";

type Props = {
  pagina: PaginaInvitado;
  accion: AccionInvitado;
};

/** Registra un único evento de actividad de invitado al montar la página. */
export default function RegistrarEventoInvitado({ pagina, accion }: Props) {
  useEffect(() => {
    registrarEventoInvitado(pagina, accion);
  }, [pagina, accion]);

  return null;
}
