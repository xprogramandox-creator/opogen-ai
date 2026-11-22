import { NextResponse } from "next/server";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import { obtenerTokenCSRFDesdeCookie, verificarTokenCSRF } from "@/lib/csrf";
import { consumirLimite } from "@/lib/rate-limit";
import {
  crearTestimonio,
  tieneTestimonioPendiente,
  ultimoEnvioTestimonio,
} from "@/lib/testimonios-db";

const MIN_TEXTO = 20;
const MAX_TEXTO = 500;
const MIN_NOMBRE = 2;
const MAX_NOMBRE = 40;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

function error(mensaje: string, status = 400) {
  return NextResponse.json({ error: mensaje }, { status });
}

export async function POST(request: Request) {
  const usuario = await obtenerUsuarioSesion();

  if (!usuario) {
    return error("Inicia sesión para enviar un testimonio.", 401);
  }

  if (usuario.rol !== "premium") {
    return error("Los testimonios son exclusivos de los usuarios Premium.", 403);
  }

  const cookie = await obtenerTokenCSRFDesdeCookie();

  if (!verificarTokenCSRF(request, cookie)) {
    return error("Token CSRF inválido.", 403);
  }

  const cuerpo: unknown = await request.json().catch(() => null);

  if (!cuerpo || typeof cuerpo !== "object") {
    return error("Solicitud no válida.");
  }

  const datos = cuerpo as Record<string, unknown>;
  const texto = typeof datos.texto === "string" ? datos.texto.trim() : "";
  const nombreVisible =
    typeof datos.nombreVisible === "string" ? datos.nombreVisible.trim() : "";

  if (texto.length < MIN_TEXTO || texto.length > MAX_TEXTO) {
    return error(
      `El testimonio debe tener entre ${MIN_TEXTO} y ${MAX_TEXTO} caracteres.`,
    );
  }

  if (nombreVisible.length < MIN_NOMBRE || nombreVisible.length > MAX_NOMBRE) {
    return error(
      `El nombre visible debe tener entre ${MIN_NOMBRE} y ${MAX_NOMBRE} caracteres.`,
    );
  }

  const limite = consumirLimite(`testimonios:${usuario.clave}`, 5, 60 * 60 * 1000);

  if (!limite.permitido) {
    return error("Demasiados envíos. Espera un poco antes de reintentar.", 429);
  }

  if (tieneTestimonioPendiente(usuario.clave)) {
    return error(
      "Ya tienes un testimonio pendiente de revisión. Espera a que lo moderemos.",
      409,
    );
  }

  const ultimo = ultimoEnvioTestimonio(usuario.clave);

  if (ultimo) {
    const transcurrido = Date.now() - new Date(ultimo).getTime();

    if (transcurrido < UN_DIA_MS) {
      return error("Solo puedes enviar un testimonio cada 24 horas.", 429);
    }
  }

  const testimonio = crearTestimonio(usuario.clave, nombreVisible, texto);

  return NextResponse.json(
    {
      testimonio: {
        id: testimonio.id,
        nombreVisible: testimonio.nombreVisible,
        texto: testimonio.texto,
        estado: testimonio.estado,
        fecha: testimonio.fecha,
      },
    },
    { status: 201 },
  );
}
