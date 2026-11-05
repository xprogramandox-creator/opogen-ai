"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  obtenerRequisitosPassword,
  passwordValida,
  PASSWORD_MAXIMA,
} from "@/lib/validacion";

const CLASE_CAMPO =
  "h-12 w-full rounded-xl border border-[var(--th)] bg-[var(--card2)] px-3 text-base text-[var(--txt)] outline-none placeholder:text-[var(--txt3)] focus:border-[var(--azul)] focus:ring-2 focus:ring-[var(--azul)]/30 sm:text-sm";

function FormularioRestablecer() {
  const busqueda = useSearchParams();
  const router = useRouter();
  const token = busqueda.get("token") || "";

  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);

  const requisitos = obtenerRequisitosPassword(nuevaPassword);
  const cumpleRequisitos =
    nuevaPassword.length >= 8 && passwordValida(nuevaPassword);
  const coinciden =
    confirmarPassword.length > 0 &&
    nuevaPassword === confirmarPassword;
  const formularioValido = cumpleRequisitos && coinciden;

  async function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");

    if (!token) {
      setError("Token inválido o caducado.");
      return;
    }

    if (!cumpleRequisitos) {
      setError("La contraseña no cumple los requisitos de seguridad.");
      return;
    }

    if (!coinciden) {
      setError("Las contraseñas no coinciden.");
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
        setError(datos?.error || "No se pudo restablecer la contraseña.");
        return;
      }

      setExito(true);
      window.setTimeout(() => {
        router.push("/?login=1");
      }, 1800);
    } catch {
      setError("Error de conexión.");
    } finally {
      setEnviando(false);
    }
  }

  if (!token) {
    return (
      <div className="rounded-2xl border border-[var(--err-b)] bg-[var(--err)] p-4 text-[var(--err-t)]">
        <p className="font-semibold">Token inválido o caducado.</p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-block btn-ghost"
        >
          Solicitar un nuevo enlace
        </Link>
      </div>
    );
  }

  if (exito) {
    return (
      <div className="rounded-2xl border border-[var(--ok-b)] bg-[var(--ok)] p-4 text-[var(--ok-t)]">
        <p className="font-semibold">
          Contraseña restablecida correctamente.
        </p>
        <p className="mt-2 text-sm">Redirigiendo al inicio de sesión...</p>
      </div>
    );
  }

  return (
    <form onSubmit={manejarEnvio} className="grid gap-4" noValidate>
      <div>
        <label
          htmlFor="reset-password"
          className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
        >
          Nueva contraseña
        </label>
        <input
          id="reset-password"
          type="password"
          autoComplete="new-password"
          value={nuevaPassword}
          onChange={(e) => setNuevaPassword(e.target.value)}
          maxLength={PASSWORD_MAXIMA}
          className={CLASE_CAMPO}
        />
      </div>

      <ul className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
        <li
          className={
            nuevaPassword.length >= 8
              ? "text-[var(--ok-t)]"
              : "text-[var(--txt3)]"
          }
        >
          • Mínimo 8 caracteres
        </li>
        {requisitos.map((requisito) => (
          <li
            key={requisito.id}
            className={
              requisito.cumple
                ? "text-[var(--ok-t)]"
                : "text-[var(--txt3)]"
            }
          >
            • {requisito.etiqueta}
          </li>
        ))}
      </ul>

      <div>
        <label
          htmlFor="reset-password-repetida"
          className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
        >
          Repetir contraseña
        </label>
        <input
          id="reset-password-repetida"
          type="password"
          autoComplete="new-password"
          value={confirmarPassword}
          onChange={(e) => setConfirmarPassword(e.target.value)}
          maxLength={PASSWORD_MAXIMA}
          className={CLASE_CAMPO}
        />
        {confirmarPassword.length > 0 && !coinciden ? (
          <p className="mt-1 text-xs text-[var(--err-t)]">
            Las contraseñas no coinciden.
          </p>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-[var(--err-b)] bg-[var(--err)] px-3 py-2 text-sm font-medium text-[var(--err-t)]"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!formularioValido || enviando}
        className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enviando ? "Restableciendo..." : "Restablecer contraseña"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main id="contenido" className="bg-app min-h-app font-sans">
      <section className="mx-auto max-w-xl px-5 py-12 sm:px-6 sm:py-16">
        <div className="card rounded-3xl p-6 sm:p-8">
          <h1 className="text-balance text-2xl font-bold tracking-tight text-[var(--txt)] sm:text-3xl">
            Restablecer contraseña
          </h1>
          <p className="mt-2 text-[var(--txt2)]">
            Introduce y confirma tu nueva contraseña.
          </p>

          <div className="mt-6">
            <Suspense
              fallback={
                <p className="text-[var(--txt2)]">Cargando...</p>
              }
            >
              <FormularioRestablecer />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}
