import { useTranslations } from "next-intl";

type Props = {
  className?: string;
};

/**
 * Tarjeta informativa de la Zona Kids. Comparte el formato de las tarjetas de
 * la Guía rápida (icono a la izquierda, texto a la derecha) y no es clicable.
 */
export default function TarjetaZonaKids({ className }: Props) {
  const t = useTranslations("KidsCard");

  return (
    <section
      aria-labelledby="titulo-zona-kids"
      className={`mx-auto w-full max-w-5xl ${className ?? ""}`}
    >
      <article className="flex items-center gap-4 rounded-2xl border border-[var(--th)] bg-blue-50 p-4 shadow-[var(--sombra)] dark:bg-blue-950/40 sm:p-5">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-3xl shadow-sm dark:bg-slate-900/60"
          aria-hidden="true"
        >
          🧒
        </span>

        <div className="min-w-0">
          <span className="inline-flex rounded-full border border-[var(--azul)]/35 bg-[var(--sel)] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--azul)]">
            {t("badge")}
          </span>

          <h2
            id="titulo-zona-kids"
            className="mt-1 text-base font-bold tracking-tight text-[var(--txt)]"
          >
            {t("title")}
          </h2>

          <p className="mt-0.5 text-sm leading-relaxed text-[var(--txt2)]">
            {t("description")}
          </p>
        </div>
      </article>
    </section>
  );
}
