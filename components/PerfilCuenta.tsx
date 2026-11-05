"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  KeyRound,
  Pencil,
  Save,
  X,
} from "lucide-react";
import PhoneField from "@/components/PhoneField";
import type { UsuarioPublico } from "@/lib/auth-server";
import {
  formatearTelefono,
} from "@/lib/telefono";
import {
  correoValido,
  nombreValido,
  obtenerRequisitosPassword,
  PASSWORD_MAXIMA,
  passwordValida,
} from "@/lib/validacion";

const CLASE_INPUT =
  "h-12 w-full rounded-xl border border-[var(--th)] bg-[var(--card2)] px-3 text-base text-[var(--txt)] outline-none backdrop-blur-sm placeholder:text-[var(--txt3)] transition-colors focus:border-[var(--azul)] focus:ring-2 focus:ring-[var(--azul)]/30 disabled:cursor-not-allowed disabled:opacity-65 sm:text-sm";

const CLASE_BOTON =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] disabled:cursor-not-allowed disabled:opacity-50";

type Mensaje = {
  tipo: "ok" | "error";
  texto: string;
};

export default function PerfilCuenta({
  usuario,
}: {
  usuario: UsuarioPublico;
}) {
  const router = useRouter();
  const [codigoInicial, numeroInicial] = usuario.telefono.split("_");

  const [guardado, setGuardado] = useState({
    nombre: usuario.nombre,
    codigo: codigoInicial ?? "",
    numero: numeroInicial ?? "",
    correo: usuario.correo,
  });

  const [nombre, setNombre] = useState(guardado.nombre);
  const [codigo, setCodigo] = useState(guardado.codigo);
  const [numero, setNumero] = useState(guardado.numero);
  const [correo, setCorreo] = useState(guardado.correo);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensajePerfil, setMensajePerfil] = useState<Mensaje | null>(
    null,
  );

  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [guardandoPassword, setGuardandoPassword] = useState(false);
  const [mensajePassword, setMensajePassword] =
    useState<Mensaje | null>(null);

  const requisitos = obtenerRequisitosPassword(nueva);
  const formularioValido =
    nombreValido(nombre) &&
    correoValido(correo) &&
    codigo.length > 0 &&
    numero.length >= 4;

  const passwordValidaFormulario =
    passwordValida(nueva) && nueva === repetir;

  function empezarEdicion(): void {
    setNombre(guardado.nombre);
    setCodigo(guardado.codigo);
    setNumero(guardado.numero);
    setCorreo(guardado.correo);
    setMensajePerfil(null);
    setEditando(true);
  }

  function cancelarEdicion(): void {
    setNombre(guardado.nombre);
    setCodigo(guardado.codigo);
    setNumero(guardado.numero);
    setCorreo(guardado.correo);
    setEditando(false);
    setMensajePerfil(null);
  }

  async function guardarPerfil(
    evento: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    evento.preventDefault();

    if (!formularioValido || guardando) {
      return;
    }

    setGuardando(true);
    setMensajePerfil(null);

    try {
      const respuesta = await fetch("/api/auth/actualizar-perfil", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, codigo, numero, correo }),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as {
        error?: unknown;
        usuario?: {
          nombre?: string;
          telefono?: string;
          correo?: string;
        };
      };

      if (!respuesta.ok) {
        setMensajePerfil({
          tipo: "error",
          texto:
            typeof datos.error === "string"
              ? datos.error
              : "No se pudieron guardar los datos.",
        });
        return;
      }

      const nombreFinal = datos.usuario?.nombre ?? nombre;
      const telefonoFinal =
        datos.usuario?.telefono ?? `${codigo}_${numero}`;
      const correoFinal = datos.usuario?.correo ?? correo;
      const [codigoFinal, numeroFinal] = telefonoFinal.split("_");

      setGuardado({
        nombre: nombreFinal,
        codigo: codigoFinal ?? codigo,
        numero: numeroFinal ?? numero,
        correo: correoFinal,
      });
      setNombre(nombreFinal);
      setCodigo(codigoFinal ?? codigo);
      setNumero(numeroFinal ?? numero);
      setCorreo(correoFinal);
      setEditando(false);
      setMensajePerfil({
        tipo: "ok",
        texto: "Datos actualizados correctamente.",
      });
      router.refresh();
    } catch {
      setMensajePerfil({
        tipo: "error",
        texto: "No se pudo conectar con el servidor.",
      });
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarPassword(
    evento: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    evento.preventDefault();

    if (!passwordValidaFormulario || guardandoPassword) {
      return;
    }

    setGuardandoPassword(true);
    setMensajePassword(null);

    try {
      const respuesta = await fetch("/api/auth/cambiar-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual, nueva }),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as {
        error?: unknown;
      };

      if (!respuesta.ok) {
        setMensajePassword({
          tipo: "error",
          texto:
            typeof datos.error === "string"
              ? datos.error
              : "No se pudo cambiar la contraseña.",
        });
        return;
      }

      setActual("");
      setNueva("");
      setRepetir("");
      setMensajePassword({
        tipo: "ok",
        texto: "Contraseña cambiada correctamente.",
      });
    } catch {
      setMensajePassword({
        tipo: "error",
        texto: "No se pudo conectar con el servidor.",
      });
    } finally {
      setGuardandoPassword(false);
    }
  }

  return (
    <main id="contenido" className="bg-app min-h-app font-sans">
      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16 lg:py-20">
        <div className="card relative rounded-3xl p-6 sm:p-8">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            aria-label="Cerrar"
            title="Cerrar"
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--th)] bg-[var(--card2)] text-[var(--txt)] transition-colors hover:bg-[var(--suave)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)]"
          >
            <X className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          </button>

          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--ok-b)] bg-[var(--ok)] px-3 py-1.5 text-xs font-bold text-[var(--ok-t)]">
            <span
              className="h-1.5 w-1.5 rounded-full bg-[var(--ok-t)]"
              aria-hidden="true"
            />
            Sesión iniciada
          </p>

          <h1 className="text-balance pr-10 text-3xl font-bold tracking-tight text-[var(--txt)] sm:text-4xl">
            Hola, {guardado.nombre}
          </h1>

          <p className="mt-3 text-pretty leading-relaxed text-[var(--txt2)]">
            Estos son los datos guardados en tu perfil. Puedes modificarlos o
            cambiar tu contraseña.
          </p>

          {mensajePerfil ? (
            <div
              role={mensajePerfil.tipo === "error" ? "alert" : "status"}
              className={`mt-5 rounded-xl border px-4 py-3 text-sm font-medium ${
                mensajePerfil.tipo === "ok"
                  ? "border-[var(--ok-b)] bg-[var(--ok)] text-[var(--ok-t)]"
                  : "border-[var(--err-b)] bg-[var(--err)] text-[var(--err-t)]"
              }`}
            >
              {mensajePerfil.texto}
            </div>
          ) : null}

          <form
            onSubmit={guardarPerfil}
            className="mt-6 space-y-4"
            autoComplete="off"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="perfil-nombre"
                  className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
                >
                  Nombre
                </label>
                <input
                  id="perfil-nombre"
                  name="perfil-nombre"
                  type="text"
                  autoComplete="off"
                  value={nombre}
                  onChange={(evento) => setNombre(evento.target.value)}
                  disabled={!editando}
                  maxLength={120}
                  className={CLASE_INPUT}
                />
              </div>

              <div>
                <label
                  htmlFor="perfil-correo"
                  className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
                >
                  Correo electrónico
                </label>
                <input
                  id="perfil-correo"
                  name="perfil-correo"
                  type="email"
                  autoComplete="off"
                  value={correo}
                  onChange={(evento) => setCorreo(evento.target.value)}
                  disabled={!editando}
                  maxLength={254}
                  className={CLASE_INPUT}
                />
              </div>
            </div>

            {editando ? (
              <PhoneField
                id="perfil-telefono"
                codigo={codigo}
                numero={numero}
                onCambiarCodigo={setCodigo}
                onCambiarNumero={setNumero}
                autoComplete="off"
              />
            ) : (
              <div>
                <label
                  htmlFor="perfil-telefono"
                  className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
                >
                  Teléfono
                </label>
                <input
                  id="perfil-telefono"
                  name="perfil-telefono"
                  type="text"
                  autoComplete="off"
                  value={formatearTelefono(guardado.codigo, guardado.numero)}
                  disabled
                  className={CLASE_INPUT}
                />
              </div>
            )}

            {editando ? (
              <p className="rounded-xl border border-[var(--ambar-b)] bg-[var(--ambar)] p-3 text-sm font-medium text-[var(--ambar-t)]">
                Recuerda que tu número de teléfono es tu nombre de usuario para
                iniciar sesión. Si lo cambias, deberás usar el nuevo número la
                próxima vez.
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {editando ? (
                <>
                  <button
                    type="submit"
                    disabled={!formularioValido || guardando}
                    className={`${CLASE_BOTON} bg-[var(--azul)] text-[var(--btn-txt)] hover:bg-[var(--azul-hover)]`}
                  >
                    <Save className="h-4 w-4" aria-hidden="true" />
                    {guardando ? "Guardando..." : "Enviar"}
                  </button>

                  <button
                    type="button"
                    onClick={cancelarEdicion}
                    disabled={guardando}
                    className={`${CLASE_BOTON} border border-[var(--th)] bg-[var(--card2)] text-[var(--txt)] hover:bg-[var(--suave2)]`}
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={empezarEdicion}
                  className={`${CLASE_BOTON} bg-[var(--azul)] text-[var(--btn-txt)] hover:bg-[var(--azul-hover)]`}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Modificar
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setMostrarPassword((visible) => !visible);
                  setMensajePassword(null);
                }}
                className={`${CLASE_BOTON} border border-[var(--th)] bg-[var(--card2)] text-[var(--txt)] hover:bg-[var(--suave2)]`}
              >
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                Cambiar contraseña
              </button>
            </div>
          </form>

          {mostrarPassword ? (
            <section
              aria-label="Cambiar contraseña"
              className="mt-6 rounded-2xl border border-[var(--th)] bg-[var(--card2)] p-4 sm:p-5"
            >
              <h2 className="text-lg font-bold text-[var(--txt)]">
                Cambiar contraseña
              </h2>
              <p className="mt-1 text-sm text-[var(--txt3)]">
                Introduce tu contraseña actual y la nueva contraseña.
              </p>

              {mensajePassword ? (
                <div
                  role={
                    mensajePassword.tipo === "error" ? "alert" : "status"
                  }
                  className={`mt-4 rounded-xl border px-4 py-3 text-sm font-medium ${
                    mensajePassword.tipo === "ok"
                      ? "border-[var(--ok-b)] bg-[var(--ok)] text-[var(--ok-t)]"
                      : "border-[var(--err-b)] bg-[var(--err)] text-[var(--err-t)]"
                  }`}
                >
                  {mensajePassword.texto}
                </div>
              ) : null}

              <form
                onSubmit={cambiarPassword}
                className="mt-4 space-y-4"
                noValidate
              >
                <div>
                  <label
                    htmlFor="password-actual"
                    className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
                  >
                    Contraseña actual
                  </label>
                  <input
                    id="password-actual"
                    type="password"
                    autoComplete="current-password"
                    value={actual}
                    onChange={(evento) => setActual(evento.target.value)}
                    className={CLASE_INPUT}
                  />
                </div>

                <div>
                  <label
                    htmlFor="password-nueva"
                    className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
                  >
                    Nueva contraseña
                  </label>
                  <input
                    id="password-nueva"
                    type="password"
                    autoComplete="new-password"
                    value={nueva}
                    onChange={(evento) => setNueva(evento.target.value)}
                    maxLength={PASSWORD_MAXIMA}
                    className={CLASE_INPUT}
                  />

                  <ul className="mt-2 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                    {requisitos.map((requisito) => (
                      <li
                        key={requisito.id}
                        className={`flex items-center gap-1.5 ${
                          requisito.cumple
                            ? "text-[var(--ok-t)]"
                            : "text-[var(--txt3)]"
                        }`}
                      >
                        <Check
                          className="h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        {requisito.etiqueta}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <label
                    htmlFor="password-repetir"
                    className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
                  >
                    Repetir nueva contraseña
                  </label>
                  <input
                    id="password-repetir"
                    type="password"
                    autoComplete="new-password"
                    value={repetir}
                    onChange={(evento) => setRepetir(evento.target.value)}
                    maxLength={PASSWORD_MAXIMA}
                    className={CLASE_INPUT}
                  />
                  {repetir.length > 0 && repetir !== nueva ? (
                    <p className="mt-1 text-xs text-[var(--err-t)]">
                      Las contraseñas no coinciden.
                    </p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={
                    !passwordValidaFormulario ||
                    !actual ||
                    guardandoPassword
                  }
                  className={`${CLASE_BOTON} bg-[var(--azul)] text-[var(--btn-txt)] hover:bg-[var(--azul-hover)]`}
                >
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                  {guardandoPassword
                    ? "Cambiando..."
                    : "Guardar nueva contraseña"}
                </button>
              </form>
            </section>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-[var(--th)] pt-6">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="btn-action btn-examen"
            >
              Cerrar
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
