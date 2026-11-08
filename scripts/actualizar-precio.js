#!/usr/bin/env node
"use strict";

const path = require("node:path");
const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");

const dataDir = process.env.DATA_DIR || "/app/datos";
const rutaDb =
  process.env.PANEL_DB ||
  path.join(dataDir, ".admin", "panel.sqlite");
const clave = process.argv[2] || "34_658373383";

if (!fs.existsSync(rutaDb)) {
  console.error(`No existe la base de datos: ${rutaDb}`);
  process.exit(1);
}

const db = new DatabaseSync(rutaDb);

try {
  const resultado = db
    .prepare(
      `UPDATE usuarios
       SET precio_base = ?, iva = ?, total = ?
       WHERE clave = ?`,
    )
    .run(1.65, 0.35, 2.0, clave);

  if (Number(resultado.changes ?? 0) === 0) {
    console.error(`No se encontró el usuario ${clave} en ${rutaDb}`);
    process.exitCode = 1;
  } else {
    console.log(
      `Precio actualizado para ${clave}: base 1.65 €, IVA 0.35 €, total 2.00 €`,
    );
  }
} finally {
  db.close();
}
