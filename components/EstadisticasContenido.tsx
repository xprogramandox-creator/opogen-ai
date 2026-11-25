"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Award,
  BarChart3,
  BookOpenCheck,
  CircleAlert,
  Repeat2,
  Target,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  calcularNotaMediaPorTest,
  carpetaMadre,
  esTestCompletado,
  normalizarEntradaHistorial,
  normalizarNombreCarpeta,
  type EntradaHistorialTest,
} from "@/lib/historial-tests";

type CarpetaResumen = {
  nombre: string;
  tests: number;
};

type DiaResumen = {
  clave: string;
  etiqueta: string;
  numero: string;
  aciertos: number;
  fallos: number;
  pendientes: number | null;
  tests: number;
};

const formatoDia = new Intl.DateTimeFormat("es-ES", { weekday: "short" });
const formatoNumeroDia = new Intl.DateTimeFormat("es-ES", { day: "numeric" });
const formatoFechaLarga = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const formatoNota = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function claveDia(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

function embellecerCarpeta(nombre: string): string {
  return nombre
    .replace(/^Test Mixtos - /, "Test mixtos · ")
    .replace(/^Simulacros - /, "Simulacros · ");
}

const PREFIJOS_NO_MADRE = [
  "Test Mixtos - ",
  "Simulacros - ",
  "Fallos - ",
  "Test rápido",
] as const;

function esCarpetaMadreVisible(nombre: string): boolean {
  const limpio = nombre.trim();

  if (!limpio || limpio === "Sin carpeta") {
    return false;
  }

  return !PREFIJOS_NO_MADRE.some((prefijo) => limpio.startsWith(prefijo));
}

async function contarTestsDeCarpeta(nombre: string): Promise<number> {
  try {
    const res = await fetch(
      `/api/carpetas/archivos?carpeta=${encodeURIComponent(nombre)}`,
      { cache: "no-store" },
    );

    if (!res.ok) return 0;

    const datos = (await res.json().catch(() => ({}))) as {
      archivos?: unknown;
    };

    return Array.isArray(datos.archivos) ? datos.archivos.length : 0;
  } catch {
    return 0;
  }
}

async function contarFallosDeCarpeta(carpeta: string): Promise<number> {
  try {
    const res = await fetch(
      `/api/fallos/obtener?carpeta=${encodeURIComponent(carpeta)}`,
      { cache: "no-store" },
    );

    if (!res.ok) return 0;

    const datos = (await res.json().catch(() => ({}))) as {
      preguntas?: unknown;
      pendientes?: unknown;
    };

    if (typeof datos.pendientes === "number") {
      return datos.pendientes;
    }

    return Array.isArray(datos.preguntas) ? datos.preguntas.length : 0;
  } catch {
    return 0;
  }
}

export default function EstadisticasContenido() {
  const t = useTranslations("Estadisticas");
  const [historial, setHistorial] = useState<EntradaHistorialTest[]>([]);
  const [carpetas, setCarpetas] = useState<CarpetaResumen[]>([]);
  const [fallosPorCarpeta, setFallosPorCarpeta] = useState<
    Record<string, number>
  >({});
  const [fallosPendientes, setFallosPendientes] = useState<number | null>(
    null,
  );
  const [cargandoCarpetas, setCargandoCarpetas] = useState(true);
  const [errorCarpetas, setErrorCarpetas] = useState("");
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState("todas");
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(
    null,
  );

  useEffect(() => {
    // El servidor es la única fuente de verdad. No se lee ni se fusiona
    // el historial guardado en localStorage de otros usuarios.
    try {
      window.localStorage.removeItem("opoquiz_historial_tests");
    } catch {
      // localStorage puede estar bloqueado; no afecta a las estadísticas.
    }

    let cancelado = false;

    const id = window.setTimeout(() => {
      void (async () => {
        let servidor: EntradaHistorialTest[] = [];

        try {
          const res = await fetch("/api/estadisticas", {
            cache: "no-store",
            credentials: "include",
          });

          if (res.ok) {
            const datos = (await res.json().catch(() => ({}))) as {
              historial?: unknown;
            };

            if (Array.isArray(datos.historial)) {
              servidor = datos.historial
                .map(normalizarEntradaHistorial)
                .filter(
                  (entrada): entrada is EntradaHistorialTest =>
                    entrada !== null,
                );
            }
          }
        } catch {
          // Si falla la API, el historial se queda vacío; nunca se usan
          // datos locales de otra sesión.
          servidor = [];
        }

        if (!cancelado) setHistorial(servidor);
      })();
    }, 0);

    return () => {
      cancelado = true;
      window.clearTimeout(id);
    };
  }, []);

  const cargarCarpetas = useCallback(async () => {
    setCargandoCarpetas(true);
    setErrorCarpetas("");

    try {
      const res = await fetch("/api/carpetas", { cache: "no-store" });

      if (!res.ok) {
        throw new Error("No se pudieron cargar las carpetas.");
      }

      const datos = (await res.json()) as { carpetas?: unknown };
      const nombres = Array.isArray(datos.carpetas)
        ? datos.carpetas.filter(
            (nombre): nombre is string => typeof nombre === "string",
          )
        : [];

      const nombresFisicos = nombres.filter(
        (nombre) =>
          !nombre.startsWith("Fallos - ") &&
          !nombre.startsWith("Test Mixtos - ") &&
          !nombre.startsWith("Simulacros - ") &&
          nombre.trim() !== "Test rápido" &&
          nombre.trim() !== "Sin carpeta",
      );

      const nombresFallos = nombres
        .filter((nombre) => nombre.startsWith("Fallos - "))
        .map((nombre) => nombre.replace(/^Fallos - /, ""));

      const [resumenCarpetas, conteoFallos] = await Promise.all([
        Promise.all(
          nombresFisicos.map(async (nombre) => ({
            nombre,
            tests: await contarTestsDeCarpeta(nombre),
          })),
        ),
        Promise.all(nombresFallos.map(contarFallosDeCarpeta)),
      ]);

      setCarpetas(
        resumenCarpetas.sort((a, b) =>
          a.nombre.localeCompare(b.nombre, "es"),
        ),
      );
      setFallosPorCarpeta(
        Object.fromEntries(
          nombresFallos.map((nombre, indice) => [
            nombre,
            conteoFallos[indice] ?? 0,
          ]),
        ),
      );
      setFallosPendientes(
        conteoFallos.reduce((total, cantidad) => total + cantidad, 0),
      );
    } catch (error) {
      setErrorCarpetas(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las carpetas.",
      );
      setFallosPendientes(null);
    } finally {
      setCargandoCarpetas(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void cargarCarpetas(), 0);
    return () => window.clearTimeout(id);
  }, [cargarCarpetas]);

  const carpetasMadre = useMemo(() => {
    const porNombre = new Map<string, string>();

    function agregar(nombre: string): void {
      const madre = carpetaMadre(nombre).trim();

      if (!esCarpetaMadreVisible(madre)) return;

      const clave = normalizarNombreCarpeta(madre);
      if (!porNombre.has(clave)) porNombre.set(clave, madre);
    }

    // Solo carpetas que existen de verdad: las borradas no aparecen en el
    // desplegable aunque queden restos en el historial.
    for (const carpeta of carpetas) agregar(carpeta.nombre);

    return [...porNombre.values()].sort((a, b) =>
      a.localeCompare(b, "es", { numeric: true }),
    );
  }, [carpetas]);

  const carpetaActiva =
    carpetaSeleccionada === "todas" ||
    carpetasMadre.includes(carpetaSeleccionada)
      ? carpetaSeleccionada
      : "todas";

  const nombreCarpeta =
    carpetaActiva === "todas"
      ? t("allFolders")
      : embellecerCarpeta(carpetaActiva);

  const nombresExistentes = useMemo(
    () =>
      new Set(
        carpetas.map((carpeta) => normalizarNombreCarpeta(carpeta.nombre)),
      ),
    [carpetas],
  );

  // Defensa en profundidad: la API ya filtra, pero el cliente también
  // descarta entradas de carpetas borradas. Mientras la lista carga (o si
  // falla), se confía en el historial que devolvió el servidor.
  const historialExistente = useMemo(() => {
    if (cargandoCarpetas || errorCarpetas) {
      return historial;
    }

    return historial.filter((entrada) =>
      nombresExistentes.has(
        normalizarNombreCarpeta(carpetaMadre(entrada.carpeta)),
      ),
    );
  }, [historial, nombresExistentes, cargandoCarpetas, errorCarpetas]);

  const historialFiltrado = useMemo(
    () =>
      carpetaActiva === "todas"
        ? historialExistente
        : historialExistente.filter(
            (entrada) =>
              carpetaMadre(entrada.carpeta) === carpetaActiva,
          ),
    [historialExistente, carpetaActiva],
  );

  const resumen = useMemo(() => {
    const totalTests = historialFiltrado.filter(esTestCompletado).length;
    const notaMedia = calcularNotaMediaPorTest(historialFiltrado);
    const aciertos = historialFiltrado.reduce(
      (total, entrada) => total + entrada.aciertos,
      0,
    );
    const fallos = historialFiltrado.reduce(
      (total, entrada) => total + entrada.fallos,
      0,
    );

    return { totalTests, notaMedia, aciertos, fallos };
  }, [historialFiltrado]);

  const fechasDisponibles = useMemo(() => {
    const fechas = new Map<string, string>();

    for (const entrada of historialFiltrado) {
      const fecha = new Date(entrada.fecha);
      const clave = claveDia(fecha);

      if (!fechas.has(clave)) {
        fechas.set(clave, formatoFechaLarga.format(fecha));
      }
    }

    return Array.from(fechas, ([clave, etiqueta]) => ({
      clave,
      etiqueta,
    })).sort((a, b) => b.clave.localeCompare(a.clave));
  }, [historialFiltrado]);

  const grafico = useMemo(() => {
    const dias: DiaResumen[] = [];

    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setHours(0, 0, 0, 0);
      fecha.setDate(fecha.getDate() - i);

      dias.push({
        clave: claveDia(fecha),
        etiqueta: formatoDia.format(fecha),
        numero: formatoNumeroDia.format(fecha),
        aciertos: 0,
        fallos: 0,
        pendientes: null,
        tests: 0,
      });
    }

    const porClave = new Map(dias.map((dia) => [dia.clave, dia]));

    for (const entrada of historialFiltrado) {
      const fecha = new Date(entrada.fecha);
      const dia = porClave.get(claveDia(fecha));

      if (dia) {
        dia.aciertos += entrada.aciertos;
        dia.fallos += entrada.fallos;
        if (dia.pendientes === null && typeof entrada.pendientes === "number") {
          dia.pendientes = entrada.pendientes;
        }
        if (esTestCompletado(entrada)) dia.tests += 1;
      }
    }

    // El día actual debe coincidir con la tarjeta superior, aunque no haya
    // snapshot reciente o el último test no estuviera guardado.
    const diaHoy = porClave.get(claveDia(new Date()));
    if (diaHoy) {
      diaHoy.pendientes =
        carpetaActiva === "todas"
          ? (fallosPendientes ?? 0)
          : (fallosPorCarpeta[carpetaActiva] ?? 0);
    }

    const maximo = Math.max(
      1,
      ...dias.map((dia) =>
        Math.max(dia.aciertos, dia.fallos, dia.pendientes ?? 0),
      ),
    );
    const totalSemana = dias.reduce(
      (total, dia) => total + dia.aciertos + dia.fallos,
      0,
    );

    return { dias, maximo, totalSemana };
  }, [
    historialFiltrado,
    carpetaActiva,
    fallosPendientes,
    fallosPorCarpeta,
  ]);

  const diaDetalle = useMemo(() => {
    if (!diaSeleccionado) return null;

    const diaDelGrafico = grafico.dias.find(
      (dia) => dia.clave === diaSeleccionado,
    );

    if (diaDelGrafico) return diaDelGrafico;

    const entradasDelDia = historialFiltrado.filter(
      (entrada) =>
        claveDia(new Date(entrada.fecha)) === diaSeleccionado,
    );
    const fecha = new Date(`${diaSeleccionado}T12:00:00`);

    return {
      clave: diaSeleccionado,
      etiqueta: formatoDia.format(fecha),
      numero: formatoNumeroDia.format(fecha),
      pendientes:
        entradasDelDia.find(
          (entrada) => typeof entrada.pendientes === "number",
        )?.pendientes ?? null,
      aciertos: entradasDelDia.reduce(
        (total, entrada) => total + entrada.aciertos,
        0,
      ),
      fallos: entradasDelDia.reduce(
        (total, entrada) => total + entrada.fallos,
        0,
      ),
      tests: entradasDelDia.filter(esTestCompletado).length,
    };
  }, [diaSeleccionado, grafico.dias, historialFiltrado]);

  const fechaDetalle = diaDetalle
    ? formatoFechaLarga.format(
        new Date(`${diaDetalle.clave}T12:00:00`),
      )
    : "";

  const fallosFiltrados =
    carpetaActiva === "todas"
      ? fallosPendientes
      : (fallosPorCarpeta[carpetaActiva] ?? 0);

  const resumenVisible = useMemo(() => {
    if (!diaDetalle) {
      return {
        totalTests: resumen.totalTests,
        notaMedia: resumen.notaMedia,
        fallos: resumen.fallos,
        pendientes: fallosFiltrados,
      };
    }

    const entradasDelDia = historialFiltrado.filter(
      (entrada) =>
        claveDia(new Date(entrada.fecha)) === diaDetalle.clave,
    );
    const notaMedia =
      entradasDelDia.length > 0
        ? entradasDelDia.reduce(
            (total, entrada) => total + entrada.nota,
            0,
          ) / entradasDelDia.length
        : 0;

    return {
      totalTests: diaDetalle.tests,
      notaMedia,
      fallos: diaDetalle.fallos,
      pendientes: diaDetalle.pendientes ?? 0,
    };
  }, [diaDetalle, fallosFiltrados, historialFiltrado, resumen]);

  const alturaBarra = (valor: number) =>
    `${Math.min(100, Math.round((valor / grafico.maximo) * 100))}%`;

  return (
    <div className="relative isolate">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        <div className="absolute -left-28 -top-32 h-96 w-96 rounded-full bg-sky-300/50 opacity-40 blur-[120px] dark:bg-sky-500/25" />
        <div className="absolute -right-32 top-1/4 h-[28rem] w-[28rem] rounded-full bg-cyan-200/50 opacity-40 blur-[120px] dark:bg-cyan-400/20" />
        <div className="absolute -bottom-40 left-1/3 h-[26rem] w-[26rem] rounded-full bg-amber-200/40 opacity-30 blur-[120px] dark:bg-blue-500/20" />
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#141b2d]/10 opacity-30 blur-[110px] dark:bg-[#60a5fa]/15" />
      </div>

      <div className="relative z-10 space-y-6">
      <header>
        <h1 className="text-balance text-3xl font-bold tracking-tight text-[var(--txt)] sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-pretty text-[var(--txt2)]">
          {t("subtitle")}
        </p>
      </header>

      <section
        aria-label="Filtro por carpeta"
        className="flex flex-col gap-3 rounded-2xl border border-white/40 bg-gradient-to-br from-sky-100/80 to-blue-300/65 p-4 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-none dark:bg-[#141b2d]/50 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p className="text-sm font-bold text-[var(--txt)]">
            {t("folder")}
          </p>
          <p className="text-xs text-[var(--txt3)]">
            {t("folderHelp")}
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-[var(--txt2)]">
          <span className="sr-only">Seleccionar carpeta madre</span>
          <select
            value={carpetaActiva}
            onChange={(evento) => {
              setCarpetaSeleccionada(evento.target.value);
              setDiaSeleccionado(null);
            }}
            className="h-12 min-w-56 cursor-pointer rounded-xl border-2 border-[var(--azul)] bg-[var(--card2)] px-4 text-base font-bold text-[var(--txt)] shadow-md outline-none transition-all hover:border-[var(--azul)] hover:shadow-lg focus:border-[var(--azul)] focus:ring-2 focus:ring-[var(--azul)]/30"
          >
            <option value="todas">{t("allFolders")}</option>
            {carpetasMadre.map((nombre) => (
              <option key={nombre} value={nombre}>
                {embellecerCarpeta(nombre)}
              </option>
            ))}
          </select>
        </label>
      </section>

      {!cargandoCarpetas && !errorCarpetas && carpetas.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--th)] bg-[var(--card2)] p-6 text-center text-sm text-[var(--txt3)]">
          {t("emptyFolders")}
        </p>
      ) : null}

      <section
        aria-label="Detalle del día seleccionado"
        className="rounded-3xl border border-white/40 bg-gradient-to-br from-sky-100/80 to-blue-300/65 p-5 shadow-xl backdrop-blur-md transition-transform duration-300 hover:scale-[1.02] dark:border-white/10 dark:bg-none dark:bg-[#141b2d]/50 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--txt3)]">
              {diaDetalle ? t("detail") : t("general")}
            </p>
            <h2 className="mt-1 text-xl font-bold text-[var(--txt)]">
              {diaDetalle
                ? t("summaryDate", {
                    date: fechaDetalle,
                    folder: nombreCarpeta,
                  })
                : t("summaryGeneral", { folder: nombreCarpeta })}
            </h2>
            <p className="mt-1 text-sm text-[var(--txt3)]">
              {diaDetalle
                ? diaDetalle.tests === 0
                  ? "Sin Test"
                  : "Datos exactos del día seleccionado."
                : t("clickDay")}
            </p>
          </div>

          {diaDetalle ? (
            <button
              type="button"
              onClick={() => setDiaSeleccionado(null)}
              className="rounded-lg text-sm font-bold text-[var(--azul)] underline underline-offset-4 hover:text-[var(--azul-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)]"
            >
              {t("viewGeneral")}
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/40 bg-gradient-to-br from-sky-100/80 to-blue-300/65 p-4 shadow-xl ring-1 ring-inset ring-sky-200/50 backdrop-blur-md transition-transform duration-300 hover:scale-[1.02] dark:border-white/10 dark:bg-none dark:bg-[#141b2d]/50 dark:ring-sky-400/20">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                {t("testsDone")}
              </p>
              <span className="rounded-lg bg-white/70 p-1.5 text-sky-600 dark:bg-white/5 dark:text-sky-300">
                <BarChart3 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </span>
            </div>
            <p className="mt-1 text-3xl font-bold text-sky-900 dark:text-sky-100">
              {diaDetalle ? diaDetalle.tests : resumen.totalTests}
            </p>
          </div>

          <div className="rounded-2xl border border-white/40 bg-gradient-to-br from-sky-100/80 to-blue-300/65 p-4 shadow-xl ring-1 ring-inset ring-emerald-200/50 backdrop-blur-md transition-transform duration-300 hover:scale-[1.02] dark:border-white/10 dark:bg-none dark:bg-[#141b2d]/50 dark:ring-emerald-400/20">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                {t("correct")}
              </p>
              <span className="rounded-lg bg-white/70 p-1.5 text-emerald-600 dark:bg-white/5 dark:text-emerald-300">
                <Target className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </span>
            </div>
            <p className="mt-1 text-3xl font-bold text-emerald-900 dark:text-emerald-100">
              {diaDetalle ? diaDetalle.aciertos : resumen.aciertos}
            </p>
          </div>

          <div className="rounded-2xl border border-white/40 bg-gradient-to-br from-sky-100/80 to-blue-300/65 p-4 shadow-xl ring-1 ring-inset ring-rose-200/50 backdrop-blur-md transition-transform duration-300 hover:scale-[1.02] dark:border-white/10 dark:bg-none dark:bg-[#141b2d]/50 dark:ring-rose-400/20">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                {t("wrong")}
              </p>
              <span className="rounded-lg bg-white/70 p-1.5 text-rose-600 dark:bg-white/5 dark:text-rose-300">
                <Repeat2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </span>
            </div>
            <p className="mt-1 text-3xl font-bold text-rose-900 dark:text-rose-100">
              {diaDetalle ? diaDetalle.fallos : resumen.fallos}
            </p>
          </div>
        </div>
      </section>

      <section
        aria-label="Resumen"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <article className="rounded-3xl border border-white/40 bg-gradient-to-br from-sky-100/80 to-blue-300/65 p-5 shadow-xl ring-1 ring-inset ring-sky-200/40 backdrop-blur-md transition-transform duration-300 hover:scale-[1.02] dark:border-white/10 dark:bg-none dark:bg-[#141b2d]/50 dark:ring-sky-400/20 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
              {t("completed")}
            </p>
            <span className="rounded-lg bg-white/70 p-1.5 text-sky-600 dark:bg-white/5 dark:text-sky-300">
              <BookOpenCheck className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </span>
          </div>
          <p className="mt-2 text-4xl font-bold text-sky-900 dark:text-sky-100">
            {resumenVisible.totalTests}
          </p>
          <p className="mt-1 text-sm text-[var(--txt3)]">
            Cada vez que corriges un examen se suma aquí.
          </p>
        </article>

        <article className="rounded-3xl border border-white/40 bg-gradient-to-br from-sky-100/80 to-blue-300/65 p-5 shadow-xl ring-1 ring-inset ring-amber-200/40 backdrop-blur-md transition-transform duration-300 hover:scale-[1.02] dark:border-white/10 dark:bg-none dark:bg-[#141b2d]/50 dark:ring-amber-400/20 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              {t("average")}
            </p>
            <span className="rounded-lg bg-white/70 p-1.5 text-amber-600 dark:bg-white/5 dark:text-amber-300">
              <Award className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </span>
          </div>
          <p className="mt-2 text-4xl font-bold text-amber-900 dark:text-amber-100">
            {resumenVisible.totalTests > 0
              ? formatoNota.format(resumenVisible.notaMedia)
              : "—"}
          </p>
          <p className="mt-1 text-sm text-[var(--txt3)]">Sobre 10 puntos.</p>
        </article>

        <article className="rounded-3xl border border-white/40 bg-gradient-to-br from-sky-100/80 to-blue-300/65 p-5 shadow-xl ring-1 ring-inset ring-rose-200/40 backdrop-blur-md transition-transform duration-300 hover:scale-[1.02] dark:border-white/10 dark:bg-none dark:bg-[#141b2d]/50 dark:ring-rose-400/20 sm:col-span-2 sm:p-6 lg:col-span-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
              {t("pending")}
            </p>
            <span className="rounded-lg bg-white/70 p-1.5 text-rose-600 dark:bg-white/5 dark:text-rose-300">
              <CircleAlert className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </span>
          </div>
          <p className="mt-2 text-4xl font-bold text-rose-900 dark:text-rose-100">
            {resumenVisible.pendientes === null ? "—" : resumenVisible.pendientes}
          </p>
          <p className="mt-1 text-sm text-[var(--txt3)]">
            Preguntas falladas que puedes repasar en Mi Espacio.
          </p>
        </article>
      </section>

      <section className="rounded-3xl border border-white/40 bg-gradient-to-br from-sky-100/80 to-blue-300/65 p-5 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-none dark:bg-[#141b2d]/50 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[var(--txt)]">
              {t("last7")}
            </h2>
            <p className="mt-1 text-sm text-[var(--txt3)]">
              {t("last7Help")}
            </p>
          </div>

          <ul className="flex items-center gap-4 text-xs font-semibold text-[var(--txt2)]">
            <li className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full bg-emerald-500"
                aria-hidden="true"
              />
              {t("correct")}
            </li>
            <li className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full bg-rose-500"
                aria-hidden="true"
              />
              {t("pendingLegend")}
            </li>
          </ul>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label
            htmlFor="fecha-historica"
            className="text-sm font-semibold text-[var(--txt2)]"
          >
            Fecha histórica
          </label>

          <select
            id="fecha-historica"
            value={diaSeleccionado ?? ""}
            onChange={(evento) =>
              setDiaSeleccionado(evento.target.value || null)
            }
            className="h-10 cursor-pointer rounded-xl border-2 border-[var(--azul)] bg-[var(--card2)] px-3 text-sm font-bold text-[var(--txt)] shadow-sm outline-none transition-colors hover:border-[var(--azul)] focus:border-[var(--azul)] focus:ring-2 focus:ring-[var(--azul)]/30"
          >
            <option value="">Últimos 7 días</option>

            {fechasDisponibles.map((fecha) => (
              <option key={fecha.clave} value={fecha.clave}>
                {fecha.etiqueta}
              </option>
            ))}
          </select>
        </div>

        {resumen.totalTests === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-[var(--th2)] bg-[var(--card2)] p-6 text-center text-sm text-[var(--txt3)]">
            Todavía no hay tests corregidos en esta carpeta. Cuando completes
            uno, aparecerá aquí.
          </p>
        ) : grafico.totalSemana === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-[var(--th2)] bg-[var(--card2)] p-6 text-center text-sm text-[var(--txt3)]">
            No hay actividad en los últimos 7 días. Tus datos anteriores siguen
            guardados en el resumen.
          </p>
        ) : (
          <div
            role="group"
            aria-label="Gráfico de barras con los aciertos y fallos de los últimos siete días"
            className="mt-6"
          >
            <div className="flex items-stretch gap-2 sm:gap-4">
              {grafico.dias.map((dia) => {
                const seleccionado = diaSeleccionado === dia.clave;

                return (
                  <button
                    key={dia.clave}
                    type="button"
                    aria-pressed={seleccionado}
                    aria-label={`Ver resumen del ${dia.etiqueta} ${dia.numero}: ${dia.tests} tests, ${dia.aciertos} aciertos y ${dia.fallos} fallos`}
                    onClick={() =>
                      setDiaSeleccionado((actual) =>
                        actual === dia.clave ? null : dia.clave,
                      )
                    }
                    className={`flex min-w-0 flex-1 flex-col items-center gap-2 rounded-xl border p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] ${
                      seleccionado
                        ? "border-[var(--azul)] bg-[var(--sel)] shadow-sm ring-1 ring-[var(--azul)]/30"
                        : "border-transparent hover:bg-[var(--suave)]"
                    }`}
                  >
                    <div className="flex h-40 w-full items-end justify-center gap-1 sm:h-48">
                      <div
                        title={`${dia.etiqueta} ${dia.numero}: ${dia.aciertos} aciertos`}
                        className="relative w-2/5 max-w-7"
                        style={{
                          height: alturaBarra(dia.aciertos),
                          minHeight: dia.aciertos > 0 ? "4px" : "1px",
                        }}
                      >
                        <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          {dia.aciertos}
                        </span>
                        <div className="h-full w-full rounded-t-md bg-emerald-500" />
                      </div>
                      <div
                        title={`${dia.etiqueta} ${dia.numero}: ${dia.pendientes ?? 0} pendientes`}
                        className="relative w-2/5 max-w-7"
                        style={{
                          height: alturaBarra(dia.pendientes ?? 0),
                          minHeight:
                            (dia.pendientes ?? 0) > 0 ? "4px" : "1px",
                        }}
                      >
                        <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-xs font-bold text-rose-700 dark:text-rose-400">
                          {dia.pendientes ?? 0}
                        </span>
                        <div className="h-full w-full rounded-t-md bg-rose-500" />
                      </div>
                    </div>

                    <div className="text-center">
                      <p
                        className={`text-[11px] font-semibold uppercase ${
                          seleccionado
                            ? "text-[var(--azul)]"
                            : "text-[var(--txt2)]"
                        }`}
                      >
                        {dia.etiqueta}
                      </p>
                      <p className="text-[11px] text-[var(--txt3)]">
                        {dia.numero}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/40 bg-gradient-to-br from-sky-100/80 to-blue-300/65 p-5 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-none dark:bg-[#141b2d]/50 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[var(--txt)]">
              {t("breakdown")}
            </h2>
            <p className="mt-1 text-sm text-[var(--txt3)]">
              {t("breakdownHelp")}
            </p>
          </div>

          <Link
            href="/mi-espacio"
            className="rounded-lg text-sm font-bold text-[var(--azul)] underline-offset-4 transition-colors hover:text-[var(--azul-hover)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2"
          >
            {t("goSpace")}
          </Link>
        </div>

        {cargandoCarpetas ? (
          <p role="status" className="mt-6 text-sm text-[var(--txt3)]">
            {t("loading")}
          </p>
        ) : errorCarpetas ? (
          <div className="mt-6 rounded-2xl border border-[var(--err-b)] bg-[var(--err)] p-4">
            <p className="text-sm font-medium text-[var(--err-t)]">
              {errorCarpetas}
            </p>
            <button
              type="button"
              onClick={() => void cargarCarpetas()}
              className="mt-2 rounded-lg text-sm font-bold text-[var(--err-t)] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)]"
            >
              {t("retry")}
            </button>
          </div>
        ) : carpetas.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-[var(--th2)] bg-[var(--card2)] p-6 text-center text-sm text-[var(--txt3)]">
            Aún no tienes carpetas.{" "}
            <Link
              href="/crear"
              className="font-bold text-[var(--azul)] underline-offset-4 hover:underline"
            >
              Crea tu primer test
            </Link>{" "}
            y guárdalo en Mi Espacio.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--th)]">
            {carpetas.map((carpeta) => (
              <li
                key={carpeta.nombre}
                className="flex items-center justify-between gap-4 py-3"
              >
                <span className="min-w-0 truncate text-sm font-semibold text-[var(--txt)]">
                  {embellecerCarpeta(carpeta.nombre)}
                </span>
                <span className="shrink-0 rounded-full border border-sky-200/80 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300">
                  {carpeta.tests} {carpeta.tests === 1 ? "test" : "tests"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>
    </div>
  );
}
