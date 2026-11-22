import type { TestimonioPublico } from "@/lib/testimonios-db";
import type { IdiomaTestimonio } from "@/lib/traduccion";

export type TestimonioSemilla = {
  id: number;
  nombreVisible: string;
  fecha: string;
  textos: Record<IdiomaTestimonio, string>;
};

/**
 * Testimonios semilla para que la landing no arranque vacía.
 *
 * Se mezclan con los aprobados de la base de datos en la API pública, que
 * elige el texto del idioma solicitado. Los ids son negativos para no
 * colisionar nunca con los `id` de SQLite.
 */
export const TESTIMONIOS_SEMILLA: TestimonioSemilla[] = [
  {
    id: -1,
    nombreVisible: "Marta R.",
    fecha: "2026-11-18T10:20:00.000Z",
    textos: {
      es: "Me ahorra horas de estudio. Subo mis apuntes y tengo un test listo en segundos.",
      en: "It saves me hours of study. I upload my notes and have a test ready in seconds.",
      fr: "Ça m'épargne des heures de révision. Je télécharge mes notes et j'ai un test prêt en quelques secondes.",
      de: "Es spart mir Stunden beim Lernen. Ich lade meine Notizen hoch und habe in Sekunden einen Test.",
      it: "Mi risparmia ore di studio. Carico i miei appunti e ho un test pronto in pochi secondi.",
      pt: "Poupa-me horas de estudo. Carrego os meus apontamentos e tenho um teste pronto em segundos.",
    },
  },
  {
    id: -2,
    nombreVisible: "Javier P.",
    fecha: "2026-11-15T18:05:00.000Z",
    textos: {
      es: "La IA me detecta justo las preguntas que llevo mal. Es un alivio.",
      en: "The AI spots exactly the questions I keep getting wrong. Such a relief.",
      fr: "L'IA repère pile les questions que je continue à rater. Quel soulagement.",
      de: "Die KI erkennt genau die Fragen, die ich immer noch falsch mache. Eine Erleichterung.",
      it: "L'IA individua proprio le domande che continuo a sbagliare. Un sollievo.",
      pt: "A IA deteta mesmo as perguntas que continuo a errar. É um alívio.",
    },
  },
  {
    id: -3,
    nombreVisible: "Lucía G.",
    fecha: "2026-11-11T08:40:00.000Z",
    textos: {
      es: "El tutor virtual me explica las respuestas mejor que algunos profesores.",
      en: "The virtual tutor explains the answers better than some teachers.",
      fr: "Le tuteur virtuel m'explique les réponses mieux que certains professeurs.",
      de: "Der virtuelle Tutor erklärt mir die Antworten besser als manche Lehrer.",
      it: "Il tutor virtuale mi spiega le risposte meglio di alcuni professori.",
      pt: "O tutor virtual explica-me as respostas melhor do que alguns professores.",
    },
  },
  {
    id: -4,
    nombreVisible: "Andrés M.",
    fecha: "2026-11-08T16:15:00.000Z",
    textos: {
      es: "Siento que llevo una academia personalizada en el bolsillo.",
      en: "It feels like having a personalised academy in my pocket.",
      fr: "J'ai l'impression d'avoir une académie personnalisée dans ma poche.",
      de: "Es fühlt sich an, als hätte ich eine persönliche Akademie in der Tasche.",
      it: "Sento di avere un'accademia personalizzata in tasca.",
      pt: "Sinto que levo uma academia personalizada no bolso.",
    },
  },
  {
    id: -5,
    nombreVisible: "Carmen T.",
    fecha: "2026-11-05T21:30:00.000Z",
    textos: {
      es: "Poder hacer tests de 50 preguntas me da mucha seguridad.",
      en: "Being able to take 50-question tests gives me a lot of confidence.",
      fr: "Pouvoir faire des tests de 50 questions me donne beaucoup de confiance.",
      de: "Tests mit 50 Fragen erstellen zu können, gibt mir viel Sicherheit.",
      it: "Poter fare test da 50 domande mi dà molta sicurezza.",
      pt: "Poder fazer testes de 50 perguntas dá-me muita confiança.",
    },
  },
];

/** Convierte una semilla al formato público en el idioma pedido. */
export function semillaEnIdioma(
  semilla: TestimonioSemilla[],
  idioma: IdiomaTestimonio,
): TestimonioPublico[] {
  return semilla.map((testimonio) => ({
    id: testimonio.id,
    nombreVisible: testimonio.nombreVisible,
    fecha: testimonio.fecha,
    texto: testimonio.textos[idioma] ?? testimonio.textos.en,
  }));
}
