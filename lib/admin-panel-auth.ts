import { NextResponse } from "next/server";
import { obtenerUsuarioSesion } from "@/lib/auth-server";
import type { UsuarioRegistrado } from "@/lib/auth-server";
import { obtenerIpCliente } from "@/lib/ip";
import { CLAVE_ADMIN } from "@/lib/planes";
import {
  obtenerTokenCSRFDesdeCookie,
  verificarTokenCSRF,
} from "@/lib/csrf";
import { consumirLimite } from "@/lib/rate-limit";

export async function obtenerAdminPanel(): Promise<UsuarioRegistrado | null> {
  const usuario = await obtenerUsuarioSesion();
  return usuario?.clave === CLAVE_ADMIN ? usuario : null;
}

export async function exigirAdminPanel(
  request: Request,
): Promise<
  | { admin: UsuarioRegistrado; ip: string }
  | NextResponse
> {
  const admin = await obtenerAdminPanel();

  if (!admin) {
    return NextResponse.json(
      { error: "Acceso exclusivo para administradores." },
      { status: 403 },
    );
  }

  return { admin, ip: ipDe(request) };
}

export async function verificarCsrfAdmin(
  request: Request,
): Promise<boolean> {
  const cookie = await obtenerTokenCSRFDesdeCookie();
  return verificarTokenCSRF(request, cookie);
}

export function ipDe(request: Request): string {
  return obtenerIpCliente(request);
}

export function limitarAccionAdmin(
  request: Request,
  accion: string,
): boolean {
  const limite = consumirLimite(
    `admin-panel:${accion}:${ipDe(request)}`,
    30,
    60_000,
  );
  return limite.permitido;
}

export async function respuestaCsrfInvalida(): Promise<NextResponse> {
  return NextResponse.json(
    { error: "Token CSRF inválido." },
    { status: 403 },
  );
}
