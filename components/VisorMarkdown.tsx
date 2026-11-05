import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

const componentes: Components = {
  h1: ({ children }) => (
    <h1 className="mb-4 border-b border-[var(--th)] pb-3 [font-family:var(--font-newsreader)] text-3xl font-semibold tracking-tight text-[var(--txt)] sm:text-4xl">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-8 [font-family:var(--font-newsreader)] text-2xl font-semibold tracking-tight text-[var(--azul)] sm:text-3xl">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-6 [font-family:var(--font-newsreader)] text-xl font-semibold text-[var(--txt)]">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="my-3 leading-7 text-[var(--txt2)]">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-[var(--txt)]">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-[var(--txt)]">{children}</em>
  ),
  ul: ({ children }) => (
    <ul className="my-4 list-disc space-y-2 pl-6 marker:text-[var(--azul)]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 list-decimal space-y-2 pl-6 marker:font-semibold marker:text-[var(--azul)]">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-7 text-[var(--txt2)]">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-5 rounded-r-xl border-l-4 border-[var(--azul)] bg-[var(--suave)] px-5 py-3 text-[var(--txt2)]">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded-md bg-[var(--suave2)] px-1.5 py-0.5 font-mono text-[0.9em] text-[var(--txt)]">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-4 overflow-x-auto rounded-xl bg-[var(--suave2)] p-4 font-mono text-sm text-[var(--txt)]">
      {children}
    </pre>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-semibold text-[var(--azul)] underline underline-offset-4 hover:text-[var(--azul-hover)]"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-8 border-[var(--th)]" />,
};

export default function VisorMarkdown({
  contenido,
}: {
  contenido: string;
}) {
  return <ReactMarkdown components={componentes}>{contenido}</ReactMarkdown>;
}
