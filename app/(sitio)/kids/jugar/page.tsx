"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { normalizarPreguntas, type Pregunta } from "@/lib/tipos";
import FuegosArtificiales from "@/components/FuegosArtificiales";

const EMOJIS_OPCIONES = ["🐶", "🚀", "🍎", "🎨"];
const TOTAL_PREGUNTAS = 7;
const CLAVES_MATEMATICAS = new Set([
  "topicAdd",
  "topicSubtract",
  "topicMultiply",
  "topicDivide",
]);

function instruccionMatematica(edad: string): string {
  if (edad === "3-6") {
    return "Usa números del 1 al 10. Para multiplicar y dividir, plantea grupos o dibujos con resultados muy pequeños. Preguntas muy sencillas.";
  }

  if (edad === "6-9") {
    return "Usa operaciones de 2 o 3 cifras y multiplicaciones o divisiones adecuadas para un niño de 8 años.";
  }

  return "Incluye decimales, fracciones y problemas de varios pasos adecuados a 11-12 años.";
}
const IDIOMA_POR_LOCALE: Record<string, string> = {
  es: "español",
  en: "inglés",
  fr: "francés",
  de: "alemán",
  it: "italiano",
  pt: "portugués",
};

export default function KidsJugarPage() {
  return (
    <Suspense fallback={null}>
      <KidsJuegoConTema />
    </Suspense>
  );
}

function KidsJuegoConTema() {
  const busqueda = useSearchParams();
  const tema = busqueda.get("tema") ?? "sin-tema";
  const nonce = busqueda.get("t") ?? "";

  return <KidsJuego key={`${tema}-${nonce}`} />;
}

function KidsJuego() {
  const router = useRouter();
  const t = useTranslations("Kids");
  const locale = useLocale();
  const idioma = IDIOMA_POR_LOCALE[locale] ?? "español";
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [indice, setIndice] = useState(0);
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [aciertos, setAciertos] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [terminado, setTerminado] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tema, setTema] = useState("");
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const edad = window.localStorage.getItem("kids_age");
    const temaGuardado = window.localStorage.getItem("kids_tema");
    const claveTema =
      window.localStorage.getItem("kids_tema_clave") || "";

    if (!edad || !temaGuardado) {
      router.replace("/kids");
      return;
    }

    const esMatematica = CLAVES_MATEMATICAS.has(claveTema);
    const esAdivinanza = claveTema === "topicRiddles";
    const texto = esAdivinanza
      ? `Genera ${TOTAL_PREGUNTAS} adivinanzas infantiles para un niño de ${edad} años. Cada adivinanza debe tener una pregunta y 4 opciones, donde solo una sea la respuesta correcta. Usa lenguaje sencillo y divertido.`
      : esMatematica
        ? `Genera ${TOTAL_PREGUNTAS} preguntas de matemáticas sobre ${temaGuardado}. ${instruccionMatematica(edad)}`
        : `Genera un test de ${TOTAL_PREGUNTAS} preguntas sobre el tema: ` +
          temaGuardado +
          ". Que sea fácil y divertido para niños.";

    const controller = new AbortController();
    let cancelado = false;
    let abortadoPorTimeout = false;

    const timeout = window.setTimeout(() => {
      abortadoPorTimeout = true;
      controller.abort();
    }, 120_000);

    async function cargar(): Promise<void> {
      try {
        const tipoEstudio =
          edad === "9-12" ? "secundaria" : "primaria";

        const respuesta = await fetch("/api/generar", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            texto,
            tipoEstudio,
            idioma,
            edadNino: edad,
            numPreguntas: String(TOTAL_PREGUNTAS),
            esKids: true,
          }),
          signal: controller.signal,
        });

        const datos = (await respuesta.json().catch(() => ({}))) as {
          preguntas?: unknown;
          error?: unknown;
        };

        if (!respuesta.ok) {
          throw new Error(
            typeof datos.error === "string"
              ? datos.error
              : t("gameError"),
          );
        }

        const generadas = normalizarPreguntas(datos.preguntas).slice(
          0,
          TOTAL_PREGUNTAS,
        );

        if (generadas.length === 0) {
          throw new Error(t("gameNoQuestions"));
        }

        if (cancelado) return;

        setTema(temaGuardado || "");
        setPreguntas(generadas);
      } catch (err) {
        if (cancelado) return;

        if (
          err instanceof Error &&
          err.name === "AbortError"
        ) {
          if (abortadoPorTimeout) {
            setError(t("gameTimeout"));
          }
        } else if (err instanceof TypeError) {
          setError(t("gameConnection"));
        } else {
          setError(
            err instanceof Error ? err.message : t("gameError"),
          );
        }
      } finally {
        window.clearTimeout(timeout);
        if (!cancelado) {
          setCargando(false);
        }
      }
    }

    void cargar();

    return () => {
      cancelado = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [idioma, router, t]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  function responder(opcion: number): void {
    if (seleccion !== null || terminado) return;

    const pregunta = preguntas[indice];

    if (!pregunta) return;

    const acierto = opcion === pregunta.correcta;
    const respuestaCorrecta =
      pregunta.opciones[pregunta.correcta] ?? "";

    setSeleccion(opcion);
    setMensaje(
      acierto
        ? t("gameCorrect")
        : `${t("gameWrong")} ${t("gameCorrectAnswer", {
            answer: respuestaCorrecta,
          })}`,
    );

    if (acierto) {
      setAciertos((valor) => valor + 1);
    }

    timerRef.current = window.setTimeout(() => {
      if (indice + 1 >= preguntas.length) {
        setTerminado(true);
      } else {
        setIndice((valor) => valor + 1);
        setSeleccion(null);
        setMensaje("");
      }
    }, acierto ? 1000 : 5000);
  }

  const pregunta = preguntas[indice];
  const total = preguntas.length || TOTAL_PREGUNTAS;
  const progreso = ((indice + 1) / total) * 100;

  const emojiFinal =
    aciertos >= 4 ? "🎉" : aciertos >= 2 ? "🌟" : "🌈";
  const tituloFinal =
    aciertos >= 4
      ? t("gameGreat")
      : aciertos >= 2
        ? t("gameGoodJob")
        : t("gameTryAgain");
  const mensajeFinal =
    aciertos >= 4
      ? t("gameMastered")
      : aciertos >= 2
        ? t("gameKeepGoing")
        : t("gameKeepPracticing");

  return (
    <main className="min-h-app px-5 py-8 sm:px-8 sm:py-12">
      {terminado && aciertos === TOTAL_PREGUNTAS ? (
        <FuegosArtificiales />
      ) : null}

      <div className="mx-auto max-w-3xl">
        <div className="mb-3 flex justify-end">
          <Link
            href="/kids/temas"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--th)] bg-[var(--card)] px-4 py-2 text-sm font-bold text-[var(--txt2)] shadow-sm transition-colors hover:bg-[var(--suave2)] dark:border-[var(--th)] dark:bg-[var(--card)] dark:text-[var(--txt2)]"
          >
            <span aria-hidden="true">✕</span>
            {t("gameExit")}
          </Link>
        </div>

        <div className="mb-6 w-full text-center">
          <p className="w-full text-center text-3xl font-bold tracking-[0.15em] sm:text-4xl">
            <span className="bg-gradient-to-r from-[var(--azul)] via-[#7c3aed] to-[#06b6d4] dark:via-[#a78bfa] dark:to-[#22d3ee] bg-clip-text text-transparent">
              {t("brand")}
            </span>{" "}
            <span className="text-[var(--azul)]">
              {t("brandKids")}
            </span>
          </p>

          {tema ? (
            <span className="mt-3 inline-flex rounded-full bg-[var(--sel)] px-4 py-1.5 text-sm font-bold text-[var(--azul)] shadow-sm dark:bg-[var(--azul)]/15 dark:text-[var(--azul)]">
              {tema}
            </span>
          ) : null}
        </div>

        {cargando ? (
          <div className="rounded-3xl border border-white/70 bg-white/80 p-10 text-center shadow-xl dark:border-white/10 dark:bg-slate-800/80">
            <span className="text-5xl" aria-hidden="true">
              🧸
            </span>
            <p className="mt-4 text-xl font-bold text-[var(--txt)]">
              {t("gameLoading")}
            </p>
            <div className="mx-auto mt-4 h-3 w-40 overflow-hidden rounded-full bg-sky-100">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-[var(--azul)]" />
            </div>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-white/90 p-8 text-center shadow-xl dark:border-rose-900 dark:bg-slate-800/90">
            <span className="text-5xl" aria-hidden="true">
              🌈
            </span>
            <p className="mt-4 text-lg font-bold text-[var(--txt)]">
              {error}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-2xl bg-[var(--azul)] px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105"
              >
                {t("gameRetry")}
              </button>
              <button
                type="button"
                onClick={() => router.push("/kids/temas")}
                className="rounded-2xl border border-white/70 bg-white/80 px-6 py-3 text-sm font-bold text-slate-700 shadow-md transition-transform hover:scale-105 dark:border-white/10 dark:bg-slate-800 dark:text-white"
              >
                {t("gameChooseTopic")}
              </button>
            </div>
          </div>
        ) : terminado ? (
          <div className="rounded-3xl border border-white/70 bg-white/90 p-8 text-center shadow-xl dark:border-white/10 dark:bg-slate-800/90 sm:p-12">
            <span className="text-7xl" aria-hidden="true">
              {emojiFinal}
            </span>
            <h1 className="mt-4 text-4xl font-bold text-[var(--txt)] sm:text-5xl">
              {tituloFinal}
            </h1>
            <p className="mt-4 text-xl font-bold text-[var(--txt2)]">
              {mensajeFinal}
            </p>
            <p className="mt-2 text-base font-semibold text-[var(--txt3)]">
              {t("gameFinishText", {
                correct: aciertos,
                total: preguntas.length,
              })}
            </p>
            <button
              type="button"
              onClick={() => router.push("/kids/temas")}
              className="mt-8 rounded-2xl bg-[var(--azul)] px-7 py-3.5 text-base font-bold text-white shadow-lg transition-transform hover:scale-105"
            >
              {t("gameChooseTopic")}
            </button>
          </div>
        ) : pregunta ? (
          <>
            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between text-sm font-bold text-[var(--txt2)]">
                <span>
                  {t("gameProgress", {
                    current: indice + 1,
                    total,
                  })}
                </span>
                <span>
                  {aciertos} ⭐
                </span>
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-white/70 shadow-inner dark:bg-slate-800/80">
                <div
                  className="h-full rounded-full bg-[var(--azul)] transition-all duration-300"
                  style={{ width: `${progreso}%` }}
                />
              </div>
            </div>

            <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl dark:border-white/10 dark:bg-slate-800/90 sm:p-9">
              <p className="text-center text-2xl font-bold leading-snug text-[var(--txt)] sm:text-4xl">
                {pregunta.enunciado}
              </p>
            </section>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {pregunta.opciones.map((opcion, indiceOpcion) => {
                const esCorrecta = indiceOpcion === pregunta.correcta;
                const esSeleccionada = seleccion === indiceOpcion;

                let clase =
                  "border-white/80 bg-white/85 text-slate-800 dark:border-white/10 dark:bg-slate-800/90 dark:text-white";

                if (seleccion !== null) {
                  if (esCorrecta) {
                    clase =
                      "border-emerald-500 bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100";
                  } else if (esSeleccionada) {
                    clase =
                      "border-rose-500 bg-rose-100 text-rose-900 dark:bg-rose-900/50 dark:text-rose-100";
                  } else {
                    clase =
                      "border-white/60 bg-white/50 text-slate-400 opacity-70 dark:border-white/10 dark:bg-slate-800/50 dark:text-slate-400";
                  }
                }

                return (
                  <button
                    key={`${opcion}-${indiceOpcion}`}
                    type="button"
                    onClick={() => responder(indiceOpcion)}
                    disabled={seleccion !== null}
                    className={`flex min-h-20 cursor-pointer items-center gap-3 rounded-3xl border-2 px-5 py-4 text-left text-lg font-bold shadow-md transition-all disabled:cursor-default ${clase}`}
                  >
                    <span className="text-3xl" aria-hidden="true">
                      {EMOJIS_OPCIONES[indiceOpcion] ?? "⭐"}
                    </span>
                    <span>{opcion}</span>
                    {seleccion !== null && esCorrecta ? (
                      <span className="ml-auto text-2xl" aria-hidden="true">
                        ✅
                      </span>
                    ) : null}
                    {seleccion !== null &&
                    esSeleccionada &&
                    !esCorrecta ? (
                      <span className="ml-auto text-2xl" aria-hidden="true">
                        💫
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {mensaje ? (
              <p
                role="status"
                aria-live="polite"
                className={`mt-5 rounded-2xl px-5 py-3 text-center text-lg font-bold ${
                  pregunta.opciones[seleccion ?? -1] ===
                  pregunta.opciones[pregunta.correcta]
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100"
                    : "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-100"
                }`}
              >
                {mensaje}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
