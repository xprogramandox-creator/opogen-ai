export type Pais = {
  codigo: string;
  nombre: string;
};

const PAISES: Pais[] = [
  { codigo: "1", nombre: "Estados Unidos / Canadá" },
  { codigo: "7", nombre: "Rusia / Kazajistán" },
  { codigo: "20", nombre: "Egipto" },
  { codigo: "27", nombre: "Sudáfrica" },
  { codigo: "30", nombre: "Grecia" },
  { codigo: "31", nombre: "Países Bajos" },
  { codigo: "32", nombre: "Bélgica" },
  { codigo: "33", nombre: "Francia" },
  { codigo: "34", nombre: "España" },
  { codigo: "36", nombre: "Hungría" },
  { codigo: "39", nombre: "Italia / Vaticano" },
  { codigo: "40", nombre: "Rumanía" },
  { codigo: "41", nombre: "Suiza" },
  { codigo: "43", nombre: "Austria" },
  { codigo: "44", nombre: "Reino Unido" },
  { codigo: "45", nombre: "Dinamarca" },
  { codigo: "46", nombre: "Suecia" },
  { codigo: "47", nombre: "Noruega" },
  { codigo: "48", nombre: "Polonia" },
  { codigo: "49", nombre: "Alemania" },
  { codigo: "51", nombre: "Perú" },
  { codigo: "52", nombre: "México" },
  { codigo: "53", nombre: "Cuba" },
  { codigo: "54", nombre: "Argentina" },
  { codigo: "55", nombre: "Brasil" },
  { codigo: "56", nombre: "Chile" },
  { codigo: "57", nombre: "Colombia" },
  { codigo: "58", nombre: "Venezuela" },
  { codigo: "60", nombre: "Malasia" },
  { codigo: "61", nombre: "Australia" },
  { codigo: "62", nombre: "Indonesia" },
  { codigo: "63", nombre: "Filipinas" },
  { codigo: "64", nombre: "Nueva Zelanda" },
  { codigo: "65", nombre: "Singapur" },
  { codigo: "66", nombre: "Tailandia" },
  { codigo: "81", nombre: "Japón" },
  { codigo: "82", nombre: "Corea del Sur" },
  { codigo: "84", nombre: "Vietnam" },
  { codigo: "86", nombre: "China" },
  { codigo: "90", nombre: "Turquía" },
  { codigo: "91", nombre: "India" },
  { codigo: "92", nombre: "Pakistán" },
  { codigo: "93", nombre: "Afganistán" },
  { codigo: "94", nombre: "Sri Lanka" },
  { codigo: "95", nombre: "Myanmar" },
  { codigo: "98", nombre: "Irán" },
  { codigo: "211", nombre: "Sudán del Sur" },
  { codigo: "212", nombre: "Marruecos" },
  { codigo: "213", nombre: "Argelia" },
  { codigo: "216", nombre: "Túnez" },
  { codigo: "218", nombre: "Libia" },
  { codigo: "220", nombre: "Gambia" },
  { codigo: "221", nombre: "Senegal" },
  { codigo: "222", nombre: "Mauritania" },
  { codigo: "223", nombre: "Malí" },
  { codigo: "224", nombre: "Guinea" },
  { codigo: "225", nombre: "Costa de Marfil" },
  { codigo: "226", nombre: "Burkina Faso" },
  { codigo: "227", nombre: "Níger" },
  { codigo: "228", nombre: "Togo" },
  { codigo: "229", nombre: "Benín" },
  { codigo: "230", nombre: "Mauricio" },
  { codigo: "231", nombre: "Liberia" },
  { codigo: "232", nombre: "Sierra Leona" },
  { codigo: "233", nombre: "Ghana" },
  { codigo: "234", nombre: "Nigeria" },
  { codigo: "235", nombre: "Chad" },
  { codigo: "236", nombre: "República Centroafricana" },
  { codigo: "237", nombre: "Camerún" },
  { codigo: "238", nombre: "Cabo Verde" },
  { codigo: "239", nombre: "Santo Tomé y Príncipe" },
  { codigo: "240", nombre: "Guinea Ecuatorial" },
  { codigo: "241", nombre: "Gabón" },
  { codigo: "242", nombre: "República del Congo" },
  { codigo: "243", nombre: "República Democrática del Congo" },
  { codigo: "244", nombre: "Angola" },
  { codigo: "245", nombre: "Guinea-Bisáu" },
  { codigo: "246", nombre: "Diego García" },
  { codigo: "248", nombre: "Seychelles" },
  { codigo: "249", nombre: "Sudán" },
  { codigo: "250", nombre: "Ruanda" },
  { codigo: "251", nombre: "Etiopía" },
  { codigo: "252", nombre: "Somalia" },
  { codigo: "253", nombre: "Yibuti" },
  { codigo: "254", nombre: "Kenia" },
  { codigo: "255", nombre: "Tanzania" },
  { codigo: "256", nombre: "Uganda" },
  { codigo: "257", nombre: "Burundi" },
  { codigo: "258", nombre: "Mozambique" },
  { codigo: "260", nombre: "Zambia" },
  { codigo: "261", nombre: "Madagascar" },
  { codigo: "262", nombre: "Reunión / Mayotte" },
  { codigo: "263", nombre: "Zimbabue" },
  { codigo: "264", nombre: "Namibia" },
  { codigo: "265", nombre: "Malaui" },
  { codigo: "266", nombre: "Lesoto" },
  { codigo: "267", nombre: "Botsuana" },
  { codigo: "268", nombre: "Esuatini" },
  { codigo: "269", nombre: "Comoras" },
  { codigo: "290", nombre: "Santa Elena" },
  { codigo: "291", nombre: "Eritrea" },
  { codigo: "297", nombre: "Aruba" },
  { codigo: "298", nombre: "Islas Feroe" },
  { codigo: "299", nombre: "Groenlandia" },
  { codigo: "350", nombre: "Gibraltar" },
  { codigo: "351", nombre: "Portugal" },
  { codigo: "352", nombre: "Luxemburgo" },
  { codigo: "353", nombre: "Irlanda" },
  { codigo: "354", nombre: "Islandia" },
  { codigo: "355", nombre: "Albania" },
  { codigo: "356", nombre: "Malta" },
  { codigo: "357", nombre: "Chipre" },
  { codigo: "358", nombre: "Finlandia" },
  { codigo: "359", nombre: "Bulgaria" },
  { codigo: "370", nombre: "Lituania" },
  { codigo: "371", nombre: "Letonia" },
  { codigo: "372", nombre: "Estonia" },
  { codigo: "373", nombre: "Moldavia" },
  { codigo: "374", nombre: "Armenia" },
  { codigo: "375", nombre: "Bielorrusia" },
  { codigo: "376", nombre: "Andorra" },
  { codigo: "377", nombre: "Mónaco" },
  { codigo: "378", nombre: "San Marino" },
  { codigo: "380", nombre: "Ucrania" },
  { codigo: "381", nombre: "Serbia" },
  { codigo: "382", nombre: "Montenegro" },
  { codigo: "383", nombre: "Kosovo" },
  { codigo: "385", nombre: "Croacia" },
  { codigo: "386", nombre: "Eslovenia" },
  { codigo: "387", nombre: "Bosnia y Herzegovina" },
  { codigo: "389", nombre: "Macedonia del Norte" },
  { codigo: "420", nombre: "República Checa" },
  { codigo: "421", nombre: "Eslovaquia" },
  { codigo: "423", nombre: "Liechtenstein" },
  { codigo: "500", nombre: "Islas Malvinas" },
  { codigo: "501", nombre: "Belice" },
  { codigo: "502", nombre: "Guatemala" },
  { codigo: "503", nombre: "El Salvador" },
  { codigo: "504", nombre: "Honduras" },
  { codigo: "505", nombre: "Nicaragua" },
  { codigo: "506", nombre: "Costa Rica" },
  { codigo: "507", nombre: "Panamá" },
  { codigo: "508", nombre: "San Pedro y Miquelón" },
  { codigo: "509", nombre: "Haití" },
  { codigo: "590", nombre: "Guadalupe" },
  { codigo: "591", nombre: "Bolivia" },
  { codigo: "592", nombre: "Guyana" },
  { codigo: "593", nombre: "Ecuador" },
  { codigo: "594", nombre: "Guayana Francesa" },
  { codigo: "595", nombre: "Paraguay" },
  { codigo: "596", nombre: "Martinica" },
  { codigo: "597", nombre: "Surinam" },
  { codigo: "598", nombre: "Uruguay" },
  { codigo: "599", nombre: "Curazao" },
  { codigo: "670", nombre: "Timor Oriental" },
  { codigo: "672", nombre: "Antártida" },
  { codigo: "673", nombre: "Brunéi" },
  { codigo: "674", nombre: "Nauru" },
  { codigo: "675", nombre: "Papúa Nueva Guinea" },
  { codigo: "676", nombre: "Tonga" },
  { codigo: "677", nombre: "Islas Salomón" },
  { codigo: "678", nombre: "Vanuatu" },
  { codigo: "679", nombre: "Fiyi" },
  { codigo: "680", nombre: "Palaos" },
  { codigo: "681", nombre: "Wallis y Futuna" },
  { codigo: "682", nombre: "Islas Cook" },
  { codigo: "683", nombre: "Niue" },
  { codigo: "685", nombre: "Samoa" },
  { codigo: "686", nombre: "Kiribati" },
  { codigo: "687", nombre: "Nueva Caledonia" },
  { codigo: "688", nombre: "Tuvalu" },
  { codigo: "689", nombre: "Polinesia Francesa" },
  { codigo: "690", nombre: "Tokelau" },
  { codigo: "691", nombre: "Micronesia" },
  { codigo: "692", nombre: "Islas Marshall" },
  { codigo: "850", nombre: "Corea del Norte" },
  { codigo: "852", nombre: "Hong Kong" },
  { codigo: "853", nombre: "Macao" },
  { codigo: "855", nombre: "Camboya" },
  { codigo: "856", nombre: "Laos" },
  { codigo: "880", nombre: "Bangladés" },
  { codigo: "886", nombre: "Taiwán" },
  { codigo: "960", nombre: "Maldivas" },
  { codigo: "961", nombre: "Líbano" },
  { codigo: "962", nombre: "Jordania" },
  { codigo: "963", nombre: "Siria" },
  { codigo: "964", nombre: "Irak" },
  { codigo: "965", nombre: "Kuwait" },
  { codigo: "966", nombre: "Arabia Saudí" },
  { codigo: "967", nombre: "Yemen" },
  { codigo: "968", nombre: "Omán" },
  { codigo: "970", nombre: "Palestina" },
  { codigo: "971", nombre: "Emiratos Árabes Unidos" },
  { codigo: "972", nombre: "Israel" },
  { codigo: "973", nombre: "Baréin" },
  { codigo: "974", nombre: "Catar" },
  { codigo: "975", nombre: "Bután" },
  { codigo: "976", nombre: "Mongolia" },
  { codigo: "977", nombre: "Nepal" },
  { codigo: "992", nombre: "Tayikistán" },
  { codigo: "993", nombre: "Turkmenistán" },
  { codigo: "994", nombre: "Azerbaiyán" },
  { codigo: "995", nombre: "Georgia" },
  { codigo: "996", nombre: "Kirguistán" },
  { codigo: "998", nombre: "Uzbekistán" },
];

const MAPA_PAISES = new Map(PAISES.map((pais) => [pais.codigo, pais]));

export function soloDigitos(valor: string, maximo = 20): string {
  return valor.replace(/\D/g, "").slice(0, maximo);
}

export function normalizarCodigoPais(valor: string): string {
  return soloDigitos(valor, 4);
}

export function normalizarNumeroTelefono(valor: string): string {
  return soloDigitos(valor, 15);
}

export function buscarPais(codigo: string): Pais | undefined {
  const normalizado = normalizarCodigoPais(codigo);

  if (!normalizado) {
    return undefined;
  }

  const exacto = MAPA_PAISES.get(normalizado);

  if (exacto) {
    return exacto;
  }

  const sinCerosIniciales = normalizado.replace(/^0+/, "");

  if (sinCerosIniciales && sinCerosIniciales !== normalizado) {
    return MAPA_PAISES.get(sinCerosIniciales);
  }

  return undefined;
}

export function esNumeroTelefonoValido(numero: string): boolean {
  return /^\d{4,15}$/.test(normalizarNumeroTelefono(numero));
}

export function construirClaveTelefono(
  codigo: string,
  numero: string,
): string {
  return `${normalizarCodigoPais(codigo)}_${normalizarNumeroTelefono(numero)}`;
}

export function formatearTelefono(codigo: string, numero: string): string {
  return `+${normalizarCodigoPais(codigo)} ${normalizarNumeroTelefono(numero)}`;
}
