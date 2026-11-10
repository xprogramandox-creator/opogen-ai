import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  HISTORIAL_TESTS_MAX,
  carpetaMadre,
  normalizarEntradaHistorial,
  type EntradaHistorialTest,
} from "@/lib/historial-tests";
import { rutaBaseUsuario, type PlanUsuario } from "@/lib/rutas-espacio";
import { conBloqueoUsuario } from "@/lib/file-lock";

const NOMBRE_HISTORIAL = "historial_tests.json";

function rutaHistorial(clave: string, plan?: PlanUsuario): string {
  return path.join(rutaBaseUsuario(clave, plan), NOMBRE_HISTORIAL);
}

function claveEntrada(entrada: EntradaHistorialTest): string {
  return [
    entrada.fecha,
    entrada.carpeta,
    entrada.nota,
    entrada.aciertos,
    entrada.fallos,
    entrada.enBlanco,
    entrada.total,
  ].join("|");
}

export async function leerHistorialServidor(
  clave: string,
  plan?: PlanUsuario,
): Promise<EntradaHistorialTest[]> {
  try {
    const contenido = await readFile(rutaHistorial(clave, plan), "utf8");
    const datos: unknown = JSON.parse(contenido);

    if (!Array.isArray(datos)) {
      return [];
    }

    return datos
      .map(normalizarEntradaHistorial)
      .filter(
        (entrada): entrada is EntradaHistorialTest =>
          entrada !== null,
      );
  } catch {
    return [];
  }
}

/** Añade una entrada evitando duplicados exactos. */
export async function agregarHistorialServidor(
  clave: string,
  entrada: EntradaHistorialTest,
  plan?: PlanUsuario,
): Promise<void> {
  return conBloqueoUsuario(clave, async () => {
    const historial = await leerHistorialServidor(clave, plan);
    const claveNueva = claveEntrada(entrada);

    if (historial.some((guardada) => claveEntrada(guardada) === claveNueva)) {
      return;
    }

    const actualizado = [entrada, ...historial].slice(
      0,
      HISTORIAL_TESTS_MAX,
    );

    await mkdir(rutaBaseUsuario(clave, plan), { recursive: true });
    await writeFile(
      rutaHistorial(clave, plan),
      JSON.stringify(actualizado, null, 2),
      "utf8",
    );
  });
}

/** Elimina las estadísticas asociadas a una carpeta madre o lógica. */
export async function eliminarHistorialDeCarpeta(
  clave: string,
  nombre: string,
  plan?: PlanUsuario,
): Promise<number> {
  return conBloqueoUsuario(clave, async () => {
    const historial = await leerHistorialServidor(clave, plan);
    const nombreLimpio = nombre.trim();
    const esCarpetaLogica =
      nombreLimpio.startsWith("Test Mixtos - ") ||
      nombreLimpio.startsWith("Fallos - ") ||
      nombreLimpio.startsWith("Simulacros - ");

    function normalizar(valor: string): string {
      return valor
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLocaleLowerCase("es");
    }

    const objetivo = normalizar(
      esCarpetaLogica ? nombreLimpio : carpetaMadre(nombreLimpio),
    );

    const restantes = historial.filter((entrada) => {
      const valor = normalizar(
        esCarpetaLogica
          ? entrada.carpeta
          : carpetaMadre(entrada.carpeta),
      );

      return valor !== objetivo;
    });

    if (restantes.length === historial.length) {
      return 0;
    }

    await writeFile(
      rutaHistorial(clave, plan),
      JSON.stringify(restantes, null, 2),
      "utf8",
    );

    return historial.length - restantes.length;
  });
}
