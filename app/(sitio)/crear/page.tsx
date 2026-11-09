"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, FileDown, Save, X } from "lucide-react";
import { useSesion } from "@/components/SessionProvider";
import { useNotification } from "@/components/NotificationProvider";
import { guardarTestCompletado } from "@/lib/historial-tests";
import { mensajeError } from "@/lib/errores";
import { comprimirImagen, prepararArchivos } from "@/lib/imagenes";
import {
  opcionesTipoEstudio,
  tipoEstudioPorDefecto,
} from "@/lib/tipos-estudio";
import { opcionesIdiomaExamen } from "@/lib/idiomas-examen";
import {
  MAX_GENERACIONES_INVITADO,
  MAX_PREGUNTAS_INVITADO,
} from "@/lib/limites-invitado-constantes";
import {
  LIMITE_TESTS_FREEMIUM,
  MAX_PREGUNTAS_FREEMIUM,
} from "@/lib/planes";

type ModoEntrada = "archivo" | "texto" | "foto";

const IDIOMA_POR_LOCALE: Record<string, string> = {
  es: "español",
  en: "inglés",
  fr: "francés",
  de: "alemán",
  it: "italiano",
  pt: "portugués",
};

type Pregunta = {
  enunciado: string;
  opciones: string[];
  correcta: number;
  explicacion?: string;
};

type DocumentoExtraido = {
  nombre: string;
  texto: string;
  tipo: string;
};

/* =========================================================
   UTILIDADES
   ========================================================= */

function obtenerExtension(nombre: string): string {
  const partes = nombre.toLowerCase().split(".");
  return partes.length > 1 ? (partes.at(-1) || "") : "";
}

function indiceCorrecta(valor: unknown): number | null {
  if (typeof valor === "number") {
    return Number.isInteger(valor) && valor >= 0 && valor <= 3 ? valor : null;
  }
  if (typeof valor === "string") {
    const limpio = valor.trim().toUpperCase();
    if (["A", "B", "C", "D"].includes(limpio)) return "ABCD".indexOf(limpio);
    if (["0", "1", "2", "3"].includes(limpio)) return Number(limpio);
  }
  return null;
}

function normalizarPreguntas(valor: unknown): Pregunta[] {
  if (!Array.isArray(valor)) return [];
  const preguntas: Pregunta[] = [];
  for (const item of valor) {
    if (!item || typeof item !== "object") continue;
    const pregunta = item as Record<string, unknown>;
    const enunciado = typeof pregunta.enunciado === "string" ? pregunta.enunciado.trim() : "";
    const opciones = Array.isArray(pregunta.opciones)
      ? pregunta.opciones.filter((opcion): opcion is string => typeof opcion === "string").map((opcion) => opcion.trim())
      : [];
    const correcta = indiceCorrecta(pregunta.correcta);
    if (enunciado.length < 8 || opciones.length !== 4 || opciones.some((opcion) => opcion.length === 0) || correcta === null) continue;
    preguntas.push({
      enunciado,
      opciones,
      correcta,
      explicacion: typeof pregunta.explicacion === "string" ? pregunta.explicacion.trim() : "",
    });
  }
  return preguntas;
}

function normalizarDocumentos(valor: unknown): DocumentoExtraido[] {
  if (!Array.isArray(valor)) return [];
  const documentos: DocumentoExtraido[] = [];
  for (const item of valor) {
    if (!item || typeof item !== "object") continue;
    const documento = item as Record<string, unknown>;
    if (typeof documento.texto !== "string" || documento.texto.trim().length < 10) continue;
    documentos.push({
      nombre: typeof documento.nombre === "string" ? documento.nombre.trim().slice(0, 180) : "Documento",
      texto: documento.texto.trim(),
      tipo: typeof documento.tipo === "string" ? documento.tipo : "text/plain",
    });
  }
  return documentos;
}

const MAX_CANTIDAD_ARCHIVOS = 8;
const MAX_TAMANO_ARCHIVO = 3_500_000;
const MAX_TAMANO_TOTAL = 4_000_000;
const EXTENSIONES_PERMITIDAS = new Set(["pdf", "docx", "txt", "jpg", "jpeg", "png", "webp"]);
const EXTENSIONES_IMAGEN = new Set(["jpg", "jpeg", "png", "webp"]);

type Traductor = (
  key: string,
  values?: Record<string, string | number>,
) => string;

function validarArchivos(
  archivos: File[],
  tr: Traductor,
): string | null {
  if (archivos.length === 0) return tr("errors.noFiles");
  if (archivos.length > MAX_CANTIDAD_ARCHIVOS) {
    return tr("errors.tooManyFiles", { max: MAX_CANTIDAD_ARCHIVOS });
  }
  let total = 0;
  for (const archivo of archivos) {
    const extension = obtenerExtension(archivo.name);
    if (!EXTENSIONES_PERMITIDAS.has(extension)) {
      return tr("errors.fileType", { name: archivo.name });
    }
    if (archivo.size <= 0) {
      return tr("errors.emptyFile", { name: archivo.name });
    }
    if (archivo.size > MAX_TAMANO_ARCHIVO) {
      return tr("errors.fileTooLarge", { name: archivo.name });
    }
    total += archivo.size;
  }
  if (total > MAX_TAMANO_TOTAL) return tr("errors.totalTooLarge");
  return null;
}

function validarFoto(
  foto: File,
  tr: Traductor,
): string | null {
  const extension = obtenerExtension(foto.name);
  if (!EXTENSIONES_IMAGEN.has(extension)) {
    return tr("errors.photoType");
  }
  if (foto.size <= 0) return tr("errors.photoEmpty");
  if (foto.size > MAX_TAMANO_ARCHIVO) {
    return tr("errors.photoTooLarge");
  }
  return null;
}

function crearMarcadoresDocumentos(documentos: DocumentoExtraido[]): string {
  return documentos.map((doc, i) => `\n--- INICIO DOCUMENTO ${i + 1}: Documento ${i + 1} ---\n${doc.texto}\n--- FIN DOCUMENTO ${i + 1} ---\n`).join("\n");
}

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

/** Lee un cuerpo JSON de forma segura, sin asumir su forma. */
async function leerJson(response: Response): Promise<Record<string, unknown>> {
  const datos: unknown = await response.json().catch(() => ({}));

  return datos && typeof datos === "object" && !Array.isArray(datos)
    ? (datos as Record<string, unknown>)
    : {};
}

async function fetchConTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const temporizador = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, credentials: "include", signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("La operación ha tardado demasiado. Inténtalo de nuevo.");
    throw error;
  } finally {
    clearTimeout(temporizador);
  }
}

const PREFIJOS_CARPETAS_NO_MADRE = [
  "test mixtos",
  "simulacros",
  "fallos",
] as const;

function esCarpetaMadre(nombre: string): boolean {
  const nombreNormalizado = nombre.trim().toLocaleLowerCase("es");

  return (
    nombreNormalizado.length > 0 &&
    !PREFIJOS_CARPETAS_NO_MADRE.some((prefijo) =>
      nombreNormalizado.includes(prefijo),
    )
  );
}

export default function Home() {
  const t = useTranslations("CrearTest");
  const locale = useLocale();
  const { sesion, cargando: cargandoSesion, limiteInvitado, actualizarLimiteInvitado } = useSesion();
  const { notificar, confirmar } = useNotification();
  const esFreemium = sesion?.rol === "freemium";
  const limiteAgotado = !sesion && Boolean(limiteInvitado?.agotado);
  const mensajeLimite = t("errors.guestLimit");
  const [modoEntrada, setModoEntrada] = useState<ModoEntrada>("archivo");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [textoPegado, setTextoPegado] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [tipoEstudio, setTipoEstudio] = useState<string>(() =>
    tipoEstudioPorDefecto(locale),
  );
  const [idioma, setIdioma] = useState(
    () => IDIOMA_POR_LOCALE[locale] ?? "español",
  );
  const [numPreguntas, setNumPreguntas] = useState("10");
  const preguntasSeleccionadas = esFreemium
    ? String(MAX_PREGUNTAS_FREEMIUM)
    : numPreguntas;
  const [cargando, setCargando] = useState(false);
  const [faseCarga, setFaseCarga] = useState<
    "inactivo" | "leyendo" | "generando"
  >("inactivo");
  const [mensajeCarga, setMensajeCarga] = useState("");
  const [error, setError] = useState("");
  const [examen, setExamen] = useState<Pregunta[] | null>(null);
  const [respuestasUsuario, setRespuestasUsuario] = useState<Record<number, number>>({});
  const [corregido, setCorregido] = useState(false);
  const [indiceSalto, setIndiceSalto] = useState(0);
  const [aviso, setAviso] = useState("");
  const [explicaciones, setExplicaciones] = useState<Record<number, string>>({});
  const [cargandoExplicacion, setCargandoExplicacion] = useState<Record<number, boolean>>({});
  const [textoContexto, setTextoContexto] = useState("");
  const [arrastrando, setArrastrando] = useState(false);
  const [preparandoArchivos, setPreparandoArchivos] = useState(false);
  const inputArchivosRef = useRef<HTMLInputElement>(null);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const [modalGuardar, setModalGuardar] = useState(false);
  const [carpetasDisponibles, setCarpetasDisponibles] = useState<string[]>([]);
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState("");
  const [nuevaCarpetaNombre, setNuevaCarpetaNombre] = useState("");
  const [cargandoGuardado, setCargandoGuardado] = useState(false);
  const [guardado, setGuardado] = useState(false);

  // Limpia la antigua caché de preguntas del navegador: ya no se usa y podía
  // devolver exámenes idénticos al subir el mismo archivo.
  useEffect(() => {
    try {
      window.localStorage.removeItem("opoquiz-cache-preguntas");
    } catch {}
  }, []);

  // Mantiene el idioma del examen sincronizado con el idioma de la página.
  useEffect(() => {
    const idiomaPagina = IDIOMA_POR_LOCALE[locale] ?? "español";
    const id = window.setTimeout(() => setIdioma(idiomaPagina), 0);
    return () => window.clearTimeout(id);
  }, [locale]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const recuperar = params.get("recuperar");
    const carpeta = params.get("carpeta");
    const archivo = params.get("archivo");

    if (recuperar === "true" && carpeta && archivo) {
      recuperarExamen(carpeta, archivo);
    }
  }, []);

  async function recuperarExamen(carpeta: string, archivo: string) {
    setCargando(true);
    setMensajeCarga(t("recoveringExam"));
    try {
      const res = await fetch(`/api/examenes/recuperar?carpeta=${encodeURIComponent(carpeta)}&archivo=${encodeURIComponent(archivo)}`);
      if (!res.ok) throw new Error(await leerErrorJson(res));
      const data = await leerJson(res);
      setExamen(normalizarPreguntas(data.preguntas));
      setAviso(t("examRecovered"));
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
      setFaseCarga("inactivo");
      setMensajeCarga("");
    }
  }

  async function extraerDocumentos(archivosSeleccionados: File[]): Promise<DocumentoExtraido[]> {
    const formData = new FormData();
    for (const archivo of archivosSeleccionados) formData.append("archivos", archivo);
    const response = await fetchConTimeout("/api/extraer", { method: "POST", body: formData }, 45_000);
    if (!response.ok) throw new Error(await leerErrorJson(response));
    const data = await leerJson(response);
    const documentos = normalizarDocumentos(data.documentos);
    if (documentos.length === 0) throw new Error(t("errors.tooShort"));
    return documentos;
  }

  async function handleGenerar(evento: React.FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    if (cargando || limiteAgotado) return;
    if (modoEntrada === "archivo") {
      const err = validarArchivos(archivos, t as unknown as Traductor);
      if (err) { setError(err); return; }
    }
    if (modoEntrada === "texto" && textoPegado.trim().length < 50) {
      setError(t("errors.pasteTooShort"));
      return;
    }
    if (modoEntrada === "foto" && !foto) {
      setError(t("errors.noPhoto"));
      return;
    }

    setCargando(true);
    setFaseCarga(
      modoEntrada === "texto" ? "generando" : "leyendo",
    );
    setError("");
    setExamen(null);
    setRespuestasUsuario({});
    setCorregido(false);
    setIndiceSalto(0);
    setAviso("");
    setExplicaciones({});
    setCargandoExplicacion({});

    try {
      let textoTotal = "";
      if (modoEntrada === "archivo") {
        setMensajeCarga(t("readingDocuments"));
        textoTotal = crearMarcadoresDocumentos(await extraerDocumentos(archivos));
      } else if (modoEntrada === "foto") {
        if (!foto) throw new Error("No hay ninguna foto seleccionada.");
        setMensajeCarga(t("readingImage"));
        textoTotal = crearMarcadoresDocumentos(await extraerDocumentos([foto]));
      } else {
        textoTotal = `--- INICIO TEXTO PEGADO ---\n${textoPegado.trim()}\n--- FIN TEXTO PEGADO ---`;
      }

      if (textoTotal.trim().length < 50) throw new Error(t("errors.tooShort"));
      setTextoContexto(textoTotal);

      const pedidas = sesion
        ? Math.min(
            Number(preguntasSeleccionadas) || 10,
            esFreemium ? MAX_PREGUNTAS_FREEMIUM : 100,
          )
        : MAX_PREGUNTAS_INVITADO;
      setMensajeCarga(t("preparingQuestions"));
      setFaseCarga("generando");
      const response = await fetchConTimeout("/api/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: textoTotal, tipoEstudio, idioma, numPreguntas: String(pedidas) }),
        cache: "no-store",
      }, 65_000);

      if (!response.ok) {
        const d = (await response.json().catch(() => null)) as Record<
          string,
          unknown
        > | null;
        if (d?.limiteInvitado) actualizarLimiteInvitado(d.limiteInvitado);
        else if (response.status === 429) actualizarLimiteInvitado({ usos: MAX_GENERACIONES_INVITADO, restantes: 0, maximo: MAX_GENERACIONES_INVITADO, agotado: true, mensaje: t("errors.guestLimit") });
        if (d?.codigo === "LIMITE_FREEMIUM") {
          throw new Error(t("errors.freemiumLimit"));
        }
        if (response.status === 429) {
          throw new Error(t("errors.guestLimit"));
        }
        throw new Error(
          typeof d?.error === "string" ? d.error : "Error inesperado.",
        );
      }

      const data = await leerJson(response);
      if (data.limiteInvitado) actualizarLimiteInvitado(data.limiteInvitado);
      const preguntasGeneradas = normalizarPreguntas(data.preguntas);
      if (preguntasGeneradas.length === 0) throw new Error(t("errors.noQuestions"));

      setExamen(preguntasGeneradas);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
      setFaseCarga("inactivo");
      setMensajeCarga("");
    }
  }

  function handleSeleccionarRespuesta(pIdx: number, oIdx: number) {
    if (corregido) return;
    setRespuestasUsuario(prev => ({ ...prev, [pIdx]: oIdx }));
  }

  async function handleCorregir() {
    setCorregido(true);
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (examen) {
      const { aciertos, errores, enBlanco, nota } = calcularNota();

      guardarTestCompletado({
        nota: Number(nota),
        carpeta:
          carpetaSeleccionada || nuevaCarpetaNombre.trim() || "Test rápido",
        aciertos,
        fallos: errores,
        enBlanco,
        total: examen.length,
      });
    }
    
    // Enviar fallos a la API
    if (examen) {
      try {
        const resultados = examen.map((pregunta, index) => {
          const respuestaUsuario = respuestasUsuario[index];
          const acierto = respuestaUsuario === pregunta.correcta;
          return {
            carpeta: carpetaSeleccionada || nuevaCarpetaNombre.trim() || "General",
            pregunta: pregunta,
            acierto: acierto
          };
        });
        
        await fetch("/api/fallos/actualizar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(resultados)
        });
      } catch (error) {
        console.error("Error al actualizar fallos:", error);
      }
    }
  }

  function calcularNota() {
    if (!examen) return { aciertos: 0, errores: 0, enBlanco: 0, nota: "0.0" };
    let aciertos = 0, errores = 0, enBlanco = 0;
    examen.forEach((p, i) => {
      const r = respuestasUsuario[i];
      if (r === undefined) enBlanco++; else if (r === p.correcta) aciertos++; else errores++;
    });
    return { aciertos, errores, enBlanco, nota: ((aciertos / examen.length) * 10).toFixed(1) };
  }

  const resultados = calcularNota();

  function handleNavegacionFlotante() {
    if (!examen) return;
    const sinR = examen.map((_, i) => i).filter(i => respuestasUsuario[i] === undefined);
    if (sinR.length === 0) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    let sig = sinR.find(i => i >= indiceSalto);
    if (sig === undefined) sig = sinR[0];
    setIndiceSalto(sig + 1);
    document.getElementById(`pregunta-${sig}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function handleExplicar(index: number, pregunta: Pregunta) {
    setCargandoExplicacion(prev => ({ ...prev, [index]: true }));
    try {
      const respCorrecta = pregunta.opciones[pregunta.correcta];
      if (!respCorrecta) throw new Error("No se ha podido identificar la respuesta correcta.");
      const res = await fetchConTimeout("/api/explicar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contexto: textoContexto, pregunta: pregunta.enunciado, respuestaCorrecta: respCorrecta }),
        // timeout is already in fetchConTimeout
      }, 30_000);
      if (!res.ok) throw new Error(await leerErrorJson(res));
      const data = await leerJson(res);

      if (typeof data.explicacion !== "string" || !data.explicacion.trim()) {
        throw new Error("Respuesta no válida.");
      }

      setExplicaciones(prev => ({ ...prev, [index]: data.explicacion as string }));
    } catch (err) {
      setExplicaciones(prev => ({ ...prev, [index]: mensajeError(err) }));
    } finally {
      setCargandoExplicacion(prev => ({ ...prev, [index]: false }));
    }
  }

  async function handleDescargarPDF(): Promise<void> {
    if (!examen || !sesion) { setError(t("errors.loginToPdf")); return; }
    try {
      const res = await fetch("/api/pdf", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preguntas: examen }) });
      if (!res.ok) throw new Error(await leerErrorJson(res));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "Examen_OpoGen.pdf";
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (err) { setError(mensajeError(err)); }
  }

  async function handleAbrirModalGuardar() {
    if (!sesion) { setError(t("errors.loginToSave")); return; }
    try {
      const res = await fetch("/api/carpetas");
      const data = await leerJson(res);

      if (res.ok) {
        const virtuales = Array.isArray(data.virtuales)
          ? data.virtuales.filter(
              (item): item is string => typeof item === "string",
            )
          : [];
        const carpetas = Array.isArray(data.carpetas)
          ? data.carpetas.filter(
              (item): item is string =>
                typeof item === "string" &&
                !virtuales.includes(item) &&
                esCarpetaMadre(item),
            )
          : [];

        setCarpetasDisponibles(carpetas);
      }

      setModalGuardar(true);
    } catch (err) {
      notificar({
        titulo: "No se pudieron cargar las carpetas",
        mensaje: mensajeError(err),
        tipo: "peligro",
      });
    }
  }

  async function handleGuardarEnEspacio(e: React.FormEvent) {
    e.preventDefault();
    if (!examen) return;
    const carpetaFinal = nuevaCarpetaNombre.trim() || carpetaSeleccionada;
    if (!carpetaFinal) {
      notificar({
        titulo: "Falta la carpeta",
        mensaje: "Selecciona o escribe una carpeta antes de guardar.",
        tipo: "peligro",
      });
      return;
    }
    setCargandoGuardado(true);
    try {
      const res = await fetch("/api/examenes/guardar", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preguntas: examen,
          carpeta: carpetaFinal,
          numPreguntas: examen.length,
        }),
      });

      if (!res.ok) {
        throw new Error(await leerErrorJson(res));
      }

      setGuardado(true);
      setModalGuardar(false);

      notificar({
        titulo: "Examen guardado",
        mensaje: "El examen se ha guardado correctamente en Mi Espacio.",
        tipo: "exito",
      });
    } catch (err) {
      notificar({
        titulo: "No se pudo guardar",
        mensaje: mensajeError(err),
        tipo: "peligro",
      });
    } finally {
      setCargandoGuardado(false);
    }
  }

  function reiniciarFormulario(): void {
    setExamen(null); setCorregido(false); setRespuestasUsuario({}); setExplicaciones({}); setCargandoExplicacion({});
    setArchivos([]); setFoto(null); setTextoPegado(""); setTextoContexto(""); setAviso(""); setError(""); setIndiceSalto(0);
    setGuardado(false);
    if (inputArchivosRef.current) inputArchivosRef.current.value = "";
    if (inputFotoRef.current) inputFotoRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCerrarTest(): void {
    confirmar({
      titulo: t("closeExamTitle"),
      mensaje: t("closeMessage"),
      textoAceptar: t("confirmClose"),
      textoCancelar: t("keepExam"),
      onAceptar: () => {
        // Se vuelve al formulario de configuración sin cambiar de ruta.
        reiniciarFormulario();
        setAviso(t("closedNotice"));
      },
    });
  }

  async function seleccionarArchivos(nuevos: File[]): Promise<void> {
    if (nuevos.length === 0) return;
    setPreparandoArchivos(true);
    try {
      // En móvil las fotos llegan con 4-10 MB: se reducen antes de validar.
      const preparados = await prepararArchivos(nuevos);
      const err = validarArchivos(preparados, t as unknown as Traductor);
      if (err) { setError(err); return; }
      setArchivos(preparados); setError("");
    } finally {
      setPreparandoArchivos(false);
    }
  }
  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault(); setArrastrando(false);
    void seleccionarArchivos(Array.from(e.dataTransfer.files || []));
  }

  return (
    <main className="bg-transparent relative min-h-app p-4 font-sans text-[var(--txt)] sm:p-6 md:p-12">
        <div className="relative z-10 mx-auto max-w-4xl">
          <h1
            aria-label={`${t("brandName")} ${t("brandSuffix")}`}
            className="mb-6 text-center text-[clamp(40px,12vw,66px)] font-semibold leading-none tracking-[-1px] text-[var(--txt)]"
          >
            <span className="bg-gradient-to-r from-[var(--azul)] via-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent dark:via-[#a78bfa] dark:to-[#22d3ee]">
              {t("brandName")}
            </span>{" "}
            {t("brandSuffix")}
          </h1>

          {!examen && (
            <div className="mx-auto max-w-2xl rounded-3xl border border-[var(--th)] bg-[var(--card)] p-6 shadow-[var(--sombra)] backdrop-blur-xl sm:p-8">
              <div className="mb-8 text-center">
                <h2 className="mb-2 text-2xl font-bold">{t("title")}</h2>
                <p className="text-[var(--txt3)]">{t("subtitle")}</p>
              </div>
              <div role="tablist" className="mb-6 flex gap-2 rounded-xl bg-[var(--card2)] p-1">
                {(["archivo", "texto", "foto"] as const).map((valor) => {
                  const etiquetas: Record<ModoEntrada, string> = {
                    archivo: t("file"),
                    texto: t("text"),
                    foto: t("photo"),
                  };
                  return (
                    <button key={valor} type="button" onClick={() => { setModoEntrada(valor); setError(""); }}
                      className={`relative z-20 flex-1 rounded-lg py-3 text-sm font-bold transition-colors ${modoEntrada === valor ? "bg-[var(--azul)] text-white shadow-sm" : "text-[var(--txt3)] hover:text-[var(--txt)]"}`}>
                      {etiquetas[valor]}
                    </button>
                  );
                })}
              </div>
              <form onSubmit={handleGenerar} className="space-y-6" noValidate>
                {modoEntrada === "archivo" && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[var(--txt2)]">{t("documents")}</label>
                    <input ref={inputArchivosRef} id="archivos" type="file" accept="image/*,.pdf,.docx,.txt" multiple className="sr-only"
                      onChange={(e) => void seleccionarArchivos(Array.from(e.target.files || []))} />
                    <label htmlFor="archivos" onDragEnter={(e) => { e.preventDefault(); setArrastrando(true); }} onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }} onDragLeave={(e) => { e.preventDefault(); setArrastrando(false); }} onDrop={handleDrop}
                      className={`block cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${arrastrando ? "border-[var(--azul)] bg-[var(--sel)]" : "border-[var(--th2)] bg-[var(--card2)] hover:bg-[var(--suave)]"}`}>
                      <svg className="mx-auto mb-3 h-10 w-10 text-[var(--txt3)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="block text-sm font-medium text-[var(--azul)]">
                        {preparandoArchivos ? t("preparingFiles") : archivos.length > 0 ? t("filesSelected", { count: archivos.length }) : t("dropzone")}
                      </span>
                      <span className="mt-2 block text-xs text-[var(--txt3)]">{t("dropzoneHelp")}</span>
                      {archivos.length > 0 && (
                        <ul className="mt-4 space-y-2 text-left text-xs text-[var(--txt2)]">
                          {archivos.map(a => <li key={a.name + a.size} className="truncate rounded-lg bg-[var(--suave)] px-3 py-2">{a.name}</li>)}
                        </ul>
                      )}
                    </label>
                  </div>
                )}
                {modoEntrada === "texto" && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[var(--txt2)]">{t("pasteLabel")}</label>
                    <textarea value={textoPegado} onChange={(e) => setTextoPegado(e.target.value)} placeholder={t("pastePlaceholder")}
                      className="h-40 w-full resize-y rounded-xl border border-[var(--th)] bg-[var(--card2)] p-4 text-base text-[var(--txt)] outline-none backdrop-blur-sm focus:border-[var(--azul)] focus:ring-2 focus:ring-[var(--azul)]/30 sm:text-sm" />
                    <p className="mt-2 text-right text-xs text-[var(--txt3)]">{t("characters", { count: textoPegado.trim().length })}</p>
                  </div>
                )}
                {modoEntrada === "foto" && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[var(--txt2)]">{t("photoLabel")}</label>
                    <input ref={inputFotoRef} id="foto-apuntes" type="file" accept="image/*" className="sr-only"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setPreparandoArchivos(true);
                        try {
                          const comprimida = await comprimirImagen(f);
                          const err = validarFoto(comprimida, t as unknown as Traductor);
                          if (err) setError(err); else { setFoto(comprimida); setError(""); }
                        } finally {
                          setPreparandoArchivos(false);
                        }
                      }} />
                    <label htmlFor="foto-apuntes" className="block cursor-pointer rounded-xl border-2 border-dashed border-[var(--th2)] bg-[var(--card2)] p-6 text-center transition-colors hover:bg-[var(--suave)]">
                      <svg className="mx-auto mb-3 h-10 w-10 text-[var(--txt3)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="block text-sm font-medium text-[var(--azul)]">
                        {preparandoArchivos ? t("preparingPhoto") : foto ? t("photoSelected", { name: foto.name }) : t("photoChoose")}
                      </span>
                      <span className="mt-2 block text-xs text-[var(--txt3)]">{t("photoHelp")}</span>
                    </label>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-6 border-t border-[var(--th)] pt-6 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[var(--txt2)]">{t("studyType")}</label>
                    <select value={tipoEstudio} onChange={(e) => setTipoEstudio(e.target.value)} className="block w-full cursor-pointer rounded-lg border border-[var(--th)] bg-[var(--card2)] p-3 text-[var(--txt)] outline-none backdrop-blur-sm focus:border-[var(--azul)] focus:ring-2 focus:ring-[var(--azul)]/30">
                      {opcionesTipoEstudio(locale).map((opcion) => (
                        <option key={opcion.id} value={opcion.id}>
                          {opcion.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-[var(--txt3)]">{t("studyTypeHelp")}</p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[var(--txt2)]">{t("examLanguage")}</label>
                    <select value={idioma} onChange={(e) => setIdioma(e.target.value)} className="block w-full cursor-pointer rounded-lg border border-[var(--th)] bg-[var(--card2)] p-3 text-[var(--txt)] outline-none backdrop-blur-sm focus:border-[var(--azul)] focus:ring-2 focus:ring-[var(--azul)]/30">
                      {opcionesIdiomaExamen(locale).map((opcion) => (
                        <option key={opcion.id} value={opcion.id}>
                          {opcion.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-[var(--txt3)]">{t("languageHelp")}</p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[var(--txt2)]">{t("questions")}</label>
                    <select value={sesion ? preguntasSeleccionadas : "5"} onChange={(e) => setNumPreguntas(e.target.value)} disabled={!sesion || esFreemium} className="block w-full cursor-pointer rounded-lg border border-[var(--th)] bg-[var(--card2)] p-3 text-[var(--txt)] outline-none backdrop-blur-sm focus:border-[var(--azul)] focus:ring-2 focus:ring-[var(--azul)]/30 disabled:cursor-not-allowed disabled:opacity-70">
                      {sesion ? (
                        esFreemium ? (
                          <option value="5">{t("questionFreemium", { count: 5 })}</option>
                        ) : (
                          <>
                            <option value="10">{t("questionOption", { count: 10 })}</option><option value="25">{t("questionOption", { count: 25 })}</option><option value="50">{t("questionOption", { count: 50 })}</option>
                          </>
                        )
                      ) : (
                        <option value="5">{t("questionGuest", { count: 5 })}</option>
                      )}
                    </select>
                    {!cargandoSesion && esFreemium && (
                      <p className="mt-2 text-xs font-medium text-[var(--ambar-t)]">
                        {t("freemiumHelp", {
                          max: MAX_PREGUNTAS_FREEMIUM,
                          limit: LIMITE_TESTS_FREEMIUM,
                        })}
                      </p>
                    )}
                    {!cargandoSesion && !sesion && <p className="mt-2 text-xs text-[var(--txt3)]">{t("guestHelp")}</p>}
                  </div>
                </div>
                {limiteAgotado && <div role="alert" className="rounded-lg border border-[var(--err-b)] bg-[var(--err)] p-4 text-sm font-medium text-[var(--err-t)]">{mensajeLimite}</div>}
                {error && <div role="alert" className="rounded-lg border border-[var(--err-b)] bg-[var(--err)] p-4 text-sm font-medium text-[var(--err-t)]">{error}</div>}
                {aviso && <div role="status" className="rounded-lg border border-[var(--ambar-b)] bg-[var(--ambar)] p-4 text-sm font-medium text-[var(--ambar-t)]">{aviso}</div>}
                <button type="submit" disabled={cargando || limiteAgotado} className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-[var(--azul)] px-6 py-4 font-bold text-white shadow-md transition-all hover:bg-[var(--azul-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[var(--azul)]/60">
                  {cargando ? (
                    <><svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg> {faseCarga === "leyendo" ? (
                      <>Leyendo archivo<span className="puntos-animados">...</span></>
                    ) : faseCarga === "generando" ? (
                      <>Generando test<span className="puntos-animados">...</span></>
                    ) : (
                      mensajeCarga || t("processing")
                    )}</>
                  ) : t("generate")}
                </button>
              </form>
            </div>
          )}

          {examen && (
            <div className="space-y-6">
              <div className="static z-30 flex flex-col gap-3 rounded-2xl border border-[var(--th)] bg-[var(--card)] p-4 shadow-[var(--sombra)] backdrop-blur-xl md:sticky md:top-[76px] md:flex-row md:items-center md:justify-between md:gap-4">
                <div className="flex items-center gap-4">
                  <span className="flex h-3 w-3 rounded-full bg-[var(--azul)]" aria-hidden="true" />
                  <h2 className="text-lg font-bold">{corregido ? t("results") : t("inProgress")}</h2>
                  {corregido && esFreemium && (
                    <p className="text-xs font-medium text-[var(--ambar-t)]">
                      {t("premiumUpsell")}{" "}
                      <Link href="/premium" className="font-bold underline underline-offset-4">
                        {t("goPremium")}
                      </Link>
                      .
                    </p>
                  )}
                  {!corregido && (
                    <button type="button" onClick={handleNavegacionFlotante} className="ml-2 flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--azul)] p-2 text-white shadow-md transition-transform hover:scale-110" title={t("nextQuestion")} aria-label={t("nextQuestion")}>
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
                  {!esFreemium && (
                    <button type="button" onClick={handleDescargarPDF} disabled={!sesion} className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--th)] bg-[var(--card2)] px-4 py-3 text-sm font-semibold text-[var(--txt2)] transition-colors hover:bg-[var(--suave2)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[var(--card2)] sm:flex-none sm:py-2.5" title={sesion ? t("pdf") : t("errors.loginToPdf")}>
                      <FileDown className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" /> {t("pdf")}
                    </button>
                  )}
                  {sesion && !esFreemium && (
                    <button
                      type="button"
                      onClick={handleAbrirModalGuardar}
                      disabled={guardado || cargandoGuardado}
                      className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition-colors sm:flex-none sm:py-2.5 disabled:cursor-not-allowed ${
                        guardado
                          ? "bg-emerald-600 disabled:opacity-100"
                          : "bg-[var(--azul)] hover:bg-[var(--azul-hover)] disabled:opacity-60"
                      }`}
                    >
                      {guardado ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
                      ) : (
                        <Save className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
                      )}
                      {guardado ? "¡Guardado!" : t("save")}
                    </button>
                  )}
                  {corregido ? (
                    <button type="button" onClick={reiniciarFormulario} className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-[var(--btn)] px-5 py-3 text-sm font-semibold text-[var(--btn-txt)] transition-colors hover:bg-[var(--btnh)] sm:flex-none sm:py-2.5">{t("newTest")}</button>
                  ) : (
                    <button type="button" onClick={handleCorregir} className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-emerald-500/30 transition-colors hover:bg-emerald-600 sm:flex-none sm:py-2.5">
                      <CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
                      <span className="sm:hidden">{t("finalize")}</span><span className="hidden sm:inline">{t("finalize")}</span>
                    </button>
                  )}
                  <button type="button" onClick={handleCerrarTest} className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--th)] bg-transparent px-4 py-3 text-sm font-semibold text-[var(--txt2)] transition-colors hover:border-[var(--err-b)] hover:bg-[var(--err)] hover:text-[var(--err-t)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2 sm:flex-none sm:py-2.5" title={t("close")}>
                    <X className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
                    {t("close")}
                  </button>
                </div>
              </div>
              {aviso && <div role="status" className="rounded-xl border border-[var(--ambar-b)] bg-[var(--ambar)] p-4 text-sm font-medium text-[var(--ambar-t)]">{aviso}</div>}
              {error && <div role="alert" className="rounded-xl border border-[var(--err-b)] bg-[var(--err)] p-4 text-sm font-medium text-[var(--err-t)]">{error}</div>}
              {corregido && (
                <section className="mb-8 rounded-2xl border border-[var(--th)] bg-[var(--card)] p-6 shadow-[var(--sombra)] backdrop-blur-xl md:p-8">
                  <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
                    <div className="rounded-xl border border-[var(--th)] bg-[var(--card2)] p-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--txt3)] sm:text-sm">{t("finalScore")}</p>
                      <p className={`text-3xl font-bold sm:text-4xl ${Number(resultados.nota) >= 5 ? "text-[var(--azul)]" : "text-[var(--rojo)]"}`}>{resultados.nota}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--ok-b)] bg-[var(--ok)] p-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--ok-t)] sm:text-sm">{t("correctAnswers")}</p>
                      <p className="text-3xl font-bold text-[var(--ok-t)] sm:text-4xl">{resultados.aciertos}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--err-b)] bg-[var(--err)] p-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--err-t)] sm:text-sm">{t("errorsCount")}</p>
                      <p className="text-3xl font-bold text-[var(--err-t)] sm:text-4xl">{resultados.errores}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--th)] bg-[var(--card2)] p-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--txt3)] sm:text-sm">{t("blank")}</p>
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
                          <p className={`mb-1 text-sm font-bold ${claseTextoRetroalimentacion}`}>
                            {sinResponder ? t("unanswered", { letter: String.fromCharCode(65 + pregunta.correcta) }) : esCorrecta ? `✓ ${t("correctAnswer")}` : `✗ ${t("wrongAnswer", { letter: String.fromCharCode(65 + pregunta.correcta) })}`}
                          </p>
                          {pregunta.explicacion && <p className="text-sm leading-relaxed text-[var(--txt2)]">{pregunta.explicacion}</p>}
                          <div className="mt-4 border-t border-[var(--th)] pt-4">
                            {!explicaciones[index] && !cargandoExplicacion[index] && (
                              <button type="button" onClick={() => handleExplicar(index, pregunta)} className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[var(--azul)] hover:underline">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M12 2v8" /><path d="m4.93 10.93 1.41 1.41" /><path d="M2 18h2" /><path d="M20 18h2" /><path d="m19.07 10.93-1.41 1.41" /><path d="M22 22H2" /><path d="m8 6 4-4 4 4" /><path d="M16 18a4 4 0 0 0-8 0" />
                                </svg>
                                {t("askTutor")}
                              </button>
                            )}
                            {cargandoExplicacion[index] && (
                              <p role="status" className="flex items-center gap-2 text-sm text-[var(--txt3)]">
                                <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                              </p>
                            )}
                            {explicaciones[index] && (
                              <div role="status" className="mt-2 rounded-lg border border-[var(--th)] bg-[var(--card2)] p-4 text-sm text-[var(--txt2)]">
                                <strong className="mb-1 block text-[var(--azul)]">💡 {t("tutorExplanation")}</strong>
                                {explicaciones[index]}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
              {!corregido && (
                <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-[var(--th)] bg-[var(--card)] p-6 shadow-[var(--sombra)] sm:flex-row">
                  <p className="text-sm font-medium text-[var(--txt3)]">
                    {t("answered", {
                      answered: Object.keys(respuestasUsuario).length,
                      total: examen.length,
                    })}
                  </p>
                  <button
                    type="button"
                    onClick={handleCorregir}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-500 px-8 py-3 text-lg font-bold text-white shadow-lg shadow-emerald-500/30 transition-colors hover:bg-emerald-600 sm:w-auto"
                  >
                    <CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
                    {t("gradeExam")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL GUARDAR EN MI ESPACIO */}
        {modalGuardar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--th)] p-6 shadow-2xl w-full max-w-sm">
              <h3 className="text-lg font-bold mb-4">{t("saveTitle")}</h3>
              <form onSubmit={handleGuardarEnEspacio} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--txt2)]">{t("selectFolder")}</label>
                  <select value={carpetaSeleccionada} onChange={(e) => setCarpetaSeleccionada(e.target.value)} className="block w-full rounded-xl border border-[var(--th)] bg-[var(--card2)] p-3 text-[var(--txt)] outline-none focus:border-[var(--azul)] focus:ring-2 focus:ring-[var(--azul)]/30">
                    <option value="">{t("selectFolderPlaceholder")}</option>
                    {carpetasDisponibles
                      .filter(esCarpetaMadre)
                      .map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><span className="text-xs text-[var(--txt3)]">{t("or")}</span></div>
                  <input type="text" value={nuevaCarpetaNombre} onChange={(e) => setNuevaCarpetaNombre(e.target.value)} placeholder={t("newFolderPlaceholder")} className="w-full pl-8 rounded-xl border border-[var(--th)] bg-[var(--card2)] p-3 text-[var(--txt)] outline-none focus:border-[var(--azul)] focus:ring-2 focus:ring-[var(--azul)]/30" />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setModalGuardar(false)} className="px-4 py-2 text-sm font-semibold text-[var(--txt3)] hover:text-[var(--txt)]">{t("cancel")}</button>
                  <button type="submit" disabled={cargandoGuardado} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[var(--azul)] text-white text-sm font-bold hover:bg-[var(--azul-hover)] disabled:bg-[var(--azul)]/60">
                    <Save className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
                    {cargandoGuardado ? t("saving") : t("saveButton")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
  );
}
