import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type ResultadoLimite = {
  success: boolean;
  reset?: number;
  remaining?: number;
};

type Limitador = {
  limit: (clave: string) => Promise<ResultadoLimite>;
};

type RegistroMemoria = {
  usos: number;
  reinicio: number;
};

const registros = new Map<string, RegistroMemoria>();
const MAX_REGISTROS = 5_000;

function limpiarVencidos(ahora: number): void {
  if (registros.size < MAX_REGISTROS) return;

  for (const [clave, registro] of registros) {
    if (registro.reinicio <= ahora) {
      registros.delete(clave);
    }
  }
}

function limitarEnMemoria(
  prefijo: string,
  maximo: number,
  ventanaMs: number,
  clave: string,
): ResultadoLimite {
  const ahora = Date.now();
  const claveInterna = `${prefijo}:${clave}`;
  const existente = registros.get(claveInterna);

  limpiarVencidos(ahora);

  if (!existente || existente.reinicio <= ahora) {
    const reinicio = ahora + ventanaMs;
    registros.set(claveInterna, { usos: 1, reinicio });

    return {
      success: true,
      reset: reinicio,
      remaining: Math.max(0, maximo - 1),
    };
  }

  existente.usos += 1;

  return {
    success: existente.usos <= maximo,
    reset: existente.reinicio,
    remaining: Math.max(0, maximo - existente.usos),
  };
}

function crearLimitador(
  prefijo: string,
  maximo: number,
  ventanaMs: number,
): Limitador {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  // Sin Upstash configurado, la app debe seguir funcionando con un límite
  // local en memoria. Así una variable ausente no rompe login/registro.
  if (!url || !token) {
    return {
      limit: async (clave) =>
        limitarEnMemoria(prefijo, maximo, ventanaMs, clave),
    };
  }

  try {
    const redis = new Redis({ url, token });
    const ratelimit = new Ratelimit({
      redis,
      prefix: prefijo,
      limiter: Ratelimit.slidingWindow(maximo, "1 h"),
      analytics: true,
    });

    return {
      limit: async (clave) => {
        try {
          return await ratelimit.limit(clave);
        } catch (error) {
          console.error(
            `[ratelimit] Upstash no disponible (${prefijo}); usando memoria:`,
            error,
          );
          return limitarEnMemoria(
            prefijo,
            maximo,
            ventanaMs,
            clave,
          );
        }
      },
    };
  } catch (error) {
    console.error(
      `[ratelimit] No se pudo inicializar Upstash (${prefijo}); usando memoria:`,
      error,
    );

    return {
      limit: async (clave) =>
        limitarEnMemoria(prefijo, maximo, ventanaMs, clave),
    };
  }
}

export const ratelimitRegistro = crearLimitador(
  "opogen:registro",
  7,
  60 * 60 * 1000,
);

export const ratelimitLogin = crearLimitador(
  "opogen:login",
  7,
  60 * 60 * 1000,
);

export const ratelimitRecuperacion = crearLimitador(
  "opogen:recuperacion",
  3,
  60 * 60 * 1000,
);
