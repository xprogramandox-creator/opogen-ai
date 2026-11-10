"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  BarChart3,
  BadgePercent,
  Download,
  FileText,
  MailWarning,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";

type UsuarioAdmin = {
  clave: string;
  nombre: string;
  apellidos: string;
  correo: string;
  telefono: string;
  rol: "freemium" | "premium";
  plan: string;
  emailVerificado: boolean;
  fechaRegistro: string;
  fechaPago: string | null;
  fechaCaducidad: string | null;
  precioBase: number;
  iva: number;
  total: number;
  estado: string;
};

type Pago = {
  id: number;
  usuarioClave: string;
  usuarioNombre: string;
  fecha: string;
  concepto: string;
  plan: string;
  precioBase: number;
  iva: number;
  total: number;
};

type Resumen = {
  usuariosTotales: number;
  free: number;
  premium: number;
  nuevosDia: number;
  nuevosSemana: number;
  nuevosMes: number;
  nuevosAno: number;
  noRenovados: number;
  gananciasDia: number;
  gananciasSemana: number;
  gananciasMes: number;
  gananciasAno: number;
  ivaDia: number;
  ivaSemana: number;
  ivaMes: number;
  ivaAno: number;
  proximos7: number;
  proximos15: number;
  proximos30: number;
};

type EstadoIA = {
  deepseek: {
    disponible: boolean;
    saldo?: number;
    moneda?: string;
    saldos?: Array<{ moneda: string; saldo: number }>;
    codigo?: string;
    error?: string;
  };
  gemini: {
    estado: "ok" | "error";
    detalle?: string;
  };
  actualizadoEn?: string;
};

type UsuarioActivo = {
  clave: string;
  nombre: string;
  ultimaActividad: string;
};

type AnaliticaAdmin = {
  activos: {
    premium: UsuarioActivo[];
    freemium: UsuarioActivo[];
    invitados: number;
  };
  accesos: {
    dia: string;
    premium: number;
    freemium: number;
    invitados: number;
  };
};

type PendienteVerificacion = {
  clave: string;
  nombre: string;
  telefono: string;
  correo: string;
  fechaRegistro: string;
  rol: "freemium" | "premium";
  plan: string;
  origen: "pendiente" | "archivo";
};

type DescuentoAdmin = {
  promotionCodeId: string;
  codigo: string;
  descuento: string;
  fechaInicio: string;
  fechaFin: string | null;
  estado: "Activo" | "Programado" | "Caducado" | "Inactivo";
  usos: number;
};

const FORM_VACIO = {
  claveOriginal: "",
  nombre: "",
  apellidos: "",
  correo: "",
  telefono: "",
  rol: "freemium" as "freemium" | "premium",
  plan: "",
  password: "",
  precioBase: "0",
  iva: "0",
  fechaPago: "",
  fechaCaducidad: "",
  registrarPago: false,
  emailVerificado: true,
};

function dinero(valor: number): string {
  return `${valor.toFixed(2).replace(".", ",")} €`;
}

function fecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES");
}

export default function AdminPanel() {
  const tIA = useTranslations("AdminIA");
  const tExport = useTranslations("AdminExport");
  const tReset = useTranslations("AdminReset");
  const tLaunch = useTranslations("AdminLaunch");
  const tAnalitica = useTranslations("AdminAnalytics");
  const tPendientes = useTranslations("AdminPending");
  const tDescuentos = useTranslations("AdminDiscounts");
  const locale = useLocale();
  const [tab, setTab] = useState("resumen");
  const [csrf, setCsrf] = useState("");
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [accesoDenegado, setAccesoDenegado] = useState(false);
  const [error, setError] = useState("");
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [estadoIA, setEstadoIA] = useState<EstadoIA | null>(null);
  const [cargandoIA, setCargandoIA] = useState(false);
  const [errorIA, setErrorIA] = useState("");
  const [resetPendiente, setResetPendiente] = useState<
    "facturacion" | "estadisticas" | "uso" | null
  >(null);
  const [reiniciando, setReiniciando] = useState(false);
  const [limpiezaAbierta, setLimpiezaAbierta] = useState(false);
  const [limpiando, setLimpiando] = useState(false);
  const [analitica, setAnalitica] = useState<AnaliticaAdmin | null>(null);
  const [cargandoAnalitica, setCargandoAnalitica] = useState(false);
  const [errorAnalitica, setErrorAnalitica] = useState("");
  const [fechaAnalitica, setFechaAnalitica] = useState(() =>
    new Date().toLocaleDateString("en-CA", {
      timeZone: "Europe/Madrid",
    }),
  );
  const [pendientes, setPendientes] = useState<
    PendienteVerificacion[]
  >([]);
  const [cargandoPendientes, setCargandoPendientes] = useState(false);
  const [errorPendientes, setErrorPendientes] = useState("");
  const [procesandoPendiente, setProcesandoPendiente] = useState("");
  const [descuentos, setDescuentos] = useState<DescuentoAdmin[]>([]);
  const [cargandoDescuentos, setCargandoDescuentos] = useState(false);
  const [errorDescuentos, setErrorDescuentos] = useState("");
  const [guardandoDescuento, setGuardandoDescuento] = useState(false);
  const [formDescuento, setFormDescuento] = useState({
    codigo: "",
    tipo: "porcentaje" as "porcentaje" | "importe",
    valor: "20",
    fechaInicio: new Date().toLocaleDateString("en-CA", {
      timeZone: "Europe/Madrid",
    }),
    fechaFin: "",
    activo: true,
  });
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [pagosMensuales, setPagosMensuales] = useState<
    Array<{ mes: string; base: number; iva: number; total: number; facturas: number }>
  >([]);
  const [uso, setUso] = useState<
    Array<{ zona: string; usos: number; usuariosUnicos: number; duracionTotal: number }>
  >([]);
  const [logs, setLogs] = useState<
    Array<{ id: number; administrador: string; accion: string; detalle: string; fecha: string; ip: string }>
  >([]);
  const [iva, setIva] = useState("21");
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [filtros, setFiltros] = useState({
    busqueda: "",
    tipo: "",
    estado: "",
    plan: "",
  });
  const [modal, setModal] = useState<"crear" | "editar" | "eliminar" | null>(null);
  const [seleccionado, setSeleccionado] = useState<UsuarioAdmin | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [camposPdf, setCamposPdf] = useState<string[]>([
    "datosPersonales",
    "plan",
    "precio",
    "iva",
    "total",
    "fechas",
  ]);
  const [filtrosPdf, setFiltrosPdf] = useState({
    desde: "",
    hasta: "",
    tipo: "",
    plan: "",
    estado: "",
  });

  const pedir = useCallback(
    async (url: string, opciones: RequestInit = {}) => {
      const cabeceras = new Headers(opciones.headers);
      if (csrf) cabeceras.set("X-CSRF-Token", csrf);
      if (opciones.body) cabeceras.set("Content-Type", "application/json");
      const respuesta = await fetch(url, {
        ...opciones,
        headers: cabeceras,
        cache: "no-store",
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        const errorPeticion = new Error(
          typeof datos.error === "string"
            ? datos.error
            : "Error en la petición.",
        ) as Error & { status?: number };
        errorPeticion.status = respuesta.status;
        throw errorPeticion;
      }
      return datos;
    },
    [csrf],
  );

  const cargarEstadoIA = useCallback(async () => {
    setCargandoIA(true);
    setErrorIA("");

    try {
      const datos = (await pedir(
        `/api/admin/saldo-ia?_=${Date.now()}`,
      )) as EstadoIA;
      setEstadoIA(datos);
    } catch (err) {
      setErrorIA(
        err instanceof Error
          ? err.message
          : tIA("error"),
      );
    } finally {
      setCargandoIA(false);
    }
  }, [pedir, tIA]);

  const cargarResumen = useCallback(async () => {
    const datos = await pedir(
      `/api/admin/panel?_=${Date.now()}`,
    );
    setResumen(datos.resumen);
    setPagos(datos.pagos || []);
    setPagosMensuales(datos.pagosMensuales || []);
    setUso(datos.uso || []);
    setLogs(datos.logs || []);
    setIva(String(datos.iva ?? 21));
  }, [pedir]);

  const cargarUsuarios = useCallback(async () => {
    const params = new URLSearchParams({
      ...filtros,
      pagina: String(pagina),
      porPagina: "25",
      _: String(Date.now()),
    });
    const datos = await pedir(`/api/admin/panel/usuarios?${params}`);
    setUsuarios(datos.usuarios || []);
    setTotalUsuarios(datos.total || 0);
  }, [filtros, pagina, pedir]);

  const cargarPendientes = useCallback(async () => {
    setCargandoPendientes(true);
    setErrorPendientes("");

    try {
      const datos = (await pedir(
        `/api/admin/panel/pendientes?_=${Date.now()}`,
      )) as { pendientes?: PendienteVerificacion[] };
      setPendientes(datos.pendientes || []);
    } catch (err) {
      setErrorPendientes(
        err instanceof Error
          ? err.message
          : tPendientes("error"),
      );
    } finally {
      setCargandoPendientes(false);
    }
  }, [pedir, tPendientes]);

  async function accionPendiente(
    clave: string,
    accion: "verificar" | "eliminar",
  ) {
    if (
      accion === "eliminar" &&
      !window.confirm(tPendientes("confirmDelete"))
    ) {
      return;
    }

    setProcesandoPendiente(clave);
    setErrorPendientes("");

    try {
      await pedir("/api/admin/panel/pendientes", {
        method: "POST",
        body: JSON.stringify({ clave, accion }),
      });
      await cargarPendientes();
      setError("");
    } catch (err) {
      setErrorPendientes(
        err instanceof Error
          ? err.message
          : tPendientes("error"),
      );
    } finally {
      setProcesandoPendiente("");
    }
  }
  const cargarDescuentos = useCallback(async () => {
    setCargandoDescuentos(true);
    setErrorDescuentos("");

    try {
      const datos = (await pedir(
        `/api/admin/descuentos?_=${Date.now()}`,
      )) as { descuentos?: DescuentoAdmin[] };
      setDescuentos(datos.descuentos || []);
    } catch (err) {
      setErrorDescuentos(
        err instanceof Error
          ? err.message
          : tDescuentos("error"),
      );
    } finally {
      setCargandoDescuentos(false);
    }
  }, [pedir, tDescuentos]);

  async function crearDescuento(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrorDescuentos("");
    setGuardandoDescuento(true);

    try {
      await pedir("/api/admin/descuentos", {
        method: "POST",
        body: JSON.stringify({
          codigo: formDescuento.codigo,
          tipo: formDescuento.tipo,
          valor: Number(formDescuento.valor),
          fechaInicio: formDescuento.fechaInicio,
          fechaFin: formDescuento.fechaFin || null,
          activo: formDescuento.activo,
        }),
      });

      setFormDescuento((prev) => ({
        ...prev,
        codigo: "",
        valor: prev.tipo === "porcentaje" ? "20" : "5",
        fechaFin: "",
      }));
      await cargarDescuentos();
    } catch (err) {
      setErrorDescuentos(
        err instanceof Error
          ? err.message
          : tDescuentos("createError"),
      );
    } finally {
      setGuardandoDescuento(false);
    }
  }

  async function alternarDescuento(
    descuento: DescuentoAdmin,
  ) {
    setErrorDescuentos("");
    setGuardandoDescuento(true);

    try {
      await pedir("/api/admin/descuentos", {
        method: "PATCH",
        body: JSON.stringify({
          promotionCodeId: descuento.promotionCodeId,
          activo:
            descuento.estado !== "Activo" &&
            descuento.estado !== "Programado",
        }),
      });
      await cargarDescuentos();
    } catch (err) {
      setErrorDescuentos(
        err instanceof Error
          ? err.message
          : tDescuentos("updateError"),
      );
    } finally {
      setGuardandoDescuento(false);
    }
  }

  async function eliminarDescuentoUI(
    descuento: DescuentoAdmin,
  ) {
    if (!window.confirm(tDescuentos("confirmDelete"))) return;

    setErrorDescuentos("");
    setGuardandoDescuento(true);

    try {
      await pedir("/api/admin/descuentos", {
        method: "DELETE",
        body: JSON.stringify({
          promotionCodeId: descuento.promotionCodeId,
        }),
      });
      await cargarDescuentos();
    } catch (err) {
      setErrorDescuentos(
        err instanceof Error
          ? err.message
          : tDescuentos("deleteError"),
      );
    } finally {
      setGuardandoDescuento(false);
    }
  }

  const cargarAnalitica = useCallback(
    async (fecha = fechaAnalitica) => {
      setCargandoAnalitica(true);
      setErrorAnalitica("");

      try {
        const datos = (await pedir(
          `/api/admin/analitica?fecha=${encodeURIComponent(fecha)}&_=${Date.now()}`,
        )) as AnaliticaAdmin;
        setAnalitica(datos);
      } catch (err) {
        setErrorAnalitica(
          err instanceof Error
            ? err.message
            : tAnalitica("error"),
        );
      } finally {
        setCargandoAnalitica(false);
      }
    },
    [fechaAnalitica, pedir, tAnalitica],
  );

  useEffect(() => {
    let activo = true;
    void fetch("/api/auth/csrf")
      .then((r) => r.json())
      .then((datos) => {
        if (activo) setCsrf(String(datos.csrfToken || ""));
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    if (!csrf) return;

    const id = window.setTimeout(() => {
      Promise.all([
        cargarResumen(),
        cargarUsuarios(),
        cargarEstadoIA(),
        cargarAnalitica(),
        cargarPendientes(),
        cargarDescuentos(),
      ])
        .then(() => setAccesoDenegado(false))
        .catch((err) => {
          setError(
            err instanceof Error ? err.message : "Error al cargar.",
          );

          if (
            (err as Error & { status?: number }).status === 403
          ) {
            setAccesoDenegado(true);
          }
        })
        .finally(() => setCargando(false));
    }, 0);

    return () => window.clearTimeout(id);
  }, [csrf, cargarAnalitica, cargarDescuentos, cargarEstadoIA, cargarPendientes, cargarResumen, cargarUsuarios]);

  useEffect(() => {
    if (!csrf) return;

    const id = window.setInterval(() => {
      void cargarAnalitica();
    }, 30_000);

    return () => window.clearInterval(id);
  }, [csrf, cargarAnalitica]);

  const abrirEditar = (usuario: UsuarioAdmin) => {
    setSeleccionado(usuario);
    setForm({
      claveOriginal: usuario.clave,
      nombre: usuario.nombre,
      apellidos: usuario.apellidos,
      correo: usuario.correo,
      telefono: usuario.telefono,
      rol: usuario.rol,
      plan: usuario.plan,
      password: "",
      precioBase: String(usuario.precioBase),
      iva: String(usuario.iva),
      fechaPago: usuario.fechaPago?.slice(0, 10) || "",
      fechaCaducidad: usuario.fechaCaducidad?.slice(0, 10) || "",
      registrarPago: false,
      emailVerificado: usuario.emailVerificado,
    });
    setModal("editar");
  };

  const guardarUsuario = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setGuardando(true);
    setError("");

    try {
      await pedir("/api/admin/panel/usuarios", {
        method: "POST",
        body: JSON.stringify({
          modo: modal === "crear" ? "crear" : "editar",
          ...form,
          precioBase: Number(form.precioBase),
          iva: Number(form.iva),
        }),
      });
      setModal(null);
      await Promise.all([cargarResumen(), cargarUsuarios()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!seleccionado) return;
    setGuardando(true);
    setError("");
    try {
      await pedir(
        `/api/admin/panel/usuarios?clave=${encodeURIComponent(seleccionado.clave)}`,
        { method: "DELETE" },
      );
      setModal(null);
      await Promise.all([cargarResumen(), cargarUsuarios()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar.");
    } finally {
      setGuardando(false);
    }
  };

  const guardarConfig = async () => {
    try {
      await pedir("/api/admin/panel/config", {
        method: "POST",
        body: JSON.stringify({ iva: Number(iva) }),
      });
      await cargarResumen();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el IVA.");
    }
  };

  const exportar = async (plantilla = false) => {
    try {
      const respuesta = await fetch("/api/admin/panel/exportar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf,
        },
        body: JSON.stringify({
          campos: camposPdf,
          filtros: filtrosPdf,
          plantilla: plantilla ? "hacienda" : "general",
        }),
      });
      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => ({}));
        throw new Error(datos.error || "No se pudo generar el PDF.");
      }
      const blob = await respuesta.blob();
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = plantilla ? "datos-hacienda.pdf" : "informe-admin.pdf";
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo exportar.");
    }
  };

  const reiniciarContadores = async (): Promise<void> => {
    if (!resetPendiente || reiniciando) return;

    setReiniciando(true);
    setError("");

    try {
      const esUso = resetPendiente === "uso";

      await pedir(
        esUso
          ? "/api/admin/panel/reiniciar-uso"
          : "/api/admin/panel/reiniciar-contadores",
        {
          method: "POST",
          ...(esUso
            ? {}
            : {
                body: JSON.stringify({
                  contexto: resetPendiente,
                }),
              }),
        },
      );
      setResetPendiente(null);
      await Promise.all([cargarResumen(), cargarUsuarios()]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : tReset("error"),
      );
    } finally {
      setReiniciando(false);
    }
  };

  const limpiarDatosLanzamiento = async (): Promise<void> => {
    if (limpiando) return;

    setLimpiando(true);
    setError("");

    try {
      await pedir("/api/admin/panel/limpieza-lanzamiento", {
        method: "POST",
      });
      setLimpiezaAbierta(false);
      await Promise.all([cargarResumen(), cargarUsuarios()]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : tLaunch("error"),
      );
    } finally {
      setLimpiando(false);
    }
  };

  const paginas = Math.max(1, Math.ceil(totalUsuarios / 25));
  const tabs = useMemo(
    () => [
      ["resumen", "Resumen", BarChart3],
      ["usuarios", "Usuarios", Users],
      ["pendientes", tPendientes("tab"), MailWarning],
      ["descuentos", tDescuentos("tab"), BadgePercent],
      ["estadisticas", "Estadísticas", BarChart3],
      ["facturacion", "Facturación", FileText],
      ["exportar", "Exportar", Download],
    ] as const,
    [tDescuentos, tPendientes],
  );

  if (accesoDenegado) {
    return (
      <main className="min-h-app bg-transparent px-4 py-16 sm:px-6">
        <section className="mx-auto max-w-xl rounded-3xl border border-[var(--th)] bg-[var(--card)] p-8 text-center shadow-[var(--sombra)]">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--azul)]">
            Administración
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[var(--txt)]">
            Sesión de administrador no válida
          </h1>
          <p className="mt-3 leading-relaxed text-[var(--txt2)]">
            La sesión actual ya no pertenece a la cuenta administradora.
            Esto ocurre si has iniciado sesión con otro usuario en otra
            pestaña. Vuelve a entrar con la cuenta Admin.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl bg-[var(--azul)] px-5 py-2.5 text-sm font-bold text-white"
            >
              Ir a iniciar sesión
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl border border-[var(--th)] px-5 py-2.5 text-sm font-bold text-[var(--txt)]"
            >
              Reintentar
            </button>
          </div>
        </section>
      </main>
    );
  }

  const saldoDeepSeek =
    estadoIA?.deepseek.disponible &&
    typeof estadoIA.deepseek.saldo === "number"
      ? estadoIA.deepseek.saldo
      : null;
  const monedaDeepSeek = estadoIA?.deepseek.moneda || "USD";
  const saldoBajo =
    saldoDeepSeek !== null && saldoDeepSeek < 5;
  const geminiOk = estadoIA?.gemini.estado === "ok";

  function formatearSaldo(valor: number, moneda: string): string {
    try {
      return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: moneda,
        maximumFractionDigits: 2,
      }).format(valor);
    } catch {
      return `${valor.toFixed(2)} ${moneda}`;
    }
  }

  return (
    <main className="min-h-app bg-transparent px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[var(--txt2)]">
              Hola Admin
            </p>
            <h1 className="mt-1 text-3xl font-bold text-[var(--txt)] sm:text-4xl">
              Panel Admin
            </h1>
            <p className="mt-1 text-sm text-[var(--txt2)]">
              Administración de OpoGen AI · Usuarios, suscripciones, uso,
              facturación y Hacienda.
            </p>
          </div>
          <button
            type="button"
            disabled={actualizando}
            onClick={async () => {
              setError("");
              setActualizando(true);

              try {
                await Promise.all([
                  cargarResumen(),
                  cargarUsuarios(),
                  cargarEstadoIA(),
                  cargarAnalitica(),
                  cargarPendientes(),
                  cargarDescuentos(),
                ]);
                setAccesoDenegado(false);
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "No se pudo actualizar el panel.",
                );

                if (
                  (err as Error & { status?: number }).status === 403
                ) {
                  setAccesoDenegado(true);
                }
              } finally {
                setActualizando(false);
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--th)] bg-[var(--card)] px-4 py-2 text-sm font-bold text-[var(--txt)] disabled:cursor-wait disabled:opacity-70"
          >
            <RefreshCw
              className={`h-4 w-4 ${actualizando ? "animate-spin" : ""}`}
            />
            {actualizando ? "Actualizando…" : "Actualizar"}
          </button>
        </header>

        {error ? (
          <p className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        ) : null}

        <nav className="mb-6 flex flex-wrap gap-2">
          {tabs.map(([id, etiqueta, Icono]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${
                tab === id
                  ? "bg-[var(--azul)] text-white"
                  : "border border-[var(--th)] bg-[var(--card)] text-[var(--txt2)]"
              }`}
            >
              <Icono className="h-4 w-4" /> {etiqueta}
            </button>
          ))}
        </nav>

        {cargando && !resumen ? (
          <p className="text-[var(--txt2)]">Cargando panel…</p>
        ) : null}

        {tab === "resumen" && resumen ? (
          <section className="space-y-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["Usuarios totales", resumen.usuariosTotales],
                ["Free", resumen.free],
                ["Premium", resumen.premium],
                ["No renovados", resumen.noRenovados],
                ["Nuevos hoy", resumen.nuevosDia],
                ["Nuevos esta semana", resumen.nuevosSemana],
                ["Nuevos este mes", resumen.nuevosMes],
                ["Nuevos este año", resumen.nuevosAno],
              ].map(([etiqueta, valor]) => (
                <div key={String(etiqueta)} className="rounded-2xl border border-[var(--th)] bg-[var(--card)] p-4">
                  <p className="text-xs font-semibold text-[var(--txt3)]">{etiqueta}</p>
                  <p className="mt-1 text-2xl font-bold text-[var(--txt)]">{valor}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-[var(--th)] bg-[var(--card)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-bold text-[var(--txt)]">
                  {tAnalitica("title")}
                </h2>
                {cargandoAnalitica && !analitica ? (
                  <span className="text-xs text-[var(--txt3)]">
                    {tAnalitica("loading")}
                  </span>
                ) : null}
              </div>

              {errorAnalitica ? (
                <p className="mt-2 text-sm font-semibold text-red-500">
                  {errorAnalitica}
                </p>
              ) : null}

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {(
                  [
                    ["premiumActive", analitica?.activos.premium || []],
                    ["freeActive", analitica?.activos.freemium || []],
                  ] as const
                ).map(([titulo, usuariosActivos]) => (
                  <div
                    key={titulo}
                    className="rounded-xl bg-[var(--card2)] p-4"
                  >
                    <h3 className="text-sm font-bold text-[var(--azul)]">
                      {tAnalitica(titulo)}
                    </h3>
                    <p className="mt-1 text-2xl font-black text-[var(--txt)]">
                      {usuariosActivos.length}
                    </p>
                    <div className="mt-2 space-y-1 text-xs text-[var(--txt2)]">
                      {usuariosActivos.length === 0 ? (
                        <p className="text-[var(--txt3)]">
                          {tAnalitica("noActiveUsers")}
                        </p>
                      ) : (
                        usuariosActivos.map((usuario) => (
                          <div
                            key={usuario.clave}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="truncate">
                              {usuario.nombre || usuario.clave}
                            </span>
                            <span className="shrink-0 text-[var(--txt3)]">
                              {new Date(
                                usuario.ultimaActividad,
                              ).toLocaleTimeString(locale, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}

                <div className="rounded-xl bg-[var(--card2)] p-4">
                  <h3 className="text-sm font-bold text-[var(--azul)]">
                    {tAnalitica("guestsOnline")}
                  </h3>
                  <p className="mt-1 text-4xl font-black text-[var(--txt)]">
                    {analitica?.activos.invitados || 0}
                  </p>
                  <p className="mt-1 text-xs text-[var(--txt3)]">
                    {tAnalitica("guestsOnlineHint")}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--th)] bg-[var(--card)] p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="font-bold text-[var(--txt)]">
                  {tAnalitica("accessTitle")}
                </h2>
                <label className="text-xs font-bold text-[var(--txt2)]">
                  {tAnalitica("selectDate")}
                  <input
                    type="date"
                    value={fechaAnalitica}
                    onChange={(event) => {
                      const fecha = event.target.value;
                      setFechaAnalitica(fecha);
                      void cargarAnalitica(fecha);
                    }}
                    className="ml-2 rounded-lg border border-[var(--th)] bg-[var(--card2)] px-2 py-1.5 text-sm text-[var(--txt)]"
                  />
                </label>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  ["premiumAccess", analitica?.accesos.premium || 0],
                  ["freeAccess", analitica?.accesos.freemium || 0],
                  ["guestAccess", analitica?.accesos.invitados || 0],
                ].map(([etiqueta, valor]) => (
                  <div
                    key={String(etiqueta)}
                    className="rounded-xl bg-[var(--card2)] p-4 text-center"
                  >
                    <p className="text-xs font-semibold text-[var(--txt3)]">
                      {tAnalitica(String(etiqueta))}
                    </p>
                    <p className="mt-1 text-3xl font-black text-[var(--azul)]">
                      {valor}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--th)] bg-[var(--card)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="font-bold text-[var(--txt)]">
                  {tIA("title")}
                </h2>
                <button
                  type="button"
                  onClick={() => void cargarEstadoIA()}
                  disabled={cargandoIA}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--th)] bg-[var(--card2)] px-4 py-2 text-sm font-bold text-[var(--txt)] transition-colors hover:bg-[var(--suave)] disabled:cursor-wait disabled:opacity-70"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      cargandoIA ? "animate-spin" : ""
                    }`}
                  />
                  {cargandoIA ? tIA("refreshing") : tIA("refresh")}
                </button>
              </div>

              {errorIA ? (
                <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                  {errorIA}
                </p>
              ) : null}

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-[var(--card2)] p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--txt3)]">
                    {tIA("deepseekBalance")}
                  </p>
                  {cargandoIA && !estadoIA ? (
                    <p className="mt-3 text-sm text-[var(--txt3)]">
                      {tIA("loading")}
                    </p>
                  ) : estadoIA?.deepseek.disponible &&
                    saldoDeepSeek !== null ? (
                    <>
                      <p
                        className={`mt-2 text-3xl font-black ${
                          saldoBajo
                            ? "text-red-500"
                            : "text-[var(--txt)]"
                        }`}
                      >
                        {formatearSaldo(saldoDeepSeek, monedaDeepSeek)}
                      </p>
                      {saldoBajo ? (
                        <p className="mt-1 text-sm font-bold text-red-500">
                          {tIA("reloadSoon")}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="mt-3 text-sm font-semibold text-red-500">
                      {estadoIA?.deepseek.codigo === "NO_CONFIGURADA"
                        ? tIA("notConfigured")
                        : estadoIA?.deepseek.error || tIA("unavailable")}
                    </p>
                  )}
                </div>

                <div className="rounded-xl bg-[var(--card2)] p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--txt3)]">
                    {tIA("gemini")}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span
                      className={`h-3 w-3 shrink-0 rounded-full ${
                        geminiOk ? "bg-emerald-500" : "bg-red-500"
                      }`}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-semibold text-[var(--txt2)]">
                      {geminiOk
                        ? tIA("available")
                        : tIA("unavailable")}
                    </span>
                  </div>
                  {!geminiOk && estadoIA?.gemini.detalle ? (
                    <p className="mt-1 text-xs text-[var(--txt3)]">
                      {estadoIA.gemini.detalle}
                    </p>
                  ) : null}
                </div>
              </div>

              <p className="mt-4 text-xs text-[var(--txt3)]">
                {tIA("updatedAt", {
                  hora: estadoIA?.actualizadoEn
                    ? new Date(estadoIA.actualizadoEn).toLocaleTimeString(
                        locale,
                      )
                    : "—",
                })}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--th)] bg-[var(--card)] p-5">
                <h2 className="font-bold text-[var(--txt)]">Ganancias e IVA</h2>
                <div className="mt-3 grid gap-2 text-sm">
                  {[
                    ["Hoy", resumen.gananciasDia, resumen.ivaDia],
                    ["Semana", resumen.gananciasSemana, resumen.ivaSemana],
                    ["Mes", resumen.gananciasMes, resumen.ivaMes],
                    ["Año", resumen.gananciasAno, resumen.ivaAno],
                  ].map(([periodo, base, ivaPeriodo]) => (
                    <div key={String(periodo)} className="flex items-center justify-between rounded-lg bg-[var(--card2)] px-3 py-2">
                      <span>{periodo}</span>
                      <span className="font-bold">
                        {dinero(Number(base))} + IVA {dinero(Number(ivaPeriodo))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--th)] bg-[var(--card)] p-5">
                <h2 className="font-bold text-[var(--txt)]">Próximos a caducar</h2>
                <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                  {[["7 días", resumen.proximos7], ["15 días", resumen.proximos15], ["30 días", resumen.proximos30]].map(([etiqueta, valor]) => (
                    <div key={String(etiqueta)} className="rounded-xl bg-[var(--card2)] p-3">
                      <p className="text-xs">{etiqueta}</p>
                      <p className="text-2xl font-bold">{valor}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <label className="text-xs font-bold text-[var(--txt2)]">IVA general (%)</label>
                  <div className="mt-1 flex gap-2">
                    <input value={iva} onChange={(e) => setIva(e.target.value)} className="w-24 rounded-lg border border-[var(--th)] bg-[var(--card2)] px-3 py-2 text-sm" />
                    <button type="button" onClick={() => void guardarConfig()} className="rounded-lg bg-[var(--azul)] px-3 py-2 text-xs font-bold text-white">Guardar IVA</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--th)] bg-[var(--card)] p-5">
              <h2 className="font-bold text-[var(--txt)]">Últimas acciones administrativas</h2>
              <div className="mt-3 space-y-2 text-xs">
                {logs.slice(0, 8).map((log) => (
                  <div key={log.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-[var(--card2)] px-3 py-2">
                    <span><strong>{log.accion}</strong> · {log.detalle}</span>
                    <span className="text-[var(--txt3)]">{new Date(log.fecha).toLocaleString("es-ES")} · {log.ip}</span>
                  </div>
                ))}
                {logs.length === 0 ? <p className="text-[var(--txt3)]">Sin acciones registradas.</p> : null}
              </div>
            </div>

            <div className="rounded-2xl border border-red-900/30 bg-red-950/5 p-5">
              <h2 className="font-bold text-[var(--txt)]">
                {tLaunch("title")}
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-[var(--txt2)]">
                {tLaunch("description")}
              </p>
              <button
                type="button"
                onClick={() => setLimpiezaAbierta(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-900/40 bg-red-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-800"
              >
                <Trash2 className="h-4 w-4" />
                {tLaunch("button")}
              </button>
            </div>
          </section>
        ) : null}

        {tab === "usuarios" ? (
          <section className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <input value={filtros.busqueda} onChange={(e) => { setPagina(1); setFiltros((f) => ({ ...f, busqueda: e.target.value })); }} placeholder="Buscar nombre, correo o teléfono" className="min-w-[240px] flex-1 rounded-xl border border-[var(--th)] bg-[var(--card)] px-3 py-2 text-sm" />
              <select value={filtros.tipo} onChange={(e) => { setPagina(1); setFiltros((f) => ({ ...f, tipo: e.target.value })); }} className="rounded-xl border border-[var(--th)] bg-[var(--card)] px-3 py-2 text-sm">
                <option value="">Todos</option><option value="freemium">Free</option><option value="premium">Premium</option>
              </select>
              <select value={filtros.estado} onChange={(e) => { setPagina(1); setFiltros((f) => ({ ...f, estado: e.target.value })); }} className="rounded-xl border border-[var(--th)] bg-[var(--card)] px-3 py-2 text-sm">
                <option value="">Todos los estados</option><option value="Activa">Activa</option><option value="Caducada">Caducada</option>
              </select>
              <select value={filtros.plan} onChange={(e) => { setPagina(1); setFiltros((f) => ({ ...f, plan: e.target.value })); }} className="rounded-xl border border-[var(--th)] bg-[var(--card)] px-3 py-2 text-sm">
                <option value="">Todos los planes</option><option value="mensual">1 mes</option><option value="semestral">6 meses</option><option value="anual">12 meses</option><option value="ilimitado">Ilimitado</option>
              </select>
              <button type="button" onClick={() => { setForm(FORM_VACIO); setModal("crear"); }} className="inline-flex items-center gap-2 rounded-xl bg-[var(--azul)] px-4 py-2 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Crear usuario</button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[var(--th)] bg-[var(--card)]">
              <table className="w-full min-w-[1100px] text-left text-xs">
                <thead className="bg-[var(--card2)] text-[var(--txt3)]">
                  <tr>{["ID", "Usuario", "Cuenta", "Plan", "Base", "IVA", "Total", "Registro", "Pago", "Caducidad", "Estado", "Acciones"].map((h) => <th key={h} className="px-3 py-3 font-bold">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario) => {
                    const sinSuscripcion = !usuario.plan;

                    return (
                    <tr key={usuario.clave} className="border-t border-[var(--th)]">
                      <td className="px-3 py-3 font-mono">{usuario.clave}</td>
                      <td className="px-3 py-3"><strong>{usuario.nombre} {usuario.apellidos}</strong><br /><span className="text-[var(--txt3)]">{usuario.correo}</span></td>
                      <td className="px-3 py-3">{usuario.rol === "premium" ? "Premium" : "Free"}</td>
                      <td className="px-3 py-3">{sinSuscripcion ? "—" : usuario.plan}</td>
                      <td className="px-3 py-3">{dinero(sinSuscripcion ? 0 : usuario.precioBase)}</td>
                      <td className="px-3 py-3">{dinero(sinSuscripcion ? 0 : usuario.iva)}</td>
                      <td className="px-3 py-3 font-bold">{dinero(sinSuscripcion ? 0 : usuario.total)}</td>
                      <td className="px-3 py-3">{fecha(usuario.fechaRegistro)}</td>
                      <td className="px-3 py-3">{fecha(usuario.fechaPago)}</td>
                      <td className="px-3 py-3">{usuario.plan === "ilimitado" ? "Sin límite" : fecha(usuario.fechaCaducidad)}</td>
                      <td className="px-3 py-3">{usuario.estado}</td>
                      <td className="px-3 py-3"><div className="flex gap-2"><button type="button" onClick={() => abrirEditar(usuario)} title="Editar" className="rounded-lg p-1.5 text-[var(--azul)] hover:bg-[var(--suave)]"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => { setSeleccionado(usuario); setModal("eliminar"); }} title="Eliminar" className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span>{totalUsuarios} usuarios · página {pagina} de {paginas}</span>
              <div className="flex gap-2">
                <button type="button" disabled={pagina <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))} className="rounded-lg border border-[var(--th)] px-3 py-1.5 disabled:opacity-40">Anterior</button>
                <button type="button" disabled={pagina >= paginas} onClick={() => setPagina((p) => p + 1)} className="rounded-lg border border-[var(--th)] px-3 py-1.5 disabled:opacity-40">Siguiente</button>
              </div>
            </div>
          </section>
        ) : null}

        {tab === "pendientes" ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[var(--txt)]">
                  {tPendientes("title")}
                </h2>
                <p className="mt-1 text-sm text-[var(--txt2)]">
                  {tPendientes("subtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void cargarPendientes()}
                disabled={cargandoPendientes}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--th)] bg-[var(--card)] px-4 py-2 text-sm font-bold text-[var(--txt)] disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${cargandoPendientes ? "animate-spin" : ""}`}
                />
                {tPendientes("refresh")}
              </button>
            </div>

            {errorPendientes ? (
              <p className="rounded-xl border border-[var(--err-b)] bg-[var(--err)] px-4 py-3 text-sm font-medium text-[var(--err-t)]">
                {errorPendientes}
              </p>
            ) : null}

            <div className="overflow-x-auto rounded-2xl border border-[var(--th)] bg-[var(--card)]">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-[var(--card2)] text-[var(--txt3)]">
                  <tr>
                    {[
                      tPendientes("name"),
                      tPendientes("phone"),
                      tPendientes("email"),
                      tPendientes("registered"),
                      tPendientes("actions"),
                    ].map((titulo) => (
                      <th key={titulo} className="px-3 py-3 font-bold">
                        {titulo}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendientes.map((pendiente) => (
                    <tr
                      key={pendiente.clave}
                      className="border-t border-[var(--th)]"
                    >
                      <td className="px-3 py-3">
                        <strong>{pendiente.nombre}</strong>
                        <br />
                        <span className="text-[var(--txt3)]">
                          {pendiente.origen === "pendiente"
                            ? tPendientes("pendingSource")
                            : tPendientes("fileSource")}
                        </span>
                      </td>
                      <td className="px-3 py-3">{pendiente.telefono}</td>
                      <td className="px-3 py-3">{pendiente.correo}</td>
                      <td className="px-3 py-3">
                        {new Date(
                          pendiente.fechaRegistro,
                        ).toLocaleDateString(locale, {
                          dateStyle: "medium",
                        })}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={
                              procesandoPendiente === pendiente.clave
                            }
                            onClick={() =>
                              void accionPendiente(
                                pendiente.clave,
                                "verificar",
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-[var(--azul)] px-2.5 py-1.5 font-bold text-[var(--btn-txt)] disabled:opacity-50"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            {tPendientes("verify")}
                          </button>
                          <button
                            type="button"
                            disabled={
                              procesandoPendiente === pendiente.clave
                            }
                            onClick={() =>
                              void accionPendiente(
                                pendiente.clave,
                                "eliminar",
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--err-b)] bg-[var(--err)] px-2.5 py-1.5 font-bold text-[var(--err-t)] disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {tPendientes("delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!cargandoPendientes && pendientes.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-[var(--txt3)]">
                  {tPendientes("empty")}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {tab === "descuentos" ? (
          <section className="grid gap-5 lg:grid-cols-[22rem_1fr]">
            <form
              onSubmit={crearDescuento}
              className="space-y-3 rounded-2xl border border-[var(--th)] bg-[var(--card)] p-5"
            >
              <h2 className="text-xl font-bold text-[var(--txt)]">
                {tDescuentos("createTitle")}
              </h2>

              <label className="block text-sm font-semibold text-[var(--txt2)]">
                {tDescuentos("code")}
                <input
                  required
                  value={formDescuento.codigo}
                  onChange={(e) =>
                    setFormDescuento((f) => ({
                      ...f,
                      codigo: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="OPOGEN20"
                  className="mt-1 w-full rounded-lg border border-[var(--th)] bg-[var(--card2)] px-3 py-2 text-sm text-[var(--txt)]"
                />
              </label>

              <label className="block text-sm font-semibold text-[var(--txt2)]">
                {tDescuentos("type")}
                <select
                  value={formDescuento.tipo}
                  onChange={(e) =>
                    setFormDescuento((f) => ({
                      ...f,
                      tipo: e.target.value as "porcentaje" | "importe",
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--th)] bg-[var(--card2)] px-3 py-2 text-sm text-[var(--txt)]"
                >
                  <option value="porcentaje">{tDescuentos("percent")}</option>
                  <option value="importe">{tDescuentos("amount")}</option>
                </select>
              </label>

              <label className="block text-sm font-semibold text-[var(--txt2)]">
                {tDescuentos("value")}
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formDescuento.valor}
                  onChange={(e) =>
                    setFormDescuento((f) => ({ ...f, valor: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--th)] bg-[var(--card2)] px-3 py-2 text-sm text-[var(--txt)]"
                />
              </label>

              <label className="block text-sm font-semibold text-[var(--txt2)]">
                {tDescuentos("startDate")}
                <input
                  required
                  type="date"
                  value={formDescuento.fechaInicio}
                  onChange={(e) =>
                    setFormDescuento((f) => ({
                      ...f,
                      fechaInicio: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--th)] bg-[var(--card2)] px-3 py-2 text-sm text-[var(--txt)]"
                />
              </label>

              <label className="block text-sm font-semibold text-[var(--txt2)]">
                {tDescuentos("endDate")}
                <input
                  type="date"
                  value={formDescuento.fechaFin}
                  onChange={(e) =>
                    setFormDescuento((f) => ({
                      ...f,
                      fechaFin: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--th)] bg-[var(--card2)] px-3 py-2 text-sm text-[var(--txt)]"
                />
              </label>

              <label className="flex items-center gap-2 text-sm font-semibold text-[var(--txt2)]">
                <input
                  type="checkbox"
                  checked={formDescuento.activo}
                  onChange={(e) =>
                    setFormDescuento((f) => ({
                      ...f,
                      activo: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-[var(--azul)]"
                />
                {tDescuentos("active")}
              </label>

              {errorDescuentos ? (
                <p className="rounded-lg bg-[var(--err)] px-3 py-2 text-xs font-semibold text-[var(--err-t)]">
                  {errorDescuentos}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={guardandoDescuento}
                className="w-full rounded-xl bg-[var(--azul)] px-4 py-2.5 text-sm font-bold text-[var(--btn-txt)] disabled:opacity-50"
              >
                {guardandoDescuento
                  ? tDescuentos("saving")
                  : tDescuentos("create")}
              </button>
            </form>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-[var(--txt)]">
                  {tDescuentos("listTitle")}
                </h2>
                <button
                  type="button"
                  onClick={() => void cargarDescuentos()}
                  disabled={cargandoDescuentos}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--th)] bg-[var(--card)] px-3 py-2 text-sm font-bold text-[var(--txt)] disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${cargandoDescuentos ? "animate-spin" : ""}`}
                  />
                  {tDescuentos("refresh")}
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[var(--th)] bg-[var(--card)]">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="bg-[var(--card2)] text-[var(--txt3)]">
                    <tr>
                      {[
                        tDescuentos("code"),
                        tDescuentos("discount"),
                        tDescuentos("startDate"),
                        tDescuentos("endDate"),
                        tDescuentos("status"),
                        tDescuentos("uses"),
                        tDescuentos("actions"),
                      ].map((titulo) => (
                        <th key={titulo} className="px-3 py-3 font-bold">
                          {titulo}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {descuentos.map((descuento) => {
                      const claseEstado =
                        descuento.estado === "Activo"
                          ? "bg-[var(--ok)] text-[var(--ok-t)]"
                          : descuento.estado === "Programado"
                            ? "bg-[var(--sel)] text-[var(--azul)]"
                            : descuento.estado === "Caducado"
                              ? "bg-[var(--ambar)] text-[var(--ambar-t)]"
                              : "bg-[var(--suave2)] text-[var(--txt3)]";

                      return (
                        <tr
                          key={descuento.promotionCodeId}
                          className="border-t border-[var(--th)]"
                        >
                          <td className="px-3 py-3 font-mono font-bold">
                            {descuento.codigo}
                          </td>
                          <td className="px-3 py-3">{descuento.descuento}</td>
                          <td className="px-3 py-3">{descuento.fechaInicio}</td>
                          <td className="px-3 py-3">
                            {descuento.fechaFin || "—"}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${claseEstado}`}
                            >
                              {tDescuentos(`statuses.${descuento.estado}`)}
                            </span>
                          </td>
                          <td className="px-3 py-3">{descuento.usos}</td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={guardandoDescuento}
                                onClick={() => void alternarDescuento(descuento)}
                                className="rounded-lg border border-[var(--th)] bg-[var(--card2)] px-2.5 py-1.5 font-bold text-[var(--txt)] disabled:opacity-50"
                              >
                                {descuento.estado === "Activo" ||
                                descuento.estado === "Programado"
                                  ? tDescuentos("deactivate")
                                  : tDescuentos("activate")}
                              </button>

                              <button
                                type="button"
                                disabled={guardandoDescuento}
                                onClick={() =>
                                  void eliminarDescuentoUI(descuento)
                                }
                                title={tDescuentos("delete")}
                                aria-label={tDescuentos("delete")}
                                className="rounded-lg border border-[var(--err-b)] bg-[var(--err)] p-1.5 text-[var(--err-t)] disabled:opacity-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {!cargandoDescuentos && descuentos.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-[var(--txt3)]">
                    {tDescuentos("empty")}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {tab === "estadisticas" ? (
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="flex justify-end lg:col-span-2">
              <button
                type="button"
                onClick={() => setResetPendiente("estadisticas")}
                className="inline-flex items-center gap-2 rounded-xl border border-red-900/40 bg-red-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-800"
              >
                <RotateCcw className="h-4 w-4" />
                {tReset("resetStats")}
              </button>
            </div>
            <div className="rounded-2xl border border-[var(--th)] bg-[var(--card)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-bold text-[var(--txt)]">Uso por zona</h2>
                <button
                  type="button"
                  onClick={() => setResetPendiente("uso")}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-900/40 bg-red-700 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-red-800"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {tReset("resetUsage")}
                </button>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                {uso.map((item) => (
                  <div key={item.zona} className="rounded-lg bg-[var(--card2)] p-3">
                    <div className="flex justify-between"><strong>{item.zona}</strong><span>{item.usos} usos</span></div>
                    <div className="mt-1 text-xs text-[var(--txt3)]">{item.usuariosUnicos} usuarios únicos · {Math.round(item.duracionTotal / 60)} min</div>
                  </div>
                ))}
                {uso.length === 0 ? <p className="text-[var(--txt3)]">Sin datos de uso todavía.</p> : null}
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--th)] bg-[var(--card)] p-5">
              <h2 className="font-bold text-[var(--txt)]">Crecimiento de usuarios</h2>
              <div className="mt-4 space-y-2">
                {[["Hoy", resumen?.nuevosDia || 0], ["Semana", resumen?.nuevosSemana || 0], ["Mes", resumen?.nuevosMes || 0], ["Año", resumen?.nuevosAno || 0]].map(([etiqueta, valor]) => (
                  <div key={String(etiqueta)} className="flex items-center gap-2 text-xs"><span className="w-16">{etiqueta}</span><div className="h-3 flex-1 rounded-full bg-[var(--card2)]"><div className="h-3 rounded-full bg-[var(--azul)]" style={{ width: `${Math.min(100, Number(valor) * 8)}%` }} /></div><strong>{valor}</strong></div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {tab === "facturacion" ? (
          <section className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setResetPendiente("facturacion")}
                className="inline-flex items-center gap-2 rounded-xl border border-red-900/40 bg-red-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-800"
              >
                <RotateCcw className="h-4 w-4" />
                {tReset("resetBilling")}
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-[var(--th)] bg-[var(--card)] p-4"><p className="text-xs text-[var(--txt3)]">Base anual</p><p className="text-2xl font-bold">{dinero(resumen?.gananciasAno || 0)}</p></div>
              <div className="rounded-2xl border border-[var(--th)] bg-[var(--card)] p-4"><p className="text-xs text-[var(--txt3)]">IVA anual</p><p className="text-2xl font-bold">{dinero(resumen?.ivaAno || 0)}</p></div>
              <div className="rounded-2xl border border-[var(--th)] bg-[var(--card)] p-4"><p className="text-xs text-[var(--txt3)]">Total anual</p><p className="text-2xl font-bold">{dinero((resumen?.gananciasAno || 0) + (resumen?.ivaAno || 0))}</p></div>
            </div>
            <div className="rounded-2xl border border-[var(--th)] bg-[var(--card)] p-5">
              <h2 className="font-bold">Facturación mensual · EUR</h2>
              <table className="mt-3 w-full text-left text-xs">
                <thead><tr className="text-[var(--txt3)]">{["Mes", "Base", "IVA", "Total", "Facturas"].map((h) => <th key={h} className="py-2">{h}</th>)}</tr></thead>
                <tbody>{pagosMensuales.map((fila) => <tr key={fila.mes} className="border-t border-[var(--th)]"><td className="py-2">{fila.mes}</td><td>{dinero(fila.base)}</td><td>{dinero(fila.iva)}</td><td className="font-bold">{dinero(fila.total)}</td><td>{fila.facturas}</td></tr>)}</tbody>
              </table>
            </div>
            <div className="rounded-2xl border border-[var(--th)] bg-[var(--card)] p-5">
              <h2 className="font-bold">Histórico de pagos</h2>
              <div className="mt-3 max-h-96 overflow-auto">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead><tr className="text-[var(--txt3)]">{["Fecha", "Usuario", "Concepto", "Plan", "Base", "IVA", "Total"].map((h) => <th key={h} className="py-2">{h}</th>)}</tr></thead>
                  <tbody>{pagos.map((pago) => <tr key={pago.id} className="border-t border-[var(--th)]"><td className="py-2">{fecha(pago.fecha)}</td><td>{pago.usuarioNombre}</td><td>{pago.concepto}</td><td>{pago.plan}</td><td>{dinero(pago.precioBase)}</td><td>{dinero(pago.iva)}</td><td className="font-bold">{dinero(pago.total)}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}

        {tab === "exportar" ? (
          <section className="space-y-4 rounded-2xl border border-[var(--th)] bg-[var(--card)] p-5">
            <h2 className="text-xl font-bold">Exportación personalizada</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-bold">Datos a incluir</p>
                {[["datosPersonales", tExport("personalData")], ["plan", "Plan"], ["precio", "Precio base"], ["iva", "IVA"], ["total", "Total"], ["fechas", "Fechas"], ["zonaUso", "Estado / uso"]].map(([id, etiqueta]) => (
                  <label key={id} className="mb-1 flex items-center gap-2 text-sm"><input type="checkbox" checked={camposPdf.includes(id)} onChange={(e) => setCamposPdf((prev) => e.target.checked ? [...prev, id] : prev.filter((c) => c !== id))} /> {etiqueta}</label>
                ))}
                <p className="mt-2 text-xs leading-relaxed text-[var(--txt3)]">
                  {tExport("personalDataHint")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <label>Desde<input type="date" value={filtrosPdf.desde} onChange={(e) => setFiltrosPdf((f) => ({ ...f, desde: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--th)] bg-[var(--card2)] px-2 py-1.5" /></label>
                <label>Hasta<input type="date" value={filtrosPdf.hasta} onChange={(e) => setFiltrosPdf((f) => ({ ...f, hasta: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--th)] bg-[var(--card2)] px-2 py-1.5" /></label>
                <label>Tipo<select value={filtrosPdf.tipo} onChange={(e) => setFiltrosPdf((f) => ({ ...f, tipo: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--th)] bg-[var(--card2)] px-2 py-1.5"><option value="">Todos</option><option value="freemium">Free</option><option value="premium">Premium</option></select></label>
                <label>Plan<select value={filtrosPdf.plan} onChange={(e) => setFiltrosPdf((f) => ({ ...f, plan: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--th)] bg-[var(--card2)] px-2 py-1.5"><option value="">Todos</option><option value="mensual">1 mes</option><option value="semestral">6 meses</option><option value="anual">12 meses</option><option value="ilimitado">Ilimitado</option></select></label>
                <label>Estado<select value={filtrosPdf.estado} onChange={(e) => setFiltrosPdf((f) => ({ ...f, estado: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--th)] bg-[var(--card2)] px-2 py-1.5"><option value="">Todos</option><option value="Activa">Activa</option><option value="Caducada">Caducada</option></select></label>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void exportar(false)} className="inline-flex items-center gap-2 rounded-xl bg-[var(--azul)] px-4 py-2 text-sm font-bold text-white"><Download className="h-4 w-4" /> Descargar PDF</button>
              <button type="button" onClick={() => void exportar(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"><FileText className="h-4 w-4" /> Datos para Hacienda</button>
              <button type="button" onClick={() => window.print()} className="rounded-xl border border-[var(--th)] px-4 py-2 text-sm font-bold">Imprimir panel</button>
            </div>
          </section>
        ) : null}
      </div>

      {limpiezaAbierta ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="limpieza-lanzamiento-titulo"
            className="w-full max-w-lg rounded-2xl border border-[var(--th)] bg-[var(--card)] p-5 shadow-2xl"
          >
            <h2
              id="limpieza-lanzamiento-titulo"
              className="text-xl font-bold text-[var(--txt)]"
            >
              {tLaunch("warningTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--txt2)]">
              {tLaunch("warningMessage")}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLimpiezaAbierta(false)}
                disabled={limpiando}
                className="rounded-xl border border-[var(--th)] px-4 py-2 text-sm font-bold text-[var(--txt2)] hover:bg-[var(--suave)] disabled:cursor-wait disabled:opacity-60"
              >
                {tLaunch("cancel")}
              </button>
              <button
                type="button"
                onClick={() => void limpiarDatosLanzamiento()}
                disabled={limpiando}
                className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800 disabled:cursor-wait disabled:opacity-60"
              >
                {limpiando ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {limpiando ? tLaunch("cleaning") : tLaunch("confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {resetPendiente ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-contadores-titulo"
            className="w-full max-w-md rounded-2xl border border-[var(--th)] bg-[var(--card)] p-5 shadow-2xl"
          >
            <h2
              id="reset-contadores-titulo"
              className="text-xl font-bold text-[var(--txt)]"
            >
              {resetPendiente === "uso"
                ? tReset("warningTitleUsage")
                : tReset("warningTitle")}
            </h2>
            <p className="mt-2 text-sm text-[var(--txt2)]">
              {resetPendiente === "uso"
                ? tReset("warningMessageUsage")
                : tReset("warningMessage")}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetPendiente(null)}
                disabled={reiniciando}
                className="rounded-xl border border-[var(--th)] px-4 py-2 text-sm font-bold text-[var(--txt2)] hover:bg-[var(--suave)] disabled:cursor-wait disabled:opacity-60"
              >
                {tReset("cancel")}
              </button>
              <button
                type="button"
                onClick={() => void reiniciarContadores()}
                disabled={reiniciando}
                className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800 disabled:cursor-wait disabled:opacity-60"
              >
                {reiniciando ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                {reiniciando ? tReset("resetting") : tReset("confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[var(--card)] p-5 shadow-2xl">
            {modal === "eliminar" ? (
              <>
                <h2 className="text-xl font-bold">Eliminar usuario</h2>
                <p className="mt-2 text-sm">¿Eliminar definitivamente a <strong>{seleccionado?.nombre} {seleccionado?.apellidos}</strong>? Esta acción no se puede deshacer.</p>
                <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setModal(null)} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button><button type="button" disabled={guardando} onClick={() => void eliminar()} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white">Eliminar</button></div>
              </>
            ) : (
              <form onSubmit={guardarUsuario} className="space-y-3">
                <h2 className="text-xl font-bold">{modal === "crear" ? "Crear usuario" : "Editar usuario"}</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">Nombre<input required value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--th)] bg-[var(--card2)] px-3 py-2" /></label>
                  <label className="text-sm">Apellidos<input value={form.apellidos} onChange={(e) => setForm((f) => ({ ...f, apellidos: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--th)] bg-[var(--card2)] px-3 py-2" /></label>
                  <label className="text-sm">Correo<input required type="email" value={form.correo} onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--th)] bg-[var(--card2)] px-3 py-2" /></label>
                  <label className="text-sm">Teléfono / ID<input required disabled={modal === "editar"} value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} placeholder="34_600000000" className="mt-1 w-full rounded-lg border border-[var(--th)] bg-[var(--card2)] px-3 py-2 disabled:opacity-60" /></label>
                  <label className="text-sm">Rol<select value={form.rol} onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value as "freemium" | "premium" }))} className="mt-1 w-full rounded-lg border border-[var(--th)] bg-[var(--card2)] px-3 py-2"><option value="freemium">Free</option><option value="premium">Premium</option></select></label>
                  <label className="text-sm">Plan<select value={form.plan} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--th)] bg-[var(--card2)] px-3 py-2"><option value="">Sin plan</option><option value="mensual">1 mes</option><option value="semestral">6 meses</option><option value="anual">12 meses</option><option value="ilimitado">Ilimitado</option></select></label>
                  <label className="text-sm">Precio base<input type="number" min="0" step="0.01" value={form.precioBase} onChange={(e) => {
                    const valor = e.target.value;
                    const base = Number(valor);
                    const ivaCalculado = Number.isFinite(base)
                      ? Math.round(base * (Number(iva) / 100) * 100) / 100
                      : 0;
                    setForm((f) => ({
                      ...f,
                      precioBase: valor,
                      iva: String(ivaCalculado),
                    }));
                  }} className="mt-1 w-full rounded-lg border border-[var(--th)] bg-[var(--card2)] px-3 py-2" /></label>
                  <label className="text-sm">IVA<input type="number" min="0" step="0.01" value={form.iva} onChange={(e) => setForm((f) => ({ ...f, iva: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--th)] bg-[var(--card2)] px-3 py-2" /></label>
                  <label className="text-sm">Fecha de pago<input type="date" value={form.fechaPago} onChange={(e) => setForm((f) => ({ ...f, fechaPago: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--th)] bg-[var(--card2)] px-3 py-2" /></label>
                  <label className="text-sm">Fecha de caducidad<input type="date" value={form.fechaCaducidad} onChange={(e) => setForm((f) => ({ ...f, fechaCaducidad: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--th)] bg-[var(--card2)] px-3 py-2" /></label>
                  <label className="text-sm">Contraseña {modal === "editar" ? "(opcional)" : ""}<input type="password" required={modal === "crear"} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--th)] bg-[var(--card2)] px-3 py-2" /></label>
                  <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" checked={form.registrarPago} onChange={(e) => setForm((f) => ({ ...f, registrarPago: e.target.checked }))} /> Registrar pago en histórico</label>
                  {modal === "crear" ? (
                    <label className="flex items-center gap-2 self-end text-sm">
                      <input
                        type="checkbox"
                        checked={form.emailVerificado}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            emailVerificado: e.target.checked,
                          }))
                        }
                      />
                      Marcar como verificado
                    </label>
                  ) : null}
                </div>
                <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setModal(null)} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button><button type="submit" disabled={guardando} className="rounded-lg bg-[var(--azul)] px-4 py-2 text-sm font-bold text-white">{guardando ? "Guardando…" : "Guardar"}</button></div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
