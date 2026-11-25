"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, FileText, Layers, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import ModalConfirmacion from "@/components/ModalConfirmacion";
import { useNotification } from "@/components/NotificationProvider";

type Resumen = {
  archivo: string;
  titulo: string;
  fecha: string;
  tamano: number;
};

/** Mínimo de resúmenes que necesita el test mixto. */
const MIN_RESUMENES_MIXTO = 2;

export default function ListaResumenes({
  carpeta,
  seleccionados,
  onAlternarSeleccion,
  onEliminado,
  bloqueada = false,
  onCrearTestMixto,
  creandoTestMixto = false,
}: {
  carpeta: string;
  seleccionados: string[];
  onAlternarSeleccion: (archivo: string) => void;
  onEliminado?: (archivo: string) => void;
  bloqueada?: boolean;
  onCrearTestMixto: () => void;
  creandoTestMixto?: boolean;
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

  const totalSeleccionados = seleccionados.length;
  const puedeCrearMixto =
    totalSeleccionados >= MIN_RESUMENES_MIXTO &&
    !bloqueada &&
    !creandoTestMixto;
  const faltanResumenes = totalSeleccionados < MIN_RESUMENES_MIXTO;
  const textoAyuda = faltanResumenes
    ? t("mixedTest.needTwo")
    : t("mixedTest.ready", { count: totalSeleccionados });

  return (
    <section className="mt-6">
      {/* Cabecera del test mixto: siempre visible, se atenúa si no hay
          resúmenes suficientes seleccionados. */}
      <div className="rounded-2xl border border-white/40 bg-gradient-to-br from-sky-100/70 to-blue-300/50 p-4 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-none dark:bg-[#141b2d]/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-bold text-[var(--txt)]">
              <Layers
                className="h-4 w-4 shrink-0 text-[var(--azul)]"
                strokeWidth={2}
                aria-hidden="true"
              />
              {t("mixedTest.title")}
            </p>
            <p
              id="mixto-resumenes-ayuda"
              className={`mt-1 text-xs ${
                faltanResumenes
                  ? "font-semibold text-[var(--txt3)]"
                  : "text-[var(--txt2)]"
              }`}
            >
              {textoAyuda}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (puedeCrearMixto) {
                onCrearTestMixto();
              }
            }}
            disabled={!puedeCrearMixto}
            title={
              puedeCrearMixto ? t("mixedTest.create") : t("mixedTest.needTwo")
            }
            aria-describedby="mixto-resumenes-ayuda"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--azul)] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[var(--azul-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[var(--suave2)] disabled:text-[var(--txt3)] disabled:opacity-70 disabled:shadow-none disabled:hover:bg-[var(--suave2)]"
          >
            <Layers className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            {t("mixedTest.create")}
            {totalSeleccionados > 0 ? ` (${totalSeleccionados})` : ""}
          </button>
        </div>
      </div>

      {cargando ? (
        <div className="mt-6 animate-pulse rounded-2xl border border-[var(--th)] bg-[var(--card)] p-5">
          <div className="h-5 w-40 rounded bg-[var(--suave2)]" />
          <div className="mt-3 h-4 w-3/4 rounded bg-[var(--suave2)]" />
        </div>
      ) : resumenes.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[var(--th)] bg-[var(--card2)] p-8 text-center">
          <p className="text-sm italic text-[var(--txt3)]">
            {t("list.empty")}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-3 mt-6 flex items-center justify-between">
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
        </>
      )}

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
