"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MessageSquareQuote, Send } from "lucide-react";

type Props = {
  nombreInicial: string;
  /** Sin tarjeta ni cabecera propia, para usarlo dentro de un modal. */
  compacto?: boolean;
};

const MAX_TEXTO = 500;
const MIN_TEXTO = 20;

function obtenerCookieCSRF(): string {
  if (typeof document === "undefined") return "";

  const fila = document.cookie
    .split("; ")
    .find((item) => item.startsWith("csrf-token="));

  return fila ? decodeURIComponent(fila.split("=")[1]) : "";
}

async function obtenerCsrf(): Promise<string> {
  const existente = obtenerCookieCSRF();

  if (existente) return existente;

  try {
    const res = await fetch("/api/auth/csrf", { cache: "no-store" });
    const datos = (await res.json().catch(() => ({}))) as {
      csrfToken?: unknown;
    };

    return typeof datos.csrfToken === "string" ? datos.csrfToken : "";
  } catch {
    return "";
  }
}

export default function FormularioTestimonio({
  nombreInicial,
  compacto = false,
}: Props) {
  const t = useTranslations("Dashboard.testimonialForm");
  const locale = useLocale();
  const [nombre, setNombre] = useState(nombreInicial.slice(0, 40));
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (enviando) return;

    if (texto.trim().length < MIN_TEXTO) {
      setError(t("tooShort", { min: MIN_TEXTO }));
      return;
    }

    setEnviando(true);
    setError("");

    try {
      const csrf = await obtenerCsrf();
      const res = await fetch("/api/testimonios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRF-Token": csrf } : {}),
        },
        body: JSON.stringify({
          texto: texto.trim(),
          nombreVisible: nombre.trim(),
          idioma: locale,
        }),
        signal: AbortSignal.timeout(45_000),
      });
      const datos = (await res.json().catch(() => ({}))) as {
        error?: unknown;
      };

      if (!res.ok) {
        throw new Error(
          typeof datos.error === "string" ? datos.error : t("error"),
        );
      }

      setEnviado(true);
      setTexto("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      className={
        compacto
          ? ""
          : "mt-10 rounded-3xl border border-[var(--th)] bg-[var(--card)] p-6 shadow-[var(--sombra)] sm:p-8"
      }
    >
      {!compacto ? (
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--sel)] text-[var(--azul)]">
          <MessageSquareQuote className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold tracking-tight text-[var(--txt)]">
            {t("title")}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--txt2)]">
            {t("hint")}
          </p>
        </div>
      </div>
      ) : null}

      {enviado ? (
        <p
          role="status"
          className={`rounded-2xl border border-[var(--azul)]/25 bg-[var(--sel)]/60 px-4 py-3 text-sm font-semibold text-[var(--azul)] ${
            compacto ? "" : "mt-5"
          }`}
        >
          {t("success")}
        </p>
      ) : (
        <form
          onSubmit={enviar}
          className={`space-y-4 ${compacto ? "" : "mt-5"}`}
          noValidate
        >
          <div>
            <label
              htmlFor="testimonio-nombre"
              className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
            >
              {t("name")}
            </label>
            <input
              id="testimonio-nombre"
              type="text"
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              maxLength={40}
              placeholder={t("namePlaceholder")}
              className="h-12 w-full rounded-xl border border-[var(--th)] bg-[var(--card2)] px-3 text-base text-[var(--txt)] outline-none transition-colors placeholder:text-[var(--txt3)] focus:border-[var(--azul)] focus:ring-2 focus:ring-[var(--azul)]/30 sm:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="testimonio-texto"
              className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
            >
              {t("text")}
            </label>
            <textarea
              id="testimonio-texto"
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              maxLength={MAX_TEXTO}
              rows={4}
              placeholder={t("textPlaceholder")}
              className="w-full resize-y rounded-xl border border-[var(--th)] bg-[var(--card2)] p-3 text-base text-[var(--txt)] outline-none transition-colors placeholder:text-[var(--txt3)] focus:border-[var(--azul)] focus:ring-2 focus:ring-[var(--azul)]/30 sm:text-sm"
            />
            <p className="mt-1 text-right text-xs text-[var(--txt3)]">
              {texto.length}/{MAX_TEXTO}
            </p>
          </div>

          <p className="text-xs font-medium text-[var(--txt3)]">
            {t("reviewNotice")}
          </p>

          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-[var(--err-b)] bg-[var(--err)] p-3 text-sm font-medium text-[var(--err-t)]"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={enviando}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--azul)] px-6 text-sm font-bold text-[var(--btn-txt)] transition-colors hover:bg-[var(--azul-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
            {enviando ? t("sending") : t("submit")}
          </button>
        </form>
      )}
    </div>
  );
}
