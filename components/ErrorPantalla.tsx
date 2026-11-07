"use client";

export default function ErrorPantalla({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-transparent px-4 py-12 font-sans">
      <section className="w-full max-w-lg rounded-3xl border border-[var(--th)] bg-[var(--card)] p-7 text-center shadow-[var(--sombra)] sm:p-9">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--sel)] text-2xl text-[var(--azul)]">
          !
        </div>

        <h1 className="mt-4 text-2xl font-bold text-[var(--txt)]">
          Algo no ha cargado correctamente
        </h1>

        <p className="mt-3 text-sm leading-7 text-[var(--txt2)]">
          Ha ocurrido un error al mostrar esta página. Puedes intentarlo
          de nuevo sin perder el resto de la web.
        </p>

        {error.digest ? (
          <p className="mt-3 break-all text-xs text-[var(--txt3)]">
            Código: {error.digest}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex rounded-xl bg-[var(--azul)] px-5 py-3 text-sm font-bold text-[var(--btn-txt)] transition-colors hover:bg-[var(--azul-hover)]"
        >
          Recargar página
        </button>
      </section>
    </main>
  );
}
