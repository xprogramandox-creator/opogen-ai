export type Tema = "claro" | "oscuro";

export const TEMA_STORAGE_KEY = "opoquiz-tema";

function esTema(valor: unknown): valor is Tema {
  return valor === "claro" || valor === "oscuro";
}

function temaPreferido(): Tema {
  if (typeof window === "undefined") {
    return "claro";
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "oscuro"
    : "claro";
}

export function obtenerTema(): Tema {
  if (typeof document === "undefined") {
    return "claro";
  }

  return document.documentElement.getAttribute("data-tema") === "oscuro"
    ? "oscuro"
    : "claro";
}

export function obtenerTemaServidor(): Tema {
  return "claro";
}

export function guardarTema(tema: Tema): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.setAttribute("data-tema", tema);

  try {
    window.localStorage.setItem(TEMA_STORAGE_KEY, tema);
  } catch {
    // El navegador puede tener bloqueado localStorage.
  }

  window.dispatchEvent(
    new CustomEvent<Tema>("opoquiz:tema-cambiado", {
      detail: tema,
    }),
  );
}

export function alternarTema(): Tema {
  const siguiente: Tema = obtenerTema() === "claro" ? "oscuro" : "claro";

  guardarTema(siguiente);

  return siguiente;
}

export function suscribirTema(callback: () => void): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => undefined;
  }

  const observador = new MutationObserver(callback);

  observador.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-tema"],
  });

  const alCambiarAlmacenamiento = (evento: StorageEvent) => {
    if (evento.key !== TEMA_STORAGE_KEY) {
      return;
    }

    const nuevoTema = esTema(evento.newValue)
      ? evento.newValue
      : temaPreferido();

    if (document.documentElement.getAttribute("data-tema") !== nuevoTema) {
      document.documentElement.setAttribute("data-tema", nuevoTema);
    } else {
      callback();
    }
  };

  const alCambiarTema = () => callback();

  window.addEventListener("storage", alCambiarAlmacenamiento);
  window.addEventListener("opoquiz:tema-cambiado", alCambiarTema);

  return () => {
    observador.disconnect();
    window.removeEventListener("storage", alCambiarAlmacenamiento);
    window.removeEventListener("opoquiz:tema-cambiado", alCambiarTema);
  };
}
