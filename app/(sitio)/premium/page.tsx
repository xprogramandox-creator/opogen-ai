import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Crown } from "lucide-react";
import TarjetaOferta from "@/components/TarjetaOferta";

export const metadata: Metadata = {
  title: "Hazte Premium",
  description:
    "Descubre las ventajas del plan Premium de OpoGen AI: tests ilimitados, Mi Espacio, PDF y estadísticas.",
};

export const instant = false;

const ventajas = [
  "Tests ilimitados, sin límite de 3 al día.",
  "Guarda tus exámenes en Mi Espacio.",
  "Descarga tus tests en PDF.",
  "Estadísticas y evolución de tu estudio.",
  "Repaso de fallos y simulacros mixtos.",
];

export default function PremiumPage() {
  return (
    <main id="contenido" className="min-h-app bg-transparent font-sans">
      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
        <div className="card rounded-3xl p-7 text-center sm:p-10">
          <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--sel)] text-[var(--azul)]">
            <Crown className="h-7 w-7" strokeWidth={2} aria-hidden="true" />
          </span>

          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--azul)]">
            Plan Premium
          </p>

          <h1 className="text-balance text-3xl font-bold tracking-tight text-[var(--txt)] sm:text-4xl">
            Hazte Premium y estudia sin límites
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-pretty leading-relaxed text-[var(--txt2)]">
            Desbloquea Mi Espacio, las estadísticas, la descarga en PDF y todos
            los tests que necesites.
          </p>

          <ul className="mx-auto mt-7 max-w-md space-y-3 text-left">
            {ventajas.map((ventaja) => (
              <li
                key={ventaja}
                className="flex items-start gap-3 text-sm text-[var(--txt2)]"
              >
                <Check
                  className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ok-t)]"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
                {ventaja}
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/dashboard" className="btn-action btn-examen">
              Volver al panel
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>

            <Link
              href="/cuenta"
              className="text-sm font-semibold text-[var(--txt2)] underline underline-offset-4 hover:text-[var(--azul)]"
            >
              Ver mi cuenta
            </Link>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto max-w-5xl px-5 pb-16 sm:px-6">
        <TarjetaOferta />
      </div>
    </main>
  );
}
