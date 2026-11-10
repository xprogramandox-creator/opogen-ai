import { NextResponse } from "next/server";
import {
  nombreCompletoUsuario,
  obtenerUsuarioSesion,
} from "@/lib/auth-server";
import { obtenerFechaCaducidadPremium } from "@/lib/suscripcion";
import { CLAVE_ADMIN } from "@/lib/planes";
import {
  describirLimiteInvitado,
  leerLimiteInvitado,
} from "@/lib/limites-invitado";

export async function GET(request: Request) {
  const usuario = await obtenerUsuarioSesion();

  if (usuario) {
    const fechaCaducidadPremium =
      usuario.rol === "premium"
        ? await obtenerFechaCaducidadPremium(usuario)
        : null;

    return NextResponse.json(
      {
        autenticado: true,
        nombre: usuario.nombre,
        nombreCompleto: nombreCompletoUsuario(usuario),
        correo: usuario.correo,
        telefono: usuario.telefono,
        esAdmin: usuario.clave === CLAVE_ADMIN,
        rol: usuario.rol,
        planContratado: usuario.planContratado ?? null,
        fechaCaducidadPremium,
        emailVerificado: usuario.emailVerificado === true,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }

  const limite = await leerLimiteInvitado(request);

  return NextResponse.json(
    {
      autenticado: false,
      limiteInvitado: describirLimiteInvitado(limite),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
