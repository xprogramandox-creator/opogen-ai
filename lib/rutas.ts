import path from "node:path";
import { mkdirSync } from "node:fs";

/**
 * Raíz de los datos persistentes de la aplicación.
 * En Docker debe apuntar al volumen montado, por ejemplo /app/datos.
 */
export const RUTA_DATOS = path.resolve(
  /* turbopackIgnore: true */
  process.env.DATA_DIR?.trim() || "/app/datos",
);

// La raíz debe existir antes de crear Premium, Freemium o .admin.
try {
  mkdirSync(RUTA_DATOS, { recursive: true });
} catch {
  // Se reintenta al crear cada subcarpeta; así el error real se propaga allí.
}
