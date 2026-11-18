"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import ModalConfirmacion from "@/components/ModalConfirmacion";
import { useAuthModal } from "@/components/AuthModalProvider";
import { useNotification } from "@/components/NotificationProvider";

type ExamenAgenda = {
  id: number;
  /** ISO (YYYY-MM-DD) para el calendario y la ordenación. */
  fechaIso: string;
  /** Fecha ya formateada por el backend (DD-MM-YYYY). */
  fecha: string;
  hora: string;
  materia: string;
  tipo: string;
  notas: string;
  dias: number;
};

type ProximoExamen = {
  id: number;
  fecha: string;
  dias: number;
  materia: string;
};

type Formulario = {
  fecha: string;
  hora: string;
  materia: string;
  tipo: string;
  notas: string;
};

const TIPOS = ["test", "oficial", "simulacro"] as const;

const CLASE_CAMPO =
  "h-12 w-full rounded-xl border border-[var(--th)] bg-[var(--card2)] px-3 text-base text-[var(--txt)] outline-none transition-colors placeholder:text-[var(--txt3)] focus:border-[var(--azul)] focus:ring-2 focus:ring-[var(--azul)]/30 sm:text-sm";

function dosDigitos(valor: number): string {
  return String(valor).padStart(2, "0");
}

function isoADdMmAaaa(fechaISO: string): string {
  const [anio, mes, dia] = fechaISO.split("-");

  return anio && mes && dia ? `${dia}-${mes}-${anio}` : "";
}

function ddMmAaaaAIso(valor: string): string | null {
  const coincidencia = /^(\d{2})-(\d{2})-(\d{4})$/.exec(valor.trim());

  if (!coincidencia) {
    return null;
  }

  const [, dia, mes, anio] = coincidencia;
  const fecha = new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia)));

  if (
    fecha.getUTCFullYear() !== Number(anio) ||
    fecha.getUTCMonth() !== Number(mes) - 1 ||
    fecha.getUTCDate() !== Number(dia)
  ) {
    return null;
  }

  return `${anio}-${mes}-${dia}`;
}

function isoDeHoy(): string {
  const hoy = new Date();

  return `${hoy.getFullYear()}-${dosDigitos(hoy.getMonth() + 1)}-${dosDigitos(
    hoy.getDate(),
  )}`;
}

export default function AgendaPage() {
  const t = useTranslations("Agenda");
  const locale = useLocale();
  const { notificar } = useNotification();
  const { abrirAuth } = useAuthModal();

  const [examenes, setExamenes] = useState<ExamenAgenda[]>([]);
  const [proximo, setProximo] = useState<ProximoExamen | null>(null);
  const [cargando, setCargando] = useState(true);
  const [sinSesion, setSinSesion] = useState(false);
  const [errorCarga, setErrorCarga] = useState("");

  const hoyIso = useMemo(() => isoDeHoy(), []);
  const [mes, setMes] = useState(() => {
    const hoy = new Date();

    return { anio: hoy.getFullYear(), mes: hoy.getMonth() };
  });

  const [modal, setModal] = useState<
    { modo: "crear" } | { modo: "editar"; id: number } | null
  >(null);
  const [formulario, setFormulario] = useState<Formulario>({
    fecha: "",
    hora: "09:00",
    materia: "",
    tipo: "test",
    notas: "",
  });
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState("");
  const [porEliminar, setPorEliminar] = useState<ExamenAgenda | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/agenda", { cache: "no-store" });

      if (res.status === 401) {
        setSinSesion(true);
        setExamenes([]);
        setProximo(null);
        return;
      }

      const datos = (await res.json().catch(() => ({}))) as {
        examenes?: ExamenAgenda[];
        proximo?: ProximoExamen | null;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(datos.error || t("errors.load"));
      }

      setSinSesion(false);
      setExamenes(Array.isArray(datos.examenes) ? datos.examenes : []);
      setProximo(datos.proximo ?? null);
      setErrorCarga("");
    } catch (error) {
      setErrorCarga(
        error instanceof Error ? error.message : t("errors.load"),
      );
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void cargar();
    }, 0);

    return () => window.clearTimeout(id);
  }, [cargar]);

  const porDia = useMemo(() => {
    const mapa = new Map<string, ExamenAgenda[]>();

    for (const examen of examenes) {
      const lista = mapa.get(examen.fechaIso) ?? [];
      lista.push(examen);
      mapa.set(examen.fechaIso, lista);
    }

    return mapa;
  }, [examenes]);

  const proximos = useMemo(
    () => examenes.filter((examen) => examen.dias >= 0),
    [examenes],
  );

  const primerDiaSemana = useMemo(() => {
    const fecha = new Date(mes.anio, mes.mes, 1);

    // Lunes = 0, domingo = 6.
    return (fecha.getDay() + 6) % 7;
  }, [mes]);

  const diasDelMes = useMemo(
    () => new Date(mes.anio, mes.mes + 1, 0).getDate(),
    [mes],
  );

  const celdas = useMemo(() => {
    const anteriores = Array.from({ length: primerDiaSemana }, () => null as number | null);
    const dias = Array.from({ length: diasDelMes }, (_, indice) => indice + 1);

    return [...anteriores, ...dias];
  }, [diasDelMes, primerDiaSemana]);

  const nombreMes = useMemo(() => {
    const texto = new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
    }).format(new Date(mes.anio, mes.mes, 1));

    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }, [locale, mes]);

  const diasSemana = useMemo(() => {
    const formato = new Intl.DateTimeFormat(locale, { weekday: "short" });
    // 1 de enero de 2024 fue lunes.
    return Array.from({ length: 7 }, (_, indice) =>
      formato.format(new Date(2024, 0, 1 + indice)),
    );
  }, [locale]);

  function isoDelDia(dia: number): string {
    return `${mes.anio}-${dosDigitos(mes.mes + 1)}-${dosDigitos(dia)}`;
  }

  function cambiarMes(delta: number): void {
    setMes((actual) => {
      const fecha = new Date(actual.anio, actual.mes + delta, 1);

      return { anio: fecha.getFullYear(), mes: fecha.getMonth() };
    });
  }

  function abrirCrear(fechaISO: string): void {
    setFormulario({
      fecha: isoADdMmAaaa(fechaISO),
      hora: "09:00",
      materia: "",
      tipo: "test",
      notas: "",
    });
    setErrorFormulario("");
    setModal({ modo: "crear" });
  }

  function abrirEditar(examen: ExamenAgenda): void {
    setFormulario({
      fecha: examen.fecha,
      hora: examen.hora,
      materia: examen.materia,
      tipo: TIPOS.includes(examen.tipo as (typeof TIPOS)[number])
        ? examen.tipo
        : "test",
      notas: examen.notas,
    });
    setErrorFormulario("");
    setModal({ modo: "editar", id: examen.id });
  }

  async function guardar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!modal || guardando) {
      return;
    }

    const fechaISO = ddMmAaaaAIso(formulario.fecha);

    if (!fechaISO) {
      setErrorFormulario(t("errors.date"));
      return;
    }

    if (formulario.materia.trim().length < 2) {
      setErrorFormulario(t("errors.subject"));
      return;
    }

    setGuardando(true);
    setErrorFormulario("");

    try {
      const esEdicion = modal.modo === "editar";
      const res = await fetch(
        esEdicion ? `/api/agenda/${modal.id}` : "/api/agenda",
        {
          method: esEdicion ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fecha: fechaISO,
            hora: formulario.hora,
            materia: formulario.materia.trim(),
            tipo: formulario.tipo,
            notas: formulario.notas.trim(),
          }),
        },
      );
      const datos = (await res.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!res.ok) {
        throw new Error(datos.error || t("errors.save"));
      }

      setModal(null);
      await cargar();
      notificar({
        titulo: esEdicion ? t("notifications.updatedTitle") : t("notifications.createdTitle"),
        mensaje: t("notifications.savedMessage"),
        tipo: "exito",
      });
    } catch (error) {
      setErrorFormulario(
        error instanceof Error ? error.message : t("errors.save"),
      );
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(): Promise<void> {
    if (!porEliminar || eliminando) {
      return;
    }

    setEliminando(true);

    try {
      const res = await fetch(`/api/agenda/${porEliminar.id}`, {
        method: "DELETE",
      });
      const datos = (await res.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!res.ok) {
        throw new Error(datos.error || t("errors.delete"));
      }

      setPorEliminar(null);
      await cargar();
      notificar({
        titulo: t("notifications.deletedTitle"),
        mensaje: t("notifications.deletedMessage"),
        tipo: "exito",
      });
    } catch (error) {
      notificar({
        titulo: t("errors.delete"),
        mensaje: error instanceof Error ? error.message : t("errors.delete"),
        tipo: "peligro",
      });
    } finally {
      setEliminando(false);
    }
  }

  return (
    <main className="bg-transparent relative min-h-app px-4 pb-16 font-sans text-[var(--txt)] sm:px-6 md:px-12">
      <div className="mx-auto max-w-5xl">
        <header className="pt-8 text-center sm:pt-10">
          <p className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--azul)]">
            <CalendarDays className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            {t("kicker")}
          </p>
          <h1 className="mt-2 text-[clamp(36px,9vw,56px)] font-semibold leading-none tracking-[-1px] text-[var(--txt)]">
            {t("title")}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[#7b7266] dark:text-[#8a847a]">
            {t("subtitle")}
          </p>
        </header>

        {sinSesion ? (
          <section className="mx-auto mt-10 max-w-md rounded-3xl border border-[var(--th)] bg-[var(--card)] p-8 text-center shadow-[var(--sombra)]">
            <CalendarDays
              className="mx-auto h-10 w-10 text-[var(--azul)]"
              strokeWidth={1.6}
              aria-hidden="true"
            />
            <h2 className="mt-4 text-xl font-bold">{t("loginTitle")}</h2>
            <p className="mt-2 text-sm text-[var(--txt2)]">{t("loginText")}</p>
            <button
              type="button"
              onClick={() => abrirAuth("login")}
              className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-[var(--azul)] px-6 text-sm font-bold text-[var(--btn-txt)] transition-colors hover:bg-[var(--azul-hover)]"
            >
              {t("loginButton")}
            </button>
          </section>
        ) : (
          <>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p
                className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                  proximo
                    ? "border-[var(--azul)]/30 bg-[var(--sel)] text-[var(--azul)]"
                    : "border-[var(--th)] bg-[var(--card2)] text-[var(--txt2)]"
                }`}
              >
                {proximo
                  ? t("nextExam", {
                      fecha: proximo.fecha,
                      dias: proximo.dias,
                    })
                  : t("noNext")}
              </p>

              <button
                type="button"
                onClick={() => abrirCrear(hoyIso)}
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--azul)] px-5 text-sm font-bold text-[var(--btn-txt)] transition-colors hover:bg-[var(--azul-hover)]"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                {t("newExam")}
              </button>
            </div>

            {errorCarga ? (
              <p role="alert" className="mt-6 rounded-xl border border-[var(--err-b)] bg-[var(--err)] p-4 text-sm text-[var(--err-t)]">
                {errorCarga}
              </p>
            ) : null}

            <section className="mt-8 rounded-3xl border border-[var(--th)] bg-[var(--card)] p-4 shadow-[var(--sombra)] sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => cambiarMes(-1)}
                  aria-label={t("previousMonth")}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--th)] bg-[var(--card2)] text-[var(--txt2)] transition-colors hover:bg-[var(--suave2)]"
                >
                  <ChevronLeft className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                </button>

                <h2 className="text-base font-bold sm:text-lg">{nombreMes}</h2>

                <button
                  type="button"
                  onClick={() => cambiarMes(1)}
                  aria-label={t("nextMonth")}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--th)] bg-[var(--card2)] text-[var(--txt2)] transition-colors hover:bg-[var(--suave2)]"
                >
                  <ChevronRight className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-1 text-center">
                {diasSemana.map((dia) => (
                  <span
                    key={dia}
                    className="pb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)] sm:text-xs"
                  >
                    {dia}
                  </span>
                ))}

                {celdas.map((dia, indice) => {
                  if (dia === null) {
                    return <span key={`vacio-${indice}`} aria-hidden="true" />;
                  }

                  const fechaISO = isoDelDia(dia);
                  const examenesDelDia = porDia.get(fechaISO) ?? [];
                  const esHoy = fechaISO === hoyIso;

                  return (
                    <button
                      key={fechaISO}
                      type="button"
                      onClick={() => abrirCrear(fechaISO)}
                      aria-label={t("addOnDay", { fecha: isoADdMmAaaa(fechaISO) })}
                      className={`relative flex h-12 flex-col items-center justify-center rounded-xl border text-sm transition-colors sm:h-14 ${
                        esHoy
                          ? "border-[var(--azul)] bg-[var(--sel)] font-bold text-[var(--azul)]"
                          : "border-transparent text-[var(--txt2)] hover:border-[var(--th)] hover:bg-[var(--card2)]"
                      }`}
                    >
                      <span>{dia}</span>
                      {examenesDelDia.length > 0 ? (
                        <span
                          className="mt-1 flex items-center gap-0.5"
                          aria-hidden="true"
                        >
                          {examenesDelDia.slice(0, 3).map((examen) => (
                            <span
                              key={examen.id}
                              className="h-1.5 w-1.5 rounded-full bg-[var(--azul)]"
                            />
                          ))}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 text-center text-xs text-[var(--txt3)]">
                {t("calendarHint")}
              </p>
            </section>

            <section className="mt-10">
              <h2 className="text-lg font-black text-[var(--txt)]">
                {t("upcoming")}
              </h2>

              {cargando ? (
                <p className="mt-4 text-sm text-[var(--txt3)]">{t("loading")}</p>
              ) : proximos.length === 0 ? (
                <p className="mt-4 rounded-2xl border border-dashed border-[var(--th)] bg-[var(--card2)] p-6 text-center text-sm text-[var(--txt3)]">
                  {t("empty")}
                </p>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {proximos.map((examen) => (
                    <article
                      key={examen.id}
                      className="flex flex-col rounded-2xl border border-[var(--th)] bg-[var(--card)] p-5 shadow-[var(--sombra)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-[var(--azul)]">
                            {examen.fecha} · {examen.hora}
                          </p>
                          <h3 className="mt-1 truncate text-lg font-bold text-[var(--txt)]">
                            {examen.materia}
                          </h3>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[var(--txt3)]">
                            {t(`types.${examen.tipo}`)}
                          </p>
                        </div>

                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => abrirEditar(examen)}
                            aria-label={t("edit")}
                            title={t("edit")}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--txt3)] transition-colors hover:bg-[var(--card2)] hover:text-[var(--azul)]"
                          >
                            <Pencil className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPorEliminar(examen)}
                            aria-label={t("delete")}
                            title={t("delete")}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--txt3)] transition-colors hover:bg-[var(--card2)] hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      {examen.notas ? (
                        <p className="mt-3 whitespace-pre-line text-sm text-[var(--txt2)]">
                          {examen.notas}
                        </p>
                      ) : null}

                      <Link
                        href={`/crear?carpeta=${encodeURIComponent(examen.materia)}`}
                        className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-[var(--th)] bg-[var(--card2)] px-4 text-sm font-bold text-[var(--azul)] transition-colors hover:border-[var(--azul)]/40 hover:bg-[var(--suave)]"
                      >
                        {t("createTest")}
                      </Link>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="agenda-modal-titulo"
            className="w-full max-w-md rounded-2xl border border-[var(--th)] bg-[var(--card)] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id="agenda-modal-titulo" className="text-lg font-bold">
                {modal.modo === "editar" ? t("editTitle") : t("createTitle")}
              </h2>
              <button
                type="button"
                onClick={() => setModal(null)}
                aria-label={t("close")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--txt3)] transition-colors hover:bg-[var(--card2)] hover:text-[var(--txt)]"
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={guardar} className="mt-4 space-y-4" noValidate>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="agenda-fecha" className="mb-2 block text-sm font-semibold text-[var(--txt2)]">
                    {t("fields.date")}
                  </label>
                  <input
                    id="agenda-fecha"
                    type="text"
                    inputMode="numeric"
                    value={formulario.fecha}
                    onChange={(evento) =>
                      setFormulario((actual) => ({ ...actual, fecha: evento.target.value }))
                    }
                    placeholder={t("datePlaceholder")}
                    maxLength={10}
                    required
                    className={CLASE_CAMPO}
                  />
                  <p className="mt-1 text-xs text-[var(--txt3)]">{t("dateHelp")}</p>
                </div>

                <div>
                  <label htmlFor="agenda-hora" className="mb-2 block text-sm font-semibold text-[var(--txt2)]">
                    {t("fields.time")}
                  </label>
                  <input
                    id="agenda-hora"
                    type="time"
                    value={formulario.hora}
                    onChange={(evento) =>
                      setFormulario((actual) => ({ ...actual, hora: evento.target.value }))
                    }
                    required
                    className={CLASE_CAMPO}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="agenda-materia" className="mb-2 block text-sm font-semibold text-[var(--txt2)]">
                  {t("fields.subject")}
                </label>
                <input
                  id="agenda-materia"
                  type="text"
                  value={formulario.materia}
                  onChange={(evento) =>
                    setFormulario((actual) => ({ ...actual, materia: evento.target.value }))
                  }
                  maxLength={80}
                  required
                  className={CLASE_CAMPO}
                />
              </div>

              <div>
                <label htmlFor="agenda-tipo" className="mb-2 block text-sm font-semibold text-[var(--txt2)]">
                  {t("fields.type")}
                </label>
                <select
                  id="agenda-tipo"
                  value={formulario.tipo}
                  onChange={(evento) =>
                    setFormulario((actual) => ({ ...actual, tipo: evento.target.value }))
                  }
                  className={CLASE_CAMPO}
                >
                  {TIPOS.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {t(`types.${tipo}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="agenda-notas" className="mb-2 block text-sm font-semibold text-[var(--txt2)]">
                  {t("fields.notes")}
                </label>
                <textarea
                  id="agenda-notas"
                  value={formulario.notas}
                  onChange={(evento) =>
                    setFormulario((actual) => ({ ...actual, notas: evento.target.value }))
                  }
                  maxLength={1000}
                  rows={3}
                  className="w-full resize-y rounded-xl border border-[var(--th)] bg-[var(--card2)] p-3 text-base text-[var(--txt)] outline-none transition-colors placeholder:text-[var(--txt3)] focus:border-[var(--azul)] focus:ring-2 focus:ring-[var(--azul)]/30 sm:text-sm"
                />
              </div>

              {errorFormulario ? (
                <p role="alert" className="rounded-lg border border-[var(--err-b)] bg-[var(--err)] p-3 text-sm font-medium text-[var(--err-t)]">
                  {errorFormulario}
                </p>
              ) : null}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-[var(--txt3)] hover:text-[var(--txt)]"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--azul)] px-5 text-sm font-bold text-[var(--btn-txt)] transition-colors hover:bg-[var(--azul-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {guardando ? t("saving") : t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ModalConfirmacion
        isOpen={porEliminar !== null}
        titulo={t("deleteTitle")}
        mensaje={t("deleteMessage", {
          materia: porEliminar?.materia ?? "",
          fecha: porEliminar?.fecha ?? "",
        })}
        textoCancelar={t("cancel")}
        textoAceptar={t("delete")}
        onCancel={() => {
          if (!eliminando) setPorEliminar(null);
        }}
        onConfirm={() => {
          void eliminar();
        }}
      />
    </main>
  );
}
