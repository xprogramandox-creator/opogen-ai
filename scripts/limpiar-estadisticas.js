#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const dataDir = process.env.DATA_DIR || "/app/datos";
const rutaDb =
  process.env.PANEL_DB ||
  path.join(dataDir, ".admin", "panel.sqlite");

let archivosLimpiados = 0;
let tablasLimpiadas = 0;

function limpiarHistorial(rutaArchivo) {
  if (!fs.existsSync(rutaArchivo)) return;

  fs.writeFileSync(rutaArchivo, "[]\n", "utf8");
  archivosLimpiados += 1;
  console.log(`Limpiado: ${rutaArchivo}`);
}

for (const plan of ["Premium", "Freemium"]) {
  const raiz = path.join(dataDir, plan);
  if (!fs.existsSync(raiz)) continue;

  for (const entrada of fs.readdirSync(raiz, { withFileTypes: true })) {
    if (!entrada.isDirectory()) continue;

    limpiarHistorial(
      path.join(raiz, entrada.name, "historial_tests.json"),
    );
  }
}

if (fs.existsSync(rutaDb)) {
  const db = new DatabaseSync(rutaDb);

  try {
    // Tablas de analítica/uso que alimentan los contadores del panel.
    // No se tocan usuarios, pagos ni descuentos.
    for (const tabla of ["uso_zonas", "analitica_sesiones"]) {
      const existe = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
        )
        .get(tabla);

      if (!existe) continue;

      db.prepare(`DELETE FROM ${tabla}`).run();
      tablasLimpiadas += 1;
      console.log(`Tabla vaciada: ${tabla}`);
    }
  } finally {
    db.close();
  }
} else {
  console.warn(`No existe la base de datos: ${rutaDb}`);
}

console.log(
  `Estadísticas limpiadas. Archivos: ${archivosLimpiados}. Tablas SQLite: ${tablasLimpiadas}.`,
);
