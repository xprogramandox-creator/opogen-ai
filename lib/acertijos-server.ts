import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { rutaBaseUsuario, type PlanUsuario } from "@/lib/rutas-espacio";
import { conBloqueoUsuario } from "@/lib/file-lock";
import { diaAnalitico } from "@/lib/analitica";
import type { EntradaHistorialAcertijo } from "@/lib/acertijos";

const NOMBRE_ARCHIVO = "acertijos_vistos.json";
const MAX_HISTORIAL = 200;

export type EstadoAcertijos = {
  /** Última fecha de actividad (Europe/Madrid). Solo informativa. */
  fecha: string;
  /** Identificadores de acertijos estáticos ya vistos (no se repiten). */
  vistos: string[];
  /** Historial de juegos generados: título, tema y mecánica. */
  historial: EntradaHistorialAcertijo[];
};

function rutaArchivo(clave: string, plan?: PlanUsuario): string {
  return path.join(rutaBaseUsuario(clave, plan), NOMBRE_ARCHIVO);
}

function estadoVacio(): EstadoAcertijos {
  return { fecha: diaAnalitico(), vistos: [], historial: [] };
}

function normalizarHistorial(valor: unknown): EntradaHistorialAcertijo[] {
  if (!Array.isArray(valor)) return [];

  return valor
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item && typeof item === "object"),
    )
    .map((item) => ({
      titulo: typeof item.titulo === "string" ? item.titulo : "",
      tema: typeof item.tema === "string" ? item.tema : "",
      mecanica: typeof item.mecanica === "string" ? item.mecanica : "",
    }))
    .filter((item) => item.titulo.length > 0 || item.tema.length > 0);
}

export async function leerAcertijosVistos(
  clave: string,
  plan?: PlanUsuario,
): Promise<EstadoAcertijos> {
  try {
    const contenido = await readFile(rutaArchivo(clave, plan), "utf8");
    const datos = JSON.parse(contenido) as Partial<EstadoAcertijos>;
    const vistos = Array.isArray(datos.vistos)
      ? datos.vistos.filter(
          (id): id is string => typeof id === "string",
        )
      : [];
    const historial = normalizarHistorial(datos.historial);
    const fecha = typeof datos.fecha === "string" ? datos.fecha : "";

    return { fecha, vistos, historial };
  } catch {
    return estadoVacio();
  }
}

export async function marcarAcertijoVisto(
  clave: string,
  plan: PlanUsuario | undefined,
  id: string,
): Promise<EstadoAcertijos> {
  return conBloqueoUsuario(clave, async () => {
    const estado = await leerAcertijosVistos(clave, plan);

    if (!estado.vistos.includes(id)) {
      estado.vistos.push(id);
    }

    estado.fecha = diaAnalitico();

    await mkdir(rutaBaseUsuario(clave, plan), { recursive: true });
    await writeFile(
      rutaArchivo(clave, plan),
      JSON.stringify(estado, null, 2),
      "utf8",
    );

    return estado;
  });
}

/** Añade un juego generado al historial anti-repetición. */
export async function registrarAcertijoGenerado(
  clave: string,
  plan: PlanUsuario | undefined,
  entrada: EntradaHistorialAcertijo,
): Promise<EstadoAcertijos> {
  return conBloqueoUsuario(clave, async () => {
    const estado = await leerAcertijosVistos(clave, plan);

    estado.historial = [
      ...estado.historial,
      {
        titulo: entrada.titulo.trim(),
        tema: entrada.tema.trim(),
        mecanica: entrada.mecanica.trim(),
      },
    ].slice(-MAX_HISTORIAL);

    estado.fecha = diaAnalitico();

    await mkdir(rutaBaseUsuario(clave, plan), { recursive: true });
    await writeFile(
      rutaArchivo(clave, plan),
      JSON.stringify(estado, null, 2),
      "utf8",
    );

    return estado;
  });
}
