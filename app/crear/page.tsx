"use client";

import Link from "next/link";
import {
  useRef,
  useState,
  type DragEvent,
} from "react";
import ThemeToggle from "@/components/ThemeToggle";

type ModoEntrada = "archivo" | "texto" | "foto";

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
   CACHÉ DEL NAVEGADOR
   ========================================================= */

const CACHE_CLAVE = "opoquiz-cache-preguntas";
const CACHE_VERSION = "v3";
const CACHE_MAX_POOLS = 6;
const CACHE_MAX_PREGUNTAS = 150;
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

type EntradaCache = {
  ts: number;
  preguntas: Pregunta[];
};

function hashClave(texto: string): string {
  let a = 0x811c9dc5;

  for (let i = 0; i < texto.length; i++) {
    a ^= texto.charCodeAt(i);
    a = (a + ((a << 1) + (a << 4) + (a << 7) + (a << 8) + (a << 24))) >>> 0;
  }

  let b = 0x1b873593;

  for (let i = texto.length - 1; i >= 0; i--) {
    b ^= texto.charCodeAt(i);
    b = Math.imul(b, 16777619) >>> 0;
  }

  return (
    (a >>> 0).toString(16).padStart(8, "0") +
    (b >>> 0).toString(16).padStart(8, "0")
  );
}

function mezclar<T>(lista: T[]): T[] {
  const resultado = [...lista];

  for (let i = resultado.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [resultado[i], resultado[j]] = [resultado[j], resultado[i]];
  }

  return resultado;
}

function obtenerExtension(nombre: string): string {
  const partes = nombre.toLowerCase().split(".");
  return partes.length > 1 ? (partes.at(-1) || "") : "";
}

function indiceCorrecta(valor: unknown): number | null {
  if (typeof valor === "number") {
    return Number.isInteger(valor) && valor >= 0 && valor <= 3
      ? valor
      : null;
  }

  if (typeof valor === "string") {
    const limpio = valor.trim().toUpperCase();

    if (["A", "B", "C", "D"].includes(limpio)) {
      return "ABCD".indexOf(limpio);
    }

    if (["0", "1", "2", "3"].includes(limpio)) {
      return Number(limpio);
    }
  }

  return null;
}

function normalizarPreguntas(valor: unknown): Pregunta[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  const preguntas: Pregunta[] = [];

  for (const item of valor) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const pregunta = item as Record<string, unknown>;

    const enunciado =
      typeof pregunta.enunciado === "string"
        ? pregunta.enunciado.trim()
        : "";

    const opciones = Array.isArray(pregunta.opciones)
      ? pregunta.opciones
          .filter((opcion): opcion is string => typeof opcion === "string")
          .map((opcion) => opcion.trim())
      : [];

    const correcta = indiceCorrecta(pregunta.correcta);

    if (
      enunciado.length < 8 ||
      opciones.length !== 4 ||
      opciones.some((opcion) => opcion.length === 0) ||
      correcta === null
    ) {
      continue;
    }

    preguntas.push({
      enunciado,
      opciones,
      correcta,
      explicacion:
        typeof pregunta.explicacion === "string"
          ? pregunta.explicacion.trim()
          : "",
    });
  }

  return preguntas;
}

function normalizarDocumentos(valor: unknown): DocumentoExtraido[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  const documentos: DocumentoExtraido[] = [];

  for (const item of valor) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const documento = item as Record<string, unknown>;

    if (
      typeof documento.texto !== "string" ||
      documento.texto.trim().length < 10
    ) {
      continue;
    }

    documentos.push({
      nombre:
        typeof documento.nombre === "string"
          ? documento.nombre.trim().slice(0, 180)
          : "Documento",
      texto: documento.texto.trim(),
      tipo:
        typeof documento.tipo === "string"
          ? documento.tipo
          : "text/plain",
    });
  }

  return documentos;
}

function leerCacheCliente(): Record<string, EntradaCache> {
  try {
    const bruto = localStorage.getItem(CACHE_CLAVE);

    if (!bruto) {
      return {};
    }

    const datos: unknown = JSON.parse(bruto);

    if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
      return {};
    }

    const limpio: Record<string, EntradaCache> = {};
    const ahora = Date.now();

    for (const [clave, valor] of Object.entries(
      datos as Record<string, unknown>,
    )) {
      if (!valor || typeof valor !== "object") {
        continue;
      }

      const entrada = valor as Partial<EntradaCache>;
      const preguntas = normalizarPreguntas(entrada.preguntas);

      if (
        typeof entrada.ts === "number" &&
        ahora - entrada.ts < CACHE_TTL &&
        preguntas.length > 0
      ) {
        limpio[clave] = {
          ts: entrada.ts,
          preguntas,
        };
      }
    }

    return limpio;
  } catch {
    return {};
  }
}

function guardarCacheCliente(
  clave: string,
  preguntas: Pregunta[],
): void {
  try {
    if (!Array.isArray(preguntas) || preguntas.length === 0) {
      return;
    }

    const cache = leerCacheCliente();

    cache[clave] = {
      ts: Date.now(),
      preguntas: preguntas.slice(0, CACHE_MAX_PREGUNTAS),
    };

    const ordenadas = Object.entries(cache).sort(
      ([, a], [, b]) => b.ts - a.ts,
    );

    for (const [claveAntigua] of ordenadas.slice(CACHE_MAX_POOLS)) {
      delete cache[claveAntigua];
    }

    localStorage.setItem(CACHE_CLAVE, JSON.stringify(cache));
  } catch {
    // Cuota superada o almacenamiento bloqueado.
  }
}

function borrarCacheCliente(): void {
  try {
    localStorage.removeItem(CACHE_CLAVE);
  } catch {
    // El almacenamiento puede estar bloqueado.
  }
}

/* =========================================================
   UTILIDADES
   ========================================================= */

const MAX_CANTIDAD_ARCHIVOS = 8;
const MAX_TAMANO_ARCHIVO = 3_500_000;
const MAX_TAMANO_TOTAL = 4_000_000;

const EXTENSIONES_PERMITIDAS = new Set([
  "pdf",
  "docx",
  "txt",
  "jpg",
  "jpeg",
  "png",
  "webp",
]);

const EXTENSIONES_IMAGEN = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
]);

function validarArchivos(archivos: File[]): string | null {
  if (archivos.length === 0) {
    return "Selecciona al menos un archivo.";
  }

  if (archivos.length > MAX_CANTIDAD_ARCHIVOS) {
    return `Puedes subir un máximo de ${MAX_CANTIDAD_ARCHIVOS} archivos.`;
  }

  let total = 0;

  for (const archivo of archivos) {
    const extension = obtenerExtension(archivo.name);

    if (!EXTENSIONES_PERMITIDAS.has(extension)) {
      return `El formato de «${archivo.name}» no está permitido. Usa PDF, DOCX, TXT, JPG, PNG o WebP.`;
    }

    if (archivo.size <= 0) {
      return `El archivo «${archivo.name}» está vacío.`;
    }

    if (archivo.size > MAX_TAMANO_ARCHIVO) {
      return `El archivo «${archivo.name}» supera el máximo de 3,5 MB.`;
    }

    total += archivo.size;
  }

  if (total > MAX_TAMANO_TOTAL) {
    return "El tamaño total de los archivos no puede superar 4 MB.";
  }

  return null;
}

function validarFoto(foto: File): string | null {
  const extension = obtenerExtension(foto.name);

  if (!EXTENSIONES_IMAGEN.has(extension)) {
    return "La foto debe estar en formato JPG, PNG o WebP.";
  }

  if (foto.size <= 0) {
    return "La foto está vacía.";
  }

  if (foto.size > MAX_TAMANO_ARCHIVO) {
    return "La foto no puede superar 3,5 MB.";
  }

  return null;
}

function crearMarcadoresDocumentos(
  documentos: DocumentoExtraido[],
): string {
  return documentos
    .map((documento, indice) => {
      const nombreSeguro = `Documento ${indice + 1}`;

      return [
        "",
        `--- INICIO DOCUMENTO ${indice + 1}: ${nombreSeguro} ---`,
        documento.texto,
        `--- FIN DOCUMENTO ${indice + 1} ---`,
        "",
      ].join("\n");
    })
    .join("\n");
}

async function leerErrorJson(
  response: Response,
): Promise<string> {
  try {
    const data: unknown = await response.json();

    if (
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof data.error === "string"
    ) {
      return data.error;
    }
  } catch {
    // Se devuelve el mensaje genérico.
  }

  return "Ha ocurrido un error inesperado.";
}

async function fetchConTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const temporizador = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "La operación ha tardado demasiado. Inténtalo de nuevo.",
      );
    }

    throw error;
  } finally {
    clearTimeout(temporizador);
  }
}

/* =========================================================
   COMPONENTE
   ========================================================= */

export default function Home() {
  const [modoEntrada, setModoEntrada] =
    useState<ModoEntrada>("archivo");

  const [archivos, setArchivos] = useState<File[]>([]);
  const [textoPegado, setTextoPegado] = useState("");
  const [foto, setFoto] = useState<File | null>(null);

  const [tipoEstudio, setTipoEstudio] = useState("Oposiciones");
  const [numPreguntas, setNumPreguntas] = useState("10");

  const [cargando, setCargando] = useState(false);
  const [mensajeCarga, setMensajeCarga] = useState("");
  const [error, setError] = useState("");

  const [examen, setExamen] = useState<Pregunta[] | null>(null);
  const [respuestasUsuario, setRespuestasUsuario] = useState<
    Record<number, number>
  >({});
  const [corregido, setCorregido] = useState(false);

  const [indiceSalto, setIndiceSalto] = useState(0);
  const [origen, setOrigen] = useState<"cache" | "red" | null>(null);
  const [aviso, setAviso] = useState("");

  const [explicaciones, setExplicaciones] = useState<
    Record<number, string>
  >({});
  const [cargandoExplicacion, setCargandoExplicacion] = useState<
    Record<number, boolean>
  >({});
  const [textoContexto, setTextoContexto] = useState("");

  const [arrastrando, setArrastrando] = useState(false);

  const inputArchivosRef = useRef<HTMLInputElement>(null);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  async function extraerDocumentos(
    archivosSeleccionados: File[],
  ): Promise<DocumentoExtraido[]> {
    const formData = new FormData();

    for (const archivo of archivosSeleccionados) {
      formData.append("archivos", archivo);
    }

    const response = await fetchConTimeout(
      "/api/extraer",
      {
        method: "POST",
        body: formData,
      },
      45_000,
    );

    if (!response.ok) {
      throw new Error(await leerErrorJson(response));
    }

    const data: unknown = await response.json();

    const documentos = normalizarDocumentos(
      data &&
        typeof data === "object" &&
        "documentos" in data
        ? data.documentos
        : [],
    );

    if (documentos.length === 0) {
      throw new Error(
        "No se ha podido extraer texto útil de los archivos.",
      );
    }

    return documentos;
  }

  async function handleGenerar(
    evento: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    evento.preventDefault();

    if (cargando) {
      return;
    }

    if (modoEntrada === "archivo") {
      const errorArchivos = validarArchivos(archivos);

      if (errorArchivos) {
        setError(errorArchivos);
        return;
      }
    }

    if (modoEntrada === "texto" && textoPegado.trim().length < 50) {
      setError("Pega un texto de al menos 50 caracteres.");
      return;
    }

    if (modoEntrada === "foto" && !foto) {
      setError("Selecciona una foto de tus apuntes.");
      return;
    }

    setCargando(true);
    setError("");
    setExamen(null);
    setRespuestasUsuario({});
    setCorregido(false);
    setIndiceSalto(0);
    setOrigen(null);
    setAviso("");
    setExplicaciones({});
    setCargandoExplicacion({});

    try {
      let textoTotal = "";

      if (modoEntrada === "archivo") {
        setMensajeCarga(
          "Leyendo tus documentos y extrayendo el contenido...",
        );

        const documentos = await extraerDocumentos(archivos);
        textoTotal = crearMarcadoresDocumentos(documentos);
      } else if (modoEntrada === "foto") {
        if (!foto) {
          throw new Error("No hay ninguna foto seleccionada.");
        }

        setMensajeCarga(
          "Leyendo la imagen de tus apuntes con IA...",
        );

        const documentos = await extraerDocumentos([foto]);
        textoTotal = crearMarcadoresDocumentos(documentos);
      } else {
        textoTotal = [
          "--- INICIO TEXTO PEGADO ---",
          textoPegado.trim(),
          "--- FIN TEXTO PEGADO ---",
        ].join("\n");
      }

      if (textoTotal.trim().length < 50) {
        throw new Error(
          "El contenido extraído es demasiado corto para crear un examen.",
        );
      }

      setTextoContexto(textoTotal);

      const pedidas = Number(numPreguntas) || 10;
      const clave = hashClave(
        `${CACHE_VERSION}|${textoTotal}|${tipoEstudio}`,
      );

      const entrada = leerCacheCliente()[clave];

      if (entrada && entrada.preguntas.length >= pedidas) {
        setExamen(
          mezclar(entrada.preguntas).slice(0, pedidas),
        );
        setOrigen("cache");
        setAviso(
          "Examen recuperado de la caché local de este navegador.",
        );
        return;
      }

      setMensajeCarga(
        "La IA está preparando las preguntas del examen...",
      );

      const response = await fetchConTimeout(
        "/api/generar",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            texto: textoTotal,
            tipoEstudio,
            numPreguntas: String(pedidas),
          }),
          cache: "no-store",
        },
        65_000,
      );

      if (!response.ok) {
        throw new Error(await leerErrorJson(response));
      }

      const data: unknown = await response.json();

      if (!data || typeof data !== "object") {
        throw new Error(
          "La IA ha devuelto una respuesta no válida.",
        );
      }

      const respuesta = data as Record<string, unknown>;
      const preguntasGeneradas = normalizarPreguntas(
        respuesta.preguntas,
      );

      if (preguntasGeneradas.length === 0) {
        throw new Error(
          "No se han podido generar preguntas válidas.",
        );
      }

      const pool = normalizarPreguntas(respuesta.pool);
      const preguntasCache =
        pool.length > 0 ? pool : preguntasGeneradas;

      guardarCacheCliente(clave, preguntasCache);

      setExamen(preguntasGeneradas);
      setOrigen(respuesta.desdeCache ? "cache" : "red");

      if (
        typeof respuesta.aviso === "string" &&
        respuesta.aviso.trim()
      ) {
        setAviso(respuesta.aviso);
      } else if (preguntasGeneradas.length < pedidas) {
        setAviso(
          `Solo se han generado ${preguntasGeneradas.length} de ${pedidas} preguntas.`,
        );
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Error inesperado al generar el examen.",
      );
    } finally {
      setCargando(false);
      setMensajeCarga("");
    }
  }

  function handleSeleccionarRespuesta(
    preguntaIndex: number,
    opcionIndex: number,
  ): void {
    if (corregido) {
      return;
    }

    setRespuestasUsuario((prev) => ({
      ...prev,
      [preguntaIndex]: opcionIndex,
    }));
  }

  function handleCorregir(): void {
    setCorregido(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function calcularNota() {
    if (!examen || examen.length === 0) {
      return {
        aciertos: 0,
        errores: 0,
        enBlanco: 0,
        nota: "0.0",
      };
    }

    let aciertos = 0;
    let errores = 0;
    let enBlanco = 0;

    examen.forEach((pregunta, index) => {
      const respuesta = respuestasUsuario[index];

      if (respuesta === undefined) {
        enBlanco++;
      } else if (respuesta === pregunta.correcta) {
        aciertos++;
      } else {
        errores++;
      }
    });

    return {
      aciertos,
      errores,
      enBlanco,
      nota: ((aciertos / examen.length) * 10).toFixed(1),
    };
  }

  const resultados = calcularNota();

  function handleNavegacionFlotante(): void {
    if (!examen) {
      return;
    }

    const preguntasSinResponder = examen
      .map((_, index) => index)
      .filter((index) => respuestasUsuario[index] === undefined);

    if (preguntasSinResponder.length === 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    let siguienteIndice = preguntasSinResponder.find(
      (index) => index >= indiceSalto,
    );

    if (siguienteIndice === undefined) {
      siguienteIndice = preguntasSinResponder[0];
    }

    setIndiceSalto(siguienteIndice + 1);

    const elemento = document.getElementById(
      `pregunta-${siguienteIndice}`,
    );

    elemento?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  async function handleExplicar(
    index: number,
    pregunta: Pregunta,
  ): Promise<void> {
    setCargandoExplicacion((prev) => ({
      ...prev,
      [index]: true,
    }));

    try {
      const respuestaCorrecta =
        pregunta.opciones[pregunta.correcta];

      if (!respuestaCorrecta) {
        throw new Error(
          "No se ha podido identificar la respuesta correcta.",
        );
      }

      const response = await fetchConTimeout(
        "/api/explicar",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contexto: textoContexto,
            pregunta: pregunta.enunciado,
            respuestaCorrecta,
          }),
        },
        30_000,
      );

      if (!response.ok) {
        throw new Error(await leerErrorJson(response));
      }

      const data: unknown = await response.json();

if (
  !data ||
  typeof data !== "object" ||
  !("explicacion" in data) ||
  typeof data.explicacion !== "string"
) {
  throw new Error(
    "El tutor ha devuelto una respuesta no válida.",
  );
}

const explicacion = data.explicacion;

setExplicaciones((prev) => ({
  ...prev,
  [index]: explicacion,
}));

    } catch (err: unknown) {
      setExplicaciones((prev) => ({
        ...prev,
        [index]:
          err instanceof Error
            ? err.message
            : "Hubo un error al conectar con el tutor. Inténtalo de nuevo.",
      }));
    } finally {
      setCargandoExplicacion((prev) => ({
        ...prev,
        [index]: false,
      }));
    }
  }

  async function handleDescargarPDF(): Promise<void> {
    if (!examen) {
      return;
    }

    try {
      const { jsPDF } = await import("jspdf");

      const doc = new jsPDF();
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();

      const MARGIN = 15;
      const BOTTOM = 15;
      let y = 0;

      const limpiarTexto = (texto: unknown): string => {
        if (texto === null || texto === undefined) {
          return "";
        }

        return String(texto)
          .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, " ")
          .replace(/[«»]/g, '"')
          .replace(/[—–]/g, "-")
          .replace(/[“”]/g, '"')
          .replace(/[‘’]/g, "'")
          .replace(/…/g, "...")
          .replace(/[^\x20-\x7E\u00A1-\u00FF]/g, "");
      };

      const nuevaPagina = () => {
        doc.addPage();
        y = MARGIN;
      };

      const asegurarEspacio = (alto: number) => {
        if (y + alto > pageHeight - BOTTOM) {
          nuevaPagina();
        }
      };

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(
        "Examen Tipo Test - OpoQuiz",
        pageWidth / 2,
        20,
        { align: "center" },
      );

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Número de questions: ${examen.length}`,
        pageWidth / 2,
        29,
        { align: "center" },
      );

      y = 42;

      examen.forEach((pregunta, index) => {
        const ancho = pageWidth - MARGIN * 2;

        const enunciadoLines = doc.splitTextToSize(
          `${index + 1}. ${limpiarTexto(pregunta.enunciado)}`,
          ancho,
        );

        const opcionesLines = pregunta.opciones.map(
          (opcion, opcionIndex) =>
            doc.splitTextToSize(
              `${String.fromCharCode(65 + opcionIndex)}) ${limpiarTexto(opcion)}`,
              ancho - 5,
            ),
        );

        const altoPregunta =
          enunciadoLines.length * 5 +
          2 +
          opcionesLines.reduce(
            (acc, lines) => acc + lines.length * 5 + 1,
            0,
          ) +
          4;

        asegurarEspacio(altoPregunta);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(enunciadoLines, MARGIN, y);
        y += enunciadoLines.length * 5 + 2;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);

        opcionesLines.forEach((lines) => {
          doc.text(lines, MARGIN + 5, y);
          y += lines.length * 5 + 1;
        });

        y += 4;
      });

      doc.addPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(
        "Hoja de Respuestas Correctas",
        MARGIN,
        20,
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      const respuestasArray = examen.map(
        (pregunta, index) =>
          `${index + 1}. ${String.fromCharCode(65 + pregunta.correcta)}`,
      );

      const respuestasPorColumna =
        Math.ceil(respuestasArray.length / 4) || 1;

      for (let col = 0; col < 4; col++) {
        const columnaRespuestas = respuestasArray.slice(
          col * respuestasPorColumna,
          (col + 1) * respuestasPorColumna,
        );

        let yRespuesta = 35;

        columnaRespuestas.forEach((respuesta) => {
          doc.text(
            respuesta,
            MARGIN + col * 45,
            yRespuesta,
          );

          yRespuesta += 6;
        });
      }

      doc.save("Examen_OpoQuiz.pdf");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? `No se ha podido crear el PDF: ${err.message}`
          : "No se ha podido crear el PDF.",
      );
    }
  }

  function reiniciarFormulario(): void {
    setExamen(null);
    setCorregido(false);
    setRespuestasUsuario({});
    setExplicaciones({});
    setCargandoExplicacion({});
    setArchivos([]);
    setFoto(null);
    setTextoPegado("");
    setTextoContexto("");
    setOrigen(null);
    setAviso("");
    setError("");
    setIndiceSalto(0);

    if (inputArchivosRef.current) {
      inputArchivosRef.current.value = "";
    }

    if (inputFotoRef.current) {
      inputFotoRef.current.value = "";
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBorrarCache(): void {
    borrarCacheCliente();
    setAviso(
      "Se ha borrado la caché local de este navegador.",
    );
  }

  function seleccionarArchivos(nuevosArchivos: File[]): void {
    const errorArchivos = validarArchivos(nuevosArchivos);

    if (errorArchivos) {
      setError(errorArchivos);
      return;
    }

    setArchivos(nuevosArchivos);
    setError("");
  }

  function handleDrop(evento: DragEvent<HTMLDivElement>): void {
    evento.preventDefault();
    setArrastrando(false);

    const nuevosArchivos = Array.from(
      evento.dataTransfer.files || [],
    );

    seleccionarArchivos(nuevosArchivos);
  }

  return (
    <main className="bg-app relative min-h-screen overflow-x-hidden p-4 font-sans text-[var(--txt)] sm:p-6 md:p-12">
      <div className="blob-fondo blob-1" aria-hidden="true" />
      <div className="blob-fondo blob-2" aria-hidden="true" />
      <div className="blob-fondo blob-3" aria-hidden="true" />

      <div className="absolute left-4 top-4 z-50 sm:left-6 sm:top-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg border border-[var(--th)] bg-[var(--card)] px-4 py-2 text-sm font-bold text-[var(--txt)] shadow-sm backdrop-blur-md transition-colors hover:bg-[var(--suave2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>

          Volver
        </Link>
      </div>

      <div className="relative z-10 mx-auto max-w-4xl">
        <header className="mb-10 flex items-center gap-3 border-b border-[var(--th)] pb-6 pl-24 md:pl-28">
          <div className="rounded-lg bg-blue-600 p-2 text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            OpoQuiz{" "}
            <span className="text-[var(--azul)]">AI</span>
          </h1>

          <ThemeToggle className="ml-auto" />
        </header>

        {!examen && (
          <div className="mx-auto max-w-2xl rounded-3xl border border-[var(--th)] bg-[var(--card)] p-6 shadow-[var(--sombra)] backdrop-blur-xl sm:p-8">
            <div className="mb-8 text-center">
              <h2 className="mb-2 text-2xl font-bold">
                Crea tu examen personalizado
              </h2>

              <p className="text-[var(--txt3)]">
                Elige cómo quieres introducir tu temario.
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Tipo de contenido"
              className="mb-6 flex gap-2 rounded-xl bg-[var(--card2)] p-1"
            >
              {(
                [
                  ["archivo", "Archivo"],
                  ["texto", "Texto"],
                  ["foto", "Foto"],
                ] as const
              ).map(([valor, etiqueta]) => (
                <button
                  key={valor}
                  type="button"
                  role="tab"
                  aria-selected={modoEntrada === valor}
                  onClick={() => {
                    setModoEntrada(valor);
                    setError("");
                  }}
                  className={`flex-1 rounded-lg py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] ${
                    modoEntrada === valor
                      ? "bg-[var(--azul)] text-white shadow-sm"
                      : "text-[var(--txt3)] hover:text-[var(--txt)]"
                  }`}
                >
                  {etiqueta}
                </button>
              ))}
            </div>

            <form
              onSubmit={handleGenerar}
              className="space-y-6"
              noValidate
            >
              {modoEntrada === "archivo" && (
                <div>
                  <label
                    htmlFor="archivos"
                    className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
                  >
                    Documentos de estudio
                  </label>

                  <input
                    ref={inputArchivosRef}
                    id="archivos"
                    type="file"
                    accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp"
                    multiple
                    className="sr-only"
                    onChange={(evento) => {
                      seleccionarArchivos(
                        Array.from(evento.target.files || []),
                      );
                    }}
                  />

                  <div
                    onDragEnter={(evento) => {
                      evento.preventDefault();
                      setArrastrando(true);
                    }}
                    onDragOver={(evento) => {
                      evento.preventDefault();
                      setArrastrando(true);
                    }}
                    onDragLeave={(evento) => {
                      evento.preventDefault();
                      setArrastrando(false);
                    }}
                    onDrop={handleDrop}
                    className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                      arrastrando
                        ? "border-[var(--azul)] bg-[var(--sel)]"
                        : "border-[var(--th2)] bg-[var(--card2)] hover:bg-[var(--suave)]"
                    }`}
                  >
                    <svg
                      className="mx-auto mb-3 h-10 w-10 text-[var(--txt3)]"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>

                    <label
                      htmlFor="archivos"
                      className="cursor-pointer text-sm font-medium text-[var(--azul)]"
                    >
                      {archivos.length > 0
                        ? `Has seleccionado ${archivos.length} archivo(s)`
                        : "Haz clic o arrastra tus apuntes aquí"}
                    </label>

                    <p className="mt-2 text-xs text-[var(--txt3)]">
                      PDF, DOCX, TXT, JPG, PNG o WebP. Máximo 3,5 MB por
                      archivo y 4 MB en total.
                    </p>

                    {archivos.length > 0 && (
                      <ul className="mt-4 space-y-2 text-left text-xs text-[var(--txt2)]">
                        {archivos.map((archivo) => (
                          <li
                            key={`${archivo.name}-${archivo.size}`}
                            className="truncate rounded-lg bg-[var(--suave)] px-3 py-2"
                          >
                            {archivo.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {modoEntrada === "texto" && (
                <div>
                  <label
                    htmlFor="texto-apuntes"
                    className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
                  >
                    Pega tus apuntes aquí
                  </label>

                  <textarea
                    id="texto-apuntes"
                    value={textoPegado}
                    onChange={(evento) =>
                      setTextoPegado(evento.target.value)
                    }
                    placeholder="Copia y pega el texto de tus apuntes..."
                    className="h-40 w-full resize-y rounded-xl border border-[var(--th)] bg-[var(--card2)] p-4 text-sm text-[var(--txt)] outline-none backdrop-blur-sm focus:border-[var(--azul)] focus:ring-2 focus:ring-[var(--azul)]/30"
                  />

                  <p className="mt-2 text-right text-xs text-[var(--txt3)]">
                    {textoPegado.trim().length} caracteres
                  </p>
                </div>
              )}

              {modoEntrada === "foto" && (
                <div>
                  <label
                    htmlFor="foto-apuntes"
                    className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
                  >
                    Sube una foto de tus apuntes
                  </label>

                  <input
                    ref={inputFotoRef}
                    id="foto-apuntes"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(evento) => {
                      const nuevaFoto =
                        evento.target.files?.[0] || null;

                      if (!nuevaFoto) {
                        setFoto(null);
                        return;
                      }

                      const errorFoto = validarFoto(nuevaFoto);

                      if (errorFoto) {
                        setError(errorFoto);
                        return;
                      }

                      setFoto(nuevaFoto);
                      setError("");
                    }}
                  />

                  <label
                    htmlFor="foto-apuntes"
                    className="block cursor-pointer rounded-xl border-2 border-dashed border-[var(--th2)] bg-[var(--card2)] p-6 text-center transition-colors hover:bg-[var(--suave)]"
                  >
                    <svg
                      className="mx-auto mb-3 h-10 w-10 text-[var(--txt3)]"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>

                    <span className="block text-sm font-medium text-[var(--azul)]">
                      {foto
                        ? `Foto seleccionada: ${foto.name}`
                        : "Haz clic para subir una foto"}
                    </span>

                    <span className="mt-2 block text-xs text-[var(--txt3)]">
                      JPG, PNG o WebP. Máximo 3,5 MB.
                    </span>
                  </label>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 border-t border-[var(--th)] pt-6 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="tipo-estudio"
                    className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
                  >
                    Tipo de estudio
                  </label>

                  <select
                    id="tipo-estudio"
                    value={tipoEstudio}
                    onChange={(evento) =>
                      setTipoEstudio(evento.target.value)
                    }
                    className="block w-full cursor-pointer rounded-lg border border-[var(--th)] bg-[var(--card2)] p-3 text-[var(--txt)] outline-none backdrop-blur-sm focus:border-[var(--azul)] focus:ring-2 focus:ring-[var(--azul)]/30"
                  >
                    <option>Oposiciones</option>
                    <option>Bachillerato</option>
                    <option>Universidad</option>
                    <option>Secundaria</option>
                    <option>Primaria</option>
                    <option>General</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="numero-preguntas"
                    className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
                  >
                    Número de preguntas
                  </label>

                  <select
                    id="numero-preguntas"
                    value={numPreguntas}
                    onChange={(evento) =>
                      setNumPreguntas(evento.target.value)
                    }
                    className="block w-full cursor-pointer rounded-lg border border-[var(--th)] bg-[var(--card2)] p-3 text-[var(--txt)] outline-none backdrop-blur-sm focus:border-[var(--azul)] focus:ring-2 focus:ring-[var(--azul)]/30"
                  >
                    <option value="10">10 preguntas</option>
                    <option value="25">25 preguntas</option>
                    <option value="50">50 preguntas</option>
                    <option value="100">100 preguntas</option>
                  </select>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-[var(--err-b)] bg-[var(--err)] p-4 text-sm font-medium text-[var(--err-t)]"
                >
                  {error}
                </div>
              )}

              {aviso && (
                <div
                  role="status"
                  className="rounded-lg border border-[var(--ambar-b)] bg-[var(--ambar)] p-4 text-sm font-medium text-[var(--ambar-t)]"
                >
                  {aviso}
                </div>
              )}

              <button
                type="submit"
                disabled={cargando}
                className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-blue-600 px-6 py-4 font-bold text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-400"
              >
                {cargando ? (
                  <>
                    <svg
                      className="h-5 w-5 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>

                    {mensajeCarga || "Procesando..."}
                  </>
                ) : (
                  "Generar examen"
                )}
              </button>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleBorrarCache}
                  className="text-xs font-semibold text-[var(--txt3)] underline-offset-4 hover:text-[var(--azul)] hover:underline"
                >
                  Borrar caché local
                </button>
              </div>
            </form>
          </div>
        )}

        {examen && (
          <div className="space-y-6">
            <div className="sticky top-4 z-30 flex flex-col gap-4 rounded-2xl border border-[var(--th)] bg-[var(--card)] p-4 shadow-[var(--sombra)] backdrop-blur-xl md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <span
                  className="flex h-3 w-3 rounded-full bg-blue-500"
                  aria-hidden="true"
                />

                <h2 className="text-lg font-bold">
                  {corregido
                    ? "Resultados de la simulación"
                    : "Examen en curso"}
                </h2>

                {origen === "cache" && (
                  <span
                    title="Preguntas recuperadas de la caché local"
                    className="hidden rounded-full border border-[var(--ok-b)] bg-[var(--ok)] px-2.5 py-1 text-xs font-bold text-[var(--ok-t)] sm:inline"
                  >
                    Caché
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleDescargarPDF}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--th)] bg-[var(--card2)] px-4 py-2.5 text-sm font-semibold text-[var(--txt2)] transition-colors hover:bg-[var(--suave2)]"
                  title="Descargar en PDF"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>

                  PDF
                </button>

                {corregido ? (
                  <button
                    type="button"
                    onClick={reiniciarFormulario}
                    className="cursor-pointer rounded-lg bg-[var(--btn)] px-5 py-2.5 text-sm font-semibold text-[var(--btn-txt)] transition-colors hover:bg-[var(--btnh)]"
                  >
                    Crear nuevo test
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCorregir}
                    className="cursor-pointer rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-500/30 transition-colors hover:bg-emerald-600"
                  >
                    Finalizar y corregir
                  </button>
                )}
              </div>
            </div>

            {aviso && (
              <div
                role="status"
                className="rounded-xl border border-[var(--ambar-b)] bg-[var(--ambar)] p-4 text-sm font-medium text-[var(--ambar-t)]"
              >
                {aviso}
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-[var(--err-b)] bg-[var(--err)] p-4 text-sm font-medium text-[var(--err-t)]"
              >
                {error}
              </div>
            )}

            {corregido && (
              <section className="mb-8 rounded-2xl border border-[var(--th)] bg-[var(--card)] p-6 shadow-[var(--sombra)] backdrop-blur-xl md:p-8">
                <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
                  <div className="rounded-xl border border-[var(--th)] bg-[var(--card2)] p-4">
                    <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-[var(--txt3)]">
                      Nota final
                    </p>
                    <p
                      className={`text-4xl font-black ${
                        Number(resultados.nota) >= 5
                          ? "text-[var(--azul)]"
                          : "text-[var(--rojo)]"
                      }`}
                    >
                      {resultados.nota}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[var(--ok-b)] bg-[var(--ok)] p-4">
                    <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-[var(--ok-t)]">
                      Aciertos
                    </p>
                    <p className="text-4xl font-bold text-[var(--ok-t)]">
                      {resultados.aciertos}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[var(--err-b)] bg-[var(--err)] p-4">
                    <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-[var(--err-t)]">
                      Errores
                    </p>
                    <p className="text-4xl font-bold text-[var(--err-t)]">
                      {resultados.errores}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[var(--th)] bg-[var(--card2)] p-4">
                    <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-[var(--txt3)]">
                      En blanco
                    </p>
                    <p className="text-4xl font-bold text-[var(--txt3)]">
                      {resultados.enBlanco}
                    </p>
                  </div>
                </div>
              </section>
            )}

            <div className="space-y-6 pb-24">
              {examen.map((pregunta, index) => {
                const respuestaSeleccionada =
                  respuestasUsuario[index];

                const sinResponder =
                  respuestaSeleccionada === undefined;

                const esCorrecta =
                  respuestaSeleccionada === pregunta.correcta;

                const claseRetroalimentacion = sinResponder
                  ? "border-[var(--ambar-b)] bg-[var(--ambar)]"
                  : esCorrecta
                    ? "border-[var(--ok-b)] bg-[var(--ok)]"
                    : "border-[var(--err-b)] bg-[var(--err)]";

                const claseTextoRetroalimentacion = sinResponder
                  ? "text-[var(--ambar-t)]"
                  : esCorrecta
                    ? "text-[var(--ok-t)]"
                    : "text-[var(--err-t)]";

                return (
                  <article
                    id={`pregunta-${index}`}
                    key={index}
                    className="rounded-2xl border border-[var(--th)] bg-[var(--card)] p-5 shadow-[var(--sombra)] backdrop-blur-xl md:p-8"
                  >
                    <div className="flex gap-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                        {index + 1}
                      </span>

                      <h3 className="text-lg font-semibold leading-snug">
                        {pregunta.enunciado}
                      </h3>
                    </div>

                    <ul className="mt-6 space-y-3 md:pl-12">
                      {pregunta.opciones.map((opcion, opcionIndex) => {
                        let claseBoton =
                          "flex w-full items-start rounded-xl border-2 p-4 text-left transition-all duration-200 ";

                        if (!corregido) {
                          claseBoton +=
                            respuestaSeleccionada === opcionIndex
                              ? "border-blue-500 bg-[var(--sel)] ring-2 ring-blue-500/20"
                              : "cursor-pointer border-[var(--th)] bg-[var(--card2)] hover:border-blue-300 hover:bg-[var(--suave)]";
                        } else if (opcionIndex === pregunta.correcta) {
                          claseBoton +=
                            "border-emerald-500 bg-[var(--ok)]";
                        } else if (
                          respuestaSeleccionada === opcionIndex &&
                          !esCorrecta
                        ) {
                          claseBoton +=
                            "border-red-500 bg-[var(--err)]";
                        } else {
                          claseBoton +=
                            "border-[var(--th)] bg-[var(--card2)] opacity-50";
                        }

                        const claseLetra =
                          respuestaSeleccionada === opcionIndex &&
                          !corregido
                            ? "bg-blue-600 text-white"
                            : corregido &&
                                opcionIndex === pregunta.correcta
                              ? "bg-emerald-500 text-white"
                              : corregido &&
                                  respuestaSeleccionada === opcionIndex
                                ? "bg-red-500 text-white"
                                : "bg-[var(--card)] text-[var(--txt3)]";

                        return (
                          <li key={opcionIndex}>
                            <button
                              type="button"
                              disabled={corregido}
                              onClick={() =>
                                handleSeleccionarRespuesta(
                                  index,
                                  opcionIndex,
                                )
                              }
                              className={claseBoton}
                            >
                              <span
                                className={`mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${claseLetra}`}
                              >
                                {String.fromCharCode(
                                  65 + opcionIndex,
                                )}
                              </span>

                              <span className="flex-1 text-[var(--txt2)]">
                                {opcion}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>

                    {corregido && (
                      <div
                        className={`mt-6 rounded-xl border p-5 md:ml-12 ${claseRetroalimentacion}`}
                      >
                        <p
                          className={`mb-1 text-sm font-bold ${claseTextoRetroalimentacion}`}
                        >
                          {sinResponder
                            ? `○ Sin responder. La opción válida era la ${String.fromCharCode(65 + pregunta.correcta)}.`
                            : esCorrecta
                              ? "✓ ¡Respuesta correcta!"
                              : `✗ Incorrecto. La opción válida era la ${String.fromCharCode(65 + pregunta.correcta)}.`}
                        </p>

                        {pregunta.explicacion && (
                          <p className="text-sm leading-relaxed text-[var(--txt2)]">
                            {pregunta.explicacion}
                          </p>
                        )}

                        <div className="mt-4 border-t border-black/10 pt-4">
                          {!explicaciones[index] &&
                            !cargandoExplicacion[index] && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleExplicar(index, pregunta)
                                }
                                className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[var(--azul)] hover:underline"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <path d="M12 2v8" />
                                  <path d="m4.93 10.93 1.41 1.41" />
                                  <path d="M2 18h2" />
                                  <path d="M20 18h2" />
                                  <path d="m19.07 10.93-1.41 1.41" />
                                  <path d="M22 22H2" />
                                  <path d="m8 6 4-4 4 4" />
                                  <path d="M16 18a4 4 0 0 0-8 0" />
                                </svg>

                                ¿Por qué? Pregúntale al tutor IA
                              </button>
                            )}

                          {cargandoExplicacion[index] && (
                            <p
                              role="status"
                              className="flex items-center gap-2 text-sm text-[var(--txt3)]"
                            >
                              <svg
                                className="h-4 w-4 animate-spin"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>

                              El tutor está pensando...
                            </p>
                          )}

                          {explicaciones[index] && (
                            <div
                              role="status"
                              className="mt-2 rounded-lg border border-black/5 bg-[var(--card2)] p-4 text-sm text-[var(--txt2)]"
                            >
                              <strong className="mb-1 block text-[var(--azul)]">
                                💡 Explicación del tutor
                              </strong>

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
              <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--th)] bg-[var(--card)] p-4 shadow-[0_-4px_14px_-4px_rgba(0,0,0,0.1)] backdrop-blur-xl">
                <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 sm:flex-row">
                  <p className="text-sm font-medium text-[var(--txt3)]">
                    Preguntas respondidas:{" "}
                    <span className="font-bold text-[var(--txt)]">
                      {Object.keys(respuestasUsuario).length} de{" "}
                      {examen.length}
                    </span>
                  </p>

                  <button
                    type="button"
                    onClick={handleCorregir}
                    className="w-full cursor-pointer rounded-xl bg-emerald-500 px-8 py-3 text-lg font-bold text-white shadow-lg shadow-emerald-500/30 transition-colors hover:bg-emerald-600 sm:w-auto"
                  >
                    Corregir examen
                  </button>
                </div>
              </div>
            )}

            {!corregido && (
              <button
                type="button"
                onClick={handleNavegacionFlotante}
                className="fixed bottom-28 right-4 z-30 flex cursor-pointer items-center justify-center rounded-full bg-indigo-600 p-4 text-white shadow-xl transition-transform hover:scale-110 sm:bottom-24 sm:right-6"
                title="Ir a la siguiente pregunta sin responder"
                aria-label="Ir a la siguiente pregunta sin responder"
              >
                {Object.keys(respuestasUsuario).length < examen.length ? (
                  <span className="relative">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 13l-7 7-7-7m14-8l-7 7-7-7"
                      />
                    </svg>

                    <span className="absolute -right-2 -top-2 rounded-full border-2 border-white bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                      {examen.length -
                        Object.keys(respuestasUsuario).length}
                    </span>
                  </span>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 10l7-7m0 0l7 7m-7-7v18"
                    />
                  </svg>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
