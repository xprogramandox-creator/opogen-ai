"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

type Estado = "correcta" | "fallo" | null;

export default function ExamenHero() {
  const t = useTranslations("ExamenHero");

  const opciones: { letra: string; texto: string; estado: Estado }[] = [
    { letra: "A", texto: t("optionA"), estado: null },
    { letra: "B", texto: t("optionB"), estado: "correcta" },
    { letra: "C", texto: t("optionC"), estado: null },
    { letra: "D", texto: t("optionD"), estado: "fallo" },
  ];

  return (
    <div className="rounded-2xl border border-[#1f1b16]/10 bg-[#ffffff] shadow-[0_1px_2px_rgba(31,27,22,0.05),0_8px_24px_rgba(31,27,22,0.07)] dark:border-[#efe9de]/10 dark:bg-[#1c1a18] dark:shadow-none">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-4 px-6 pt-6 sm:px-8 sm:pt-7">
        <div>
          <p className="font-mono text-xs text-[#7b7266] dark:text-[#8a847a]">
            {t("exam")} · {t("subject")}
          </p>
          <p className="mt-1 text-base font-medium text-[#1f1b16] dark:text-[#efe9de]">
            {t("title")}
          </p>
        </div>
        <span className="rounded-md border border-[#1f1b16]/10 px-2 py-1 font-mono text-xs text-[#5e554a] dark:border-[#efe9de]/10 dark:text-[#aaa398]">
          {t("type")}
        </span>
      </div>

      {/* Pregunta */}
      <div className="mt-6 border-t border-[#1f1b16]/10 px-6 pt-5 dark:border-[#efe9de]/10 sm:px-8">
        <p className="font-mono text-xs text-[#7b7266] dark:text-[#8a847a]">
          {t("progress")}
        </p>
        <h3 className="mt-2 text-lg font-medium leading-snug text-[#1f1b16] dark:text-[#efe9de]">
          {t("question")}
        </h3>

        <ul className="mt-5 space-y-2">
          {opciones.map(({ letra, texto, estado }) => (
            <li
              key={letra}
              className={
                estado === "correcta"
                  ? "flex items-center gap-3 rounded-lg border border-[#16a34a]/40 bg-[#16a34a]/10 px-4 py-3 dark:border-[#4cc38a]/40 dark:bg-[#4cc38a]/10"
                  : estado === "fallo"
                    ? "flex items-center gap-3 rounded-lg border border-[#dc2626]/40 bg-[#dc2626]/10 px-4 py-3 dark:border-[#e5484d]/40 dark:bg-[#e5484d]/10"
                    : "flex items-center gap-3 rounded-lg border border-[#1f1b16]/10 px-4 py-3 dark:border-[#efe9de]/10"
              }
            >
              <span className="font-mono text-xs text-[#7b7266] dark:text-[#8a847a]">
                {letra}
              </span>
              <span className="flex-1 text-sm text-[#1f1b16] dark:text-[#efe9de]">
                {texto}
              </span>
              {estado === "correcta" ? (
                <Check
                  className="h-4 w-4 text-[#16a34a] dark:text-[#4cc38a]"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              ) : estado === "fallo" ? (
                <X
                  className="h-4 w-4 text-[#dc2626] dark:text-[#e5484d]"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {/* Corrección */}
      <div className="mx-6 mt-5 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg bg-[#efe9df]/70 px-4 py-3 dark:bg-[#262421] sm:mx-8">
        <p className="flex items-center gap-2 text-sm text-[#5e554a] dark:text-[#aaa398]">
          <X
            className="h-4 w-4 text-[#dc2626] dark:text-[#e5484d]"
            strokeWidth={2}
            aria-hidden="true"
          />
          {t("yourAnswer", { letter: "D" })}
        </p>
        <p className="flex items-center gap-2 text-sm text-[#5e554a] dark:text-[#aaa398]">
          <Check
            className="h-4 w-4 text-[#16a34a] dark:text-[#4cc38a]"
            strokeWidth={2}
            aria-hidden="true"
          />
          {t("correctAnswer", { letter: "B" })}
        </p>
      </div>

      {/* Meta */}
      <div className="mt-6 flex items-center justify-between border-t border-[#1f1b16]/10 px-6 py-4 font-mono text-xs text-[#7b7266] dark:border-[#efe9de]/10 dark:text-[#8a847a] sm:px-8">
        <span>{t("score", { correct: 8, total: 10 })}</span>
        <span>{t("time")}</span>
      </div>
    </div>
  );
}

