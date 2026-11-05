import { NextResponse } from "next/server";
import { generarTokenCSRF, establecerCookieCSRF } from "@/lib/csrf";

export async function GET() {
  const token = generarTokenCSRF();
  await establecerCookieCSRF(token);
  return NextResponse.json({ csrfToken: token });
}
