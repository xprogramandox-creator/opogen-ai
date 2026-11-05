import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import * as argon2 from "argon2";

const raiz = process.cwd();
const telefono = (process.env.ADMIN_TELEFONO || "34_601040557").trim();
const password = process.env.ADMIN_PASSWORD || "Admin1234!";
const nombre = process.env.ADMIN_NOMBRE || "Manuel";
const apellidos = process.env.ADMIN_APELLIDOS || "Pujante Noguera";
const correo = process.env.ADMIN_CORREO || "soporte@opogenai.com";

if (!/^\d{1,4}_\d{4,15}$/.test(telefono)) {
  throw new Error("ADMIN_TELEFONO debe tener el formato 34_600000000.");
}

if (password.length < 8) {
  throw new Error("ADMIN_PASSWORD debe tener al menos 8 caracteres.");
}

const carpeta = path.join(raiz, "Premium", telefono);
const archivo = path.join(carpeta, "datos.txt");

fs.mkdirSync(carpeta, { recursive: true });

if (fs.existsSync(archivo)) {
  console.log(`El administrador ${telefono} ya existe; no se sobrescribe.`);
} else {
  const hash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  fs.writeFileSync(
    archivo,
    [
      `Usuario: ${nombre}`,
      `Telefono: ${telefono}`,
      `Contraseña: ${hash}`,
      `Correo: ${correo}`,
      "Rol: premium",
      `Apellidos: ${apellidos}`,
      "EmailVerificado: true",
      "PlanContratado: ilimitado",
      "FechaCaducidad: Sin límite",
      `FechaInicio: ${new Date().toISOString()}`,
    ].join("\n") + "\n",
    "utf8",
  );

  console.log(`Administrador creado: ${telefono}`);
  console.log("Cambia ADMIN_PASSWORD en producción.");
}

const directorioDb = path.join(raiz, ".admin");
fs.mkdirSync(directorioDb, { recursive: true });
const db = new DatabaseSync(path.join(directorioDb, "panel.sqlite"));
const sql = fs.readFileSync(
  path.join(raiz, "migraciones", "001_panel_admin.sql"),
  "utf8",
);
db.exec(sql);

const ahora = new Date().toISOString();
db.prepare(
  `INSERT INTO usuarios (
    clave, nombre, apellidos, correo, telefono, rol, plan,
    email_verificado, fecha_registro, fecha_pago, fecha_caducidad,
    precio_base, iva, total, estado, stripe_customer_id,
    stripe_subscription_id
  ) VALUES (?, ?, ?, ?, ?, 'premium', 'ilimitado', 1, ?, ?, 'Sin límite',
    0, 0, 0, 'Activa', '', '')
  ON CONFLICT(clave) DO UPDATE SET
    nombre = excluded.nombre,
    apellidos = excluded.apellidos,
    correo = excluded.correo,
    rol = 'premium',
    plan = 'ilimitado',
    estado = 'Activa'`,
).run(
  telefono,
  nombre,
  apellidos,
  correo,
  telefono,
  ahora,
  ahora,
);

db.close();
console.log("Base de datos administrativa preparada en .admin/panel.sqlite.");
