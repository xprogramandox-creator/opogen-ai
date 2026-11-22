import type { TestimonioPublico } from "@/lib/testimonios-db";

/**
 * Testimonios semilla para que la landing no arranque vacía.
 *
 * Se mezclan con los aprobados de la base de datos en la API pública. Los ids
 * son negativos para no colisionar nunca con los `id` de SQLite.
 */
export const TESTIMONIOS_SEMILLA: TestimonioPublico[] = [
  {
    id: -1,
    nombreVisible: "Marta R.",
    texto:
      "Llevaba meses dando vueltas a los mismos temas. Subí mis apuntes y en una tarde tenía un test de 25 preguntas que me dejó claro qué necesitaba reforzar. Ahora estudio con una dirección.",
    fecha: "2026-11-18T10:20:00.000Z",
  },
  {
    id: -2,
    nombreVisible: "Javier P.",
    texto:
      "Lo que más me ayuda es poder repasar solo las preguntas que necesito. No pierdo tiempo releyendo lo que ya domino y llego a los simulacros mucho más tranquilo.",
    fecha: "2026-11-15T18:05:00.000Z",
  },
  {
    id: -3,
    nombreVisible: "Lucía G.",
    texto:
      "Me presento a unas oposiciones de secundaria y la IA adapta el nivel a lo que estudio. Los tests son exigentes pero justos, y la explicación de cada respuesta me sirve para aprender del intento.",
    fecha: "2026-11-11T08:40:00.000Z",
  },
  {
    id: -4,
    nombreVisible: "Andrés M.",
    texto:
      "Empecé con el plan gratuito para probar y me quedé. Ahora organizo cada tema en una carpeta y voy viendo mi progreso. Es la primera herramienta que me ha hecho constante.",
    fecha: "2026-11-08T16:15:00.000Z",
  },
  {
    id: -5,
    nombreVisible: "Carmen T.",
    texto:
      "Estudio mientras mis hijos duermen, así que necesito algo rápido. Genero un test de 10 preguntas, corrijo al instante y sé exactamente qué repasar mañana.",
    fecha: "2026-11-05T21:30:00.000Z",
  },
];
