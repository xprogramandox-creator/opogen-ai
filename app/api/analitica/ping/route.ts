import { NextResponse } from "next/server";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import { registrarActividadAnalitica } from "@/lib/admin-db";
import { obtenerIpCliente } from "@/lib/ip";
import { consumirLimite } from "@/lib/rate-limit";

const ID_ANONIMO = /^[A-Za-z0-9_-]{16,80}$/;

export async function POST(request: Request) {
  const ip = obtenerIpCliente(request);
  const limite = consumirLimite(`analitica:${ip}`, 120, 60_000);

  if (!limite.permitido) {
    return new NextResponse(null, { status: 204 });
  }

  const cuerpo: unknown = await request.json().catch(() => null);
  const sessionId =
    cuerpo &&
    typeof cuerpo === "object" &&
    typeof (cuerpo as { sessionId?: unknown }).sessionId === "string"
      ? (cuerpo as { sessionId: string }).sessionId.trim()
      : "";

  const usuario = await obtenerUsuarioSesion();

  if (!usuario && !ID_ANONIMO.test(sessionId)) {
    return NextResponse.json(
      { error: "Identificador de sesión no válido." },
      { status: 400 },
    );
  }

  registrarActividadAnalitica(sessionId, usuario, ip);

  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
