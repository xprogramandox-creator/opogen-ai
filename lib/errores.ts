/** Mensaje legible para cualquier valor lanzado (Error, string, objeto…). */
export function mensajeError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return "Error inesperado";
}

/** Código de error de sistema (ENOENT, EEXIST, EACCES…), si lo hay. */
export function codigoError(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }

  return undefined;
}
