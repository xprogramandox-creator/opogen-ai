import { NextResponse } from "next/server";
import {
  crearSesion,
  esClaveUsuarioValida,
  leerUsuario,
  purgarUsuariosFreemiumObsoletos,
  rutaArchivoUsuario,
  verificarPassword,
} from "@/lib/auth-server";
import { obtenerIpCliente } from "@/lib/ip";
import { consumirLimite, reiniciarLimite } from "@/lib/rate-limit";
import { ratelimitLogin } from "@/lib/ratelimit";
import { obtenerTokenCSRFDesdeCookie, respuestaErrorCSRF, verificarTokenCSRF } from "@/lib/csrf";
import {
  buscarPais,
  construirClaveTelefono,
  normalizarCodigoPais,
  normalizarNumeroTelefono,
} from "@/lib/telefono";

const MAX_INTENTOS_LOGIN = 7;
const VENTANA_INTENTOS_MS = 60 * 60 * 1000;

function respuestaError(mensaje: string, estado: number) {
  return NextResponse.json({ error: mensaje }, { status: estado });
}

export async function POST(request: Request) {
  void purgarUsuariosFreemiumObsoletos().catch(() => {});

  const tokenCookie = await obtenerTokenCSRFDesdeCookie();
  if (!verificarTokenCSRF(request, tokenCookie)) {
    return respuestaErrorCSRF();
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
  const codigoBruto =
    typeof datos.codigo === "string" ? datos.codigo.trim() : "";
  const numeroBruto =
    typeof datos.numero === "string" ? datos.numero.trim() : "";
  const password =
    typeof datos.password === "string" ? datos.password : "";

  if (!/^\d{1,4}$/.test(codigoBruto) || !/^\d{4,15}$/.test(numeroBruto)) {
    return respuestaError("El teléfono no es válido.", 400);
  }

  const codigo = normalizarCodigoPais(codigoBruto);
  const numero = normalizarNumeroTelefono(numeroBruto);

  if (!buscarPais(codigo)) {
    return respuestaError("El teléfono no es válido.", 400);
  }

  if (!password) {
    return respuestaError("Escribe tu contraseña.", 400);
  }

  const clave = construirClaveTelefono(codigo, numero);

  if (!esClaveUsuarioValida(clave)) {
    return respuestaError("El teléfono no es válido.", 400);
  }

  const ip = obtenerIpCliente(request);

  const { success, reset } = await ratelimitLogin.limit(`login:${ip}`);
  if (!success) {
    const retryAfterSegundos = reset
      ? Math.max(1, Math.ceil((reset - Date.now()) / 1000))
      : 60;
    return NextResponse.json(
      {
        error:
          "Demasiados intentos. Espera unos minutos antes de volver a probar.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSegundos),
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const limite = consumirLimite(
    `login:${ip}:${clave}`,
    MAX_INTENTOS_LOGIN,
    VENTANA_INTENTOS_MS,
  );

  if (!limite.permitido) {
    return NextResponse.json(
      {
        error:
          "Demasiados intentos. Espera unos minutos antes de volver a probar.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(limite.reintentarEnSegundos),
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const usuario = await leerUsuario(clave);
  let passwordCorrecta = false;

  if (usuario) {
    try {
      passwordCorrecta = await verificarPassword(
        password,
        usuario.passwordHash,
      );
    } catch {
      passwordCorrecta = false;
    }
  }

  if (!usuario || !passwordCorrecta) {
    return respuestaError("Teléfono o contraseña incorrectos.", 401);
  }

  if (
    usuario.passwordHash.startsWith("$2b$") ||
    usuario.passwordHash.startsWith("$2a$") ||
    usuario.passwordHash.startsWith("$2y$")
  ) {
    try {
      const { hashPassword } = await import("@/lib/auth-server");
      const nuevoHash = await hashPassword(password);
      const { writeFile } = await import("node:fs/promises");
      const { serializarDatos } = await import("@/lib/auth-server");
      const actualizado = {
        ...usuario,
        passwordHash: nuevoHash,
        clave: usuario.clave,
      };
      await writeFile(
        rutaArchivoUsuario(usuario.clave, usuario.rol),
        serializarDatos(actualizado),
        { encoding: "utf8" },
      );
      usuario.passwordHash = nuevoHash;
    } catch {
      // No interrumpir el login si falla la migración
    }
  }

  if (usuario.emailVerificado === false) {
    return NextResponse.json(
      {
        error:
          "Debes verificar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada",
      },
      { status: 403 },
    );
  }

  reiniciarLimite(`login:${ip}:${clave}`);
  await crearSesion(clave);

  return NextResponse.json({
    ok: true,
    nombre: usuario.nombre,
    rol: usuario.rol,
  });
}
