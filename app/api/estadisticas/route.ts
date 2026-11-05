import { NextResponse } from "next/server";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import {
  carpetaMadre,
  normalizarEntradaHistorial,
  type EntradaHistorialTest,
} from "@/lib/historial-tests";
import {
  agregarHistorialServidor,
  leerHistorialServidor,
} from "@/lib/historial-servidor";
import { MENSAJE_SOLO_PREMIUM } from "@/lib/planes";

type DiaAgregado = {
  fecha: string;
  tests: number;
  aciertos: number;
  fallos: number;
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
    { tests: number; aciertos: number; fallos: number; notas: number }
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
        carpetas: {},
      };

    dia.tests += 1;
    dia.aciertos += entrada.aciertos;
    dia.fallos += entrada.fallos;

    const porCarpetaDia =
      dia.carpetas[madre] ?? { tests: 0, aciertos: 0, fallos: 0 };
    porCarpetaDia.tests += 1;
    porCarpetaDia.aciertos += entrada.aciertos;
    porCarpetaDia.fallos += entrada.fallos;
    dia.carpetas[madre] = porCarpetaDia;

    dias.set(fecha, dia);

    const carpeta =
      carpetas.get(madre) ??
      { tests: 0, aciertos: 0, fallos: 0, notas: 0 };
    carpeta.tests += 1;
    carpeta.aciertos += entrada.aciertos;
    carpeta.fallos += entrada.fallos;
    carpeta.notas += entrada.nota;
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
        notaMedia: datos.tests > 0 ? datos.notas / datos.tests : 0,
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

  const historial = await leerHistorialServidor(usuario.clave, usuario.rol);
  const { porDia, porCarpeta } = agregar(historial);

  return NextResponse.json(
    { historial, porDia, porCarpeta },
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
