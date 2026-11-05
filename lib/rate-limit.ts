type RegistroLimite = {
  usos: number;
  reinicio: number;
};

const registros = new Map<string, RegistroLimite>();
const MAX_REGISTROS = 5_000;

function limpiarVencidos(ahora: number): void {
  if (registros.size < MAX_REGISTROS) {
    return;
  }

  for (const [clave, registro] of registros) {
    if (registro.reinicio <= ahora) {
      registros.delete(clave);
    }
  }
}

export type ResultadoLimite = {
  permitido: boolean;
  restantes: number;
  reintentarEnSegundos: number;
};

/**
 * Límite de peticiones en memoria. Suficiente para una instancia; en un
 * despliegue con varias instancias hace falta un almacén compartido.
 */
export function consumirLimite(
  clave: string,
  maximo: number,
  ventanaMs: number,
): ResultadoLimite {
  const ahora = Date.now();

  limpiarVencidos(ahora);

  const actual = registros.get(clave);

  if (!actual || actual.reinicio <= ahora) {
    registros.set(clave, { usos: 1, reinicio: ahora + ventanaMs });

    return {
      permitido: true,
      restantes: Math.max(0, maximo - 1),
      reintentarEnSegundos: Math.ceil(ventanaMs / 1000),
    };
  }

  actual.usos += 1;

  const reintentarEnSegundos = Math.max(
    1,
    Math.ceil((actual.reinicio - ahora) / 1000),
  );

  return {
    permitido: actual.usos <= maximo,
    restantes: Math.max(0, maximo - actual.usos),
    reintentarEnSegundos,
  };
}

/** Borra el contador (por ejemplo, tras un inicio de sesión correcto). */
export function reiniciarLimite(clave: string): void {
  registros.delete(clave);
}
