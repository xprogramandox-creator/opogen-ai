import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { CLAVE_ADMIN } from "@/lib/planes";
import { existsSync } from "node:fs";
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcrypt";
import * as argon2 from "argon2";
import { cookies } from "next/headers";
import { peticionEsHttps } from "@/lib/cookie-seguro";
import { sanearTexto } from "@/lib/saneamiento";
import { secretoSesion } from "@/lib/secreto";
import { correoValido, nombreValido } from "@/lib/validacion";
import {
  inferirTipoDocumento,
  type TipoDocumento,
} from "@/lib/validacion";
import { conBloqueoUsuario } from "@/lib/file-lock";
import {
  esPlanUsuario,
  rutaCarpetaPlan,
  rutaCarpetaRaizPlan,
  detectarPlanUsuario,
  type PlanUsuario,
} from "@/lib/rutas-espacio";

export type UsuarioRegistrado = {
  nombre: string;
  apellidos?: string;
  telefono: string;
  passwordHash: string;
  correo: string;
  clave: string;
  rol: PlanUsuario;
  emailVerificado?: boolean;
  tokenVerificacion?: string;
  tokenVerificacionExpira?: number;
  testsHoy?: number;
  fechaTests?: string;
  arcadeHoy?: number;
  fechaArcade?: string;
  fechaDegradacion?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  planContratado?: string;
  fechaCaducidad?: string;
  fechaInicio?: string;
  nombreCompleto?: string;
  documentoIdentidad?: string;
  tipoDocumento?: TipoDocumento;
  dni?: string;
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  pais?: string;
  codigoPostal?: string;
  resetToken?: string;
  resetTokenExpira?: number;
};

export type UsuarioPublico = {
  nombre: string;
  telefono: string;
  correo: string;
  clave: string;
  rol: PlanUsuario;
};

export type UsuarioConRuta = {
  usuario: UsuarioRegistrado;
  plan: PlanUsuario;
  rutaArchivo: string;
};

const NOMBRE_ARCHIVO = "datos.txt";
const COOKIE_SESION = "opoquiz_sesion";
const DURACION_SESION_SEGUNDOS = 60 * 60 * 24 * 7;

export class UsuarioExistenteError extends Error {
  constructor() {
    super("Ya existe una cuenta con este teléfono.");
    this.name = "UsuarioExistenteError";
  }
}

function esErrorConCodigo(
  error: unknown,
  codigo: string,
): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === codigo
  );
}

export function esClaveUsuarioValida(clave: string): boolean {
  if (
    clave.includes("..") ||
    clave.includes("/") ||
    clave.includes("\\") ||
    clave.includes("\0")
  ) {
    return false;
  }

  return /^\d{1,4}_\d{4,15}$/.test(clave);
}

function rutaCarpetaUsuario(
  clave: string,
  plan?: PlanUsuario,
): string {
  if (!esClaveUsuarioValida(clave)) {
    throw new Error("Clave de usuario no válida.");
  }

  const planFinal =
    plan ?? detectarPlanUsuario(clave) ?? "premium";

  return rutaCarpetaPlan(planFinal, clave);
}

export function rutaArchivoUsuario(
  clave: string,
  plan?: PlanUsuario,
): string {
  return path.join(rutaCarpetaUsuario(clave, plan), NOMBRE_ARCHIVO);
}

export function serializarDatos(usuario: UsuarioRegistrado): string {
  const nombre = sanearTexto(usuario.nombre);
  const telefono = usuario.telefono.trim();
  const correo = sanearTexto(usuario.correo);

  if (!esClaveUsuarioValida(telefono)) {
    throw new Error("Teléfono no válido.");
  }

  if (!nombreValido(nombre) || !correoValido(correo)) {
    throw new Error("Datos de usuario no válidos.");
  }

  const hashValido =
    /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(
      usuario.passwordHash,
    ) ||
    /^\$argon2(?:id|i|d)\$v=\d+\$/.test(usuario.passwordHash);

  if (!hashValido) {
    throw new Error("Hash de contraseña no válido.");
  }

  if (!esPlanUsuario(usuario.rol)) {
    throw new Error("Plan de usuario no válido.");
  }

  const lineas = [
    `Usuario: ${nombre}`,
    `Telefono: ${telefono}`,
    `Contraseña: ${usuario.passwordHash}`,
    `Correo: ${correo}`,
    `Rol: ${usuario.rol}`,
  ];

  if (usuario.apellidos) {
    lineas.push(`Apellidos: ${usuario.apellidos}`);
  }

  if (usuario.emailVerificado !== undefined) {
    lineas.push(`EmailVerificado: ${usuario.emailVerificado ? "true" : "false"}`);
  }
  if (usuario.tokenVerificacion) {
    lineas.push(`TokenVerificacion: ${usuario.tokenVerificacion}`);
  }
  if (usuario.tokenVerificacionExpira !== undefined) {
    lineas.push(`TokenVerificacionExpira: ${usuario.tokenVerificacionExpira}`);
  }
  if (usuario.fechaTests) {
    lineas.push(`FechaTests: ${usuario.fechaTests}`);
  }
  if (usuario.testsHoy !== undefined) {
    lineas.push(`TestsHoy: ${usuario.testsHoy}`);
  }
  if (usuario.fechaArcade) {
    lineas.push(`FechaArcade: ${usuario.fechaArcade}`);
  }
  if (usuario.arcadeHoy !== undefined) {
    lineas.push(`ArcadeHoy: ${usuario.arcadeHoy}`);
  }
  if (usuario.fechaDegradacion) {
    lineas.push(`FechaDegradacion: ${usuario.fechaDegradacion}`);
  }
  if (usuario.stripeCustomerId) {
    lineas.push(`StripeCustomerId: ${usuario.stripeCustomerId}`);
  }
  if (usuario.stripeSubscriptionId) {
    lineas.push(`StripeSubscriptionId: ${usuario.stripeSubscriptionId}`);
  }
  if (usuario.planContratado) {
    lineas.push(`PlanContratado: ${usuario.planContratado}`);
  }
  if (usuario.fechaCaducidad) {
    lineas.push(`FechaCaducidad: ${usuario.fechaCaducidad}`);
  }
  if (usuario.fechaInicio) {
    lineas.push(`FechaInicio: ${usuario.fechaInicio}`);
  }
  if (usuario.nombreCompleto) {
    lineas.push(`NombreCompleto: ${usuario.nombreCompleto}`);
  }
  if (usuario.documentoIdentidad) {
    lineas.push(`DocumentoIdentidad: ${usuario.documentoIdentidad}`);
  }
  if (usuario.tipoDocumento) {
    lineas.push(`TipoDocumento: ${usuario.tipoDocumento}`);
  }
  if (usuario.dni) {
    lineas.push(`DNI: ${usuario.dni}`);
  }
  if (usuario.direccion) {
    lineas.push(`Direccion: ${usuario.direccion}`);
  }
  if (usuario.ciudad) {
    lineas.push(`Ciudad: ${usuario.ciudad}`);
  }
  if (usuario.provincia) {
    lineas.push(`Provincia: ${usuario.provincia}`);
  }
  if (usuario.pais) {
    lineas.push(`Pais: ${usuario.pais}`);
  }
  if (usuario.codigoPostal) {
    lineas.push(`CodigoPostal: ${usuario.codigoPostal}`);
  }
  if (usuario.resetToken) {
    lineas.push(`ResetToken: ${usuario.resetToken}`);
  }
  if (usuario.resetTokenExpira !== undefined) {
    lineas.push(`ResetTokenExpira: ${usuario.resetTokenExpira}`);
  }

  lineas.push("");
  return lineas.join("\n");
}

function parsearDatos(
  texto: string,
  planPorDefecto: PlanUsuario = "premium",
): UsuarioRegistrado | null {
  const valores = new Map<string, string>();

  for (const linea of texto
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")) {
    const separador = linea.indexOf(":");

    if (separador < 1) {
      continue;
    }

    const nombreCampo = linea.slice(0, separador).trim().toLowerCase();
    let valor = linea.slice(separador + 1);

    if (valor.startsWith(" ")) {
      valor = valor.slice(1);
    }

    valores.set(nombreCampo, valor);
  }

  const nombre = valores.get("usuario")?.trim() || "";
  const apellidos = valores.get("apellidos")?.trim() || undefined;
  const telefono = valores.get("telefono")?.trim() || "";
  const passwordHash = valores.get("contraseña") || "";
  const correo = valores.get("correo")?.trim() || "";
  const rolTexto = valores.get("rol")?.trim().toLowerCase() || "";
  const rol = esPlanUsuario(rolTexto) ? rolTexto : planPorDefecto;
  const emailVerificado = valores.get("emailverificado")?.trim() === "true";
  const tokenVerificacion = valores.get("tokenverificacion")?.trim() || undefined;
  const tokenVerificacionExpiraStr = valores.get("tokenverificacionexpira")?.trim();
  const tokenVerificacionExpira = tokenVerificacionExpiraStr
    ? Number(tokenVerificacionExpiraStr)
    : undefined;
  const testsHoyStr = valores.get("testshoy")?.trim();
  const testsHoy = testsHoyStr ? Number(testsHoyStr) : undefined;
  const fechaTests = valores.get("fechatests")?.trim() || undefined;
  const arcadeHoyStr = valores.get("arcadehoy")?.trim();
  const arcadeHoy = arcadeHoyStr ? Number(arcadeHoyStr) : undefined;
  const fechaArcade = valores.get("fechaarcade")?.trim() || undefined;
  const fechaDegradacion =
    valores.get("fechadegradacion")?.trim() || undefined;
  const stripeCustomerId =
    valores.get("stripecustomerid")?.trim() || undefined;
  const stripeSubscriptionId =
    valores.get("stripesubscriptionid")?.trim() || undefined;
  const planContratado =
    valores.get("plancontratado")?.trim() || undefined;
  const fechaCaducidad =
    valores.get("fechacaducidad")?.trim() || undefined;
  const fechaInicio = valores.get("fechainicio")?.trim() || undefined;
  const dni = valores.get("dni")?.trim() || undefined;
  const nombreCompletoGuardado =
    valores.get("nombrecompleto")?.trim() || undefined;
  const documentoIdentidadGuardado =
    valores.get("documentoidentidad")?.trim() || undefined;
  const tipoDocumentoGuardado =
    valores.get("tipodocumento")?.trim().toUpperCase();
  const direccion = valores.get("direccion")?.trim() || undefined;
  const ciudad = valores.get("ciudad")?.trim() || undefined;
  const provincia = valores.get("provincia")?.trim() || undefined;
  const pais = valores.get("pais")?.trim() || undefined;
  const codigoPostal =
    valores.get("codigopostal")?.trim() || undefined;
  const resetToken = valores.get("resettoken")?.trim() || undefined;
  const resetTokenExpiraStr =
    valores.get("resettokenexpira")?.trim();
  const resetTokenExpira = resetTokenExpiraStr
    ? Number(resetTokenExpiraStr)
    : undefined;
  const documentoIdentidad =
    documentoIdentidadGuardado || dni || undefined;
  const nombreCompleto =
    nombreCompletoGuardado ||
    [nombre, apellidos].filter(Boolean).join(" ").trim() ||
    undefined;
  const tipoDocumentoValido =
    tipoDocumentoGuardado === "DNI" ||
    tipoDocumentoGuardado === "NIE" ||
    tipoDocumentoGuardado === "VAT" ||
    tipoDocumentoGuardado === "ID" ||
    tipoDocumentoGuardado === "PASSPORT";
  const tipoDocumento = tipoDocumentoValido
    ? (tipoDocumentoGuardado as TipoDocumento)
    : documentoIdentidad
      ? inferirTipoDocumento(documentoIdentidad, pais || "")
      : undefined;

  if (
    !nombre ||
    !esClaveUsuarioValida(telefono) ||
    !passwordHash ||
    !correo
  ) {
    return null;
  }

  return {
    nombre,
    apellidos,
    telefono,
    passwordHash,
    correo,
    clave: telefono,
    rol,
    emailVerificado,
    tokenVerificacion,
    tokenVerificacionExpira,
    testsHoy:
      typeof testsHoy === "number" && Number.isFinite(testsHoy)
        ? Math.max(0, Math.trunc(testsHoy))
        : undefined,
    fechaTests,
    arcadeHoy:
      typeof arcadeHoy === "number" && Number.isFinite(arcadeHoy)
        ? Math.max(0, Math.trunc(arcadeHoy))
        : undefined,
    fechaArcade,
    fechaDegradacion,
    stripeCustomerId,
    stripeSubscriptionId,
    planContratado,
    fechaCaducidad,
    fechaInicio,
    nombreCompleto,
    documentoIdentidad,
    tipoDocumento,
    dni,
    direccion,
    ciudad,
    provincia,
    pais,
    codigoPostal,
    resetToken,
    resetTokenExpira:
      typeof resetTokenExpira === "number" &&
      Number.isFinite(resetTokenExpira)
        ? resetTokenExpira
        : undefined,
  };
}

export async function guardarUsuario(
  usuario: UsuarioRegistrado,
): Promise<void> {
  if (!esPlanUsuario(usuario.rol)) {
    throw new Error("Plan de usuario no válido.");
  }

  await conBloqueoUsuario(usuario.clave, async () => {
    // El teléfono es único en toda la plataforma, no solo dentro de un plan.
    if (await leerUsuario(usuario.clave)) {
      throw new UsuarioExistenteError();
    }

    const carpeta = rutaCarpetaUsuario(usuario.clave, usuario.rol);
    const archivo = rutaArchivoUsuario(usuario.clave, usuario.rol);

    await mkdir(rutaCarpetaRaizPlan(usuario.rol), { recursive: true });
    await mkdir(carpeta, { recursive: true });

    try {
      await writeFile(archivo, serializarDatos(usuario), {
        encoding: "utf8",
        flag: "wx",
      });
    } catch (error) {
      if (esErrorConCodigo(error, "EEXIST")) {
        throw new UsuarioExistenteError();
      }

      throw error;
    }
  });
}

export async function actualizarUsuario(
  usuario: UsuarioRegistrado,
): Promise<void> {
  if (!esPlanUsuario(usuario.rol)) {
    throw new Error("Plan de usuario no válido.");
  }

  await conBloqueoUsuario(usuario.clave, async () => {
    const actual = await leerUsuario(usuario.clave);

    if (!actual) {
      throw new Error("Usuario no encontrado.");
    }

    const carpeta = rutaCarpetaUsuario(usuario.clave, usuario.rol);
    const archivo = rutaArchivoUsuario(usuario.clave, usuario.rol);

    await mkdir(rutaCarpetaRaizPlan(usuario.rol), { recursive: true });
    await mkdir(carpeta, { recursive: true });

    await writeFile(archivo, serializarDatos(usuario), {
      encoding: "utf8",
    });
  });
}

export async function leerUsuario(
  clave: string,
  plan?: PlanUsuario,
): Promise<UsuarioRegistrado | null> {
  const planes: PlanUsuario[] = plan
    ? [plan]
    : ["premium", "freemium"];

  for (const planActual of planes) {
    try {
      const texto = await readFile(
        rutaArchivoUsuario(clave, planActual),
        "utf8",
      );
      const usuario = parsearDatos(texto, planActual);

      if (usuario) {
        // La ubicación física manda: evita usar una ruta que ya no existe.
        return { ...usuario, rol: planActual };
      }
    } catch (error) {
      if (!esErrorConCodigo(error, "ENOENT")) {
        throw error;
      }
    }
  }

  return null;
}

export type TipoUsoFreemium = "test" | "arcade";

export type UsoFreemium = {
  testsHoy: number;
  arcadeHoy: number;
  fecha: string;
};

function fechaHoyMadrid(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function contadorDelDia(
  valor: number | undefined,
  fechaGuardada: string | undefined,
  hoy: string,
): number {
  if (fechaGuardada !== hoy) {
    return 0;
  }

  return typeof valor === "number" && Number.isFinite(valor)
    ? Math.max(0, Math.trunc(valor))
    : 0;
}

/** Consumo diario del usuario, reiniciado automáticamente cada día. */
export async function leerUsoFreemium(
  clave: string,
): Promise<UsoFreemium> {
  const usuario = await leerUsuario(clave);
  const hoy = fechaHoyMadrid();

  return {
    testsHoy: contadorDelDia(
      usuario?.testsHoy,
      usuario?.fechaTests,
      hoy,
    ),
    arcadeHoy: contadorDelDia(
      usuario?.arcadeHoy,
      usuario?.fechaArcade,
      hoy,
    ),
    fecha: hoy,
  };
}

/**
 * Suma un uso al contador diario del plan Freemium y lo persiste en
 * datos.txt. Los usuarios Premium no consumen contador.
 */
export async function registrarUsoFreemium(
  clave: string,
  tipo: TipoUsoFreemium,
): Promise<UsoFreemium> {
  return conBloqueoUsuario(clave, async () => {
    const usuario = await leerUsuario(clave);

    if (!usuario) {
      throw new Error("Usuario no encontrado.");
    }

    const hoy = fechaHoyMadrid();
    const testsHoy = contadorDelDia(
      usuario.testsHoy,
      usuario.fechaTests,
      hoy,
    );
    const arcadeHoy = contadorDelDia(
      usuario.arcadeHoy,
      usuario.fechaArcade,
      hoy,
    );

    if (usuario.rol !== "freemium") {
      return { testsHoy, arcadeHoy, fecha: hoy };
    }

    const actualizado: UsuarioRegistrado = {
      ...usuario,
      fechaTests: hoy,
      testsHoy: testsHoy + (tipo === "test" ? 1 : 0),
      fechaArcade: hoy,
      arcadeHoy: arcadeHoy + (tipo === "arcade" ? 1 : 0),
    };

    await writeFile(
      rutaArchivoUsuario(clave, usuario.rol),
      serializarDatos(actualizado),
      "utf8",
    );

    return {
      testsHoy: actualizado.testsHoy ?? testsHoy,
      arcadeHoy: actualizado.arcadeHoy ?? arcadeHoy,
      fecha: hoy,
    };
  });
}

/**
 * Recorre las dos carpetas raíz y devuelve todos los usuarios con su plan
 * y la ruta real de su datos.txt.
 */
export async function listarUsuarios(): Promise<UsuarioConRuta[]> {
  const usuarios: UsuarioConRuta[] = [];

  for (const plan of ["premium", "freemium"] as const) {
    try {
      const entradas = await readdir(rutaCarpetaRaizPlan(plan), {
        withFileTypes: true,
      });

      for (const entrada of entradas) {
        if (!entrada.isDirectory()) {
          continue;
        }

        const rutaArchivo = path.join(
          rutaCarpetaRaizPlan(plan),
          entrada.name,
          NOMBRE_ARCHIVO,
        );

        try {
          const texto = await readFile(rutaArchivo, "utf8");
          const usuario = parsearDatos(texto, plan);

          if (usuario) {
            usuarios.push({
              usuario: { ...usuario, rol: plan },
              plan,
              rutaArchivo,
            });
          }
        } catch {
          // Carpeta sin datos.txt o archivo ilegible: se ignora.
        }
      }
    } catch {
      // Todavía no existe esa carpeta raíz.
    }
  }

  return usuarios;
}

export async function buscarUsuarioPorTokenReset(
  token: string,
): Promise<UsuarioConRuta | null> {
  if (!token) return null;

  const usuarios = await listarUsuarios();

  return (
    usuarios.find(
      (usuario) => usuario.usuario.resetToken === token,
    ) ?? null
  );
}

export async function buscarUsuarioPorCorreo(
  correoBuscado: string,
): Promise<UsuarioConRuta | null> {  const correoNormalizado = correoBuscado.trim().toLowerCase();

  if (!correoNormalizado) {
    return null;
  }

  const usuarios = await listarUsuarios();

  return (
    usuarios.find(
      ({ usuario }) =>
        usuario.correo.trim().toLowerCase() === correoNormalizado,
    ) ?? null
  );
}

/**
 * Migra una cuenta Freemium a Premium moviendo toda su carpeta.
 * Queda preparada para llamarla desde el flujo de pagos.
 */
export async function migrarUsuarioAPremium(clave: string): Promise<{
  migrado: boolean;
  rol: PlanUsuario;
}> {
  return conBloqueoUsuario(clave, async () => {
    const usuario = await leerUsuario(clave);

    if (!usuario) {
      throw new Error("Usuario no encontrado.");
    }

    const planActual = detectarPlanUsuario(clave);

    if (planActual === "premium") {
      if (usuario.rol !== "premium" || usuario.fechaDegradacion) {
        usuario.rol = "premium";
        delete usuario.fechaDegradacion;
        await writeFile(
          rutaArchivoUsuario(clave, "premium"),
          serializarDatos(usuario),
          "utf8",
        );
      }

      return { migrado: false, rol: "premium" as const };
    }

    if (planActual !== "freemium") {
      throw new Error("No se pudo detectar el plan actual del usuario.");
    }

    const origen = rutaCarpetaPlan("freemium", clave);
    const destino = rutaCarpetaPlan("premium", clave);

    if (existsSync(destino)) {
      throw new Error(
        "Ya existe una carpeta Premium para este usuario.",
      );
    }

    await mkdir(rutaCarpetaRaizPlan("premium"), { recursive: true });

    try {
      await rename(origen, destino);
    } catch (error) {
      if (!esErrorConCodigo(error, "EXDEV")) {
        throw error;
      }

      // Distinto volumen: copiar y borrar el origen.
      await cp(origen, destino, { recursive: true });
      await rm(origen, { recursive: true, force: true });
    }

    usuario.rol = "premium";
    delete usuario.fechaDegradacion;
    await writeFile(
      rutaArchivoUsuario(clave, "premium"),
      serializarDatos(usuario),
      "utf8",
    );

    return { migrado: true, rol: "premium" as const };
  });
}

/** Guarda los identificadores de Stripe para consultar la suscripción. */
export async function actualizarSuscripcionUsuario(
  clave: string,
  datos: { customerId?: string; subscriptionId?: string },
): Promise<void> {
  return conBloqueoUsuario(clave, async () => {
    const usuario = await leerUsuario(clave);

    if (!usuario) return;

    if (datos.customerId) usuario.stripeCustomerId = datos.customerId;
    if (datos.subscriptionId) {
      usuario.stripeSubscriptionId = datos.subscriptionId;
    }

    await writeFile(
      rutaArchivoUsuario(clave, usuario.rol),
      serializarDatos(usuario),
      "utf8",
    );
  });
}

export async function actualizarPlanContratado(
  clave: string,
  planContratado: string,
  fechaCaducidad: string,
  fechaInicio?: string,
): Promise<void> {
  if (
    clave === CLAVE_ADMIN &&
    detectarPlanUsuario(clave) !== "premium"
  ) {
    await migrarUsuarioAPremium(clave);
  }

  return conBloqueoUsuario(clave, async () => {
    const usuario = await leerUsuario(clave);

    if (!usuario) return;

    if (clave === CLAVE_ADMIN) {
      usuario.rol = "premium";
      delete usuario.fechaDegradacion;
      usuario.planContratado = "ilimitado";
      usuario.fechaInicio =
        fechaInicio || new Date().toISOString();
      usuario.fechaCaducidad = "Sin límite";

      await writeFile(
        rutaArchivoUsuario(clave, "premium"),
        serializarDatos(usuario),
        "utf8",
      );
      return;
    }

    usuario.planContratado = planContratado;
    usuario.fechaCaducidad = fechaCaducidad;
    if (fechaInicio) usuario.fechaInicio = fechaInicio;

    await writeFile(
      rutaArchivoUsuario(clave, usuario.rol),
      serializarDatos(usuario),
      "utf8",
    );
  });
}

/** Prepara el token de verificación de una cuenta que aún no lo confirmó. */
export async function crearVerificacionPendiente(
  clave: string,
): Promise<{ correo: string; token: string } | null> {
  return conBloqueoUsuario(clave, async () => {
    const usuario = await leerUsuario(clave);

    if (!usuario || usuario.emailVerificado) return null;

    const token = usuario.tokenVerificacion || randomUUID();

    usuario.tokenVerificacion = token;
    usuario.tokenVerificacionExpira =
      usuario.tokenVerificacionExpira ||
      Date.now() + 24 * 60 * 60 * 1000;

    await writeFile(
      rutaArchivoUsuario(clave, usuario.rol),
      serializarDatos(usuario),
      "utf8",
    );

    return { correo: usuario.correo, token };
  });
}

/**
 * Se usa cuando Stripe confirma la cancelación de la suscripción.
 */
export async function degradarUsuarioAFreemium(clave: string): Promise<{
  degradado: boolean;
  rol: PlanUsuario;
  mensaje?: string;
}> {
  if (clave === CLAVE_ADMIN) {
    return {
      degradado: false,
      rol: "premium",
      mensaje: "El administrador no puede ser degradado.",
    };
  }

  return conBloqueoUsuario(clave, async () => {
    const usuario = await leerUsuario(clave);

    if (!usuario) {
      throw new Error("Usuario no encontrado.");
    }

    const planActual = detectarPlanUsuario(clave);

    if (planActual === "freemium") {
      return { degradado: false, rol: "freemium" as const };
    }

    if (planActual !== "premium") {
      throw new Error("No se pudo detectar el plan actual del usuario.");
    }

    const origen = rutaCarpetaPlan("premium", clave);
    const destino = rutaCarpetaPlan("freemium", clave);

    if (existsSync(destino)) {
      throw new Error(
        "Ya existe una carpeta Freemium para este usuario.",
      );
    }

    await mkdir(rutaCarpetaRaizPlan("freemium"), { recursive: true });

    try {
      await rename(origen, destino);
    } catch (error) {
      if (!esErrorConCodigo(error, "EXDEV")) {
        throw error;
      }

      await cp(origen, destino, { recursive: true });
      await rm(origen, { recursive: true, force: true });
    }

    usuario.rol = "freemium";
    usuario.fechaDegradacion = new Date().toISOString();
    await writeFile(
      rutaArchivoUsuario(clave, "freemium"),
      serializarDatos(usuario),
      "utf8",
    );

    return { degradado: true, rol: "freemium" as const };
  });
}

/** Borra cuentas Freemium degradadas hace más de 30 días. */
export async function purgarUsuariosFreemiumObsoletos(): Promise<string[]> {
  const raiz = rutaCarpetaRaizPlan("freemium");
  const eliminados: string[] = [];
  const limite = 30 * 24 * 60 * 60 * 1000;

  let entradas;
  try {
    entradas = await readdir(raiz, { withFileTypes: true });
  } catch {
    return [];
  }

  for (const entrada of entradas) {
    if (!entrada.isDirectory()) continue;

    const rutaUsuario = path.join(raiz, entrada.name);
    const rutaDatos = path.join(rutaUsuario, NOMBRE_ARCHIVO);

    try {
      const texto = await readFile(rutaDatos, "utf8");
      const usuario = parsearDatos(texto, "freemium");

      if (!usuario?.fechaDegradacion) continue;

      const fecha = Date.parse(usuario.fechaDegradacion);
      if (!Number.isFinite(fecha) || Date.now() - fecha <= limite) {
        continue;
      }

      await rm(rutaUsuario, { recursive: true, force: true });
      eliminados.push(entrada.name);
    } catch {
      // Usuario ilegible o ya eliminado: se ignora.
    }
  }

  return eliminados;
}

export async function hashearPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verificarPassword(
  passwordIntroducida: string,
  passwordHash: string,
): Promise<boolean> {
  if (!passwordHash) {
    return false;
  }

  if (passwordHash.startsWith("$argon2id$")) {
    try {
      return await argon2.verify(passwordHash, passwordIntroducida);
    } catch {
      return false;
    }
  }

  if (passwordHash.startsWith("$2b$") || passwordHash.startsWith("$2a$") || passwordHash.startsWith("$2y$")) {
    try {
      const resultado = await bcrypt.compare(passwordIntroducida, passwordHash);
      return resultado;
    } catch {
      return false;
    }
  }

  try {
    return await argon2.verify(passwordHash, passwordIntroducida);
  } catch {
    try {
      return await bcrypt.compare(passwordIntroducida, passwordHash);
    } catch {
      return false;
    }
  }
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  return verificarPassword(password, hash);
}

function firmarSesion(clave: string): string {
  const datos = Buffer.from(clave, "utf8").toString("base64url");
  const firma = createHmac("sha256", secretoSesion())
    .update(datos)
    .digest("base64url");

  return `${datos}.${firma}`;
}

function verificarSesion(valor: string | undefined): string | null {
  if (!valor) {
    return null;
  }

  const partes = valor.split(".");

  if (partes.length !== 2) {
    return null;
  }

  const [datos, firma] = partes;

  if (!datos || !firma) {
    return null;
  }

  const firmaEsperada = createHmac("sha256", secretoSesion())
    .update(datos)
    .digest();
  let firmaRecibida: Buffer;

  try {
    firmaRecibida = Buffer.from(firma, "base64url");
  } catch {
    return null;
  }

  if (
    firmaRecibida.length !== firmaEsperada.length ||
    !timingSafeEqual(firmaRecibida, firmaEsperada)
  ) {
    return null;
  }

  const clave = Buffer.from(datos, "base64url").toString("utf8");

  return esClaveUsuarioValida(clave) ? clave : null;
}

export async function crearSesion(clave: string): Promise<void> {
  const store = await cookies();
  const esHttps = await peticionEsHttps();

  store.set(COOKIE_SESION, firmarSesion(clave), {
    httpOnly: true,
    sameSite: "lax",
    secure: esHttps,
    path: "/",
    maxAge: DURACION_SESION_SEGUNDOS,
  });
}

export async function obtenerClaveSesion(): Promise<string | null> {
  const store = await cookies();

  return verificarSesion(store.get(COOKIE_SESION)?.value);
}

export async function eliminarSesion(): Promise<void> {
  const store = await cookies();

  store.delete(COOKIE_SESION);
}

export async function obtenerUsuarioSesion(): Promise<UsuarioRegistrado | null> {
  const clave = await obtenerClaveSesion();

  if (!clave) {
    return null;
  }

  return leerUsuario(clave);
}

export function datosPublicosUsuario(
  usuario: UsuarioRegistrado,
): UsuarioPublico {
  return {
    nombre: usuario.nombre,
    telefono: usuario.telefono,
    correo: usuario.correo,
    clave: usuario.clave,
    rol: usuario.rol,
  };
}

export function nombreCompletoUsuario(
  usuario: UsuarioRegistrado,
): string {
  return (
    usuario.nombreCompleto?.trim() ||
    [usuario.nombre, usuario.apellidos]
      .map((parte) => parte?.trim())
      .filter(Boolean)
      .join(" ")
  );
}
