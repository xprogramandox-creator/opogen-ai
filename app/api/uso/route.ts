import { NextResponse } from "next/server";
import { obtenerClaveSesion } from "@/lib/auth-server";
import { registrarUso } from "@/lib/admin-db";
import { obtenerIpCliente } from "@/lib/ip";
import { consumirLimite } from "@/lib/rate-limit";

const ZONAS = new Set([
  "Inicio",
  "Crear test",
  "Arcade",
  "Mi Espacio",
  "Estadísticas",
  "Zona Kids",
  "Premium",
  "Cuenta",
  "Legal",
  "Otros",
]);

export async function POST(request: Request) {
  const ip = obtenerIpCliente(request);
  const limite = consumirLimite(`uso:${ip}`, 60, 60_000);

  if (!limite.permitido) {
    return NextResponse.json(
      { error: "Demasiadas peticiones." },
      { status: 429 },
    );
  }

  const cuerpo: unknown = await request.json().catch(() => null);
  const datos = (cuerpo || {}) as {
    zona?: unknown;
    duracion?: unknown;
  };
  const zona = typeof datos.zona === "string" ? datos.zona : "Otros";
  const duracion = Number(datos.duracion) || 0;

  if (!ZONAS.has(zona)) {
    return NextResponse.json({ ok: true });
  }

  const clave = (await obtenerClaveSesion()) || "";
  registrarUso(clave, zona, Math.min(3_600, duracion));

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ error: "Método no permitido." }, { status: 405 });
}
