import { NextResponse } from "next/server";
import { writeFile } from "node:fs/promises";
import {
  crearSesion,
  guardarUsuario,
  listarUsuarios,
  serializarDatos,
} from "@/lib/auth-server";
import {
  eliminarRegistroPendiente,
  obtenerRegistroPendiente,
} from "@/lib/admin-db";

function destinoTrasVerificar(planPendiente: string | null): string {
  return planPendiente ? "/premium" : "/dashboard";
}

function planPendienteDe(
  rol: string,
  planContratado: string | undefined,
): string | null {
  return rol === "freemium" &&
    planContratado &&
    ["mensual", "semestral", "anual"].includes(planContratado)
    ? planContratado
    : null;
}

function redirigirInvalido(request: Request): NextResponse {
  return NextResponse.redirect(
    new URL("/login?error=token_invalido", request.url),
  );
}

function redirigirCorrecto(
  request: Request,
  planPendiente: string | null,
): NextResponse {
  return NextResponse.redirect(
    new URL(destinoTrasVerificar(planPendiente), request.url),
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim() || "";

  if (!token) {
    return redirigirInvalido(request);
  }

  // 1. Registro pendiente: todavía no existe carpeta ni datos.txt.
  const pendiente = obtenerRegistroPendiente(token);

  if (pendiente) {
    try {
      const usuarioVerificado = {
        ...pendiente,
        emailVerificado: true,
        tokenVerificacion: undefined,
        tokenVerificacionExpira: undefined,
      };

      // La carpeta se crea únicamente aquí, con un token válido.
      await guardarUsuario(usuarioVerificado);

      try {
        eliminarRegistroPendiente(token);
      } catch (error) {
        console.error(
          "[Verificar] No se pudo borrar el registro pendiente:",
          error,
        );
      }

      await crearSesion(pendiente.clave);
      return redirigirCorrecto(
        request,
        planPendienteDe(
          pendiente.rol,
          pendiente.planContratado,
        ),
      );
    } catch (error) {
      // El token era válido; un fallo interno no debe confundirse con un
      // token inválido ni redirigir al login.
      console.error("[Verificar] Error al materializar la cuenta:", error);

      return NextResponse.json(
        { error: "No se pudo activar la cuenta. Inténtalo de nuevo." },
        { status: 500 },
      );
    }
  }

  // 2. Cuentas antiguas que ya tienen carpeta pero aún no estaban verificadas.
  let usuarios;

  try {
    usuarios = await listarUsuarios();
  } catch (error) {
    console.error("[Verificar] Error al leer usuarios:", error);
    return NextResponse.json(
      { error: "No se pudo comprobar la verificación." },
      { status: 500 },
    );
  }

  for (const { usuario, rutaArchivo } of usuarios) {
    if (usuario.tokenVerificacion !== token) {
      continue;
    }

    if (
      usuario.tokenVerificacionExpira &&
      Date.now() > usuario.tokenVerificacionExpira
    ) {
      return redirigirInvalido(request);
    }

    try {
      const actualizado = {
        ...usuario,
        emailVerificado: true,
        tokenVerificacion: undefined,
        tokenVerificacionExpira: undefined,
      };

      await writeFile(rutaArchivo, serializarDatos(actualizado), {
        encoding: "utf8",
      });

      await crearSesion(usuario.clave);
      return redirigirCorrecto(
        request,
        planPendienteDe(
          usuario.rol,
          usuario.planContratado,
        ),
      );
    } catch (error) {
      console.error(
        "[Verificar] Error al verificar una cuenta existente:",
        error,
      );

      return NextResponse.json(
        { error: "No se pudo activar la cuenta. Inténtalo de nuevo." },
        { status: 500 },
      );
    }
  }

  // 3. Solo llegamos aquí si el token no existe o ya fue utilizado.
  return redirigirInvalido(request);
}
