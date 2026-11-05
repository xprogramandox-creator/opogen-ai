"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, FileText, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import ModalConfirmacion from "@/components/ModalConfirmacion";
import { useNotification } from "@/components/NotificationProvider";

type Resumen = {
  archivo: string;
  titulo: string;
  fecha: string;
  tamano: number;
};

export default function ListaResumenes({
  carpeta,
  seleccionados,
  onAlternarSeleccion,
  onEliminado,
  bloqueada = false,
}: {
  carpeta: string;
  seleccionados: string[];
  onAlternarSeleccion: (archivo: string) => void;
  onEliminado?: (archivo: string) => void;
  bloqueada?: boolean;
}) {
  const router = useRouter();
  const [resumenes, setResumenes] = useState<Resumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [porEliminar, setPorEliminar] = useState<Resumen | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const { notificar } = useNotification();
  const t = useTranslations("Resumenes");
  const tMiEspacio = useTranslations("MiEspacio");
  const locale = useLocale();

  const cargar = useCallback(async () => {
    setCargando(true);

    try {
      const respuesta = await fetch(
        `/api/resumenes?carpeta=${encodeURIComponent(carpeta)}`,
        { cache: "no-store" },
      );
      const datos = (await respuesta.json().catch(() => ({}))) as {
        resumenes?: Resumen[];
      };

      if (respuesta.ok) {
        setResumenes(Array.isArray(datos.resumenes) ? datos.resumenes : []);
      } else {
        setResumenes([]);
      }
    } catch {
      setResumenes([]);
    } finally {
      setCargando(false);
    }
  }, [carpeta]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void cargar();
    }, 0);

    const alCrear = () => {
      void cargar();
    };

    window.addEventListener("opogen:resumen-creado", alCrear);

    return () => {
      window.clearTimeout(id);
      window.removeEventListener("opogen:resumen-creado", alCrear);
    };
  }, [cargar]);

  async function eliminar(resumen: Resumen): Promise<void> {
    setEliminando(true);

    try {
      const respuestaCsrf = await fetch("/api/auth/csrf", {
        cache: "no-store",
      });
      const datosCsrf = (await respuestaCsrf.json().catch(() => ({}))) as {
        csrfToken?: string;
      };
      const respuesta = await fetch(
        `/api/resumenes/eliminar?carpeta=${encodeURIComponent(
          carpeta,
        )}&archivo=${encodeURIComponent(resumen.archivo)}`,
        {
          method: "DELETE",
          headers: {
            "X-CSRF-Token": String(datosCsrf.csrfToken || ""),
          },
        },
      );
      const datos = (await respuesta.json().catch(() => ({}))) as {
        codigo?: string;
      };

      if (!respuesta.ok) {
        throw new Error(
          datos.codigo
            ? t(`errors.${datos.codigo}`)
            : t("notifications.generic"),
        );
      }

      setResumenes((prev) =>
        prev.filter((item) => item.archivo !== resumen.archivo),
      );
      onEliminado?.(resumen.archivo);
      setPorEliminar(null);
      notificar({
        titulo: t("notifications.deletedTitle"),
        mensaje: t("notifications.deletedMessage", {
          archivo: resumen.archivo,
        }),
        tipo: "exito",
      });
    } catch (error) {
      notificar({
        titulo: t("notifications.deleteErrorTitle"),
        mensaje:
          error instanceof Error
            ? error.message
            : t("notifications.generic"),
        tipo: "peligro",
      });
    } finally {
      setEliminando(false);
    }
  }

  function abrir(resumen: Resumen): void {
    router.push(
      `/mi-espacio/ver-resumen?carpeta=${encodeURIComponent(
        carpeta,
      )}&archivo=${encodeURIComponent(resumen.archivo)}`,
    );
  }

  if (cargando) {
    return (
      <div className="mt-6 animate-pulse rounded-2xl border border-[var(--th)] bg-[var(--card)] p-5">
        <div className="h-5 w-40 rounded bg-[var(--suave2)]" />
        <div className="mt-3 h-4 w-3/4 rounded bg-[var(--suave2)]" />
      </div>
    );
  }

  if (resumenes.length === 0) {
    return null;
  }

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-black text-[var(--txt)]">
          {t("list.title")}
        </h3>
        <span className="text-xs font-semibold text-[var(--txt3)]">
          {t("list.count", { count: resumenes.length })}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {resumenes.map((resumen) => {
          const fecha = new Date(resumen.fecha);
          const marcado = seleccionados.includes(resumen.archivo);

          return (
            <div
              key={resumen.archivo}
              onClick={() => abrir(resumen)}
              className={`group flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-4 transition-colors ${
                marcado
                  ? "border-[var(--azul)] bg-[var(--suave)] ring-1 ring-[var(--azul)]/30"
                  : "border-[var(--th)] bg-[var(--card2)] hover:border-[var(--azul)]/40 hover:bg-[var(--suave)]"
              }`}
            >
              <label
                className={`flex shrink-0 items-center ${
                  bloqueada
                    ? "cursor-not-allowed opacity-40"
                    : "cursor-pointer"
                }`}
                onClick={(event) => event.stopPropagation()}
                title={
                  bloqueada
                    ? tMiEspacio("selectionBlocked")
                    : t("list.select", {
                        archivo: resumen.archivo,
                      })
                }
              >
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() => onAlternarSeleccion(resumen.archivo)}
                  disabled={bloqueada}
                  aria-label={t("list.select", {
                    archivo: resumen.archivo,
                  })}
                  className="h-5 w-5 rounded border-[var(--th)] bg-[var(--card)] accent-[var(--azul)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2 disabled:cursor-not-allowed"
                />
              </label>

              <div className="flex min-w-0 flex-1 items-center gap-3">
                <FileText
                  className="h-6 w-6 shrink-0 text-[var(--azul)]"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--txt2)] group-hover:text-[var(--txt)]">
                    {resumen.archivo}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--txt3)]">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {Number.isNaN(fecha.getTime())
                      ? t("list.fallbackTitle")
                      : fecha.toLocaleDateString(locale, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setPorEliminar(resumen);
                }}
                className="p-2 text-[var(--txt3)] opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                title={t("list.deleteTooltip", {
                  archivo: resumen.archivo,
                })}
                aria-label={t("list.deleteTooltip", {
                  archivo: resumen.archivo,
                })}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      <ModalConfirmacion
        isOpen={porEliminar !== null}
        titulo={t("list.deleteTitle")}
        mensaje={t("list.deleteMessage", {
          archivo: porEliminar?.archivo || "",
        })}
        textoCancelar={t("list.cancel")}
        textoAceptar={t("list.confirm")}
        onCancel={() => {
          if (!eliminando) setPorEliminar(null);
        }}
        onConfirm={() => {
          if (porEliminar) void eliminar(porEliminar);
        }}
      />
    </section>
  );
}
