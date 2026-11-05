import { generarTextoGemini } from "@/lib/gemini";
import {
  barajarPreguntas,
  normalizarPreguntas,
  type Pregunta,
} from "@/lib/tipos";

const MAX_CARACTERES_RESUMEN = 12_000;
export const MAX_PREGUNTAS_POR_RESUMEN = 5;

const MODELO_DEEPSEEK =
  process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";
const MODELO_GEMINI =
  process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
const MODELO_GROQ =
  process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-20b";

const SYSTEM_PROMPT =
  "Devuelve exclusivamente JSON válido con preguntas tipo test. No añadas texto fuera del JSON.";

function promptResumen(
  markdown: string,
  nombreArchivo: string,
): string {
  const texto = markdown.slice(0, MAX_CARACTERES_RESUMEN);

  return `
Eres un generador de preguntas tipo test para estudiantes.

A partir del siguiente resumen, crea como máximo ${MAX_PREGUNTAS_POR_RESUMEN} preguntas.
Selecciona solo los conceptos más importantes.
Cada pregunta debe tener exactamente 4 opciones y una única respuesta correcta.
No inventes datos que no aparezcan en el resumen.
Devuelve únicamente JSON válido, sin Markdown ni explicaciones fuera del JSON.

Formato exacto:
{
  "preguntas": [
    {
      "enunciado": "texto de la pregunta",
      "opciones": ["opción A", "opción B", "opción C", "opción D"],
      "correcta": 0,
      "explicacion": "breve justificación"
    }
  ]
}

RESUMEN (${nombreArchivo}):
${texto}
`.trim();
}

function limpiarJson(texto: string): string {
  return texto
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function preguntasDesdeTexto(texto: string): Pregunta[] {
  try {
    const datos: unknown = JSON.parse(limpiarJson(texto));

    if (!datos || typeof datos !== "object") {
      return [];
    }

    const preguntas = normalizarPreguntas(
      (datos as { preguntas?: unknown }).preguntas,
    );

    return barajarPreguntas(
      preguntas.slice(0, MAX_PREGUNTAS_POR_RESUMEN),
    );
  } catch {
    return [];
  }
}

async function llamarDeepSeek(
  prompt: string,
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("DeepSeek no configurado");
  }

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 30_000);

  try {
    const respuesta = await fetch(
      "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODELO_DEEPSEEK,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          temperature: 0.25,
          max_tokens: 1_200,
          response_format: { type: "json_object" },
        }),
        signal: controlador.signal,
      },
    );

    if (!respuesta.ok) {
      throw new Error(`DeepSeek ${respuesta.status}`);
    }

    const datos = (await respuesta.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return datos.choices?.[0]?.message?.content || "";
  } finally {
    clearTimeout(temporizador);
  }
}

async function llamarGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Gemini no configurado");
  }

  return generarTextoGemini({
    apiKey,
    modelo: MODELO_GEMINI,
    systemInstruction: SYSTEM_PROMPT,
    prompt,
    temperature: 0.25,
    maxOutputTokens: 1_200,
    timeoutMs: 30_000,
    responseMimeType: "application/json",
  });
}

async function llamarGroq(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Groq no configurado");
  }

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 30_000);

  try {
    const respuesta = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODELO_GROQ,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          temperature: 0.25,
          max_tokens: 1_200,
          response_format: { type: "json_object" },
        }),
        signal: controlador.signal,
      },
    );

    if (!respuesta.ok) {
      throw new Error(`Groq ${respuesta.status}`);
    }

    const datos = (await respuesta.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return datos.choices?.[0]?.message?.content || "";
  } finally {
    clearTimeout(temporizador);
  }
}

/**
 * Genera un máximo de 5 preguntas a partir de un resumen.
 * DeepSeek es el proveedor principal; Gemini y Groq son fallback.
 */
export async function generarPreguntasDesdeResumen(
  markdown: string,
  nombreArchivo: string,
): Promise<Pregunta[]> {
  const prompt = promptResumen(markdown, nombreArchivo);
  const proveedores = [llamarDeepSeek, llamarGemini, llamarGroq];

  for (const proveedor of proveedores) {
    try {
      const texto = await proveedor(prompt);
      const preguntas = preguntasDesdeTexto(texto);

      if (preguntas.length > 0) {
        return preguntas;
      }
    } catch {
      // Se prueba el siguiente proveedor.
    }
  }

  return [];
}
