const TOKENS = new Map<
  string,
  { email: string; expira: number }
>();

const DURACION_TOKEN_MS = 30 * 60 * 1000; // 30 minutos

export function crearTokenRecuperacion(email: string): string {
  const token = crypto.randomUUID();
  const expira = Date.now() + DURACION_TOKEN_MS;

  TOKENS.set(token, { email: email.toLowerCase().trim(), expira });
  return token;
}

export function validarTokenRecuperacion(
  token: string,
): { valido: boolean; email?: string } {
  if (!token) {
    return { valido: false };
  }

  const datos = TOKENS.get(token);
  if (!datos) {
    return { valido: false };
  }

  if (Date.now() > datos.expira) {
    TOKENS.delete(token);
    return { valido: false };
  }

  return { valido: true, email: datos.email };
}

export function eliminarTokenRecuperacion(token: string): void {
  TOKENS.delete(token);
}
