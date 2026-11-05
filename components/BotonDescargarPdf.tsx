"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";

export default function BotonDescargarPdf({
  archivo,
  contenedorId,
  puedeDescargar,
}: {
  archivo: string;
  contenedorId: string;
  puedeDescargar: boolean;
}) {
  const t = useTranslations("Resumenes");
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState("");

  if (!puedeDescargar) {
    return null;
  }

  async function descargar(): Promise<void> {
    const contenedor = document.getElementById(contenedorId);

    if (!contenedor || descargando) {
      return;
    }

    setDescargando(true);
    setError("");
    let clon: HTMLElement | null = null;

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      // Se captura un clon con un ancho de lectura amplio. Así el texto
      // conserva sus saltos de línea y no se recorta por la derecha.
      clon = contenedor.cloneNode(true) as HTMLElement;
      clon.removeAttribute("id");
      Object.assign(clon.style, {
        position: "fixed",
        left: "0",
        top: "0",
        width: "920px",
        maxWidth: "none",
        margin: "0",
        padding: "32px",
        boxSizing: "border-box",
        overflow: "visible",
        overflowWrap: "break-word",
        wordBreak: "normal",
        whiteSpace: "normal",
        zIndex: "-1",
      });
      document.body.appendChild(clon);

      const canvas = await html2canvas(clon, {
        scale: 2,
        width: 920,
        windowWidth: 1200,
        useCORS: true,
        backgroundColor: null,
        logging: false,
        scrollX: 0,
        scrollY: 0,
      });

      const imagen = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const anchoPagina = pdf.internal.pageSize.getWidth();
      const altoPagina = pdf.internal.pageSize.getHeight();
      const margen = 10;
      const anchoImagen = anchoPagina - margen * 2;
      const altoImagen = (canvas.height * anchoImagen) / canvas.width;
      const altoUtil = altoPagina - margen * 2;
      let altoRestante = altoImagen;
      let posicion = margen;

      pdf.addImage(
        imagen,
        "PNG",
        margen,
        posicion,
        anchoImagen,
        altoImagen,
      );
      altoRestante -= altoUtil;

      while (altoRestante > 0) {
        posicion = margen - (altoImagen - altoRestante);
        pdf.addPage();
        pdf.addImage(
          imagen,
          "PNG",
          margen,
          posicion,
          anchoImagen,
          altoImagen,
        );
        altoRestante -= altoUtil;
      }

      const nombrePdf = archivo.replace(/\.md$/i, ".pdf");
      pdf.save(nombrePdf || "resumen.pdf");
    } catch {
      setError(t("viewer.downloadError"));
    } finally {
      clon?.remove();
      setDescargando(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => void descargar()}
        disabled={descargando}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--azul)] px-4 py-2 text-sm font-bold text-[var(--btn-txt)] transition-colors hover:bg-[var(--azul-hover)] disabled:cursor-wait disabled:opacity-60"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        {descargando
          ? t("viewer.downloading")
          : t("viewer.download")}
      </button>
      {error ? (
        <span className="text-xs font-semibold text-[var(--err-t)]">
          {error}
        </span>
      ) : null}
    </div>
  );
}
