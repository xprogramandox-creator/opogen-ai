#!/usr/bin/env node
/**
 * Descarga la base GeoLite2-Country de MaxMind y la deja en el volumen.
 *
 * Uso:
 *   MAXMIND_LICENSE_KEY=xxxx node scripts/actualizar-geolite2.mjs
 *
 * Variables:
 *   MAXMIND_LICENSE_KEY  Obligatoria. Se genera en la cuenta gratuita de MaxMind
 *                        (My Account → Manage License Keys).
 *   DATA_DIR             Raíz de datos (por defecto /app/datos).
 *   GEOLITE2_DB_PATH     Ruta exacta del mmdb (por defecto
 *                        ${DATA_DIR}/geolite2/GeoLite2-Country.mmdb).
 *
 * El archivo se escribe en un temporal y se renombra al final, así el proxy
 * nunca lee un mmdb a medio escribir.
 */
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const licencia = process.env.MAXMIND_LICENSE_KEY?.trim();

if (!licencia) {
  console.error(
    "Falta MAXMIND_LICENSE_KEY. Créala gratis en https://www.maxmind.com → Manage License Keys.",
  );
  process.exit(1);
}

const dataDir = process.env.DATA_DIR?.trim() || "/app/datos";
const destino =
  process.env.GEOLITE2_DB_PATH?.trim() ||
  path.join(dataDir, "geolite2", "GeoLite2-Country.mmdb");

const url = new URL("https://download.maxmind.com/app/geoip_download");
url.searchParams.set("edition_id", "GeoLite2-Country");
url.searchParams.set("license_key", licencia);
url.searchParams.set("suffix", "tar.gz");

console.log("Descargando GeoLite2-Country…");

const respuesta = await fetch(url, {
  signal: AbortSignal.timeout(120_000),
  redirect: "follow",
});

if (!respuesta.ok) {
  console.error(
    `MaxMind respondió ${respuesta.status}. Comprueba la license key y que la cuenta siga activa.`,
  );
  process.exit(1);
}

const temporal = mkdtempSync(path.join(tmpdir(), "geolite2-"));
const archivoTar = path.join(temporal, "GeoLite2-Country.tar.gz");

try {
  writeFileSync(archivoTar, Buffer.from(await respuesta.arrayBuffer()));
  execFileSync("tar", ["-xzf", archivoTar, "-C", temporal], {
    stdio: "inherit",
  });

  const carpeta = readdirSync(temporal).find((nombre) =>
    nombre.startsWith("GeoLite2-Country_"),
  );

  if (!carpeta) {
    throw new Error("El paquete descargado no contiene la carpeta esperada.");
  }

  const origen = path.join(temporal, carpeta, "GeoLite2-Country.mmdb");

  if (!statSync(origen).isFile()) {
    throw new Error("No se encontró GeoLite2-Country.mmdb dentro del paquete.");
  }

  mkdirSync(path.dirname(destino), { recursive: true });

  const nuevo = `${destino}.nuevo`;
  copyFileSync(origen, nuevo);
  renameSync(nuevo, destino);

  console.log(`OK · ${destino}`);
} finally {
  rmSync(temporal, { recursive: true, force: true });
}
