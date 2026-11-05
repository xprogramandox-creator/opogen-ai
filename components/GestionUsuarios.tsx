"use client";

import { useState } from "react";
import { Search, UserCog, X } from "lucide-react";

type FormularioUsuario = {
  nombre: string;
  apellidos: string;
  correo: string;
  telefono: string;
  rol: "premium" | "freemium";
  plan: string;
};

const FORMULARIO_VACIO: FormularioUsuario = {
  nombre: "",
  apellidos: "",
  correo: "",
  telefono: "",
  rol: "freemium",
  plan: "mensual",
};

const CLASE_CAMPO =
  "w-full rounded-xl border border-[var(--th)] bg-[var(--card2)] px-3 py-2 text-sm font-medium text-[var(--txt)] outline-none transition-colors focus:border-[var(--azul)] focus:ring-2 focus:ring-[var(--azul)]/30";

export default function GestionUsuarios() {
  const [abierto, setAbierto] = useState(false);
  const [telefonoBusqueda, setTelefonoBusqueda] = useState("");
  const [formulario, setFormulario] =
    useState<FormularioUsuario>(FORMULARIO_VACIO);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [exito, setExito] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  function abrir(): void {
    setAbierto(true);
    setError("");
    setMensaje("");
    setExito("");
  }

  function cerrar(): void {
    setAbierto(false);
    setError("");
    setMensaje("");
    setExito("");
  }

  async function buscar(
    evento: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    evento.preventDefault();
    setError("");
    setMensaje("");
    setExito("");

    const telefono = telefonoBusqueda.trim();

    if (!/^\d{1,4}_\d{4,15}$/.test(telefono)) {
      setError("Usa el formato 34_600000000.");
      return;
    }

    setBuscando(true);

    try {
      const respuesta = await fetch(
        `/api/admin/buscar-usuario?telefono=${encodeURIComponent(telefono)}`,
        {
          credentials: "include",
          cache: "no-store",
        },
      );
      const datos = (await respuesta.json().catch(() => ({}))) as {
        usuario?: {
          clave?: unknown;
          nombre?: unknown;
          apellidos?: unknown;
          correo?: unknown;
          rol?: unknown;
          planContratado?: unknown;
        };
        error?: unknown;
      };

      if (!respuesta.ok || !datos.usuario) {
        setError(
          typeof datos.error === "string"
            ? datos.error
            : "Usuario no encontrado",
        );
        return;
      }

      const encontrado = datos.usuario;

      setFormulario({
        nombre:
          typeof encontrado.nombre === "string"
            ? encontrado.nombre
            : "",
        apellidos:
          typeof encontrado.apellidos === "string"
            ? encontrado.apellidos
            : "",
        correo:
          typeof encontrado.correo === "string"
            ? encontrado.correo
            : "",
        telefono:
          typeof encontrado.clave === "string"
            ? encontrado.clave
            : telefono,
        rol: encontrado.rol === "premium" ? "premium" : "freemium",
        plan:
          typeof encontrado.planContratado === "string" &&
          encontrado.planContratado
            ? encontrado.planContratado
            : "mensual",
      });
      setMensaje("Usuario cargado correctamente.");
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setBuscando(false);
    }
  }

  async function modificar(
    evento: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    evento.preventDefault();
    setError("");
    setMensaje("");
    setExito("");

    if (!formulario.telefono) {
      setError("Busca primero un usuario por su teléfono.");
      return;
    }

    setGuardando(true);

    try {
      const respuesta = await fetch("/api/admin/actualizar-usuario", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefonoOriginal: formulario.telefono,
          nombre: formulario.nombre,
          apellidos: formulario.apellidos,
          correo: formulario.correo,
          rol: formulario.rol,
          plan: formulario.plan,
        }),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as {
        mensaje?: unknown;
        error?: unknown;
      };

      if (!respuesta.ok) {
        setError(
          typeof datos.error === "string"
            ? datos.error
            : "No se pudo actualizar el usuario.",
        );
        return;
      }

      setExito(
        typeof datos.mensaje === "string"
          ? datos.mensaje
          : "Usuario actualizado correctamente",
      );
      setFormulario(FORMULARIO_VACIO);
      setTelefonoBusqueda("");
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="inline-flex items-center gap-2 rounded-xl border border-[var(--azul)] bg-[var(--card)] px-4 py-2 text-sm font-bold text-[var(--azul)] shadow-sm transition-colors hover:bg-[var(--sel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)]"
      >
        <UserCog className="h-4 w-4" aria-hidden="true" />
        Gestión de Usuarios
      </button>

      {abierto ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) cerrar();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="gestion-usuarios-titulo"
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[var(--th)] bg-[var(--card)] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="gestion-usuarios-titulo"
                  className="text-2xl font-bold text-[var(--txt)]"
                >
                  Gestión de Usuarios
                </h2>
                <p className="mt-1 text-sm text-[var(--txt3)]">
                  Busca un usuario por teléfono y modifica sus datos.
                </p>
              </div>

              <button
                type="button"
                onClick={cerrar}
                aria-label="Cerrar gestión de usuarios"
                className="rounded-full border border-[var(--th)] p-2 text-[var(--txt2)] transition-colors hover:bg-[var(--suave2)]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <form
              onSubmit={buscar}
              className="mt-6 flex flex-col gap-2 sm:flex-row"
            >
              <label htmlFor="gestion-telefono" className="sr-only">
                Teléfono del usuario
              </label>
              <input
                id="gestion-telefono"
                type="text"
                value={telefonoBusqueda}
                onChange={(evento) =>
                  setTelefonoBusqueda(evento.target.value)
                }
                placeholder="34_600000000"
                className={CLASE_CAMPO}
                autoFocus
              />
              <button
                type="submit"
                disabled={buscando}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--azul)] px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--azul-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                {buscando ? "Buscando..." : "Buscar"}
              </button>
            </form>

            <form
              onSubmit={modificar}
              className="mt-6 grid gap-4 sm:grid-cols-2"
            >
              <div>
                <label
                  htmlFor="gestion-nombre"
                  className="mb-1 block text-sm font-bold text-[var(--txt2)]"
                >
                  Nombre
                </label>
                <input
                  id="gestion-nombre"
                  value={formulario.nombre}
                  onChange={(evento) =>
                    setFormulario({
                      ...formulario,
                      nombre: evento.target.value,
                    })
                  }
                  className={CLASE_CAMPO}
                />
              </div>

              <div>
                <label
                  htmlFor="gestion-apellidos"
                  className="mb-1 block text-sm font-bold text-[var(--txt2)]"
                >
                  Apellidos
                </label>
                <input
                  id="gestion-apellidos"
                  value={formulario.apellidos}
                  onChange={(evento) =>
                    setFormulario({
                      ...formulario,
                      apellidos: evento.target.value,
                    })
                  }
                  className={CLASE_CAMPO}
                />
              </div>

              <div>
                <label
                  htmlFor="gestion-correo"
                  className="mb-1 block text-sm font-bold text-[var(--txt2)]"
                >
                  Correo
                </label>
                <input
                  id="gestion-correo"
                  type="email"
                  value={formulario.correo}
                  onChange={(evento) =>
                    setFormulario({
                      ...formulario,
                      correo: evento.target.value,
                    })
                  }
                  className={CLASE_CAMPO}
                />
              </div>

              <div>
                <label
                  htmlFor="gestion-telefono-form"
                  className="mb-1 block text-sm font-bold text-[var(--txt2)]"
                >
                  Teléfono
                </label>
                <input
                  id="gestion-telefono-form"
                  value={formulario.telefono}
                  readOnly
                  className={`${CLASE_CAMPO} cursor-not-allowed opacity-70`}
                />
              </div>

              <div>
                <label
                  htmlFor="gestion-rol"
                  className="mb-1 block text-sm font-bold text-[var(--txt2)]"
                >
                  Rol
                </label>
                <select
                  id="gestion-rol"
                  value={formulario.rol}
                  onChange={(evento) =>
                    setFormulario({
                      ...formulario,
                      rol: evento.target.value as
                        | "premium"
                        | "freemium",
                    })
                  }
                  className={CLASE_CAMPO}
                >
                  <option value="premium">Premium</option>
                  <option value="freemium">Freemium</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="gestion-plan"
                  className="mb-1 block text-sm font-bold text-[var(--txt2)]"
                >
                  Plan
                </label>
                <select
                  id="gestion-plan"
                  value={formulario.plan}
                  onChange={(evento) =>
                    setFormulario({
                      ...formulario,
                      plan: evento.target.value,
                    })
                  }
                  className={CLASE_CAMPO}
                >
                  <option value="mensual">Mensual</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                  <option value="ilimitado">Ilimitado</option>
                </select>
              </div>

              {error ? (
                <p
                  role="alert"
                  className="sm:col-span-2 text-sm font-medium text-[var(--err-t)]"
                >
                  {error}
                </p>
              ) : null}

              {mensaje ? (
                <p
                  role="status"
                  className="sm:col-span-2 text-sm font-medium text-[var(--txt3)]"
                >
                  {mensaje}
                </p>
              ) : null}

              {exito ? (
                <p
                  role="status"
                  className="sm:col-span-2 text-sm font-bold text-[var(--ok-t)]"
                >
                  {exito}
                </p>
              ) : null}

              <div className="flex flex-wrap justify-end gap-3 sm:col-span-2">
                <button
                  type="submit"
                  disabled={guardando}
                  className="rounded-xl bg-[var(--azul)] px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--azul-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {guardando ? "Guardando..." : "Modificar"}
                </button>
                <button
                  type="button"
                  onClick={cerrar}
                  className="rounded-xl border border-[var(--th)] px-5 py-2 text-sm font-bold text-[var(--txt2)] transition-colors hover:bg-[var(--suave2)]"
                >
                  Cerrar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
