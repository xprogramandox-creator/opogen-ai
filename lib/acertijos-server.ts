import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { rutaBaseUsuario, type PlanUsuario } from "@/lib/rutas-espacio";
import { conBloqueoUsuario } from "@/lib/file-lock";
import { diaAnalitico } from "@/lib/analitica";

const NOMBRE_ARCHIVO = "acertijos_vistos.json";

export type EstadoAcertijos = {
  /** Día (Europe/Madrid) al que pertenece la lista de vistos. */
  fecha: string;
  /** Identificadores de acertijos ya vistos ese día. */
  vistos: string[];
};

function rutaArchivo(clave: string, plan?: PlanUsuario): string {
  return path.join(rutaBaseUsuario(clave, plan), NOMBRE_ARCHIVO);
}

function estadoVacio(): EstadoAcertijos {
  return { fecha: diaAnalitico(), vistos: [] };
}

/**
 * Lee los acertijos vistos del usuario. Si el archivo es de otro día, se
 * reinicia (reset diario) para que al día siguiente vuelvan a estar
 * disponibles.
 */
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
    const fecha = typeof datos.fecha === "string" ? datos.fecha : "";

    if (fecha !== diaAnalitico()) {
      return estadoVacio();
    }

    return { fecha, vistos };
  } catch {
    return estadoVacio();
  }
}

/** Marca un acertijo como visto y devuelve el estado actualizado. */
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

    await mkdir(rutaBaseUsuario(clave, plan), { recursive: true });
    await writeFile(
      rutaArchivo(clave, plan),
      JSON.stringify(estado, null, 2),
      "utf8",
    );

    return estado;
  });
}
