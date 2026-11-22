/**
 * Promoción de Black Friday 2026 (26, 27 y 28 de noviembre).
 *
 * Hay dos ventanas independientes, ambas comparadas en UTC para que no
 * dependan de la zona horaria del usuario:
 *   - Teaser: del 22 al 25 de noviembre. Se anuncia la promoción, pero los
 *     precios se muestran normales.
 *   - Black Friday: 26, 27 y 28 de noviembre. Se aplica el 25 % visualmente.
 */
export const BLACK_FRIDAY = {
  /** Código que el usuario introduce en la pasarela de Stripe. */
  codigo: "OPOBLACK25",
  /** 25 % de descuento. */
  descuento: 0.25,
  /** 22 de noviembre de 2026, 00:00 UTC: empieza el anuncio. */
  inicioTeaserUtc: Date.UTC(2026, 10, 22),
  /** 26 de noviembre de 2026, 00:00 UTC: empieza el descuento real. */
  inicioUtc: Date.UTC(2026, 10, 26),
  /** 29 de noviembre de 2026, 00:00 UTC (fin exclusivo). */
  finUtc: Date.UTC(2026, 10, 29),
} as const;

/** `true` durante los días de anuncio previos (precios sin rebajar). */
export function estaEnTeaser(ahora: Date = new Date()): boolean {
  const instante = ahora.getTime();

  return (
    instante >= BLACK_FRIDAY.inicioTeaserUtc &&
    instante < BLACK_FRIDAY.inicioUtc
  );
}

/** `true` durante los tres días de la promoción. */
export function estaEnBlackFriday(ahora: Date = new Date()): boolean {
  const instante = ahora.getTime();

  return instante >= BLACK_FRIDAY.inicioUtc && instante < BLACK_FRIDAY.finUtc;
}

/** Aplica el 25 % de descuento al precio indicado. */
export function precioConDescuento(precio: number): number {
  return precio * (1 - BLACK_FRIDAY.descuento);
}
