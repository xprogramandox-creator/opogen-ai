"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

const TABLAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const FACTORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export default function KidsTablasPage() {
  const t = useTranslations("KidsTables");
  const [tabla, setTabla] = useState<number>(1);
  const [respuestas, setRespuestas] = useState<Record<number, string>>({});
  const [corregido, setCorregido] = useState(false);

  const aciertos = FACTORES.reduce((total, factor) => {
    if (!corregido) return total;

    const valor = Number(respuestas[factor]);
    return total + (valor === tabla * factor ? 1 : 0);
  }, 0);

  function cambiarRespuesta(factor: number, valor: string): void {
    setRespuestas((anteriores) => ({
      ...anteriores,
      [factor]: valor,
    }));

    if (corregido) setCorregido(false);
  }

  function reiniciar(): void {
    setRespuestas({});
    setCorregido(false);
  }

  return (
    <main id="contenido" className="min-h-app bg-transparent">
      <section className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href="/kids/temas"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--th)] bg-[var(--card)] px-4 py-2 text-sm font-bold text-[var(--txt2)] shadow-sm transition-colors hover:bg-[var(--suave2)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("back")}
          </Link>

          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--sel)] text-2xl">
            ✖️
          </span>
        </div>

        <div className="text-center">
          <h1 className="text-balance text-4xl font-bold tracking-tight text-[var(--txt)] sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-[var(--txt2)]">
            {t("subtitle")}
          </p>
        </div>

        <section
          aria-labelledby="tablas-elegir"
          className="mt-8 rounded-3xl border border-[var(--th)] bg-[var(--card)] p-5 shadow-[var(--sombra)] sm:p-7"
        >
          <h2
            id="tablas-elegir"
            className="text-center text-sm font-bold uppercase tracking-widest text-[var(--txt3)]"
          >
            {t("chooseTable")}
          </h2>

          <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-10">
            {TABLAS.map((numero) => {
              const activa = numero === tabla;

              return (
                <button
                  key={numero}
                  type="button"
                  onClick={() => {
                    setTabla(numero);
                    reiniciar();
                  }}
                  aria-pressed={activa}
                  className={`flex h-12 items-center justify-center rounded-xl border-2 text-lg font-bold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--azul)]/30 ${
                    activa
                      ? "border-[var(--azul)] bg-[var(--azul)] text-white shadow-md"
                      : "border-[var(--th)] bg-[var(--card2)] text-[var(--txt)] hover:border-[var(--azul)]/50 hover:bg-[var(--sel)]"
                  }`}
                >
                  {numero}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-[var(--th)] bg-[var(--card)] p-5 shadow-[var(--sombra)] sm:p-7">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FACTORES.map((factor) => {
              const correcta = Number(respuestas[factor]) === tabla * factor;

              return (
                <div
                  key={factor}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--th)] bg-[var(--card2)] px-4 py-3"
                >
                  <span className="min-w-[88px] text-lg font-bold text-[var(--txt)] sm:text-xl">
                    {tabla} × {factor} =
                  </span>

                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={respuestas[factor] ?? ""}
                    onChange={(evento) =>
                      cambiarRespuesta(factor, evento.target.value)
                    }
                    aria-label={`${tabla} × ${factor}`}
                    className={`h-11 min-w-0 flex-1 rounded-xl border-2 bg-[var(--card)] px-3 text-lg font-bold text-[var(--txt)] outline-none transition-colors focus:ring-2 focus:ring-[var(--azul)]/30 ${
                      corregido
                        ? correcta
                          ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                          : "border-red-500 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-100"
                        : "border-[var(--th)]"
                    }`}
                  />

                  {corregido && !correcta ? (
                    <span className="w-full text-xs font-bold text-red-600 sm:w-auto dark:text-red-400">
                      {t("correctAnswer", { answer: tabla * factor })}
                    </span>
                  ) : null}

                  {corregido && correcta ? (
                    <Check
                      className="h-5 w-5 shrink-0 text-emerald-600"
                      strokeWidth={3}
                      aria-hidden="true"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>

          {corregido ? (
            <p
              role="status"
              className="mt-5 rounded-2xl border border-[var(--ok-b)] bg-[var(--ok)] px-4 py-3 text-center text-sm font-bold text-[var(--ok-t)]"
            >
              {t("result", { correct: aciertos, total: FACTORES.length })}
            </p>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setCorregido(true)}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--azul)] px-5 text-sm font-bold text-white shadow-md transition-colors hover:bg-[var(--azul-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)]"
            >
              <Check className="h-5 w-5" aria-hidden="true" />
              {t("check")}
            </button>

            <button
              type="button"
              onClick={reiniciar}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--th)] bg-[var(--card2)] px-5 text-sm font-bold text-[var(--txt)] transition-colors hover:bg-[var(--suave2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)]"
            >
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
              {t("reset")}
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}
