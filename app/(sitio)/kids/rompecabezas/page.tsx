"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

const RESUELTO = [0, 1, 2, 3, 4, 5, 6, 7, 8];

const IMAGENES_PUZZLE = [
  "/opogen-logo-nuevo.png",
  "/rompecabezas-cohete.svg",
  "/rompecabezas-arcoiris.svg",
  "/rompecabezas-animales.svg",
];

function elegirImagen(distintaDe?: string): string {
  const disponibles = distintaDe
    ? IMAGENES_PUZZLE.filter((imagen) => imagen !== distintaDe)
    : IMAGENES_PUZZLE;

  return disponibles[Math.floor(Math.random() * disponibles.length)];
}

function vecinos(indice: number): number[] {
  const fila = Math.floor(indice / 3);
  const columna = indice % 3;
  const salida: number[] = [];

  if (fila > 0) salida.push(indice - 3);
  if (fila < 2) salida.push(indice + 3);
  if (columna > 0) salida.push(indice - 1);
  if (columna < 2) salida.push(indice + 1);

  return salida;
}

function mezclarConSemilla(semilla: number): number[] {
  let estado = semilla;
  const aleatorio = () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296;
    return estado / 4294967296;
  };

  const tablero = [...RESUELTO];
  let hueco = 8;

  for (let paso = 0; paso < 90; paso += 1) {
    const opciones = vecinos(hueco);
    const destino = opciones[Math.floor(aleatorio() * opciones.length)];

    [tablero[hueco], tablero[destino]] = [
      tablero[destino],
      tablero[hueco],
    ];
    hueco = destino;
  }

  if (tablero.every((pieza, indice) => pieza === indice)) {
    [tablero[7], tablero[8]] = [tablero[8], tablero[7]];
  }

  return tablero;
}

export default function RompecabezasPage() {
  const router = useRouter();
  const t = useTranslations("Kids");
  const [tablero, setTablero] = useState<number[]>(() =>
    mezclarConSemilla(20261103),
  );
  const [movimientos, setMovimientos] = useState(0);
  const [imagenActual, setImagenActual] = useState<string>(
    IMAGENES_PUZZLE[0],
  );

  useEffect(() => {
    if (!window.localStorage.getItem("kids_age")) {
      router.replace("/kids");
    }
  }, [router]);

  useEffect(() => {
    // Se elige en el cliente para no romper la hidratación de Next.js.
    const id = window.setTimeout(() => {
      setImagenActual(elegirImagen());
    }, 0);

    return () => window.clearTimeout(id);
  }, []);

  const resuelto = tablero.every(
    (pieza, indice) => pieza === indice,
  );
  const hueco = tablero.indexOf(8);

  function mover(indice: number): void {
    if (resuelto || !vecinos(hueco).includes(indice)) {
      return;
    }

    setTablero((anterior) => {
      const siguiente = [...anterior];
      const posicionHueco = siguiente.indexOf(8);

      if (!vecinos(posicionHueco).includes(indice)) {
        return anterior;
      }

      [siguiente[posicionHueco], siguiente[indice]] = [
        siguiente[indice],
        siguiente[posicionHueco],
      ];
      return siguiente;
    });
    setMovimientos((valor) => valor + 1);
  }

  function volverAJugar(): void {
    setTablero(mezclarConSemilla(Date.now()));
    setMovimientos(0);
    setImagenActual((actual) => elegirImagen(actual));
  }

  return (
    <main className="min-h-app px-5 py-8 sm:px-8 sm:py-12">
      <section className="mx-auto max-w-xl text-center">
        <div className="mb-3 flex justify-end">
          <Link
            href="/kids/temas"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--th)] bg-[var(--card)] px-4 py-2 text-sm font-bold text-[var(--txt2)] shadow-sm transition-colors hover:bg-[var(--suave2)] dark:border-[var(--th)] dark:bg-[var(--card)] dark:text-[var(--txt2)]"
          >
            <span aria-hidden="true">✕</span>
            {t("gameExit")}
          </Link>
        </div>

        <p className="text-3xl font-bold tracking-[0.15em] sm:text-4xl">
          <span className="bg-gradient-to-r from-[var(--azul)] via-[#7c3aed] to-[#06b6d4] dark:via-[#a78bfa] dark:to-[#22d3ee] bg-clip-text text-transparent">
            {t("brand")}
          </span>{" "}
          <span className="text-[var(--azul)]">
            {t("brandKids")}
          </span>
        </p>

        <h1 className="mt-3 text-4xl font-bold text-[var(--txt)] sm:text-5xl">
          🧩 {t("topicPuzzle")}
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--txt2)]">
          {t("puzzleIntro")}
        </p>

        <div className="mx-auto mt-7 max-w-md rounded-3xl border border-[var(--th)] bg-[var(--azul)]/10 p-3 shadow-2xl dark:border-[var(--th)] dark:bg-[var(--azul)]/15">
          <div className="grid aspect-square grid-cols-3 gap-2">
            {tablero.map((pieza, indice) => {
              const esHueco = pieza === 8;
              const fila = Math.floor(pieza / 3);
              const columna = pieza % 3;

              return esHueco ? (
                <div
                  key={`hueco-${indice}`}
                  className="rounded-xl border-2 border-dashed border-white/60 bg-slate-900/15"
                  aria-hidden="true"
                />
              ) : (
                <button
                  key={`pieza-${pieza}`}
                  type="button"
                  onClick={() => mover(indice)}
                  disabled={resuelto}
                  aria-label={`Mover pieza ${pieza + 1}`}
                  className="relative overflow-hidden rounded-xl border-2 border-white/80 bg-amber-100 bg-cover shadow-md transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70 disabled:cursor-default"
                  style={{
                    backgroundImage: `url("${imagenActual}")`,
                    backgroundSize: "300% 300%",
                    backgroundPosition: `${columna * 50}% ${fila * 50}%`,
                  }}
                >
                  <span className="sr-only">{pieza + 1}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-4 text-sm font-bold text-[var(--txt2)]">
          <span>
            {t("puzzleMoves")}: {movimientos}
          </span>
        </div>

        {resuelto ? (
          <div className="mx-auto mt-6 max-w-md rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-5 text-center dark:bg-emerald-950/50">
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-200">
              🎉 {t("puzzleWinTitle")}
            </p>
            <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-200">
              {t("puzzleWinText")}
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={volverAJugar}
            className="rounded-2xl bg-[var(--azul)] px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105"
          >
            {t("puzzleAgain")}
          </button>

          <Link
            href="/kids/temas"
            className="rounded-2xl border border-slate-300 bg-white/70 px-6 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-white dark:border-white/15 dark:bg-slate-800/80 dark:text-slate-200"
          >
            {t("topicsBack")}
          </Link>
        </div>
      </section>
    </main>
  );
}
