import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import {
  obtenerTokenCSRFDesdeCookie,
  verificarTokenCSRF,
} from "@/lib/csrf";
import { obtenerIpCliente } from "@/lib/ip";
import { consumirLimite } from "@/lib/rate-limit";
import {
  esNombreCarpetaSeguro,
  estaDentroDe,
  rutaEspacioUsuario,
} from "@/lib/rutas-espacio";
import { SUB_CARPETA_RESUMENES } from "@/lib/estructura-carpetas";

const NOMBRE_MD =
  /^[\p{L}\p{N}][\p{L}\p{N} ._()\-]{0,150}\.md$/iu;

function error(status: number, codigo: string) {
  return NextResponse.json({ codigo }, { status });
}

export async function DELETE(request: Request) {
  const usuario = await obtenerUsuarioSesion();

  if (!usuario) {
    return error(401, "SESION_REQUERIDA");
  }

  if (usuario.rol !== "premium") {
    return error(403, "PREMIUM_REQUERIDO");
  }

  const limite = consumirLimite(
    `resumenes-eliminar:${usuario.clave}:${obtenerIpCliente(request)}`,
    30,
    60_000,
  );

  if (!limite.permitido) {
    return error(429, "LIMITE_DIARIO");
  }

  const cookieCsrf = await obtenerTokenCSRFDesdeCookie();

  if (!verificarTokenCSRF(request, cookieCsrf)) {
    return error(403, "CSRF_INVALIDO");
  }

  const { searchParams } = new URL(request.url);
  const carpeta = searchParams.get("carpeta")?.trim() || "";
  const archivo = searchParams.get("archivo")?.trim() || "";

  if (
    !esNombreCarpetaSeguro(carpeta) ||
    !NOMBRE_MD.test(archivo) ||
    archivo.includes("..") ||
    archivo.includes("/") ||
    archivo.includes("\\")
  ) {
    return error(400, "SOLICITUD_INVALIDA");
  }

  const rutaEspacio = rutaEspacioUsuario(usuario.clave);
  const rutaResumenes = path.join(
    rutaEspacio,
    carpeta,
    SUB_CARPETA_RESUMENES,
  );
  const rutaArchivo = path.join(rutaResumenes, archivo);

  if (
    !estaDentroDe(rutaEspacio, rutaResumenes) ||
    !estaDentroDe(rutaResumenes, rutaArchivo) ||
    path.dirname(rutaArchivo) !== path.resolve(rutaResumenes)
  ) {
    return error(403, "SOLICITUD_INVALIDA");
  }

  try {
    await unlink(rutaArchivo);

    return NextResponse.json({
      ok: true,
      archivo,
    });
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "ENOENT"
    ) {
      return error(404, "NO_ENCONTRADO");
    }

    console.error("[Resumenes] Error al eliminar:", err);

    return error(500, "ERROR_INTERNO");
  }
}
