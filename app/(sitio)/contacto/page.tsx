"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { correoValido } from "@/lib/validacion";

const CLASE_CAMPO =
  "w-full rounded-xl border border-[var(--th)] bg-[var(--card2)] px-4 py-3 text-sm text-[var(--txt)] outline-none transition-colors placeholder:text-[var(--txt3)] focus:border-[var(--azul)] focus:ring-2 focus:ring-[var(--azul)]/30";

type RespuestaContacto = {
  error?: unknown;
  codigo?: unknown;
};

export default function ContactoPage() {
  const t = useTranslations("Contacto");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  function mensajeDeError(codigo: string): string {
    switch (codigo) {
      case "CORREO_INVALIDO":
        return t("errors.invalidEmail");
      case "MENSAJE_LARGO":
        return t("errors.messageTooLong");
      case "ENVIO_FALLIDO":
        return t("errors.sendFailed");
      case "DATOS_INVALIDOS":
        return t("errors.required");
      default:
        return t("errors.generic");
    }
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setExito("");

    if (!nombre.trim() || !correo.trim() || !mensaje.trim()) {
      setError(t("errors.required"));
      return;
    }

    if (!correoValido(correo)) {
      setError(t("errors.invalidEmail"));
      return;
    }

    setEnviando(true);

    try {
      const respuesta = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          correo: correo.trim(),
          mensaje: mensaje.trim(),
        }),
        cache: "no-store",
      });

      const datos = (await respuesta
        .json()
        .catch(() => ({}))) as RespuestaContacto;

      if (!respuesta.ok) {
        setError(
          typeof datos.codigo === "string"
            ? mensajeDeError(datos.codigo)
            : t("errors.generic"),
        );
        return;
      }

      setExito(t("success"));
      setNombre("");
      setCorreo("");
      setMensaje("");
    } catch {
      setError(t("errors.connection"));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main id="contenido" className="min-h-app bg-transparent font-sans">
      <section className="mx-auto max-w-xl px-5 py-10 sm:px-6 sm:py-14">
        <div className="rounded-3xl border border-[var(--th)] bg-[var(--card)] p-6 shadow-[var(--sombra)] sm:p-8">
          <Link
            href="/"
            className="mb-7 inline-flex items-center gap-2 rounded-xl border border-[var(--th)] bg-[var(--card2)] px-4 py-2 text-sm font-bold text-[var(--txt)] transition-colors hover:bg-[var(--suave2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2"
          >
            <span aria-hidden="true">←</span>
            {t("back")}
          </Link>

          <h1 className="font-serif text-balance text-3xl font-medium tracking-tight text-[var(--txt)] sm:text-4xl">
            {t("title")}
          </h1>

          <p className="mt-3 text-base leading-8 text-[var(--txt2)]">
            {t("intro")}
          </p>

          <form onSubmit={enviar} className="mt-7 space-y-4" noValidate>
            <div>
              <label
                htmlFor="contacto-nombre"
                className="mb-2 block text-sm font-bold text-[var(--txt2)]"
              >
                {t("name")}
              </label>
              <input
                id="contacto-nombre"
                type="text"
                autoComplete="name"
                value={nombre}
                onChange={(evento) => setNombre(evento.target.value)}
                className={CLASE_CAMPO}
                maxLength={120}
                required
              />
            </div>

            <div>
              <label
                htmlFor="contacto-correo"
                className="mb-2 block text-sm font-bold text-[var(--txt2)]"
              >
                {t("email")}
              </label>
              <input
                id="contacto-correo"
                type="email"
                autoComplete="email"
                value={correo}
                onChange={(evento) => setCorreo(evento.target.value)}
                className={CLASE_CAMPO}
                maxLength={254}
                required
              />
            </div>

            <div>
              <label
                htmlFor="contacto-mensaje"
                className="mb-2 block text-sm font-bold text-[var(--txt2)]"
              >
                {t("message")}
              </label>
              <textarea
                id="contacto-mensaje"
                value={mensaje}
                onChange={(evento) => setMensaje(evento.target.value)}
                rows={6}
                className={`${CLASE_CAMPO} resize-y`}
                maxLength={5_000}
                required
              />
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-xl border border-[var(--err-b)] bg-[var(--err)] px-4 py-3 text-sm font-semibold text-[var(--err-t)]"
              >
                {error}
              </p>
            ) : null}

            {exito ? (
              <p
                role="status"
                className="rounded-xl border border-[var(--ok-b)] bg-[var(--ok)] px-4 py-3 text-sm font-bold text-[var(--ok-t)]"
              >
                {exito}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={enviando}
              className="w-full cursor-pointer rounded-xl bg-[var(--azul)] px-5 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-[var(--azul-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enviando ? t("sending") : t("submit")}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
