import { NextResponse } from "next/server";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { obtenerClaveSesion } from "@/lib/auth-server";
import { mensajeError } from "@/lib/errores";
import {
  esNombreArchivoSeguro,
  estaDentroDe,
  resolverCarpetaExistente,
} from "@/lib/rutas-espacio";
import { normalizarPregunta, type Pregunta } from "@/lib/tipos";
import { barajarPreguntas } from "@/lib/tipos";
import { generarPreguntasDesdeResumen } from "@/lib/preguntas-resumen";

export const maxDuration = 120;

const MAX_PREGUNTAS_MIXTO = 120;
const MAX_ARCHIVOS_SELECCIONADOS = 100;
const MAX_RESUMENES = 10;
const NOMBRE_RESUMEN = /^[\p{L}\p{N}][\p{L}\p{N} ._()\-]{0,150}\.md$/iu;

export async function POST(req: Request) {
  try {
    const clave = await obtenerClaveSesion();

    if (!clave) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const cuerpo: unknown = await req.json().catch(() => null);

    if (!cuerpo || typeof cuerpo !== "object") {
      return NextResponse.json(
        { error: "Solicitud no válida" },
        { status: 400 },
      );
    }

    const datos = cuerpo as Record<string, unknown>;
    const carpeta =
      typeof datos.carpeta === "string" ? datos.carpeta.trim() : "";
    const numPreguntas = Number(datos.numPreguntas);
    const usadas = Array.isArray(datos.usadas)
      ? datos.usadas.filter((valor): valor is string => typeof valor === "string")
      : [];

    // PDFs marcados por el usuario. Si no llega ninguno, se mantiene el
    // comportamiento antiguo (toda la carpeta).
    const archivosSolicitados = Array.isArray(datos.archivos)
      ? datos.archivos
          .filter((valor): valor is string => typeof valor === "string")
          .slice(0, MAX_ARCHIVOS_SELECCIONADOS)
      : [];

    const archivosValidos = archivosSolicitados.filter(
      (nombre) =>
        esNombreArchivoSeguro(nombre) && /\.(pdf|json)$/i.test(nombre),
    );

    const resumenesSolicitados = Array.isArray(datos.resumenes)
      ? datos.resumenes
          .filter((valor): valor is string => typeof valor === "string")
          .slice(0, MAX_RESUMENES)
      : [];
    const resumenesValidos = resumenesSolicitados.filter((nombre) =>
      NOMBRE_RESUMEN.test(nombre),
    );

    if (archivosSolicitados.length > 0 && archivosValidos.length === 0) {
      return NextResponse.json(
        { error: "Los archivos seleccionados no son válidos" },
        { status: 400 },
      );
    }

    if (
      resumenesSolicitados.length > 0 &&
      resumenesValidos.length === 0
    ) {
      return NextResponse.json(
        { error: "Los resúmenes seleccionados no son válidos" },
        { status: 400 },
      );
    }

    if (!carpeta) {
      return NextResponse.json(
        { error: "Falta el nombre de la carpeta" },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(numPreguntas) ||
      numPreguntas <= 0 ||
      numPreguntas > MAX_PREGUNTAS_MIXTO
    ) {
      return NextResponse.json(
        { error: "El número de preguntas no es válido" },
        { status: 400 },
      );
    }

    const carpetaResuelta = await resolverCarpetaExistente(clave, carpeta);

    if (!carpetaResuelta) {
      return NextResponse.json(
        { error: "No se encontró la carpeta del examen" },
        { status: 404 },
      );
    }

    // Con selección explícita se leen solo esos PDFs (y su JSON asociado).
    const haySeleccionExplicita =
      archivosValidos.length > 0 || resumenesValidos.length > 0;
    let jsonFiles: string[];

    if (haySeleccionExplicita) {
      jsonFiles = Array.from(
        new Set(
          archivosValidos.map((nombre) =>
            nombre.replace(/\.(pdf|json)$/i, ".json"),
          ),
        ),
      );
    } else {
      const entradas = await readdir(carpetaResuelta.ruta);
      jsonFiles = entradas.filter((nombre) => nombre.endsWith(".json"));
    }

    const todasLasPreguntas: Pregunta[] = [];
    let resumenesGenerados = 0;

    for (const archivo of jsonFiles) {
      try {
        const rutaJson = path.join(carpetaResuelta.ruta, archivo);

        if (!estaDentroDe(carpetaResuelta.ruta, rutaJson)) {
          continue;
        }

        const contenido = await readFile(rutaJson, "utf8");
        const datosJson: unknown = JSON.parse(contenido);

        if (!datosJson || typeof datosJson !== "object") {
          continue;
        }

        const bruto = Array.isArray(datosJson)
          ? datosJson
          : (datosJson as { preguntas?: unknown }).preguntas;

        if (!Array.isArray(bruto)) {
          continue;
        }

        for (const item of bruto) {
          const pregunta = normalizarPregunta(item);

          if (pregunta) {
            todasLasPreguntas.push(pregunta);
          }
        }
      } catch {
        // Un JSON corrupto no debe impedir generar el test con el resto.
      }
    }

    if (resumenesValidos.length > 0) {
      const nombreCarpeta = path.basename(carpetaResuelta.ruta);
      const rutaMadre =
        nombreCarpeta === "Test" || nombreCarpeta === "Test Mixtos"
          ? path.dirname(carpetaResuelta.ruta)
          : carpetaResuelta.ruta;
      const rutaResumenes = path.join(rutaMadre, "Resumenes");

      for (const archivo of resumenesValidos) {
        try {
          const rutaMarkdown = path.join(rutaResumenes, archivo);

          if (
            !estaDentroDe(rutaMadre, rutaResumenes) ||
            !estaDentroDe(rutaResumenes, rutaMarkdown)
          ) {
            continue;
          }

          const markdown = await readFile(rutaMarkdown, "utf8");
          const preguntas = await generarPreguntasDesdeResumen(
            markdown,
            archivo,
          );

          if (preguntas.length > 0) {
            todasLasPreguntas.push(...preguntas);
            resumenesGenerados += 1;
          }
        } catch {
          // Un resumen ilegible o una IA caída no rompe el resto del test.
        }
      }
    }

    const unicas: Pregunta[] = [];
    const vistos = new Set<string>();

    for (const pregunta of todasLasPreguntas) {
      const id = pregunta.enunciado;

      if (!vistos.has(id)) {
        vistos.add(id);
        unicas.push(pregunta);
      }
    }

    if (unicas.length === 0) {
      return NextResponse.json(
        {
          error:
            archivosValidos.length > 0
              ? "Los PDFs seleccionados no tienen preguntas guardadas."
              : resumenesValidos.length > 0
                ? "No se pudieron generar preguntas a partir de los resúmenes."
                : "No hay preguntas guardadas en esta carpeta.",
        },
        { status: 404 },
      );
    }

    const noUsadas = unicas.filter(
      (pregunta) => !usadas.includes(pregunta.enunciado),
    );

    for (let i = noUsadas.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [noUsadas[i], noUsadas[j]] = [noUsadas[j], noUsadas[i]];
    }

    const resultado = barajarPreguntas(
      noUsadas.slice(0, numPreguntas),
    );

    return NextResponse.json({
      preguntas: resultado,
      totalDisponible: noUsadas.length,
      generadas: resultado.length,
      cantidadReal: resultado.length,
      solicitadas: numPreguntas,
      resumenesGenerados,
      aviso: resultado.length < numPreguntas ? "Faltan preguntas" : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: mensajeError(error) },
      { status: 500 },
    );
  }
}
