import { NextResponse } from "next/server";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import { registrarActividadInvitado } from "@/lib/admin-db";
import { obtenerIpCliente } from "@/lib/ip";
import { consumirLimite } from "@/lib/rate-limit";

const ID_ANONIMO = /^[A-Za-z0-9_-]{16,80}$/;
const PAGINAS = new Set(["landing", "crear", "arcade"]);
const ACCIONES = new Set(["visita", "test_creado", "partida_arcade"]);

export async function POST(request: Request) {
  const ip = obtenerIpCliente(request);
  const limite = consumirLimite(`analitica-evento:${ip}`, 60, 60_000);

  if (!limite.permitido) {
    return new NextResponse(null, { status: 204 });
  }

  const cuerpo = (await request.json().catch(() => null)) as {
    sessionId?: unknown;
    pagina?: unknown;
    accion?: unknown;
  } | null;

  const sessionId =
    typeof cuerpo?.sessionId === "string" ? cuerpo.sessionId.trim() : "";
  const pagina = typeof cuerpo?.pagina === "string" ? cuerpo.pagina : "";
  const accion = typeof cuerpo?.accion === "string" ? cuerpo.accion : "";

  const usuario = await obtenerUsuarioSesion();

  // Solo se registra la actividad de invitados (usuarios no logueados).
  if (usuario) {
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (
    !ID_ANONIMO.test(sessionId) ||
    !PAGINAS.has(pagina) ||
    !ACCIONES.has(accion)
  ) {
    return NextResponse.json(
      { error: "Evento de invitado no válido." },
      { status: 400 },
    );
  }

  registrarActividadInvitado(
    sessionId,
    pagina as "landing" | "crear" | "arcade",
    accion as "visita" | "test_creado" | "partida_arcade",
    ip,
  );

  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
