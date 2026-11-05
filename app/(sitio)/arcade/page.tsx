"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useSesion } from "@/components/SessionProvider";
import { prepararArchivos } from "@/lib/imagenes";
import {
  MAX_GENERACIONES_INVITADO,
  MAX_PREGUNTAS_INVITADO,
  MENSAJE_LIMITE_INVITADO,
} from "@/lib/limites-invitado-constantes";
import { MAX_PREGUNTAS_FREEMIUM } from "@/lib/planes";
import { useLocale, useTranslations } from "next-intl";
import {
  opcionesTipoEstudio,
  tipoEstudioPorDefecto,
} from "@/lib/tipos-estudio";
import { opcionesIdiomaExamen } from "@/lib/idiomas-examen";

// --- Constantes y Tipos ---
const MAX_CANTIDAD_ARCHIVOS = 8;
const MAX_TAMANO_ARCHIVO = 3_500_000;
const MAX_TAMANO_TOTAL = 4_000_000;
const MAX_PREGUNTAS_ARCADE = 30;
const PREFIJO_HISTORIAL_ARCADE = "arcade_usadas_";
const MAX_HISTORIAL_ARCADE = 60;

const EXTENSIONES_PERMITIDAS = new Set([
  "pdf", "docx", "txt", "md", "markdown", "csv", "tsv", "json", "xml", "html",
  "htm", "log", "yaml", "yml", "ini", "conf", "rtf", "css", "scss", "less",
  "js", "jsx", "ts", "tsx", "py", "java", "c", "cpp", "cs", "go", "rs",
  "php", "rb", "sh", "ps1", "sql", "jpg", "jpeg", "png", "webp",
]);

type Pantalla = "menu" | "config" | "loading" | "game" | "result";
type Fuente = "tema" | "archivos";
type Dificultad = "facil" | "media" | "dificil";
type ModoJuego = "normal" | "supervivencia";
type Resultado = "correct" | "wrong" | "timeout" | null;
type Destello = "good" | "bad" | null;

type ModoExplicado = "archivos" | "tema" | "supervivencia";

const MODOS_INFO: Array<{
  id: ModoExplicado;
  icono: string;
  titulo: string;
  descripcion: string;
  detalle: string;
}> = [
  {
    id: "archivos",
    icono: "📁",
    titulo: "Mis Archivos",
    descripcion:
      "Sube tus apuntes y la IA creará un test a tu medida.",
    detalle:
      "Sube uno o varios archivos con tus apuntes y deja que la IA extraiga el contenido para crear preguntas tipo test. Puedes elegir la dificultad, el tiempo por pregunta y el número de vidas antes de empezar.",
  },
  {
    id: "tema",
    icono: "✍️",
    titulo: "Tema Libre",
    descripcion:
      "Escribe cualquier tema y la IA generará las preguntas.",
    detalle:
      "No necesitas apuntes: escribe un tema, una asignatura o un concepto y la IA generará un test completo con preguntas nuevas. Ideal para repasar de memoria o practicar cualquier materia.",
  },
  {
    id: "supervivencia",
    icono: "🔥",
    titulo: "Supervivencia",
    descripcion: "Modo extremo. Sin vidas, sin piedad.",
    detalle:
      "Modo extremo. Sin vidas, sin piedad. Demuestra cuánto aguantas sin fallar una sola respuesta.",
  },
];

const BENEFICIOS_INFO = [
  {
    icono: "⚡",
    titulo: "Agilidad mental",
    texto: "Piensa rápido bajo presión.",
  },
  {
    icono: "📖",
    titulo: "Comprensión exprés",
    texto: "Capta lo esencial en segundos.",
  },
  {
    icono: "🧠",
    titulo: "Memoria a largo plazo",
    texto: "Fija conceptos con emoción.",
  },
  {
    icono: "🧘",
    titulo: "Gestión del estrés",
    texto: "Mantén la calma con el cronómetro.",
  },
] as const;

type PreguntaFuente = {
  q: string;
  o: string[];
  a: number;
  e: string;
};

type PreguntaJuego = {
  q: string;
  options: string[];
  correct: number;
  cat: string;
  exp: string;
};

type Feedback = {
  mensaje: string;
  explicacion: string;
  correcta: boolean;
};

type Flotante = {
  id: number;
  texto: string;
};

type Config = {
  time: number;
  lives: number;
  difficulty: Dificultad;
  mode: ModoJuego;
};

type EstadoArcade = {
  pantalla: Pantalla;
  preguntas: PreguntaFuente[];
  actual: PreguntaJuego | null;
  siguienteIndice: number;
  ronda: number;
  limiteRondas: number | null;
  puntuacion: number;
  racha: number;
  aciertos: number;
  vidas: number;
  modo: ModoJuego;
  bloqueado: boolean;
  pausado: boolean;
  primeraPregunta: boolean;
  aviso: string;
  comodines: {
    cincuenta: number;
    saltar: number;
    pista: number;
  };
  seleccionada: number | null;
  ocultas: number[];
  feedback: Feedback | null;
  pista: string;
  cargandoPista: boolean;
  errorPista: string;
  pausaPista: boolean;
  resultado: Resultado;
  sacudir: boolean;
  destello: Destello;
  flotantes: Flotante[];
  tiempo: number;
  subtituloResultado: string;
};

type DocumentoExtraido = {
  nombre: string;
  texto: string;
};

type RespuestaPreguntas = {
  questions: PreguntaFuente[];
  notice: string;
  limiteInvitado: unknown;
};

type ErrorApi = Error & {
  status?: number;
  codigo?: string;
  limiteInvitado?: unknown;
};

// --- Utilidades ---
function ahora(): number {
  return performance.now();
}

function crearEstadoInicial(): EstadoArcade {
  return {
    pantalla: "menu",
    preguntas: [],
    actual: null,
    siguienteIndice: 0,
    ronda: 1,
    limiteRondas: null,
    puntuacion: 0,
    racha: 0,
    aciertos: 0,
    vidas: 3,
    modo: "normal",
    bloqueado: false,
    pausado: false,
    primeraPregunta: true,
    aviso: "",
    comodines: { cincuenta: 1, saltar: 1, pista: 1 },
    seleccionada: null,
    ocultas: [],
    feedback: null,
    pista: "",
    cargandoPista: false,
    errorPista: "",
    pausaPista: false,
    resultado: null,
    sacudir: false,
    destello: null,
    flotantes: [],
    tiempo: 15,
    subtituloResultado: "¡Buen intento!",
  };
}

function mezclar<T>(items: T[]): T[] {
  const resultado = items.slice();
  for (let i = resultado.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [resultado[i], resultado[j]] = [resultado[j], resultado[i]];
  }
  return resultado;
}

function extension(nombre: string): string {
  const partes = nombre.toLowerCase().split(".");
  return partes.length > 1 ? partes[partes.length - 1] : "";
}

function indiceCorrecto(valor: unknown): number | null {
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

function normalizarPreguntas(valor: unknown): PreguntaFuente[] {
  if (!Array.isArray(valor)) return [];
  const preguntas: PreguntaFuente[] = [];
  for (const item of valor) {
    if (!item || typeof item !== "object") continue;
    const pregunta = item as Record<string, unknown>;
    const enunciado = typeof pregunta.enunciado === "string" ? pregunta.enunciado.trim() : "";
    const opciones = Array.isArray(pregunta.opciones)
      ? pregunta.opciones.filter((opcion): opcion is string => typeof opcion === "string").map(o => o.trim())
      : [];
    const correcta = indiceCorrecto(pregunta.correcta);
    const unicas = new Set(opciones.map(o => o.toLowerCase()));
    if (enunciado.length < 8 || opciones.length !== 4 || unicas.size !== 4 || opciones.some(o => o.length === 0) || correcta === null) continue;
    preguntas.push({
      q: enunciado,
      o: opciones,
      a: correcta,
      e: typeof pregunta.explicacion === "string" ? pregunta.explicacion.trim() : "",
    });
  }
  return preguntas;
}

function prepararPregunta(pregunta: PreguntaFuente): PreguntaJuego {
  const orden = mezclar([0, 1, 2, 3]);
  return {
    q: pregunta.q,
    options: orden.map(i => pregunta.o[i]),
    correct: orden.indexOf(pregunta.a),
    cat: "Temario",
    exp: pregunta.e,
  };
}

function multiplicadorRacha(racha: number): number {
  if (racha >= 6) return 4;
  if (racha >= 4) return 3;
  if (racha >= 2) return 2;
  return 1;
}

async function fetchConTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const temporizador = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, credentials: "include", signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("La operación ha tardado demasiado.");
    throw error;
  } finally {
    window.clearTimeout(temporizador);
  }
}

async function leerJson(response: Response): Promise<unknown> {
  try { return await response.json(); } catch { return {}; }
}

function mensajeError(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data && typeof data.error === "string" && data.error.trim()) {
    return data.error.trim();
  }
  return fallback;
}

function crearErrorApi(mensaje: string, status: number, data: unknown): ErrorApi {
  const error = new Error(mensaje) as ErrorApi;
  const objeto = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  error.status = status;
  error.codigo = objeto?.codigo && typeof objeto.codigo === "string" ? objeto.codigo : "";
  error.limiteInvitado = objeto?.limiteInvitado ?? null;
  return error;
}

function validarArchivos(archivos: File[]): string {
  if (archivos.length === 0) return "Selecciona al menos un archivo.";
  if (archivos.length > MAX_CANTIDAD_ARCHIVOS) return `Máximo ${MAX_CANTIDAD_ARCHIVOS} archivos.`;
  let total = 0;
  for (const archivo of archivos) {
    if (!EXTENSIONES_PERMITIDAS.has(extension(archivo.name))) return `Formato no permitido en «${archivo.name}».`;
    if (archivo.size <= 0) return `El archivo «${archivo.name}» está vacío.`;
    if (archivo.size > MAX_TAMANO_ARCHIVO) return `El archivo «${archivo.name}» supera los 3,5 MB.`;
    total += archivo.size;
  }
  if (total > MAX_TAMANO_TOTAL) return "El tamaño total supera los 4 MB.";
  return "";
}

async function extraerArchivos(archivos: File[]): Promise<DocumentoExtraido[]> {
  const formData = new FormData();
  for (const archivo of archivos) formData.append("archivos", archivo);
  const response = await fetchConTimeout("/api/extraer", { method: "POST", body: formData }, 55000);
  const data = await leerJson(response);
  if (!response.ok) throw new Error(mensajeError(data, "Error al leer archivos."));
  const objeto = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  if (!objeto || !Array.isArray(objeto.documentos)) throw new Error("No se pudo extraer texto útil.");
  const documentos: DocumentoExtraido[] = [];
  for (const item of objeto.documentos) {
    if (!item || typeof item !== "object") continue;
    const doc = item as Record<string, unknown>;
    if (typeof doc.texto !== "string" || doc.texto.trim().length < 10) continue;
    documentos.push({
      nombre: typeof doc.nombre === "string" ? doc.nombre.trim().slice(0, 180) : "Documento",
      texto: doc.texto.trim(),
    });
  }
  if (documentos.length === 0) throw new Error("No se pudo extraer texto útil.");
  return documentos;
}

function construirTextoEstudio(documentos: DocumentoExtraido[]): string {
  return documentos.map((doc, i) => {
    const titulo = doc.nombre.replace(/[\r\n]+/g, " ").replace(/---/g, "-").trim().slice(0, 120);
    return `\n--- INICIO DOCUMENTO ${i + 1}: ${titulo || "Documento"} ---\n${doc.texto}\n--- FIN DOCUMENTO ${i + 1} ---\n`;
  }).join("\n\n");
}

function leerPreguntasUsadas(tema: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const guardadas = window.localStorage.getItem(`${PREFIJO_HISTORIAL_ARCADE}${tema}`);
    if (!guardadas) return [];
    const valor: unknown = JSON.parse(guardadas);
    if (!Array.isArray(valor)) return [];
    const preguntas = valor
      .filter((item): item is string => typeof item === "string")
      .map(item => item.trim())
      .filter(Boolean);
    return Array.from(new Set(preguntas)).slice(-MAX_HISTORIAL_ARCADE);
  } catch {
    return [];
  }
}

function guardarPreguntasUsadas(tema: string, previas: string[], nuevas: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const historial = Array.from(new Set([...previas, ...nuevas.filter(Boolean)]));
    window.localStorage.setItem(
      `${PREFIJO_HISTORIAL_ARCADE}${tema}`,
      JSON.stringify(historial.slice(-MAX_HISTORIAL_ARCADE)),
    );
  } catch {
    // El historial es una mejora opcional: si localStorage falla, la partida continúa.
  }
}

async function pedirPreguntas(
  texto: string,
  numeroPreguntas: number,
  dificultad: Dificultad,
  tipoEstudio: string,
  idioma: string,
  evitar: string[] = [],
  tema: string = "",
): Promise<RespuestaPreguntas> {
  const response = await fetchConTimeout("/api/generar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      texto,
      tema,
      tipoEstudio,
      idioma,
      modoArcade: true,
      numPreguntas: String(numeroPreguntas),
      dificultad,
      evitar,
    }),
    cache: "no-store",
  }, 65000);
  const data = await leerJson(response);
  if (!response.ok) throw crearErrorApi(mensajeError(data, "Error al generar preguntas."), response.status, data);
  const objeto = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  const questions = normalizarPreguntas(objeto?.preguntas);
  if (questions.length < 5) throw new Error("La IA no devolvió suficientes preguntas.");
  return {
    questions,
    notice: objeto && typeof objeto.aviso === "string" ? objeto.aviso : "",
    limiteInvitado: objeto?.limiteInvitado ?? null,
  };
}

export default function ArcadePage() {
  const t = useTranslations("Arcade");
  const locale = useLocale();
  const { sesion, cargando: cargandoSesion, limiteInvitado, actualizarLimiteInvitado } = useSesion();

  const [vista, setVista] = useState<EstadoArcade>(() => crearEstadoInicial());
  const [config, setConfig] = useState<Config>({ time: 15, lives: 3, difficulty: "media", mode: "normal" });
  const [fuente, setFuente] = useState<Fuente>("archivos");
  const [tema, setTema] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [preparandoArchivos, setPreparandoArchivos] = useState(false);
  const [tipoEstudio, setTipoEstudio] = useState<string>(() =>
    tipoEstudioPorDefecto(locale),
  );
  const [idioma, setIdioma] = useState("español");
  const [errorConfig, setErrorConfig] = useState("");
  const [faseCarga, setFaseCarga] = useState<
    "inactivo" | "leyendo" | "generando"
  >("inactivo");
  const [modalAyuda, setModalAyuda] = useState(false);
  const [modoExplicado, setModoExplicado] =
    useState<ModoExplicado | null>(null);

  const vistaRef = useRef(vista);
  const configRef = useRef(config);
  const sesionRef = useRef(sesion);
  const limiteRef = useRef(limiteInvitado);
  const generandoRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const timerActivoRef = useRef(false);
  const pausaPistaRef = useRef<number | null>(null);
  const transicionRef = useRef<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const flotanteIdRef = useRef(0);
  const modalRef = useRef(modalAyuda);
  const inputArchivosRef = useRef<HTMLInputElement>(null);
  const pausaResumeRef = useRef<HTMLButtonElement>(null);
  const modalCloseRef = useRef<HTMLButtonElement>(null);
  const accionesRef = useRef<{
    responder: (indice: number) => void;
    abrirPausa: () => void;
    cerrarPausa: () => void;
    cerrarAyuda: () => void;
  } | null>(null);

  const limiteAgotado = !sesion && Boolean(limiteInvitado?.agotado);
  const mensajeLimite = limiteInvitado?.mensaje?.trim() || MENSAJE_LIMITE_INVITADO;
  const generarDeshabilitado = cargandoSesion || limiteAgotado;
  const porcentajeTiempo = Math.max(0, Math.min(100, (vista.tiempo / config.time) * 100));
  const multiplicador = multiplicadorRacha(vista.racha);
  const comodinesDisponibles = !vista.bloqueado && !vista.primeraPregunta;
  const modoActual = modoExplicado
    ? MODOS_INFO.find((modo) => modo.id === modoExplicado) ?? null
    : null;

  useEffect(() => { sesionRef.current = sesion; }, [sesion]);
  useEffect(() => { limiteRef.current = limiteInvitado; }, [limiteInvitado]);
  useEffect(() => { modalRef.current = modalAyuda; }, [modalAyuda]);
  useEffect(() => { if (vista.pausado) pausaResumeRef.current?.focus(); }, [vista.pausado]);
  useEffect(() => { if (modalAyuda) modalCloseRef.current?.focus(); }, [modalAyuda]);

  // Al pulsar "Arcade" en la cabecera estando ya dentro de /arcade,
  // Next.js no vuelve a montar la página. Este evento fuerza el menú.
  useEffect(() => {
    function volverAlMenu(): void {
      Object.assign(vistaRef.current, crearEstadoInicial());
      setErrorConfig("");
      setModalAyuda(false);
      setModoExplicado(null);
      setVista({ ...vistaRef.current });
    }

    window.addEventListener("opogen:arcade-menu", volverAlMenu);

    return () => {
      window.removeEventListener("opogen:arcade-menu", volverAlMenu);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      if (pausaPistaRef.current !== null) window.clearTimeout(pausaPistaRef.current);
      if (transicionRef.current !== null) window.clearTimeout(transicionRef.current);
      if (audioRef.current) void audioRef.current.close().catch(() => {});
    };
  }, []);

  function commit(): void { setVista({ ...vistaRef.current }); }

  function actualizarConfig(cambio: Partial<Config>): void {
    const siguiente = { ...configRef.current, ...cambio };
    configRef.current = siguiente;
    setConfig(siguiente);
  }

  function beep(frecuencia: number, duracion: number, tipo: OscillatorType = "sine", volumen = 0.15): void {
    try {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioRef.current) audioRef.current = new AudioCtx();
      const audio = audioRef.current;
      if (audio.state === "suspended") void audio.resume().catch(() => {});
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = tipo;
      oscillator.frequency.value = frecuencia;
      gain.gain.value = volumen;
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + duracion);
    } catch {}
  }

  function sonidoBien(): void { beep(880, 0.09, "triangle"); window.setTimeout(() => beep(1320, 0.12, "triangle"), 80); }
  function sonidoMal(): void { beep(200, 0.18, "sawtooth", 0.12); }
  function sonidoToque(): void { beep(500, 0.05, "square", 0.08); }
  function vibrar(patron: number | number[]): void { try { navigator.vibrate?.(patron); } catch {} }

  function activarDestello(tipo: Exclude<Destello, null>): void {
    vistaRef.current.destello = tipo;
    window.setTimeout(() => { vistaRef.current.destello = null; commit(); }, 140);
  }

  function agregarFlotante(texto: string): void {
    const id = flotanteIdRef.current + 1;
    flotanteIdRef.current = id;
    vistaRef.current.flotantes = [...vistaRef.current.flotantes, { id, texto }];
    window.setTimeout(() => {
      vistaRef.current.flotantes = vistaRef.current.flotantes.filter(i => i.id !== id);
      commit();
    }, 900);
  }

  function sacudirTarjeta(): void {
    vistaRef.current.sacudir = true;
    window.setTimeout(() => { vistaRef.current.sacudir = false; commit(); }, 400);
  }

  function detenerTimer(): void {
    timerActivoRef.current = false;
    if (timerRef.current !== null) { window.clearInterval(timerRef.current); timerRef.current = null; }
  }

  function cancelarTransicion(): void {
    if (transicionRef.current !== null) { window.clearTimeout(transicionRef.current); transicionRef.current = null; }
  }

  function iniciarTimer(): void {
    detenerTimer();
    // En Supervivencia no hay límite de tiempo: no se arranca ningún intervalo.
    if (vistaRef.current.modo === "supervivencia") return;
    timerActivoRef.current = true;
    const inicio = ahora();
    const inicial = vistaRef.current.tiempo;
    timerRef.current = window.setInterval(() => {
      if (!timerActivoRef.current) return;
      const estado = vistaRef.current;
      const restante = inicial - (ahora() - inicio) / 1000;
      if (restante <= 0) {
        estado.tiempo = 0; commit(); detenerTimer(); manejarTimeout(); return;
      }
      estado.tiempo = restante; commit();
    }, 60);
  }

  function cancelarPausaPista(): void {
    if (pausaPistaRef.current !== null) {
      window.clearTimeout(pausaPistaRef.current);
      pausaPistaRef.current = null;
    }

    if (vistaRef.current.pausaPista) {
      vistaRef.current.pausaPista = false;
      commit();
    }
  }

  function reanudarTimerTrasPista(): void {
    if (pausaPistaRef.current !== null) {
      window.clearTimeout(pausaPistaRef.current);
    }

    pausaPistaRef.current = window.setTimeout(() => {
      pausaPistaRef.current = null;
      const estado = vistaRef.current;
      estado.pausaPista = false;
      commit();

      if (
        estado.pantalla === "game" &&
        !estado.pausado &&
        !estado.bloqueado &&
        !estado.primeraPregunta
      ) {
        iniciarTimer();
      }
    }, 5_000);
  }

  function programarTransicion(demora: number, accion: () => void): void {
    cancelarTransicion();
    transicionRef.current = window.setTimeout(() => {
      transicionRef.current = null;
      if (vistaRef.current.pantalla !== "game") return;
      accion();
    }, demora);
  }

  function cargarSiguiente(): void {
    const estado = vistaRef.current;
    cancelarPausaPista();
    detenerTimer();

    // Freemium e invitados juegan exactamente las preguntas disponibles
    // (5); al terminarlas se muestra la pantalla de fin de partida.
    if (
      estado.limiteRondas !== null &&
      estado.siguienteIndice >= estado.limiteRondas
    ) {
      terminarPartida(
        t("completed", { count: estado.limiteRondas }),
      );
      return;
    }

    if (estado.preguntas.length === 0) {
      setErrorConfig("No hay preguntas disponibles.");
      estado.pantalla = "config"; commit(); return;
    }
    const indice = estado.siguienteIndice % estado.preguntas.length;
    estado.siguienteIndice += 1;
    estado.ronda = estado.siguienteIndice;
    estado.actual = prepararPregunta(estado.preguntas[indice]);
    estado.bloqueado = false; estado.seleccionada = null; estado.ocultas = []; estado.feedback = null; estado.resultado = null; estado.sacudir = false;
    estado.pista = ""; estado.cargandoPista = false; estado.errorPista = "";
    estado.pausaPista = false;
    estado.tiempo = configRef.current.time; commit();
    if (!estado.primeraPregunta && estado.modo !== "supervivencia") iniciarTimer();
  }

  function terminarPartida(subtitulo = "¡Buen intento!"): void {
    const estado = vistaRef.current;
    detenerTimer();
    estado.bloqueado = true; estado.pausado = false; estado.pantalla = "result";
    estado.subtituloResultado = subtitulo; commit();
  }

  function manejarTimeout(): void {
    const estado = vistaRef.current;
    if (estado.bloqueado || !estado.actual) return;
    // Sin temporizador en Supervivencia, este caso no debería ocurrir.
    if (estado.modo === "supervivencia") { detenerTimer(); return; }
    estado.bloqueado = true; estado.resultado = "timeout"; estado.seleccionada = null; estado.racha = 0; estado.vidas -= 1;
    const pregunta = estado.actual;
    const letra = String.fromCharCode(65 + pregunta.correct);
    estado.feedback = {
      mensaje: `Se acabó el tiempo. La correcta era ${letra}) ${pregunta.options[pregunta.correct]}.`,
      explicacion: pregunta.exp,
      correcta: false,
    };
    sonidoMal(); vibrar([40, 60, 40]); activarDestello("bad"); sacudirTarjeta(); commit();
    if (estado.vidas <= 0) programarTransicion(2600, terminarPartida);
    else programarTransicion(2600, cargarSiguiente);
  }

  function responder(indice: number): void {
    const estado = vistaRef.current;
    if (estado.bloqueado || estado.primeraPregunta || !estado.actual) return;
    estado.bloqueado = true; detenerTimer(); estado.seleccionada = indice;
    const pregunta = estado.actual;
    if (indice === pregunta.correct) {
      sonidoBien(); vibrar(30); activarDestello("good");
      estado.resultado = "correct"; estado.racha += 1; estado.aciertos += 1;
      // En Supervivencia no hay tiempo: la puntuación depende solo de la racha.
      const puntos = estado.modo === "supervivencia"
        ? 100 * multiplicadorRacha(estado.racha)
        : (100 + Math.round(Math.max(0, estado.tiempo) * 10)) * multiplicadorRacha(estado.racha);
      estado.puntuacion += puntos;
      if (estado.racha >= 2) agregarFlotante(`x${multiplicadorRacha(estado.racha)}`);
      commit(); programarTransicion(750, cargarSiguiente); return;
    }
    sonidoMal(); vibrar([40, 60, 40]); activarDestello("bad"); sacudirTarjeta();
    estado.resultado = "wrong"; estado.racha = 0; estado.vidas -= 1;
    const letra = String.fromCharCode(65 + pregunta.correct);
    estado.feedback = {
      mensaje: `Incorrecto. La correcta era ${letra}) ${pregunta.options[pregunta.correct]}.`,
      explicacion: pregunta.exp,
      correcta: false,
    };
    if (estado.modo === "supervivencia") {
      // Un solo fallo termina la partida al instante.
      estado.subtituloResultado = `Fallaste en la pregunta ${estado.ronda}. La correcta era ${letra}) ${pregunta.options[pregunta.correct]}.`;
      commit();
      terminarPartida(estado.subtituloResultado);
      return;
    }
    commit();
    if (estado.vidas <= 0) programarTransicion(2600, terminarPartida);
    else programarTransicion(2600, cargarSiguiente);
  }

  function usarCincuenta(): void {
    const estado = vistaRef.current;
    if (estado.bloqueado || estado.primeraPregunta || estado.comodines.cincuenta <= 0 || !estado.actual) return;
    const incorrectas = [0, 1, 2, 3].filter(i => i !== estado.actual?.correct);
    estado.comodines = { ...estado.comodines, cincuenta: estado.comodines.cincuenta - 1 };
    estado.ocultas = mezclar(incorrectas).slice(0, 2);
    sonidoToque(); commit();
  }

  function usarSaltar(): void {
    const estado = vistaRef.current;
    if (estado.bloqueado || estado.primeraPregunta || estado.comodines.saltar <= 0) return;
    estado.comodines = { ...estado.comodines, saltar: estado.comodines.saltar - 1 };
    estado.bloqueado = true; sonidoToque(); detenerTimer(); commit();
    programarTransicion(150, cargarSiguiente);
  }

  async function usarPista(): Promise<void> {
    const estado = vistaRef.current;
    if (
      estado.bloqueado ||
      estado.primeraPregunta ||
      estado.cargandoPista ||
      estado.comodines.pista <= 0 ||
      !estado.actual
    ) {
      return;
    }

    const pregunta = estado.actual;
    estado.comodines = {
      ...estado.comodines,
      pista: estado.comodines.pista - 1,
    };
    estado.cargandoPista = true;
    estado.pista = "";
    estado.errorPista = "";
    sonidoToque();
    commit();

    try {
      const respuesta = await fetch("/api/arcade/pista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pregunta: pregunta.q,
          opciones: pregunta.options,
          respuestaCorrecta: pregunta.options[pregunta.correct],
        }),
        cache: "no-store",
      });

      const datos = (await respuesta.json().catch(() => ({}))) as {
        pista?: unknown;
      };

      if (!respuesta.ok || typeof datos.pista !== "string") {
        throw new Error("El amigo no ha podido contestar.");
      }

      const actual = vistaRef.current;
      if (actual.actual !== pregunta) return;

      const pausar =
        actual.modo !== "supervivencia" && timerActivoRef.current;

      if (pausar) {
        detenerTimer();
        actual.pausaPista = true;
      }

      actual.pista = datos.pista.trim();
      actual.cargandoPista = false;
      commit();

      if (pausar) reanudarTimerTrasPista();
    } catch {
      const actual = vistaRef.current;
      if (actual.actual !== pregunta) return;

      actual.cargandoPista = false;
      actual.errorPista = t("hintError");
      actual.comodines = {
        ...actual.comodines,
        pista: actual.comodines.pista + 1,
      };
      commit();
    }
  }

  function iniciarPrimeraPregunta(): void {
    const estado = vistaRef.current;
    if (!estado.primeraPregunta) return;
    estado.primeraPregunta = false; estado.tiempo = configRef.current.time; commit(); iniciarTimer();
  }

  function iniciarPartida(
    preguntas: PreguntaFuente[],
    aviso: string,
    limiteRondas: number | null = null,
  ): void {
    cancelarPausaPista();
    detenerTimer(); cancelarTransicion();
    const estado = vistaRef.current;
    const modo = configRef.current.mode;
    estado.pantalla = "game"; estado.preguntas = preguntas; estado.actual = null; estado.siguienteIndice = 0;
    estado.ronda = 1; estado.limiteRondas = limiteRondas;
    estado.puntuacion = 0; estado.racha = 0; estado.aciertos = 0;
    estado.modo = modo; estado.vidas = modo === "supervivencia" ? 1 : configRef.current.lives;
    estado.bloqueado = false; estado.pausado = false; estado.primeraPregunta = true; estado.aviso = aviso;
    estado.comodines = { cincuenta: 1, saltar: 1, pista: 1 }; estado.seleccionada = null; estado.ocultas = [];
    estado.feedback = null; estado.resultado = null; estado.sacudir = false; estado.destello = null; estado.flotantes = [];
    estado.pista = ""; estado.cargandoPista = false; estado.errorPista = "";
    estado.pausaPista = false;
    estado.tiempo = configRef.current.time; estado.subtituloResultado = "¡Buen intento!";
    cargarSiguiente();
  }

  function jugarOtraVez(): void {
    const estado = vistaRef.current;
    if (estado.preguntas.length === 0) { estado.pantalla = "menu"; commit(); return; }
    iniciarPartida(estado.preguntas, estado.aviso, estado.limiteRondas);
  }

  function crearTestNuevo(): void {
    cancelarPausaPista();
    cancelarTransicion();
    detenerTimer();
    const estado = crearEstadoInicial();
    estado.pantalla = "config";
    Object.assign(vistaRef.current, estado);
    setErrorConfig("");
    commit();
  }

  function abrirPausa(): void {
    const estado = vistaRef.current;
    if (estado.pantalla !== "game" || estado.bloqueado || estado.pausado) return;
    estado.pausado = true; detenerTimer(); commit();
  }

  function cerrarPausa(): void {
    const estado = vistaRef.current;
    if (!estado.pausado) return;
    estado.pausado = false; commit();
    if (!estado.primeraPregunta && !estado.bloqueado) iniciarTimer();
  }

  function salirAlMenu(): void {
    cancelarPausaPista();
    cancelarTransicion(); detenerTimer();
    const estado = vistaRef.current;
    estado.pausado = false; estado.bloqueado = false; estado.pantalla = "menu"; commit();
  }

  function abrirInfoModo(modo: ModoExplicado): void {
    setModoExplicado(modo);
    setModalAyuda(true);
  }

  function cerrarAyuda(): void {
    setModalAyuda(false);
    setModoExplicado(null);
  }

  function jugarModoSeleccionado(): void {
    const modo = modoExplicado;
    cerrarAyuda();

    if (!modo) return;

    if (modo === "tema") setFuente("tema");
    if (modo === "archivos") setFuente("archivos");
    if (modo === "supervivencia") {
      actualizarConfig({ mode: "supervivencia" });
    }

    irAConfiguracion();
  }

  function irAConfiguracion(): void { setErrorConfig(""); vistaRef.current.pantalla = "config"; commit(); }
  function seleccionarFuente(siguiente: Fuente): void { setFuente(siguiente); setErrorConfig(""); }
  function seleccionarTiempo(valor: number): void {
    actualizarConfig({ time: valor, difficulty: valor >= 20 ? "facil" : valor <= 10 ? "dificil" : "media" });
  }
  function seleccionarVidas(valor: number): void { actualizarConfig({ lives: valor }); }
  function seleccionarModo(valor: ModoJuego): void { actualizarConfig({ mode: valor }); }

  async function alSeleccionarArchivos(evento: ChangeEvent<HTMLInputElement>): Promise<void> {
    const seleccionados = Array.from(evento.currentTarget.files ?? []);
    if (seleccionados.length === 0) return;
    setPreparandoArchivos(true);
    try {
      const preparados = await prepararArchivos(seleccionados);
      const error = validarArchivos(preparados);
      if (error) { setArchivos([]); evento.currentTarget.value = ""; setErrorConfig(error); return; }
      setArchivos(preparados); setErrorConfig("");
    } finally {
      setPreparandoArchivos(false);
    }
  }

  function alEscribirTema(evento: ReactKeyboardEvent<HTMLInputElement>): void {
    if (evento.key === "Enter") { evento.preventDefault(); void iniciarGeneracion(); }
  }

  async function iniciarGeneracion(): Promise<void> {
    if (generandoRef.current) return;
    const yaAgotado = !sesionRef.current && Boolean(limiteRef.current?.agotado);
    if (yaAgotado) { setErrorConfig(""); vistaRef.current.pantalla = "config"; commit(); return; }
    const temaLimpio = tema.trim();
    if (fuente === "tema") {
      if (temaLimpio.length < 2 || temaLimpio.length > 100) { setErrorConfig("Tema inválido."); return; }
    } else {
      const err = validarArchivos(archivos);
      if (err) { setErrorConfig(err); return; }
    }
    generandoRef.current = true; setErrorConfig("");
    setFaseCarga(fuente === "tema" ? "generando" : "leyendo");
    vistaRef.current.pantalla = "loading"; commit();
    
    try {
      let textoParaGenerar = ""; let avisoPorDefecto = "";
      if (fuente === "tema") {
        textoParaGenerar = `TEMA DE ESTUDIO: ${temaLimpio}. Usa tu conocimiento general sobre este tema para generar un examen tipo test.`;
        avisoPorDefecto = `Preguntas generadas sobre «${temaLimpio}».`;
      } else {
        const docs = await extraerArchivos(archivos);
        textoParaGenerar = construirTextoEstudio(docs);
        avisoPorDefecto = `Generadas a partir de ${docs.length} archivo(s).`;
      }
      if (textoParaGenerar.trim().length < 10) throw new Error("Contenido insuficiente.");
      setFaseCarga("generando");
      const usuarioActual = sesionRef.current;
      const numeroPreguntas = !usuarioActual
        ? MAX_PREGUNTAS_INVITADO
        : usuarioActual.rol === "freemium"
          ? MAX_PREGUNTAS_FREEMIUM
          : MAX_PREGUNTAS_ARCADE;
      const limiteRondas =
        !usuarioActual || usuarioActual.rol === "freemium"
          ? Math.min(MAX_PREGUNTAS_FREEMIUM, numeroPreguntas)
          : null;

      // --- LÓGICA DE MEMORIA ---
      // Recuperamos el historial del tema para pedir preguntas distintas a las ya vistas.
      const preguntasUsadas = fuente === "tema" ? leerPreguntasUsadas(temaLimpio) : [];

      const res = await pedirPreguntas(
        textoParaGenerar,
        numeroPreguntas,
        configRef.current.difficulty,
        tipoEstudio,
        idioma,
        preguntasUsadas,
        fuente === "tema" ? temaLimpio : "",
      );

      // Guardamos los enunciados nuevos para no repetirlos en el próximo test.
      if (fuente === "tema") {
        guardarPreguntasUsadas(temaLimpio, preguntasUsadas, res.questions.map(p => p.q));
      }
      // ---------------------------------

      if (res.limiteInvitado) actualizarLimiteInvitado(res.limiteInvitado);
      const limiteAplicado =
        limiteRondas === null
          ? null
          : Math.min(limiteRondas, res.questions.length);
      iniciarPartida(
        limiteAplicado === null
          ? res.questions
          : res.questions.slice(0, limiteAplicado),
        res.notice || avisoPorDefecto,
        limiteAplicado,
      );
    } catch (error) {
      const errorApi = error as ErrorApi;
      const mensaje = errorApi?.message || "Error inesperado.";
      if (errorApi?.codigo === "LIMITE_INVITADO" || errorApi?.status === 429) {
        actualizarLimiteInvitado(errorApi?.limiteInvitado ?? { usos: MAX_GENERACIONES_INVITADO, restantes: 0, maximo: MAX_GENERACIONES_INVITADO, agotado: true, mensaje: MENSAJE_LIMITE_INVITADO });
      } else {
        setErrorConfig(mensaje);
      }
      vistaRef.current.pantalla = "config"; commit();
    } finally { generandoRef.current = false; setFaseCarga("inactivo"); }
  }

  useEffect(() => {
    accionesRef.current = { responder, abrirPausa, cerrarPausa, cerrarAyuda };
  });

  useEffect(() => {
    function alPulsarTecla(e: KeyboardEvent): void {
      const acc = accionesRef.current;
      const est = vistaRef.current;
      if (!acc) return;
      if (e.key === "Escape") {
        if (modalRef.current) acc.cerrarAyuda(); else if (est.pausado) acc.cerrarPausa(); else acc.abrirPausa();
        return;
      }
      if (est.pausado || est.primeraPregunta || est.bloqueado || est.pantalla !== "game") return;
      const mapa: Record<string, number> = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 };
      const idx = mapa[e.code];
      if (idx !== undefined) { e.preventDefault(); acc.responder(idx); }
    }
    function alCambiarVisibilidad(): void {
      const est = vistaRef.current;
      if (document.hidden && est.pantalla === "game" && !est.bloqueado && !est.pausado) accionesRef.current?.abrirPausa();
    }
    window.addEventListener("keydown", alPulsarTecla);
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    return () => { window.removeEventListener("keydown", alPulsarTecla); document.removeEventListener("visibilitychange", alCambiarVisibilidad); };
  }, []);

  return (
    <>
      <main className="arcade-app bg-transparent relative h-[100dvh] w-full overflow-hidden text-[var(--txt)]">
        <div className={`flash ${vista.destello ?? ""} ${vista.destello ? "on" : ""}`} aria-hidden="true" />
        {vista.flotantes.map(f => <div key={f.id} className="float" aria-hidden="true">{f.texto}</div>)}
        <div id="app" className={vista.pantalla === "menu" ? "arcade-app-menu" : ""}>
          <section id="menu" className={`screen ${vista.pantalla === "menu" ? "active" : ""}`}>
            <div className="arcade-menu-contenido">
              <div className="logo">
                <span className="bg-gradient-to-r from-[var(--azul)] via-[#7c3aed] to-[#06b6d4] dark:via-[#a78bfa] dark:to-[#22d3ee] bg-clip-text text-transparent">
                  OpoGen
                </span>{" "}
                Arcade
              </div>
              <div className="tag">Juega y aprende con tus propios apuntes</div>
              {limiteAgotado && <div className="error-box" role="alert">{mensajeLimite}</div>}

              <div className="arcade-intro">
                <span className="arcade-intro-icono" aria-hidden="true">
                  🧠
                </span>
                <p>
                  <strong>¿Por qué jugar al Arcade?</strong> No es solo un
                  juego, es tu campo de entrenamiento. Aquí entrenarás la
                  velocidad de respuesta, la comprensión lectora exprés y la
                  agilidad mental bajo presión. Convierte el repaso de tus
                  apuntes en un desafío contra ti mismo.
                </p>
              </div>

              <div className="arcade-modos grid grid-cols-1 gap-6 md:grid-cols-3">
                {MODOS_INFO.map((modo) => (
                  <button
                    key={modo.id}
                    type="button"
                    className="arcade-modo-card"
                    onClick={() => abrirInfoModo(modo.id)}
                  >
                    <span className="arcade-modo-icono" aria-hidden="true">
                      {modo.icono}
                    </span>
                    <span className="arcade-modo-titulo">
                      {modo.titulo}
                    </span>
                    <span className="arcade-modo-descripcion">
                      {modo.descripcion}
                    </span>
                  </button>
                ))}
              </div>

              <div className="menu-btns">
                <button className="btn btn-jugar" onClick={irAConfiguracion} disabled={generarDeshabilitado}>{t("playNow")}</button>
              </div>

              <div className="arcade-beneficios grid grid-cols-2 gap-4 md:grid-cols-4">
                {BENEFICIOS_INFO.map((beneficio) => (
                  <div
                    key={beneficio.titulo}
                    className="arcade-beneficio"
                  >
                    <span
                      className="arcade-beneficio-icono"
                      aria-hidden="true"
                    >
                      {beneficio.icono}
                    </span>
                    <span className="arcade-beneficio-titulo">
                      {beneficio.titulo}
                    </span>
                    <span className="arcade-beneficio-texto">
                      {beneficio.texto}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section id="config" className={`screen ${vista.pantalla === "config" ? "active" : ""}`}>
            <h2 id="cfgTitle">{t("prepare")}</h2>
            <div className="source-switch" role="group">
              <button className={fuente === "archivos" ? "on" : ""} onClick={() => seleccionarFuente("archivos")}>{t("myFiles")}</button>
              <button className={fuente === "tema" ? "on" : ""} onClick={() => seleccionarFuente("tema")}>{t("freeTopic")}</button>
            </div>
            <div className="source-panel" hidden={fuente !== "tema"}>
              <div className="topic-box">
                <label htmlFor="topicInput">{t("topic")}</label>
                <input id="topicInput" className="topic-input" type="text" maxLength={100} value={tema} onChange={e => { setTema(e.target.value); setErrorConfig(""); }} onKeyDown={alEscribirTema} />
              </div>
            </div>
            <div className="source-panel" hidden={fuente !== "archivos"}>
              <div className="upload-box">
                <input type="file" id="fileInput" ref={inputArchivosRef} multiple onChange={alSeleccionarArchivos} />
                <p style={{ color: archivos.length > 0 ? "var(--good)" : "var(--p1)" }}>
                  {preparandoArchivos ? "Preparando archivos…" : archivos.length > 0 ? `Seleccionado(s): ${archivos.length}` : "Selecciona tus archivos"}
                </p>
              </div>
            </div>
            <div className="cfgrow">
              <label htmlFor="arcadeNivel">{t("studyType")}</label>
              <select
                id="arcadeNivel"
                value={tipoEstudio}
                onChange={e => { setTipoEstudio(e.target.value); setErrorConfig(""); }}
              >
                {opcionesTipoEstudio(locale).map((opcion) => (
                  <option key={opcion.id} value={opcion.id}>
                    {opcion.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="cfgrow">
              <label htmlFor="arcadeIdioma">{t("language")}</label>
              <select
                id="arcadeIdioma"
                value={idioma}
                onChange={e => { setIdioma(e.target.value); setErrorConfig(""); }}
              >
                {opcionesIdiomaExamen(locale).map((opcion) => (
                  <option key={opcion.id} value={opcion.id}>
                    {opcion.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="cfgrow">
              <span>{t("difficulty")}</span>
              <div className="seg">
                {[ { v: 20, t: t("easy") }, { v: 15, t: t("normal") }, { v: 10, t: t("hard") } ].map(o => (
                  <button key={o.v} className={config.time === o.v ? "on" : ""} onClick={() => seleccionarTiempo(o.v)}>{o.t}</button>
                ))}
              </div>
            </div>
            <div className="cfgrow">
              <span>{t("lives")}</span>
              <div className="seg">
                {[1, 3, 5].map(v => (
                  <button key={v} className={config.lives === v ? "on" : ""} onClick={() => seleccionarVidas(v)}>{v}</button>
                ))}
              </div>
            </div>
            <div className="cfgrow">
              <span>{t("gameMode")}</span>
              <div className="seg">
                {[ { v: "normal" as const, t: t("normalMode") }, { v: "supervivencia" as const, t: t("survival") } ].map(o => (
                  <button key={o.v} className={config.mode === o.v ? "on" : ""} onClick={() => seleccionarModo(o.v)}>{o.t}</button>
                ))}
              </div>
            </div>
            {errorConfig && <div className="error-box" role="alert">{errorConfig}</div>}
            <div className="flex flex-row gap-3 sm:gap-4 mt-6 w-full">
              <button
                className="btn flex-1 px-3! py-2.5! text-sm! sm:text-base!"
                onClick={() => void iniciarGeneracion()}
                disabled={generarDeshabilitado}
              >
                {faseCarga === "leyendo" ? (
                  <>Leyendo archivo<span className="puntos-animados">...</span></>
                ) : faseCarga === "generando" ? (
                  <>Generando test<span className="puntos-animados">...</span></>
                ) : (
                  t("generate")
                )}
              </button>
              <button
                className="btn ghost flex-1 px-3! py-2.5! text-sm! sm:text-base!"
                onClick={() => {
                  setErrorConfig("");
                  vistaRef.current.pantalla = "menu";
                  commit();
                }}
              >
                {t("back")}
              </button>
            </div>
          </section>
          <section id="loading" className={`screen ${vista.pantalla === "loading" ? "active" : ""} flex h-full flex-col items-center justify-center`}>
            <h1
              aria-label="Generando la partida"
              className="bg-gradient-to-r from-[var(--azul)] to-[var(--err-t)] bg-clip-text px-4 text-center text-3xl font-bold tracking-tight text-transparent sm:text-4xl"
            >
              <span aria-hidden="true">
                {"Generando la partida".split("").map((letra, indice) => (
                  <span
                    key={`${letra}-${indice}`}
                    className="letra-encendida"
                    style={{ animationDelay: `${indice * 0.04}s` }}
                  >
                    {letra === " " ? "\u00A0" : letra}
                  </span>
                ))}
              </span>
            </h1>
          </section>
          <section id="game" className={`screen ${vista.pantalla === "game" ? "active" : ""}`}>
            <div className="topbar">
              <div className="scorebox"><span className="k">Puntos</span><span className="v">{vista.puntuacion}</span></div>
              <div className={`streakbadge ${vista.racha >= 2 ? "show" : ""}`}>x{multiplicador} ({vista.racha})</div>
              {vista.modo === "supervivencia" ? (
                <div className="survivalbadge" title="Modo Supervivencia" aria-label="Modo Supervivencia">
                  <span aria-hidden="true">⚡</span> Supervivencia
                </div>
              ) : (
                <div className="hearts" aria-label={`${vista.vidas} vidas`}>
                  <span>{"♥".repeat(Math.max(0, vista.vidas))}</span>
                  <span style={{ opacity: 0.2 }}>{"♥".repeat(Math.max(0, config.lives - vista.vidas))}</span>
                </div>
              )}
            </div>
            <div className="qmeta">
              <span className="cat">{vista.actual?.cat ?? "Temario"}</span>
              <span>
                {t("questionOf", {
                  current: vista.ronda,
                  total: vista.limiteRondas ?? vista.preguntas.length,
                })}
              </span>
              <button className="pausebtn" onClick={abrirPausa} disabled={vista.bloqueado || vista.pausado}>II</button>
            </div>
            {vista.modo !== "supervivencia" && (
              <div className={`timerwrap ${vista.pausaPista ? "timerwrap-pausa" : ""}`} role="progressbar" aria-valuenow={Math.round(porcentajeTiempo)}>
                {vista.pausaPista && (
                  <span className="timerpausa" aria-hidden="true">
                    ⏸ 5s
                  </span>
                )}
                <div className="timerbar" style={{ width: `${porcentajeTiempo}%` }} />
              </div>
            )}
            <div className="juego-contenido flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-[max(2rem,env(safe-area-inset-bottom))]">
              {vista.cargandoPista ? (
                <div
                  role="status"
                  className="flex items-center gap-2 rounded-2xl border border-[var(--ambar-b)] bg-[var(--ambar)] px-4 py-3 text-sm font-medium text-[var(--ambar-t)]"
                >
                  <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                  {t("hintLoading")}
                </div>
              ) : null}

              {vista.errorPista ? (
                <div
                  role="alert"
                  className="rounded-2xl border border-[var(--err-b)] bg-[var(--err)] px-4 py-3 text-sm font-medium text-[var(--err-t)]"
                >
                  {vista.errorPista}
                </div>
              ) : null}

              {vista.pista ? (
                <div
                  role="status"
                  className="rounded-2xl border border-[var(--ambar-b)] bg-[var(--ambar)] px-4 py-3 text-sm leading-relaxed text-[var(--ambar-t)]"
                >
                  <strong className="font-bold">{t("hintTitle")}</strong>{" "}
                  {vista.pista}
                </div>
              ) : null}

              <div className={`qcard ${vista.sacudir ? "shake" : ""}`}>
                <div className="qtext">{vista.actual?.q ?? "..."}</div>
                <div className={`start-overlay ${vista.primeraPregunta ? "" : "hidden"}`}>
                  <button id="btnRealStart" onClick={iniciarPrimeraPregunta}>{t("start")}</button>
                </div>
                {!vista.primeraPregunta && <div className="stars-container" aria-hidden="true">
                  {[0, 1, 2].map(i => <div key={i} className="star" style={{ animationDelay: `${i * 0.15}s` }}>✦</div>)}
                </div>}
              </div>
              <div className="options" role="group">
                {vista.actual?.options.map((texto, i) => {
                  const isCorrect = vista.resultado !== null && i === vista.actual?.correct;
                  const isWrong = vista.resultado !== null && i === vista.seleccionada && i !== vista.actual?.correct;
                  const hidden = vista.ocultas.includes(i);
                  return (
                    <button key={i} className={`opt ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""} ${hidden ? "hidden50" : ""}`}
                      disabled={vista.primeraPregunta || vista.bloqueado || hidden} onClick={() => responder(i)}>
                      <span className="letter">{String.fromCharCode(65 + i)}</span>
                      <span>{texto}</span>
                    </button>
                  );
                })}
              </div>
              <div className="comos flex gap-3">
                <button className="como min-h-[44px]" disabled={!comodinesDisponibles || vista.comodines.cincuenta <= 0} onClick={usarCincuenta}>
                  <span className="ico">50/50</span> 50/50 <span className="n">{vista.comodines.cincuenta} {vista.comodines.cincuenta === 1 ? "uso" : "usos"}</span>
                </button>
                <button className="como min-h-[44px]" disabled={!comodinesDisponibles || vista.comodines.saltar <= 0} onClick={usarSaltar}>
                  <span className="ico">»</span> Saltar <span className="n">{vista.comodines.saltar} {vista.comodines.saltar === 1 ? "uso" : "usos"}</span>
                </button>
                <button
                  className="como min-h-[44px]"
                  disabled={!comodinesDisponibles || vista.cargandoPista || vista.comodines.pista <= 0}
                  onClick={() => void usarPista()}
                  aria-busy={vista.cargandoPista}
                >
                  {vista.cargandoPista ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                  ) : (
                    <span className="ico" aria-hidden="true">💡</span>
                  )}
                  {t("hint")}
                </button>
              </div>
              <div className="hint">{vista.primeraPregunta ? vista.aviso : ""}</div>
              <div className={`feedback ${vista.feedback ? `show ${vista.feedback.correcta ? "ok" : "no"}` : ""}`}>
                {vista.feedback && (
                  <><strong>{vista.feedback.mensaje}</strong>{vista.feedback.explicacion && <span className="exp">{vista.feedback.explicacion}</span>}</>
                )}
              </div>
            </div>
          </section>
          <section id="result" className={`screen ${vista.pantalla === "result" ? "active" : ""}`}>
            <div className="result-title">
              {vista.modo === "supervivencia"
                ? t("survived", { count: vista.aciertos })
                : t("noLives")}
            </div>
            <div className="result-big">{vista.puntuacion}</div>
            <div className="result-sub">{vista.subtituloResultado}</div>
            <div className="menu-btns">
              <button className="btn" onClick={jugarOtraVez}>{t("repeat")}</button>
              <button className="btn ghost" onClick={crearTestNuevo}>{t("newTest")}</button>
              <button className="btn ghost" onClick={salirAlMenu}>{t("backMenu")}</button>
            </div>
          </section>
        </div>
        <div className="overlay" id="pauseOverlay" hidden={!vista.pausado}>
          <div className="overlay-box">
            <h3>{t("pause")}</h3>
            <button className="btn" ref={pausaResumeRef} onClick={cerrarPausa}>{t("continue")}</button>
            <button className="btn ghost" onClick={salirAlMenu}>{t("exitMenu")}</button>
          </div>
        </div>
        <div className="overlay" id="modal" hidden={!modalAyuda}>
          <div className="overlay-box arcade-modal-modo">
            {modoActual ? (
              <>
                <span className="arcade-modal-icono" aria-hidden="true">
                  {modoActual.icono}
                </span>
                <h3>Cómo jugar: {modoActual.titulo}</h3>
                <p>{modoActual.detalle}</p>
                <div className="arcade-modal-acciones">
                  <button
                    type="button"
                    className="btn ghost"
                    ref={modalCloseRef}
                    onClick={cerrarAyuda}
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={jugarModoSeleccionado}
                  >
                    Jugar
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </main>
    </>
  );
}