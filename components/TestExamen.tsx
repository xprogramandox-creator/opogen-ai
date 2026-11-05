"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileDown, Save, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSesion } from "@/components/SessionProvider";
import { useVentanaPersistente } from "@/hooks/useVentanaPersistente";
import { useNotification } from "@/components/NotificationProvider";
import { guardarTestCompletado } from "@/lib/historial-tests";
import { mensajeError } from "@/lib/errores";

// --- Tipos ---
export type Pregunta = {
  enunciado: string;
  opciones: string[];
  correcta: number;
  explicacion?: string;
};

// --- Utilidades de red ---

async function leerErrorJson(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();

    if (
      data &&
      typeof data === "object" &&
      typeof (data as { error?: unknown }).error === "string"
    ) {
      return (data as { error: string }).error;
    }
  } catch {}

  return "Ha ocurrido un error inesperado.";
}

// --- COMPONENTE CORE DEL TEST ---
export function TestExamen({
  examen,
  textoContexto,
  onClose,
  showSaveButton = true,
  showPdfButton = true,
  onCorregir,
  carpetaGuardado,
  isMixtoGuardado = false,
  carpetaOrigen,
  modoPractica = false,
  onPreguntaPracticaCompletada,
  onFallosActualizados,
  persistenciaKey,
}: {
  examen: Pregunta[],
  textoContexto: string,
  onClose: () => void,
  showSaveButton?: boolean,
  showPdfButton?: boolean,
  onCorregir?: () => void,
  carpetaGuardado?: string,
  isMixtoGuardado?: boolean,
  carpetaOrigen?: string,
  modoPractica?: boolean,
  onPreguntaPracticaCompletada?: (preguntaCorregida: boolean) => void,
  onFallosActualizados?: () => void,
  persistenciaKey?: string,
}) {

  const { sesion } = useSesion();
  const t = useTranslations("CrearTest");
  const esFreemium = sesion?.rol === "freemium";
  const { notificar } = useNotification();
  const [respuestasUsuario, setRespuestasUsuario] = useState<Record<number, number>>({});
  const [corregido, setCorregido] = useState(false);
  const [indiceSalto, setIndiceSalto] = useState(0);
  const [explicaciones, setExplicaciones] = useState<Record<number, string>>({});
  const [cargandoExplicacion, setCargandoExplicacion] = useState<Record<number, boolean>>({});
  const [mensajeAcierto, setMensajeAcierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const guardandoRef = useRef(false);
  const cerrandoRef = useRef(false);
  const progreso = useVentanaPersistente<{
    respuestasUsuario: Record<number, number>;
    corregido: boolean;
    indiceSalto: number;
  }>({
    clave: persistenciaKey
      ? `test-progreso:${persistenciaKey}`
      : "test-progreso:sin-clave",
    version: 1,
  });
  const {
    restaurado: progresoRestaurado,
    datos: progresoDatos,
    actualizar: guardarProgreso,
    cerrar: cerrarProgreso,
  } = progreso;
  const [progresoAplicado, setProgresoAplicado] = useState(false);

  useEffect(() => {
    if (!persistenciaKey || !progresoRestaurado) {
      return;
    }

    const id = window.setTimeout(() => {
      if (progresoDatos && !progresoAplicado) {
        setRespuestasUsuario(progresoDatos.respuestasUsuario ?? {});
        setCorregido(Boolean(progresoDatos.corregido));
        setIndiceSalto(
          Number.isInteger(progresoDatos.indiceSalto)
            ? progresoDatos.indiceSalto
            : 0,
        );
      }

      setProgresoAplicado(true);
    }, 0);

    return () => window.clearTimeout(id);
  }, [
    persistenciaKey,
    progresoAplicado,
    progresoDatos,
    progresoRestaurado,
  ]);

  useEffect(() => {
    if (
      !persistenciaKey ||
      !progresoAplicado ||
      cerrandoRef.current
    ) {
      return;
    }

    guardarProgreso({
      respuestasUsuario,
      corregido,
      indiceSalto,
    });
  }, [
    corregido,
    guardarProgreso,
    indiceSalto,
    persistenciaKey,
    progresoAplicado,
    respuestasUsuario,
  ]);

  function cerrarExamen(): void {
    cerrandoRef.current = true;
    cerrarProgreso();
    onClose();
  }

  function handleSeleccionarRespuesta(pIdx: number, oIdx: number) {
    if (corregido) return;
    setRespuestasUsuario(prev => ({ ...prev, [pIdx]: oIdx }));
  }

  async function handleCorregir() {
    setCorregido(true);

    if (!modoPractica && examen.length > 0) {
      const { aciertos, errores, enBlanco, nota } = calcularNota();
      guardarTestCompletado({
        nota: Number(nota),
        carpeta: (carpetaGuardado || carpetaOrigen || "").trim(),
        aciertos,
        fallos: errores,
        enBlanco,
        total: examen.length,
      });
    }
    
    if (carpetaOrigen && !modoPractica) {
      try {
        const resultados = examen.map((pregunta, index) => {
          const respuestaUsuario = respuestasUsuario[index];
          const acierto = respuestaUsuario === pregunta.correcta;
          return {
            carpeta: carpetaOrigen,
            pregunta: pregunta,
            acierto: acierto
          };
        });
        
        const res = await fetch("/api/fallos/actualizar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(resultados)
        });
        if (res.ok) onFallosActualizados?.();
      } catch (error) {
        console.error("Error al actualizar fallos:", error);
      }
    }
    
    if (modoPractica && examen.length > 0) {
      const preguntaActual = examen[0];
      const respuestaUsuario = respuestasUsuario[0];
      const acierto = respuestaUsuario === preguntaActual.correcta;
      
      if (acierto && carpetaOrigen) {
        setMensajeAcierto(true);
        setTimeout(async () => {
          try {
            const res = await fetch("/api/fallos/actualizar", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify([{
                carpeta: carpetaOrigen,
                pregunta: preguntaActual,
                acierto: true
              }])
            });
            if (res.ok) onFallosActualizados?.();
          } catch (error) {
            console.error("Error al actualizar fallos:", error);
          }
          if (onPreguntaPracticaCompletada) {
            onPreguntaPracticaCompletada(true);
          }
        }, 1500);
      }
    }
    
    if (onCorregir) {
      onCorregir();
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function calcularNota() {
    let aciertos = 0, errores = 0, enBlanco = 0;
    examen.forEach((p, i) => {
      const r = respuestasUsuario[i];
      if (r === undefined) enBlanco++; else if (r === p.correcta) aciertos++; else errores++;
    });
    return { aciertos, errores, enBlanco, nota: ((aciertos / examen.length) * 10).toFixed(1) };
  }

  const resultados = calcularNota();

  function handleNavegacionFlotante() {
    const sinR = examen.map((_, i) => i).filter(i => respuestasUsuario[i] === undefined);
    if (sinR.length === 0) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    let sig = sinR.find(i => i >= indiceSalto);
    if (sig === undefined) sig = sinR[0];
    setIndiceSalto(sig + 1);
    document.getElementById(`pregunta-${sig}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function handleDescargarPDF() {
    if (!sesion || esFreemium) return;
    try {
      const res = await fetch("/api/pdf", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preguntas: examen }) });
      if (!res.ok) throw new Error(await leerErrorJson(res));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "Examen_OpoGen.pdf";
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (err) {
      notificar({
        titulo: "No se pudo descargar el PDF",
        mensaje: mensajeError(err),
        tipo: "peligro",
      });
    }
  }

  function handleCerrarExamen(): void {
    // Limpia el examen y los resultados para volver a la pantalla anterior
    // (configuración del test) sin navegar a otra ruta.
    setCorregido(false);
    setRespuestasUsuario({});
    setIndiceSalto(0);
    setExplicaciones({});
    setCargandoExplicacion({});
    setMensajeAcierto(false);
    cerrarExamen();
  }

  async function handleGuardarExamen(carpeta: string, esMixto: boolean = false) {
    if (!sesion || esFreemium || guardado || guardandoRef.current) return;

    guardandoRef.current = true;
    setGuardando(true);

    try {
      const res = await fetch("/api/examenes/guardar", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preguntas: examen,
          carpeta: carpeta,
          numPreguntas: examen.length,
          esMixto: esMixto,
          textoContexto: textoContexto,
        }),
      });
      if (!res.ok) throw new Error(await leerErrorJson(res));
      setGuardado(true);
      notificar({
        titulo: "¡Guardado!",
        mensaje: "El examen ha sido guardado correctamente en tu espacio personal.",
        tipo: "exito",
      });
    } catch (err) {
      notificar({
        titulo: "No se pudo guardar",
        mensaje: mensajeError(err),
        tipo: "peligro",
      });
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* CABECERA STICKY */}
      <div className="sticky top-0 z-30 flex flex-col gap-3 rounded-2xl border border-[var(--th)] bg-[var(--card)] p-4 shadow-[var(--sombra)] backdrop-blur-xl md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-3 w-3 rounded-full bg-[var(--azul)]" aria-hidden="true" />
          <h2 className="text-lg font-bold">{corregido ? "Resultados de la simulación" : "Examen en curso"}</h2>
          {!corregido && (
            <button type="button" onClick={handleNavegacionFlotante} className="ml-2 flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--azul)] p-2 text-white shadow-md transition-transform hover:scale-110" title="Ir a la siguiente pregunta sin responder" aria-label="Ir a la siguiente pregunta sin responder">
              {Object.keys(respuestasUsuario).length < examen.length ? (
                <span className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" />
                  </svg>
                  <span className="absolute -right-2 -top-2 rounded-full border-2 border-white bg-red-500 px-2 py-0.5 text-xs font-bold text-white">{examen.length - Object.keys(respuestasUsuario).length}</span>
                </span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {showPdfButton && !esFreemium && (
            <button type="button" onClick={handleDescargarPDF} disabled={!sesion} className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--th)] bg-[var(--card2)] px-4 py-3 text-sm font-semibold text-[var(--txt2)] transition-colors hover:bg-[var(--suave2)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[var(--card2)] sm:flex-none sm:py-2.5">
              <FileDown className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" /> PDF
            </button>
          )}
          
          {showSaveButton && !esFreemium && (
            <button
              type="button"
              onClick={() =>
                handleGuardarExamen(
                  carpetaGuardado || "General",
                  isMixtoGuardado,
                )
              }
              disabled={
                !sesion ||
                !carpetaGuardado ||
                guardado ||
                guardando
              }
              aria-busy={guardando}
              title={
                guardado
                  ? "Este test ya está guardado en Mi Espacio"
                  : "Guardar este test en Mi Espacio"
              }
              className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors sm:flex-none sm:py-2.5 disabled:cursor-not-allowed ${
                guardado
                  ? "bg-emerald-600 hover:bg-emerald-600 disabled:opacity-100"
                  : "bg-[var(--azul)] hover:bg-[var(--azul-hover)] disabled:opacity-60"
              }`}
            >
              {guardado ? (
                <CheckCircle2
                  className="h-5 w-5 shrink-0"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              ) : guardando ? (
                <span
                  className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  aria-hidden="true"
                />
              ) : (
                <Save
                  className="h-5 w-5 shrink-0"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              )}
              {guardado
                ? "¡Guardado!"
                : guardando
                  ? "Guardando..."
                  : "Guardar en Mi Espacio"}
            </button>
          )}

          {!corregido && (
            <button type="button" onClick={cerrarExamen} title="Cerrar sin corregir" className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--th)] bg-[var(--card2)] px-4 py-3 text-sm font-semibold text-[var(--txt2)] transition-colors hover:bg-[var(--suave2)] sm:flex-none sm:py-2.5">
              <X className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" /> Cerrar
            </button>
          )}

          {corregido ? (
            <button type="button" onClick={handleCerrarExamen} className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-[var(--btn)] px-5 py-3 text-sm font-semibold text-[var(--btn-txt)] transition-colors hover:bg-[var(--btnh)] sm:flex-none sm:py-2.5">Cerrar examen</button>
          ) : (
            <button type="button" onClick={handleCorregir} className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-emerald-500/30 transition-colors hover:bg-emerald-600 sm:flex-none sm:py-2.5">
              <CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
              <span>{t("gradeExam")}</span>
            </button>
          )}
        </div>
      </div>

      {corregido && (
        <section className="mb-8 rounded-2xl border border-[var(--th)] bg-[var(--card)] p-6 shadow-[var(--sombra)] backdrop-blur-xl md:p-8">
          {esFreemium && (showPdfButton || showSaveButton) ? (
            <div className="mb-5 rounded-xl border border-[var(--ambar-b)] bg-[var(--ambar)] p-4 text-sm font-medium text-[var(--ambar-t)]">
              ¿Quieres guardar este test y descargarlo en PDF?{" "}
              <Link
                href="/premium"
                className="font-bold underline underline-offset-4"
              >
                Hazte Premium
              </Link>
              .
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
            <div className="rounded-xl border border-[var(--th)] bg-[var(--card2)] p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--txt3)] sm:text-sm">Nota final</p>
              <p className={`text-3xl font-bold sm:text-4xl ${Number(resultados.nota) >= 5 ? "text-[var(--azul)]" : "text-[var(--rojo)]"}`}>{resultados.nota}</p>
            </div>
            <div className="rounded-xl border border-[var(--ok-b)] bg-[var(--ok)] p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--ok-t)] sm:text-sm">Aciertos</p>
              <p className="text-3xl font-bold text-[var(--ok-t)] sm:text-4xl">{resultados.aciertos}</p>
            </div>
            <div className="rounded-xl border border-[var(--err-b)] bg-[var(--err)] p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--err-t)] sm:text-sm">Errores</p>
              <p className="text-3xl font-bold text-[var(--err-t)] sm:text-4xl">{resultados.errores}</p>
            </div>
            <div className="rounded-xl border border-[var(--th)] bg-[var(--card2)] p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--txt3)] sm:text-sm">En blanco</p>
              <p className="text-3xl font-bold text-[var(--txt3)] sm:text-4xl">{resultados.enBlanco}</p>
            </div>
          </div>
        </section>
      )}

      <div className="space-y-6">
        {examen.map((pregunta, index) => {
          const respuestaSeleccionada = respuestasUsuario[index];
          const sinResponder = respuestaSeleccionada === undefined;
          const esCorrecta = respuestaSeleccionada === pregunta.correcta;
          const claseRetroalimentacion = sinResponder ? "border-[var(--ambar-b)] bg-[var(--ambar)]" : esCorrecta ? "border-[var(--ok-b)] bg-[var(--ok)]" : "border-[var(--err-b)] bg-[var(--err)]";
          const claseTextoRetroalimentacion = sinResponder ? "text-[var(--ambar-t)]" : esCorrecta ? "text-[var(--ok-t)]" : "text-[var(--err-t)]";
          return (
            <article id={`pregunta-${index}`} key={index} className="rounded-2xl border border-[var(--th)] bg-[var(--card)] p-5 shadow-[var(--sombra)] backdrop-blur-xl md:p-8">
              <div className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--azul)] text-sm font-bold text-white">{index + 1}</span>
                <h3 className="text-lg font-semibold leading-snug">{pregunta.enunciado}</h3>
              </div>
              <ul className="mt-6 space-y-3 md:pl-12">
                {pregunta.opciones.map((opcion, opcionIndex) => {
                  let claseBoton = "flex w-full items-start rounded-xl border-2 p-4 text-left transition-all duration-200 ";
                  if (!corregido) {
                    claseBoton += respuestaSeleccionada === opcionIndex ? "border-[var(--azul)] bg-[var(--sel)] ring-2 ring-[var(--azul)]/20" : "cursor-pointer border-[var(--th)] bg-[var(--card2)] hover:border-[var(--azul)]/40 hover:bg-[var(--suave)]";
                  } else if (opcionIndex === pregunta.correcta) {
                    claseBoton += "border-emerald-500 bg-[var(--ok)]";
                  } else if (respuestaSeleccionada === opcionIndex && !esCorrecta) {
                    claseBoton += "border-red-500 bg-[var(--err)]";
                  } else {
                    claseBoton += "border-[var(--th)] bg-[var(--card2)] opacity-50";
                  }
                  const claseLetra = respuestaSeleccionada === opcionIndex && !corregido ? "bg-[var(--azul)] text-white" : corregido && opcionIndex === pregunta.correcta ? "bg-emerald-500 text-white" : corregido && respuestaSeleccionada === opcionIndex ? "bg-red-500 text-white" : "bg-[var(--card)] text-[var(--txt3)]";
                  return (
                    <li key={opcionIndex}>
                      <button type="button" disabled={corregido} onClick={() => handleSeleccionarRespuesta(index, opcionIndex)} className={claseBoton}>
                        <span className={`mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${claseLetra}`}>{String.fromCharCode(65 + opcionIndex)}</span>
                        <span className="flex-1 text-[var(--txt2)]">{opcion}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {corregido && (
                <div className={`mt-6 rounded-xl border p-5 md:ml-12 ${claseRetroalimentacion}`}>
                  {modoPractica && esCorrecta && mensajeAcierto && (
                    <div className="mb-3 rounded-lg bg-green-500/10 border border-green-500/30 p-3 text-center">
                      <p className="text-sm font-bold text-green-600 dark:text-green-400">¡Correcto! Pasando a la siguiente...</p>
                    </div>
                  )}
                  <p className={`mb-1 text-sm font-bold ${claseTextoRetroalimentacion}`}>
                    {sinResponder ? `○ Sin responder. La opción válida era la ${String.fromCharCode(65 + pregunta.correcta)}.` : esCorrecta ? "✓ ¡Respuesta correcta!" : `✗ Incorrecto. La opción válida era la ${String.fromCharCode(65 + pregunta.correcta)}.`}
                  </p>
                  {pregunta.explicacion && <p className="text-sm leading-relaxed text-[var(--txt2)]">{pregunta.explicacion}</p>}
                  <div className="mt-4 border-t border-[var(--th)] pt-4">
                    {cargandoExplicacion[index] && (
                      <p role="status" className="flex items-center gap-2 text-sm text-[var(--txt3)]">
                        <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                      </p>
                    )}
                    {explicaciones[index] && (
                      <div role="status" className="mt-2 rounded-lg border border-[var(--th)] bg-[var(--card2)] p-4 text-sm text-[var(--txt2)]">
                        <strong className="mb-1 block text-[var(--azul)]">💡 Explicación del tutor</strong>
                        {explicaciones[index]}
                      </div>
                    )}
                    {modoPractica && !esCorrecta && (
                      <button 
                        type="button" 
                        onClick={() => {
                          if (onPreguntaPracticaCompletada) {
                            onPreguntaPracticaCompletada(false);
                          }
                        }} 
                        className="mt-4 w-full cursor-pointer rounded-lg bg-[var(--azul)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--azul-hover)]"
                      >
                        Siguiente
                      </button>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
      
      {!corregido && (
        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-[var(--th)] bg-[var(--card)] p-6 sm:flex-row">
          <p className="text-sm font-medium text-[var(--txt3)]">
            Preguntas respondidas:{" "}
            <span className="font-bold text-[var(--txt)]">
              {Object.keys(respuestasUsuario).length} de {examen.length}
            </span>
          </p>
          <button type="button" onClick={handleCorregir} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-500 px-8 py-3 text-lg font-bold text-white shadow-lg shadow-emerald-500/30 transition-colors hover:bg-emerald-600 sm:w-auto">
            <CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
            {t("gradeExam")}
          </button>
        </div>
      )}
    </div>
  );
}