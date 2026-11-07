"use client";

import { useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { CLAVE_EMAIL_VERIFICACION } from "@/lib/verificacion-pago";

export default function AvisoVerificacionPago({
  mostrar,
}: {
  mostrar: boolean;
}) {
  const t = useTranslations("Dashboard");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!mostrar) return;

    const id = window.setTimeout(() => {
      try {
        setEmail(
          window.sessionStorage.getItem(CLAVE_EMAIL_VERIFICACION) || "",
        );
      } catch {
        setEmail("");
      }
    }, 0);

    return () => window.clearTimeout(id);
  }, [mostrar]);

  if (!mostrar) return null;

  return (
    <div
      role="status"
      className="mb-8 flex gap-3 rounded-2xl border border-[var(--azul)]/30 bg-[var(--sel)] p-4 text-sm leading-relaxed text-[var(--azul)] shadow-[var(--sombra)]"
    >
      <MailCheck
        className="mt-0.5 h-5 w-5 shrink-0"
        strokeWidth={2}
        aria-hidden="true"
      />
      <p>
        {t("paymentVerification", {
          email:
            email.trim() || t("paymentVerificationFallbackEmail"),
        })}
      </p>
    </div>
  );
}
