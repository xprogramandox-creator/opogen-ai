import { NextResponse } from "next/server";
import OpenAI from "openai";
import { generarTextoGemini } from "@/lib/gemini";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import { esEdadAcertijo } from "@/lib/acertijos";

type Proveedor = {
  nombre: string;
  modelo: string;
  baseURL: string;
  apiKey: string;
};

const PROVEEDORES: Proveedor[] = [
  {
    nombre: "DeepSeek",
    modelo: "deepseek-chat",
    baseURL: "https://api.deepseek.com/v1",
    apiKey: process.env.DEEPSEEK_API_KEY ?? "",
  },
  {
    nombre: "Groq",
    modelo: "llama-3.3-70b-versatile",
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY ?? "",
  },
  {
    nombre: "Gemini",
    modelo: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    apiKey: process.env.GEMINI_API_KEY ?? "",
  },
  {
    nombre: "OpenRouter",
    modelo:
      process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini",
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY ?? "",
  },
].filter((proveedor) => proveedor.apiKey.trim().length > 0);

type AcertijoGenerado = {
  titulo: string;
  enunciado: string;
  respuesta: string;
};

function limpiar(texto: string): string {
  return texto
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

function parsearAcertijo(texto: string): AcertijoGenerado | null {
  const coincidencia = /{[\s\S]*}/.exec(limpiar(texto));

  if (!coincidencia) return null;

  try {
    const datos = JSON.parse(coincidencia[0]) as Record<string, unknown>;
    const titulo =
      typeof datos.titulo === "string" ? datos.titulo.trim() : "";
    const enunciado =
      typeof datos.enunciado === "string" ? datos.enunciado.trim() : "";
    const respuesta =
      typeof datos.respuesta === "string" ? datos.respuesta.trim() : "";

    if (
      titulo.length < 2 ||
      titulo.length > 120 ||
      enunciado.length < 10 ||
      enunciado.length > 1_200 ||
      respuesta.length < 1 ||
      respuesta.length > 300
    ) {
      return null;
    }

    return { titulo, enunciado, respuesta };
  } catch {
    return null;
  }
}

async function generarCon(
  proveedor: Proveedor,
  sistema: string,
  prompt: string,
): Promise<string> {
  if (proveedor.nombre === "Gemini") {
    return generarTextoGemini({
      apiKey: proveedor.apiKey,
      modelo: proveedor.modelo,
      systemInstruction: sistema,
      prompt,
      temperature: 0.8,
      maxOutputTokens: 400,
      timeoutMs: 25_000,
      responseMimeType: "application/json",
    });
  }

  const openai = new OpenAI({
    baseURL: proveedor.baseURL,
    apiKey: proveedor.apiKey,
    timeout: 25_000,
    maxRetries: 0,
  });

  const completion = await openai.chat.completions.create({
    model: proveedor.modelo,
    messages: [
      { role: "system", content: sistema },
      { role: "user", content: prompt },
    ],
    temperature: 0.8,
    max_tokens: 400,
    response_format: { type: "json_object" },
  });

  return completion.choices?.[0]?.message?.content ?? "";
}

export async function POST(request: Request) {
  const usuario = await obtenerUsuarioSesion();

  if (!usuario || usuario.rol !== "premium") {
    return NextResponse.json(
      { error: "Acceso exclusivo para usuarios Premium." },
      { status: 403 },
    );
  }

  const cuerpo = (await request.json().catch(() => null)) as {
    edad?: unknown;
  } | null;
  const edad = cuerpo?.edad;

  if (!esEdadAcertijo(edad)) {
    return NextResponse.json(
      { error: "Edad no válida." },
      { status: 400 },
    );
  }

  if (PROVEEDORES.length === 0) {
    return NextResponse.json(
      { error: "No hay ningún proveedor de IA configurado." },
      { status: 503 },
    );
  }

  const sistema =
    "Eres un profesor de lógica para niños. Creas acertijos originales, breves y claros, siempre aptos para menores. Respondes únicamente con un objeto JSON válido, sin Markdown, sin comentarios y sin texto adicional.";

  const prompt = `Genera UN acertijo de lógica o adivinanza original para un niño de ${edad} años. Debe ser breve, con una única respuesta clara y lenguaje sencillo. Devuelve solo un objeto JSON con las claves exactas "titulo", "enunciado" y "respuesta". El enunciado debe incluir las pistas necesarias para deducir la respuesta.`;

  for (const proveedor of PROVEEDORES) {
    try {
      const texto = await generarCon(proveedor, sistema, prompt);
      const acertijo = parsearAcertijo(texto);

      if (acertijo) {
        return NextResponse.json(
          {
            acertijo: {
              id: `gen-${crypto.randomUUID()}`,
              edad,
              titulo: acertijo.titulo,
              enunciado: acertijo.enunciado,
              respuesta: acertijo.respuesta,
            },
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
    } catch {
      // Se prueba el siguiente proveedor.
    }
  }

  return NextResponse.json(
    { error: "No se pudo generar un acertijo nuevo." },
    { status: 502 },
  );
}
