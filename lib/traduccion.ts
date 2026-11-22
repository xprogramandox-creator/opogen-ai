import { generarTextoGemini } from "@/lib/gemini";

export const IDIOMAS_TESTIMONIO = ["es", "en", "fr", "de", "it", "pt"] as const;

export type IdiomaTestimonio = (typeof IDIOMAS_TESTIMONIO)[number];

const NOMBRE_IDIOMA: Record<IdiomaTestimonio, string> = {
  es: "español",
  en: "inglés",
  fr: "francés",
  de: "alemán",
  it: "italiano",
  pt: "portugués",
};

const TIMEOUT_MS = 20_000;

function limpiarClave(valor: string | undefined): string {
  return (valor || "").trim().replace(/^["']|["']$/g, "");
}

export function esIdiomaTestimonio(
  valor: unknown,
): valor is IdiomaTestimonio {
  return (
    typeof valor === "string" &&
    (IDIOMAS_TESTIMONIO as readonly string[]).includes(valor)
  );
}

/** Texto en el idioma pedido, con inglés y el original como respaldo. */
export function textoEnIdioma(
  textos: Record<string, string> | null | undefined,
  original: string,
  idioma: IdiomaTestimonio,
): string {
  const elegido = textos?.[idioma];

  if (typeof elegido === "string" && elegido.trim()) {
    return elegido.trim();
  }

  const ingles = textos?.en;

  if (typeof ingles === "string" && ingles.trim()) {
    return ingles.trim();
  }

  return original;
}

function construirPrompt(texto: string, origen: IdiomaTestimonio): string {
  return [
    `Traduce este testimonio de un estudiante a: ${IDIOMAS_TESTIMONIO.map(
      (idioma) => NOMBRE_IDIOMA[idioma],
    ).join(", ")}.`,
    `Devuelve SOLO un objeto JSON con las claves ${IDIOMAS_TESTIMONIO.join(
      ", ",
    )}.`,
    "Mantén un tono natural, cercano y breve (máximo dos frases). No añadas comillas externas ni explicaciones.",
    `El texto en ${NOMBRE_IDIOMA[origen]} debe quedar tal cual.`,
    "",
    `Texto (${origen}): """${texto}"""`,
  ].join("\n");
}

function parsearTraducciones(contenido: string): Record<string, string> | null {
  const limpio = contenido
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const inicio = limpio.indexOf("{");
  const fin = limpio.lastIndexOf("}");

  if (inicio < 0 || fin <= inicio) {
    return null;
  }

  try {
    const datos = JSON.parse(limpio.slice(inicio, fin + 1)) as unknown;

    if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
      return null;
    }

    return datos as Record<string, string>;
  } catch {
    return null;
  }
}

function completarTraducciones(
  texto: string,
  origen: IdiomaTestimonio,
  datos: Record<string, string> | null,
): Record<IdiomaTestimonio, string> {
  const salida = {} as Record<IdiomaTestimonio, string>;

  for (const idioma of IDIOMAS_TESTIMONIO) {
    const valor = datos?.[idioma];

    salida[idioma] =
      idioma === origen
        ? texto
        : typeof valor === "string" && valor.trim()
          ? valor.trim()
          : texto;
  }

  return salida;
}

async function traducirConDeepSeek(
  texto: string,
  origen: IdiomaTestimonio,
): Promise<Record<IdiomaTestimonio, string> | null> {
  const apiKey = limpiarClave(process.env.DEEPSEEK_API_KEY);

  if (!apiKey) {
    return null;
  }

  try {
    const respuesta = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "Eres un traductor nativo y cuidadoso. Respondes únicamente con el objeto JSON solicitado.",
          },
          { role: "user", content: construirPrompt(texto, origen) },
        ],
        temperature: 0.2,
        max_tokens: 1200,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!respuesta.ok) {
      return null;
    }

    const datos = (await respuesta.json().catch(() => null)) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    } | null;
    const contenido = datos?.choices?.[0]?.message?.content;

    if (typeof contenido !== "string") {
      return null;
    }

    const traducciones = parsearTraducciones(contenido);

    return traducciones
      ? completarTraducciones(texto, origen, traducciones)
      : null;
  } catch {
    return null;
  }
}

async function traducirConGemini(
  texto: string,
  origen: IdiomaTestimonio,
): Promise<Record<IdiomaTestimonio, string> | null> {
  const apiKey = limpiarClave(process.env.GEMINI_API_KEY);

  if (!apiKey) {
    return null;
  }

  try {
    const contenido = await generarTextoGemini({
      apiKey,
      modelo: process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash",
      systemInstruction:
        "Eres un traductor nativo y cuidadoso. Respondes únicamente con el objeto JSON solicitado.",
      prompt: construirPrompt(texto, origen),
      temperature: 0.2,
      maxOutputTokens: 1200,
      timeoutMs: TIMEOUT_MS,
      responseMimeType: "application/json",
    });

    const traducciones = parsearTraducciones(contenido);

    return traducciones
      ? completarTraducciones(texto, origen, traducciones)
      : null;
  } catch {
    return null;
  }
}

/**
 * Traduce el testimonio a los seis idiomas. DeepSeek es el proveedor principal
 * y Gemini el respaldo. Si ambos fallan, devuelve el texto original en todos
 * los idiomas (el flujo de moderación nunca se rompe).
 */
export async function traducirTestimonio(
  texto: string,
  origen: IdiomaTestimonio,
): Promise<Record<IdiomaTestimonio, string>> {
  const conDeepSeek = await traducirConDeepSeek(texto, origen);

  if (conDeepSeek) {
    return conDeepSeek;
  }

  const conGemini = await traducirConGemini(texto, origen);

  if (conGemini) {
    return conGemini;
  }

  return completarTraducciones(texto, origen, null);
}
