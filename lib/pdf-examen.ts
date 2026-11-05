import { jsPDF } from "jspdf";

export type PreguntaPdf = {
  enunciado: string;
  opciones: string[];
  correcta: number;
};

function limpiarTexto(texto: unknown): string {
  return String(texto ?? "")
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, " ")
    .replace(/[^\x20-\x7E\u00A1-\u00FF]/g, "")
    .trim();
}

export function normalizarPreguntasPdf(
  valor: unknown,
): PreguntaPdf[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  const preguntas: PreguntaPdf[] = [];

  for (const item of valor.slice(0, 120)) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const pregunta = item as Record<string, unknown>;
    const enunciado =
      typeof pregunta.enunciado === "string"
        ? pregunta.enunciado.trim()
        : "";
    const opciones = Array.isArray(pregunta.opciones)
      ? pregunta.opciones
          .filter(
            (opcion): opcion is string =>
              typeof opcion === "string",
          )
          .map((opcion) => opcion.trim())
      : [];
    const correcta = pregunta.correcta;

    if (
      enunciado.length < 8 ||
      opciones.length !== 4 ||
      opciones.some((opcion) => opcion.length === 0) ||
      typeof correcta !== "number" ||
      !Number.isInteger(correcta) ||
      correcta < 0 ||
      correcta > 3
    ) {
      continue;
    }

    preguntas.push({ enunciado, opciones, correcta });
  }

  return preguntas;
}

export function generarPdfExamen(
  preguntas: PreguntaPdf[],
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
    "Examen Tipo Test - OpoGen",
    pageWidth / 2,
    20,
    { align: "center" },
  );

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Número de preguntas: ${preguntas.length}`,
    pageWidth / 2,
    29,
    { align: "center" },
  );

  y = 42;

  preguntas.forEach((pregunta, index) => {
    const ancho = pageWidth - MARGIN * 2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const enunciadoLines = doc.splitTextToSize(
      `${index + 1}. ${limpiarTexto(pregunta.enunciado)}`,
      ancho,
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const opcionesLines = pregunta.opciones.map(
      (opcion, opcionIndex) =>
        doc.splitTextToSize(
          `${String.fromCharCode(65 + opcionIndex)}) ${limpiarTexto(opcion)}`,
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

    opcionesLines.forEach((lines) => {
      doc.text(lines, MARGIN + 5, y);
      y += lines.length * 5 + 1;
    });

    y += 4;
  });

  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Hoja de Respuestas Correctas", MARGIN, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const respuestasArray = preguntas.map(
    (pregunta, index) =>
      `${index + 1}. ${String.fromCharCode(65 + pregunta.correcta)}`,
  );
  const respuestasPorColumna =
    Math.ceil(respuestasArray.length / 4) || 1;

  for (let col = 0; col < 4; col++) {
    const columnaRespuestas = respuestasArray.slice(
      col * respuestasPorColumna,
      (col + 1) * respuestasPorColumna,
    );
    let yRespuesta = 35;

    columnaRespuestas.forEach((respuesta) => {
      doc.text(respuesta, MARGIN + col * 45, yRespuesta);
      yRespuesta += 6;
    });
  }

  return doc.output("arraybuffer");
}
