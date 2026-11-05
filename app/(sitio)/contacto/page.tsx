"use client";

import { useState } from "react";
import Link from "next/link";

const CLASE_CAMPO =
  "w-full rounded-xl border border-[var(--th)] bg-[var(--card2)] px-4 py-3 text-sm text-[var(--txt)] outline-none transition-colors placeholder:text-[var(--txt3)] focus:border-[var(--azul)] focus:ring-2 focus:ring-[var(--azul)]/30";

export default function ContactoPage() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [asunto, setAsunto] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setExito("");

    if (
      !nombre.trim() ||
      !correo.trim() ||
      !asunto.trim() ||
      !mensaje.trim()
    ) {
      setError("Completa todos los campos.");
      return;
    }

    setEnviando(true);

    try {
      const respuesta = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          correo,
          asunto,
          mensaje,
        }),
      });

      const datos = (await respuesta.json().catch(() => ({}))) as {
        error?: unknown;
        mensaje?: unknown;
      };

      if (!respuesta.ok) {
        setError(
          typeof datos.error === "string"
            ? datos.error
            : "No se pudo enviar el mensaje. Inténtalo de nuevo.",
        );
        return;
      }

      setExito("¡Mensaje enviado! Te responderemos pronto.");
      setNombre("");
      setCorreo("");
      setAsunto("");
      setMensaje("");
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main id="contenido" className="bg-app min-h-app font-sans">
      <section className="mx-auto max-w-xl px-5 py-10 sm:px-6 sm:py-14">
        <div className="rounded-3xl bg-[var(--card)] p-8 shadow-[var(--sombra)]">
          <Link
            href="/"
            className="mb-7 inline-flex items-center gap-2 rounded-xl border border-[var(--th)] bg-[var(--card2)] px-4 py-2 text-sm font-bold text-[var(--txt)] transition-colors hover:bg-[var(--suave2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2"
          >
            <span aria-hidden="true">←</span>
            Volver
          </Link>

          <h1 className="text-balance text-3xl font-bold tracking-tight text-[var(--txt)] sm:text-4xl">
            Contacta con nosotros
          </h1>

          <p className="mt-3 leading-relaxed text-[var(--txt2)]">
            ¿Tienes alguna duda, problema técnico o sugerencia? Rellena el
            formulario y te responderemos lo antes posible.
          </p>

          <form onSubmit={enviar} className="mt-7 space-y-4" noValidate>
            <div>
              <label
                htmlFor="contacto-nombre"
                className="mb-2 block text-sm font-bold text-[var(--txt2)]"
              >
                Nombre
              </label>
              <input
                id="contacto-nombre"
                type="text"
                autoComplete="name"
                value={nombre}
                onChange={(evento) => setNombre(evento.target.value)}
                className={CLASE_CAMPO}
                maxLength={120}
              />
            </div>

            <div>
              <label
                htmlFor="contacto-correo"
                className="mb-2 block text-sm font-bold text-[var(--txt2)]"
              >
                Correo electrónico
              </label>
              <input
                id="contacto-correo"
                type="email"
                autoComplete="email"
                value={correo}
                onChange={(evento) => setCorreo(evento.target.value)}
                className={CLASE_CAMPO}
                maxLength={254}
              />
            </div>

            <div>
              <label
                htmlFor="contacto-asunto"
                className="mb-2 block text-sm font-bold text-[var(--txt2)]"
              >
                Asunto
              </label>
              <input
                id="contacto-asunto"
                type="text"
                value={asunto}
                onChange={(evento) => setAsunto(evento.target.value)}
                className={CLASE_CAMPO}
                maxLength={160}
              />
            </div>

            <div>
              <label
                htmlFor="contacto-mensaje"
                className="mb-2 block text-sm font-bold text-[var(--txt2)]"
              >
                Mensaje
              </label>
              <textarea
                id="contacto-mensaje"
                value={mensaje}
                onChange={(evento) => setMensaje(evento.target.value)}
                rows={6}
                className={`${CLASE_CAMPO} resize-y`}
                maxLength={5_000}
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
              {enviando ? "Enviando..." : "Enviar mensaje"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
