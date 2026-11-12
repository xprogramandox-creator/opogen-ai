import { Suspense } from "react";
import Link from "next/link";
import AuthControls from "@/components/AuthControls";
import LogoOpoGen from "@/components/LogoOpoGen";
import SelectorIdioma from "@/components/SelectorIdioma";
import ThemeToggle from "@/components/ThemeToggle";

type SiteHeaderProps = {
  backHref?: string;
  showBrand?: boolean;
  title?: string;
};

export default function SiteHeader({
  backHref,
  showBrand = false,
  title,
}: SiteHeaderProps) {
  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-[var(--th)]"
      style={{ backgroundColor: "var(--fondo)" }}
    >
      <div className="mx-auto flex min-h-[72px] w-full max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          {backHref ? (
            <Link
              href={backHref}
              prefetch={false}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-[var(--th)] bg-[var(--card)] px-3 py-2 text-sm font-bold text-[var(--txt)] shadow-sm transition-colors hover:bg-[var(--suave2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2"
              aria-label="Volver"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>

              <span className="hidden sm:inline">Volver</span>
            </Link>
          ) : null}

          {showBrand ? (
            <Link
              href="/"
              className="flex min-w-0 items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2 sm:gap-3"
              aria-label="OpoGen AI, página de inicio"
            >
              <LogoOpoGen />

              <span className="whitespace-nowrap text-base font-semibold text-[var(--txt)] sm:text-2xl">
                <span className="bg-gradient-to-r from-[var(--azul)] via-[#7c3aed] to-[#06b6d4] dark:via-[#a78bfa] dark:to-[#22d3ee] bg-clip-text text-transparent">
                  OpoGen
                </span>{" "}
                <span className="text-[var(--azul)]">AI</span>
              </span>
            </Link>
          ) : null}

          {title ? (
            <span className="truncate border-l border-[var(--th)] pl-3 text-lg font-semibold text-[var(--txt)] sm:text-xl">
              {title}
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2">
          <Suspense
            fallback={
              <span
                aria-hidden="true"
                className="h-9 w-[86px] shrink-0 animate-pulse rounded-full border border-[var(--th)] bg-[var(--suave2)] sm:h-10 sm:w-[104px]"
              />
            }
          >
            <AuthControls />
          </Suspense>
          <div className="hidden sm:block">
            <SelectorIdioma />
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
