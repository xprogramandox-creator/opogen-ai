import { NextResponse } from "next/server";

export const maxDuration = 30;

/* =========================================================
   CONFIGURACIÓN
   ========================================================= */

const WIKIPEDIA_API = "https://es.wikipedia.org/w/api.php";

const MINIMO_CARACTERES_TEMA = 2;
const MAXIMO_CARACTERES_TEMA = 100;
const MAXIMO_CARACTERES_POR_ARTICULO = 9_000;
const MAXIMO_ARTICULOS = 4;

const CACHE_TTL_MS = 60 * 60 * 1000;
const PETICIONES_POR_MINUTO = 8;
const VENTANA_LIMITE_MS = 60_000;
const TIMEOUT_BUSQUEDA_MS = 15_000;

type ArticuloWikipedia = {
  pageid?: number;
  title?: string;
  extract?: string;
  fullurl?: string;
  index?: number;
};

type RespuestaWikipedia = {
  query?: {
    pages?:
      | ArticuloWikipedia[]
      | Record<string, ArticuloWikipedia>;
  };
  error?: {
    code?: string;
    info?: string;
  };
};

type Fuente = {
  titulo: string;
  url: string;
};

type EntradaCache = {
  ts: number;
  texto: string;
  fuentes: Fuente[];
};

type CuerpoPeticion = {
  tema?: unknown;
};

const cache = new Map<string, EntradaCache>();

const limitePorIp = new Map<
  string,
  { peticiones: number; reinicio: number }
>();

/* =========================================================
   UTILIDADES
   ========================================================= */

function obtenerIp(req: Request): string {
  const cabecera =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "desconocida";

  return cabecera.split(",")[0]?.trim() || "desconocida";
}

function excedidoPorIp(req: Request): boolean {
  const ahora = Date.now();
  const ip = obtenerIp(req);

  if (limitePorIp.size > 1_000) {
    for (const [clave, datos] of limitePorIp) {
      if (datos.reinicio <= ahora) {
        limitePorIp.delete(clave);
      }
    }
  }

  const actual = limitePorIp.get(ip);

  if (!actual || actual.reinicio <= ahora) {
    limitePorIp.set(ip, {
      peticiones: 1,
      reinicio: ahora + VENTANA_LIMITE_MS,
    });

    return false;
  }

  actual.peticiones += 1;

  return actual.peticiones > PETICIONES_POR_MINUTO;
}

function origenPermitido(req: Request): boolean {
  const origen = req.headers.get("origin");

  if (!origen) {
    return true;
  }

  const cabeceraHost =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host");

  if (!cabeceraHost) {
    return false;
  }

  const host = cabeceraHost.split(",")[0]?.trim();

  try {
    return new URL(origen).host === host;
  } catch {
    return false;
  }
}

function limpiarTema(valor: unknown): string {
  if (typeof valor !== "string") {
    return "";
  }

  return valor
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAXIMO_CARACTERES_TEMA);
}

function normalizarArticulos(
  value:
    | ArticuloWikipedia[]
    | Record<string, ArticuloWikipedia>
    | undefined,
): ArticuloWikipedia[] {
  if (!value) {
    return [];
  }

  const articulos = Array.isArray(value)
    ? value
    : Object.values(value);

  return articulos
    .filter((articulo) => {
      return (
        typeof articulo.title === "string" &&
        typeof articulo.extract === "string" &&
        articulo.extract.trim().length >= 100
      );
    })
    .sort((a, b) => {
      const indiceA = typeof a.index === "number" ? a.index : 0;
      const indiceB = typeof b.index === "number" ? b.index : 0;

      return indiceA - indiceB;
    })
    .slice(0, MAXIMO_ARTICULOS);
}

function construirUrlArticulo(titulo: string): string {
  return (
    "https://es.wikipedia.org/wiki/" +
    encodeURIComponent(titulo.replace(/\s+/g, "_"))
  );
}

function construirTextoTema(
  tema: string,
  articulos: ArticuloWikipedia[],
): string {
  return articulos
    .map((articulo, indice) => {
      const titulo = (articulo.title || `Artículo ${indice + 1}`)
        .replace(/[\r\n]+/g, " ")
        .replace(/---/g, "-")
        .trim();

      const contenido = (articulo.extract || "")
        .replace(/\u0000/g, "")
        .trim()
        .slice(0, MAXIMO_CARACTERES_POR_ARTICULO);

      return [
        "",
        `--- INICIO DOCUMENTO ${indice + 1}: ${titulo} ---`,
        contenido,
        `--- FIN DOCUMENTO ${indice + 1} ---`,
        "",
      ].join("\n");
    })
    .join("\n");
}

async function buscarEnWikipedia(
  tema: string,
): Promise<{
  texto: string;
  fuentes: Fuente[];
}> {
  const controller = new AbortController();

  const temporizador = setTimeout(() => {
    controller.abort();
  }, TIMEOUT_BUSQUEDA_MS);

  async function consultarWikipedia(
    parametrosBase: Record<string, string>,
  ): Promise<RespuestaWikipedia> {
    const parametros = new URLSearchParams({
      format: "json",
      formatversion: "2",
      ...parametrosBase,
    });

    const response = await fetch(
      `${WIKIPEDIA_API}?${parametros.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent":
            process.env.WIKIPEDIA_USER_AGENT?.trim() ||
            "OpoGenAI/1.0 (aplicacion educativa de examenes)",
        },
        cache: "no-store",
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error(
        `Wikipedia respondió con el estado ${response.status}.`,
      );
    }

    try {
      return (await response.json()) as RespuestaWikipedia;
    } catch {
      throw new Error(
        "Wikipedia devolvió una respuesta que no se pudo procesar.",
      );
    }
  }

  try {
    /*
     * Primero buscamos un artículo cuyo título coincida con el
     * tema introducido por el usuario.
     *
     * Wikipedia redirige, por ejemplo, "Gacela" a "Gazella".
     */
    const respuestaExacta = await consultarWikipedia({
      action: "query",
      titles: tema,
      redirects: "1",
      prop: "extracts|info",
      explaintext: "1",
      exchars: "9000",
      exlimit: "1",
      inprop: "url",
    });

    const articulosExactos = normalizarArticulos(
      respuestaExacta.query?.pages,
    );

    /*
     * Después buscamos artículos relacionados. Estos se utilizan
     * para ampliar el contexto, pero nunca sustituyen al artículo
     * principal cuando existe una coincidencia exacta.
     */
    const respuestaRelacionados = await consultarWikipedia({
      action: "query",
      generator: "search",
      gsrsearch: tema,
      gsrnamespace: "0",
      gsrlimit: "5",
      prop: "extracts|info",
      explaintext: "1",
      exchars: "6000",
      exlimit: "5",
      inprop: "url",
    });

    const articulosRelacionados = normalizarArticulos(
      respuestaRelacionados.query?.pages,
    );

    /*
     * Si existe una coincidencia exacta, se utiliza únicamente
     * ese artículo. Esto evita mezclar resultados homónimos o
     * poco relacionados, como el artículo de una empresa llamada
     * "Gacela" con el artículo sobre el animal.
     *
     * Si no existe coincidencia exacta, se utilizan los resultados
     * relacionados de la búsqueda.
     */
    const articulosBase =
      articulosExactos.length > 0
        ? articulosExactos
        : articulosRelacionados;

    const articulosCombinados: ArticuloWikipedia[] = [];
    const articulosVistos = new Set<string>();

    for (const articulo of articulosBase) {
      const titulo = (articulo.title || "").trim();

      if (!titulo) {
        continue;
      }

      const clave =
        typeof articulo.pageid === "number"
          ? `id:${articulo.pageid}`
          : `titulo:${titulo.toLocaleLowerCase("es")}`;

      if (articulosVistos.has(clave)) {
        continue;
      }

      articulosVistos.add(clave);
      articulosCombinados.push(articulo);

      if (
        articulosCombinados.length >= MAXIMO_ARTICULOS
      ) {
        break;
      }
    }

    if (articulosCombinados.length === 0) {
      throw new Error(
        "No se ha encontrado información suficiente sobre ese tema.",
      );
    }

    const fuentes: Fuente[] = articulosCombinados.map(
      (articulo) => {
        const titulo = (articulo.title || "Artículo").trim();

        return {
          titulo,
          url:
            typeof articulo.fullurl === "string" &&
            articulo.fullurl
              ? articulo.fullurl
              : construirUrlArticulo(titulo),
        };
      },
    );

    return {
      texto: construirTextoTema(tema, articulosCombinados),
      fuentes,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "La búsqueda del tema ha tardado demasiado. Inténtalo de nuevo.",
      );
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error(
      "No se ha podido buscar información sobre ese tema.",
    );
  } finally {
    clearTimeout(temporizador);
  }
}
/* =========================================================
   HANDLER
   ========================================================= */

export async function POST(req: Request) {
  if (!origenPermitido(req)) {
    return NextResponse.json(
      { error: "Origen de la petición no permitido." },
      { status: 403 },
    );
  }

  if (excedidoPorIp(req)) {
    return NextResponse.json(
      {
        error:
          "Has realizado demasiadas búsquedas. Espera un minuto antes de intentarlo de nuevo.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": "60",
        },
      },
    );
  }

  let body: CuerpoPeticion;

  try {
    const datos: unknown = await req.json();

    if (!datos || typeof datos !== "object") {
      throw new Error("El cuerpo de la petición no es válido.");
    }

    body = datos as CuerpoPeticion;
  } catch {
    return NextResponse.json(
      { error: "La solicitud no es válida." },
      { status: 400 },
    );
  }

  const tema = limpiarTema(body.tema);

  if (tema.length < MINIMO_CARACTERES_TEMA) {
    return NextResponse.json(
      {
        error:
          "Escribe un tema de al menos 2 caracteres para buscar información.",
      },
      { status: 400 },
    );
  }

  const claveCache = tema.toLocaleLowerCase("es");
  const entradaCache = cache.get(claveCache);

  if (
    entradaCache &&
    Date.now() - entradaCache.ts < CACHE_TTL_MS
  ) {
    return NextResponse.json(
      {
        texto: entradaCache.texto,
        fuentes: entradaCache.fuentes,
        totalArticulos: entradaCache.fuentes.length,
        desdeCache: true,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  try {
    const resultado = await buscarEnWikipedia(tema);

    cache.set(claveCache, {
      ts: Date.now(),
      texto: resultado.texto,
      fuentes: resultado.fuentes,
    });

    if (cache.size > 100) {
      const primera = cache.keys().next().value;

      if (primera) {
        cache.delete(primera);
      }
    }

    return NextResponse.json(
      {
        texto: resultado.texto,
        fuentes: resultado.fuentes,
        totalArticulos: resultado.fuentes.length,
        desdeCache: false,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const mensaje =
      error instanceof Error
        ? error.message
        : "No se ha podido buscar información sobre ese tema.";

    return NextResponse.json(
      { error: mensaje },
      { status: 502 },
    );
  }
}
