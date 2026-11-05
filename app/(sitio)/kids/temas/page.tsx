"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type TemaKids = {
  icono: string;
  clave: string;
};

const TEMAS: TemaKids[] = [
  { icono: "🐾", clave: "topicAnimals" },
  { icono: "🎨", clave: "topicColors" },
  { icono: "🔢", clave: "topicNumbers" },
  { icono: "🚀", clave: "topicSpace" },
  { icono: "🫀", clave: "topicBody" },
  { icono: "🏛️", clave: "topicHistory" },
  { icono: "➕", clave: "topicAdd" },
  { icono: "➖", clave: "topicSubtract" },
  { icono: "✖️", clave: "topicMultiply" },
  { icono: "➗", clave: "topicDivide" },
];

export default function KidsTemasPage() {
  const t = useTranslations("Kids");
  const router = useRouter();
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!window.localStorage.getItem("kids_age")) {
      router.replace("/kids");
    }
  }, [router]);

  function elegirTema(nombre: string, clave: string): void {
    try {
      window.localStorage.setItem("kids_tema", nombre);
      window.localStorage.setItem("kids_tema_clave", clave);
    } catch {
      // Si localStorage no está disponible, la navegación continúa.
    }

    const siguiente = nonce + 1;
    setNonce(siguiente);

    router.push(
      `/kids/jugar?tema=${encodeURIComponent(nombre)}&t=${siguiente}`,
    );
  }

  return (
    <main id="contenido" className="min-h-app bg-transparent">
      <section className="mx-auto max-w-4xl px-5 py-12 text-center sm:px-8 sm:py-16">
        <p className="w-full text-center text-3xl font-bold tracking-[0.2em] sm:text-4xl">
          <span className="bg-gradient-to-r from-[var(--azul)] via-[#7c3aed] to-[#06b6d4] dark:via-[#a78bfa] dark:to-[#22d3ee] bg-clip-text text-transparent">
            {t("brand")}
          </span>{" "}
          <span className="text-[var(--azul)]">
            {t("brandKids")}
          </span>
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight text-[var(--txt)] sm:text-5xl">
          {t("topicsTitle")}
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-[var(--txt2)]">
          {t("topicsIntro")}
        </p>

        <div className="mt-10 grid grid-cols-2 gap-4 text-left sm:grid-cols-3 lg:grid-cols-5">
          {TEMAS.map((tema) => {
            const nombre = t(tema.clave);

            return (
              <button
                key={tema.clave}
                type="button"
                onClick={() => elegirTema(nombre, tema.clave)}
                className="flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border border-[var(--th)] bg-[var(--card)] p-5 text-center shadow-md transition-transform duration-200 hover:-translate-y-1 hover:scale-105 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--azul)]/40 dark:border-[var(--th)] dark:bg-[var(--card)]"
              >
                <span className="text-5xl" aria-hidden="true">
                  {tema.icono}
                </span>
                <span className="text-base font-bold text-[var(--txt)] sm:text-lg">
                  {nombre}
                </span>
              </button>
            );
          })}
        </div>

        <Link
          href="/kids"
          className="mt-8 inline-flex rounded-2xl bg-[var(--azul)] px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105"
        >
          {t("topicsBack")}
        </Link>
      </section>
    </main>
  );
}
