"use client";

import { useTranslations } from "next-intl";
import {
  buscarPais,
  normalizarCodigoPais,
  normalizarNumeroTelefono,
} from "@/lib/telefono";

type PhoneFieldProps = {
  id: string;
  codigo: string;
  numero: string;
  onCambiarCodigo: (valor: string) => void;
  onCambiarNumero: (valor: string) => void;
  autoFocus?: boolean;
  autoComplete?: "tel" | "off";
};

const CLASE_INPUT =
  "h-12 w-full min-w-0 rounded-xl border border-[var(--th)] bg-[var(--card2)] text-base text-[var(--txt)] outline-none backdrop-blur-sm placeholder:text-[var(--txt3)] transition-colors focus:border-[var(--azul)] focus:ring-2 focus:ring-[var(--azul)]/30 sm:text-sm";

export default function PhoneField({
  id,
  codigo,
  numero,
  onCambiarCodigo,
  onCambiarNumero,
  autoFocus = false,
  autoComplete = "tel",
}: PhoneFieldProps) {
  const t = useTranslations("Auth");
  const pais = buscarPais(codigo);
  const etiquetaPais = pais
    ? pais.nombre
    : codigo
      ? t("phone.invalidCountry")
      : t("phone.country");

  return (
    <div>
      <label
        htmlFor={`${id}-codigo`}
        className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
      >
        {t("phone.label")}
      </label>

      <div className="grid grid-cols-[minmax(0,1fr)_4.75rem_minmax(0,1.2fr)] gap-2">
        <div
          className={`flex h-12 min-w-0 items-center rounded-xl border px-3 text-xs font-semibold ${
            pais
              ? "border-[var(--th)] bg-[var(--suave)] text-[var(--txt)]"
              : codigo
                ? "border-[var(--err-b)] bg-[var(--err)] text-[var(--err-t)]"
                : "border-[var(--th)] bg-[var(--suave)] text-[var(--txt3)]"
          }`}
          aria-live="polite"
          title={pais?.nombre}
        >
          <span className="truncate">{etiquetaPais}</span>
        </div>

        <div className="relative min-w-0">
          {pais ? (
            <span
              className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm font-bold text-[var(--txt2)]"
              aria-hidden="true"
            >
              +
            </span>
          ) : null}

          <input
            id={`${id}-codigo`}
            name={`${id}-codigo`}
            type="text"
            inputMode="numeric"
            autoComplete={
              autoComplete === "tel" ? "tel-country-code" : "off"
            }
            value={codigo}
            onChange={(evento) =>
              onCambiarCodigo(normalizarCodigoPais(evento.target.value))
            }
            placeholder="00"
            aria-label={t("phone.codeLabel")}
            autoFocus={autoFocus}
            maxLength={4}
            className={`${CLASE_INPUT} pr-2 text-center ${
              pais ? "pl-6" : "pl-2"
            }`}
          />
        </div>

        <input
          id={`${id}-numero`}
          name={`${id}-numero`}
          type="tel"
          inputMode="numeric"
          autoComplete={autoComplete === "tel" ? "tel-national" : "off"}
          value={numero}
          onChange={(evento) =>
            onCambiarNumero(
              normalizarNumeroTelefono(evento.target.value),
            )
          }
          placeholder="Número"
          aria-label={t("phone.numberLabel")}
          maxLength={15}
          className={`${CLASE_INPUT} px-3`}
        />
      </div>

      <p className="mt-2 text-xs text-[var(--txt3)]">
        {t("phone.help")}
      </p>
    </div>
  );
}
