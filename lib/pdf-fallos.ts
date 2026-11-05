import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { jsPDF } from "jspdf";
import {
  esNombreCarpetaSeguro,
  estaDentroDe,
  rutaEspacioUsuario,
} from "@/lib/rutas-espacio";
import type { Pregunta } from "@/lib/tipos";

export const NOMBRE_PDF_FALLOS = "repaso.pdf";
const SUB_CARPETA_REPASO = "Repaso";

function limpiarTexto(texto: string): string {
  return texto
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, " ")
    .replace(/[^\x20-\x7E\u00A1-\u00FF]/g, "")
    .trim();
}

/** Genera el PDF acumulado de fallos de una carpeta madre. */
export function generarPdfFallos(
  preguntas: Pregunta[],
  nombreCarpeta: string,
): ArrayBuffer {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const MARGIN = 15;
  const BOTTOM = 15;
  let y = 0;

  const nuevaPagina = () => {
    doc.addPage();
    y = MARGIN;
  };

  const asegurarEspacio = (alto: number) => {
    if (y + alto > pageHeight - BOTTOM) {
      nuevaPagina();
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(
    `Repaso de Fallos - ${limpiarTexto(nombreCarpeta)}`,
    pageWidth / 2,
    20,
    { align: "center" },
  );

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Número de preguntas a repasar: ${preguntas.length}`,
    pageWidth / 2,
    29,
    { align: "center" },
  );

  y = 42;

  preguntas.forEach((pregunta, index) => {
    const ancho = pageWidth - MARGIN * 2;
    const enunciado = limpiarTexto(pregunta.enunciado);
    const opciones = pregunta.opciones.map(limpiarTexto);

    if (!enunciado || opciones.length !== 4) {
      return;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const enunciadoLines = doc.splitTextToSize(
      `${index + 1}. ${enunciado}`,
      ancho,
    );

    const opcionesLines = opciones.map((opcion, opcionIndex) =>
      doc.splitTextToSize(
        `${String.fromCharCode(65 + opcionIndex)}) ${opcion}`,
        ancho - 5,
      ),
    );

    const altoPregunta =
      enunciadoLines.length * 5 +
      2 +
      opcionesLines.reduce(
        (acc, lines) => acc + lines.length * 5 + 1,
        0,
      ) +
      4;

    asegurarEspacio(altoPregunta);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(enunciadoLines, MARGIN, y);
    y += enunciadoLines.length * 5 + 2;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    opcionesLines.forEach((lines, opcionIndex) => {
      if (opcionIndex === pregunta.correcta) {
        doc.setFont("helvetica", "bold");
        doc.text(lines, MARGIN + 5, y);
        doc.setFont("helvetica", "normal");
      } else {
        doc.text(lines, MARGIN + 5, y);
      }

      y += lines.length * 5 + 1;
    });

    y += 4;
  });

  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Respuestas Correctas", MARGIN, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const respuestasValidas = preguntas.map(
    (pregunta, index) =>
      `${index + 1}. ${String.fromCharCode(
        65 + pregunta.correcta,
      )}) ${limpiarTexto(pregunta.opciones[pregunta.correcta] ?? "")}`,
  );

  const respuestasPorColumna =
    Math.ceil(respuestasValidas.length / 3) || 1;

  for (let col = 0; col < 3; col++) {
    const columnaRespuestas = respuestasValidas.slice(
      col * respuestasPorColumna,
      (col + 1) * respuestasPorColumna,
    );
    let yRespuesta = 35;

    columnaRespuestas.forEach((respuesta) => {
      const lines = doc.splitTextToSize(respuesta, 55);
      doc.text(lines, MARGIN + col * 60, yRespuesta);
      yRespuesta += lines.length * 5 + 2;
    });
  }

  return doc.output("arraybuffer");
}

/**
 * Crea o reemplaza Mi_Espacio/<madre>/Repaso_Fallos.pdf con todos los fallos.
 * Si no quedan fallos, elimina el PDF.
 */
export async function guardarPdfFallos(
  clave: string,
  madre: string,
  fallos: Pregunta[],
): Promise<void> {
  if (!esNombreCarpetaSeguro(madre)) {
    return;
  }

  const espacio = rutaEspacioUsuario(clave);
  const carpeta = path.join(espacio, madre, SUB_CARPETA_REPASO);

  if (
    !estaDentroDe(espacio, carpeta) ||
    path.resolve(carpeta) === path.resolve(espacio)
  ) {
    return;
  }

  const rutaPdf = path.join(carpeta, NOMBRE_PDF_FALLOS);

  if (fallos.length === 0) {
    await rm(rutaPdf, { force: true });
    return;
  }

  await mkdir(carpeta, { recursive: true });
  await writeFile(
    rutaPdf,
    Buffer.from(generarPdfFallos(fallos, madre)),
  );
}
