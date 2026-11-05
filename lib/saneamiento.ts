import sanitizeHtml from "sanitize-html";

const OPCIONES_SANEAMIENTO: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: "discard",
  nonTextTags: ["script", "style", "textarea", "option"],
};

const ENTIDADES_NOMBRADAS: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  quot: '"',
};

function decodificarCodigo(codigo: number): string {
  if (
    !Number.isInteger(codigo) ||
    codigo < 0 ||
    codigo > 0x10ffff ||
    (codigo >= 0xd800 && codigo <= 0xdfff)
  ) {
    return "";
  }

  return String.fromCodePoint(codigo);
}

function decodificarEntidades(valor: string): string {
  return valor
    .replace(/&#(\d+);/g, (_, codigo: string) =>
      decodificarCodigo(Number(codigo)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, codigo: string) =>
      decodificarCodigo(Number.parseInt(codigo, 16)),
    )
    .replace(/&(amp|apos|gt|lt|quot);/g, (_, entidad: string) =>
      ENTIDADES_NOMBRADAS[entidad],
    );
}

export function sanearTexto(valor: string): string {
  return decodificarEntidades(
    sanitizeHtml(valor, OPCIONES_SANEAMIENTO),
  )
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
