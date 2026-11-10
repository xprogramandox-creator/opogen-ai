"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import PhoneField from "@/components/PhoneField";
import {
  buscarPais,
  esNumeroTelefonoValido,
} from "@/lib/telefono";
import { correoValido, nombreValido } from "@/lib/validacion";

export type PlanCheckout = "mensual" | "semestral" | "anual";

type UsuarioCheckout = {
  nombre: string;
  correo: string;
  telefono: string;
} | null;

const PLANES: Record<
  PlanCheckout,
  { nombre: string; precio: string; detalle: string }
> = {
  mensual: {
    nombre: "Plan Mensual",
    precio: "10,89 €",
    detalle: "Renovación mensual",
  },
  semestral: {
    nombre: "Plan Semestral",
    precio: "58,08 €",
    detalle: "Cada 6 meses",
  },
  anual: {
    nombre: "Plan Anual",
    precio: "84,00 €",
    detalle: "Cada 12 meses",
  },
};

const CLASE_CAMPO =
  "h-12 w-full rounded-xl border border-[var(--th)] bg-[var(--card2)] px-3 text-base text-[var(--txt)] outline-none placeholder:text-[var(--txt3)] focus:border-[var(--azul)] focus:ring-2 focus:ring-[var(--azul)]/30 disabled:cursor-not-allowed disabled:opacity-70 sm:text-sm";

export default function CheckoutForm({
  plan,
  usuario,
  modoModal = false,
  onClose,
}: {
  plan: PlanCheckout;
  usuario: UsuarioCheckout;
  modoModal?: boolean;
  onClose?: () => void;
}) {
  const t = useTranslations("Checkout");
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [correo, setCorreo] = useState(usuario?.correo ?? "");
  const [codigo, setCodigo] = useState(
    usuario?.telefono.split("_")[0] ?? "",
  );
  const [numero, setNumero] = useState(
    usuario?.telefono.split("_")[1] ?? "",
  );
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const datosPlan = PLANES[plan];

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (enviando) return;
    setError("");

    if (!usuario) {
      const pais = buscarPais(codigo);

      if (!nombreValido(nombre)) {
        setError("Escribe un nombre válido.");
        return;
      }
      if (!correoValido(correo)) {
        setError("Escribe un correo electrónico válido.");
        return;
      }
      if (!pais || !esNumeroTelefonoValido(numero)) {
        setError("Escribe un teléfono válido.");
        return;
      }
    } else if (!password) {
      setError(t("passwordRequired"));
      return;
    }

    setEnviando(true);

    try {
      const endpoint = usuario
        ? "/api/stripe/checkout"
        : "/api/stripe/checkout-invitado";

      const respuesta = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          nombre,
          correo,
          codigo,
          numero,
          ...(usuario ? { password } : {}),
        }),
        cache: "no-store",
      });

      const datos = (await respuesta.json().catch(() => ({}))) as {
        url?: unknown;
        error?: unknown;
      };

      if (!respuesta.ok || typeof datos.url !== "string") {
        setError(
          typeof datos.error === "string"
            ? datos.error
            : "No se pudo iniciar el pago.",
        );
        return;
      }

      // Se limpia antes de salir para que al volver el formulario esté vacío.
      setNombre("");
      setCorreo("");
      setCodigo("");
      setNumero("");
      setPassword("");

      window.location.href = datos.url;
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="card rounded-3xl p-6 sm:p-8">
      <div className="mb-6 rounded-2xl border border-[var(--azul)] bg-[var(--sel)] p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--azul)]">
          Resumen del plan
        </p>
        <p className="mt-1 text-xl font-bold text-[var(--txt)]">
          {datosPlan.nombre} · {datosPlan.precio}
        </p>
        <p className="mt-1 text-xs font-medium text-[var(--txt3)]">
          {t("vatIncluded")}
        </p>
        <p className="mt-1 text-sm text-[var(--txt2)]">
          {datosPlan.detalle}
        </p>
      </div>

      {usuario ? (
        <p className="mb-5 text-sm font-medium text-[var(--ok-t)]">
          Sesión iniciada. Los datos de tu cuenta están bloqueados.
        </p>
      ) : null}

      <form onSubmit={enviar} className="space-y-4">
        <div>
          <label
            htmlFor="checkout-nombre"
            className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
          >
            Nombre completo
          </label>
          <input
            id="checkout-nombre"
            type="text"
            autoComplete="name"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            readOnly={Boolean(usuario)}
            className={CLASE_CAMPO}
            placeholder="Tu nombre y apellidos"
          />
        </div>

        <div>
          <label
            htmlFor="checkout-correo"
            className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
          >
            Correo electrónico
          </label>
          <input
            id="checkout-correo"
            type="email"
            autoComplete="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            readOnly={Boolean(usuario)}
            className={CLASE_CAMPO}
            placeholder="tu@ejemplo.com"
          />
        </div>

        {usuario ? (
          <div>
            <label className="mb-2 block text-sm font-semibold text-[var(--txt2)]">
              Teléfono
            </label>
            <input
              value={`+${codigo} ${numero}`}
              readOnly
              className={CLASE_CAMPO}
            />
          </div>
        ) : (
          <PhoneField
            id="checkout-telefono"
            codigo={codigo}
            numero={numero}
            onCambiarCodigo={setCodigo}
            onCambiarNumero={setNumero}
          />
        )}

        {usuario ? (
          <div>
            <label
              htmlFor="checkout-password"
              className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
            >
              {t("passwordLabel")}
            </label>
            <input
              id="checkout-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={CLASE_CAMPO}
              placeholder={t("passwordPlaceholder")}
              required
            />
          </div>
        ) : null}

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
          disabled={enviando}
          className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[var(--azul)] px-5 text-sm font-bold text-[var(--btn-txt)] transition-colors hover:bg-[var(--azul-hover)] disabled:cursor-wait disabled:opacity-60"
        >
          {enviando ? "Redirigiendo a Stripe..." : "Ir a Pagar"}
        </button>

        <Link
          href={usuario ? "/dashboard" : "/premium"}
          onClick={
            modoModal && onClose
              ? (evento) => {
                  evento.preventDefault();
                  onClose();
                }
              : undefined
          }
          className="block text-center text-sm font-semibold text-[var(--txt2)] underline underline-offset-4 hover:text-[var(--azul)]"
        >
          {usuario ? "Volver al panel" : "Volver a los planes"}
        </Link>
      </form>
    </div>
  );
}
