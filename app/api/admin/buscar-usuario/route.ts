import { NextResponse } from "next/server";
import { esClaveUsuarioValida, leerUsuario } from "@/lib/auth-server";
import { esPeticionAdmin } from "@/lib/admin-auth";

export async function GET(request: Request) {
  if (!(await esPeticionAdmin(request))) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401 },
    );
  }

  const telefono = new URL(request.url).searchParams
    .get("telefono")
    ?.trim();

  if (!telefono || !esClaveUsuarioValida(telefono)) {
    return NextResponse.json(
      { error: "Teléfono no válido." },
      { status: 400 },
    );
  }

  const usuario = await leerUsuario(telefono);

  if (!usuario) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      usuario: {
        clave: usuario.clave,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos ?? "",
        correo: usuario.correo,
        rol: usuario.rol,
        planContratado: usuario.planContratado ?? "",
        fechaInicio: usuario.fechaInicio ?? "",
        fechaCaducidad: usuario.fechaCaducidad ?? "",
      },
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
