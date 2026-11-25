import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import { mensajeError } from "@/lib/errores";
import {
  guardarFallosCarpeta,
  leerFallosCarpeta,
  obtenerCarpetaMadre,
} from "@/lib/fallos-db";
import { actualizarPdfRepaso } from "@/lib/estructura-carpetas";
import { clavesPreguntasDeCarpeta } from "@/lib/preguntas-carpeta";
import {
  resolverCarpetaExistente,
  rutaEspacioUsuario,
} from "@/lib/rutas-espacio";
import {
  claveCanonicaPregunta,
  normalizarPregunta,
  type Pregunta,
} from "@/lib/tipos";

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
  return claveCanonicaPregunta(pregunta.enunciado);
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

function esArcadeOKids(valor: string): boolean {
  const normalizado = valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return /(^|[^a-z])(arcade|kids)([^a-z]|$)/.test(normalizado);
}

export async function POST(req: Request) {
  try {
    const usuario = await obtenerUsuarioSesion();

    if (!usuario) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const cuerpo: unknown = await req.json().catch(() => null);

    if (!Array.isArray(cuerpo)) {
      return NextResponse.json(
        { error: "Se espera un array de resultados" },
        { status: 400 },
      );
    }

    const debugFallos =
      process.env.NODE_ENV !== "production" ||
      process.env.DEBUG_FALLOS === "1";
    const clave = usuario.clave;

    if (usuario.rol !== "premium") {
      if (debugFallos) {
        console.warn("[fallos/actualizar] excluido no premium", {
          userId: clave,
          plan: usuario.rol,
        });
      }

      return NextResponse.json({
        ok: true,
        procesados: 0,
        carpetas: [],
        repasoActualizado: false,
        excluidos: { noPremium: cuerpo.length, arcadeKids: 0 },
        pendientes: {},
        pendientesTotales: 0,
        motivo: "no_premium",
      });
    }

    const porCarpeta = new Map<string, Pregunta[]>();
    const fallosNuevos = new Map<string, Pregunta[]>();
    const carpetasTest = new Map<string, string>();
    const madresResueltas = new Map<string, string>();
    let procesados = 0;
    let repasoActualizado = false;
    let excluidosArcadeKids = 0;

    for (const item of cuerpo) {
      const resultado = leerResultado(item);

      if (!resultado) {
        continue;
      }

      const testId = resultado.testId?.trim() ?? "";
      const carpetaCliente = resultado.carpeta;

      if (debugFallos) {
        console.info("[fallos/actualizar] entrada", {
          testId,
          carpeta: carpetaCliente,
        });
      }

      // Filtro 2: Arcade/Kids, por identificador o carpeta de origen.
      const motivoExclusion = testId
        ? esArcadeOKids(testId)
          ? "testId"
          : ""
        : esArcadeOKids(carpetaCliente)
          ? "carpeta"
          : "";

      if (motivoExclusion) {
        excluidosArcadeKids += 1;

        if (debugFallos) {
          console.warn("[fallos/actualizar] excluido arcade/kids", {
            testId,
            motivo: motivoExclusion,
          });
        }
        continue;
      }

      // El testId manda siempre. La carpeta del cliente solo se acepta como
      // compatibilidad si no hay testId.
      let carpetaEfectiva = "";

      if (testId) {
        carpetaEfectiva = carpetasTest.get(testId) ?? "";

        if (!carpetaEfectiva) {
          carpetaEfectiva = await carpetaDesdeTest(clave, testId);
          carpetasTest.set(testId, carpetaEfectiva);
        }
      } else {
        carpetaEfectiva = carpetaCliente;
      }

      if (!carpetaEfectiva) {
        if (debugFallos) {
          console.warn("[fallos/actualizar] sin carpeta resoluble", {
            testId,
            carpeta: carpetaCliente,
          });
        }
        continue;
      }

      const madreSolicitada = obtenerCarpetaMadre(carpetaEfectiva);

      if (esArcadeOKids(madreSolicitada)) {
        excluidosArcadeKids += 1;

        if (debugFallos) {
          console.warn("[fallos/actualizar] excluido arcade/kids", {
            testId,
            motivo: "carpeta_madre",
          });
        }
        continue;
      }

      const claveMadre = madreSolicitada.toLocaleLowerCase("es");
      let madre = madresResueltas.get(claveMadre);

      if (!madre) {
        const resuelta = await resolverCarpetaExistente(
          clave,
          madreSolicitada,
        );

        if (!resuelta) {
          if (debugFallos) {
            console.warn("[fallos/actualizar] carpeta no encontrada", {
              testId,
              madreSolicitada,
            });
          }
          continue;
        }

        madre = resuelta.nombre;
        madresResueltas.set(claveMadre, madre);
      }

      const carpetaMadre = path.join(rutaEspacioUsuario(clave), madre);
      const existeCarpetaMadre = existsSync(carpetaMadre);

      if (debugFallos) {
        console.info("[fallos/actualizar] resuelto", {
          testId,
          carpetaLeidaDelJson: testId ? carpetaEfectiva : null,
          madre,
          carpetaMadre,
          existe: existeCarpetaMadre,
        });
      }

      if (!existeCarpetaMadre) {
        continue;
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
          fallosNuevos.set(madre, [...acumulados, resultado.pregunta]);
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
      repasoActualizado = true;

      const nuevas = fallosNuevos.get(madre) ?? [];

      if (nuevas.length > 0) {
        const carpetaMadre = path.join(rutaEspacioUsuario(clave), madre);

        await actualizarPdfRepaso(carpetaMadre, nuevas);

        if (debugFallos) {
          console.info("[fallos/actualizar] repaso actualizado", { madre });
        }
      }
    }

    const carpetas = [...porCarpeta.keys()];

    if (debugFallos) {
      console.info("[fallos/actualizar] salida", {
        procesados,
        carpetas,
        repasoActualizado,
        excluidosNoPremium: 0,
        excluidosArcadeKids,
      });
    }

    const pendientes: Record<string, number> = {};

    for (const [madre, fallos] of porCarpeta) {
      const claves = new Set(fallos.map(clavePregunta));
      const fuente = await clavesPreguntasDeCarpeta(clave, madre);
      const validas = [...claves].filter((clavePregunta) =>
        fuente.size === 0 ? true : fuente.has(clavePregunta),
      );

      pendientes[madre] =
        fuente.size > 0
          ? Math.min(validas.length, fuente.size)
          : validas.length;
    }

    return NextResponse.json({
      ok: true,
      procesados,
      carpetas,
      repasoActualizado,
      excluidos: { noPremium: 0, arcadeKids: excluidosArcadeKids },
      pendientes,
      pendientesTotales: Object.values(pendientes).reduce(
        (total, cantidad) => total + cantidad,
        0,
      ),
    });
  } catch (error) {
    console.error("[fallos/actualizar] error", error);

    return NextResponse.json(
      { error: mensajeError(error) },
      { status: 500 },
    );
  }
}
