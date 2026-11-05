import { cookies } from "next/headers";
import { randomBytes, timingSafeEqual } from "node:crypto";

const COOKIE_CSRF = "csrf-token";
const DURACION_CSRF_SEGUNDOS = 60 * 60;

export function generarTokenCSRF(): string {
  return randomBytes(32).toString("hex");
}

export async function establecerCookieCSRF(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_CSRF, token, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACION_CSRF_SEGUNDOS,
  });
}

export async function obtenerTokenCSRFDesdeCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_CSRF)?.value || null;
}

export function verificarTokenCSRF(request: Request, tokenCookie: string | null): boolean {
  if (!tokenCookie) {
    return false;
  }

  const headerToken = request.headers.get("x-csrf-token") || request.headers.get("X-CSRF-Token");
  if (!headerToken) {
    return false;
  }

  if (headerToken.length !== tokenCookie.length) {
    return false;
  }

  try {
    const buf1 = Buffer.from(headerToken);
    const buf2 = Buffer.from(tokenCookie);
    if (buf1.length !== buf2.length) {
      return false;
    }
    return timingSafeEqual(buf1, buf2);
  } catch {
    return false;
  }
}

export async function respuestaErrorCSRF() {
  const { NextResponse } = await import("next/server");
  return NextResponse.json({ error: "Token CSRF inválido." }, { status: 403 });
}

export { COOKIE_CSRF };
