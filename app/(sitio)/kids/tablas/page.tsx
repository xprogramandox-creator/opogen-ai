"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

const TABLAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const FACTORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const COLORES_TABLA = [
  {
    boton: "border-rose-500 bg-rose-400 text-white",
    anillo: "ring-rose-300",
    suave: "border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/30",
    acento: "bg-rose-500 hover:bg-rose-600 focus-visible:ring-rose-300",
    input: "border-rose-300 focus:border-rose-500 focus:ring-rose-200",
  },
  {
    boton: "border-orange-500 bg-orange-400 text-white",
    anillo: "ring-orange-300",
    suave: "border-orange-200 bg-orange-50 dark:border-orange-900/60 dark:bg-orange-950/30",
    acento: "bg-orange-500 hover:bg-orange-600 focus-visible:ring-orange-300",
    input: "border-orange-300 focus:border-orange-500 focus:ring-orange-200",
  },
  {
    boton: "border-amber-500 bg-amber-300 text-amber-950",
    anillo: "ring-amber-300",
    suave: "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30",
    acento: "bg-amber-400 hover:bg-amber-500 focus-visible:ring-amber-300",
    input: "border-amber-300 focus:border-amber-500 focus:ring-amber-200",
  },
  {
    boton: "border-emerald-500 bg-emerald-400 text-white",
    anillo: "ring-emerald-300",
    suave: "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30",
    acento: "bg-emerald-500 hover:bg-emerald-600 focus-visible:ring-emerald-300",
    input: "border-emerald-300 focus:border-emerald-500 focus:ring-emerald-200",
  },
  {
    boton: "border-sky-500 bg-sky-400 text-white",
    anillo: "ring-sky-300",
    suave: "border-sky-200 bg-sky-50 dark:border-sky-900/60 dark:bg-sky-950/30",
    acento: "bg-sky-500 hover:bg-sky-600 focus-visible:ring-sky-300",
    input: "border-sky-300 focus:border-sky-500 focus:ring-sky-200",
  },
  {
    boton: "border-violet-500 bg-violet-400 text-white",
    anillo: "ring-violet-300",
    suave: "border-violet-200 bg-violet-50 dark:border-violet-900/60 dark:bg-violet-950/30",
    acento: "bg-violet-500 hover:bg-violet-600 focus-visible:ring-violet-300",
    input: "border-violet-300 focus:border-violet-500 focus:ring-violet-200",
  },
  {
    boton: "border-pink-500 bg-pink-400 text-white",
    anillo: "ring-pink-300",
    suave: "border-pink-200 bg-pink-50 dark:border-pink-900/60 dark:bg-pink-950/30",
    acento: "bg-pink-500 hover:bg-pink-600 focus-visible:ring-pink-300",
    input: "border-pink-300 focus:border-pink-500 focus:ring-pink-200",
  },
  {
    boton: "border-teal-500 bg-teal-400 text-white",
    anillo: "ring-teal-300",
    suave: "border-teal-200 bg-teal-50 dark:border-teal-900/60 dark:bg-teal-950/30",
    acento: "bg-teal-500 hover:bg-teal-600 focus-visible:ring-teal-300",
    input: "border-teal-300 focus:border-teal-500 focus:ring-teal-200",
  },
  {
    boton: "border-indigo-500 bg-indigo-400 text-white",
    anillo: "ring-indigo-300",
    suave: "border-indigo-200 bg-indigo-50 dark:border-indigo-900/60 dark:bg-indigo-950/30",
    acento: "bg-indigo-500 hover:bg-indigo-600 focus-visible:ring-indigo-300",
    input: "border-indigo-300 focus:border-indigo-500 focus:ring-indigo-200",
  },
  {
    boton: "border-lime-500 bg-lime-300 text-lime-950",
    anillo: "ring-lime-300",
    suave: "border-lime-200 bg-lime-50 dark:border-lime-900/60 dark:bg-lime-950/30",
    acento: "bg-lime-400 hover:bg-lime-500 focus-visible:ring-lime-300",
    input: "border-lime-300 focus:border-lime-500 focus:ring-lime-200",
  },
] as const;

export default function KidsTablasPage() {
  const t = useTranslations("KidsTables");
  const [tabla, setTabla] = useState<number>(1);
  const [respuestas, setRespuestas] = useState<Record<number, string>>({});
  const [corregido, setCorregido] = useState(false);
  const colorTabla = COLORES_TABLA[tabla - 1];

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
            <span aria-hidden="true">✨</span> {t("title")}{" "}
            <span aria-hidden="true">🚀</span>
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
              const color = COLORES_TABLA[numero - 1];

              return (
                <button
                  key={numero}
                  type="button"
                  onClick={() => {
                    setTabla(numero);
                    reiniciar();
                  }}
                  aria-pressed={activa}
                  className={`flex h-12 items-center justify-center rounded-2xl border-2 text-lg font-black transition-all duration-150 hover:-translate-y-0.5 hover:scale-105 focus-visible:outline-none focus-visible:ring-4 ${color.boton} ${color.anillo} ${
                    activa
                      ? `scale-110 border-4 shadow-xl ring-4 ring-offset-2 ring-offset-[var(--card)] ${color.anillo}`
                      : "shadow-sm"
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
                  className={`flex flex-wrap items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-colors ${colorTabla.suave}`}
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
                    className={`h-12 min-w-0 flex-1 rounded-2xl border-4 bg-[var(--card)] px-3 text-lg font-black text-[var(--txt)] outline-none transition-all focus:ring-4 ${
                      corregido
                        ? correcta
                          ? "kids-tabla-pop border-emerald-500 bg-emerald-50 text-emerald-900 focus:ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100"
                          : "border-red-500 bg-red-50 text-red-900 focus:ring-red-200 dark:bg-red-950/40 dark:text-red-100"
                        : colorTabla.input
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
              className={`inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-white/40 px-5 text-sm font-black text-white shadow-md transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-4 ${colorTabla.acento}`}
            >
              <Check className="h-5 w-5" aria-hidden="true" />
              {t("check")}
            </button>

            <button
              type="button"
              onClick={reiniciar}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-[var(--th)] bg-[var(--card2)] px-5 text-sm font-black text-[var(--txt)] transition-transform hover:bg-[var(--suave2)] active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--azul)]/30"
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
