import { NextResponse } from "next/server";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import { obtenerTokenCSRFDesdeCookie, verificarTokenCSRF } from "@/lib/csrf";
import { CLAVE_ADMIN } from "@/lib/planes";
import { consumirLimite } from "@/lib/rate-limit";
import {
  crearTestimonio,
  tieneTestimonioPendiente,
  ultimoEnvioTestimonio,
} from "@/lib/testimonios-db";
import {
  esIdiomaTestimonio,
  traducirTestimonio,
} from "@/lib/traduccion";

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

  // La cuenta del CEO puede publicar siempre, aunque su rol no sea premium.
  const esAdministrador = usuario.clave === CLAVE_ADMIN;

  if (!esAdministrador && usuario.rol !== "premium") {
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
  const idioma = esIdiomaTestimonio(datos.idioma) ? datos.idioma : "es";

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

  // El administrador queda exento de las reglas anti-spam (1 pendiente,
  // 1 envío cada 24 h y límite por hora); el resto de usuarios no.
  if (!esAdministrador) {
    const limite = consumirLimite(
      `testimonios:${usuario.clave}`,
      5,
      60 * 60 * 1000,
    );

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
  }

  // Se traducen los seis idiomas al crear el testimonio. Si la IA falla, se
  // guarda el texto original en todos y el flujo sigue adelante.
  const textos = await traducirTestimonio(texto, idioma);
  const testimonio = crearTestimonio(
    usuario.clave,
    nombreVisible,
    texto,
    idioma,
    textos,
  );

  return NextResponse.json(
    {
      testimonio: {
        id: testimonio.id,
        nombreVisible: testimonio.nombreVisible,
        texto: testimonio.texto,
        idioma: testimonio.idioma,
        estado: testimonio.estado,
        fecha: testimonio.fecha,
      },
    },
    { status: 201 },
  );
}
