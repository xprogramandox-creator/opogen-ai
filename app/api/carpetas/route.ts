import { NextResponse } from "next/server";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { obtenerClaveSesion } from "@/lib/auth-server";
import { mensajeError } from "@/lib/errores";
import { bloqueoFreemium } from "@/lib/planes-server";
import {
  PREFIJO_FALLOS,
  PREFIJO_TEST_MIXTO,
  esNombreCarpetaSeguro,
  existeCarpeta,
  rutaEspacioUsuario,
} from "@/lib/rutas-espacio";
import { sanearNombreCarpeta } from "@/lib/saneamiento-carpetas";
import { crearEstructuraCarpetaMadre } from "@/lib/estructura-carpetas";

const NOMBRE_REPASO = "repaso.pdf";
const NOMBRE_REPASO_LEGADO = "Repaso_Fallos.pdf";
const SUB_MIXTOS = "Test Mixtos";
const SUB_REPASO = "Repaso";
const INTERNAS = new Set([SUB_MIXTOS, SUB_REPASO, "Test", "Resumenes"]);

export async function GET() {
  const clave = await obtenerClaveSesion();

  if (!clave) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const bloqueo = await bloqueoFreemium();
  if (bloqueo) {
    return bloqueo;
  }

  try {
    const rutaEspacio = rutaEspacioUsuario(clave);
    let carpetasFisicas: string[] = [];

    try {
      const entradas = await readdir(rutaEspacio, { withFileTypes: true });
      carpetasFisicas = entradas
        .filter((entrada) => entrada.isDirectory())
        .map((entrada) => entrada.name);
    } catch {
      carpetasFisicas = [];
    }

    const mixtosConContenido: string[] = [];
    const carpetasConRepaso: string[] = [];
    const visibles = new Set<string>();

    for (const carpeta of carpetasFisicas) {
      if (INTERNAS.has(carpeta)) {
        continue;
      }

      if (
        carpeta.startsWith(PREFIJO_TEST_MIXTO) ||
        carpeta.startsWith("Fallos - ")
      ) {
        visibles.add(carpeta);
        if (carpeta.startsWith(PREFIJO_TEST_MIXTO)) {
          mixtosConContenido.push(carpeta);
        }
        continue;
      }

      visibles.add(carpeta);

      try {
        const rutaMadre = path.join(rutaEspacio, carpeta);

        const [mixtos, repaso] = await Promise.all([
          readdir(path.join(rutaMadre, SUB_MIXTOS), {
            withFileTypes: true,
          }).catch(() => []),
          readdir(path.join(rutaMadre, SUB_REPASO), {
            withFileTypes: true,
          }).catch(() => []),
        ]);

        const hayMixtos = mixtos.some(
          (entrada) => entrada.isFile() && entrada.name.endsWith(".pdf"),
        );
        const hayRepaso = repaso.some(
          (entrada) =>
            entrada.isFile() &&
            (entrada.name === NOMBRE_REPASO ||
              entrada.name === NOMBRE_REPASO_LEGADO),
        );

        // Compatibilidad con la estructura antigua.
        const entradasRaiz = await readdir(rutaMadre, {
          withFileTypes: true,
        }).catch(() => []);
        const pdfsRaiz = entradasRaiz
          .filter((entrada) => entrada.isFile())
          .map((entrada) => entrada.name);

        if (
          hayMixtos ||
          pdfsRaiz.some((nombre) => nombre.endsWith(".pdf"))
        ) {
          mixtosConContenido.push(
            `${PREFIJO_TEST_MIXTO}${carpeta}`,
          );
        }

        if (
          hayRepaso ||
          pdfsRaiz.includes(NOMBRE_REPASO_LEGADO)
        ) {
          carpetasConRepaso.push(carpeta);
          visibles.add(`${PREFIJO_FALLOS}${carpeta}`);
        }
      } catch {
        // Una carpeta ilegible no debe romper el listado.
      }
    }

    // Se mantiene `virtuales` vacío por compatibilidad con clientes antiguos.
    // El repaso de fallos ya vive dentro de cada carpeta madre.
    return NextResponse.json({
      carpetas: [...visibles].sort((a, b) =>
        a.localeCompare(b, "es", { numeric: true }),
      ),
      virtuales: [],
      mixtosConContenido: [...new Set(mixtosConContenido)],
      carpetasConRepaso: [...new Set(carpetasConRepaso)],
    });
  } catch (error) {
    return NextResponse.json(
      { error: mensajeError(error) },
      { status: 500 },
    );
  }
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

    const nombre = (cuerpo as { nombre?: unknown }).nombre;

    if (typeof nombre !== "string" || nombre.trim().length === 0) {
      return NextResponse.json(
        { error: "El nombre de la carpeta es obligatorio" },
        { status: 400 },
      );
    }

    if (/[\\/]/.test(nombre) || nombre.includes("..")) {
      return NextResponse.json(
        { error: "El nombre de la carpeta no puede incluir rutas." },
        { status: 400 },
      );
    }

    const nombreSaneado = sanearNombreCarpeta(nombre);

    if (!nombreSaneado || !esNombreCarpetaSeguro(nombreSaneado)) {
      return NextResponse.json(
        {
          error:
            "El nombre debe contener al menos una letra o un número y no puede incluir rutas.",
        },
        { status: 400 },
      );
    }

    const rutaEspacio = rutaEspacioUsuario(clave);
    const rutaCarpeta = path.join(rutaEspacio, nombreSaneado);

    if (await existeCarpeta(rutaCarpeta)) {
      return NextResponse.json(
        {
          error: `Ya existe una carpeta llamada «${nombreSaneado}». Elige otro nombre.`,
        },
        { status: 409 },
      );
    }

    await crearEstructuraCarpetaMadre(nombreSaneado, rutaEspacio);

    return NextResponse.json(
      {
        mensaje: "Carpeta creada con éxito",
        nombreVisual: nombre.trim(),
        nombreSaneado,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: mensajeError(error) },
      { status: 500 },
    );
  }
}
