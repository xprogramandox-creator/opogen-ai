import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { rutaBaseUsuario, type PlanUsuario } from "@/lib/rutas-espacio";
import { conBloqueoUsuario } from "@/lib/file-lock";

const NOMBRE_ARCHIVO = "preguntas_hechas.json";
const MAX_POR_ARCHIVO = 200;

type EstadoPreguntasHechas = {
  /** Clave del archivo (nombre) → enunciados ya generados. */
  archivos: Record<string, string[]>;
};

function rutaArchivo(clave: string, plan?: PlanUsuario): string {
  return path.join(rutaBaseUsuario(clave, plan), NOMBRE_ARCHIVO);
}

function estadoVacio(): EstadoPreguntasHechas {
  return { archivos: {} };
}

function normalizarLista(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];

  return valor
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

async function leerEstado(
  clave: string,
  plan?: PlanUsuario,
): Promise<EstadoPreguntasHechas> {
  try {
    const contenido = await readFile(rutaArchivo(clave, plan), "utf8");
    const datos = JSON.parse(contenido) as Partial<EstadoPreguntasHechas>;
    const archivos: Record<string, string[]> = {};

    if (datos.archivos && typeof datos.archivos === "object") {
      for (const [nombre, lista] of Object.entries(datos.archivos)) {
        const limpia = normalizarLista(lista);

        if (limpia.length > 0) {
          archivos[nombre] = limpia;
        }
      }
    }

    return { archivos };
  } catch {
    return estadoVacio();
  }
}

/** Preguntas ya generadas a partir de un mismo archivo. */
export async function obtenerPreguntasHechas(
  clave: string,
  archivo: string,
  plan?: PlanUsuario,
): Promise<string[]> {
  const estado = await leerEstado(clave, plan);

  return estado.archivos[archivo] ?? [];
}

/** Añade enunciados al registro del archivo (sin duplicados). */
export async function registrarPreguntasHechas(
  clave: string,
  archivo: string,
  preguntas: string[],
  plan?: PlanUsuario,
): Promise<void> {
  const nuevas = normalizarLista(preguntas);

  if (nuevas.length === 0) {
    return;
  }

  return conBloqueoUsuario(clave, async () => {
    const estado = await leerEstado(clave, plan);
    const actuales = estado.archivos[archivo] ?? [];
    const vistos = new Set(
      actuales.map((pregunta) => pregunta.toLocaleLowerCase("es")),
    );

    for (const pregunta of nuevas) {
      const clavePregunta = pregunta.toLocaleLowerCase("es");

      if (!vistos.has(clavePregunta)) {
        vistos.add(clavePregunta);
        actuales.push(pregunta);
      }
    }

    estado.archivos[archivo] = actuales.slice(-MAX_POR_ARCHIVO);

    await mkdir(rutaBaseUsuario(clave, plan), { recursive: true });
    await writeFile(
      rutaArchivo(clave, plan),
      JSON.stringify(estado, null, 2),
      "utf8",
    );
  });
}
