"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  ClipboardCheck,
  Gamepad2,
  Home,
  Lock,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";
import { useSesion } from "@/components/SessionProvider";
import { useSidebar } from "@/components/SidebarProvider";
import { MENSAJE_SOLO_PREMIUM } from "@/lib/planes";

type ItemNav = {
  href: string;
  clave:
    | "home"
    | "mySpace"
    | "agenda"
    | "stats"
    | "test"
    | "arcade"
    | "kids"
    | "admin";
  icono: typeof Home;
  /** Visible pero bloqueado (con candado) si el usuario no es Premium. */
  requierePremium?: boolean;
};

const ITEMS: ItemNav[] = [
  { href: "/", clave: "home", icono: Home },
  {
    href: "/mi-espacio",
    clave: "mySpace",
    icono: Briefcase,
    requierePremium: true,
  },
  { href: "/agenda", clave: "agenda", icono: CalendarDays },
  {
    href: "/estadisticas",
    clave: "stats",
    icono: BarChart3,
    requierePremium: true,
  },
  { href: "/crear", clave: "test", icono: ClipboardCheck },
  { href: "/arcade", clave: "arcade", icono: Gamepad2 },
  { href: "/kids", clave: "kids", icono: Star, requierePremium: true },
];

const CLASE_ITEM =
  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2";

const CLASE_ITEM_ACTIVO =
  "bg-[var(--azul)] text-[var(--btn-txt)] shadow-sm";

const CLASE_ITEM_INACTIVO =
  "text-[var(--txt2)] hover:bg-[var(--suave2)] hover:text-[var(--txt)]";

function limpiarRuta(pathname: string): string {
  const sinIdioma = pathname.replace(/^\/(es|en|fr|de|it|pt)(?=\/|$)/, "");

  return sinIdioma === "" ? "/" : sinIdioma;
}

function esRutaActiva(pathname: string, href: string): boolean {
  const ruta = limpiarRuta(pathname);

  if (href === "/") {
    return ruta === "/";
  }

  return ruta === href || ruta.startsWith(`${href}/`);
}

function FilaNav({
  item,
  activo,
  bloqueado,
  onNavegar,
}: {
  item: ItemNav;
  activo: boolean;
  bloqueado: boolean;
  onNavegar?: () => void;
}) {
  const t = useTranslations("Header");
  const Icono = item.icono;
  const etiqueta = t(item.clave);

  if (bloqueado) {
    return (
      <Link
        href="/premium"
        prefetch={false}
        onClick={onNavegar}
        title={MENSAJE_SOLO_PREMIUM}
        aria-label={`${etiqueta} (${t("premium")})`}
        className={`${CLASE_ITEM} text-[var(--txt3)] hover:bg-[var(--suave2)] hover:text-[var(--txt2)]`}
      >
        <Icono className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
        <span className="truncate">{etiqueta}</span>
        <Lock className="ml-auto h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      prefetch={false}
      onClick={() => {
        if (item.clave === "arcade") {
          window.dispatchEvent(new Event("opogen:arcade-menu"));
        }
        onNavegar?.();
      }}
      aria-current={activo ? "page" : undefined}
      title={etiqueta}
      className={`${CLASE_ITEM} ${activo ? CLASE_ITEM_ACTIVO : CLASE_ITEM_INACTIVO}`}
    >
      <Icono className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
      <span className="truncate">{etiqueta}</span>
    </Link>
  );
}

function ContenidoSidebar({ mostrarCerrar }: { mostrarCerrar: boolean }) {
  const pathname = usePathname();
  const { sesion } = useSesion();
  const { cerrar } = useSidebar();
  const esPremium = sesion?.rol === "premium";
  // El acceso al panel de administración solo existe para la cuenta admin.
  const items = sesion?.esAdmin
    ? [
        ...ITEMS,
        {
          href: "/admin",
          clave: "admin" as const,
          icono: ShieldCheck,
        },
      ]
    : ITEMS;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {mostrarCerrar ? (
        <div className="flex shrink-0 items-center justify-end gap-2">
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar menú"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--th)] bg-[var(--card2)] text-[var(--txt2)] transition-colors hover:bg-[var(--suave2)] hover:text-[var(--txt)]"
          >
            <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <nav
        aria-label="Navegación principal"
        className="mt-6 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto"
      >
        {items.map((item) => {
          const bloqueado = Boolean(item.requierePremium) && !esPremium;

          return (
            <FilaNav
              key={item.href}
              item={item}
              activo={!bloqueado && esRutaActiva(pathname, item.href)}
              bloqueado={bloqueado}
              onNavegar={mostrarCerrar ? cerrar : undefined}
            />
          );
        })}
      </nav>
    </div>
  );
}

export default function Sidebar() {
  const { abierto, cerrar } = useSidebar();
  const pathname = usePathname();

  // Al cambiar de página el cajón móvil se cierra solo.
  useEffect(() => {
    cerrar();
  }, [pathname, cerrar]);

  // Escape para cerrar y bloqueo del scroll de fondo mientras está abierto.
  useEffect(() => {
    if (!abierto) {
      return;
    }

    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        cerrar();
      }
    };

    const overflowPrevio = document.body.style.overflow;

    document.addEventListener("keydown", alPulsar);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", alPulsar);
      document.body.style.overflow = overflowPrevio;
    };
  }, [abierto, cerrar]);

  return (
    <>
      {/* Barra fija de escritorio */}
      <aside
        aria-label="Menú principal"
        className="fixed left-0 top-[72px] z-40 hidden h-[calc(100vh-72px)] w-64 bg-transparent p-4 lg:block"
      >
        <ContenidoSidebar mostrarCerrar={false} />
      </aside>

      {/* Cajón deslizante de móvil */}
      <div
        className={`fixed inset-0 z-[80] lg:hidden ${
          abierto ? "" : "pointer-events-none"
        }`}
        aria-hidden={!abierto}
        inert={!abierto}
      >
        <div
          onClick={cerrar}
          aria-hidden="true"
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
            abierto ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          id="sidebar-movil"
          role="dialog"
          aria-modal="true"
          aria-label="Menú principal"
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-[var(--th)] bg-[var(--card)] p-4 shadow-2xl transition-transform duration-300 ease-out ${
            abierto ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <ContenidoSidebar mostrarCerrar />
        </aside>
      </div>
    </>
  );
}
