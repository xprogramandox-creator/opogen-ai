/**
 * Promoción de Black Friday 2026 (26, 27 y 28 de noviembre).
 *
 * Las fechas se comparan en UTC para que la promoción empiece y termine a la
 * misma hora en todos los países y no dependa de la zona horaria del usuario.
 */
export const BLACK_FRIDAY = {
  /** Código que el usuario introduce en la pasarela de Stripe. */
  codigo: "OPOBLACK25",
  /** 25 % de descuento. */
  descuento: 0.25,
  /** 26 de noviembre de 2026, 00:00 UTC (inicio inclusive). */
  inicioUtc: Date.UTC(2026, 10, 26),
  /** 29 de noviembre de 2026, 00:00 UTC (fin exclusivo). */
  finUtc: Date.UTC(2026, 10, 29),
} as const;

/** `true` durante los tres días de la promoción. */
export function estaEnBlackFriday(ahora: Date = new Date()): boolean {
  const instante = ahora.getTime();

  return instante >= BLACK_FRIDAY.inicioUtc && instante < BLACK_FRIDAY.finUtc;
}

/** Aplica el 25 % de descuento al precio indicado. */
export function precioConDescuento(precio: number): number {
  return precio * (1 - BLACK_FRIDAY.descuento);
}
