import { NextResponse } from "next/server";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { obtenerClaveSesion } from "@/lib/auth-server";
import { mensajeError } from "@/lib/errores";
import { bloqueoFreemium } from "@/lib/planes-server";
import {
  generarPdfExamen,
  normalizarPreguntasPdf,
} from "@/lib/pdf-examen";
import {
  PREFIJO_TEST_MIXTO,
  esNombreCarpetaSeguro,
  resolverRutaGuardado,
} from "@/lib/rutas-espacio";
import { sanearNombreCarpeta } from "@/lib/saneamiento-carpetas";
import { crearEstructuraCarpetaMadre } from "@/lib/estructura-carpetas";
import { barajarPreguntas } from "@/lib/tipos";

async function siguienteNumero(rutaCarpeta: string): Promise<number> {
  const entradas = await readdir(rutaCarpeta);

  let maximo = 0;

  for (const nombre of entradas) {
    const coincidencia = /^(\d+)_/.exec(nombre);

    if (coincidencia) {
      maximo = Math.max(maximo, Number(coincidencia[1]));
    }
  }

  // Número de documento siguiente: si el último es 11, el nuevo será 12.
  return maximo + 1;
}

export async function POST(req: Request) {
  try {
    const clave = await obtenerClaveSesion();

    if (!clave) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const bloqueo = await bloqueoFreemium();
    if (bloqueo) {
      return bloqueo;
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
    const esMixto = datos.esMixto === true;
    const textoContexto =
      typeof datos.textoContexto === "string" ? datos.textoContexto : "";
    const etiquetaSolicitada =
      typeof datos.etiqueta === "string"
        ? datos.etiqueta.trim().slice(0, 40)
        : "";
    const etiqueta = /^[\p{L}\p{N} _-]+$/u.test(etiquetaSolicitada)
      ? etiquetaSolicitada
      : "";
    // Nombre visible de la carpeta principal para el sufijo del archivo
    // (en los tests mixtos la carpeta destino es "Test Mixtos - X").
    const baseSolicitada =
      typeof datos.nombreBase === "string"
        ? datos.nombreBase.trim().slice(0, 120)
        : "";
    const preguntas = barajarPreguntas(
      normalizarPreguntasPdf(datos.preguntas),
    );

    if (carpeta.length === 0) {
      return NextResponse.json(
        { error: "Falta el nombre de la carpeta" },
        { status: 400 },
      );
    }

    if (!esNombreCarpetaSeguro(carpeta)) {
      return NextResponse.json(
        { error: "El nombre de la carpeta no es válido" },
        { status: 400 },
      );
    }

    if (preguntas.length === 0) {
      return NextResponse.json(
        { error: "No hay preguntas válidas para guardar" },
        { status: 400 },
      );
    }

    const destino = await resolverRutaGuardado(clave, carpeta, {
      mixto: esMixto,
    });

    const rutaMadre = path.dirname(destino.ruta);
    await crearEstructuraCarpetaMadre(
      path.basename(rutaMadre),
      path.dirname(rutaMadre),
    );
    await mkdir(destino.ruta, { recursive: true });

    const numero = await siguienteNumero(destino.ruta);

    const baseArchivo =
      baseSolicitada && esNombreCarpetaSeguro(baseSolicitada)
        ? baseSolicitada
        : destino.nombre;

    // Ej.: 1_25_Test Mixto_Constitucion_Espanola.pdf
    const nombreArchivo = `${numero}_${preguntas.length}_${
      etiqueta ? `${etiqueta}_` : ""
    }${sanearNombreCarpeta(baseArchivo)}.pdf`;

    const rutaPdf = path.join(destino.ruta, nombreArchivo);
    const rutaJson = rutaPdf.replace(/\.pdf$/i, ".json");

    await writeFile(rutaPdf, Buffer.from(generarPdfExamen(preguntas)));
    await writeFile(
      rutaJson,
      JSON.stringify(
        {
          preguntas,
          numPreguntas: preguntas.length,
          carpeta: destino.nombre,
          textoContexto: textoContexto || "Examen de OpoGen",
        },
        null,
        2,
      ),
      "utf8",
    );

    return NextResponse.json({
      mensaje: "Guardado con éxito",
      archivo: nombreArchivo,
      numero,
      etiqueta,
      carpeta: destino.nombre,
      esMixto:
        esMixto || destino.nombre.startsWith(PREFIJO_TEST_MIXTO),
    });
  } catch (error) {
    return NextResponse.json(
      { error: mensajeError(error) },
      { status: 500 },
    );
  }
}
