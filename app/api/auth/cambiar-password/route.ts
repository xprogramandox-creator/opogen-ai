import { NextResponse } from "next/server";
import { writeFile } from "node:fs/promises";
import {
  hashPassword,
  obtenerClaveSesion,
  leerUsuario,
  rutaArchivoUsuario,
  serializarDatos,
  verificarPassword,
} from "@/lib/auth-server";
import { mensajeError } from "@/lib/errores";
import { passwordValida } from "@/lib/validacion";

function respuestaError(mensaje: string, estado: number) {
  return NextResponse.json({ error: mensaje }, { status: estado });
}

export async function POST(request: Request) {
  const clave = await obtenerClaveSesion();

  if (!clave) {
    return respuestaError("No autenticado.", 401);
  }

  const usuario = await leerUsuario(clave);

  if (!usuario) {
    return respuestaError("No autenticado.", 401);
  }

  let cuerpo: unknown;

  try {
    cuerpo = await request.json();
  } catch {
    return respuestaError("Solicitud no válida.", 400);
  }

  if (typeof cuerpo !== "object" || cuerpo === null) {
    return respuestaError("Solicitud no válida.", 400);
  }

  const datos = cuerpo as Record<string, unknown>;
  const actual =
    typeof datos.actual === "string" ? datos.actual : "";
  const nueva =
    typeof datos.nueva === "string" ? datos.nueva : "";

  if (!actual) {
    return respuestaError(
      "Introduce tu contraseña actual.",
      400,
    );
  }

  let correcta = false;

  try {
    correcta = await verificarPassword(
      actual,
      usuario.passwordHash,
    );
  } catch {
    correcta = false;
  }

  if (!correcta) {
    return respuestaError(
      "La contraseña actual no es correcta.",
      401,
    );
  }

  if (!passwordValida(nueva)) {
    return respuestaError(
      "La nueva contraseña debe tener una mayúscula, una minúscula, un número y un carácter especial.",
      400,
    );
  }

  if (nueva === actual) {
    return respuestaError(
      "La nueva contraseña debe ser diferente a la actual.",
      400,
    );
  }

  try {
    const actualizado = {
      ...usuario,
      passwordHash: await hashPassword(nueva),
    };

    await writeFile(
      rutaArchivoUsuario(usuario.clave, usuario.rol),
      serializarDatos(actualizado),
      "utf8",
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return respuestaError(
      mensajeError(error) ||
        "No se pudo cambiar la contraseña.",
      500,
    );
  }
}
