"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";

export default function BotonAscenderAmigo() {
  const [abierto, setAbierto] = useState(false);
  const [telefono, setTelefono] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setMensaje("");

    const telefonoLimpio = telefono.trim();

    if (!telefonoLimpio) {
      setError("Indica el teléfono del amigo.");
      return;
    }

    setEnviando(true);

    try {
      const respuesta = await fetch("/api/admin/hacer-premium", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono: telefonoLimpio }),
      });

      const datos = (await respuesta.json().catch(() => ({}))) as {
        mensaje?: unknown;
        error?: unknown;
      };

      if (!respuesta.ok) {
        setError(
          typeof datos.error === "string"
            ? datos.error
            : "No se pudo ascender al usuario.",
        );
        return;
      }

      setMensaje(
        typeof datos.mensaje === "string"
          ? datos.mensaje
          : "Usuario ascendido correctamente.",
      );
      setTelefono("");
    } catch {
      setError("Error de conexión.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={abierto ? "rounded-2xl border border-dashed border-[var(--azul)] bg-[var(--sel)] p-4 text-left" : ""}>
      {abierto ? (
        <form onSubmit={enviar} className="space-y-3">
          <div>
            <label
              htmlFor="ascender-telefono"
              className="mb-1 block text-sm font-bold text-[var(--txt)]"
            >
              Teléfono del amigo
            </label>
            <p className="mb-2 text-xs text-[var(--txt3)]">
              Formato: 34_600000000
            </p>
            <input
              id="ascender-telefono"
              type="text"
              value={telefono}
              onChange={(evento) => setTelefono(evento.target.value)}
              placeholder="34_600000000"
              className="w-full rounded-xl border-2 border-[var(--azul)] bg-[var(--card)] px-3 py-2 text-sm font-semibold text-[var(--txt)] outline-none focus:border-[var(--azul)] focus:ring-2 focus:ring-[var(--azul)]/30"
              autoFocus
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-[var(--err-t)]">
              {error}
            </p>
          ) : null}

          {mensaje ? (
            <p role="status" className="text-sm font-semibold text-[var(--ok-t)]">
              {mensaje}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={enviando}
              className="rounded-xl bg-[var(--azul)] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--azul-hover)] disabled:opacity-60"
            >
              {enviando ? "Ascendiendo..." : "Confirmar ascenso"}
            </button>

            <button
              type="button"
              onClick={() => {
                setAbierto(false);
                setError("");
                setMensaje("");
              }}
              className="rounded-xl border border-[var(--th)] px-4 py-2 text-sm font-semibold text-[var(--txt2)] transition-colors hover:bg-[var(--suave2)]"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--azul)] bg-[var(--card)] px-4 py-2 text-sm font-bold text-[var(--azul)] shadow-sm transition-colors hover:bg-[var(--sel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)]"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Ascender amigo a Premium
        </button>
      )}
    </div>
  );
}
