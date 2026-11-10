import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default function PantallaBloqueo({
  icono,
  titulo,
  subtitulo,
  ventajas,
  textoBoton,
  enlaceBoton,
}: {
  icono: ReactNode;
  titulo: string;
  subtitulo: string;
  ventajas: string[];
  textoBoton: string;
  enlaceBoton: string;
}) {
  return (
    <main
      id="contenido"
      className="relative min-h-app overflow-hidden bg-transparent font-sans"
    >
      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
        <div className="rounded-3xl border border-[var(--th)] bg-[var(--card)] p-7 text-center shadow-[var(--sombra-fuerte)] sm:p-10">
          <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--sel)] text-[var(--azul)]">
            {icono}
          </span>

          <h1 className="text-balance text-3xl font-bold tracking-tight text-[var(--txt)] sm:text-4xl">
            {titulo}
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-pretty leading-relaxed text-[var(--txt2)]">
            {subtitulo}
          </p>

          <ul className="mx-auto mt-7 max-w-xl space-y-3 text-left">
            {ventajas.map((ventaja) => (
              <li
                key={ventaja}
                className="flex items-start gap-3 text-sm leading-relaxed text-[var(--txt2)]"
              >
                <Check
                  className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ok-t)]"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
                <span>{ventaja}</span>
              </li>
            ))}
          </ul>

          <Link
            href={enlaceBoton}
            className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-[var(--azul)] px-6 text-sm font-bold text-white shadow-md transition-colors hover:bg-[var(--azul-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2"
          >
            {textoBoton}
          </Link>
        </div>
      </section>
    </main>
  );
}
