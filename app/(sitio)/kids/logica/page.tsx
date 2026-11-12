"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type Acertijo = {
  id: string;
  titulo: string;
  edad: string;
  enunciado: string;
  respuesta: string;
};

type RespuestaApi = {
  acertijo: Acertijo | null;
  completado: boolean;
};

export default function KidsLogicaPage() {
  const t = useTranslations("KidsLogica");
  const router = useRouter();
  const [edad, setEdad] = useState("");
  const [acertijo, setAcertijo] = useState<Acertijo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [completado, setCompletado] = useState(false);
  const [resuelto, setResuelto] = useState(false);
  const [esGenerado, setEsGenerado] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const guardada = window.localStorage.getItem("kids_age");

    if (!guardada) {
      router.replace("/kids");
      return;
    }

    setEdad(guardada);
  }, [router]);

  const cargar = useCallback(
    async (edadActual: string) => {
      setCargando(true);
      setError("");

      try {
        const respuesta = await fetch(
          `/api/kids/logica?edad=${encodeURIComponent(edadActual)}`,
          { cache: "no-store" },
        );

        if (!respuesta.ok) throw new Error(t("error"));

        const datos = (await respuesta.json()) as RespuestaApi;
        setAcertijo(datos.acertijo ?? null);
        setCompletado(Boolean(datos.completado));
      } catch {
        setError(t("error"));
      } finally {
        setCargando(false);
        setResuelto(false);
        setEsGenerado(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (edad) void cargar(edad);
  }, [edad, cargar]);

  async function seguirJugando(): Promise<void> {
    setGenerando(true);
    setError("");

    try {
      const respuesta = await fetch("/api/kids/logica/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edad }),
        cache: "no-store",
      });

      if (!respuesta.ok) throw new Error(t("error"));

      const datos = (await respuesta.json()) as {
        acertijo: Acertijo | null;
      };

      if (!datos.acertijo) throw new Error(t("error"));

      setAcertijo(datos.acertijo);
      setCompletado(false);
      setResuelto(false);
      setEsGenerado(true);
    } catch {
      setError(t("error"));
    } finally {
      setGenerando(false);
    }
  }

  async function siguiente(): Promise<void> {
    if (!acertijo) return;

    if (esGenerado) {
      await seguirJugando();
      return;
    }

    setCargando(true);
    setError("");

    try {
      const respuesta = await fetch("/api/kids/logica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edad, id: acertijo.id }),
        cache: "no-store",
      });

      if (!respuesta.ok) throw new Error(t("error"));

      const datos = (await respuesta.json()) as RespuestaApi;
      setAcertijo(datos.acertijo ?? null);
      setCompletado(Boolean(datos.completado));
    } catch {
      setError(t("error"));
    } finally {
      setCargando(false);
      setResuelto(false);
    }
  }

  return (
    <main id="contenido" className="min-h-app bg-transparent">
      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--txt)] sm:text-4xl">
          🧠 {t("title")}
        </h1>
        <p className="mt-3 text-[var(--txt2)]">{t("intro")}</p>

        {completado ? (
          <div className="mt-8 rounded-3xl border-2 border-[var(--azul)]/40 bg-[var(--azul)]/10 p-8 text-center">
            <p className="text-xl font-bold text-[var(--txt)]">
              🎉 {t("completed")}
            </p>
            {error ? (
              <p className="mt-3 text-sm font-medium text-[var(--err-t)]">
                {error}
              </p>
            ) : null}
            <p className="mt-4 text-[var(--txt2)]">{t("keepPlaying")}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => void seguirJugando()}
                disabled={generando}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-[var(--azul)] px-6 text-base font-bold text-white transition-colors hover:bg-[var(--azul-hover)] disabled:cursor-wait disabled:opacity-60"
              >
                {generando ? t("generating") : t("yes")}
              </button>
              <button
                type="button"
                onClick={() => router.push("/kids/temas")}
                disabled={generando}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-[var(--th)] bg-[var(--card)] px-6 text-base font-bold text-[var(--txt)] transition-colors hover:bg-[var(--suave)] disabled:cursor-wait disabled:opacity-60"
              >
                {t("no")}
              </button>
            </div>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-[var(--err-b)] bg-[var(--err)] p-5 text-center text-sm font-medium text-[var(--err-t)]"
          >
            {error}
          </div>
        ) : cargando || !acertijo ? (
          <p className="mt-8 text-[var(--txt3)]">{t("loading")}</p>
        ) : (
          <article className="mt-8 rounded-3xl border border-[var(--th)] bg-[var(--card)] p-6 shadow-[var(--sombra)] sm:p-8">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--txt)]">
              {acertijo.titulo}
            </h2>
            <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-[var(--txt2)]">
              {acertijo.enunciado}
            </p>

            <div className="mt-6 rounded-2xl border border-[var(--th)] bg-[var(--card2)] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--txt3)]">
                {t("answer")}
              </p>
              <p
                className="mt-1 text-xl font-bold text-[var(--txt)]"
                aria-live="polite"
                style={
                  resuelto
                    ? undefined
                    : { filter: "blur(5px)", userSelect: "none" }
                }
              >
                {acertijo.respuesta}
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {!resuelto ? (
                <button
                  type="button"
                  onClick={() => setResuelto(true)}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-[var(--azul)] px-6 text-base font-bold text-white transition-colors hover:bg-[var(--azul-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)]"
                >
                  {t("resolve")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void siguiente()}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-[var(--th)] bg-[var(--card)] px-6 text-base font-bold text-[var(--txt)] transition-colors hover:bg-[var(--suave)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)]"
              >
                {t("next")}
              </button>
            </div>
          </article>
        )}

        <Link
          href="/kids/temas"
          className="mt-8 inline-flex rounded-2xl bg-[var(--azul)] px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105"
        >
          {t("back")}
        </Link>
      </section>
    </main>
  );
}
