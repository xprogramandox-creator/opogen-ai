import path from "node:path";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { sanearNombreCarpeta } from "@/lib/saneamiento-carpetas";
import { RUTA_DATOS } from "@/lib/rutas";

export type PlanUsuario = "premium" | "freemium";

/** Carpetas raíz donde viven las cuentas según su plan. */
export const CARPETA_PREMIUM = path.join(RUTA_DATOS, "Premium");
export const CARPETA_FREEMIUM = path.join(RUTA_DATOS, "Freemium");

export const SUB_CARPETA_ESPACIO = "Mi_Espacio";
export const PREFIJO_TEST_MIXTO = "Test Mixtos - ";
export const PREFIJO_FALLOS = "Fallos - ";

const CLAVE_USUARIO = /^\d{1,4}_\d{4,15}$/;
const NOMBRE_CARPETA = /^[\p{L}\p{N}][\p{L}\p{N} ._()\-]{0,118}$/u;
const NOMBRE_ARCHIVO = /^[\p{L}\p{N}][\p{L}\p{N} ._()\-]{0,150}\.(?:pdf|json)$/iu;

/** Comprueba que la clave de usuario no contiene separadores ni `..`. */
export function esClaveUsuarioSegura(clave: string): boolean {
  return CLAVE_USUARIO.test(clave);
}

export function esPlanUsuario(valor: unknown): valor is PlanUsuario {
  return valor === "premium" || valor === "freemium";
}

/** Ruta absoluta a la carpeta raíz de un plan. */
export function rutaCarpetaRaizPlan(plan: PlanUsuario): string {
  return plan === "premium" ? CARPETA_PREMIUM : CARPETA_FREEMIUM;
}

/** Carpeta del usuario dentro del plan indicado. */
export function rutaCarpetaPlan(
  plan: PlanUsuario,
  clave: string,
): string {
  if (!esClaveUsuarioSegura(clave)) {
    throw new Error("Clave de usuario no válida.");
  }

  return path.join(rutaCarpetaRaizPlan(plan), clave);
}

/**
 * Detecta el plan por la ubicación real de la carpeta del usuario.
 * Devuelve `null` si todavía no existe en ninguno de los dos planes.
 */
export function detectarPlanUsuario(
  clave: string,
): PlanUsuario | null {
  if (!esClaveUsuarioSegura(clave)) {
    return null;
  }

  if (existsSync(path.join(CARPETA_PREMIUM, clave))) {
    return "premium";
  }

  if (existsSync(path.join(CARPETA_FREEMIUM, clave))) {
    return "freemium";
  }

  return null;
}

/** Ruta absoluta (validada) a la carpeta Mi_Espacio del usuario. */
export function rutaEspacioUsuario(
  clave: string,
  plan?: PlanUsuario,
): string {
  return path.join(
    rutaBaseUsuario(clave, plan),
    SUB_CARPETA_ESPACIO,
  );
}

/** Ruta absoluta (validada) a la carpeta raíz del usuario. */
export function rutaBaseUsuario(
  clave: string,
  plan?: PlanUsuario,
): string {
  if (!esClaveUsuarioSegura(clave)) {
    throw new Error("Clave de usuario no válida.");
  }

  const planFinal =
    plan ?? detectarPlanUsuario(clave) ?? "premium";

  return rutaCarpetaPlan(planFinal, clave);
}

/** `true` si `ruta` está dentro de `base` (o es la propia base). */
export function estaDentroDe(base: string, ruta: string): boolean {
  const baseResuelta = path.resolve(base);
  const rutaResuelta = path.resolve(ruta);

  return (
    rutaResuelta === baseResuelta ||
    rutaResuelta.startsWith(`${baseResuelta}${path.sep}`)
  );
}

/** Nombre de carpeta apto para disco: sin rutas, sin `..`, sin caracteres raros. */
export function esNombreCarpetaSeguro(nombre: string): boolean {
  return (
    nombre.length > 0 &&
    nombre.length <= 120 &&
    !nombre.includes("..") &&
    NOMBRE_CARPETA.test(nombre)
  );
}

/** Nombre de archivo apto para disco (PDF o JSON, sin rutas ni `..`). */
export function esNombreArchivoSeguro(archivo: string): boolean {
  return (
    archivo.length > 0 &&
    archivo.length <= 160 &&
    !archivo.includes("..") &&
    NOMBRE_ARCHIVO.test(archivo)
  );
}

export async function existeCarpeta(ruta: string): Promise<boolean> {
  try {
    await readdir(ruta);
    return true;
  } catch {
    return false;
  }
}

const SUB_TEST = "Test";
const SUB_MIXTOS = "Test Mixtos";
const SUB_REPASO = "Repaso";

function madreDeCarpeta(nombre: string): string {
  let resultado = nombre.trim();

  if (resultado.startsWith(PREFIJO_FALLOS)) {
    resultado = resultado.slice(PREFIJO_FALLOS.length).trim();
  }

  if (resultado.startsWith(PREFIJO_TEST_MIXTO)) {
    resultado = resultado.slice(PREFIJO_TEST_MIXTO.length).trim();
  }

  return resultado;
}

export type CarpetaResuelta = {
  /** Ruta absoluta en disco. */
  ruta: string;
  /** Nombre lógico de la carpeta madre. */
  nombre: string;
};

/**
 * Localiza una carpeta del usuario y traduce las carpetas lógicas antiguas
 * ("Test Mixtos - X", "Fallos - X") a la nueva estructura:
 *
 * Mi_Espacio/X/Test
 * Mi_Espacio/X/Test Mixtos
 * Mi_Espacio/X/Repaso
 */
export async function resolverCarpetaExistente(
  clave: string,
  nombre: string,
): Promise<CarpetaResuelta | null> {
  const espacio = rutaEspacioUsuario(clave);
  const esMixto = nombre.startsWith(PREFIJO_TEST_MIXTO);
  const esRepaso = nombre.startsWith(PREFIJO_FALLOS);
  const madre = madreDeCarpeta(nombre);
  const saneado = sanearNombreCarpeta(madre);

  if (!madre || !esNombreCarpetaSeguro(madre)) {
    return null;
  }

  const candidatosMadre = [madre, saneado].filter(
    (candidato): candidato is string =>
      Boolean(candidato) && esNombreCarpetaSeguro(candidato),
  );

  for (const candidato of candidatosMadre) {
    const raiz = path.join(espacio, candidato);

    if (!estaDentroDe(espacio, raiz)) {
      continue;
    }

    const subcarpeta = esMixto
      ? SUB_MIXTOS
      : esRepaso
        ? SUB_REPASO
        : SUB_TEST;
    const rutaNueva = path.join(raiz, subcarpeta);

    if (await existeCarpeta(rutaNueva)) {
      return {
        ruta: rutaNueva,
        nombre: candidato,
      };
    }

    // Compatibilidad con la estructura antigua.
    if (!esMixto && !esRepaso && (await existeCarpeta(raiz))) {
      return {
        ruta: raiz,
        nombre: candidato,
      };
    }
  }

  // Compatibilidad con las carpetas hermanas antiguas.
  if (esMixto || esRepaso) {
    const prefijo = esMixto ? PREFIJO_TEST_MIXTO : PREFIJO_FALLOS;
    const rutaAntigua = path.join(
      espacio,
      `${prefijo}${madre}`,
    );

    if (
      estaDentroDe(espacio, rutaAntigua) &&
      (await existeCarpeta(rutaAntigua))
    ) {
      return { ruta: rutaAntigua, nombre: madre };
    }
  }

  return null;
}

/**
 * Ruta definitiva donde guardar un examen:
 * - normal: Mi_Espacio/<madre>/Test
 * - mixto:  Mi_Espacio/<madre>/Test Mixtos
 */
export async function resolverRutaGuardado(
  clave: string,
  nombre: string,
  opciones: { mixto?: boolean } = {},
): Promise<CarpetaResuelta> {
  const esMixto = opciones.mixto === true;
  const madre = madreDeCarpeta(nombre);

  if (!madre || !esNombreCarpetaSeguro(madre)) {
    throw new Error("El nombre de la carpeta no es válido.");
  }

  const espacio = rutaEspacioUsuario(clave);
  const saneado = sanearNombreCarpeta(madre);
  const candidatos = [madre, saneado].filter(
    (candidato): candidato is string =>
      Boolean(candidato) && esNombreCarpetaSeguro(candidato),
  );

  let raiz: string | null = null;

  for (const candidato of candidatos) {
    const ruta = path.join(espacio, candidato);

    if (estaDentroDe(espacio, ruta) && (await existeCarpeta(ruta))) {
      raiz = ruta;
      break;
    }
  }

  if (!raiz) {
    const nombreFinal = saneado || madre;

    if (!esNombreCarpetaSeguro(nombreFinal)) {
      throw new Error("El nombre de la carpeta no es válido.");
    }

    raiz = path.join(espacio, nombreFinal);
  }

  if (!estaDentroDe(espacio, raiz)) {
    throw new Error("El nombre de la carpeta no es válido.");
  }

  return {
    ruta: path.join(
      raiz,
      esMixto ? SUB_MIXTOS : SUB_TEST,
    ),
    nombre: path.basename(raiz),
  };
}
