import {
  BarChart3,
  CalendarDays,
  FileText,
  FolderOpen,
  Gamepad2,
} from "lucide-react";
import { useTranslations } from "next-intl";

const TARJETAS = [
  {
    clave: "miEspacio",
    Icono: FolderOpen,
    fondo: "bg-blue-50 dark:bg-blue-950/40",
    iconoFondo:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  },
  {
    clave: "miAgenda",
    Icono: CalendarDays,
    fondo: "bg-indigo-50 dark:bg-indigo-950/40",
    iconoFondo:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300",
  },
  {
    clave: "estadisticas",
    Icono: BarChart3,
    fondo: "bg-teal-50 dark:bg-teal-950/40",
    iconoFondo:
      "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
  },
  {
    clave: "test",
    Icono: FileText,
    fondo: "bg-sky-50 dark:bg-sky-950/40",
    iconoFondo: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
  },
  {
    clave: "arcade",
    Icono: Gamepad2,
    fondo: "bg-purple-50 dark:bg-purple-950/40",
    iconoFondo:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  },
] as const;

type Props = {
  /** Permite ajustar el espaciado exterior (por defecto, el del Dashboard). */
  className?: string;
};

/**
 * Guía rápida reutilizable (Dashboard y Landing): lista vertical de tarjetas
 * alargadas, con fondo pastel e icono grande. Son informativas: no tienen
 * enlaces ni acciones.
 */
export default function GuiaRapidaDashboard({ className }: Props) {
  const t = useTranslations("Dashboard.guiaRapida");

  return (
    <section
      id="guia-rapida"
      aria-labelledby="guia-rapida-titulo"
      className={`mx-auto w-full max-w-5xl scroll-mt-24 ${className ?? "mb-8"}`}
    >
      <div className="mb-4">
        <h2
          id="guia-rapida-titulo"
          className="text-lg font-black tracking-tight text-[var(--txt)]"
        >
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-[var(--txt2)]">{t("subtitle")}</p>
      </div>

      <ul role="list" className="flex flex-col gap-3">
        {TARJETAS.map(({ clave, Icono, fondo, iconoFondo }) => (
          <li key={clave}>
          <article
            className={`flex items-center gap-4 rounded-2xl border border-[var(--th)] p-4 shadow-[var(--sombra)] sm:p-5 ${fondo}`}
          >
            <span
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${iconoFondo}`}
            >
              <Icono
                className="h-7 w-7"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[var(--txt)]">
                {t(`${clave}.title`)}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--txt2)]">
                {t(`${clave}.description`)}
              </p>
            </div>
          </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
