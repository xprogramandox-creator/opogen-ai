import { NextResponse } from "next/server";
import { writeFile } from "node:fs/promises";
import {
  guardarUsuario,
  listarUsuarios,
  serializarDatos,
} from "@/lib/auth-server";
import {
  eliminarRegistroPendiente,
  obtenerRegistroPendiente,
} from "@/lib/admin-db";

function paginaResultado({
  titulo,
  mensaje,
  error = false,
  status = 200,
}: {
  titulo: string;
  mensaje: string;
  error?: boolean;
  status?: number;
}) {
  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${titulo} · OpoGen AI</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: #f6f1e7;
      color: #14213d;
      font-family: Georgia, "Times New Roman", serif;
    }
    main {
      width: 100%;
      max-width: 560px;
      border: 1px solid #d8cfc0;
      border-radius: 24px;
      background: #fffdf8;
      padding: 36px 28px;
      box-shadow: 0 18px 45px rgba(20, 33, 61, 0.12);
      text-align: center;
    }
    .icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 58px;
      height: 58px;
      border-radius: 18px;
      margin-bottom: 16px;
      background: ${error ? "#fbe9e7" : "#e8f0fb"};
      color: ${error ? "#b42318" : "#1d4ed8"};
      font-family: system-ui, sans-serif;
      font-size: 28px;
    }
    h1 {
      margin: 0 0 14px;
      font-size: clamp(25px, 5vw, 34px);
      line-height: 1.2;
      color: ${error ? "#b42318" : "#1d4ed8"};
    }
    p {
      margin: 0;
      font-family: system-ui, sans-serif;
      font-size: 16px;
      line-height: 1.75;
      color: #374151;
      white-space: pre-line;
    }
    small {
      display: block;
      margin-top: 18px;
      font-family: system-ui, sans-serif;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <main>
    <div class="icon" aria-hidden="true">${error ? "!" : "✓"}</div>
    <h1>${titulo}</h1>
    <p>${mensaje}</p>
    <small>OpoGen AI</small>
  </main>
</body>
</html>`;

  return new NextResponse(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function exito() {
  return paginaResultado({
    titulo: "✅ ¡Cuenta verificada correctamente!",
    mensaje:
      "Ya puedes iniciar sesión con tu teléfono y contraseña.\n\n(Si no ves el cambio, pulsa F5 para recargar).",
  });
}

function invalido() {
  return paginaResultado({
    titulo: "Enlace no válido",
    mensaje:
      "Este enlace de verificación no existe, ha caducado o ya se ha utilizado.\n\nSolicita un correo nuevo desde el inicio de sesión.",
    error: true,
    status: 400,
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim() || "";

  if (!token) {
    return invalido();
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

      return exito();
    } catch (error) {
      console.error("[Verificar] Error al materializar la cuenta:", error);

      return paginaResultado({
        titulo: "No se pudo verificar la cuenta",
        mensaje:
          "Ha ocurrido un error al activar tu cuenta. Inténtalo de nuevo más tarde.",
        error: true,
        status: 500,
      });
    }
  }

  // 2. Cuentas antiguas que ya tienen carpeta pero aún no estaban verificadas.
  let usuarios;

  try {
    usuarios = await listarUsuarios();
  } catch (error) {
    console.error("[Verificar] Error al leer usuarios:", error);

    return paginaResultado({
      titulo: "No se pudo comprobar la verificación",
      mensaje:
        "Ha ocurrido un error al comprobar tu cuenta. Inténtalo de nuevo más tarde.",
      error: true,
      status: 500,
    });
  }

  for (const { usuario, rutaArchivo } of usuarios) {
    if (usuario.tokenVerificacion !== token) {
      continue;
    }

    if (
      usuario.tokenVerificacionExpira &&
      Date.now() > usuario.tokenVerificacionExpira
    ) {
      return invalido();
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

      return exito();
    } catch (error) {
      console.error(
        "[Verificar] Error al verificar una cuenta existente:",
        error,
      );

      return paginaResultado({
        titulo: "No se pudo verificar la cuenta",
        mensaje:
          "Ha ocurrido un error al activar tu cuenta. Inténtalo de nuevo más tarde.",
        error: true,
        status: 500,
      });
    }
  }

  return invalido();
}
