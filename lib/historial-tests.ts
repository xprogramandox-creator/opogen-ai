export const HISTORIAL_TESTS_MAX = 300;

export type EntradaHistorialTest = {
  fecha: string;
  nota: number;
  carpeta: string;
  aciertos: number;
  fallos: number;
  enBlanco: number;
  total: number;
  /** Archivo del test corregido; permite agrupar repeticiones. */
  testId?: string;
  /** Pendientes tras la corrección, para el histórico del gráfico. */
  pendientes?: number;
  /** "repaso" no cuenta como test completado, pero sí como acierto. */
  tipo?: "test" | "repaso" | "repaso_fallido" | "huerfano";
};

export type NuevoTestCompletado = Omit<EntradaHistorialTest, "fecha"> & {
  fecha?: string;
};

/**
 * Normaliza el nombre de una carpeta para comparar: sin acentos, sin
 * mayúsculas y sin espacios sobrantes. "Humanización" y "Humanizacion"
 * producen el mismo valor.
 */
export function normalizarNombreCarpeta(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es");
}

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
    ...(typeof entrada.testId === "string" && entrada.testId.trim()
      ? { testId: entrada.testId.trim() }
      : {}),
    ...(typeof entrada.pendientes === "number" &&
    Number.isFinite(entrada.pendientes) &&
    entrada.pendientes >= 0
      ? { pendientes: entrada.pendientes }
      : {}),
    ...(entrada.tipo === "repaso" ||
    entrada.tipo === "test" ||
    entrada.tipo === "repaso_fallido" ||
    entrada.tipo === "huerfano"
      ? { tipo: entrada.tipo }
      : {}),
  };
}

/** Media de la mejor nota de cada test, agrupando por testId. */
export function calcularNotaMediaPorTest(
  historial: EntradaHistorialTest[],
): number {
  if (historial.length === 0) return 0;

  const mejores = new Map<string, number>();

  historial.forEach((entrada) => {
    if (
      !entrada.testId ||
      entrada.tipo === "huerfano" ||
      entrada.tipo === "repaso_fallido"
    ) {
      return;
    }

    mejores.set(
      entrada.testId,
      Math.max(mejores.get(entrada.testId) ?? 0, entrada.nota),
    );
  });

  const notas = [...mejores.values()];
  return notas.reduce((total, nota) => total + nota, 0) / notas.length;
}

export function esTestCompletado(entrada: EntradaHistorialTest): boolean {
  return entrada.tipo !== "repaso" && entrada.tipo !== "huerfano" && entrada.tipo !== "repaso_fallido";
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
