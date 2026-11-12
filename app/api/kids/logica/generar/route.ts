import { NextResponse } from "next/server";
import OpenAI from "openai";
import { generarTextoGemini } from "@/lib/gemini";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import {
  esEdadAcertijo,
  type Acertijo,
  type EdadAcertijo,
  type EntradaHistorialAcertijo,
} from "@/lib/acertijos";
import {
  leerAcertijosVistos,
  registrarAcertijoGenerado,
} from "@/lib/acertijos-server";
import type { PlanUsuario } from "@/lib/rutas-espacio";
import acertijos from "@/data/acertijos.json";

const ACERTIJOS = acertijos as Acertijo[];

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
    nombre: "Gemini",
    modelo: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    apiKey: process.env.GEMINI_API_KEY ?? "",
  },
].filter((proveedor) => proveedor.apiKey.trim().length > 0);

const SISTEMA = `Eres el generador oficial de "Juegos de Lógica" de la zona Kids. Creas un juego de lógica nuevo, original e irrepetible cada vez que se te pide, adaptado INCONDICIONALMENTE a la franja de edad.

REGLAS ABSOLUTAS (no negociables):
1. NUNCA repitas el título, el tema, la mecánica, el escenario, los objetos, la pregunta ni la solución respecto al historial. Si detectas coincidencia, genera otro distinto.
2. La dificultad se ajusta SIEMPRE a la franja de edad:
   - 3-6 años: lógica concreta y visual, 2-3 elementos, comparaciones simples (grande/pequeño, dentro/fuera, igual/diferente), causas evidentes, una sola inferencia. Vocabulario muy sencillo, frases cortas.
   - 6-9 años: lógica con 3 elementos, una deducción encadenada, eliminación simple, patrones, ordenaciones, correspondencias 1 a 1. Vocabulario claro y cotidiano.
   - 9-12 años: lógica con 3-4 elementos, deducción múltiple, contradicciones, condiciones encadenadas, razonamiento hipotético. Vocabulario más rico pero accesible.
3. VARIEDAD TEMÁTICA OBLIGATORIA: rota entre MUCHOS temas (deportes, música, instrumentos, planetas, espacio, océano, dinosaurios, vehículos, oficios, herramientas, cocina, ropa, colores, formas, números, letras, cuentos, personajes fantásticos, magia, piratas, castillos, robots, inventos, naturaleza, clima, estaciones, insectos, aves, mascotas, juguetes, videojuegos, superhéroes, circo, granja, ciudad, transporte público, escuela, biblioteca, museo, ciencia, experimentos, mapas, brújulas, tesoros, señales de tráfico, emociones, familias, fiestas, tradiciones, deportes olímpicos, ajedrez, cartas, dados, laberintos, espejos, sombras, huellas, sonidos, olores, texturas...).
4. Prohibido repetir el mismo tema dos veces seguidas en la misma franja de edad.
5. Lenguaje inclusivo, positivo y adecuado a la infancia. Sin violencia, sin miedo, sin contenido sensible.

FORMATO DE SALIDA OBLIGATORIO: devuelve SOLO un objeto JSON válido con las claves exactas:
{
  "tema": "tema corto",
  "mecanica": "mecánica lógica usada",
  "titulo": "título original y llamativo",
  "enunciado": "enunciado breve del escenario, 2-4 frases",
  "elementos": ["Elemento — pista/etiqueta", ...],
  "reglas": ["Regla 1", "Regla 2", "Regla 3", ...],
  "accion": "una sola acción permitida (abrir, mirar, sacar, preguntar...)",
  "pregunta": "pregunta clara y directa",
  "solucion": "explicación paso a paso, adaptada a la edad, 2-5 frases"
}
Sin Markdown, sin comentarios y sin texto fuera del JSON.`;

function limpiar(texto: string): string {
  return texto
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

function texto(valor: unknown, max: number): string {
  return typeof valor === "string"
    ? valor.trim().slice(0, max)
    : "";
}

function lista(valor: unknown, max: number): string[] {
  if (!Array.isArray(valor)) return [];

  return valor
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, max);
}

type JuegoGenerado = Omit<Acertijo, "id" | "edad">;

function parsearJuego(textoRespuesta: string): JuegoGenerado | null {
  const coincidencia = /{[\s\S]*}/.exec(limpiar(textoRespuesta));

  if (!coincidencia) return null;

  try {
    const datos = JSON.parse(coincidencia[0]) as Record<
      string,
      unknown
    >;
    const juego: JuegoGenerado = {
      tema: texto(datos.tema, 60),
      mecanica: texto(datos.mecanica, 60),
      titulo: texto(datos.titulo, 120),
      enunciado: texto(datos.enunciado, 800),
      elementos: lista(datos.elementos, 6),
      reglas: lista(datos.reglas, 6),
      accion: texto(datos.accion, 160),
      pregunta: texto(datos.pregunta, 300),
      solucion: texto(datos.solucion, 800),
    };

    const valido =
      juego.titulo.length >= 2 &&
      juego.enunciado.length >= 10 &&
      juego.pregunta.length >= 3 &&
      juego.solucion.length >= 5 &&
      juego.elementos.length >= 2 &&
      juego.reglas.length >= 1;

    return valido ? juego : null;
  } catch {
    return null;
  }
}

function historialTexto(
  historial: EntradaHistorialAcertijo[],
): string {
  if (historial.length === 0) {
    return "(sin historial; empieza de cero)";
  }

  return historial
    .slice(-60)
    .map(
      (entrada) =>
        `- "${entrada.titulo}" (tema: ${entrada.tema}; mecánica: ${entrada.mecanica})`,
    )
    .join("\n");
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
      temperature: 0.9,
      maxOutputTokens: 700,
      timeoutMs: 30_000,
      responseMimeType: "application/json",
    });
  }

  const openai = new OpenAI({
    baseURL: proveedor.baseURL,
    apiKey: proveedor.apiKey,
    timeout: 30_000,
    maxRetries: 0,
  });

  const completion = await openai.chat.completions.create({
    model: proveedor.modelo,
    messages: [
      { role: "system", content: sistema },
      { role: "user", content: prompt },
    ],
    temperature: 0.9,
    max_tokens: 700,
    response_format: { type: "json_object" },
  });

  return completion.choices?.[0]?.message?.content ?? "";
}

function historialDelBanco(
  edad: EdadAcertijo,
): EntradaHistorialAcertijo[] {
  return ACERTIJOS.filter((acertijo) => acertijo.edad === edad).map(
    (acertijo) => ({
      titulo: acertijo.titulo,
      tema: acertijo.tema,
      mecanica: acertijo.mecanica,
    }),
  );
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

  const plan: PlanUsuario =
    usuario.rol === "premium" ? "premium" : "freemium";

  const estado = await leerAcertijosVistos(usuario.clave, plan);
  const historial = [
    ...historialDelBanco(edad),
    ...estado.historial,
  ];

  const prompt = `Edad/franja: ${edad} años.

Historial de juegos ya generados:
${historialTexto(historial)}

Genera UN juego de lógica NUEVO que no repita ninguno del historial, con la dificultad y el vocabulario de la franja ${edad}. Respeta exactamente el formato JSON indicado.`;

  for (const proveedor of PROVEEDORES) {
    try {
      const respuesta = await generarCon(
        proveedor,
        SISTEMA,
        prompt,
      );
      const juego = parsearJuego(respuesta);

      if (juego) {
        await registrarAcertijoGenerado(usuario.clave, plan, {
          titulo: juego.titulo,
          tema: juego.tema,
          mecanica: juego.mecanica,
        });

        return NextResponse.json(
          {
            acertijo: {
              id: `gen-${crypto.randomUUID()}`,
              edad,
              ...juego,
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
    { error: "No se pudo generar un juego nuevo." },
    { status: 502 },
  );
}
