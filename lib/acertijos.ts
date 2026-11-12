export type EdadAcertijo = "3-6" | "6-9" | "9-12";

export type Acertijo = {
  id: string;
  titulo: string;
  edad: EdadAcertijo;
  enunciado: string;
  respuesta: string;
};

export const EDADES_ACERTIJO: EdadAcertijo[] = ["3-6", "6-9", "9-12"];

export function esEdadAcertijo(valor: unknown): valor is EdadAcertijo {
  return (
    typeof valor === "string" &&
    (EDADES_ACERTIJO as string[]).includes(valor)
  );
}
