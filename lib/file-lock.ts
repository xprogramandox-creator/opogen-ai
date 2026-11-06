import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import lockfile from "proper-lockfile";
import { RUTA_DATOS } from "@/lib/rutas";

const CARPETA_BLOQUEOS = path.join(RUTA_DATOS, ".locks");
const CLAVE_USUARIO = /^\d{1,4}_\d{4,15}$/;

/**
 * Serializa las operaciones de lectura-modificación-escritura de un usuario.
 * El archivo de bloqueo vive fuera de Premium/Freemium para que el lock no se
 * mueva cuando la carpeta del usuario cambia de plan.
 */
export async function conBloqueoUsuario<T>(
  clave: string,
  operacion: () => Promise<T>,
): Promise<T> {
  if (!CLAVE_USUARIO.test(clave)) {
    throw new Error("Clave de usuario no válida.");
  }

  await mkdir(CARPETA_BLOQUEOS, { recursive: true });

  const objetivo = path.join(CARPETA_BLOQUEOS, `${clave}.lock`);
  await writeFile(objetivo, "", { encoding: "utf8", flag: "a" });

  const liberar = await lockfile.lock(objetivo, {
    realpath: false,
    stale: 10_000,
    retries: {
      retries: 40,
      minTimeout: 100,
      maxTimeout: 250,
      factor: 1.2,
    },
  });

  try {
    return await operacion();
  } finally {
    await liberar().catch(() => {});
  }
}
