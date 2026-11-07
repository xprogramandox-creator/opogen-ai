export default function CargandoPagina() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-6"
    >
      <span className="sr-only">Cargando página…</span>

      <div className="animate-pulse space-y-5">
        <div className="h-5 w-36 rounded-full bg-[var(--suave2)]" />
        <div className="h-11 w-3/4 rounded-2xl bg-[var(--suave2)]" />
        <div className="h-5 w-full max-w-2xl rounded-full bg-[var(--suave2)]" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="h-28 rounded-2xl border border-[var(--th)] bg-[var(--card)]" />
          <div className="h-28 rounded-2xl border border-[var(--th)] bg-[var(--card)]" />
        </div>
      </div>
    </div>
  );
}
