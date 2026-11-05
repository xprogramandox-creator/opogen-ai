import { NextResponse } from "next/server";
import { writeFile } from "node:fs/promises";
import {
  buscarUsuarioPorCorreo,
  degradarUsuarioAFreemium,
  esClaveUsuarioValida,
  leerUsuario,
  migrarUsuarioAPremium,
  rutaArchivoUsuario,
  serializarDatos,
} from "@/lib/auth-server";
import { esPeticionAdmin } from "@/lib/admin-auth";
import { CLAVE_ADMIN } from "@/lib/planes";
import { correoValido, nombreValido } from "@/lib/validacion";

const PLANES_VALIDOS = ["mensual", "semestral", "anual", "ilimitado"] as const;

export async function POST(request: Request) {
  if (!(await esPeticionAdmin(request))) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401 },
    );
  }

  const cuerpo: unknown = await request.json().catch(() => null);

  if (!cuerpo || typeof cuerpo !== "object") {
    return NextResponse.json(
      { error: "Solicitud no válida." },
      { status: 400 },
    );
  }

  const datos = cuerpo as Record<string, unknown>;
  const telefonoOriginal =
    typeof datos.telefonoOriginal === "string"
      ? datos.telefonoOriginal.trim()
      : "";
  const nombre =
    typeof datos.nombre === "string" ? datos.nombre.trim() : "";
  const apellidos =
    typeof datos.apellidos === "string" ? datos.apellidos.trim() : "";
  const correo =
    typeof datos.correo === "string" ? datos.correo.trim() : "";

  if (datos.rol !== "premium" && datos.rol !== "freemium") {
    return NextResponse.json(
      { error: "El rol no es válido." },
      { status: 400 },
    );
  }

  const rolSolicitado = datos.rol;
  const planSolicitado =
    typeof datos.plan === "string" ? datos.plan.trim() : "";

  if (!telefonoOriginal || !esClaveUsuarioValida(telefonoOriginal)) {
    return NextResponse.json(
      { error: "Teléfono no válido." },
      { status: 400 },
    );
  }

  if (!nombreValido(nombre)) {
    return NextResponse.json(
      { error: "El nombre no es válido." },
      { status: 400 },
    );
  }

  if (apellidos && !nombreValido(apellidos)) {
    return NextResponse.json(
      { error: "Los apellidos no son válidos." },
      { status: 400 },
    );
  }

  if (!correoValido(correo)) {
    return NextResponse.json(
      { error: "El correo no es válido." },
      { status: 400 },
    );
  }

  if (
    planSolicitado &&
    !PLANES_VALIDOS.includes(
      planSolicitado as (typeof PLANES_VALIDOS)[number],
    )
  ) {
    return NextResponse.json(
      { error: "El plan no es válido." },
      { status: 400 },
    );
  }

  let usuario = await leerUsuario(telefonoOriginal);

  if (!usuario) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404 },
    );
  }

  const usuarioConCorreo = await buscarUsuarioPorCorreo(correo);

  if (
    usuarioConCorreo &&
    usuarioConCorreo.usuario.clave !== telefonoOriginal
  ) {
    return NextResponse.json(
      { error: "El correo ya pertenece a otro usuario." },
      { status: 409 },
    );
  }

  const esAdmin = telefonoOriginal === CLAVE_ADMIN;
  const rolFinal = esAdmin ? "premium" : rolSolicitado;

  if (esAdmin === false && usuario.rol !== rolFinal) {
    if (rolFinal === "premium") {
      await migrarUsuarioAPremium(telefonoOriginal);
    } else {
      await degradarUsuarioAFreemium(telefonoOriginal);
    }

    usuario = await leerUsuario(telefonoOriginal);

    if (!usuario) {
      return NextResponse.json(
        { error: "No se pudo actualizar el usuario." },
        { status: 500 },
      );
    }
  }

  if (esAdmin && usuario.rol !== "premium") {
    await migrarUsuarioAPremium(telefonoOriginal);
    usuario = await leerUsuario(telefonoOriginal);
  }

  if (!usuario) {
    return NextResponse.json(
      { error: "No se pudo actualizar el usuario." },
      { status: 500 },
    );
  }

  usuario.nombre = nombre;
  usuario.apellidos = apellidos || undefined;
  usuario.correo = correo;
  usuario.rol = rolFinal;

  if (esAdmin) {
    usuario.planContratado = "ilimitado";
    usuario.fechaCaducidad = "Sin límite";
  } else if (rolFinal === "premium") {
    usuario.planContratado =
      planSolicitado || usuario.planContratado || "mensual";
  } else {
    usuario.planContratado = undefined;
    usuario.fechaInicio = undefined;
    usuario.fechaCaducidad = undefined;
  }

  await writeFile(
    rutaArchivoUsuario(telefonoOriginal, rolFinal),
    serializarDatos(usuario),
    "utf8",
  );

  return NextResponse.json(
    {
      ok: true,
      mensaje: "Usuario actualizado correctamente",
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
