import { NextResponse } from "next/server";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import {
  carpetaMadre,
  esTestCompletado,
  normalizarEntradaHistorial,
  type EntradaHistorialTest,
} from "@/lib/historial-tests";
import {
  agregarHistorialServidor,
  leerHistorialServidor,
} from "@/lib/historial-servidor";
import { leerFallosCarpeta } from "@/lib/fallos-db";
import { clavesPreguntasDeCarpeta } from "@/lib/preguntas-carpeta";
import { barrerTestsHuerfanos } from "@/lib/tests-huerfanos";
import { MENSAJE_SOLO_PREMIUM } from "@/lib/planes";
import {
  listarCarpetasMadreExistentes,
  normalizarNombreCarpeta,
} from "@/lib/rutas-espacio";
import { claveCanonicaPregunta } from "@/lib/tipos";

type DiaAgregado = {
  fecha: string;
  tests: number;
  aciertos: number;
  fallos: number;
  pendientes: number | null;
  carpetas: Record<
    string,
    { tests: number; aciertos: number; fallos: number }
  >;
};

type CarpetaAgregada = {
  carpeta: string;
  tests: number;
  aciertos: number;
  fallos: number;
  notaMedia: number;
  pendientes: number;
};

const formatoFecha = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function agregar(
  historial: EntradaHistorialTest[],
): { porDia: DiaAgregado[]; porCarpeta: CarpetaAgregada[] } {
  const dias = new Map<string, DiaAgregado>();
  const carpetas = new Map<
    string,
    {
      tests: number;
      aciertos: number;
      fallos: number;
      notas: Map<string, number>;
    }
  >();

  for (const entrada of historial) {
    const fecha = formatoFecha.format(new Date(entrada.fecha));
    const madre = carpetaMadre(entrada.carpeta) || "Sin carpeta";

    const dia =
      dias.get(fecha) ??
      {
        fecha,
        tests: 0,
        aciertos: 0,
        fallos: 0,
        pendientes: null,
        carpetas: {},
      };

    const cuentaComoTest = esTestCompletado(entrada);
    if (cuentaComoTest) dia.tests += 1;
    dia.aciertos += entrada.aciertos;
    dia.fallos += entrada.fallos;

    if (dia.pendientes === null && typeof entrada.pendientes === "number") {
      dia.pendientes = entrada.pendientes;
    }

    const porCarpetaDia =
      dia.carpetas[madre] ?? { tests: 0, aciertos: 0, fallos: 0 };
    if (cuentaComoTest) porCarpetaDia.tests += 1;
    porCarpetaDia.aciertos += entrada.aciertos;
    porCarpetaDia.fallos += entrada.fallos;
    dia.carpetas[madre] = porCarpetaDia;

    dias.set(fecha, dia);

    const carpeta =
      carpetas.get(madre) ??
      {
        tests: 0,
        aciertos: 0,
        fallos: 0,
        notas: new Map<string, number>(),
      };
    if (cuentaComoTest) carpeta.tests += 1;
    carpeta.aciertos += entrada.aciertos;
    carpeta.fallos += entrada.fallos;

    if (
      entrada.testId &&
      entrada.tipo !== "huerfano" &&
      entrada.tipo !== "repaso_fallido"
    ) {
      carpeta.notas.set(
        entrada.testId,
        Math.max(carpeta.notas.get(entrada.testId) ?? 0, entrada.nota),
      );
    }
    carpetas.set(madre, carpeta);
  }

  return {
    porDia: [...dias.values()].sort((a, b) =>
      a.fecha.localeCompare(b.fecha),
    ),
    porCarpeta: [...carpetas.entries()]
      .map(([carpeta, datos]) => ({
        carpeta,
        tests: datos.tests,
        aciertos: datos.aciertos,
        fallos: datos.fallos,
        notaMedia:
          datos.notas.size > 0
            ? [...datos.notas.values()].reduce(
                (total, nota) => total + nota,
                0,
              ) / datos.notas.size
            : 0,
        pendientes: 0,
      }))
      .sort((a, b) => a.carpeta.localeCompare(b.carpeta, "es")),
  };
}

export async function GET() {
  const usuario = await obtenerUsuarioSesion();

  if (!usuario) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (usuario.rol !== "premium") {
    return NextResponse.json(
      { error: MENSAJE_SOLO_PREMIUM, codigo: "PREMIUM_REQUERIDO" },
      { status: 403 },
    );
  }

  // Barrido idempotente: los tests guardados hace más de dos horas que nunca
  // se corrigieron pasan a repaso y a fallos totales.
  await barrerTestsHuerfanos(usuario.clave, usuario.rol);

  // Filtrado defensivo: solo cuentan las entradas cuya carpeta madre sigue
  // existiendo en el volumen. Un único readdir por consulta, sin caché, para
  // no mostrar datos recién borrados.
  const carpetas = await listarCarpetasMadreExistentes(
    usuario.clave,
    usuario.rol,
  );
  const existentes = new Set(carpetas.map(normalizarNombreCarpeta));
  const historial = (await leerHistorialServidor(usuario.clave, usuario.rol))
    .filter((entrada) =>
      existentes.has(normalizarNombreCarpeta(carpetaMadre(entrada.carpeta))),
    );
  const { porDia, porCarpeta } = agregar(historial);
  const pendientesPorCarpeta: Record<string, number> = {};
  let pendientesTotales = 0;

  for (const carpeta of carpetas) {
    const fallos = await leerFallosCarpeta(usuario.clave, carpeta);
    const claves = new Set(
      fallos.map((pregunta) =>
        claveCanonicaPregunta(pregunta.enunciado),
      ),
    );
    const fuente = await clavesPreguntasDeCarpeta(
      usuario.clave,
      carpeta,
    );
    const validas = [...claves].filter((clavePregunta) =>
      fuente.size === 0 ? true : fuente.has(clavePregunta),
    );
    const pendientes =
      fuente.size > 0
        ? Math.min(validas.length, fuente.size)
        : validas.length;

    pendientesPorCarpeta[carpeta] = pendientes;
    pendientesTotales += pendientes;
  }

  for (const carpeta of porCarpeta) {
    carpeta.pendientes = pendientesPorCarpeta[carpeta.carpeta] ?? 0;
  }

  const mejoresNotas = new Map<string, number>();

  historial.forEach((entrada) => {
    if (
      !entrada.testId ||
      entrada.tipo === "huerfano" ||
      entrada.tipo === "repaso_fallido"
    ) {
      return;
    }

    mejoresNotas.set(
      entrada.testId,
      Math.max(mejoresNotas.get(entrada.testId) ?? 0, entrada.nota),
    );
  });

  const notas = [...mejoresNotas.values()];
  const resumen = {
    tests: historial.filter(esTestCompletado).length,
    aciertos: historial.reduce(
      (total, entrada) => total + entrada.aciertos,
      0,
    ),
    fallosTotales: historial.reduce(
      (total, entrada) => total + entrada.fallos,
      0,
    ),
    pendientes: pendientesTotales,
    notaMedia:
      notas.length > 0
        ? notas.reduce((total, nota) => total + nota, 0) / notas.length
        : 0,
  };

  return NextResponse.json(
    {
      historial,
      porDia,
      porCarpeta,
      carpetas,
      pendientesPorCarpeta,
      resumen,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(request: Request) {
  const usuario = await obtenerUsuarioSesion();

  if (!usuario) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (usuario.rol !== "premium") {
    return NextResponse.json(
      { error: MENSAJE_SOLO_PREMIUM, codigo: "PREMIUM_REQUERIDO" },
      { status: 403 },
    );
  }

  const cuerpo: unknown = await request.json().catch(() => null);
  const entrada = normalizarEntradaHistorial(cuerpo);

  if (!entrada) {
    return NextResponse.json(
      { error: "Entrada de estadísticas no válida." },
      { status: 400 },
    );
  }

  await agregarHistorialServidor(usuario.clave, entrada, usuario.rol);

  return NextResponse.json({ ok: true }, { status: 201 });
}
