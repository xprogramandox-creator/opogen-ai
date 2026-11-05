import { NextResponse } from "next/server";
import { obtenerClaveSesion } from "@/lib/auth-server";
import { mensajeError } from "@/lib/errores";
import { leerFallosCarpeta } from "@/lib/fallos-db";
import {
  generarPdfFallos,
  guardarPdfFallos,
} from "@/lib/pdf-fallos";
import { esNombreCarpetaSeguro } from "@/lib/rutas-espacio";

function nombreDescarga(carpeta: string): string {
  return (
    carpeta.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 80) ||
    "Fallos"
  );
}

export async function GET(req: Request) {
  const clave = await obtenerClaveSesion();

  if (!clave) {
    return NextResponse.json(
      { error: "No autenticado" },
      { status: 401 },
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const carpeta = searchParams.get("carpeta")?.trim();

    if (!carpeta) {
      return NextResponse.json(
        { error: "Falta el parámetro carpeta" },
        { status: 400 },
      );
    }

    if (!esNombreCarpetaSeguro(carpeta)) {
      return NextResponse.json(
        { error: "El nombre de la carpeta no es válido" },
        { status: 400 },
      );
    }

    const madre = carpeta.trim();
    const fallos = await leerFallosCarpeta(clave, madre);

    if (fallos.length === 0) {
      return NextResponse.json(
        { error: "No hay fallos para esta carpeta" },
        { status: 404 },
      );
    }

    const pdfBuffer = generarPdfFallos(fallos, madre);

    try {
      await guardarPdfFallos(clave, madre, fallos);
    } catch (error) {
      // La descarga sigue funcionando aunque no se pueda guardar la copia.
      console.error(
        "No se pudo guardar el PDF de fallos:",
        mensajeError(error),
      );
    }

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Repaso_Fallos_${nombreDescarga(
          madre,
        )}.pdf"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: mensajeError(error) },
      { status: 500 },
    );
  }
}
