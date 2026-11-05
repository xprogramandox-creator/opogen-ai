"use client";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

type ThemeToggleProps = {
  className?: string;
};

// No hay nada a lo que suscribirse: solo interesa saber si ya estamos en el
// cliente. Así se evita el setState dentro de un efecto.
const sinSuscripcion = () => () => {};

export default function ThemeToggle({
  className = "",
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <div
        className={`h-10 w-10 shrink-0 rounded-full border border-[var(--th)] bg-[var(--card)] ${className}`}
        aria-hidden="true"
      />
    );
  }

  const estaOscuro = theme === "oscuro";
  const etiqueta = estaOscuro
    ? "Cambiar a modo claro"
    : "Cambiar a modo oscuro";

  function cambiarTema(): void {
    const nuevo = estaOscuro ? "claro" : "oscuro";

    document.cookie = `opoquiz-tema=${nuevo}; path=/; max-age=31536000; samesite=lax${
      window.location.protocol === "https:" ? "; secure" : ""
    }`;

    setTheme(nuevo);
  }

  return (
    <button
      type="button"
      onClick={cambiarTema}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--th)] bg-[var(--card)] text-[var(--txt2)] shadow-sm transition-colors hover:text-[var(--azul)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2 ${className}`}
      title={etiqueta}
      aria-label={etiqueta}
      aria-pressed={estaOscuro}
    >
      {estaOscuro ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
}