import { NextResponse } from "next/server";
import { rename, stat, writeFile } from "node:fs/promises";
import {
  crearSesion,
  datosPublicosUsuario,
  esClaveUsuarioValida,
  leerUsuario,
  obtenerClaveSesion,
  rutaArchivoUsuario,
  serializarDatos,
  type UsuarioRegistrado,
} from "@/lib/auth-server";
import { mensajeError } from "@/lib/errores";
import { rutaCarpetaPlan } from "@/lib/rutas-espacio";
import { sanearTexto } from "@/lib/saneamiento";
import {
  buscarPais,
  construirClaveTelefono,
  esNumeroTelefonoValido,
  normalizarCodigoPais,
  normalizarNumeroTelefono,
} from "@/lib/telefono";
import { correoValido, nombreValido } from "@/lib/validacion";

function respuestaError(mensaje: string, estado: number) {
  return NextResponse.json({ error: mensaje }, { status: estado });
}

async function existeRuta(ruta: string): Promise<boolean> {
  try {
    await stat(ruta);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const clave = await obtenerClaveSesion();

  if (!clave) {
    return respuestaError("No autenticado.", 401);
  }

  const usuario = await leerUsuario(clave);

  if (!usuario) {
    return respuestaError("No autenticado.", 401);
  }

  let cuerpo: unknown;

  try {
    cuerpo = await request.json();
  } catch {
    return respuestaError("Solicitud no válida.", 400);
  }

  if (typeof cuerpo !== "object" || cuerpo === null) {
    return respuestaError("Solicitud no válida.", 400);
  }

  const datos = cuerpo as Record<string, unknown>;
  const nombre =
    typeof datos.nombre === "string"
      ? sanearTexto(datos.nombre)
      : "";
  const correo =
    typeof datos.correo === "string"
      ? sanearTexto(datos.correo)
      : "";
  const [codigoActual, numeroActual] = usuario.telefono.split("_");
  const codigo =
    typeof datos.codigo === "string"
      ? normalizarCodigoPais(datos.codigo)
      : codigoActual;
  const numero =
    typeof datos.numero === "string"
      ? normalizarNumeroTelefono(datos.numero)
      : numeroActual;

  if (!nombreValido(nombre)) {
    return respuestaError(
      "El nombre solo puede contener letras y espacios.",
      400,
    );
  }

  if (!correoValido(correo)) {
    return respuestaError(
      "El correo electrónico no es válido.",
      400,
    );
  }

  if (
    !buscarPais(codigo) ||
    !esNumeroTelefonoValido(numero)
  ) {
    return respuestaError(
      "El número de teléfono no es válido.",
      400,
    );
  }

  const nuevaClave = construirClaveTelefono(codigo, numero);

  if (!esClaveUsuarioValida(nuevaClave)) {
    return respuestaError(
      "El número de teléfono no es válido.",
      400,
    );
  }

  const cambiaTelefono = nuevaClave !== usuario.clave;

  if (cambiaTelefono) {
    if (await leerUsuario(nuevaClave)) {
      return respuestaError(
        "Ya existe una cuenta con ese número de teléfono.",
        409,
      );
    }

    const destino = rutaCarpetaPlan(usuario.rol, nuevaClave);

    if (await existeRuta(destino)) {
      return respuestaError(
        "Ya existe una carpeta para ese número de teléfono.",
        409,
      );
    }
  }

  const actualizado: UsuarioRegistrado = {
    ...usuario,
    nombre,
    telefono: nuevaClave,
    clave: nuevaClave,
    correo,
  };

  const origenCarpeta = rutaCarpetaPlan(
    usuario.rol,
    usuario.clave,
  );
  const rutaArchivo = rutaArchivoUsuario(
    nuevaClave,
    usuario.rol,
  );
  let carpetaRenombrada = false;

  try {
    if (cambiaTelefono) {
      await rename(origenCarpeta, rutaCarpetaPlan(usuario.rol, nuevaClave));
      carpetaRenombrada = true;
    }

    await writeFile(
      rutaArchivo,
      serializarDatos(actualizado),
      "utf8",
    );
  } catch (error) {
    if (carpetaRenombrada) {
      try {
        await rename(
          rutaCarpetaPlan(usuario.rol, nuevaClave),
          origenCarpeta,
        );
      } catch {
        // Si la carpeta ya no existe, no hay nada que revertir.
      }
    }

    return respuestaError(
      mensajeError(error) ||
        "No se pudieron guardar los datos del perfil.",
      500,
    );
  }

  if (cambiaTelefono) {
    await crearSesion(nuevaClave);
  }

  return NextResponse.json({
    ok: true,
    usuario: datosPublicosUsuario(actualizado),
    telefonoCambiado: cambiaTelefono,
  });
}
