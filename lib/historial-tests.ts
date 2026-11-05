export const HISTORIAL_TESTS_MAX = 300;

export type EntradaHistorialTest = {
  fecha: string;
  nota: number;
  carpeta: string;
  aciertos: number;
  fallos: number;
  enBlanco: number;
  total: number;
};

export type NuevoTestCompletado = Omit<EntradaHistorialTest, "fecha"> & {
  fecha?: string;
};

/** Carpeta madre que agrupa los tests mixtos y los repasos de fallos. */
export function carpetaMadre(nombre: string): string {
  return nombre
    .replace(/^Test Mixtos - /, "")
    .replace(/^Simulacros - /, "")
    .replace(/^Fallos - /, "")
    .trim();
}

function numeroSeguro(valor: unknown): number {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
}

export function normalizarEntradaHistorial(
  valor: unknown,
): EntradaHistorialTest | null {
  if (!valor || typeof valor !== "object") return null;

  const entrada = valor as Record<string, unknown>;

  if (typeof entrada.fecha !== "string") return null;
  if (Number.isNaN(new Date(entrada.fecha).getTime())) return null;

  return {
    fecha: entrada.fecha,
    nota: numeroSeguro(entrada.nota),
    carpeta:
      typeof entrada.carpeta === "string" && entrada.carpeta.trim().length > 0
        ? entrada.carpeta.trim()
        : "Sin carpeta",
    aciertos: numeroSeguro(entrada.aciertos),
    fallos: numeroSeguro(entrada.fallos),
    enBlanco: numeroSeguro(entrada.enBlanco),
    total: numeroSeguro(entrada.total),
  };
}

export function guardarTestCompletado(entrada: NuevoTestCompletado): void {
  if (typeof window === "undefined") return;

  const carpeta = entrada.carpeta.trim();
  const completa: EntradaHistorialTest = {
    ...entrada,
    fecha: entrada.fecha ?? new Date().toISOString(),
    carpeta: carpeta.length > 0 ? carpeta : "Test rápido",
  };

  // Solo se guarda en el servidor, dentro de la carpeta del usuario.
  // Así el historial nunca se mezcla con el de otra cuenta del navegador.
  void fetch("/api/estadisticas", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(completa),
    cache: "no-store",
  }).catch(() => {});
}
