import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { peticionEsHttps } from "@/lib/cookie-seguro";
import { obtenerIpCliente } from "@/lib/ip";
import { secretoLimiteInvitado } from "@/lib/secreto";
import {
  MAX_GENERACIONES_INVITADO,
  MAX_PREGUNTAS_INVITADO,
  MENSAJE_LIMITE_INVITADO,
  type LimiteInvitadoPublico,
} from "@/lib/limites-invitado-constantes";

export {
  MAX_GENERACIONES_INVITADO,
  MAX_PREGUNTAS_INVITADO,
  MENSAJE_LIMITE_INVITADO,
};
export type { LimiteInvitadoPublico };

const COOKIE_LIMITE_INVITADO = "opoquiz_invitado_limite";
const DURACION_LIMITE_MS = 24 * 60 * 60 * 1000;

export type EstadoLimiteInvitado = {
  usos: number;
  expira: number;
};

export function describirLimiteInvitado(
  estado: EstadoLimiteInvitado,
): LimiteInvitadoPublico {
  const restantes = Math.max(
    0,
    MAX_GENERACIONES_INVITADO - estado.usos,
  );

  return {
    usos: estado.usos,
    restantes,
    maximo: MAX_GENERACIONES_INVITADO,
    agotado: restantes === 0,
    mensaje: MENSAJE_LIMITE_INVITADO,
  };
}

const registrosPorIp = new Map<string, EstadoLimiteInvitado>();

function obtenerIp(request: Request): string {
  return obtenerIpCliente(request);
}

function firmarEstado(
  usos: number,
  expira: number,
  ip: string,
): string {
  const datos = `${usos}.${expira}`;
  const firma = createHmac("sha256", secretoLimiteInvitado())
    .update(`${datos}|${ip}`)
    .digest("base64url");

  return `${datos}.${firma}`;
}

function verificarEstado(
  valor: string | undefined,
  ip: string,
  ahora: number,
): EstadoLimiteInvitado | null {
  if (!valor) {
    return null;
  }

  const partes = valor.split(".");

  if (partes.length !== 3) {
    return null;
  }

  const [textoUsos, textoExpira, firma] = partes;
  const usos = Number(textoUsos);
  const expira = Number(textoExpira);

  if (
    !Number.isInteger(usos) ||
    usos < 0 ||
    usos > MAX_GENERACIONES_INVITADO ||
    !Number.isInteger(expira) ||
    expira <= ahora
  ) {
    return null;
  }

  const esperada = createHmac("sha256", secretoLimiteInvitado())
    .update(`${textoUsos}.${textoExpira}|${ip}`)
    .digest();
  let recibida: Buffer;

  try {
    recibida = Buffer.from(firma, "base64url");
  } catch {
    return null;
  }

  if (
    recibida.length !== esperada.length ||
    !timingSafeEqual(recibida, esperada)
  ) {
    return null;
  }

  return { usos, expira };
}

function limpiarRegistrosVencidos(ahora: number): void {
  if (registrosPorIp.size < 1000) {
    return;
  }

  for (const [ip, estado] of registrosPorIp) {
    if (estado.expira <= ahora) {
      registrosPorIp.delete(ip);
    }
  }
}

export async function leerLimiteInvitado(
  request: Request,
): Promise<EstadoLimiteInvitado> {
  const ahora = Date.now();
  const ip = obtenerIp(request);
  const store = await cookies();
  const desdeCookie = verificarEstado(
    store.get(COOKIE_LIMITE_INVITADO)?.value,
    ip,
    ahora,
  );
  const desdeIp = registrosPorIp.get(ip);

  limpiarRegistrosVencidos(ahora);

  const estados: EstadoLimiteInvitado[] = [];

  if (desdeCookie && desdeCookie.expira > ahora) {
    estados.push(desdeCookie);
  }

  if (desdeIp && desdeIp.expira > ahora) {
    estados.push(desdeIp);
  }

  if (estados.length === 0) {
    return {
      usos: 0,
      expira: ahora + DURACION_LIMITE_MS,
    };
  }

  return estados.reduce((actual, candidato) => {
    if (candidato.usos !== actual.usos) {
      return candidato.usos > actual.usos ? candidato : actual;
    }

    return candidato.expira > actual.expira ? candidato : actual;
  });
}

export async function registrarUsoInvitado(
  request: Request,
  estado: EstadoLimiteInvitado,
): Promise<EstadoLimiteInvitado> {
  const ahora = Date.now();
  const ip = obtenerIp(request);
  const siguiente: EstadoLimiteInvitado = {
    usos: estado.usos + 1,
    expira: estado.expira,
  };

  registrosPorIp.set(ip, siguiente);

  const store = await cookies();
  const esHttps = await peticionEsHttps();

  store.set(
    COOKIE_LIMITE_INVITADO,
    firmarEstado(siguiente.usos, siguiente.expira, ip),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: esHttps,
      path: "/",
      maxAge: Math.max(
        1,
        Math.ceil((siguiente.expira - ahora) / 1000),
      ),
    },
  );

  return siguiente;
}

export function segundosHastaRenovar(
  estado: EstadoLimiteInvitado,
): number {
  return Math.max(
    1,
    Math.ceil((estado.expira - Date.now()) / 1000),
  );
}
