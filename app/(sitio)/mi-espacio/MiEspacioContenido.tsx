"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Folder, FolderPlus, FileText, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import { TestExamen } from "@/components/TestExamen";
import type { Pregunta } from "@/components/TestExamen";
import ModalConfirmacion from "@/components/ModalConfirmacion";
import BotonResumen from "@/components/BotonResumen";
import ListaResumenes from "@/components/ListaResumenes";
import BannerResumenes from "@/components/BannerResumenes";
import { useNotification } from "@/components/NotificationProvider";
import { useTranslations } from "next-intl";
import { mensajeError } from "@/lib/errores";
import { normalizarPreguntas } from "@/lib/tipos";
import { useVentanaPersistente } from "@/hooks/useVentanaPersistente";

type SnapshotTest = {
  id: string;
  preguntas: Pregunta[];
  textoContexto: string;
  esMixto: boolean;
  modoPractica: boolean;
  carpetaActiva: string | null;
  carpetaPractica: string;
  preguntasPractica: Pregunta[];
  preguntasPracticaRestantes: Pregunta[];
  totalPreguntasPractica: number;
};

const PREFIJO_FALLOS = "Fallos - ";
const PREFIJO_MIXTOS = "Test Mixtos - ";
const PREFIJO_MIXTOS_LEGADO = "Simulacros - ";

function nuevoIdTest(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Lee el cuerpo JSON sin romperse si la respuesta no es un objeto. */
async function leerRespuesta(
  respuesta: Response,
): Promise<Record<string, unknown>> {
  const datos: unknown = await respuesta.json().catch(() => ({}));

  return datos && typeof datos === "object" && !Array.isArray(datos)
    ? (datos as Record<string, unknown>)
    : {};
}

function listaDeTextos(valor: unknown): string[] {
  return Array.isArray(valor)
    ? valor.filter((item): item is string => typeof item === "string")
    : [];
}

// Compara nombres de carpeta ignorando mayúsculas, tildes y espacios sobrantes.
function normalizarNombreCarpeta(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function separarPrefijo(
  nombre: string,
  prefijos: string[],
): string | null {
  for (const prefijo of prefijos) {
    if (nombre.startsWith(prefijo)) {
      return nombre.slice(prefijo.length);
    }
  }
  return null;
}

function compararNombresCarpeta(a: string, b: string): number {
  return normalizarNombreCarpeta(a).localeCompare(
    normalizarNombreCarpeta(b),
    "es",
    { numeric: true, sensitivity: "base" },
  );
}

function esCarpetaEspecial(nombre: string): boolean {
  return (
    nombre.startsWith(PREFIJO_FALLOS) ||
    nombre.startsWith(PREFIJO_MIXTOS) ||
    nombre.startsWith(PREFIJO_MIXTOS_LEGADO)
  );
}

function ordenarCarpetasJerarquico(carpetas: string[]): string[] {
  const normales: string[] = [];
  const fallos = new Map<string, string>();
  const mixtos = new Map<string, string>();
  const prefijosMixtos = [PREFIJO_MIXTOS, PREFIJO_MIXTOS_LEGADO];

  for (const carpeta of carpetas) {
    const restoFallos = separarPrefijo(carpeta, [PREFIJO_FALLOS]);
    if (restoFallos !== null) {
      fallos.set(normalizarNombreCarpeta(restoFallos), carpeta);
      continue;
    }

    const restoMixtos = separarPrefijo(carpeta, prefijosMixtos);
    if (restoMixtos !== null) {
      mixtos.set(normalizarNombreCarpeta(restoMixtos), carpeta);
      continue;
    }

    normales.push(carpeta);
  }

  // El orden depende siempre de los nombres, nunca del orden de la API.
  normales.sort(compararNombresCarpeta);

  const ordenadas: string[] = [];

  for (const normal of normales) {
    const clave = normalizarNombreCarpeta(normal);
    ordenadas.push(normal);

    // Primero el test mixto y después la carpeta de fallos.
    const carpetaMixtos = mixtos.get(clave);
    if (carpetaMixtos) {
      ordenadas.push(carpetaMixtos);
      mixtos.delete(clave);
    }

    const carpetaFallos = fallos.get(clave);
    if (carpetaFallos) {
      ordenadas.push(carpetaFallos);
      fallos.delete(clave);
    }
  }

  // Si la carpeta madre ya no existe, se muestran al final para no ocultarlas.
  // La sangría visual se aplica después por prefijo, sea cual sea su posición.
  const mixtosHuerfanos = [...mixtos.entries()].sort(([a], [b]) =>
    compararNombresCarpeta(a, b),
  );
  const fallosHuerfanos = [...fallos.entries()].sort(([a], [b]) =>
    compararNombresCarpeta(a, b),
  );

  for (const [, carpeta] of mixtosHuerfanos) {
    ordenadas.push(carpeta);
  }
  for (const [, carpeta] of fallosHuerfanos) {
    ordenadas.push(carpeta);
  }

  return ordenadas;
}

export default function MiEspacioPage() {
  const t = useTranslations("MiEspacio");
  const { notificar } = useNotification();
  const [carpetas, setCarpetas] = useState<string[]>([]);
  const [mixtosConContenido, setMixtosConContenido] = useState<string[]>([]);
  const [carpetasConRepaso, setCarpetasConRepaso] = useState<string[]>([]);
  const [carpetaActiva, setCarpetaActiva] = useState<string | null>(null);
  const [archivos, setArchivos] = useState<string[]>([]);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [resumenesSeleccionados, setResumenesSeleccionados] =
    useState<string[]>([]);
  const [nuevaCarpetaNombre, setNuevaCarpetaNombre] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [cargandoArchivos, setCargandoArchivos] = useState(false);
  const [error, setError] = useState("");

  // ESTADOS PARA EL MODAL DEL TEST
  const [testModalAbierto, setTestModalAbierto] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [preguntasTest, setPreguntasTest] = useState<Pregunta[]>([]);
  const [textoContextoTest, setTextoContextoTest] = useState("");
  const [cargandoTest, setCargandoTest] = useState(false);
  const [esTestMixto, setEsTestMixto] = useState(false);

  // ESTADOS PARA TEST MIXTO Y MODALES
  const [mostrarSelectorMixto, setMostrarSelectorMixto] = useState(false);
  const [errorMixto, setErrorMixto] = useState("");
  const [numPreguntasMixto, setNumPreguntasMixto] = useState("25");
  const [modalConfirmar, setModalConfirmar] = useState<{titulo: string, mensaje: string, onConfirm: () => void} | null>(null);
  
  // ESTADOS PARA MODO PRÁCTICA
  const [modoPracticaAbierto, setModoPracticaAbierto] = useState(false);
  const [preguntasPractica, setPreguntasPractica] = useState<Pregunta[]>([]);
  const [preguntasPracticaRestantes, setPreguntasPracticaRestantes] = useState<Pregunta[]>([]);
  const [carpetaPractica, setCarpetaPractica] = useState<string>("");
  const [totalPreguntasPractica, setTotalPreguntasPractica] = useState(0);
  const [testId, setTestId] = useState<string | null>(null);
  const ventanaTest = useVentanaPersistente<SnapshotTest>({
    clave: "test:mi-espacio",
    version: 1,
  });
  const {
    abrir: abrirVentanaTest,
    cerrar: cerrarVentanaTestPersistida,
  } = ventanaTest;

  useEffect(() => {
    if (
      !ventanaTest.restaurado ||
      !ventanaTest.datos ||
      testModalAbierto
    ) {
      return;
    }

    const guardado = ventanaTest.datos;

    const id = window.setTimeout(() => {
      setTestId(guardado.id);
      setPreguntasTest(guardado.preguntas);
      setTextoContextoTest(guardado.textoContexto);
      setEsTestMixto(guardado.esMixto);
      setCarpetaActiva(guardado.carpetaActiva);
      setCarpetaPractica(guardado.carpetaPractica);
      setPreguntasPractica(guardado.preguntasPractica);
      setPreguntasPracticaRestantes(
        guardado.preguntasPracticaRestantes,
      );
      setTotalPreguntasPractica(guardado.totalPreguntasPractica);
      setModoPracticaAbierto(guardado.modoPractica);
      setCargandoTest(false);
      setTestModalAbierto(true);
    }, 0);

    return () => window.clearTimeout(id);
  }, [
    testModalAbierto,
    ventanaTest.datos,
    ventanaTest.restaurado,
  ]);

  const guardarVentanaTest = useCallback(
    (datos: Omit<SnapshotTest, "id">): void => {
      const id = nuevoIdTest();

      setTestId(id);
      abrirVentanaTest({ ...datos, id });
    },
    [abrirVentanaTest],
  );

  const cerrarVentanaTest = useCallback((): void => {
    cerrarVentanaTestPersistida();
    setTestId(null);
    setTestModalAbierto(false);
    setModoPracticaAbierto(false);
  }, [cerrarVentanaTestPersistida]);

  const cargarCarpetas = useCallback(async () => {
    try {
      const res = await fetch("/api/carpetas", { cache: "no-store" });
      const datos = await leerRespuesta(res);

      if (!res.ok) {
        throw new Error(
          typeof datos.error === "string"
            ? datos.error
            : "Error al cargar carpetas",
        );
      }

      setCarpetas(listaDeTextos(datos.carpetas));
      setMixtosConContenido(listaDeTextos(datos.mixtosConContenido));
      setCarpetasConRepaso(listaDeTextos(datos.carpetasConRepaso));
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarArchivos = useCallback(
    async (carpeta: string) => {
      setCargandoArchivos(true);
      setSeleccionados([]);
      setResumenesSeleccionados([]);
      try {
        const res = await fetch(
          `/api/carpetas/archivos?carpeta=${encodeURIComponent(carpeta)}`,
          { cache: "no-store" },
        );
        const datos = await leerRespuesta(res);

        if (!res.ok) {
          throw new Error(
            typeof datos.error === "string"
              ? datos.error
              : "Error al cargar archivos",
          );
        }

        setArchivos(listaDeTextos(datos.archivos));
      } catch (err) {
        notificar({
          titulo: "No se pudieron cargar los archivos",
          mensaje: mensajeError(err),
          tipo: "peligro",
        });
      } finally {
        setCargandoArchivos(false);
      }
    },
    [notificar],
  );

  const abrirModoPractica = useCallback(
    async (carpeta: string) => {
      setCargandoArchivos(true);
      try {
        const nombreCarpeta = carpeta.replace(PREFIJO_FALLOS, "");
        const res = await fetch(
          `/api/fallos/obtener?carpeta=${encodeURIComponent(nombreCarpeta)}`,
        );
        const datos = await leerRespuesta(res);

        if (!res.ok) {
          throw new Error(
            typeof datos.error === "string"
              ? datos.error
              : "Error al obtener fallos",
          );
        }

        const preguntas = normalizarPreguntas(datos.preguntas);

        if (preguntas.length === 0) {
          throw new Error("No hay fallos para practicar");
        }

        setCarpetaPractica(nombreCarpeta);
        setPreguntasPracticaRestantes(preguntas);
        setPreguntasPractica([preguntas[0]]);
        setTotalPreguntasPractica(preguntas.length);
        setModoPracticaAbierto(true);
        setTestModalAbierto(true);
        setCarpetaActiva(null);
        guardarVentanaTest({
          preguntas: [],
          textoContexto: "Repaso de Fallos",
          esMixto: false,
          modoPractica: true,
          carpetaActiva: null,
          carpetaPractica: nombreCarpeta,
          preguntasPractica: [preguntas[0]],
          preguntasPracticaRestantes: preguntas,
          totalPreguntasPractica: preguntas.length,
        });
      } catch (err) {
        notificar({
          titulo: "No se pudo abrir el repaso",
          mensaje: mensajeError(err),
          tipo: "peligro",
        });
        setCarpetaActiva(null);
      } finally {
        setCargandoArchivos(false);
      }
    },
    [guardarVentanaTest, notificar],
  );

  useEffect(() => {
    // Se aplaza al siguiente tick para no encadenar renders dentro del efecto.
    const id = window.setTimeout(() => {
      void cargarCarpetas();
    }, 0);

    return () => window.clearTimeout(id);
  }, [cargarCarpetas]);

  // Al volver a la pestaña se refresca el árbol por si se creó una carpeta
  // desde otra pestaña o desde el servidor.
  useEffect(() => {
    const alCambiarVisibilidad = () => {
      if (document.hidden) {
        return;
      }

      void cargarCarpetas();
    };

    document.addEventListener("visibilitychange", alCambiarVisibilidad);

    return () => {
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    };
  }, [cargarCarpetas]);

  // Acceso directo desde el panel: /mi-espacio?fallos=1 abre el primer repaso.
  useEffect(() => {
    if (carpetas.length === 0) {
      return;
    }

    const parametros = new URLSearchParams(window.location.search);

    if (parametros.get("fallos") !== "1") {
      return;
    }

    const primeraCarpetaFallos = carpetas.find((carpeta) =>
      carpeta.startsWith(PREFIJO_FALLOS),
    );

    if (!primeraCarpetaFallos) {
      return;
    }

    window.history.replaceState(null, "", "/mi-espacio");

    const id = window.setTimeout(() => {
      setCarpetaActiva(primeraCarpetaFallos);
    }, 0);

    return () => window.clearTimeout(id);
  }, [carpetas]);

  useEffect(() => {
    if (!carpetaActiva) {
      return;
    }

    const id = window.setTimeout(() => {
      if (carpetaActiva.startsWith(PREFIJO_FALLOS)) {
        void abrirModoPractica(carpetaActiva);
      } else {
        void cargarArchivos(carpetaActiva);
      }
    }, 0);

    return () => window.clearTimeout(id);
  }, [carpetaActiva, abrirModoPractica, cargarArchivos]);

  async function eliminarCarpeta(e: React.MouseEvent, carpeta: string) {
    e.stopPropagation();
    setModalConfirmar({
      titulo: "Eliminar Carpeta",
      mensaje: `¿Seguro que quieres eliminar la carpeta «${carpeta}» y todo su contenido?`,
      onConfirm: async () => {
        setModalConfirmar(null);
        try {
          const res = await fetch(
            `/api/carpetas/eliminar?carpeta=${encodeURIComponent(carpeta)}`,
            { method: "DELETE" },
          );
          const datos = await leerRespuesta(res);

          if (!res.ok) {
            throw new Error(
              typeof datos.error === "string"
                ? datos.error
                : "Error al eliminar la carpeta",
            );
          }

          setCarpetas((prev) => prev.filter((c) => c !== carpeta));
          if (carpetaActiva === carpeta) setCarpetaActiva(null);
        } catch (err) {
          notificar({
            titulo: "No se pudo eliminar la carpeta",
            mensaje: mensajeError(err),
            tipo: "peligro",
          });
        }
      },
    });
  }

  async function eliminarArchivo(
    e: React.MouseEvent,
    carpeta: string,
    archivo: string,
  ) {
    e.stopPropagation();
    setModalConfirmar({
      titulo: "Eliminar Archivo",
      mensaje: `¿Seguro que quieres eliminar el archivo «${archivo}»?`,
      onConfirm: async () => {
        setModalConfirmar(null);
        try {
          const res = await fetch(
            `/api/examenes/eliminar?carpeta=${encodeURIComponent(
              carpeta,
            )}&archivo=${encodeURIComponent(archivo)}`,
            { method: "DELETE" },
          );
          const datos = await leerRespuesta(res);

          if (!res.ok) {
            throw new Error(
              typeof datos.error === "string"
                ? datos.error
                : "Error al eliminar el archivo",
            );
          }

          setArchivos((prev) => prev.filter((a) => a !== archivo));
        } catch (err) {
          notificar({
            titulo: "No se pudo eliminar el archivo",
            mensaje: mensajeError(err),
            tipo: "peligro",
          });
        }
      },
    });
  }

  function siguientePreguntaPractica() {
    const nuevasRestantes = [...preguntasPracticaRestantes];
    
    // Remover la pregunta actual
    nuevasRestantes.shift();
    
    if (nuevasRestantes.length === 0) {
      // Terminado
      cerrarVentanaTest();
      setPreguntasPractica([]);
      setPreguntasPracticaRestantes([]);
      setTotalPreguntasPractica(0);
      notificar({
        titulo: "¡Repaso completado!",
        mensaje: "Has terminado todas las preguntas de este repaso.",
        tipo: "exito",
      });
    } else {
      setPreguntasPracticaRestantes(nuevasRestantes);
      setPreguntasPractica([nuevasRestantes[0]]);
      // Forzar re-render del TestExamen
      setTestModalAbierto(false);
      setTimeout(() => {
        setTestModalAbierto(true);
      }, 100);
    }
  }

  async function crearCarpeta(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaCarpetaNombre.trim()) return;
    try {
      const res = await fetch("/api/carpetas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevaCarpetaNombre }),
      });
      const datos = await leerRespuesta(res);

      if (!res.ok) {
        throw new Error(
          typeof datos.error === "string"
            ? datos.error
            : "Error al crear la carpeta",
        );
      }

      setNuevaCarpetaNombre("");
      setMostrarModal(false);
      await cargarCarpetas();
    } catch (err) {
      notificar({
        titulo: "No se pudo crear la carpeta",
        mensaje: mensajeError(err),
        tipo: "peligro",
      });
    }
  }

  async function abrirRepasoFallos(
    carpeta: string,
  ): Promise<void> {
    setCargandoTest(true);
    setTestModalAbierto(true);
    setEsTestMixto(false);

    try {
      const res = await fetch(
        `/api/fallos/obtener?carpeta=${encodeURIComponent(carpeta)}`,
        { cache: "no-store" },
      );
      const datos = await leerRespuesta(res);

      if (!res.ok) {
        throw new Error(
          typeof datos.error === "string"
            ? datos.error
            : "No se pudo cargar el repaso de fallos",
        );
      }

      const preguntas = normalizarPreguntas(datos.preguntas);

      if (preguntas.length === 0) {
        throw new Error("No hay fallos para repasar en esta carpeta");
      }

      setPreguntasTest(preguntas);
      setTextoContextoTest("Repaso de Fallos");
    } catch (err) {
      notificar({
        titulo: "No se pudo abrir el repaso",
        mensaje: mensajeError(err),
        tipo: "peligro",
      });
      setTestModalAbierto(false);
    } finally {
      setCargandoTest(false);
    }
  }

  function eliminarRepasoFallos(e: React.MouseEvent): void {
    e.stopPropagation();

    if (!carpetaActiva) {
      return;
    }

    const carpeta = carpetaActiva;

    setModalConfirmar({
      titulo: "Eliminar Repaso de Fallos",
      mensaje:
        "¿Seguro que quieres eliminar repaso.pdf y su índice de fallos?",
      onConfirm: async () => {
        setModalConfirmar(null);

        try {
          const res = await fetch(
            `/api/fallos/eliminar?carpeta=${encodeURIComponent(carpeta)}`,
            { method: "DELETE" },
          );
          const datos = await leerRespuesta(res);

          if (!res.ok) {
            throw new Error(
              typeof datos.error === "string"
                ? datos.error
                : "No se pudo eliminar el repaso de fallos",
            );
          }

          setArchivos((prev) =>
            prev.filter((archivo) => archivo !== "repaso.pdf"),
          );
          await cargarCarpetas();
          await cargarArchivos(carpeta);
        } catch (err) {
          notificar({
            titulo: "No se pudo eliminar el repaso",
            mensaje: mensajeError(err),
            tipo: "peligro",
          });
        }
      },
    });
  }

  async function handleRepetirTest(archivo: string) {
    if (!carpetaActiva) return;
    setCargandoTest(true);
    setTestModalAbierto(true);
    setEsTestMixto(false);
    try {
      const archivoJson = archivo.replace(/\.pdf$/i, ".json");
      const res = await fetch(
        `/api/examenes/recuperar?carpeta=${encodeURIComponent(
          carpetaActiva,
        )}&archivo=${encodeURIComponent(archivoJson)}`,
      );
      const datos = await leerRespuesta(res);

      if (!res.ok) {
        throw new Error(
          typeof datos.error === "string"
            ? datos.error
            : "Error al recuperar el test",
        );
      }

      const preguntas = normalizarPreguntas(datos.preguntas);
      const textoContexto =
        typeof datos.textoContexto === "string" &&
        datos.textoContexto.trim()
          ? datos.textoContexto
          : "Examen de OpoGen";

      setPreguntasTest(preguntas);
      setTextoContextoTest(textoContexto);
      guardarVentanaTest({
        preguntas,
        textoContexto,
        esMixto: false,
        modoPractica: false,
        carpetaActiva,
        carpetaPractica: "",
        preguntasPractica: [],
        preguntasPracticaRestantes: [],
        totalPreguntasPractica: 0,
      });
    } catch (err) {
      notificar({
        titulo: "No se pudo recuperar el test",
        mensaje: mensajeError(err),
        tipo: "peligro",
      });
      setTestModalAbierto(false);
    } finally {
      setCargandoTest(false);
    }
  }

  async function finalizarTestMixto(preguntas: Pregunta[]): Promise<void> {
    if (!carpetaActiva) return;

    try {
      // Se guarda en la carpeta actual para que el PDF aparezca en el listado.
      const res = await fetch("/api/examenes/guardar", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preguntas,
          carpeta: carpetaActiva,
          numPreguntas: preguntas.length,
          esMixto: true,
          nombreBase: carpetaActiva,
          etiqueta: "Test Mixto",
          textoContexto: `Test mixto de ${carpetaActiva}`,
        }),
      });
      const datos = await leerRespuesta(res);

      // Se cierra el selector antes de refrescar para que no muestre la
      // selección vacía mientras se recarga la carpeta.
      setMostrarSelectorMixto(false);

      if (!res.ok) {
        notificar({
          titulo: "Test generado, pero no guardado",
          mensaje:
            typeof datos.error === "string"
              ? datos.error
              : "No se pudo guardar el PDF del test mixto.",
          tipo: "peligro",
        });
      } else {
        // Se refresca el árbol para que aparezca la subcarpeta
        // «Test Mixtos - <carpeta>» bajo la carpeta principal.
        await Promise.all([
          cargarArchivos(carpetaActiva),
          cargarCarpetas(),
        ]);
        notificar({
          titulo: "Test mixto creado",
          mensaje: `Se ha guardado en «Test Mixtos - ${carpetaActiva}». Ábrela en Mis Carpetas para verlo.`,
          tipo: "exito",
        });
      }
    } catch (err) {
      console.error("[Mixto] Error al guardar el test:", err);
      notificar({
        titulo: "No se pudo guardar el test mixto",
        mensaje: mensajeError(err),
        tipo: "peligro",
      });
    }

    setPreguntasTest(preguntas);
    setTextoContextoTest(`Test Mixto de ${carpetaActiva}`);
    setMostrarSelectorMixto(false);
    setTestModalAbierto(true);
    guardarVentanaTest({
      preguntas,
      textoContexto: `Test Mixto de ${carpetaActiva}`,
      esMixto: true,
      modoPractica: false,
      carpetaActiva,
      carpetaPractica: "",
      preguntasPractica: [],
      preguntasPracticaRestantes: [],
      totalPreguntasPractica: 0,
    });
  }

  async function generarTestMixto(reintento = false) {
    if (!carpetaActiva) return;

    setCargandoTest(true);
    setErrorMixto("");
    setEsTestMixto(true);

    try {
      const usadas: unknown = JSON.parse(
        localStorage.getItem(`opoquiz_usadas_${carpetaActiva}`) || "[]",
      );
      const res = await fetch("/api/examenes/mixto", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carpeta: carpetaActiva,
          numPreguntas: parseInt(numPreguntasMixto, 10),
          usadas: listaDeTextos(usadas),
          archivos: tipoSeleccion === "test" ? seleccionados : [],
          resumenes:
            tipoSeleccion === "resumen" ? resumenesSeleccionados : [],
        }),
      });
      const datos = await leerRespuesta(res);

      if (!res.ok) {
        throw new Error(
          typeof datos.error === "string"
            ? datos.error
            : "Error al generar test mixto",
        );
      }

      const preguntas = normalizarPreguntas(datos.preguntas);
      const cantidadReal =
        typeof datos.cantidadReal === "number"
          ? datos.cantidadReal
          : preguntas.length;
      const solicitadas =
        typeof datos.solicitadas === "number"
          ? datos.solicitadas
          : parseInt(numPreguntasMixto, 10);
      const nuevosEnunciados = preguntas.map((p) => p.enunciado);
      const guardarUsadas = () => {
        const actualizadaUsadas = Array.from(
          new Set([...listaDeTextos(usadas), ...nuevosEnunciados]),
        );
        localStorage.setItem(
          `opoquiz_usadas_${carpetaActiva}`,
          JSON.stringify(actualizadaUsadas),
        );
      };

      if (cantidadReal === 0) {
        if (reintento) {
          setErrorMixto("No hay más preguntas disponibles en esta carpeta.");
          return;
        }

        setModalConfirmar({
          titulo: "Sin preguntas nuevas",
          mensaje:
            "Ya has respondido todas las preguntas disponibles de esta carpeta. Hemos reiniciado tu progreso para que puedas seguir practicando.",
          onConfirm: () => {
            setModalConfirmar(null);
            localStorage.removeItem(`opoquiz_usadas_${carpetaActiva}`);
            void generarTestMixto(true);
          },
        });
        return;
      }

      if (cantidadReal < solicitadas) {
        setModalConfirmar({
          titulo: "Faltan preguntas",
          mensaje: `Solo hay ${cantidadReal} preguntas nuevas disponibles. ¿Quieres hacer el test con ${cantidadReal} preguntas?`,
          onConfirm: () => {
            setModalConfirmar(null);
            guardarUsadas();
            void finalizarTestMixto(preguntas);
          },
        });
        return;
      }

      guardarUsadas();
      await finalizarTestMixto(preguntas);
    } catch (err) {
      console.error("[Mixto] Error al generar el test:", err);
      const mensaje = mensajeError(err);
      setErrorMixto(mensaje);
      notificar({
        titulo: "No se pudo generar el test mixto",
        mensaje,
        tipo: "peligro",
      });
    } finally {
      setCargandoTest(false);
    }
  }

  function alternarSeleccion(archivo: string): void {
    if (resumenesSeleccionados.length > 0) return;

    setSeleccionados((prev) =>
      prev.includes(archivo)
        ? prev.filter((nombre) => nombre !== archivo)
        : [...prev, archivo],
    );
  }

  function alternarSeleccionResumen(archivo: string): void {
    if (seleccionados.length > 0) return;

    setResumenesSeleccionados((prev) =>
      prev.includes(archivo)
        ? prev.filter((nombre) => nombre !== archivo)
        : [...prev, archivo],
    );
  }

  const totalSeleccionados =
    seleccionados.length + resumenesSeleccionados.length;
  const tipoSeleccion =
    seleccionados.length > 0
      ? "test"
      : resumenesSeleccionados.length > 0
        ? "resumen"
        : null;
  const pdfsBloqueados = tipoSeleccion === "resumen";
  const resumenesBloqueados = tipoSeleccion === "test";

  function alternarTodosLosArchivos(): void {
    if (resumenesSeleccionados.length > 0) return;

    setSeleccionados((prev) =>
      prev.length === archivosMostrados.length
        ? []
        : [...archivosMostrados],
    );
  }

  const carpetasOrdenadas = useMemo(
    () => ordenarCarpetasJerarquico(carpetas),
    [carpetas],
  );

  const permiteTestMixto =
    carpetaActiva !== null &&
    !carpetaActiva.startsWith(PREFIJO_MIXTOS) &&
    !carpetaActiva.startsWith(PREFIJO_MIXTOS_LEGADO) &&
    !carpetaActiva.startsWith(PREFIJO_FALLOS);

  const carpetasMadre = [...carpetas]
    .filter((carpeta) => !esCarpetaEspecial(carpeta))
    .sort((a, b) =>
      a.localeCompare(b, "es", { numeric: true }),
    );

  const carpetaMixtosActiva =
    carpetaActiva !== null
      ? carpetas.find(
          (carpeta) =>
            (carpeta.startsWith(PREFIJO_MIXTOS) ||
              carpeta.startsWith(PREFIJO_MIXTOS_LEGADO)) &&
            carpeta
              .replace(PREFIJO_MIXTOS, "")
              .replace(PREFIJO_MIXTOS_LEGADO, "") === carpetaActiva,
        )
      : undefined;

  const moverRepasoAlSidebar =
    permiteTestMixto &&
    Boolean(carpetaMixtosActiva) &&
    mixtosConContenido.includes(carpetaMixtosActiva ?? "") &&
    carpetaActiva !== null &&
    carpetasConRepaso.includes(carpetaActiva) &&
    archivos.includes("repaso.pdf");

  const archivosMostrados = [...archivos]
    .filter(
      (archivo) =>
        !(moverRepasoAlSidebar && archivo === "repaso.pdf"),
    )
    .sort((a, b) => {
      if (a === "repaso.pdf") return 1;
      if (b === "repaso.pdf") return -1;
      return a.localeCompare(b, "es", { numeric: true });
    });

  const mostrarRepasoBajoMixtos =
    moverRepasoAlSidebar && Boolean(carpetaMixtosActiva);

  const todosSeleccionados =
    archivosMostrados.length > 0 &&
    seleccionados.length === archivosMostrados.length;

  return (
    <main className="bg-transparent relative min-h-app p-4 font-sans text-[var(--txt)] sm:p-6 md:p-12">
        <div className="mx-auto max-w-6xl">
          <BannerResumenes variante="premium" />
        </div>

        <div className="relative z-10 mx-auto flex flex-col md:flex-row gap-8 max-w-6xl">
          <aside className="w-full md:w-64 shrink-0 space-y-6">
            <div className="rounded-2xl border border-[var(--th)] bg-[var(--card)] p-4 shadow-[var(--sombra)] backdrop-blur-xl">
              <button onClick={() => setMostrarModal(true)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--azul)] px-4 py-3 text-sm font-bold text-white transition-all hover:bg-[var(--azul-hover)]">
                <FolderPlus className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
                {t("newFolder")}
              </button>

              <div className="mt-3">
                <BotonResumen
                  carpetas={carpetasMadre}
                  onCarpetaCreada={() => {
                    void cargarCarpetas();
                  }}
                />
              </div>

              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between px-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--txt3)]">{t("myFolders")}</p>
                  <button
                    type="button"
                    onClick={() => {
                      void cargarCarpetas();
                      if (carpetaActiva) void cargarArchivos(carpetaActiva);
                    }}
                    className="inline-flex items-center gap-1 rounded-md p-1 text-xs font-semibold text-[var(--txt3)] transition-colors hover:text-[var(--txt)]"
                    title="Actualizar carpetas"
                    aria-label="Actualizar carpetas"
                  >
                    <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto space-y-1 pr-2">
                  {carpetas.length === 0 && !cargando && <p className="px-2 py-4 text-xs text-center text-[var(--txt3)] italic">{t("noFolders")}</p>}
                  {carpetasOrdenadas.map((carpeta) => {
                    const esCarpetaFallos = carpeta.startsWith(PREFIJO_FALLOS);
                    const esCarpetaMixtos =
                      carpeta.startsWith(PREFIJO_MIXTOS) ||
                      carpeta.startsWith(PREFIJO_MIXTOS_LEGADO);
                    const esCarpetaMadre = !esCarpetaFallos && !esCarpetaMixtos;
                    const esHija = esCarpetaEspecial(carpeta);
                    const estaActiva = carpetaActiva === carpeta;
                    const nombreMostrar = esCarpetaFallos
                      ? t("mistakesReview", {
                          name: carpeta.replace(PREFIJO_FALLOS, ""),
                        })
                      : carpeta.replace(PREFIJO_MIXTOS_LEGADO, PREFIJO_MIXTOS);

                    const claseFondo = esCarpetaFallos
                      ? "border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-300"
                      : esCarpetaMixtos
                        ? "border-[var(--azul)] bg-[var(--sel)] text-[var(--azul)]"
                        : "border-[var(--azul)]/25 bg-[var(--azul)]/10 text-[var(--txt)]";

                    const claseEstado = estaActiva
                      ? esCarpetaFallos
                        ? "bg-red-600/15 font-bold ring-1 ring-red-500/40"
                        : esCarpetaMixtos
                          ? "font-bold ring-1 ring-[var(--azul)]"
                          : "bg-[var(--sel)] font-bold ring-1 ring-[var(--azul)]/30"
                      : esCarpetaMadre
                        ? "font-bold hover:bg-[var(--azul)]/20"
                        : "hover:bg-[var(--suave)] hover:text-[var(--txt)]";

                    return (
                      <div key={carpeta} className="space-y-1">
                        <div title={nombreMostrar} className={`flex min-w-0 items-center gap-2 rounded-lg border py-2 text-sm transition-colors group ${esHija ? "ml-0 pl-6 pr-3" : "px-3"} ${claseFondo} ${claseEstado}`}>
                        <button onClick={(e) => eliminarCarpeta(e, carpeta)} className="shrink-0 p-1 text-[var(--txt3)] opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity" title="Eliminar carpeta">
                          <Trash2 className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                        </button>
                        <button onClick={async () => {
                          if (esCarpetaFallos) {
                            const nombreOriginal = carpeta.replace(PREFIJO_FALLOS, "");
                            try {
                              const res = await fetch(
                                `/api/fallos/obtener?carpeta=${encodeURIComponent(nombreOriginal)}`,
                              );
                              const datos = await leerRespuesta(res);
                              const preguntas = normalizarPreguntas(
                                datos.preguntas,
                              );

                              if (preguntas.length > 0) {
                                setCarpetaPractica(nombreOriginal);
                                setPreguntasPracticaRestantes(preguntas);
                                setPreguntasPractica([preguntas[0]]);
                                setTotalPreguntasPractica(preguntas.length);
                                setModoPracticaAbierto(true);
                                setTestModalAbierto(true);
                                setCarpetaActiva(carpeta);
                                guardarVentanaTest({
                                  preguntas: [],
                                  textoContexto: "Repaso de Fallos",
                                  esMixto: false,
                                  modoPractica: true,
                                  carpetaActiva: carpeta,
                                  carpetaPractica: nombreOriginal,
                                  preguntasPractica: [preguntas[0]],
                                  preguntasPracticaRestantes: preguntas,
                                  totalPreguntasPractica: preguntas.length,
                                });
                                return;
                              }
                            } catch (err) {
                              notificar({
                                titulo: "No se pudo abrir el repaso",
                                mensaje: mensajeError(err),
                                tipo: "peligro",
                              });
                            }
                          }
                          setCarpetaActiva(carpeta);
                        }} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                          {esCarpetaFallos ? (
                            <ShieldAlert className="h-5 w-5 shrink-0 text-red-500" strokeWidth={2} aria-hidden="true" />
                          ) : (
                            <Folder className={`h-5 w-5 shrink-0 ${esCarpetaMixtos ? "text-[var(--azul)]" : "text-[var(--azul)]"}`} strokeWidth={2} aria-hidden="true" />
                          )}
                          <span className="truncate">{nombreMostrar}</span>
                        </button>
                        </div>

                        {mostrarRepasoBajoMixtos &&
                        esCarpetaMixtos &&
                        carpeta === carpetaMixtosActiva ? (
                          <div className="group sticky bottom-0 z-10 ml-8 flex items-center gap-1 bg-[var(--card)] pt-1">
                            <button
                              type="button"
                              onClick={eliminarRepasoFallos}
                              className="shrink-0 p-1 text-[var(--txt3)] opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                              title="Eliminar repaso.pdf"
                              aria-label="Eliminar repaso.pdf"
                            >
                              <Trash2
                                className="h-5 w-5"
                                strokeWidth={2}
                                aria-hidden="true"
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void abrirRepasoFallos(
                                  carpetaActiva || "",
                                )
                              }
                              className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--th)] bg-white px-2.5 py-2 text-left text-xs font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                              title="repaso.pdf"
                            >
                              <FileText
                                className="h-5 w-5 shrink-0 text-red-500"
                                strokeWidth={2}
                                aria-hidden="true"
                              />
                              <span className="min-w-0 whitespace-normal leading-tight">
                                Repaso de Fallos
                              </span>
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1">
            <div className="rounded-2xl border border-[var(--th)] bg-[var(--card)] p-8 shadow-[var(--sombra)] backdrop-blur-xl">
              {!carpetaActiva ? (
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold mb-4">{t("welcomeTitle")}</h2>
                  <p className="text-[var(--txt3)]">{t("welcomeText")}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[var(--th)] pb-4 gap-4">
                    <h2 className="text-2xl font-bold">
                      {carpetaActiva.startsWith("Fallos - ") 
                        ? t("mistakesReview", {
                            name: carpetaActiva.replace("Fallos - ", ""),
                          })
                        : t("folder", {
                            name: carpetaActiva.replace("Simulacros - ", "Test Mixtos - "),
                          })
                      }
                    </h2>
                    <div className="flex items-center gap-3">
                      {permiteTestMixto && (
                        <button
                          onClick={() => {
                            setErrorMixto("");
                            setMostrarSelectorMixto(true);
                          }}
                          disabled={totalSeleccionados === 0}
                          title={
                            totalSeleccionados === 0
                              ? "Marca al menos un PDF o un resumen para crear el test mixto"
                              : `Crear un test con ${totalSeleccionados} archivo(s)`
                          }
                          className="rounded-lg bg-[var(--azul)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--azul-hover)] transition-colors shadow-sm disabled:cursor-not-allowed disabled:bg-[var(--suave2)] disabled:text-[var(--txt3)] disabled:shadow-none disabled:hover:bg-[var(--suave2)]"
                        >
                          {t("createMixed")}{totalSeleccionados > 0 ? ` (${totalSeleccionados})` : ""}
                        </button>
                      )}
                      
                      <button onClick={() => setCarpetaActiva(null)} className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-bold text-white hover:bg-gray-700 transition-colors shadow-sm">
                        {t("closeFolder")}
                      </button>
                    </div>
                  </div>

                  {/* Altura reservada + overlay: al cambiar de carpeta no se
                      desmonta la lista, así el panel no colapsa ni "salta". */}
                  <div className="relative min-h-[18rem] [overflow-anchor:none]">
                    {cargandoArchivos && (
                      <div
                        role="status"
                        aria-label="Cargando archivos"
                        className="absolute inset-0 z-10 flex cursor-wait items-start justify-center rounded-xl bg-[var(--card)]/75 pt-16 backdrop-blur-[1px]"
                      >
                        <svg className="h-8 w-8 animate-spin text-[var(--azul)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                      </div>
                    )}

                    {archivosMostrados.length > 0 ? (
                      <div className="space-y-3">
                      {permiteTestMixto && (
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--txt3)]">
                          <span>
                            {archivosMostrados.length} PDF(s) · {resumenesSeleccionados.length} resumen(es) · {totalSeleccionados} seleccionado(s)
                          </span>
                          <label
                            className={`inline-flex items-center gap-2 font-semibold ${
                              pdfsBloqueados
                                ? "cursor-not-allowed text-[var(--txt3)] opacity-50"
                                : "cursor-pointer text-[var(--txt2)] hover:text-[var(--txt)]"
                            }`}
                            title={
                              pdfsBloqueados
                                ? t("selectionBlocked")
                                : "Seleccionar todos los PDFs"
                            }
                          >
                            <input
                              type="checkbox"
                              checked={todosSeleccionados}
                              onChange={alternarTodosLosArchivos}
                              disabled={pdfsBloqueados}
                              className="h-4 w-4 rounded border-[var(--th)] bg-[var(--card)] accent-[var(--azul)] disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            Seleccionar todos
                          </label>
                        </div>
                      )}

                      {(pdfsBloqueados || resumenesBloqueados) && (
                        <p className="text-xs font-medium text-[var(--txt3)]">
                          {t("selectionBlocked")}
                        </p>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {archivosMostrados.map((archivo, idx) => {
                          const marcado = seleccionados.includes(archivo);

                          return (
                            <div
                              key={idx}
                              className={`flex items-center justify-between gap-3 p-4 rounded-xl border bg-[var(--card2)] transition-colors group ${
                                marcado
                                  ? "border-[var(--azul)] bg-[var(--suave)] ring-1 ring-[var(--azul)]/30"
                                  : "border-[var(--th)] hover:border-[var(--azul)]/40 hover:bg-[var(--suave)]"
                              }`}
                            >
                              {permiteTestMixto && (
                                <label
                                  className={`flex shrink-0 items-center ${
                                    pdfsBloqueados
                                      ? "cursor-not-allowed opacity-45"
                                      : "cursor-pointer"
                                  }`}
                                  title={
                                    pdfsBloqueados
                                      ? t("selectionBlocked")
                                      : marcado
                                        ? "Quitar del test mixto"
                                        : "Incluir en el test mixto"
                                  }
                                >
                                  <input
                                    type="checkbox"
                                    checked={marcado}
                                    onChange={() => alternarSeleccion(archivo)}
                                    disabled={pdfsBloqueados}
                                    aria-label={`Seleccionar ${archivo} para el test mixto`}
                                    className="h-5 w-5 rounded border-[var(--th)] bg-[var(--card)] accent-[var(--azul)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2 disabled:cursor-not-allowed"
                                  />
                                </label>
                              )}

                              <div
                                onClick={() => {
                                  if (archivo === "repaso.pdf") {
                                    void abrirRepasoFallos(
                                      carpetaActiva || "",
                                    );
                                    return;
                                  }

                                  void handleRepetirTest(archivo);
                                }}
                                className="flex cursor-pointer items-center gap-3 flex-1"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 pointer-events-none"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                                <span className="truncate text-sm font-medium text-[var(--txt2)] group-hover:text-[var(--txt)] pointer-events-none">{archivo}</span>
                              </div>
                              <button onClick={(e) => {
                                if (archivo === "repaso.pdf") {
                                  eliminarRepasoFallos(e);
                                } else {
                                  void eliminarArchivo(
                                    e,
                                    carpetaActiva || "",
                                    archivo,
                                  );
                                }
                              }} className="p-2 text-[var(--txt3)] opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity" title="Eliminar archivo">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-2 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    ) : !cargandoArchivos ? (
                      <div className="flex min-h-[14rem] items-center justify-center text-center">
                        <p className="text-[var(--txt3)] italic">Esta carpeta está vacía.</p>
                      </div>
                    ) : null}
                  </div>

                  {permiteTestMixto && carpetaActiva ? (
                    <ListaResumenes
                      carpeta={carpetaActiva}
                      seleccionados={resumenesSeleccionados}
                      onAlternarSeleccion={alternarSeleccionResumen}
                      bloqueada={resumenesBloqueados}
                      onEliminado={(archivo) =>
                        setResumenesSeleccionados((prev) =>
                          prev.filter((nombre) => nombre !== archivo),
                        )
                      }
                    />
                  ) : null}
                </div>
              )}
              {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
            </div>
          </div>
        </div>

        {mostrarModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--th)] p-6 shadow-2xl w-full max-w-sm">
              <h3 className="text-lg font-bold mb-4">{t("newFolderTitle")}</h3>
              <form onSubmit={crearCarpeta} className="space-y-4">
                <input type="text" value={nuevaCarpetaNombre} onChange={(e) => setNuevaCarpetaNombre(e.target.value)} placeholder={t("folderName")} className="w-full rounded-xl border border-[var(--th)] bg-[var(--card2)] p-3 text-[var(--txt)] outline-none focus:border-[var(--azul)] focus:ring-2 focus:ring-[var(--azul)]/30" autoFocus />
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setMostrarModal(false)} className="px-4 py-2 text-sm font-semibold text-[var(--txt3)] hover:text-[var(--txt)]">{t("cancel")}</button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-[var(--azul)] text-white text-sm font-bold hover:bg-[var(--azul-hover)]">{t("accept")}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {testModalAbierto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div ref={modalRef} className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-[var(--card)] rounded-2xl border border-[var(--th)] p-6 shadow-2xl">
              {cargandoTest ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <svg className="h-10 w-10 animate-spin text-[var(--azul)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                  <p className="mt-4 text-[var(--txt3)]">
                    {resumenesSeleccionados.length > 0
                      ? t("generatingSummaryQuestions")
                      : "Cargando test..."}
                  </p>
                  {resumenesSeleccionados.length > 0 ? (
                    <p className="mt-1 text-sm text-[var(--txt3)]">
                      {t("generatingSummaryHint")}
                    </p>
                  ) : null}
                </div>
              ) : modoPracticaAbierto ? (
                <>
                  <div className="mb-4 text-center">
                    <span className="inline-flex items-center rounded-full bg-[var(--sel)] px-4 py-1.5 text-sm font-bold text-[var(--azul)] dark:bg-[var(--azul)]/15 dark:text-[var(--azul)]">
                      Repaso: {(totalPreguntasPractica - preguntasPracticaRestantes.length)} de {totalPreguntasPractica}
                    </span>
                  </div>
                  <TestExamen 
                    examen={preguntasPractica} 
                    textoContexto="Repaso de Fallos"
                    onClose={() => {
                      cerrarVentanaTest();
                      void cargarCarpetas();
                    }}
                    showSaveButton={false}
                    showPdfButton={false} 
                    onCorregir={() => {
                      modalRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    carpetaOrigen={carpetaPractica}
                    modoPractica={true}
                    persistenciaKey={testId ?? undefined}
                    onFallosActualizados={cargarCarpetas}
                    onPreguntaPracticaCompletada={(acierto) => {
                      if (acierto) {
                        // Ya se maneja con timeout en TestExamen
                        setTimeout(() => {
                          siguientePreguntaPractica();
                        }, 1500);
                      } else {
                        siguientePreguntaPractica();
                      }
                    }}
                  />
                </>
              ) : (
                <TestExamen 
                  examen={preguntasTest} 
                  textoContexto={textoContextoTest}
                  onClose={() => {
                    cerrarVentanaTest();
                    void cargarCarpetas();
                  }}
                  showSaveButton={false}
                  showPdfButton={false} 
                  onCorregir={() => {
                    modalRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  carpetaGuardado={carpetaActiva || ""}
                  isMixtoGuardado={esTestMixto}
                  carpetaOrigen={carpetaActiva || undefined}
                  persistenciaKey={testId ?? undefined}
                  onFallosActualizados={cargarCarpetas}
                />
              )}
            </div>
          </div>
        )}

        {modalConfirmar && (
          <ModalConfirmacion
            isOpen={true}
            titulo={modalConfirmar.titulo}
            mensaje={modalConfirmar.mensaje}
            onConfirm={modalConfirmar.onConfirm}
            onCancel={() => {
              setModalConfirmar(null);
              setTestModalAbierto(false); // Por si acaso cancelamos al generar test mixto
            }}
          />
        )}

        {mostrarSelectorMixto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-test-mixto"
              className="w-full max-w-md rounded-2xl border border-[var(--th)] bg-[var(--card)] p-6 shadow-2xl"
            >
              <h3 id="titulo-test-mixto" className="text-lg font-bold">
                {t("createMixedTitle")}
              </h3>
              <p className="mt-1 text-sm text-[var(--txt3)]">
                Se usarán {totalSeleccionados} archivo(s) de «{carpetaActiva}». El test se guardará en esta carpeta y aparecerá en la lista.
              </p>

              <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto rounded-xl border border-[var(--th)] bg-[var(--card2)] p-3 text-xs text-[var(--txt2)]">
                {seleccionados.map((nombre) => (
                  <li key={nombre} className="truncate" title={nombre}>
                    • {nombre}
                  </li>
                ))}
                {resumenesSeleccionados.map((nombre) => (
                  <li key={`resumen-${nombre}`} className="truncate" title={nombre}>
                    • {nombre}
                  </li>
                ))}
              </ul>

              <p className="mt-4 text-sm font-semibold">Número de preguntas</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["10", "25", "50", "100"].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setNumPreguntasMixto(num)}
                    disabled={cargandoTest}
                    className={`rounded-md px-4 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      num === numPreguntasMixto
                        ? "bg-[var(--azul)] text-white"
                        : "bg-[var(--card2)] text-[var(--txt2)] hover:bg-[var(--suave)]"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              {errorMixto && (
                <p role="alert" className="mt-3 rounded-lg border border-[var(--err-b)] bg-[var(--err)] p-3 text-sm font-medium text-[var(--err-t)]">
                  {errorMixto}
                </p>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarSelectorMixto(false);
                    setErrorMixto("");
                  }}
                  disabled={cargandoTest}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-[var(--txt3)] hover:text-[var(--txt)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void generarTestMixto()}
                  disabled={cargandoTest || totalSeleccionados === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--azul)] px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--azul-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cargandoTest ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                      Generando…
                    </>
                  ) : (
                    "Generar test"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
  );
}