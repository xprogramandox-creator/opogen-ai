"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import ThemeToggle from "@/components/ThemeToggle";
import {
  obtenerTema,
  obtenerTemaServidor,
  suscribirTema,
  type Tema,
} from "@/lib/theme";

type MensajeTema = {
  type: "cambiar-tema";
  tema: Tema;
};

function enviarTemaAlFrame(
  frame: HTMLIFrameElement | null,
  tema: Tema,
): void {
  if (!frame?.contentWindow) {
    return;
  }

  const mensaje: MensajeTema = {
    type: "cambiar-tema",
    tema,
  };

  frame.contentWindow.postMessage(
    mensaje,
    window.location.origin,
  );
}

export default function ArcadePage() {
  const tema = useSyncExternalStore(
    suscribirTema,
    obtenerTema,
    obtenerTemaServidor,
  );

  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    enviarTemaAlFrame(frameRef.current, tema);
  }, [tema]);

  function handleFrameLoad(): void {
    enviarTemaAlFrame(frameRef.current, tema);
  }

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-[var(--fondo)] text-[var(--txt)]">
      {/* Controles superpuestos */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex items-start justify-between p-4 sm:p-6">
        <div className="pointer-events-auto">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg border border-[var(--th)] bg-[var(--card)] px-4 py-2 text-sm font-bold text-[var(--txt)] shadow-sm backdrop-blur-md transition-colors hover:bg-[var(--suave2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2"
            aria-label="Volver a la página principal"
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

            Volver
          </Link>
        </div>

        <div className="pointer-events-auto">
          <ThemeToggle />
        </div>
      </div>

      {/* Juego Arcade */}
      <iframe
        ref={frameRef}
        src="/arcade.html"
        onLoad={handleFrameLoad}
        className="h-full w-full border-0"
        title="Juego del modo Arcade de OpoQuiz"
        allow="autoplay"
      />
    </main>
  );
}
