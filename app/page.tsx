import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

/**
 * El año se calcula durante la generación estática.
 * "use cache" evita el error de Next.js 16 con valores unstable
 * como new Date() durante el prerenderizado.
 */
async function obtenerAnioCopyright() {
  "use cache";

  return new Date().getUTCFullYear();
}

export const metadata: Metadata = {
  title: "OpoQuiz AI | Convierte tus apuntes en exámenes",
  description:
    "Sube tus apuntes y genera exámenes tipo test personalizados con inteligencia artificial. Ideal para oposiciones, bachillerato, universidad y secundaria.",
};

const pasos = [
  {
    numero: "01",
    titulo: "Sube tus apuntes",
    descripcion:
      "Sube PDFs, documentos de Word, textos o fotos. Puedes usar temas sueltos o el temario completo.",
  },
  {
    numero: "02",
    titulo: "La IA trabaja",
    descripcion:
      "La inteligencia artificial lee tus documentos, identifica los conceptos importantes y prepara las preguntas.",
  },
  {
    numero: "03",
    titulo: "Practica y aprueba",
    descripcion:
      "Resuelve tu test, recibe la corrección al instante y descarga el examen en PDF.",
  },
];

function LogoMark() {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
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
  );
}

function ArrowIcon() {
  return (
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
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export default async function LandingPage() {
  const anioCopyright = await obtenerAnioCopyright();

  return (
    <>
      <a href="#contenido" className="skip-link">
        Saltar al contenido principal
      </a>

      <main
        id="contenido"
        className="bg-app relative min-h-screen overflow-x-hidden font-sans"
      >
        {/* Fondo decorativo */}
        <div
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
          aria-hidden="true"
        >
          <div className="blob-fondo blob-1" />
          <div className="blob-fondo blob-2" />
          <div className="blob-fondo blob-3" />
        </div>

        {/* Navegación */}
        <nav
          aria-label="Navegación principal"
          className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-6 sm:py-6"
        >
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-4"
            aria-label="OpoQuiz AI, página de inicio"
          >
            <LogoMark />

            <span className="text-xl font-extrabold tracking-tight text-[var(--txt)]">
              OpoQuiz{" "}
              <span className="text-[var(--azul)]">AI</span>
            </span>
          </Link>

          <ThemeToggle />
        </nav>

        {/* Hero principal */}
        <section
          aria-labelledby="titulo-principal"
          className="relative z-10 mx-auto max-w-5xl px-5 pb-16 pt-24 text-center sm:px-6 sm:pt-28 lg:pb-24 lg:pt-36"
        >
          <div
            className="animate-fade-in-up mb-7 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-100/60 px-3 py-1.5 text-sm font-semibold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300"
            style={{ animationDelay: "50ms" }}
          >
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
            </span>

            Impulsado por Inteligencia Artificial
          </div>

          <h1
            id="titulo-principal"
            className="animate-fade-in-up mb-7 text-4xl font-black leading-[1.08] tracking-tight text-[var(--txt)] sm:text-5xl md:text-7xl"
            style={{ animationDelay: "100ms" }}
          >
            Convierte tus apuntes en{" "}
            <span className="hero-gradient">exámenes perfectos</span>
          </h1>

          <p
            className="animate-fade-in-up mx-auto mb-10 max-w-3xl text-base leading-relaxed text-[var(--txt2)] sm:text-lg lg:text-xl"
            style={{ animationDelay: "150ms" }}
          >
            La herramienta definitiva para estudiantes de primaria, secundaria,
            bachillerato, universidad y opositores. Sube tus archivos y deja que
            la IA genere tests personalizados en segundos, adaptándose a
            cualquier temario.
          </p>

          <div
            className="animate-fade-in-up flex flex-col items-center justify-center gap-4 sm:flex-row"
            style={{ animationDelay: "200ms" }}
          >
            <Link href="/crear" className="btn-action btn-examen">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <line x1="10" y1="9" x2="8" y2="9" />
              </svg>

              Crear test

              <ArrowIcon />
            </Link>

            <Link href="/arcade" className="btn-action btn-arcade">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M6 12h4m-2-2v4" />
                <circle cx="16" cy="10" r="1" />
                <circle cx="18" cy="14" r="1" />
                <path d="M18 6H6a4 4 0 0 0-4 4v4a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4v-4a4 4 0 0 0-4-4Z" />
              </svg>

              Modo Arcade

              <ArrowIcon />
            </Link>
          </div>

          <p
            className="animate-fade-in-up mt-6 text-sm text-[var(--txt3)]"
            style={{ animationDelay: "250ms" }}
          >
            Sin necesitas tarjeta · Genera tu primer test en minutos
          </p>
        </section>

        {/* Cómo funciona */}
        <section
          id="como-funciona"
          aria-labelledby="titulo-como-funciona"
          className="relative z-10 mx-auto max-w-7xl px-5 pb-24 pt-12 sm:px-6 lg:pb-32"
        >
          <div className="mb-12 text-center sm:mb-16">
            <h2
              id="titulo-como-funciona"
              className="mb-4 text-3xl font-bold tracking-tight text-[var(--txt)] sm:text-4xl"
            >
              Tan fácil como 1, 2, 3
            </h2>

            <p className="text-base text-[var(--txt2)] sm:text-lg">
              Olvídate de copiar y pegar. Deja que la IA haga el trabajo pesado.
            </p>
          </div>

          <div className="grid gap-7 md:grid-cols-3 md:gap-8">
            {pasos.map((paso) => (
              <article
                key={paso.numero}
                className="card-glass group relative p-7 pt-12 transition-transform duration-300 hover:-translate-y-2 motion-reduce:transform-none motion-reduce:transition-none sm:p-8 sm:pt-12"
              >
                <div
                  className="absolute -left-4 -top-4 flex h-14 w-14 rotate-6 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-sm font-black text-white shadow-lg transition-transform group-hover:rotate-12 motion-reduce:transition-none"
                  aria-hidden="true"
                >
                  {paso.numero}
                </div>

                <h3 className="mb-3 text-xl font-bold text-[var(--txt)]">
                  {paso.titulo}
                </h3>

                <p className="leading-relaxed text-[var(--txt2)]">
                  {paso.descripcion}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Pie de página */}
        <footer className="relative z-10 mt-10 border-t border-[var(--th)] py-8 text-center text-sm text-[var(--txt2)]">
          <p>
            © {anioCopyright} OpoQuiz AI. Creado para ayudarte a aprobar.
          </p>
        </footer>
      </main>
    </>
  );
}
