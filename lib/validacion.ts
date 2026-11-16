export const PASSWORD_MAXIMA = 30;
export const PASSWORD_MAXIMA_BYTES = 72;

export type RequisitoPassword = {
  id: "mayuscula" | "minuscula" | "numero" | "especial";
  etiqueta: string;
  cumple: boolean;
};

export function limpiarTexto(valor: string): string {
  return valor
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function nombreValido(valor: string): boolean {
  const nombre = limpiarTexto(valor);

  return (
    nombre.length >= 2 &&
    nombre.length <= 120 &&
    /^\p{L}+(?: \p{L}+)*$/u.test(nombre)
  );
}

export function correoValido(valor: string): boolean {
  const correo = valor.normalize("NFC").trim();

  return (
    correo.length >= 5 &&
    correo.length <= 254 &&
    /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(
      correo,
    )
  );
}

export function longitudPasswordBytes(password: string): number {
  return new TextEncoder().encode(password).length;
}

export function obtenerRequisitosPassword(
  password: string,
): RequisitoPassword[] {
  return [
    {
      id: "mayuscula",
      etiqueta: "Una mayúscula",
      cumple: /\p{Lu}/u.test(password),
    },
    {
      id: "minuscula",
      etiqueta: "Una minúscula",
      cumple: /\p{Ll}/u.test(password),
    },
    {
      id: "numero",
      etiqueta: "Un número",
      cumple: /\p{N}/u.test(password),
    },
    {
      id: "especial",
      etiqueta: "Un carácter especial",
      cumple: /[^\p{L}\p{N}]/u.test(password),
    },
  ];
}

export function passwordValida(password: string): boolean {
  return (
    password.length > 0 &&
    password.length <= PASSWORD_MAXIMA &&
    longitudPasswordBytes(password) <= PASSWORD_MAXIMA_BYTES &&
    !/[\u0000-\u001f\u007f]/.test(password) &&
    obtenerRequisitosPassword(password).every((requisito) => requisito.cumple)
  );
}

/** Valida DNI español (8 dígitos + letra) y NIE (X/Y/Z + 7 dígitos + letra). */
export function dniValido(valor: string): boolean {
  const dni = valor.toUpperCase().replace(/[\s-]/g, "");
  const coincidencia = /^([XYZ]?)(\d{7,8})([A-Z])$/.exec(dni);

  if (!coincidencia) return false;

  const prefijo = coincidencia[1];
  const numero = Number(
    `${
      prefijo === "X"
        ? "0"
        : prefijo === "Y"
          ? "1"
          : prefijo === "Z"
            ? "2"
            : ""
    }${coincidencia[2]}`,
  );
  const letra = coincidencia[3];
  const letras = "TRWAGMYFPDXBNJZSQVHLCKE";

  return numero >= 0 && letras[numero % 23] === letra;
}

export type TipoDocumento = "DNI" | "NIE" | "VAT" | "ID" | "PASSPORT";

const PAISES_UNION_EUROPEA = new Set([
  "alemania",
  "austria",
  "belgica",
  "bulgaria",
  "chipre",
  "croacia",
  "dinamarca",
  "eslovaquia",
  "eslovenia",
  "estonia",
  "finlandia",
  "francia",
  "grecia",
  "hungria",
  "irlanda",
  "italia",
  "letonia",
  "lituania",
  "luxemburgo",
  "malta",
  "paises bajos",
  "polonia",
  "portugal",
  "republica checa",
  "rumania",
  "suecia",
]);

function normalizarPais(pais: string): string {
  return pais
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/** Deduce la etiqueta fiscal del documento según país y formato. */
export function inferirTipoDocumento(
  documento: string,
  pais: string,
): TipoDocumento {
  const normalizado = documento.trim().toUpperCase();
  const paisNormalizado = normalizarPais(pais);

  if (
    paisNormalizado === "espana" ||
    paisNormalizado === "es" ||
    paisNormalizado === "esp"
  ) {
    return /^[XYZ]/.test(normalizado) ? "NIE" : "DNI";
  }

  if (PAISES_UNION_EUROPEA.has(paisNormalizado)) {
    return "VAT";
  }

  if (/^[A-Z]{1,2}\d{6,9}$/.test(normalizado)) {
    return "PASSPORT";
  }

  return "ID";
}

export function etiquetaTipoDocumento(tipo?: string): string {
  if (tipo === "DNI") return "DNI";
  if (tipo === "NIE") return "NIE";
  if (tipo === "VAT") return "VAT";
  if (tipo === "PASSPORT") return "Pasaporte";
  return "ID";
}

/**
 * Etiqueta y ejemplo del documento de identidad según el país escrito por la
 * persona. El campo de país es texto libre, así que se admite el nombre en
 * español, el código ISO de dos letras y algunos nombres en inglés.
 */
export function etiquetaDocumentoPorPais(pais: string): {
  etiqueta: string;
  placeholder: string;
} {
  const p = normalizarPais(pais);

  if (p === "espana" || p === "es" || p === "esp") {
    return {
      etiqueta: "Documento de Identidad / NIF",
      placeholder: "DNI, NIE o NIF",
    };
  }

  if (p === "italia" || p === "it") {
    return { etiqueta: "Codice Fiscale", placeholder: "Codice Fiscale" };
  }

  if (
    p === "reino unido" ||
    p === "united kingdom" ||
    p === "gran bretana" ||
    p === "uk" ||
    p === "gb"
  ) {
    return {
      etiqueta: "National Insurance Number",
      placeholder: "QQ 12 34 56 C",
    };
  }

  if (p === "portugal" || p === "pt") {
    return {
      etiqueta: "NIF (Número de Identificação Fiscal)",
      placeholder: "NIF portugués",
    };
  }

  if (p === "francia" || p === "france" || p === "fr") {
    return { etiqueta: "Numéro Fiscal (NIF)", placeholder: "NIF francés" };
  }

  if (p === "alemania" || p === "germany" || p === "de") {
    return { etiqueta: "Steuernummer / ID", placeholder: "Steuernummer" };
  }

  if (p === "irlanda" || p === "ireland" || p === "ie") {
    return { etiqueta: "PPS Number", placeholder: "PPS Number" };
  }

  if (p === "belgica" || p === "belgium" || p === "be") {
    return { etiqueta: "Numéro National", placeholder: "Número nacional" };
  }

  if (p === "paises bajos" || p === "netherlands" || p === "nl") {
    return { etiqueta: "BSN", placeholder: "Burgerservicenummer" };
  }

  return {
    etiqueta: "Documento de Identidad / NIF",
    placeholder: "Documento de identidad, NIF o pasaporte",
  };
}

/**
 * Valida el documento fiscal según el país de residencia.
 *
 * - España: mantiene la validación estricta de DNI/NIE.
 * - Resto de países: admite de 5 a 20 caracteres alfanuméricos,
 *   guiones y puntos (NIF portugués, Codice Fiscale italiano,
 *   Steuernummer alemán, etc.).
 */
export function validarDocumento(
  documento: string,
  pais: string,
): boolean {
  const valor = documento.normalize("NFC").trim();

  if (!valor) return false;

  const paisNormalizado = pais
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  const esEspana =
    paisNormalizado === "espana" ||
    paisNormalizado === "es" ||
    paisNormalizado === "esp";

  if (esEspana) {
    return dniValido(valor);
  }

  return /^[A-Za-z0-9.-]{5,20}$/.test(valor);
}
