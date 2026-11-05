"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
function RestablecerContrasenaFormulario() {
  const busqueda = useSearchParams();
  const router = useRouter();
  const token = busqueda.get("token") || "";

  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);

  async function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");

    if (nuevaPassword !== confirmarPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (nuevaPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (!token) {
      setError("Token inválido o caducado.");
      return;
    }

    setEnviando(true);

    try {
      const respuesta = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, nuevaPassword }),
      });

      const datos = await respuesta.json().catch(() => null);

      if (!respuesta.ok) {
        setError(datos?.error || "Error al restablecer la contraseña.");
        setEnviando(false);
        return;
      }

      setExito(true);
      setEnviando(false);
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch {
      setError("Error de conexión.");
      setEnviando(false);
    }
  }

  if (!token) {
    return (
      <div className="mt-6 rounded-2xl border border-[var(--err-b)] bg-[var(--err)] p-4 text-[var(--err-t)]">
        <p className="font-semibold">Token inválido o caducado.</p>
        <Link href="/forgot-password" className="mt-4 inline-block btn-ghost">
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  return (
    <>
      {exito ? (
        <div className="mt-6 rounded-2xl border border-[var(--ok-b)] bg-[var(--ok)] p-4 text-[var(--ok-t)]">
          <p className="font-semibold">Contraseña restablecida correctamente.</p>
          <p className="mt-2 text-sm">Redirigiendo al inicio...</p>
        </div>
      ) : (
        <form onSubmit={manejarEnvio} className="mt-6 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[var(--txt)]">
              Nueva contraseña
            </span>
            <input
              type="password"
              value={nuevaPassword}
              onChange={(e) => setNuevaPassword(e.target.value)}
              required
              minLength={6}
              className="input"
              placeholder="Mínimo 6 caracteres"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[var(--txt)]">
              Confirmar contraseña
            </span>
            <input
              type="password"
              value={confirmarPassword}
              onChange={(e) => setConfirmarPassword(e.target.value)}
              required
              minLength={6}
              className="input"
              placeholder="Repite la contraseña"
            />
          </label>

          {error && <p className="text-sm text-[var(--err-t)]">{error}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="btn-primary disabled:opacity-60"
          >
            {enviando ? "Restableciendo..." : "Restablecer contraseña"}
          </button>
        </form>
      )}
    </>
  );
}

export default function RestablecerContrasenaPage() {
  return (
    <main id="contenido" className="bg-app min-h-app font-sans">
        <section className="mx-auto max-w-xl px-5 py-12 sm:px-6 sm:py-16">
          <div className="card rounded-3xl p-6 sm:p-8">
            <h1 className="text-balance text-2xl font-bold tracking-tight text-[var(--txt)] sm:text-3xl">
              Restablecer contraseña
            </h1>
            <p className="mt-2 text-[var(--txt2)]">
              Introduce tu nueva contraseña.
            </p>
            <Suspense
              fallback={
                <p className="mt-6 text-[var(--txt2)]">Cargando...</p>
              }
            >
              <RestablecerContrasenaFormulario />
            </Suspense>
          </div>
        </section>
      </main>
  );
}
