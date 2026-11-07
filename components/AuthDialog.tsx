"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSesion } from "@/components/SessionProvider";
import ModalSesion from "@/components/ModalSesion";
import PhoneField from "@/components/PhoneField";
import {
  buscarPais,
  esNumeroTelefonoValido,
  normalizarCodigoPais,
  normalizarNumeroTelefono,
} from "@/lib/telefono";
import {
  correoValido,
  validarDocumento,
  limpiarTexto,
  longitudPasswordBytes,
  nombreValido,
  obtenerRequisitosPassword,
  PASSWORD_MAXIMA,
  PASSWORD_MAXIMA_BYTES,
  passwordValida,
} from "@/lib/validacion";
import { CLAVE_EMAIL_VERIFICACION } from "@/lib/verificacion-pago";

export type ModoAuthDialog = "login" | "registro";
type PlanRegistro = "freemium" | "premium";

const OPCIONES_PLAN: Array<{ id: PlanRegistro }> = [
  { id: "freemium" },
  { id: "premium" },
];

type RespuestaApi = {
  error?: unknown;
  ok?: unknown;
  nombre?: unknown;
  rol?: unknown;
  autenticado?: unknown;
  userId?: unknown;
  checkoutPlan?: unknown;
  checkoutToken?: unknown;
};

type RolUsuario = "premium" | "freemium";

function leerError(datos: RespuestaApi, respaldo: string): string {
  return typeof datos.error === "string" ? datos.error : respaldo;
}

function leerNombre(datos: RespuestaApi): string {
  return typeof datos.nombre === "string" ? datos.nombre : "";
}

function leerRol(datos: RespuestaApi): RolUsuario {
  return datos.rol === "freemium" ? "freemium" : "premium";
}

const CLASE_CAMPO =
  "h-12 w-full rounded-xl border border-[var(--th)] bg-[var(--card2)] px-3 text-base text-[var(--txt)] outline-none backdrop-blur-sm placeholder:text-[var(--txt3)] transition-colors focus:border-[var(--azul)] focus:ring-2 focus:ring-[var(--azul)]/30 sm:text-sm";

const CLASE_BOTON_ENVIO =
  "inline-flex h-12 w-full items-center justify-center rounded-xl bg-[var(--azul)] px-4 text-sm font-bold text-[var(--btn-txt)] transition-colors hover:bg-[var(--azul-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45";
function obtenerCookieCSRF(): string {
  if (typeof document === "undefined") return "";
  const valor = document.cookie
    .split("; ")
    .find((fila) => fila.startsWith("csrf-token="));
  return valor ? decodeURIComponent(valor.split("=")[1]) : "";
}

function FormularioRegistro({
  onClose,
  onSesionIniciada,
  planInicial,
}: {
  onClose: () => void;
  onSesionIniciada: (nombre: string, rol?: RolUsuario) => void;
  planInicial?: PlanRegistro;
}) {
  const router = useRouter();
  const t = useTranslations("Auth");
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [codigo, setCodigo] = useState("");
  const [numero, setNumero] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepetida, setPasswordRepetida] = useState("");
  const [plan, setPlan] = useState<PlanRegistro | "">(planInicial ?? "");
  const [duracion, setDuracion] = useState<
    "mensual" | "semestral" | "anual"
  >("mensual");
  const [dni, setDni] = useState("");
  const [calle, setCalle] = useState("");
  const [numeroVia, setNumeroVia] = useState("");
  const [piso, setPiso] = useState("");
  const [letra, setLetra] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [provincia, setProvincia] = useState("");
  const [paisFacturacion, setPaisFacturacion] = useState("España");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/csrf", { credentials: "include" }).catch(() => {});
  }, []);

  const pais = buscarPais(codigo);
  const requisitos = obtenerRequisitosPassword(password);
  const passwordDemasiadoLarga =
    longitudPasswordBytes(password) > PASSWORD_MAXIMA_BYTES;
  const telefonoValido =
    Boolean(pais) && esNumeroTelefonoValido(numero);
  const esPremium = plan === "premium";
  const direccion = [calle, numeroVia, piso, letra]
    .map((parte) => parte.trim())
    .filter(Boolean)
    .join(", ");
  const direccionValida =
    calle.trim().length >= 2 &&
    numeroVia.trim().length >= 1 &&
    direccion.length >= 3 &&
    ciudad.trim().length >= 2 &&
    provincia.trim().length >= 2 &&
    paisFacturacion.trim().length >= 2 &&
    /^[A-Za-z0-9 -]{3,10}$/.test(codigoPostal.trim());
  const formularioValido =
    nombreValido(nombre) &&
    nombreValido(apellidos) &&
    telefonoValido &&
    correoValido(correo) &&
    passwordValida(password) &&
    password === passwordRepetida &&
    plan !== "" &&
    validarDocumento(dni, paisFacturacion) &&
    direccionValida;

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!formularioValido || enviando) {
      return;
    }

    setEnviando(true);
    setError("");

    try {
      const respuesta = await fetch("/api/auth/registro", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": obtenerCookieCSRF(),
        },
        body: JSON.stringify({
          nombre: limpiarTexto(nombre),
          apellidos: limpiarTexto(apellidos),
          codigo: normalizarCodigoPais(codigo),
          numero: normalizarNumeroTelefono(numero),
          correo: correo.trim(),
          password,
          plan,
          duracion: esPremium ? duracion : undefined,
          dni: dni.trim().toUpperCase(),
          direccion,
          ciudad: ciudad.trim(),
          provincia: provincia.trim(),
          pais: paisFacturacion.trim(),
          codigoPostal: codigoPostal.trim(),
        }),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as RespuestaApi;

      if (!respuesta.ok) {
        setError(leerError(datos, t("errors.genericCreate")));
        return;
      }

      if (
        esPremium &&
        typeof datos.userId === "string" &&
        typeof datos.checkoutToken === "string"
      ) {
        const pago = await fetch("/api/stripe/checkout", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: duracion,
            userId: datos.userId,
            token: datos.checkoutToken,
          }),
          cache: "no-store",
        });

        const datosPago = (await pago
          .json()
          .catch(() => ({}))) as {
          url?: unknown;
          error?: unknown;
        };

        if (pago.ok && typeof datosPago.url === "string") {
          try {
            window.sessionStorage.setItem(
              CLAVE_EMAIL_VERIFICACION,
              correo.trim(),
            );
          } catch {
            // Sin sessionStorage se mantiene el aviso sin email.
          }

          window.location.assign(datosPago.url);
          return;
        }

        setError(
          "La cuenta se creó, pero no se pudo iniciar el pago. Revisa tu correo y vuelve a intentarlo.",
        );
        return;
      }

      setError(
        t("errors.emailSent"),
      );
    } catch {
      setError(t("errors.connection"));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <section className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--txt3)]">
          Datos personales
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="registro-nombre"
              className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
            >
              {t("firstNameLabel")}
            </label>

            <input
              id="registro-nombre"
              type="text"
              autoComplete="given-name"
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              placeholder={t("firstNameLabel")}
              maxLength={60}
              autoFocus
              required
              className={CLASE_CAMPO}
            />
          </div>

          <div>
            <label
              htmlFor="registro-apellidos"
              className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
            >
              {t("lastNameLabel")}
            </label>

            <input
              id="registro-apellidos"
              type="text"
              autoComplete="family-name"
              value={apellidos}
              onChange={(evento) => setApellidos(evento.target.value)}
              placeholder={t("lastNameLabel")}
              maxLength={120}
              required
              className={CLASE_CAMPO}
            />
          </div>
        </div>

        <p className="text-xs text-[var(--txt3)]">{t("nameHelp")}</p>

        <div>
          <label
            htmlFor="registro-dni"
            className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
          >
            Documento de Identidad / NIF
          </label>

          <input
            id="registro-dni"
            type="text"
            autoComplete="off"
            value={dni}
            onChange={(evento) => setDni(evento.target.value)}
            maxLength={20}
            placeholder="DNI, NIE, NIF u otro documento"
            required
            className={CLASE_CAMPO}
          />

          {dni.length > 0 &&
          !validarDocumento(dni, paisFacturacion) ? (
            <p className="mt-1 text-xs text-[var(--err-t)]">
              Documento de identidad no válido para el país seleccionado.
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--txt3)]">
          Dirección
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
          <div className="sm:col-span-4">
            <label
              htmlFor="registro-calle"
              className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
            >
              Calle
            </label>

            <input
              id="registro-calle"
              type="text"
              autoComplete="address-line1"
              value={calle}
              onChange={(evento) => setCalle(evento.target.value)}
              maxLength={160}
              required
              className={CLASE_CAMPO}
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="registro-numero-via"
              className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
            >
              Número
            </label>

            <input
              id="registro-numero-via"
              type="text"
              value={numeroVia}
              onChange={(evento) => setNumeroVia(evento.target.value)}
              maxLength={20}
              required
              className={CLASE_CAMPO}
            />
          </div>

          <div className="sm:col-span-3">
            <label
              htmlFor="registro-piso"
              className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
            >
              Piso{" "}
              <span className="font-normal text-[var(--txt3)]">
                (opcional)
              </span>
            </label>

            <input
              id="registro-piso"
              type="text"
              value={piso}
              onChange={(evento) => setPiso(evento.target.value)}
              maxLength={20}
              className={CLASE_CAMPO}
            />
          </div>

          <div className="sm:col-span-3">
            <label
              htmlFor="registro-letra"
              className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
            >
              Letra{" "}
              <span className="font-normal text-[var(--txt3)]">
                (opcional)
              </span>
            </label>

            <input
              id="registro-letra"
              type="text"
              value={letra}
              onChange={(evento) => setLetra(evento.target.value)}
              maxLength={10}
              className={CLASE_CAMPO}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label
              htmlFor="registro-ciudad"
              className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
            >
              Ciudad
            </label>

            <input
              id="registro-ciudad"
              type="text"
              autoComplete="address-level2"
              value={ciudad}
              onChange={(evento) => setCiudad(evento.target.value)}
              maxLength={80}
              required
              className={CLASE_CAMPO}
            />
          </div>

          <div>
            <label
              htmlFor="registro-provincia"
              className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
            >
              Provincia
            </label>

            <input
              id="registro-provincia"
              type="text"
              autoComplete="address-level1"
              value={provincia}
              onChange={(evento) => setProvincia(evento.target.value)}
              maxLength={80}
              required
              className={CLASE_CAMPO}
            />
          </div>

          <div>
            <label
              htmlFor="registro-pais"
              className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
            >
              País
            </label>

            <input
              id="registro-pais"
              type="text"
              autoComplete="country-name"
              value={paisFacturacion}
              onChange={(evento) => setPaisFacturacion(evento.target.value)}
              maxLength={80}
              required
              className={CLASE_CAMPO}
            />
          </div>

          <div>
            <label
              htmlFor="registro-codigo-postal"
              className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
            >
              Código postal
            </label>

            <input
              id="registro-codigo-postal"
              type="text"
              autoComplete="postal-code"
              value={codigoPostal}
              onChange={(evento) => setCodigoPostal(evento.target.value)}
              maxLength={10}
              required
              className={CLASE_CAMPO}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--txt3)]">
          Contacto
        </p>

        <PhoneField
          id="registro-telefono"
          codigo={codigo}
          numero={numero}
          onCambiarCodigo={setCodigo}
          onCambiarNumero={setNumero}
        />

        <div>
          <label
            htmlFor="registro-correo"
            className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
          >
            {t("emailLabel")}
          </label>

          <input
            id="registro-correo"
            type="email"
            autoComplete="email"
            value={correo}
            onChange={(evento) => setCorreo(evento.target.value)}
            placeholder={t("emailPlaceholder")}
            maxLength={254}
            required
            className={CLASE_CAMPO}
          />
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--txt3)]">
          Acceso
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="registro-password"
              className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
            >
              {t("passwordLabel")}
            </label>

            <input
              id="registro-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(evento) => setPassword(evento.target.value)}
              placeholder={t("passwordPlaceholder")}
              maxLength={PASSWORD_MAXIMA}
              required
              className={CLASE_CAMPO}
            />

            <ul
              className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs"
              aria-live="polite"
            >
              {requisitos.map((requisito) => (
                <li
                  key={requisito.id}
                  className={`flex items-center gap-1 ${
                    requisito.cumple
                      ? "text-[var(--ok-t)]"
                      : "text-[var(--txt3)]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      requisito.cumple
                        ? "bg-[var(--ok-t)]"
                        : "bg-[var(--txt3)]"
                    }`}
                    aria-hidden="true"
                  />
                  {t(`requirements.${requisito.id}`)}
                </li>
              ))}
            </ul>

            <p className="mt-1 text-xs text-[var(--txt3)]">
              {t("passwordMax", { max: PASSWORD_MAXIMA })}
            </p>

            {passwordDemasiadoLarga ? (
              <p className="mt-1 text-xs text-[var(--err-t)]">
                {t("passwordTooLong")}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="registro-password-repetida"
              className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
            >
              Repetir contraseña
            </label>

            <input
              id="registro-password-repetida"
              type="password"
              autoComplete="new-password"
              value={passwordRepetida}
              onChange={(evento) =>
                setPasswordRepetida(evento.target.value)
              }
              maxLength={PASSWORD_MAXIMA}
              required
              className={CLASE_CAMPO}
            />

            {passwordRepetida.length > 0 &&
            password !== passwordRepetida ? (
              <p className="mt-1 text-xs text-[var(--err-t)]">
                Las contraseñas no coinciden.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {esPremium ? (
        <div className="rounded-2xl border border-[var(--azul)] bg-[var(--sel)]/40 p-4">
          <label
            htmlFor="registro-duracion"
            className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
          >
            Duración del plan
          </label>

          <select
            id="registro-duracion"
            value={duracion}
            onChange={(evento) =>
              setDuracion(
                evento.target.value as
                  | "mensual"
                  | "semestral"
                  | "anual",
              )
            }
            className={CLASE_CAMPO}
          >
            <option value="mensual">Mensual</option>
            <option value="semestral">Semestral</option>
            <option value="anual">Anual</option>
          </select>
        </div>
      ) : null}

      <fieldset>
        <legend className="mb-2 block text-sm font-semibold text-[var(--txt2)]">
          {t("choosePlan")}
        </legend>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {OPCIONES_PLAN.map((opcion) => {
            const activo = plan === opcion.id;

            return (
              <label
                key={opcion.id}
                className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition-colors focus-within:ring-2 focus-within:ring-[var(--azul)]/40 ${
                  activo
                    ? "border-[var(--azul)] bg-[var(--sel)] ring-2 ring-[var(--azul)]/30"
                    : "border-[var(--th)] bg-[var(--card2)] hover:bg-[var(--suave2)]"
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  value={opcion.id}
                  checked={activo}
                  onChange={() => setPlan(opcion.id)}
                  className="sr-only"
                />

                <span className="flex items-center gap-2 text-sm font-bold text-[var(--txt)]">
                  <span
                    aria-hidden="true"
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      activo
                        ? "border-[var(--azul)]"
                        : "border-[var(--txt3)]"
                    }`}
                  >
                    {activo ? (
                      <span className="h-2 w-2 rounded-full bg-[var(--azul)]" />
                    ) : null}
                  </span>
                  {t(`plans.${opcion.id}.title`)}
                </span>

                <span className="pl-6 text-xs text-[var(--txt3)]">
                  {t(`plans.${opcion.id}.description`)}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-[var(--err-b)] bg-[var(--err)] px-3 py-2 text-sm font-medium text-[var(--err-t)]"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!formularioValido || enviando}
        className={CLASE_BOTON_ENVIO}
      >
        {enviando ? t("submittingRegister") : t("submitRegister")}
      </button>

      {esPremium ? (
        <p className="text-center text-xs leading-relaxed text-[var(--txt3)]">
          {t("premiumVerificationNote")}
        </p>
      ) : null}
    </form>
  );
}

function FormularioLogin({
  onClose,
  onSesionIniciada,
}: {
  onClose: () => void;
  onSesionIniciada: (nombre: string, rol?: RolUsuario) => void;
}) {
  const router = useRouter();
  const t = useTranslations("Auth");
  const [codigo, setCodigo] = useState("");
  const [numero, setNumero] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/csrf", { credentials: "include" }).catch(() => {});
  }, []);

  const pais = buscarPais(codigo);
  const telefonoValido =
    Boolean(pais) && esNumeroTelefonoValido(numero);
  const passwordDemasiadoLarga =
    longitudPasswordBytes(password) > PASSWORD_MAXIMA_BYTES;
  const formularioValido =
    telefonoValido && password.length > 0 && !passwordDemasiadoLarga;

  async function iniciar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!formularioValido || enviando) {
      return;
    }

    setEnviando(true);
    setError("");

    try {
      const respuesta = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": obtenerCookieCSRF(),
        },
        body: JSON.stringify({
          codigo: normalizarCodigoPais(codigo),
          numero: normalizarNumeroTelefono(numero),
          password,
        }),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as RespuestaApi;

      if (!respuesta.ok) {
        const errorMsg = leerError(datos, t("errors.invalidCredentials"));
        if (respuesta.status === 403) {
          setError(
            t("errors.verifyEmail"),
          );
          return;
        }
        setError(errorMsg);
        return;
      }

      onSesionIniciada(leerNombre(datos), leerRol(datos));
      onClose();
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("errors.connection"));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={iniciar} className="space-y-4" noValidate>
      <PhoneField
        id="login-telefono"
        codigo={codigo}
        numero={numero}
        onCambiarCodigo={setCodigo}
        onCambiarNumero={setNumero}
        autoFocus
      />

      <div>
        <label
          htmlFor="login-password"
          className="mb-2 block text-sm font-semibold text-[var(--txt2)]"
        >
          {t("passwordLabel")}
        </label>

        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(evento) => setPassword(evento.target.value)}
          placeholder={t("loginPasswordPlaceholder")}
          maxLength={PASSWORD_MAXIMA}
          className={CLASE_CAMPO}
        />

        {passwordDemasiadoLarga ? (
          <p className="mt-2 text-xs text-[var(--err-t)]">
            {t("passwordTooLong")}
          </p>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-[var(--err-b)] bg-[var(--err)] px-3 py-2 text-sm font-medium text-[var(--err-t)]"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!formularioValido || enviando}
        className={CLASE_BOTON_ENVIO}
      >
        {enviando ? t("submittingLogin") : t("submitLogin")}
      </button>

      <p className="text-center text-sm">
        <Link
          href="/forgot-password"
          className="font-semibold text-[var(--azul)] underline underline-offset-2 hover:text-[var(--azul-hover)]"
        >
          {t("forgotPassword")}
        </Link>
      </p>
    </form>
  );
}
type AuthDialogProps = {
  modo: ModoAuthDialog;
  onClose: () => void;
  onCambiarModo: (modo: ModoAuthDialog) => void;
  verificado?: boolean;
  tokenInvalido?: boolean;
  planInicial?: PlanRegistro;
};

export default function AuthDialog({
  modo,
  onClose,
  onCambiarModo,
  verificado,
  tokenInvalido,
  planInicial,
}: AuthDialogProps) {
  const tAuth = useTranslations("Auth");
  const { iniciarSesion } = useSesion();

  if (modo === "login") {
    return (
      <ModalSesion titulo={tAuth("loginTitle")} onClose={onClose}>
        {verificado ? (
          <div className="mb-4 rounded-xl border border-[var(--ok-b)] bg-[var(--ok)] px-3 py-2 text-sm font-medium text-[var(--ok-t)]">
            {tAuth("verified")}
          </div>
        ) : null}
        {tokenInvalido ? (
          <div className="mb-4 rounded-xl border border-[var(--err-b)] bg-[var(--err)] px-3 py-2 text-sm font-medium text-[var(--err-t)]">
            {tAuth("tokenInvalid")}
          </div>
        ) : null}
        <FormularioLogin
          onClose={onClose}
          onSesionIniciada={iniciarSesion}
        />
        <p className="mt-4 text-center text-sm text-[var(--txt3)]">
          {tAuth("noAccount")}{" "}
          <button
            type="button"
            onClick={() => onCambiarModo("registro")}
            className="font-semibold text-[var(--azul)] underline underline-offset-2"
          >
            {tAuth("registerLink")}
          </button>
        </p>
      </ModalSesion>
    );
  }

  return (
    <ModalSesion titulo={tAuth("registerTitle")} onClose={onClose}>
      <FormularioRegistro
        onClose={onClose}
        onSesionIniciada={iniciarSesion}
        planInicial={planInicial}
      />
      <p className="mt-4 text-center text-sm text-[var(--txt3)]">
        {tAuth("hasAccount")}{" "}
        <button
          type="button"
          onClick={() => onCambiarModo("login")}
          className="font-semibold text-[var(--azul)] underline underline-offset-2"
        >
          {tAuth("loginLink")}
        </button>
      </p>
    </ModalSesion>
  );
}
