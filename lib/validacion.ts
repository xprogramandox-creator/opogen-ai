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

type EtiquetaDocumento = {
  etiqueta: string;
  placeholder: string;
};

const ETIQUETA_DOCUMENTO_POR_DEFECTO: EtiquetaDocumento = {
  etiqueta: "Documento de Identidad / NIF",
  placeholder: "Documento de identidad, NIF o pasaporte",
};

/**
 * Nombres habituales del documento de identidad por país. Se admiten el nombre
 * en español, el código ISO de dos letras y algunos nombres en inglés.
 */
const DOCUMENTOS_POR_PAIS: Array<EtiquetaDocumento & { alias: string[] }> = [
  {
    alias: ["espana", "es", "esp"],
    etiqueta: "Documento de Identidad / NIF",
    placeholder: "DNI, NIE o NIF",
  },
  {
    alias: ["italia", "italy", "it"],
    etiqueta: "Codice Fiscale",
    placeholder: "Codice Fiscale",
  },
  {
    alias: ["reino unido", "united kingdom", "gran bretana", "uk", "gb"],
    etiqueta: "National Insurance Number",
    placeholder: "QQ 12 34 56 C",
  },
  {
    alias: ["portugal", "pt"],
    etiqueta: "NIF (Número de Identificação Fiscal)",
    placeholder: "NIF portugués",
  },
  {
    alias: ["francia", "france", "fr"],
    etiqueta: "Numéro Fiscal (NIF)",
    placeholder: "NIF francés",
  },
  {
    alias: ["alemania", "germany", "de"],
    etiqueta: "Steuernummer / ID",
    placeholder: "Steuernummer",
  },
  {
    alias: ["irlanda", "ireland", "ie"],
    etiqueta: "PPS Number",
    placeholder: "PPS Number",
  },
  {
    alias: ["belgica", "belgium", "be"],
    etiqueta: "Numéro National",
    placeholder: "Número nacional",
  },
  {
    alias: ["paises bajos", "holanda", "netherlands", "nl"],
    etiqueta: "BSN",
    placeholder: "Burgerservicenummer",
  },
  {
    alias: ["peru", "pe"],
    etiqueta: "Documento de Identidad",
    placeholder: "DNI o carné de extranjería",
  },
  {
    alias: ["argentina", "ar"],
    etiqueta: "DNI",
    placeholder: "DNI",
  },
  {
    alias: ["chile", "cl"],
    etiqueta: "RUN / RUT",
    placeholder: "12.345.678-9",
  },
  {
    alias: ["colombia", "co"],
    etiqueta: "Cédula de Ciudadanía",
    placeholder: "Número de cédula",
  },
  {
    alias: ["mexico", "méxico", "mx"],
    etiqueta: "CURP / RFC",
    placeholder: "CURP o RFC",
  },
  {
    alias: ["ecuador", "ec"],
    etiqueta: "Cédula de Identidad",
    placeholder: "Número de cédula",
  },
  {
    alias: ["bolivia", "bo"],
    etiqueta: "Cédula de Identidad",
    placeholder: "Número de cédula",
  },
  {
    alias: ["venezuela", "ve"],
    etiqueta: "Cédula de Identidad",
    placeholder: "Número de cédula",
  },
  {
    alias: ["uruguay", "uy"],
    etiqueta: "Cédula de Identidad",
    placeholder: "Número de cédula",
  },
  {
    alias: ["paraguay", "py"],
    etiqueta: "Cédula de Identidad",
    placeholder: "Número de cédula",
  },
  {
    alias: ["brasil", "brazil", "br"],
    etiqueta: "CPF",
    placeholder: "000.000.000-00",
  },
  {
    alias: ["estados unidos", "united states", "usa", "us"],
    etiqueta: "SSN / Tax ID",
    placeholder: "123-45-6789",
  },
  {
    alias: ["canada", "canadá", "ca"],
    etiqueta: "SIN",
    placeholder: "123-456-789",
  },
  {
    alias: ["suiza", "switzerland", "ch"],
    etiqueta: "AHV / AVS",
    placeholder: "756.1234.5678.90",
  },
  {
    alias: ["austria", "at"],
    etiqueta: "Steuernummer",
    placeholder: "Steuernummer",
  },
  {
    alias: ["polonia", "poland", "pl"],
    etiqueta: "PESEL",
    placeholder: "PESEL",
  },
  {
    alias: ["suecia", "sweden", "se"],
    etiqueta: "Personnummer",
    placeholder: "ÅÅMMDD-XXXX",
  },
  {
    alias: ["noruega", "norway", "no"],
    etiqueta: "Fødselsnummer",
    placeholder: "DDMMÅÅ XXXXX",
  },
  {
    alias: ["dinamarca", "denmark", "dk"],
    etiqueta: "CPR-nummer",
    placeholder: "DDMMÅÅ-XXXX",
  },
  {
    alias: ["finlandia", "finland", "fi"],
    etiqueta: "HETU",
    placeholder: "DDMMÅÅ-XXXX",
  },
  {
    alias: ["grecia", "greece", "gr"],
    etiqueta: "AFM",
    placeholder: "AFM",
  },
];

/** Etiqueta y ejemplo del documento según el país escrito o elegido. */
export function etiquetaDocumentoPorPais(pais: string): EtiquetaDocumento {
  const normalizado = normalizarPais(pais);
  const encontrado = DOCUMENTOS_POR_PAIS.find((item) =>
    item.alias.includes(normalizado),
  );

  if (!encontrado) {
    return ETIQUETA_DOCUMENTO_POR_DEFECTO;
  }

  return { etiqueta: encontrado.etiqueta, placeholder: encontrado.placeholder };
}

/**
 * El documento de identidad se acepta tal cual lo escriba la persona: no se
 * valida ningún formato porque cada país tiene el suyo (DNI, NIE, Codice
 * Fiscale, NIF, BSN, CPF, CURP, pasaporte…). Solo se exige que no esté vacío.
 */
export function validarDocumento(documento: string): boolean {
  const valor = documento.normalize("NFC").trim();

  return valor.length > 0 && valor.length <= 40;
}
