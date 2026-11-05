import { GoogleGenAI, ThinkingLevel } from "@google/genai";

/**
 * Crea el cliente oficial de Gemini.
 *
 * La librería @google/genai acepta las claves nuevas de Google AI Studio
 * (incluidas las que empiezan por "AQ.") y usa la API nativa de Gemini.
 */
export function crearClienteGemini(
  apiKey: string,
  timeoutMs?: number,
): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions:
      typeof timeoutMs === "number" && timeoutMs > 0
        ? { timeout: timeoutMs }
        : undefined,
  });
}

type OpcionesGeneracionGemini = {
  apiKey: string;
  modelo: string;
  systemInstruction: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  responseMimeType?: string;
  thinkingLevel?: ThinkingLevel;
};

export async function generarTextoGemini({
  apiKey,
  modelo,
  systemInstruction,
  prompt,
  temperature = 0.3,
  maxOutputTokens = 8_000,
  timeoutMs,
  responseMimeType,
  thinkingLevel,
}: OpcionesGeneracionGemini): Promise<string> {
  const ai = crearClienteGemini(apiKey, timeoutMs);

  const respuesta = await ai.models.generateContent({
    model: modelo,
    contents: prompt,
    config: {
      systemInstruction,
      temperature,
      maxOutputTokens,
      ...(responseMimeType
        ? { responseMimeType }
        : {}),
      ...(thinkingLevel
        ? {
            thinkingConfig: {
              thinkingLevel,
              includeThoughts: false,
            },
          }
        : {}),
    },
  });

  const texto = (() => {
    const candidato = respuesta.candidates?.[0];
    const partes = candidato?.content?.parts ?? [];

    const textoPartes = partes
      .filter(
        (parte) =>
          !parte.thought && typeof parte.text === "string",
      )
      .map((parte) => parte.text ?? "")
      .join("")
      .trim();

    console.log(
      "[DEBUG Gemini] finishReason:",
      candidato?.finishReason,
      "| partes:",
      partes.length,
      "| caracteres de texto:",
      textoPartes.length,
    );

    return textoPartes || respuesta.text?.trim() || "";
  })();

  if (!texto) {
    console.log(
      "[DEBUG Gemini] Respuesta sin texto:",
      JSON.stringify(respuesta.candidates ?? [], null, 2),
    );

    throw new Error("Gemini devolvió una respuesta vacía.");
  }

  return texto;
}
