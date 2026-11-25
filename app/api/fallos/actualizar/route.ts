import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { obtenerClaveSesion } from "@/lib/auth-server";
import { mensajeError } from "@/lib/errores";
import {
  guardarFallosCarpeta,
  leerFallosCarpeta,
  obtenerCarpetaMadre,
} from "@/lib/fallos-db";
import { actualizarPdfRepaso } from "@/lib/estructura-carpetas";
import {
  esNombreCarpetaSeguro,
  resolverCarpetaExistente,
  rutaEspacioUsuario,
} from "@/lib/rutas-espacio";
import { normalizarPregunta, type Pregunta } from "@/lib/tipos";

type ResultadoTest = {
  carpeta: string;
  testId?: string;
  pregunta: Pregunta;
  acierto: boolean;
};

function leerResultado(valor: unknown): ResultadoTest | null {
  if (!valor || typeof valor !== "object") {
    return null;
  }

  const datos = valor as Record<string, unknown>;
  const carpeta =
    typeof datos.carpeta === "string" ? datos.carpeta.trim() : "";
  const testId =
    typeof datos.testId === "string" ? datos.testId.trim() : "";
  const pregunta = normalizarPregunta(datos.pregunta);

  if (
    (!carpeta && !testId) ||
    !pregunta ||
    typeof datos.acierto !== "boolean"
  ) {
    return null;
  }

  return { carpeta, testId, pregunta, acierto: datos.acierto };
}

function clavePregunta(pregunta: Pregunta): string {
  return pregunta.enunciado;
}

/**
 * Recupera la carpeta madre leyendo el JSON del test cuando el cliente no
 * envía `carpeta` (por ejemplo, un test recuperado desde /crear).
 */
async function carpetaDesdeTest(
  clave: string,
  testId: string,
): Promise<string> {
  const nombre = testId.trim();

  if (
    !nombre ||
    nombre.includes("..") ||
    nombre.includes("/") ||
    nombre.includes("\\") ||
    nombre.includes("\0")
  ) {
    return "";
  }

  const archivo = nombre.toLowerCase().endsWith(".json")
    ? nombre
    : `${nombre.replace(/\.pdf$/i, "")}.json`;
  const espacio = rutaEspacioUsuario(clave);
  const entradas = await readdir(espacio, { withFileTypes: true }).catch(
    () => [],
  );
  const subcarpetas = ["Test", "Test Mixtos", "Repaso", ""];

  for (const entrada of entradas) {
    if (!entrada.isDirectory()) continue;

    for (const subcarpeta of subcarpetas) {
      try {
        const contenido = await readFile(
          path.join(espacio, entrada.name, subcarpeta, archivo),
          "utf8",
        );
        const datos = JSON.parse(contenido) as { carpeta?: unknown };

        if (
          typeof datos.carpeta === "string" &&
          datos.carpeta.trim()
        ) {
          return datos.carpeta.trim();
        }
      } catch {
        // Se prueba la siguiente ubicación.
      }
    }
  }

  return "";
}

export async function POST(req: Request) {
  try {
    const clave = await obtenerClaveSesion();

    if (!clave) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const cuerpo: unknown = await req.json().catch(() => null);

    if (!Array.isArray(cuerpo)) {
      return NextResponse.json(
        { error: "Se espera un array de resultados" },
        { status: 400 },
      );
    }

    // Cada carpeta de examen tiene su propio Repaso_Fallos.pdf y su índice
    // interno. Así "Test Mixtos - Humanización" no comparte repaso con
    // "Humanización".
    const porCarpeta = new Map<string, Pregunta[]>();
    const fallosNuevos = new Map<string, Pregunta[]>();
    const madresResueltas = new Map<string, string>();
    const debugFallos =
      process.env.NODE_ENV !== "production" ||
      process.env.DEBUG_FALLOS === "1";
    let procesados = 0;

    for (const item of cuerpo) {
      const resultado = leerResultado(item);

      if (!resultado) {
        continue;
      }

      const carpetaEfectiva =
        resultado.carpeta ||
        (await carpetaDesdeTest(clave, resultado.testId ?? ""));

      if (!carpetaEfectiva) {
        if (debugFallos) {
          console.warn("[fallos/actualizar] resultado sin carpeta", {
            testId: resultado.testId,
          });
        }
        continue;
      }

      const madreSolicitada = obtenerCarpetaMadre(carpetaEfectiva);
      const claveMadre = madreSolicitada.toLocaleLowerCase("es");
      let madre = madresResueltas.get(claveMadre);

      if (!madre) {
        // El nombre guardado puede venir sin tildes ("Humanizacion") mientras
        // que el cliente envía "Humanización" (o al revés). Se resuelve contra
        // la carpeta física real para no escribir en el legado.
        const resuelta = await resolverCarpetaExistente(
          clave,
          madreSolicitada,
        );

        madre = resuelta?.nombre ?? madreSolicitada;
        madresResueltas.set(claveMadre, madre);
      }

      if (!esNombreCarpetaSeguro(madre)) {
        continue;
      }

      if (debugFallos) {
        console.info("[fallos/actualizar] resultado", {
          carpeta: resultado.carpeta,
          testId: resultado.testId,
          madre,
          acierto: resultado.acierto,
        });
      }

      let fallos = porCarpeta.get(madre);

      if (!fallos) {
        fallos = await leerFallosCarpeta(clave, madre);
        porCarpeta.set(madre, fallos);
      }

      const indice = fallos.findIndex(
        (guardada) =>
          clavePregunta(guardada) === clavePregunta(resultado.pregunta),
      );

      if (!resultado.acierto) {
        const acumulados = fallosNuevos.get(madre) ?? [];

        if (
          !acumulados.some(
            (pregunta) =>
              clavePregunta(pregunta) ===
              clavePregunta(resultado.pregunta),
          )
        ) {
          fallosNuevos.set(madre, [
            ...acumulados,
            resultado.pregunta,
          ]);
        }
      }

      if (!resultado.acierto && indice === -1) {
        fallos.push(resultado.pregunta);
      } else if (resultado.acierto && indice !== -1) {
        fallos.splice(indice, 1);
      }

      procesados += 1;
    }

    for (const [madre, fallos] of porCarpeta) {
      await guardarFallosCarpeta(clave, madre, fallos);

      const nuevas = fallosNuevos.get(madre) ?? [];
      const carpetaMadre = path.join(
        rutaEspacioUsuario(clave),
        madre,
      );

      const existeCarpetaMadre = existsSync(carpetaMadre);

      if (debugFallos) {
        console.info("[fallos/actualizar] carpeta", {
          madre,
          carpetaMadre,
          existe: existeCarpetaMadre,
          nuevas: nuevas.length,
        });
      }

      if (nuevas.length > 0 && !existeCarpetaMadre) {
        if (debugFallos) {
          console.warn("[fallos/actualizar] carpeta no encontrada", {
            madre,
            carpetaMadre,
          });
        }
      }

      if (nuevas.length > 0 && existeCarpetaMadre) {
        // Añade los fallos al repaso.pdf de la carpeta madre directamente
        // desde la pantalla de corrección, sin pasar por Mi Espacio.
        await actualizarPdfRepaso(carpetaMadre, nuevas);

        if (debugFallos) {
          console.info("[fallos/actualizar] repaso actualizado", { madre });
        }
      }
    }

    return NextResponse.json({
      mensaje: "Preguntas actualizadas correctamente",
      procesados,
      carpetas: [...porCarpeta.keys()],
    });
  } catch (error) {
    console.error("[fallos/actualizar] error", error);

    return NextResponse.json(
      { error: mensajeError(error) },
      { status: 500 },
    );
  }
}
