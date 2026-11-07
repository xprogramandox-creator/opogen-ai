import type { ReactNode } from "react";

function renderBloque(bloque: string, indice: number): ReactNode {
  const lineas = bloque.split("\n");
  const primera = lineas[0]?.trim() || "";

  if (primera.startsWith("## ")) {
    const titulo = primera.slice(3);
    const id = titulo.toLowerCase().includes("cookies")
      ? "cookies"
      : undefined;
    const resto = lineas.slice(1).join("\n").trim();

    return (
      <section key={indice}>
        <h2
          id={id}
          className="mt-10 scroll-mt-28 font-serif text-2xl font-medium text-[var(--azul)]"
        >
          {titulo}
        </h2>
        {resto ? renderBloque(resto, indice + 1) : null}
      </section>
    );
  }

  if (lineas.every((linea) => linea.trim().startsWith("- "))) {
    return (
      <ul
        key={indice}
        className="mt-4 list-disc space-y-3 pl-6 text-base leading-8 text-[var(--txt2)]"
      >
        {lineas.map((linea, posicion) => (
          <li key={posicion}>{linea.replace(/^\s*-\s*/, "")}</li>
        ))}
      </ul>
    );
  }

  return (
    <p
      key={indice}
      className="mt-4 text-base leading-8 text-[var(--txt2)]"
    >
      {bloque}
    </p>
  );
}

export default function LegalContenido({ body }: { body: string }) {
  const bloques = body
    .trim()
    .split(/\n{2,}/)
    .map((bloque) => bloque.trim())
    .filter(Boolean);

  return <div>{bloques.map(renderBloque)}</div>;
}
