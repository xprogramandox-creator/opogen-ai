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
      "Me ahorra horas de estudio. Subo mis apuntes y tengo un test listo en segundos.",
    fecha: "2026-11-18T10:20:00.000Z",
  },
  {
    id: -2,
    nombreVisible: "Javier P.",
    texto:
      "La IA me detecta justo las preguntas que llevo mal. Es un alivio.",
    fecha: "2026-11-15T18:05:00.000Z",
  },
  {
    id: -3,
    nombreVisible: "Lucía G.",
    texto:
      "El tutor virtual me explica las respuestas mejor que algunos profesores.",
    fecha: "2026-11-11T08:40:00.000Z",
  },
  {
    id: -4,
    nombreVisible: "Andrés M.",
    texto:
      "Siento que llevo una academia personalizada en el bolsillo.",
    fecha: "2026-11-08T16:15:00.000Z",
  },
  {
    id: -5,
    nombreVisible: "Carmen T.",
    texto:
      "Poder hacer tests de 50 preguntas me da mucha seguridad.",
    fecha: "2026-11-05T21:30:00.000Z",
  },
];
