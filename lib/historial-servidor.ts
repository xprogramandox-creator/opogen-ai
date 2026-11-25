/**
 * Historial de tests por usuario.
 *
 * Hoy vive en `historial_tests.json` dentro de la carpeta del usuario. Si algún
 * día se migra a SQLite (node:sqlite), este es el esquema previsto y el borrado
 * en cascada equivalente:
 *
 *   CREATE TABLE estadisticas_tests (
 *     id INTEGER PRIMARY KEY AUTOINCREMENT,
 *     usuario_clave TEXT NOT NULL,
 *     carpeta_madre TEXT NOT NULL,
 *     fecha TEXT NOT NULL,
 *     nota REAL NOT NULL DEFAULT 0,
 *     aciertos INTEGER NOT NULL DEFAULT 0,
 *     fallos INTEGER NOT NULL DEFAULT 0,
 *     en_blanco INTEGER NOT NULL DEFAULT 0,
 *     total INTEGER NOT NULL DEFAULT 0,
 *     creado TEXT NOT NULL
 *   );
 *   CREATE INDEX idx_stats_usuario_carpeta
 *     ON estadisticas_tests (usuario_clave, carpeta_madre);
 *
 *   BEGIN IMMEDIATE;
 *   DELETE FROM estadisticas_tests
 *    WHERE usuario_clave = :clave AND carpeta_madre = :madre;
 *   DELETE FROM fallos_pendientes
 *    WHERE usuario_clave = :clave AND carpeta_madre = :madre;
 *   COMMIT;
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  HISTORIAL_TESTS_MAX,
  carpetaMadre,
  normalizarEntradaHistorial,
  type EntradaHistorialTest,
} from "@/lib/historial-tests";
import {
  PREFIJOS_CARPETA_LOGICA,
  normalizarNombreCarpeta,
  rutaBaseUsuario,
  type PlanUsuario,
} from "@/lib/rutas-espacio";
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
    entrada.testId ?? "",
    entrada.pendientes ?? "",
    entrada.tipo ?? "",
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

/** Clave normalizada de una carpeta: quita prefijos lógicos y acentos. */
function claveCarpeta(nombre: string, esLogica: boolean): string {
  return normalizarNombreCarpeta(esLogica ? nombre : carpetaMadre(nombre));
}

/**
 * Elimina las estadísticas asociadas a una carpeta madre o lógica.
 * La comparación ignora acentos, mayúsculas y prefijos lógicos, así que
 * "Humanización", "Humanizacion" y "Test Mixtos - Humanización" se tratan
 * como la misma materia al borrar.
 */
export async function eliminarHistorialDeCarpeta(
  clave: string,
  nombre: string,
  plan?: PlanUsuario,
): Promise<number> {
  return conBloqueoUsuario(clave, async () => {
    const historial = await leerHistorialServidor(clave, plan);
    const nombreLimpio = nombre.trim();
    const esCarpetaLogica = PREFIJOS_CARPETA_LOGICA.some((prefijo) =>
      nombreLimpio.startsWith(prefijo),
    );
    const objetivo = claveCarpeta(nombreLimpio, esCarpetaLogica);

    const restantes = historial.filter(
      (entrada) =>
        claveCarpeta(entrada.carpeta, esCarpetaLogica) !== objetivo,
    );

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
