// =====================================================================
// GET /api/admin/audit - Audit log immutabile con filtri (MANAGER+)
// OWASP A09: traccia utente, timestamp, IP, user agent, payload pre/post.
// =====================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await requireAdmin("MANAGER");
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Non autorizzato" }, { status: 401 });
  }
  const url = new URL(req.url);
  const entity = url.searchParams.get("entity");
  const action = url.searchParams.get("action");

  const logs = await db.auditLog.findMany({
    where: {
      ...(entity && entity !== "ALL" ? { entity } : undefined),
      ...(action && action !== "ALL" ? { action } : undefined),
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return NextResponse.json({ logs });
}
