// =====================================================================
// GET /api/admin/session - Verifica sessione + rinnovo scorrevole
// Il client chiama questo endpoint come heartbeat (ogni ~10 min):
// se restano meno di 20 minuti e il tetto assoluto (8h) non è stato
// raggiunto, il cookie viene ri-emesso (sliding expiration, spec 4.1).
// =====================================================================
import { NextResponse } from "next/server";
import { getAdminSession, issueAdminSession } from "@/lib/auth";
import { ADMIN_IDLE_SEC } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Sessione non valida" },
      { status: 401 }
    );
  }
  const { user, payload } = session;
  const now = Math.floor(Date.now() / 1000);
  const remaining = payload.exp - now;

  let res = NextResponse.json({
    ok: true,
    user: {
      username: user.username,
      email: user.email,
      role: user.role,
      totpEnabled: user.totpEnabled,
      lastLoginAt: user.lastLoginAt,
      lastLoginIp: user.lastLoginIp,
    },
    sessionExpiresIn: remaining,
  });

  // Rinnovo anticipato (sliding session)
  if (remaining < ADMIN_IDLE_SEC * (2 / 3) && payload.abs && payload.abs > now + 60) {
    res = issueAdminSession(res, req, user);
  }
  return res;
}
