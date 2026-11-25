import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  rutaEspacioUsuario,
  type PlanUsuario,
} from "@/lib/rutas-espacio";
import { claveCanonicaPregunta, normalizarPregunta } from "@/lib/tipos";

/**
 * Claves canónicas de las preguntas que existen realmente en una carpeta
 * madre. Se leen sus subcarpetas Test y Test Mixtos, sin tocar Repaso.
 */
export async function clavesPreguntasDeCarpeta(
  clave: string,
  madre: string,
  plan?: PlanUsuario,
): Promise<Set<string>> {
  const claves = new Set<string>();
  const raiz = path.join(rutaEspacioUsuario(clave, plan), madre);

  for (const subcarpeta of ["Test", "Test Mixtos"]) {
    let entradas: string[];

    try {
      entradas = await readdir(path.join(raiz, subcarpeta));
    } catch {
      continue;
    }

    for (const archivo of entradas) {
      if (!archivo.toLowerCase().endsWith(".json")) continue;

      try {
        const datos: unknown = JSON.parse(
          await readFile(path.join(raiz, subcarpeta, archivo), "utf8"),
        );
        const bruto = Array.isArray(datos)
          ? datos
          : (datos as { preguntas?: unknown } | null)?.preguntas;

        if (!Array.isArray(bruto)) continue;

        for (const item of bruto) {
          const pregunta = normalizarPregunta(item);
          if (pregunta) {
            claves.add(claveCanonicaPregunta(pregunta.enunciado));
          }
        }
      } catch {
        // Un JSON dañado no invalida el resto de la carpeta.
      }
    }
  }

  return claves;
}
