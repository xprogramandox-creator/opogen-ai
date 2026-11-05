import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import {
  esClaveUsuarioValida,
  leerUsuario,
  rutaArchivoUsuario,
  serializarDatos,
} from "@/lib/auth-server";
import {
  buscarPais,
  construirClaveTelefono,
  normalizarCodigoPais,
  normalizarNumeroTelefono,
} from "@/lib/telefono";
import { obtenerIpCliente } from "@/lib/ip";
import { ratelimitRecuperacion } from "@/lib/ratelimit";
import { enviarCorreoRestablecimiento } from "@/lib/email";
import { obtenerUrlBase } from "@/lib/url-base";

const DURACION_TOKEN_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  const cuerpo: unknown = await request.json().catch(() => null);

  if (!cuerpo || typeof cuerpo !== "object") {
    return NextResponse.json(
      { error: "Solicitud no válida." },
      { status: 400 },
    );
  }

  const datos = cuerpo as Record<string, unknown>;
  const codigoBruto =
    typeof datos.codigo === "string" ? datos.codigo.trim() : "";
  const numeroBruto =
    typeof datos.numero === "string" ? datos.numero.trim() : "";

  if (!/^\d{1,4}$/.test(codigoBruto) || !/^\d{4,15}$/.test(numeroBruto)) {
    return NextResponse.json(
      { error: "El teléfono no es válido." },
      { status: 400 },
    );
  }

  const codigo = normalizarCodigoPais(codigoBruto);
  const numero = normalizarNumeroTelefono(numeroBruto);

  if (!buscarPais(codigo)) {
    return NextResponse.json(
      { error: "El teléfono no es válido." },
      { status: 400 },
    );
  }

  const clave = construirClaveTelefono(codigo, numero);

  if (!esClaveUsuarioValida(clave)) {
    return NextResponse.json(
      { error: "El teléfono no es válido." },
      { status: 400 },
    );
  }

  const ip = obtenerIpCliente(request);
  const { success, reset } = await ratelimitRecuperacion.limit(
    `forgot:${ip}:${clave}`,
  );

  if (!success) {
    const retryAfterSegundos = reset
      ? Math.max(1, Math.ceil((reset - Date.now()) / 1000))
      : 3600;

    return NextResponse.json(
      { error: "Demasiadas solicitudes. Inténtalo de nuevo más tarde." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSegundos),
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const usuario = await leerUsuario(clave);

  if (usuario) {
    const token = randomUUID();
    const expira = Date.now() + DURACION_TOKEN_MS;

    usuario.resetToken = token;
    usuario.resetTokenExpira = expira;

    await writeFile(
      rutaArchivoUsuario(usuario.clave, usuario.rol),
      serializarDatos(usuario),
      "utf8",
    );

    const baseUrl = obtenerUrlBase(new URL(request.url).origin);
    const enlace = `${baseUrl}/reset-password?token=${token}`;

    try {
      await enviarCorreoRestablecimiento(usuario.correo, enlace);
    } catch {
      // Nunca revelamos si el envío o el teléfono existen.
    }
  }

  return NextResponse.json({
    ok: true,
    mensaje:
      "Si el número está registrado, recibirás un correo con las instrucciones.",
  });
}
