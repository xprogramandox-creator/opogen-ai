"use client";

import { useState } from "react";
import Link from "next/link";
import PhoneField from "@/components/PhoneField";
import {
  buscarPais,
  esNumeroTelefonoValido,
} from "@/lib/telefono";

export default function ForgotPasswordPage() {
  const [codigo, setCodigo] = useState("");
  const [numero, setNumero] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  async function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");

    if (!buscarPais(codigo) || !esNumeroTelefonoValido(numero)) {
      setError("Escribe un teléfono válido.");
      return;
    }

    setEnviando(true);

    try {
      const respuesta = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, numero }),
      });

      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => null);
        setError(datos?.error || "No se pudo enviar la solicitud.");
        return;
      }

      setEnviado(true);
    } catch {
      setError("Error de conexión.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main id="contenido" className="bg-app min-h-app font-sans">
      <section className="mx-auto max-w-xl px-5 py-12 sm:px-6 sm:py-16">
        <div className="card rounded-3xl p-6 sm:p-8">
          <h1 className="text-balance text-2xl font-bold tracking-tight text-[var(--txt)] sm:text-3xl">
            ¿Has olvidado tu contraseña?
          </h1>

          <p className="mt-2 text-[var(--txt2)]">
            Introduce el teléfono de tu cuenta y te enviaremos un enlace para
            restablecerla.
          </p>

          {enviado ? (
            <div className="mt-6 rounded-2xl border border-[var(--ok-b)] bg-[var(--ok)] p-4 text-[var(--ok-t)]">
              <p className="font-semibold">
                Si el número está registrado, recibirás un correo con las
                instrucciones.
              </p>
              <p className="mt-2 text-sm">
                Revisa tu bandeja de entrada y la carpeta de spam.
              </p>
              <Link href="/" className="mt-4 inline-block btn-ghost">
                Volver al inicio
              </Link>
            </div>
          ) : (
            <form onSubmit={manejarEnvio} className="mt-6 grid gap-4">
              <PhoneField
                id="forgot-telefono"
                codigo={codigo}
                numero={numero}
                onCambiarCodigo={setCodigo}
                onCambiarNumero={setNumero}
                autoFocus
              />

              {error ? (
                <p role="alert" className="text-sm text-[var(--err-t)]">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={enviando}
                className="btn-primary disabled:opacity-60"
              >
                {enviando ? "Enviando..." : "Enviar"}
              </button>
            </form>
          )}

          <p className="mt-6 text-sm text-[var(--txt2)]">
            <Link href="/" className="underline">
              Volver a iniciar sesión
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
