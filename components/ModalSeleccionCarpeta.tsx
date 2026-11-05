"use client";

import { useState } from "react";
import { Folder, FolderPlus, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";

export type ResultadoCrearCarpeta =
  | { estado: "ok"; nombre: string }
  | { estado: "exists" | "invalid" | "error" };

export default function ModalSeleccionCarpeta({
  abierto,
  carpetas,
  onCerrar,
  onSeleccionar,
  onCrearCarpeta,
}: {
  abierto: boolean;
  carpetas: string[];
  onCerrar: () => void;
  onSeleccionar: (carpeta: string) => void;
  onCrearCarpeta: (nombre: string) => Promise<ResultadoCrearCarpeta>;
}) {
  const t = useTranslations("Resumenes");
  const [nombreNueva, setNombreNueva] = useState("");
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");

  if (!abierto) {
    return null;
  }

  async function crearCarpeta(): Promise<void> {
    const nombre = nombreNueva.trim();

    if (!nombre) {
      setError(t("folderModal.invalidName"));
      return;
    }

    setCreando(true);
    setError("");

    try {
      const resultado = await onCrearCarpeta(nombre);

      if (resultado.estado === "ok") {
        setNombreNueva("");
        onSeleccionar(resultado.nombre);
        return;
      }

      setError(
        resultado.estado === "exists"
          ? t("folderModal.exists")
          : resultado.estado === "invalid"
            ? t("folderModal.invalidName")
            : t("folderModal.createError"),
      );
    } finally {
      setCreando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-carpeta-resumen"
        className="w-full max-w-md rounded-3xl border border-[var(--th)] bg-[var(--card)] p-6 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--azul)]">
              {t("button.create")}
            </p>
            <h2
              id="titulo-carpeta-resumen"
              className="mt-2 text-xl font-black text-[var(--txt)]"
            >
              {t("folderModal.title")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--txt2)]">
              {t("folderModal.description")}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg p-1 text-[var(--txt3)] hover:bg-[var(--suave2)] hover:text-[var(--txt)]"
            aria-label={t("duplicate.close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 max-h-56 space-y-2 overflow-y-auto pr-1">
          {carpetas.length === 0 ? (
            <p className="rounded-xl border border-[var(--th)] bg-[var(--card2)] px-4 py-3 text-sm text-[var(--txt2)]">
              {t("folderModal.empty")}
            </p>
          ) : (
            carpetas.map((carpeta) => (
              <button
                key={carpeta}
                type="button"
                onClick={() => onSeleccionar(carpeta)}
                className="flex w-full items-center gap-3 rounded-xl border border-[var(--th)] bg-[var(--card2)] px-4 py-3 text-left text-sm font-semibold text-[var(--txt2)] transition-colors hover:border-[var(--azul)]/50 hover:bg-[var(--sel)] hover:text-[var(--txt)]"
              >
                <Folder className="h-5 w-5 shrink-0 text-[var(--azul)]" />
                <span className="truncate">{carpeta}</span>
              </button>
            ))
          )}
        </div>

        <div className="mt-5 border-t border-[var(--th)] pt-5">
          <p className="flex items-center gap-2 text-sm font-bold text-[var(--txt)]">
            <FolderPlus className="h-4 w-4 text-[var(--azul)]" />
            {t("folderModal.newFolder")}
          </p>
          <div className="mt-2 flex gap-2">
            <input
              value={nombreNueva}
              onChange={(event) => {
                setNombreNueva(event.target.value);
                setError("");
              }}
              placeholder={t("folderModal.placeholder")}
              className="min-w-0 flex-1 rounded-xl border border-[var(--th)] bg-[var(--card2)] px-3 py-2.5 text-sm text-[var(--txt)] outline-none focus:border-[var(--azul)] focus:ring-2 focus:ring-[var(--azul)]/30"
            />
            <button
              type="button"
              disabled={creando}
              onClick={() => void crearCarpeta()}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[var(--azul)] px-4 py-2.5 text-sm font-bold text-[var(--btn-txt)] hover:bg-[var(--azul-hover)] disabled:cursor-wait disabled:opacity-60"
            >
              {creando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {creando
                ? t("folderModal.creating")
                : t("folderModal.create")}
            </button>
          </div>
          {error ? (
            <p className="mt-2 text-sm font-semibold text-[var(--err-t)]">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl border border-[var(--th)] px-4 py-2.5 text-sm font-bold text-[var(--txt2)] hover:bg-[var(--suave)]"
          >
            {t("folderModal.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
