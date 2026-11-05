export function sanearNombreCarpeta(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // Elimina tildes
    .replace(/[^a-zA-Z0-9]/g, "_") // Reemplaza cualquier cosa que no sea alfanumérico por guion bajo
    .replace(/_{2,}/g, "_") // Evita guiones bajos duplicados
    .replace(/^_+|_+$/g, ""); // Elimina guiones bajos al inicio o final
}
