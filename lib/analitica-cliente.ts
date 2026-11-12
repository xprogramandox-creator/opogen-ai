// Utilidades de analítica que solo se ejecutan en el cliente.
// Comparten la clave de sesión con AnaliticaTracker.

const CLAVE_SESION = "opogen:analitica:sesion";

function nuevoId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // Se usa el fallback de abajo.
  }

  return `anon-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function obtenerSessionIdAnalitica(): string {
  try {
    const existente = window.sessionStorage.getItem(CLAVE_SESION);

    if (existente) return existente;

    const nuevo = nuevoId();
    window.sessionStorage.setItem(CLAVE_SESION, nuevo);
    return nuevo;
  } catch {
    return nuevoId();
  }
}

export type PaginaInvitado = "landing" | "crear" | "arcade";
export type AccionInvitado = "visita" | "test_creado" | "partida_arcade";

export function registrarEventoInvitado(
  pagina: PaginaInvitado,
  accion: AccionInvitado,
): void {
  void fetch("/api/analitica/evento", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: obtenerSessionIdAnalitica(),
      pagina,
      accion,
    }),
    cache: "no-store",
    keepalive: true,
  }).catch(() => {});
}
