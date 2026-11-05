import { NextResponse } from "next/server";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import {
  obtenerTokenCSRFDesdeCookie,
  verificarTokenCSRF,
} from "@/lib/csrf";
import { obtenerIpCliente } from "@/lib/ip";
import { consumirLimite } from "@/lib/rate-limit";
import {
  comprobarResumenDisponible,
  extraerTextoPdf,
  generarResumenMarkdown,
  guardarResumen,
  ResumenError,
} from "@/lib/resumenes";

export const maxDuration = 120;

const MAX_PDF = 3_500_000;
const LIMITE_DIARIO = 20;

function error(
  status = 400,
  codigo = "ERROR_INTERNO",
  archivo?: string,
) {
  return NextResponse.json(
    {
      codigo,
      ...(archivo ? { archivo } : {}),
    },
    { status },
  );
}

export async function POST(request: Request) {
  const usuario = await obtenerUsuarioSesion();

  if (!usuario) {
    return error(401, "SESION_REQUERIDA");
  }

  if (usuario.rol !== "premium") {
    return error(403, "PREMIUM_REQUERIDO");
  }

  const ip = obtenerIpCliente(request);
  const limite = consumirLimite(
    `resumenes:${usuario.clave}:${ip}`,
    LIMITE_DIARIO,
    24 * 60 * 60 * 1000,
  );

  if (!limite.permitido) {
    return error(429, "LIMITE_DIARIO");
  }

  const cookieCsrf = await obtenerTokenCSRFDesdeCookie();

  if (!verificarTokenCSRF(request, cookieCsrf)) {
    return error(403, "CSRF_INVALIDO");
  }

  try {
    const formData = await request.formData().catch(() => null);

    if (!formData) {
      return error(400, "SOLICITUD_INVALIDA");
    }

    const archivo = formData.get("archivo");
    const carpeta = String(formData.get("carpeta") || "").trim();
    const nombreSolicitado = String(
      formData.get("nombreArchivo") || "",
    ).trim();

    if (!(archivo instanceof File)) {
      return error(400, "ARCHIVO_REQUERIDO");
    }

    if (!carpeta) {
      return error(400, "CARPETA_REQUERIDA");
    }

    if (archivo.size === 0) {
      return error(400, "ARCHIVO_VACIO");
    }

    if (archivo.size > MAX_PDF) {
      return error(413, "ARCHIVO_GRANDE");
    }

    if (!/\.pdf$/i.test(archivo.name)) {
      return error(400, "PDF_INVALIDO");
    }

    const disponible = await comprobarResumenDisponible(
      usuario.clave,
      carpeta,
      nombreSolicitado || archivo.name,
    );

    if (disponible.existe) {
      return error(
        409,
        "RESUMEN_EXISTENTE",
        disponible.archivo,
      );
    }

    const bytes = new Uint8Array(await archivo.arrayBuffer());
    const firma = new TextDecoder("latin1").decode(
      bytes.slice(0, 5),
    );

    if (firma !== "%PDF-") {
      return error(400, "PDF_INVALIDO");
    }

    const texto = await extraerTextoPdf(bytes);

    if (texto.length > 60_000) {
      return error(413, "PDF_LARGO");
    }

    const markdown = await generarResumenMarkdown(texto);
    const guardado = await guardarResumen(
      usuario.clave,
      carpeta,
      archivo.name,
      markdown,
      nombreSolicitado || undefined,
    );

    return NextResponse.json({
      ok: true,
      archivo: guardado.archivo,
      carpeta: guardado.carpeta,
      resumen: guardado.contenido,
      caracteres: texto.length,
    });
  } catch (err) {
    if (err instanceof ResumenError) {
      return error(
        err.status,
        err.codigo || "ERROR_INTERNO",
        err.archivo,
      );
    }

    console.error("[Resumen] Error inesperado:", err);

    return error(500, "ERROR_INTERNO");
  }
}
