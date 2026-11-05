import { NextResponse } from "next/server";
import { obtenerClaveSesion } from "@/lib/auth-server";
import { mensajeError } from "@/lib/errores";
import { eliminarFallosDeCarpeta } from "@/lib/fallos-db";
import { esNombreCarpetaSeguro } from "@/lib/rutas-espacio";

export async function DELETE(req: Request) {
  try {
    const clave = await obtenerClaveSesion();

    if (!clave) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const carpeta = searchParams.get("carpeta")?.trim();

    if (!carpeta || !esNombreCarpetaSeguro(carpeta)) {
      return NextResponse.json(
        { error: "Carpeta no válida" },
        { status: 400 },
      );
    }

    await eliminarFallosDeCarpeta(clave, carpeta);

    return NextResponse.json({
      mensaje: "Repaso de fallos eliminado correctamente",
    });
  } catch (error) {
    return NextResponse.json(
      { error: mensajeError(error) },
      { status: 500 },
    );
  }
}
