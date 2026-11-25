import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  agregarHistorialServidorSinBloqueo,
  leerHistorialServidor,
} from "@/lib/historial-servidor";
import { conBloqueoUsuario } from "@/lib/file-lock";
import {
  guardarFallosCarpetaSinBloqueo,
  leerFallosCarpeta,
} from "@/lib/fallos-db";
import {
  rutaEspacioUsuario,
  type PlanUsuario,
} from "@/lib/rutas-espacio";
import {
  claveCanonicaPregunta,
  normalizarPreguntas,
  type Pregunta,
} from "@/lib/tipos";

const DOS_HORAS = 2 * 60 * 60 * 1000;

type TestGuardado = {
  madre: string;
  archivo: string;
  testId: string;
  carpeta: string;
  creadoEn: string;
  preguntas: Pregunta[];
};

async function listarTestsGuardados(
  clave: string,
  plan?: PlanUsuario,
): Promise<TestGuardado[]> {
  const espacio = rutaEspacioUsuario(clave, plan);
  const tests: TestGuardado[] = [];
  let madres;

  try {
    madres = await readdir(espacio, { withFileTypes: true });
  } catch {
    return tests;
  }

  for (const madre of madres) {
    if (!madre.isDirectory()) continue;

    for (const subcarpeta of ["Test", "Test Mixtos"]) {
      let archivos: string[];

      try {
        archivos = await readdir(path.join(espacio, madre.name, subcarpeta));
      } catch {
        continue;
      }

      for (const archivo of archivos) {
        if (!archivo.toLowerCase().endsWith(".json")) continue;

        try {
          const datos = JSON.parse(
            await readFile(
              path.join(espacio, madre.name, subcarpeta, archivo),
              "utf8",
            ),
          ) as {
            preguntas?: unknown;
            carpeta?: unknown;
            creadoEn?: unknown;
          };
          const preguntas = normalizarPreguntas(datos.preguntas);
          const creadoEn =
            typeof datos.creadoEn === "string" ? datos.creadoEn : "";

          // Los tests anteriores al despliegue no tienen creadoEn y se ignoran.
          if (!creadoEn || Number.isNaN(new Date(creadoEn).getTime())) {
            continue;
          }

          if (preguntas.length === 0) continue;

          tests.push({
            madre: madre.name,
            archivo,
            testId: archivo.replace(/\.json$/i, ".pdf"),
            carpeta:
              typeof datos.carpeta === "string" && datos.carpeta.trim()
                ? datos.carpeta.trim()
                : madre.name,
            creadoEn,
            preguntas,
          });
        } catch {
          // Un JSON dañado no debe romper el barrido.
        }
      }
    }
  }

  return tests;
}

/**
 * Convierte en repaso los tests guardados hace más de dos horas que nunca
 * se corrigieron. Es idempotente: la entrada de historial "huerfano" marca
 * el test como procesado.
 */
export async function barrerTestsHuerfanos(
  clave: string,
  plan?: PlanUsuario,
): Promise<number> {
  return conBloqueoUsuario(clave, async () => {
    const historial = await leerHistorialServidor(clave, plan);
    const procesados = new Set(
      historial
        .map((entrada) => entrada.testId)
        .filter((testId): testId is string => Boolean(testId)),
    );
    const tests = await listarTestsGuardados(clave, plan);
    const ahora = Date.now();
    let procesadosAhora = 0;

    for (const test of tests) {
      if (procesados.has(test.testId)) continue;

      const creado = new Date(test.creadoEn).getTime();

      if (Number.isNaN(creado) || ahora - creado < DOS_HORAS) continue;

      const porClave = new Map<string, Pregunta>();

      for (const pregunta of test.preguntas) {
        const clavePregunta = claveCanonicaPregunta(pregunta.enunciado);
        if (!porClave.has(clavePregunta)) {
          porClave.set(clavePregunta, pregunta);
        }
      }

      const actuales = await leerFallosCarpeta(clave, test.madre);
      const clavesActuales = new Set(
        actuales.map((pregunta) =>
          claveCanonicaPregunta(pregunta.enunciado),
        ),
      );
      const nuevas = [...porClave.entries()]
        .filter(([clavePregunta]) => !clavesActuales.has(clavePregunta))
        .map(([, pregunta]) => pregunta);

      if (nuevas.length > 0) {
        await guardarFallosCarpetaSinBloqueo(
          clave,
          test.madre,
          [...actuales, ...nuevas],
        );
      }

      const pendientes = new Set([
        ...clavesActuales,
        ...porClave.keys(),
      ]).size;

      await agregarHistorialServidorSinBloqueo(
        clave,
        {
          fecha: test.creadoEn,
          nota: 0,
          carpeta: test.carpeta,
          aciertos: 0,
          fallos: porClave.size,
          enBlanco: 0,
          total: porClave.size,
          testId: test.testId,
          tipo: "huerfano",
          pendientes,
        },
        plan,
      );

      procesados.add(test.testId);
      procesadosAhora += 1;
    }

    return procesadosAhora;
  });
}
