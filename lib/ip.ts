/**
 * IP del cliente para los límites de peticiones.
 *
 * `x-forwarded-for` lo puede enviar el propio cliente, así que se usa la
 * última entrada (la añade el proxy que está justo delante del servidor) y
 * solo cuando no hay cabeceras de plataforma más fiables.
 */
export function obtenerIpCliente(request: Request): string {
  const cabeceras = request.headers;

  const directa =
    cabeceras.get("cf-connecting-ip")?.trim() ||
    cabeceras.get("x-real-ip")?.trim();

  if (directa) {
    return directa.slice(0, 80);
  }

  const reenviada = cabeceras.get("x-forwarded-for");

  if (reenviada) {
    const partes = reenviada
      .split(",")
      .map((parte) => parte.trim())
      .filter((parte) => parte.length > 0);

    const ultima = partes[partes.length - 1];

    if (ultima) {
      return ultima.slice(0, 80);
    }
  }

  return "local";
}
