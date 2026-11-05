/**
 * Reduce las fotos hechas con el móvil antes de subirlas.
 *
 * Las cámaras actuales generan archivos de 4-10 MB que superan el límite del
 * servidor. Se reescalan a un máximo de 2200 px y se convierten a JPEG.
 */
export async function comprimirImagen(
  archivo: File,
  maxLado = 2200,
  calidad = 0.82,
): Promise<File> {
  if (
    typeof document === "undefined" ||
    !archivo.type.startsWith("image/") ||
    archivo.type === "image/svg+xml" ||
    archivo.type === "image/gif"
  ) {
    return archivo;
  }

  try {
    const mapa = await createImageBitmap(archivo);
    const ladoMayor = Math.max(mapa.width, mapa.height);
    const escala = Math.min(1, maxLado / ladoMayor);

    // Ya es pequeña y ligera: no merece la pena recomprimirla.
    if (escala === 1 && archivo.size <= 2_500_000) {
      return archivo;
    }

    const lienzo = document.createElement("canvas");
    lienzo.width = Math.max(1, Math.round(mapa.width * escala));
    lienzo.height = Math.max(1, Math.round(mapa.height * escala));

    const contexto = lienzo.getContext("2d");

    if (!contexto) {
      return archivo;
    }

    contexto.drawImage(mapa, 0, 0, lienzo.width, lienzo.height);

    const blob = await new Promise<Blob | null>((resolver) => {
      lienzo.toBlob(resolver, "image/jpeg", calidad);
    });

    if (!blob || blob.size >= archivo.size) {
      return archivo;
    }

    const nombre = `${archivo.name.replace(/\.[^.]+$/, "") || "foto"}.jpg`;

    return new File([blob], nombre, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    // Si el navegador no puede decodificarla (p. ej. HEIC), se envía tal cual
    // y la validación mostrará el aviso correspondiente.
    return archivo;
  }
}

/** Comprime todas las imágenes de una selección, dejando el resto igual. */
export async function prepararArchivos(archivos: File[]): Promise<File[]> {
  return Promise.all(archivos.map((archivo) => comprimirImagen(archivo)));
}
