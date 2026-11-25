"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type Acertijo = {
  id: string;
  edad: string;
  tema: string;
  mecanica: string;
  titulo: string;
  enunciado: string;
  elementos: string[];
  reglas: string[];
  accion: string;
  pregunta: string;
  solucion: string;
};

type RespuestaApi = {
  acertijo: Acertijo | null;
};

export default function KidsLogicaPage() {
  const t = useTranslations("KidsLogica");
  const router = useRouter();
  const [edad, setEdad] = useState("");
  const [acertijo, setAcertijo] = useState<Acertijo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => {
      const guardada = window.localStorage.getItem("kids_age");

      if (!guardada) {
        router.replace("/kids");
        return;
      }

      setEdad(guardada);
    }, 0);

    return () => window.clearTimeout(id);
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

        if (!datos.acertijo) throw new Error(t("error"));

        setAcertijo(datos.acertijo);
      } catch {
        setError(t("error"));
      } finally {
        setCargando(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (!edad) return;

    const id = window.setTimeout(() => void cargar(edad), 0);

    return () => window.clearTimeout(id);
  }, [edad, cargar]);

  // La API reinicia la lista cuando se acaban los acertijos de la edad, así
  // que aquí solo hay que pedir el siguiente: nunca se bloquea el juego.
  async function siguiente(): Promise<void> {
    if (!acertijo) return;

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

      if (!datos.acertijo) throw new Error(t("error"));

      setAcertijo(datos.acertijo);
    } catch {
      setError(t("error"));
    } finally {
      setCargando(false);
    }
  }

  return (
    <main id="contenido" className="min-h-app bg-transparent">
      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--txt)] sm:text-4xl">
          🧠 {t("title")}
        </h1>
        <p className="mt-3 text-[var(--txt2)]">{t("intro")}</p>

        {error ? (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-[var(--err-b)] bg-[var(--err)] p-5 text-center text-sm font-medium text-[var(--err-t)]"
          >
            {error}
          </div>
        ) : cargando || !acertijo ? (
          <p className="mt-8 text-[var(--txt3)]">{t("loading")}</p>
        ) : (
          <article className="mt-8 kids-glass rounded-3xl border border-[var(--th)] bg-[var(--card)] p-6 shadow-[var(--sombra)] sm:p-8">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--txt)]">
              {acertijo.titulo}
            </h2>

            <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-[var(--txt2)]">
              {acertijo.enunciado}
            </p>

            {acertijo.elementos.length > 0 ? (
              <ul className="mt-4 list-disc space-y-1 pl-6 text-base text-[var(--txt2)]">
                {acertijo.elementos.map((elemento) => (
                  <li key={elemento}>{elemento}</li>
                ))}
              </ul>
            ) : null}

            {acertijo.reglas.length > 0 ? (
              <>
                <p className="mt-5 text-sm font-bold uppercase tracking-wide text-[var(--txt3)]">
                  {t("rules")}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-6 text-base text-[var(--txt2)]">
                  {acertijo.reglas.map((regla) => (
                    <li key={regla}>{regla}</li>
                  ))}
                </ul>
              </>
            ) : null}

            <p className="mt-5 text-base text-[var(--txt2)]">
              {t("youCan")} {acertijo.accion}.
            </p>

            <p className="mt-4 text-base font-bold text-[var(--txt)]">
              {t("question")}:{" "}
              <span className="font-normal text-[var(--txt2)]">
                {acertijo.pregunta}
              </span>
            </p>

            <details
              key={acertijo.id}
              className="mt-6 rounded-2xl border border-[var(--th)] bg-[var(--card2)] p-4"
            >
              <summary className="cursor-pointer text-base font-bold text-[var(--azul)]">
                {t("viewSolution")}
              </summary>
              <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-[var(--txt2)]">
                {acertijo.solucion}
              </p>
            </details>

            <button
              type="button"
              onClick={() => void siguiente()}
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl border border-[var(--th)] bg-[var(--card)] px-6 text-base font-bold text-[var(--txt)] transition-colors hover:bg-[var(--suave)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)]"
            >
              {t("next")}
            </button>
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
