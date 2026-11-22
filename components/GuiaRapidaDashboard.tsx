import {
  BarChart3,
  CalendarDays,
  FileText,
  FolderOpen,
  Gamepad2,
  Star,
} from "lucide-react";
import { useTranslations } from "next-intl";

const TARJETAS = [
  { clave: "miEspacio", Icono: FolderOpen },
  { clave: "miAgenda", Icono: CalendarDays },
  { clave: "estadisticas", Icono: BarChart3 },
  { clave: "test", Icono: FileText },
  { clave: "arcade", Icono: Gamepad2 },
  { clave: "kids", Icono: Star },
] as const;

/**
 * Guía rápida del Dashboard: seis tarjetas informativas, sin enlaces ni
 * acciones, para explicar de un vistazo qué hay en cada zona.
 */
export default function GuiaRapidaDashboard() {
  const t = useTranslations("Dashboard.guiaRapida");

  return (
    <section aria-labelledby="guia-rapida-titulo" className="mb-8">
      <div className="mb-4">
        <h2
          id="guia-rapida-titulo"
          className="text-lg font-black tracking-tight text-[var(--txt)]"
        >
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-[var(--txt2)]">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TARJETAS.map(({ clave, Icono }) => (
          <article
            key={clave}
            className="rounded-2xl border border-[var(--th)] bg-[var(--card)] p-5 shadow-[var(--sombra)]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--sel)] text-[var(--azul)]">
              <Icono
                className="h-5 w-5"
                strokeWidth={2}
                aria-hidden="true"
              />
            </span>
            <h3 className="mt-3 text-base font-bold text-[var(--txt)]">
              {t(`${clave}.title`)}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-[var(--txt2)]">
              {t(`${clave}.description`)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
