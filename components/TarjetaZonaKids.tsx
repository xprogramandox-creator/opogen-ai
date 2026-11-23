import { useTranslations } from "next-intl";

/**
 * Tarjeta informativa de la Zona Kids, reutilizada en Landing y Dashboard.
 * No tiene enlaces ni botones: solo presenta la zona.
 */
export default function TarjetaZonaKids() {
  const t = useTranslations("KidsCard");

  return (
    <section
      aria-labelledby="titulo-zona-kids"
      className="mx-auto w-full max-w-5xl"
    >
      <div className="flex items-center gap-4 rounded-3xl border-2 border-[var(--azul)]/25 bg-blue-50 p-5 shadow-[var(--sombra)] dark:bg-blue-950/40 sm:gap-5 sm:p-6">
        <span
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-4xl shadow-sm dark:bg-slate-900/60"
          aria-hidden="true"
        >
          🧒
        </span>

        <div className="min-w-0">
          <span className="inline-flex rounded-full border border-[var(--azul)]/35 bg-[var(--sel)] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--azul)]">
            {t("badge")}
          </span>

          <h2
            id="titulo-zona-kids"
            className="mt-1.5 text-xl font-bold tracking-tight text-[var(--txt)] sm:text-2xl"
          >
            {t("title")}
          </h2>

          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--txt2)]">
            {t("description")}
          </p>
        </div>
      </div>
    </section>
  );
}
