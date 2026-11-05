export default function CargandoResumen() {
  return (
    <main className="min-h-app bg-transparent px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl animate-pulse">
        <div className="mb-6 h-9 w-44 rounded-lg bg-[var(--suave2)]" />
        <div className="rounded-3xl border border-[var(--th)] bg-[var(--card)] px-5 py-7 shadow-[var(--sombra)] sm:px-10 sm:py-10">
          <div className="mb-5 h-8 w-2/3 rounded bg-[var(--suave2)]" />
          <div className="mb-8 h-px w-full bg-[var(--th)]" />
          <div className="space-y-3">
            <div className="h-4 w-full rounded bg-[var(--suave2)]" />
            <div className="h-4 w-11/12 rounded bg-[var(--suave2)]" />
            <div className="h-4 w-4/5 rounded bg-[var(--suave2)]" />
            <div className="h-4 w-10/12 rounded bg-[var(--suave2)]" />
          </div>
          <div className="mt-8 h-6 w-1/2 rounded bg-[var(--suave2)]" />
          <div className="mt-4 space-y-3">
            <div className="h-4 w-11/12 rounded bg-[var(--suave2)]" />
            <div className="h-4 w-10/12 rounded bg-[var(--suave2)]" />
            <div className="h-4 w-9/12 rounded bg-[var(--suave2)]" />
          </div>
        </div>
      </div>
    </main>
  );
}
