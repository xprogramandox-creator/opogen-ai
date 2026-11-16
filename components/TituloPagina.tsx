import type { ReactNode } from "react";

/**
 * Clases compartidas por los títulos de página (Arcade, Test y Kids).
 * Salen del título original de Arcade: mismo tamaño, peso, interletraje y color.
 */
export const CLASE_TITULO_PAGINA =
  "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[clamp(40px,12vw,66px)] font-semibold leading-none tracking-[-1px] text-[var(--txt)]";

export const CLASE_MARCA_GRADIENTE =
  "bg-gradient-to-r from-[var(--azul)] via-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent dark:via-[#a78bfa] dark:to-[#22d3ee]";

export const CLASE_SUBTITULO_PAGINA =
  "mx-auto mt-3 max-w-xl text-pretty text-sm text-[#7b7266] dark:text-[#8a847a]";

/**
 * Cabecera común de las páginas de la zona de estudio.
 * El bloque aporta el mismo hueco superior en todas: 32px y 40px desde `sm`.
 */
export default function TituloPagina({
  marca,
  sufijo,
  etiqueta,
  subtitulo,
}: {
  marca: string;
  sufijo: ReactNode;
  etiqueta?: string;
  subtitulo?: string;
}) {
  return (
    <header className="pt-8 text-center sm:pt-10">
      <h1 aria-label={etiqueta} className={CLASE_TITULO_PAGINA}>
        <span className={CLASE_MARCA_GRADIENTE}>{marca}</span>
        <span className="text-[var(--txt)]">{sufijo}</span>
      </h1>
      {subtitulo ? <p className={CLASE_SUBTITULO_PAGINA}>{subtitulo}</p> : null}
    </header>
  );
}
