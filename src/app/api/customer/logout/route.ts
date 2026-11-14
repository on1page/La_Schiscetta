// =====================================================================
// POST /api/customer/logout - Revoca sessione cliente
// =====================================================================
import { NextResponse } from "next/server";
import { guardCsrf } from "@/lib/api";
import { clearSession } from "@/lib/auth";

export async function POST(req: Request) {
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;
  const res = NextResponse.json({ ok: true });
  return clearSession(res, false);
}
