import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { getTranslations } from "next-intl/server";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import {
  esNombreCarpetaSeguro,
  estaDentroDe,
  rutaEspacioUsuario,
} from "@/lib/rutas-espacio";
import { SUB_CARPETA_RESUMENES } from "@/lib/estructura-carpetas";
import VisorMarkdown from "@/components/VisorMarkdown";
import BotonDescargarPdf from "@/components/BotonDescargarPdf";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Resumenes");

  return {
    title: t("viewer.title"),
    robots: { index: false, follow: false },
  };
}

export const instant = false;

const MAX_MARKDOWN = 2_000_000;
const NOMBRE_MD =
  /^[\p{L}\p{N}][\p{L}\p{N} ._()\-]{0,150}\.md$/iu;

type Props = {
  searchParams: Promise<{
    carpeta?: string;
    archivo?: string;
  }>;
};

export default async function VerResumenPage({
  searchParams,
}: Props) {
  const usuario = await obtenerUsuarioSesion();
  const t = await getTranslations("Resumenes");

  if (!usuario) {
    redirect("/?login=1");
  }

  if (usuario.rol !== "premium") {
    redirect("/dashboard?aviso=premium");
  }

  const params = await searchParams;
  const carpeta = params.carpeta?.trim() || "";
  const archivo = params.archivo?.trim() || "";

  if (
    !esNombreCarpetaSeguro(carpeta) ||
    !NOMBRE_MD.test(archivo) ||
    archivo.includes("..") ||
    archivo.includes("/") ||
    archivo.includes("\\")
  ) {
    notFound();
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
    !estaDentroDe(rutaResumenes, rutaArchivo)
  ) {
    notFound();
  }

  let contenido: string;

  try {
    const info = await stat(rutaArchivo);

    if (!info.isFile() || info.size > MAX_MARKDOWN) {
      notFound();
    }

    contenido = await readFile(rutaArchivo, "utf8");
  } catch {
    notFound();
  }

  return (
    <main className="min-h-app bg-transparent px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/mi-espacio"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--th)] bg-[var(--card)] px-4 py-2 text-sm font-bold text-[var(--txt)] transition-colors hover:border-[var(--azul)] hover:text-[var(--azul)]"
          >
            {t("viewer.back")}
          </Link>

          <BotonDescargarPdf
            archivo={archivo}
            contenedorId="contenido-resumen-pdf"
            puedeDescargar={usuario.rol === "premium"}
          />
        </div>

        <article
          id="contenido-resumen-pdf"
          className="rounded-3xl border border-[var(--th)] bg-[var(--card)] px-5 py-7 shadow-[var(--sombra)] [overflow-wrap:break-word] sm:px-10 sm:py-10"
        >
          <VisorMarkdown contenido={contenido} />
        </article>
      </div>
    </main>
  );
}
