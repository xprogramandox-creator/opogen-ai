import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Check, Sparkles } from "lucide-react";
import { obtenerUsuarioSesion } from "@/lib/auth-server";

export const instant = false;

export default async function KidsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const usuario = await obtenerUsuarioSesion();

  if (usuario?.rol === "premium") {
    return <>{children}</>;
  }

  const t = await getTranslations("KidsLock");

  return (
    <main
      id="contenido"
      className="relative min-h-app overflow-hidden bg-transparent font-sans"
    >
      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
        <div className="rounded-3xl border border-[var(--th)] bg-[var(--card)] p-7 text-center shadow-[var(--sombra-fuerte)] sm:p-10">
          <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--sel)] text-[var(--azul)]">
            <Sparkles className="h-7 w-7" strokeWidth={2} aria-hidden="true" />
          </span>

          <h1 className="text-balance text-3xl font-bold tracking-tight text-[var(--txt)] sm:text-4xl">
            {t("title")}
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-pretty leading-relaxed text-[var(--txt2)]">
            {t("subtitle")}
          </p>

          <ul className="mx-auto mt-7 max-w-xl space-y-3 text-left">
            {[1, 2, 3, 4, 5].map((indice) => (
              <li
                key={indice}
                className="flex items-start gap-3 text-sm leading-relaxed text-[var(--txt2)]"
              >
                <Check
                  className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ok-t)]"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
                <span>{t(`benefits.${indice}`)}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/premium"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-[var(--azul)] px-6 text-sm font-bold text-white shadow-md transition-colors hover:bg-[var(--azul-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2"
          >
            {t("cta")}
          </Link>
        </div>
      </section>
    </main>
  );
}
