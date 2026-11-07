import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function SiteFooter() {
  const t = await getTranslations("Footer");

  const enlacesLegales = [
    { etiqueta: t("legalNotice"), href: "/legal/aviso-legal" },
    { etiqueta: t("privacy"), href: "/legal/privacidad" },
    { etiqueta: t("contact"), href: "/contacto" },
  ];

  return (
    <footer className="relative z-10 border-t border-[var(--th)] bg-[var(--card)] text-[var(--txt3)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-6 sm:py-10 md:flex-row md:items-start md:justify-between md:gap-12">
        <div className="max-w-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2"
            aria-label={t("home")}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--azul)] text-white shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </span>

            <span className="text-lg font-semibold text-[var(--txt)]">
              <span className="bg-gradient-to-r from-[var(--azul)] via-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent dark:via-[#a78bfa] dark:to-[#22d3ee]">
                OpoGen
              </span>{" "}
              <span className="text-[var(--azul)]">AI</span>
            </span>
          </Link>

          <p className="mt-3 text-sm leading-relaxed">
            {t("tagline")}
          </p>
        </div>

        <nav aria-label={t("legalInfo")} className="md:pt-1">
          <h2 className="mb-3 text-xs font-semibold text-[var(--txt)]">
            {t("legalInfo")}
          </h2>

          <ul className="flex flex-col gap-2.5 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6">
            {enlacesLegales.map((enlace) => (
              <li key={enlace.href}>
                <Link
                  href={enlace.href}
                  className="rounded-md transition-colors hover:text-[var(--azul)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2"
                >
                  {enlace.etiqueta}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-[var(--th)]">
        <div className="mx-auto w-full max-w-7xl px-5 py-5 text-center text-xs sm:px-6">
          <p>
            © 2026{" "}
            <span className="bg-gradient-to-r from-[var(--azul)] via-[#7c3aed] to-[#06b6d4] bg-clip-text font-semibold text-transparent dark:via-[#a78bfa] dark:to-[#22d3ee]">
              OpoGen
            </span>{" "}
            AI. {t("rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
