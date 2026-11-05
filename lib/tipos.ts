export type Pregunta = {
  enunciado: string;
  opciones: string[];
  correcta: number;
  explicacion?: string;
};

function indiceCorrecta(valor: unknown): number | null {
  if (typeof valor === "number") {
    return Number.isInteger(valor) && valor >= 0 && valor <= 3 ? valor : null;
  }

  if (typeof valor === "string") {
    const limpio = valor.trim().toUpperCase();

    if (limpio.length === 1 && "ABCD".includes(limpio)) {
      return "ABCD".indexOf(limpio);
    }

    if (["0", "1", "2", "3"].includes(limpio)) {
      return Number(limpio);
    }
  }

  return null;
}

function leerTexto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

/** Convierte un valor desconocido en una pregunta válida, o `null`. */
export function normalizarPregunta(valor: unknown): Pregunta | null {
  if (!valor || typeof valor !== "object") {
    return null;
  }

  const pregunta = valor as Record<string, unknown>;
  const enunciado =
    leerTexto(pregunta.enunciado) ||
    leerTexto(pregunta.pregunta) ||
    leerTexto(pregunta.texto);
  const opciones = Array.isArray(pregunta.opciones)
    ? pregunta.opciones
        .filter((opcion): opcion is string => typeof opcion === "string")
        .map((opcion) => opcion.trim())
        .filter((opcion) => opcion.length > 0)
    : [];
  const correcta = indiceCorrecta(
    pregunta.correcta ?? pregunta.respuestaCorrecta,
  );

  if (
    enunciado.length < 5 ||
    opciones.length !== 4 ||
    correcta === null
  ) {
    return null;
  }

  const explicacion = leerTexto(pregunta.explicacion);

  return explicacion
    ? { enunciado, opciones, correcta, explicacion }
    : { enunciado, opciones, correcta };
}

/** Normaliza una lista de preguntas descartando las que no son válidas. */
export function normalizarPreguntas(valor: unknown): Pregunta[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  const preguntas: Pregunta[] = [];

  for (const item of valor) {
    const pregunta = normalizarPregunta(item);

    if (pregunta) {
      preguntas.push(pregunta);
    }
  }

  return preguntas;
}

/**
 * Baraja las opciones manteniendo la identidad de la respuesta correcta.
 * El índice `correcta` se recalcula después del shuffle.
 */
export function barajarOpcionesPregunta(
  pregunta: Pregunta,
  aleatorio: () => number = Math.random,
): Pregunta {
  const opciones = pregunta.opciones.map((texto, indice) => ({
    texto,
    esCorrecta: indice === pregunta.correcta,
  }));

  for (let i = opciones.length - 1; i > 0; i -= 1) {
    const j = Math.floor(aleatorio() * (i + 1));
    [opciones[i], opciones[j]] = [opciones[j], opciones[i]];
  }

  return {
    ...pregunta,
    opciones: opciones.map((opcion) => opcion.texto),
    correcta: opciones.findIndex((opcion) => opcion.esCorrecta),
  };
}

/** Aplica el barajado de opciones a una lista completa. */
export function barajarPreguntas(
  preguntas: Pregunta[],
  aleatorio: () => number = Math.random,
): Pregunta[] {
  return preguntas.map((pregunta) =>
    barajarOpcionesPregunta(pregunta, aleatorio),
  );
}
