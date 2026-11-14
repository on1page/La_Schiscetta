// =====================================================================
// POST /api/admin/logout - Revoca sessione admin
// La revoca remota avviene incrementando sessionVersion (logout forzato).
// =====================================================================
import { NextResponse } from "next/server";
import { guardCsrf } from "@/lib/api";
import { getAdminSession, clearSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;
  const session = await getAdminSession();
  if (session) {
    await audit(req, {
      actorId: session.user.id,
      actorName: session.user.username,
      action: "LOGOUT",
      entity: "AdminUser",
    });
  }
  const res = NextResponse.json({ ok: true });
  return clearSession(res, true);
}
