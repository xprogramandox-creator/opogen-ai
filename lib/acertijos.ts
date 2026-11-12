export type EdadAcertijo = "3-6" | "6-9" | "9-12";

export type Acertijo = {
  id: string;
  edad: EdadAcertijo;
  /** Tema del juego (para la variedad temática). */
  tema: string;
  /** Mecánica lógica usada (para no repetirla). */
  mecanica: string;
  titulo: string;
  enunciado: string;
  /** Elementos con su pista/etiqueta. */
  elementos: string[];
  /** Reglas del juego. */
  reglas: string[];
  /** Acción permitida (una sola). */
  accion: string;
  pregunta: string;
  /** Explicación de la solución (oculta en un desplegable). */
  solucion: string;
};

/** Entrada que se guarda en el historial para evitar repeticiones. */
export type EntradaHistorialAcertijo = {
  titulo: string;
  tema: string;
  mecanica: string;
};

export const EDADES_ACERTIJO: EdadAcertijo[] = ["3-6", "6-9", "9-12"];

export function esEdadAcertijo(valor: unknown): valor is EdadAcertijo {
  return (
    typeof valor === "string" &&
    (EDADES_ACERTIJO as string[]).includes(valor)
  );
}
