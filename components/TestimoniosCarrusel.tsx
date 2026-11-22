"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";

type Testimonio = {
  id: number;
  nombreVisible: string;
  texto: string;
  fecha: string;
};

const INTERVALO_MS = 6_000;

export default function TestimoniosCarrusel() {
  const t = useTranslations("Landing.testimonials");
  const locale = useLocale();
  const [testimonios, setTestimonios] = useState<Testimonio[]>([]);
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const reducido = useRef(false);

  useEffect(() => {
    reducido.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    let activo = true;

    void (async () => {
      try {
        const res = await fetch("/api/testimonios/aprobados", {
          cache: "no-store",
        });

        if (!res.ok) return;

        const datos = (await res.json().catch(() => ({}))) as {
          testimonios?: unknown;
        };
        const lista = Array.isArray(datos.testimonios)
          ? (datos.testimonios.filter(
              (item): item is Testimonio =>
                Boolean(
                  item &&
                    typeof item === "object" &&
                    typeof (item as Testimonio).nombreVisible === "string" &&
                    typeof (item as Testimonio).texto === "string",
                ),
            ) as Testimonio[])
          : [];

        if (activo) setTestimonios(lista);
      } catch {
        // Sin testimonios no se muestra la sección.
      }
    })();

    return () => {
      activo = false;
    };
  }, []);

  const total = testimonios.length;

  const avanzar = useCallback(() => {
    setIndice((actual) => (total > 0 ? (actual + 1) % total : 0));
  }, [total]);

  const retroceder = useCallback(() => {
    setIndice((actual) => (total > 0 ? (actual - 1 + total) % total : 0));
  }, [total]);

  useEffect(() => {
    if (total < 2 || pausado || reducido.current) return;

    const id = window.setInterval(avanzar, INTERVALO_MS);

    return () => window.clearInterval(id);
  }, [total, pausado, avanzar]);

  const fechas = useMemo(() => {
    const formato = new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    return new Map(
      testimonios.map((testimonio) => [
        testimonio.id,
        formato.format(new Date(testimonio.fecha)),
      ]),
    );
  }, [testimonios, locale]);

  if (total === 0) return null;

  const visible = testimonios[indice];
  const segundo = total > 1 ? testimonios[(indice + 1) % total] : null;

  return (
    <section
      aria-labelledby="titulo-testimonios"
      aria-roledescription="carousel"
      className="relative z-10 mx-auto max-w-6xl px-5 pb-16 sm:px-6"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
    >
      <div className="mb-8 text-center">
        <h2
          id="titulo-testimonios"
          className="text-balance text-3xl font-bold tracking-tight text-[var(--txt)] sm:text-4xl"
        >
          {t("title")}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-pretty text-[var(--txt2)]">
          {t("subtitle")}
        </p>
      </div>

      <div className="relative">
        <div
          className={`grid grid-cols-1 gap-4 ${
            segundo ? "sm:grid-cols-2" : "mx-auto max-w-xl"
          }`}
        >
          {[visible, segundo].filter(Boolean).map((testimonio, posicion) => (
            <figure
              key={`${testimonio!.id}-${posicion}`}
              aria-hidden={posicion > 0 ? "true" : undefined}
              className={`flex h-full flex-col rounded-3xl border border-[var(--th)] bg-[var(--card)] p-6 shadow-[var(--sombra)] ${
                posicion > 0 ? "hidden sm:flex" : "flex"
              }`}
            >
              <Quote
                className="h-6 w-6 shrink-0 text-[var(--azul)]"
                strokeWidth={2}
                aria-hidden="true"
              />
              <blockquote className="mt-4 flex-1 text-pretty leading-relaxed text-[var(--txt2)]">
                “{testimonio!.texto}”
              </blockquote>
              <figcaption className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--th)] pt-3 text-xs">
                <span className="font-bold text-[var(--txt)]">
                  {testimonio!.nombreVisible || t("anonymous")}
                </span>
                <span className="text-[var(--txt3)]">
                  {fechas.get(testimonio!.id) ?? ""}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>

        {total > 1 ? (
          <div className="mt-5 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={retroceder}
              aria-label={t("previous")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--th)] bg-[var(--card)] text-[var(--txt2)] transition-colors hover:border-[var(--azul)]/40 hover:text-[var(--azul)]"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            </button>

            <div className="flex items-center gap-1.5">
              {testimonios.map((testimonio, posicion) => (
                <button
                  key={testimonio.id}
                  type="button"
                  onClick={() => setIndice(posicion)}
                  aria-label={`${posicion + 1} / ${total}`}
                  aria-current={posicion === indice ? "true" : undefined}
                  className={`h-2 rounded-full transition-all ${
                    posicion === indice
                      ? "w-5 bg-[var(--azul)]"
                      : "w-2 bg-[var(--txt3)]/40 hover:bg-[var(--azul)]/50"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={avanzar}
              aria-label={t("next")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--th)] bg-[var(--card)] text-[var(--txt2)] transition-colors hover:border-[var(--azul)]/40 hover:text-[var(--azul)]"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
