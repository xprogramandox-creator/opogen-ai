"use client";

import { useRef, useState } from "react";
import { FileText, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useNotification } from "@/components/NotificationProvider";
import ModalSeleccionCarpeta, {
  type ResultadoCrearCarpeta,
} from "@/components/ModalSeleccionCarpeta";

type Duplicado = {
  archivo: string;
  nombre: string;
  error: string;
};

function nombreSugerido(archivo: string): string {
  return archivo.replace(/\.md$/i, "") + " (2).md";
}

export default function BotonResumen({
  carpetas,
  onCarpetaCreada,
}: {
  carpetas: string[];
  onCarpetaCreada?: () => void;
}) {
  const { notificar } = useNotification();
  const t = useTranslations("Resumenes");
  const inputRef = useRef<HTMLInputElement>(null);
  const carpetaRef = useRef<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [modalCarpeta, setModalCarpeta] = useState(false);
  const [duplicado, setDuplicado] = useState<Duplicado | null>(null);
  const [archivoPendiente, setArchivoPendiente] =
    useState<File | null>(null);

  async function generar(
    archivo: File,
    nombreArchivo?: string,
  ): Promise<void> {
    const carpeta = carpetaRef.current;

    if (!carpeta) {
      setModalCarpeta(true);
      return;
    }

    setGenerando(true);

    try {
      const respuestaCsrf = await fetch("/api/auth/csrf", {
        cache: "no-store",
      });
      const datosCsrf = (await respuestaCsrf.json().catch(() => ({}))) as {
        csrfToken?: string;
      };
      const cuerpo = new FormData();
      cuerpo.append("archivo", archivo);
      cuerpo.append("carpeta", carpeta);

      if (nombreArchivo) {
        cuerpo.append("nombreArchivo", nombreArchivo);
      }

      const respuesta = await fetch("/api/resumenes/generar", {
        method: "POST",
        headers: {
          "X-CSRF-Token": String(datosCsrf.csrfToken || ""),
        },
        body: cuerpo,
      });
      const datos = (await respuesta.json().catch(() => ({}))) as {
        archivo?: string;
        codigo?: string;
      };

      if (!respuesta.ok) {
        if (datos.codigo === "RESUMEN_EXISTENTE") {
          setArchivoPendiente(archivo);

          if (nombreArchivo) {
            setDuplicado((actual) => ({
              archivo: datos.archivo || actual?.archivo || nombreArchivo,
              nombre: actual?.nombre || nombreArchivo,
              error: t("duplicate.existsAgain"),
            }));
          } else {
            const archivoConflicto =
              datos.archivo ||
              archivo.name.replace(/\.pdf$/i, ".md");
            setDuplicado({
              archivo: archivoConflicto,
              nombre: nombreSugerido(archivoConflicto),
              error: "",
            });
          }

          return;
        }

        if (datos.codigo === "PREMIUM_REQUERIDO") {
          throw new Error(t("errors.PREMIUM_REQUERIDO"));
        }

        throw new Error(
          datos.codigo
            ? t(`errors.${datos.codigo}`)
            : t("notifications.generic"),
        );
      }

      setDuplicado(null);
      setArchivoPendiente(null);

      notificar({
        titulo: t("notifications.createdTitle"),
        mensaje: t("notifications.createdMessage", {
          archivo: datos.archivo || "",
        }),
        tipo: "exito",
      });

      window.dispatchEvent(new Event("opogen:resumen-creado"));
    } catch (err) {
      notificar({
        titulo: t("notifications.errorTitle"),
        mensaje:
          err instanceof Error
            ? err.message
            : t("notifications.generic"),
        tipo: "peligro",
      });
    } finally {
      setGenerando(false);
    }
  }

  async function crearCarpeta(
    nombre: string,
  ): Promise<ResultadoCrearCarpeta> {
    try {
      const respuestaCsrf = await fetch("/api/auth/csrf", {
        cache: "no-store",
      });
      const datosCsrf = (await respuestaCsrf.json().catch(() => ({}))) as {
        csrfToken?: string;
      };
      const respuesta = await fetch("/api/carpetas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": String(datosCsrf.csrfToken || ""),
        },
        body: JSON.stringify({ nombre }),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as {
        nombreSaneado?: string;
      };

      if (respuesta.ok) {
        onCarpetaCreada?.();

        return {
          estado: "ok",
          nombre: String(datos.nombreSaneado || nombre),
        };
      }

      if (respuesta.status === 409) {
        return { estado: "exists" };
      }

      if (respuesta.status === 400) {
        return { estado: "invalid" };
      }

      return { estado: "error" };
    } catch {
      return { estado: "error" };
    }
  }

  function seleccionarCarpeta(carpeta: string): void {
    carpetaRef.current = carpeta;
    setModalCarpeta(false);

    window.setTimeout(() => {
      inputRef.current?.click();
    }, 0);
  }

  function guardarConOtroNombre(): void {
    if (!duplicado || !archivoPendiente) return;

    const nombre = duplicado.nombre.trim();

    if (!nombre) {
      setDuplicado({ ...duplicado, error: t("duplicate.emptyName") });
      return;
    }

    const nombreFinal = /\.md$/i.test(nombre) ? nombre : `${nombre}.md`;
    void generar(archivoPendiente, nombreFinal);
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="sr-only"
        onChange={(event) => {
          const archivo = event.target.files?.[0];
          event.target.value = "";

          if (archivo) {
            void generar(archivo);
          }
        }}
      />

      <button
        type="button"
        disabled={generando}
        onClick={() => setModalCarpeta(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--azul)]/30 bg-gradient-to-r from-[var(--azul)] to-[#06b6d4] px-4 py-3 text-sm font-bold text-[var(--btn-txt)] shadow-sm transition-all hover:from-[var(--azul-hover)] hover:to-[#0891b2] hover:shadow-md disabled:cursor-wait disabled:opacity-60"
        title={t("button.tooltip")}
      >
        <FileText className="h-5 w-5 shrink-0 text-current" aria-hidden="true" />
        {generando ? t("button.generating") : t("sidebar.create")}
      </button>

      <ModalSeleccionCarpeta
        abierto={modalCarpeta}
        carpetas={carpetas}
        onCerrar={() => setModalCarpeta(false)}
        onSeleccionar={seleccionarCarpeta}
        onCrearCarpeta={crearCarpeta}
      />

      {duplicado ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              guardarConOtroNombre();
            }}
            className="w-full max-w-md rounded-3xl border border-[var(--th)] bg-[var(--card)] p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--azul)]">
                  {t("duplicate.eyebrow")}
                </p>
                <h3 className="mt-2 text-xl font-black text-[var(--txt)]">
                  {t("duplicate.title")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDuplicado(null);
                  setArchivoPendiente(null);
                }}
                className="rounded-lg p-1 text-[var(--txt3)] hover:bg-[var(--suave2)] hover:text-[var(--txt)]"
                aria-label={t("duplicate.close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-[var(--txt2)]">
              {t("duplicate.description")}
            </p>

            <label className="mt-5 block text-sm font-bold text-[var(--txt)]">
              {t("duplicate.fieldLabel")}
              <input
                value={duplicado.nombre}
                onChange={(event) =>
                  setDuplicado({
                    ...duplicado,
                    nombre: event.target.value,
                    error: "",
                  })
                }
                autoFocus
                className="mt-2 w-full rounded-xl border border-[var(--th)] bg-[var(--card2)] px-4 py-3 text-[var(--txt)] outline-none focus:border-[var(--azul)] focus:ring-2 focus:ring-[var(--azul)]/30"
              />
            </label>

            {duplicado.error ? (
              <p className="mt-2 text-sm font-semibold text-[var(--err-t)]">
                {duplicado.error}
              </p>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDuplicado(null);
                  setArchivoPendiente(null);
                }}
                className="rounded-xl border border-[var(--th)] px-4 py-2.5 text-sm font-bold text-[var(--txt2)] hover:bg-[var(--suave)]"
              >
                {t("duplicate.cancel")}
              </button>
              <button
                type="submit"
                disabled={generando}
                className="rounded-xl bg-[var(--azul)] px-4 py-2.5 text-sm font-bold text-[var(--btn-txt)] hover:bg-[var(--azul-hover)] disabled:cursor-wait disabled:opacity-60"
              >
                {generando
                  ? t("duplicate.saving")
                  : t("duplicate.save")}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
