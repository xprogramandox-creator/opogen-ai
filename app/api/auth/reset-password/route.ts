import { NextResponse } from "next/server";
import { writeFile } from "node:fs/promises";
import {
  buscarUsuarioPorTokenReset,
  hashPassword,
  rutaArchivoUsuario,
  serializarDatos,
} from "@/lib/auth-server";
import { passwordValida } from "@/lib/validacion";

function respuestaError(mensaje: string, estado: number) {
  return NextResponse.json({ error: mensaje }, { status: estado });
}

export async function POST(request: Request) {
  const cuerpo: unknown = await request.json().catch(() => null);

  if (!cuerpo || typeof cuerpo !== "object") {
    return respuestaError("Solicitud no válida.", 400);
  }

  const datos = cuerpo as Record<string, unknown>;
  const token =
    typeof datos.token === "string" ? datos.token.trim() : "";
  const nuevaPassword =
    typeof datos.nuevaPassword === "string"
      ? datos.nuevaPassword
      : "";

  if (!token) {
    return respuestaError("Token inválido o caducado.", 400);
  }

  if (nuevaPassword.length < 8 || !passwordValida(nuevaPassword)) {
    return respuestaError(
      "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.",
      400,
    );
  }

  const encontrado = await buscarUsuarioPorTokenReset(token);

  if (!encontrado) {
    return respuestaError("Token inválido o caducado.", 400);
  }

  const { usuario, plan } = encontrado;

  if (
    !usuario.resetTokenExpira ||
    Date.now() > usuario.resetTokenExpira
  ) {
    return respuestaError("Token inválido o caducado.", 400);
  }

  const actualizado = {
    ...usuario,
    passwordHash: await hashPassword(nuevaPassword),
    resetToken: undefined,
    resetTokenExpira: undefined,
  };

  await writeFile(
    rutaArchivoUsuario(usuario.clave, plan),
    serializarDatos(actualizado),
    "utf8",
  );

  return NextResponse.json({ ok: true });
}
